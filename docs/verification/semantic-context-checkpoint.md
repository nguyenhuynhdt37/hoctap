# Semantic continuation checkpoint

> Policy update (2026-11-14): automatic compression now runs only above 80% of the selected model window. Normal prompts retain full raw history and tool outputs. See `model-window-compaction.md`; older verification below describes checkpoint persistence, not the current trigger.

Replaces the earlier head/tail and recent-message-only packing strategy. This implements the continuation-checkpoint pattern; it does not claim to reproduce Codex's private implementation.

## What is retained

A dedicated model reads the previous checkpoint plus the **complete new delta**, then produces typed notes: original goal, current task, constraints, decisions/corrections, completed work, pending work, facts, tool findings/failures, and uncertainty. Notes carry owned `message:` / `tool:` evidence IDs. The model is explicitly prohibited from emitting private reasoning, inventing evidence, treating assistant claims as verified facts, or marking failed tools as successful.

Recent raw turns are combined with this accumulated semantic state. Oversized recent turns and consumed tool outputs are also folded semantically. Large records are segmented from beginning to end, including the middle; the checkpoint is merged after each segment. Packing remains a last-resort size safeguard and is identified separately, never counted as successful semantic compression.

## Storage and recovery

`AgentThreadSummary.summary` stores a versioned JSON envelope (`semantic_checkpoint_v1`) with notes, exact message/unit cursor, pending status, lease and retry metadata. No migration is required. Message history remains in `TutorChatMessages`; technical tool records retain their existing retention policy. A validated checkpoint can outlive an expired tool record, but the evidence reader explicitly distinguishes an archived checkpoint note from raw evidence.

The cursor advances only after successful model output, evidence validation and commit. Reads progress from the prior watermark, rather than selecting only the latest 200 messages. A persisted pending envelope resumes through maintenance after worker restart. A partial checkpoint declares the backlog and exposes `memory.search_conversation` / `memory.read_context_evidence` for targeted retrieval from the original owned thread.

A per-thread lease/CAS avoids duplicate model work; the same advisory consent lock protects queue writes and final commits from deletion/revocation races. The provider call never holds that lock. Background concurrency is two, queue admission 24 threads, four batches per burst. Chat waits at most eight seconds for an admitted background job before continuing with explicit coverage information; it does not cancel the job. Provider errors keep the cursor and retry metadata, not a fabricated summary.

This checkpoint is working conversation context, separate from account-level personal memory. It does not automatically turn model-derived observations into permanent personal facts. Disabled consent prevents persisted summary recreation. Credential patterns are redacted before summarization without dropping the rest of the source.

## Configuration used locally

```dotenv
AGENT_CONTEXT_PROVIDER=gemini
AGENT_CONTEXT_MODEL=models/gemini-3.1-flash-lite
AGENT_CONTEXT_TIMEOUT_SECONDS=30
AGENT_CONTEXT_WINDOWS_JSON={}  # Optional per-model overrides; otherwise provider metadata
```

Chat/media routes otherwise retain their existing configuration. The dedicated compactor uses existing Google credentials; no credentials are stored in reports. 9Router probes timed out at 30/60 seconds, and an alternate router model returned an invalid/empty response. Native Gemini passed the semantic quality checks. When the application's hard per-run monetary cap is enabled, automatic checkpoint model calls fail closed until a separate compaction cost budget is available; existing token/billing behavior is not silently bypassed.

## Validation

- Synthetic real-model test: 50 historical inputs followed by a correction and failed tool result. Retained the original learning goal, a deadline decision in the middle, the newer Monday deadline, and unfinished work after the tool failure. Final checkpoint: six notes, 685 characters in the recorded run.
- Real provider + isolated PostgreSQL: persisted a checkpoint from synthetic history, reloaded it in a new session and retained the original goal, middle correction and pending task.
- Database tests: 110-message history, incremental deltas, durable cursor restart, concurrent lease, consent revocation during provider wait, failure without cursor advancement, foreign user/thread rejection, full multi-segment tool body consumption, and expired raw-tool evidence explicitly returned as an archive.
- Unit tests: typed evidence contract, fabricated-reference rejection, middle-of-source retention, repeated-result reuse, oversized recent-turn semantic merge, full checkpoint-note preservation, and redaction without truncating source content.

Run from `studynest_be`:

```sh
.venv/bin/python -m pytest tests/unit/test_semantic_compaction.py -q
# Both database URLs must point to a disposable verification database.
.venv/bin/python -m pytest tests/integration/test_semantic_compaction.py -q
RUN_LIVE_MODEL_EVAL=1 .venv/bin/python -m pytest tests/integration/test_semantic_checkpoint_live.py -q
.venv/bin/python scripts/eval_semantic_checkpoint.py
```

Summarization is inherently lossy and model-dependent. Evidence IDs enable rechecking details; notes are not independent truth or new proof of task completion. Pending coverage and provider failures remain explicit.
