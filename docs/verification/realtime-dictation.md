# Realtime dictation

Verified 2026-11-14. Applies to the shared microphone button in account chat and lesson chat.

The old recorder-then-upload path is replaced by a dedicated live transcription socket. The browser resamples mono PCM16 to 16 kHz in an AudioWorklet and sends 100 ms frames after the authenticated socket reports ready. Provider input-transcription fragments produce sequenced full-text snapshots. The current capture replaces its own draft suffix rather than appending every interim result. Existing typed text is preserved; speech never automatically sends a chat message. The composer is editable again after stopping.

`POST /api/v1/agent/dictation-ticket` authenticates the account/session and issues a single-use, 30-second ticket. `/api/v1/agent/dictation` redeems it via subprotocol, validates origin and database session, and holds one expiring account lease. Tokens do not enter URL parameters. Authentication is checked again during longer captures. PCM sizes/rate, control messages, duration and transcript length are bounded. Default duration is 120 seconds; draft length remains 12,000 characters.

Live recognition uses xAI streaming STT through the server-side `XAI_API_KEY`. The default `TUTOR_DICTATION_MODEL` is `grok-voice-transcribe-2.0`. The endpoint returns transcription only. Audio is transient. Batch STT has separate configuration.

Stopping closes microphone tracks immediately, flushes the final short worklet frame, sends an audio-end signal, and drains the final transcription for up to three seconds. Client cancellation, unmount, device loss, setup timeout, backpressure and disconnect release microphone/context/socket resources and retain recognized text. There is no automatic reconnect/replay that could duplicate speech. HTTPS/WSS and modern AudioWorklet support are required. Recognition updates arrive in provider-defined fragments, not a simulated word animation.

Evidence:

- **39 backend tests passed**, including real PostgreSQL auth + HTTP ticket + WebSocket transport with a scripted provider, ticket replay rejection, origin/query credential rejection, lease isolation, provider failure cleanup, partial-before-stop and final-tail draining.
- **Six frontend lifecycle/draft tests passed** (`node --test scripts/test-realtime-dictation.cjs`), plus the recorder worklet test including final 50 ms flush and repeated-flush deduplication.
- Frontend TypeScript check passed.
- Real `gemini-3.8-live` probe with synthetic Vietnamese speech produced two transcript updates before stopping and the correct final sentence. See `dictation-live-probe.json`. No user microphone recording was used.

No signed-in browser flow with a physical microphone was performed. Browser resource lifecycle is covered with controlled media/socket mocks; the real provider and authenticated server transport were verified separately.
