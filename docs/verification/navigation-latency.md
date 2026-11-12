# Navigation latency — 2026-11-13

## Observations

- The running development process still used `next dev --webpack --port 3000`, although `package.json` already used `next dev --port 3000`.
- Next's `.next/dev/trace` recorded a `/profile` compilation of 10.601 seconds and, during subsequent edits, another of 73.969 seconds. The corresponding cold navigation stalled while compilation ran.
- Separate authenticated API requests to auth, profile, and notifications took approximately 46–81 ms during the initial sample. Repeating the already compiled profile route took 118–169 ms before changes. These observations distinguish compilation delays from backend request latency; they are not a controlled before/after benchmark.

## Changes

- User/admin notification requests now run inside their own Suspense boundaries. Route content no longer waits for those requests, and notification failures do not fail the route.
- Profile loading requests `/profile` directly, avoiding a redundant sequential `/auth/check_is_login` request. A 401 still redirects; network/5xx failures display an error.
- Dynamic Island navigation uses Next Link, preserving motion styling and enabling production prefetch while the menu is open. Hidden menu links do not prefetch. Home scrolling and logout remain actions.
- Added a loading boundary for user pages, retaining the shared header/footer during page data loading.
- The floating AI panel imports its Markdown/chat implementation only when opened.
- The root HTML declares smooth scrolling so Next can reset scrolling immediately on navigation.
- Restarted the development server with `pnpm dev`; startup confirms Next 16.0.3 with Turbopack. Current development output is written to `/tmp/maymay-next-dev.log`.

## Verification

- `npm run typecheck`: passed.
- `node scripts/test-navigation-performance.cjs`: passed. Tests a single profile request, genuine-expiry redirect, transient failures, and user/admin rendering without waiting for notifications.
- `node scripts/test-refresh-session.cjs`: passed.
- `node scripts/test-lecturer-frontend.cjs`: passed.
- Real browser menu clicks on Turbopack: first profile navigation 2281 ms; return to instructors 208 ms; repeat profile navigation 438 ms; return to instructors 167 ms. Timings end when the destination content appears and exclude the test's pause before clicking.
- Server logs for those requests: profile 1953 ms (1718 ms compilation), instructors 61 ms, profile 141 ms, instructors 104 ms.
- The lazy AI panel opens successfully and displays its message input. No messages were sent during verification.

The first visit to an uncompiled route can still take seconds in development. Production prefetch is not exercised by the development-server measurements above.
