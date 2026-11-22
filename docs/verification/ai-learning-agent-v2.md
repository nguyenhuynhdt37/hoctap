# Agent Harness V2 — kiểm chứng và release gates

## A. Mục tiêu

Triển khai các phần P1–P6, hardening P8 trên hệ thống hiện có sau khi người dùng mở quyền quản lý đội subagent và tích hợp tự động. P7 vẫn conditional: không có MCP server/use case được duyệt, không tự tạo kết nối bên ngoài. Không deploy production.

## B. Kiến trúc

Đọc [audit/architecture](../architecture/ai-learning-agent-v2.md) và [runtime contracts](../architecture/agent-runtime-contract.md). Backend modular monolith; PostgreSQL authoritative run/event/tool/approval, native registry và shared text/voice policies. Client actions không được coi như bằng chứng server; Piston/quiz attempts do domain xác minh. Gemini Live/AudioWorklet/RAG/chat threads cũ được tái sử dụng.

## C. File thay đổi

- `studynest_be/app/agent/`: contracts, runtime, native tools, budgets, maintenance, memory, advisor, voice.
- `app/db/models/{agent,code_attempts,quiz_attempts,learning_memory}.py` và additive Alembic k78→p23.
- `api/v1/user/{agent,agent_memory,agent_advisor}.py`, learning/tutor APIs, main registration/lifespan.
- Domain learning access/code security/quiz attempts, tutor RAG/image/OCR bounds, Piston provider, transcript provenance.
- Settings/provider usage metadata, server log credential redaction, aware session expiry, exact CORS, request correlation.
- Frontend existing LearningDetail/Chat/Voice/Code/Quiz/CourseDetail, ActionRegistry/agent provider/status/approval/memory, HTML sanitizer boundary.
- Unit/integration/browser fixtures/scripts and verification reports. No new competing chat, no framework replacement.

## D. API/Database

New `/api/v1/agent` lifecycle/SSE/approval/receipt/memory/advisor/owner metrics endpoints. Existing `/learning/code/...` save/test stays compatible with optional CAS/hash/revision and sanitized durable attempt. Quiz attempts additive. New chunk provenance defaults unknown/unverified; legacy timestamps are never silently promoted.

Initial source local DB revision `h45c78d90e12`; source repository already had i56/j67 unapplied. Private backup `/tmp/maymay-agent-verification/source.dump`. Isolated clone upgraded through `p23ef567a890`; a second disposable database passed upgrade→downgrade j67→upgrade with all six legacy row counts unchanged (courses,enrollments,messages,transactions,purchase_items,lesson_progress). No source database reset or production migration.

**Migration-before-code is required even when AGENT_ENABLED=False**, because legacy code grading/RAG now uses additive attempt/provenance columns. Rollback application should retain additive tables; downgrade deletes new agent evidence and is only tested on disposable clone. Never run downgrade on live user data without separate backup/export review.

## E. Luồng hoạt động

Text request binds owned auth session/page/lesson/context, persists run, selects validated tools, waits approvals/real results, verifies and saves message. UI actions execute official callbacks; events replay never reruns mutation. Code reads unsaved buffers and proposes exact diff, applies only after user approval with revision match, tests through Piston and checks owned attempt ID. Memory disabled by default, explicit proposal+confirmation, scopes/provenance/expiry/deletion. Advisor evaluates public metadata criteria without fit percentages. Voice filters native tool declarations and dispatches through same runtime; audio remains transient.

## F. Security

Fixed teacher-solution/hidden-test context leakage, sample flag mismatch, unauthorized code/lesson operations, stale saved-code PASS, consent revocation race, memory tombstone corruption, raw memory in telemetry, HTML/Markdown XSS, unsafe global TLS disable, query credential log exposure, timezone-expiry mismatch. No finance/admin/system tool in registry. Prompt/source/tool/model content cannot grant permission. Real sandbox tests cover timeout/network/output/memory and multi-file execution.

## G. Tests — actual evidence

- Backend full unit suite, rerun 2026-11-13 after the voice close-out: **239 passed + 7 subtests**. The voice file covers a tool call that keeps the transcript captured when the provider event arrives, even if `user_text` is cleared before the dispatch runs, and a configured `AGENT_MAX_RUN_COST_USD` that refuses `run_tutor_voice` before `genai.Client` is constructed.
- PostgreSQL combined runtime/memory/advisor/domain/HTTP run on isolated database `maymay_agent_verify_9f7095b1ed`: **25 passed**. This is not the source database.
- Frontend: **9 registry/SSE + 6 renderer security + 2 receipt evidence tests passed**. `tsc --noEmit` exit 0. Next.js production build exit 0, **76 static pages**. The build used `NEXT_DIST_DIR=.next-agent-closeout` so the already running dev server kept its own cache; that temporary output was removed after the log was saved.
- Browser E2E on isolated database: **6/6 passed**. Actual page/player callbacks, notes, unsaved code→diff→approval→Piston sample→undo, lesson navigation, mobile overflow, no uncaught exceptions. Planner was a deterministic **scripted model fixture**, all tool outputs and receipts real.
- Advisor/memory/XSS browser script `scripts/browser/test-agent-advisor-memory-security.cjs` against the isolated fixture: **5/5 passed**. Guest Advisor claims match live public-course metadata, comparison fields match the other course's public context, a malicious Advisor payload does not become an active DOM node, and memory opt-in → propose → confirm → supersede → delete → revoke matches the server. No uncaught page errors. Speech was an explicit button only; synthesis quality is NOT VERIFIED.
- Real 9Router selection probes: **4/4 passed**; real authenticated API/SSE/model run passed with provider-reported usage and simulated UI callback. These are separate from real browser callback verification; not a production capacity benchmark. One cold model request measured 66.366s; greeting now deterministic. This probe was not repeated in the 2026-11-13 close-out.
- Real Gemini Live native probe: actual tool invocation + PCM output; **SDK synthetic text input and simulated player receipt**, not physical microphone proof. The synthetic-stream browser check `scripts/browser/test-agent-voice.cjs` then passed: AudioWorklet sent PCM frames, Gemini Live returned audio, and `ui.open_panel` opened notes with a verified receipt. Stop ended the microphone tracks. Page errors: none. Physical microphone, echo cancellation, Safari, and iOS remain NOT VERIFIED.
- Real Piston: **14/14 active runtimes, 26/26 lecturer solutions across 77/77 cases, 6/6 sandbox checks**. See [code security](agent-code-security.md) and [evidence](agent-code-security-evidence.json). Not repeated in this close-out.
- Provenance tests verify structured caption anchors and stale-video rejection with fixtures; live caption network fetch NOT VERIFIED.

## H. Remaining release gates

Production load/concurrency/cost benchmarks, physical microphone/echo cancellation and Safari/iOS, legal/parental consent/retention operations and deletion from backups remain unverified. Optional monetary admission fails closed for unknown model rates; audio monetary admission disabled/fails closed because actual voice invoice accounting is not implemented. Provider usage tokens and declared-rate estimates are distinct from actual billed charges. No approved external MCP connector is implemented or exposed.

Local source database `studynest` was backed up before upgrade to `/tmp/maymay-agent-verification/source-20261113-closeout.dump` (PostgreSQL custom format, 7275794 bytes, restore TOC listed). Revision moved from `h45c78d90e12` to `p23ef567a890` by the additive chain i56→p23 only. Row counts were unchanged: courses 161, course_enrollments 27, tutor_chat_messages 393, transactions 116, purchase_items 27, lesson_progress 26. No downgrade was run. Local `.env` sets `AGENT_ENABLED=true`. The reloaded API on port 8000 answers `POST /api/v1/agent/sessions` with 401 when no cookie is sent, which is the enabled path; the disabled path is 503. Legacy `TutorChatService.get_threads_by_lesson` returned one thread for an enrolled lesson that already had progress. Production migration and deploy are not authorized.

## I. Bước tiếp theo

The local close-out in section G is recorded. Section H stays open: production load, concurrency, and cost benchmarks; physical microphone and echo cancellation; Safari/iOS; legal and parental consent, retention, and deletion from backups; actual billed voice charges; and any external MCP connector. Those gates are still unverified. This local rollout is not a production release.
