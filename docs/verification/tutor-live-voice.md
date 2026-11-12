# Mây Mây lesson voice tutoring

## Architecture

- Existing lesson chat now offers a microphone entry and accessible Cloudy Blue voice dialog, with a reactive cloud orb, microphone/speaking waveform, live captions, mute, stop and reconnect controls.
- Browser captures mono microphone audio with echo cancellation and noise suppression. A dedicated AudioWorklet resamples it to PCM16/16kHz. Browser Web Audio schedules received PCM16/24kHz audio and drops its playback queue on Live interruption events.
- `WS /api/v1/tutor-chat/lessons/{lesson_id}/voice` authenticates the existing StudyNest session and roles. Browser auth uses a WebSocket subprotocol, not a query-string token. Google API key stays on the server.
- Backend connects directly to Gemini Live, independent of text chat's 9Router model selection. Native input/output transcription, Vietnamese instructions, automatic voice activity detection and interruption are enabled.
- A blocking `search_lesson(query)` function delegates to the existing tutor retrieval service. User and lesson IDs are pinned server-side, scope is the current lesson, and access is checked again on each retrieval. The client cannot supply course/owner IDs, upstream API endpoints or a Google model.
- Grounded source metadata and transcript-derived timestamps reuse the existing source DTO and chip UI. Source selection stops voice before returning to the lesson/video. Missing evidence is disclosed both visually and in the model instructions.
- Completed turns reuse `tutor_chat_threads`/`tutor_chat_messages`, including citations. Partly completed transcribed turns are marked interrupted on graceful exit where available. Audio is not stored. No database migration or parallel conversation/learning engine.

## Configuration

`GOOGLE_API_KEY` is the existing server credential. Defaults:

```
TUTOR_VOICE_ENABLED=True
TUTOR_VOICE_MODEL=gemini-3.8-live
TUTOR_VOICE_NAME=Aoede
TUTOR_VOICE_MAX_SECONDS=600
TUTOR_VOICE_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

`FRONTEND_URL` also supplies an allowed browser origin. Add the real HTTPS origin before deployment. Native clients can omit Origin but still require valid authorization. Install the explicit `google-genai>=3.0,<4` dependency. Redis must be available; sessions fail closed if the distributed admission lock cannot be acquired.

- One active voice session per user across workers, enforced by a Redis NX lease with TTL and compare-and-delete cleanup.
- Each session is capped at 10 minutes by default. Reconnect is an explicit user action; there is no endless retry loop consuming quota.
- Audio frames are at most 16KB and rate-limited to real-time PCM throughput with two seconds of jitter. Idle input expires after 90 seconds. Retrieval is limited to four searches per turn, query size is bounded, and existing interactive embedding timeout applies.
- Authentication, account bans/deletion and lesson access are checked initially and periodically during audio streaming. Provider errors are sanitized, never exposing API keys or upstream URLs.
- Closing the dialog, switching lessons, leaving the page, stopping or an error stops the audio tracks, closes the AudioContext/socket, and clears pending playback. The existing mobile-width chat panel is capped to the viewport.

## Verification

- Live connection with the existing key and `gemini-3.8-live` accepted; synthetic Vietnamese voice was heard and transcribed.
- Real authenticated backend voice question about the C++ introduction called retrieval, returned a validated video source with a timestamp, emitted spoken audio and persisted the complete turn.
- Real browser flow with a synthetic microphone stream: AudioWorklet input recognized correctly, audio output played, waveform reacted, transcript rendered, and the unindexed JavaScript introduction displayed the missing-evidence notice without fabricated sources.
- Mute disabled the microphone track and sent audio-stream-end; unmute restored it. A second synthetic utterance during model speech produced a real Live interruption event, stopped the first reply and answered the new question. Both turns appeared separately, the first marked interrupted.
- Explicit Stop ended microphone tracks; test overrides were restored and all synthetic AudioContexts closed. No active voice Redis leases remained after cleanup. Page unload also released its session lease.
- Actual API checks: duplicate session rejected; anonymous access rejected; foreign origin rejected; unenrolled private lesson rejected before provider connection.
- 43 focused backend chat/voice/provider tests passed. Frontend TypeScript passed. Desktop and mobile voice dialog visually inspected; permission denial displays a retryable Vietnamese message.

## Release limits

- Local verification is not a production load/latency guarantee. Free-tier capacity can vary and limit concurrent students. Session admission is per user, not a paid quota-management product.
- Browser QA uses generated audio instead of recording the user's physical microphone. Physical-device microphone/echo cancellation and Safari/iOS audio lifecycle need device testing before broad rollout.
- Opening voice pauses the lesson through its existing player hook. Closing voice does not automatically resume lesson playback.
- Existing native mobile screens were not changed. Mobile web layout was inspected.
- Voice is limited to current-lesson retrieval; switching lessons ends the session. No camera/screen sharing or background always-on microphone.
- Turn captions are provider transcriptions, not a verbatim recording. A hard process/network failure can prevent saving the unfinished turn. Already committed turns remain in normal chat history.
- Disable `TUTOR_VOICE_ENABLED` and restart workers to roll back voice without changing stored chat history. Restore prior dependency/application release if needed; no financial or entitlement data is affected.
