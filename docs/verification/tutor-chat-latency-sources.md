# Tutor chat: latency and grounded sources

Verified locally on 2026-11-12 against the existing PostgreSQL data and live 9Router.

## Findings

- An actual browser request took 58.1 seconds. Tutor classification could call the same remote model before answer generation even though every substantive question was subsequently forced through retrieval.
- The selected `mixed` combo nests `openAI`, `claude` and `gemini`; the Claude combo includes Opus Thinking. A short live answer took 28.7 seconds to its first visible token.
- The open JavaScript introduction had no lesson chunks. In this course, 51 of 53 video lessons have chunks; quiz/code content is read directly. Missing transcripts cannot be repaired by claiming citations exist.
- Source selection required the model to copy UUIDs and redundant metadata. Existing video/code/quiz source buttons did not consistently navigate.

## Changes

- Local rule classification; no classifier model call. Bound interactive query embedding to eight seconds, skip embedding when the selected scope contains no indexed chunks, log retrieval/first-token/answer durations and source counts without message text.
- Compact JSON with content first and source indexes. Server resolves indexes to retrieved passages; old UUID citations remain accepted. Unknown IDs cannot fall back to a trusted index. Keep original source numbers to match inline references.
- Video seek times must appear in the retrieved transcript; invented timestamps are dropped. Stored citations contain authoritative source metadata, not model-supplied paths or IDs.
- Explicit persistent notice when a substantive answer has no grounded citations. No fabricated fallback citations.
- Numbered visible source chips; navigation to lessons and safe HTTP(S) resource links. Preview access cannot retrieve a private chapter/course without enrollment.
- Optional server-side `TUTOR_CHAT_MODEL` applies only to tutor requests through 9Router. Empty follows the existing admin model selection. Local environment uses `ag/gemini-3.8-flash`; other AI callers keep their existing routing. Restart backend after changing environment settings. Roll back the override by clearing this variable.

## Measurements

These are individual samples, not latency guarantees:

- Revised live indexed JavaScript question: first visible text 9.72s, complete 11.98s, two validated citations with transcript timestamps. Stream concatenation equals persisted content.
- Revised unindexed introduction: first text 5.83s, complete 7.74s, no fabricated citations and a missing-evidence notice.
- Real authenticated Next.js browser request on the unindexed introduction: 6.98s end to end, notice displayed.
- Real browser question on the indexed C++ variables lesson: 8.76s, visible inline [1] and numbered source chip. Clicking the chip invoked the player seek callback with 1 second, matching the retrieved transcript.
- Automated: 32 chat/context/provider tests passed (including streaming override, forged citation IDs, transcript timestamps, missing evidence, retrieval timeout and preview scope authorization). Frontend `pnpm exec tsc --noEmit` passed.
- Live service probes ran inside rolled-back transactions; no enrollment, progress or financial records changed by those probes. Browser QA sends real tutor messages.

## Limits

- Missing lesson transcripts/embedded resource content remain a content ingestion task. This patch does not invent or automatically re-embed missing lessons.
- 9Router/network/model availability still affects response time. The selected Flash route was discovered and tested successfully; this is not a production SLA.
- API and stored source DTOs remain compatible. No mobile screen changes or deployment were performed.
