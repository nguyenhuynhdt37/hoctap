# Kiểm chứng Hannes theo tài khoản

## Đã kiểm tra

- TypeScript: `cd studynest_fe && npm run typecheck`.
- Unit: 89 test (gồm bộ kiểm tra transport GitHub cuối cùng); các suite `test_account_assistant`, `test_agent_memory_advisor`, `test_agent_runtime`, `test_agent_voice_adapter`, `test_agent_mcp`, `test_tutor_voice`.
- PostgreSQL: 21 test integration chạy trên database scratch chỉ sao chép schema, dữ liệu fixture tổng hợp. Kiểm tra memory không hết hạn, giữ dữ liệu khi xóa khóa nguồn, xóa theo tài khoản, SQL không đọc tiến độ của người khác, cùng các kiểm tra runtime/memory race.
- `node scripts/test-assistant-audio.cjs`: frame PCM 16 kHz, giữ thời gian 100 ms, lọc tiếng nền, chỉnh ngưỡng khi đang chạy và chống tràn PCM.
- `scripts/browser/test-account-assistant.cjs`: SQL tool thực thi trên snapshot của tài khoản; lịch sử còn sau reload; cài đặt giọng/tốc độ lưu vào tài khoản; thu nhỏ và chuyển trang giữ đúng một socket, frame mic tiếp tục; kết thúc đóng audio; thiếu cấu hình GitHub hiển thị thông báo phù hợp.

## Phạm vi kiểm tra trình duyệt

Frontend/backend và database riêng; planner xác định để kiểm tra việc nối công cụ thật, không đánh giá chất lượng model. Microphone và socket voice được mô phỏng bằng thiết bị headless; không ghi âm người dùng hoặc mở phiên Gemini. Unit test riêng kiểm tra relay voice, auth, ngân sách audio và cấu hình provider.

OAuth state/PKCE, tách tài khoản và mã hóa token được kiểm tra bằng fixture. Chưa xác thực OAuth thật với GitHub vì môi trường hiện thiếu Client ID/Client Secret; không tạo hoặc giả lập một kết nối người dùng thành công. Chưa kiểm tra cảm nhận tốc độ/chất giọng trên micro và loa thật.

Migration đã áp dụng tới `s67ij901e234`. Kết quả browser và ảnh QA được lưu trong `/tmp/hannes-verification/`; không có token trong báo cáo. Credentials thử nằm ở file riêng quyền 0600.


## GitHub sign-in configuration

Added stable login identities, shared OAuth callback, minimal sign-in scopes, browser nonce binding, and encrypted refresh-token rotation. Migration `t78jk012f345` applied locally. Verified: 24 unit tests, 3 isolated database tests, frontend typecheck, and live OAuth-start request through port 3000 (correct client/callback, HttpOnly nonce). Real GitHub authorization still requires completing the provider consent screen; OAuth-start alone does not validate the client secret. Credentials are stored only in ignored backend `.env` (0600), never in this report.


## Native voice regression fix

Account settings had selected Fenrir at 0.9×; restored the requesting account to original Aoede at natural pace. Prior playbackRate manipulation transposed native speech. Playback now stays at 1; pace is requested from the provider with bounded input. Mic gate retains quiet syllables for 300 ms, then returns silence for turn detection; default threshold is 0.012. AudioContext resume failures surface instead of silently dropping playback; startup buffering is 80 ms.

Verified 34 unit tests and 10 subtests across voice, adapter and account boundaries, microphone worklet timing/hangover/silence/clipping, and frontend typecheck. Real backend WebSocket + real Gemini Live test used synthetic Vietnamese speech in the isolated database: two consecutive turns both transcribed input and output and returned 97,920 / 90,242 PCM bytes. This validates provider/backend continuity; subjective sound quality and the user's physical microphone are not measured. Local evidence: `/tmp/hannes-verification/audio/live-report.json`.


Browser component verification also passed with a synthetic mic/socket: reset selects Aoede, requested 0.85 pace keeps native buffer playbackRate=1, a suspended AudioContext resumes, minimized capture continues, and stop closes the socket. Evidence: `/tmp/hannes-verification/audio/player-report.json`. The broader account UI scenario could not find its assistant launcher in the temporary app fixture and did not complete; it is not counted as passing navigation verification for this change. Actual user mic perception remains a manual check.


## Connected GitHub repository discovery

Added authenticated, paginated repository listing, account connection context/status tool and deterministic handling of “list github”. Unit coverage verifies pagination/identity schema restrictions, no anonymous listing, fixed GitHub URLs, and concurrent task credential isolation. Live verification in the user's already linked account through the existing Hannes UI returned 20 GitHub repo links, completed successfully and offered the next page. No token, client secret, or private repo names are recorded in this report.


## Chat execution activity

Implemented shared per-message execution cards in account and lesson chats. Verified: TypeScript check; 47 unit tests across activity projection, runtime and account assistant; isolated PostgreSQL activity test (owner/message isolation); browser with scripted planner and real backend SQL/SSE verifies live analysis, tool name, SQL input/result and reload durability without console errors. A live signed-in history request also returned persisted activity successfully. Activity displays public execution events, not hidden reasoning; shell execution was not added. Screenshot and report: `/tmp/hannes-verification/activity-desktop.png`, `/tmp/hannes-verification/activity-browser-report.json`.


## Multimodal account chat and dictation

Applied `u89kl123g456` (nullable run input-message FK). Real R2 upload + real native vision identified a cat from pixels, described visible features and answered a follow-up without resending. Real speech-to-text returned the spoken Vietnamese question rather than answering it. Real Gemini Live loaded one private image and answered the spoken animal question with 322,560 PCM bytes and transcripts for both sides. Tests use an isolated verification account/database and synthetic speech, not the user's mic.

Browser verification uses a scripted image-aware planner and a deterministic transcription response: real image upload/preview, JPEG bytes reach planner, image history survives reload, dictation fills editable text without submitting, all mic tracks stop, no page errors. Separate provider evidence prevents mistaking scripted UI output for actual image recognition. Evidence: `/tmp/hannes-verification/multimodal-report.json`, `voice-image-report.json`, `multimodal-browser-report.json`. Unit tests cover normalization/alpha/EXIF, corrupt/oversized input, private owner/path checks, image count, and actual multipart model content. Integration test verifies persistent message linkage and thread/owner isolation.


## Own-name and request-volume regression

Own-name requests use the authenticated profile snapshot before loading lesson, image, memory or GitHub context; zero model/tool calls. Friend/animal/quoted/compound requests do not match this shortcut. Profile fields are copied to a plain snapshot to avoid expired ORM lazy loads across worker rollback/refresh. Voice prompt receives verified profile name as well.

Removed unconditional window-focus refresh from memory/GitHub controls and catalog filters. Explicit memory events, opening controls, successful mutations and OAuth callbacks still refresh where needed. Account chat now commits the completed SSE message into local history instead of GETting all 50 messages after every send. Browser test dispatches five focus events and asks own name: only session creation, context PUT, run POST and SSE GET; zero unrelated requests or conversation reloads. Evidence: `/tmp/hannes-verification/request-count-report.json`. Isolated integration verifies a completed profile answer while full context construction raises if touched and tool-call count remains zero.


## Automatic long-term memory

Added `v90lm234h567` for personal facts. Explicit durable user statements automatically become usable profile memories for text and voice while consent is enabled; public notification carries only count/IDs. Isolated database test confirms persisted context reuse, no default expiry, duplicate suppression, preferred-name replacement, forgotten-fingerprint suppression, foreign account isolation and disabled-consent behavior. Unit tests cover first-person declarations, questions/quotes/opt-out/sensitive exclusions. This is conservative explicit-statement capture, not universal semantic extraction or a claim of feature parity with ChatGPT memory.


## Conversational playback and voice style

Polite direct requests such as “Anh có thể phát bài này lên được không?” resolve to video.play and pass the same user-intent gate for text/voice tools. They bypass lesson retrieval and model planning, wait for verified player receipts and report unavailable player capability honestly. Current-lesson questions resolve to authorized lesson metadata. Thanks/farewell are excluded from grounding. Shared voice/text style requests natural standard Vietnamese, consistent chosen pronouns, no repeated invented “nạ/chớ nè” endings, and a short ending when the user wants to stop learning.

Verified 11 targeted intent tests (polite requests, negations/quotes/conditional text, metadata and thanks), 62 existing runtime/security/voice tests plus 10 subtests, and an isolated PostgreSQL playback integration: the exact reported request creates only video.play, remains executing until receipt, then returns completed with a verified play response. Subjective spoken delivery after prompt change still needs the user's listening check.


### Greeting-prefixed playback regression

The exact request “Hello, phát video nha” previously missed the intent gate because of both the leading greeting and trailing “nha”. Playback intent now strips one standalone greeting and accepts “nha/nhá”; quoted, negated, conditional and compound requests remain excluded. Latest verification: 48 unit tests and two isolated PostgreSQL playback cases passed.

Live verification on the authenticated localhost:3000 VTV7 lesson sent that exact request through the existing chat. The new response completed with one video-control tool (1.81 seconds), no knowledge search, and “Đã phát video bài đang mở.” The player context changed from paused at 0:00 to playing at 0:05 and 0:12, with active YouTube captions. Older permission_denied traces remain historical messages.


## Assistant-scoped settings

Added a shared gear entry in account and lesson assistants. Voice/microphone, memory and GitHub settings render as separate sections within the assistant bounds, without a viewport backdrop, modal or body scroll lock. Removed voice preference controls from the call modal. Voice preferences save explicitly to the existing account endpoint; an update event refreshes an already mounted idle voice dialog. Active calls disable preference changes.

Verified frontend TypeScript check and live lesson UI: settings width 399px in a 2004px viewport; voice select and two sliders render; memory and GitHub tabs stay inline with zero aria-modal dialogs and no body scroll lock. Returning to chat closes settings and restores trigger focus. No account preferences or memory were changed during browser verification.


## Execution timeline presentation

Replaced nested activity cards with an expanded-by-default timeline shared by lesson/account message bubbles. Shows authorized context, public plan, named tool calls, command/SQL input, bounded redacted results, errors, memory-save events and elapsed run time; live runs update the clock once per second. Each tool and the entire timeline can be collapsed independently. Model private reasoning is neither requested nor displayed; Bash appears only for an actual shell tool event, and no shell execution capability was added.

Verified TypeScript and live authenticated lesson history: timeline and tool details initially expanded, inputs/results visible, width/scrollWidth both 359px (no horizontal overflow), elapsed time and persisted plan rendered. Collapsing the timeline hides detail content. Browser inspection did not send a new message or modify account data.


## Personal questions bypass lesson grounding

Fixed the exact informal own-name request “tớ tên gì v” and added a deterministic owner-memory inventory route for “trong memory tôi lưu gì”. Both finish before lesson context, RAG, GitHub/image loading or model planning; completion does not attach unrelated lesson sources. Name lookup prefers the most recent confirmed, unexpired profile name statement, including manually entered “tên tớ là …”, then falls back to the account display name. Pending names are excluded.

Memory inventory uses the same owner-filtered listing as settings; it distinguishes confirmed items from pending proposals, excludes deleted/expired/foreign records, respects disabled consent and reports empty memory honestly. Output is bounded below the message limit, escapes stored Markdown, and discloses truncation. Quoted statements in an inventory are data, not claims that the assistant executed mutations.

Verified 32 personal-routing unit tests, 19 playback intent regression tests, 47 runtime/security unit tests and six isolated PostgreSQL integration cases. Live authenticated lesson UI: both exact requests completed at displayed 0s, zero tools and no lesson citations; a further own-name request used the manually saved name successfully. No memory records were modified by the live checks.


## Broader routing and model-selected durable memory

Supersedes the earlier regex-only automatic capture path: text now consumes model-selected extractive memories in the existing planner response; voice schedules bounded background selection after transcript commit. Added server-side relevance gates, 99 curated routing cases, owned-thread follow-up routing, an unanchored clarification fast path, and same-run retrieval reuse. Added migration w01mn345i678 for a non-content topic tombstone hash; applied to the local development database. The isolated schema snapshot received the equivalent additive column without rewriting its old migration history.

Final evidence and commands: docs/verification/assistant-routing-memory.md. Unit suites: 285 passed + 13 subtests; database coverage: 44 distinct passing cases across final relevant suite runs, including an opt-in real model→PostgreSQL→next-turn reuse lifecycle. TypeScript and diff checks passed. Provider evaluations retain their initial timeout results and recheck results separately; a later raw-planner follow-up probe still timed out, while the application now handles unanchored follow-up without a model call. Voice background memory remains best effort rather than a durable job queue.
