# Model-directed tool loop

Verified: 2026-11-14. Scope: Hannes chat planner, shared tool execution, and voice instructions.

## Changes

- Removed automatic lesson searches/editor reads before planning and the regex rejection of lesson search execution. Regex hints only rank schemas; they no longer label the task in the model input or remove granted tools. Lesson ownership/source requirements still apply.
- Removed the four-iteration clamp and forced answering after three tool results. Configured iteration, tool, context, cost and deadline budgets remain authoritative; the last model turn is reserved for answering.
- Added a complete granted `tool_catalog` and `tools.discover` for schema paging. Discovery accepts application names and native aliases, and never exposes tools unavailable in the session.
- 9Router calls now separate system policy, context data, chronological user/assistant messages and the current question. Native function calls are normalized into the existing validated backend contract. The latest native assistant/tool exchange feeds the next iteration with bounded content; older evidence remains in packed context/storage. Its size is included in budget reservation.
- Native and JSON tool responses remain compatible. Ordinary final text and fenced JSON are normalized. Unsolicited reasoning metadata is discarded, including non-schema rationale arguments; other invalid arguments still fail validation. Approval, ownership, Piston sandbox and browser receipt checks remain in place.
- Current attachments load normally. Prior image metadata is available without loading pixels; `memory.view_images` explicitly loads the latest owned image in the same thread when needed. Unrelated requests use the regular text model.
- Web search now supports news/text and freshness windows, preserving publisher/publication date separately from retrieval time. Catalog search can browse without fabricated query terms. Tool descriptions distinguish reading course metadata from navigating the interface.
- Voice instructions distinguish new topics from old images, support research/public prices and encourage continuing from conversation context. Legacy voice lesson search no longer rejects requests using image/keyword heuristics.

## Evidence

`agent-model-task-routing.json`: **13/13 live model fixture scenarios passed** with the existing `ag/gemini-3-flash`. Coverage: technology/gold news after an old image, NVIDIA follow-up, public course prices, correcting a prior capability denial, choosing a browser snapshot before opening a course, current screen, friend/user identity, image follow-up, catalog retry, casual conversation and GitHub file reading.

These probes validate decisions and bounded continuation using synthetic conversation/tool results. They do not execute browser navigation or establish the correctness of financial forecasts. Fixture date is intentionally fixed at 2026-11-13; production uses the current UTC timestamp plus Asia/Ho_Chi_Minh timezone.

A separate real MCP stdio news call returned three results, all with publication dates. A database-backed test executed six tool batches through seven model turns; another confirms unrelated text does not load prior image pixels and explicit image inspection survives context refresh.

Regression run: **314 passed**, including runtime/receipt isolation, SQL/security, discovery, voice, compaction and provider behavior. After final protocol changes: **65 relevant tests passed**, including native call normalization, bounded tool feedback, rationale removal and image isolation. Existing dependency deprecation warnings remain.

Reproduce planner probes:

```sh
studynest_be/.venv/bin/python studynest_be/scripts/eval_agent_task_routing.py \
  --live --output /tmp/agent-task-routing.json
```

The complete 18-case red-team audit and a real browser course-opening flow were not rerun in this change.
