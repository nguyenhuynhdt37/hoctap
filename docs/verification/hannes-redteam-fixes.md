# Hannes red-team follow-up

Date: 2026-11-13. Original audit JSON remains unchanged at `scripts/hannes_stress_test_log.json`.

## Concurrent admission

Reproduced PostgreSQL `DBAPIError: deadlock detected` using ten simultaneous requests on an isolated verification database. Session row locking and thread creation occurred outside the old exception handler; thread helpers could also commit in the middle of admission.

Admission now takes a transaction advisory lock per account before reconciliation/session row locks. Reconciliation and thread creation defer their commits to the run transaction. Active runs are checked before writing a thread/message; the active-owner unique index remains the final safeguard. Same-key replays return the persisted run. Rollback covers the entire admission path. Only deadlock, serialization failure, lock contention and known run uniqueness conflicts map to HTTP 409; unrelated database errors remain errors.

Verification includes ten-request storms for lesson/account scope, same/different agent sessions, shared/distinct idempotency keys, and assertions against orphan messages/events. A real-auth HTTP test on PostgreSQL, with worker launching disabled to hold the accepted run active, returns exactly **one 201 and nine 409 responses**.

## Model latency

Local `studynest_be/.env` now sets `AGENT_MODEL=ag/gemini-3-flash` through the existing 9Router provider. Previously this fell back to `TUTOR_CHAT_MODEL=ag/gemini-3.8-flash`. Voice, vision, semantic compaction and deadlines are unchanged. The existing dev reloader restarted; `/health` returned HTTP 200.

Seven live synthetic planner probes passed schema/tool-selection checks in **1.42–2.56 seconds** each. The longer fixture produced a 16,808-character packed prompt; token counts in the receipt are estimates, not provider measurements. Cases include greetings, retrieval, navigation, source injection, account name with history, cross-account SQL requests and prompt extraction. These probes do not execute actions or establish a comprehensive security guarantee. Navigation wording prematurely claimed success, so passing tool selection does not imply every response is ideal.

Evidence: `agent-fast-model-probe.json`. Reproduce from repository root:

```sh
studynest_be/.venv/bin/python studynest_be/scripts/eval_agent_provider.py \
  --live --extended --model ag/gemini-3-flash \
  --output /tmp/hannes-fast-model-probe.json
```

## Audit harness corrections

SSE completion messages are objects containing `content`, not always strings. The harness now normalizes both formats, treats failed/partial/empty runs as inconclusive, labels textual checks as heuristics, and writes reruns to `scripts/hannes_stress_test_log_rerun.json`. Nine mocked-transport regressions cover these behaviors.

The original TC-18 log contains **eight 500 responses**, one 201 and one 409. Several other original cases failed with `'dict' object has no attribute 'lower'`; their defense claims require re-evaluation. The complete 18-case audit has not been rerun against a real learner account.

## Checks

- 187 tests passed across runtime integration, runtime policy, learning security, routing, semantic compaction and prompt packing.
- Nine audit-harness tests passed.
- Three additional account-scope concurrency variants passed (all six lesson/account storm variants passed together).
- Existing dependency deprecation warnings remain.
