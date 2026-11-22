# 9Router media capability verification

Checked the configured 9Router instance on 2026-11-13. No application settings or provider routing changed. Credentials were read from backend settings and sent only in authorization headers to the configured origin; no secrets are recorded here.

| Check | Observed result |
| --- | --- |
| GET /v1/models | 200; 24 model IDs. gemini-3.1-flash-lite and gemini-3.8-live not listed. |
| ag/gemini-3.8-flash-low capabilities | vision=true, audioInput=true, audioOutput=false |
| Actual image via /v1/chat/completions | 200; model returned “Mèo” for public cat image. Response model label: gemini-3.8-flash-n. One sample: 44.55 seconds. |
| Actual WAV via input_audio in chat/completions | 200; transcribed synthetic Vietnamese speech correctly rather than answering it. Same requested/reported model. One sample: 16.72 seconds. |
| GET /v1/models/stt and /v1/models/tts | Both 200, empty data lists. |
| POST /v1/audio/transcriptions | 400 invalid_request_error/bad_request for the tested ag/gemini-3.8-flash-low model. No listed STT model available to select. |
| GET /v1/realtime | 404. |
| WebSocket /v1/realtime?model=gemini-3.8-live | Connection timed out within 15 seconds; no realtime handshake validated. |

Image and audio-to-text can be routed through the tested multimodal chat route using a different model ID from the current direct Gemini setup. Dedicated STT is not operational with the tested configuration; realtime audio generation/duplex voice was not verified and is not a supported replacement established by these tests. These are single-request observations, not latency benchmarks or claims about every 9Router deployment.

Upstream documentation describes vision/audio capability detection and STT support, but runtime provider connections differ: https://github.com/decolua/9router/blob/master/skills/9router-stt/SKILL.md . The instance response is authoritative for the models enabled here. Local detailed results: /tmp/hannes-verification/9router-media-report.json (no credentials).


## Application configuration change

At the user's request, local backend `.env` now selects 9router / ag/gemini-3.8-flash-low for AGENT_VISION and TUTOR_TRANSCRIBE. Added a selectable dictation provider and audio-input chat adapter; dedicated /audio/transcriptions is not used. No voice-call setting was changed. Unit validation: 21 tests and 3 subtests across audio MIME/payload routing, friendly error without Google fallback, image normalization, and existing router chat behavior. Live selected-adapter validation is recorded separately at /tmp/hannes-verification/router-config-report.json.


Final selected-adapter validation passed after using non-streaming vision requests and normalizing browser WebM to mono PCM16 WAV. Vision returned “Mèo”; the dictation service transcribed the converted browser recording correctly. The initial SSE vision probe timed out and the initial WebM dictation exceeded its 55-second HTTP deadline; raw WebM did return 200 in a separate 58.84-second test. The router is therefore operational but latency can be variable; its dictation processing deadline is now 90 seconds with an 85-second HTTP timeout. No automatic Google fallback was added. Frontend TypeScript passed; the actual browser audio conversion validated RIFF, mono and 16000 Hz output. Updated unit suite totals 22 tests plus 3 subtests across router dictation, vision and LLM behavior (the final added nonstreaming regression test also passed).
