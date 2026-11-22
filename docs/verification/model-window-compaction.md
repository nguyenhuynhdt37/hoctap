# Model-window context policy

Updated 2026-11-14.

Automatic semantic compression runs **strictly above 80%** of the selected model's context window. At or below 80%, history and tool results remain verbatim; no automatic 5,000/10,000-character trigger, 24,000-character prompt clipping, six-output clipping or 64-message reader cutoff remains. Existing checkpoints remain usable; original records are retained.

The agent reads the selected text/vision model's limit from provider metadata, cached for five minutes. 9Router `/models` reports **1,048,576 tokens** for `ag/gemini-3-flash`. Optional `AGENT_CONTEXT_WINDOWS_JSON` maps exact model IDs to operator limits. Unknown limits remain unknown: the UI says so and no guessed compression threshold is used.

Occupancy is explicitly an **estimate**, computed from UTF-8 text, tool schemas, current native tool feedback, image allowance and requested output reserve. The UI displays `Context ~x% · used / window token`; historical activity retains these fields without exposing credentials. This is current-request occupancy, not cumulative token spend. The separate per-run input budget defaults to 8,000,000 so its former 40,000-token cap does not prevent using a million-token model window. Explicit cost/deadline/tool limits still apply.

On crossing the threshold, recent conversation/tool results are semantically checkpointed. Durable jobs require a measured window trigger and memory consent; old jobs lacking the new policy marker cannot resume automatically. Semantic batches use the compactor model's own window capacity. A compaction failure is reported as deferred; if context still exceeds the model window the request stops without deleting history.

Verification:

- Strict below/exactly/above-80% boundary tests; unknown-model handling and per-model metadata/override selection.
- Real PostgreSQL runtime tests verify no semantic calls below threshold, semantic calls above threshold, and all 110 historical messages available without queuing a checkpoint.
- Existing checkpoint lease, cursor, evidence, revocation, ownership, run admission and native tool loop regressions.
- Frontend TypeScript check and context-usage projection/redaction check (`node scripts/test-agent-context-usage.cjs`).

No million-token external model request was sent; threshold execution uses isolated fixtures. Model-limit metadata was checked against the real 9Router endpoint.
