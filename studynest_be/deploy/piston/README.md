# Hosted StudyNest code runner

Deployed on `webdeploy` on 2026-11-12, using the existing KTCT domain routing
architecture. This deploys the project's Piston runner, not a separate grading
engine. Backend code, exercise tables and frontend/mobile contracts are reused.

## Route and authentication

`https://piston.itup.io.vn` → existing Traefik gateway `10.10.10.99` →
`10.10.10.100:14000` → authenticated Nginx → Piston container.

The application calls the HTTPS domain, without a Tailscale endpoint. SSH used
Tailscale for host administration only. DNS already resolves through the same
Cloudflare setup as KTCT. Traefik uses its existing `websecure` entry point and
`letsencrypt` resolver.

- Public `/` and `/health`: service health only.
- `GET /api/v2/runtimes`: requires `Authorization: Bearer <private runner key>`.
- `POST /api/v2/execute`: requires the same key; request size/rate are limited.
- Package management and other routes: blocked on the public domain.
- Admin package installation: `127.0.0.1:14001`, accessible on the server only.

Backend configuration (private `.env`, never a `NEXT_PUBLIC_` variable):

```dotenv
PISTON_URL=https://piston.itup.io.vn
PISTON_API_KEY=<private runner key>
```

The deployed key is in `/home/admin/studynest-piston/.env` with mode `0600`.
The backend's local `.env` has been configured. Do not print or commit the key.
`PistonService` sends it for execution and runtime sync; local runners without a
key remain compatible. Frontend/mobile continue calling authenticated backend
grading endpoints and never receive the runner credential.

## Containers and limits

Server directory: `/home/admin/studynest-piston`.
Compose project: `studynest-code-runner`.
Containers: `studynest_piston`, `studynest_piston_gateway`.
Images are pinned by digest in `compose.yaml`; do not auto-upgrade them.

Piston uses its upstream Isolate sandbox and required privileged container mode.
Only its runtime package volume is mounted; no application directories or Docker
socket are mounted. Outbound networking from submitted programs is disabled.
The runner has a 2 GiB container limit, two CPUs and two concurrent jobs. Defaults
are 3 seconds per run, 10 seconds to compile, 256 MiB run memory, 768 MiB compile
memory and 64 KiB output. Existing exercise-specific checks remain in the backend;
they are separate from these runner-wide execution limits.

Runtime package data persists in `studynest-code-runner_piston_packages`.
Logs rotate at 10 MiB × three files per container.

## Operations

On the server:

```sh
cd /home/admin/studynest-piston
docker compose up -d
python3 install_piston_runtimes.py --base-url http://127.0.0.1:14001
docker compose ps
docker compose logs --tail=100
```

The installer is idempotent. Eleven packages expose the fourteen language/version
pairs already active in StudyNest: Bash, C, C++, D, Fortran, Go, Java, Kotlin,
JavaScript, PHP, Python, Ruby, Rust and TypeScript.

`register_traefik.py` was run on the existing gateway. It adds only
`studynest-piston-router` and `studynest-piston-svc`, takes a backup and writes
atomically. The initial gateway backup is:
`/opt/traefik/backups/dynamic.yml.before-piston-20261112T105121Z`.

From `studynest_be`, verify without changing exercises or student progress:

```sh
.venv/bin/python scripts/smoke_piston.py --check-lessons
.venv/bin/python -m pytest tests/unit/test_code_runner_provider.py -q
```

## Verification

- HTTPS health succeeds; runtime requests without a key return 401.
- Package endpoints remain inaccessible on the public domain.
- All 14 active language/version pairs compiled/executed successfully.
- All 26 existing lecturer solutions passed their 77 stored test cases.
- An infinite loop was terminated with Piston status `TO`.
- A submitted Python program could not connect to the network.
- Authenticated lecturer grading was exercised through the running Next.js API
  proxy and backend, against the hosted HTTPS runner; real C++ cases passed.
- Authenticated learner API requests returned `time_limit_exceeded` for an
  infinite loop and `runtime_error` for invalid C++, without changing saved
  code pass flags.
- Real student grading also passed the stored C++ time/memory limits in a
  rollback-only verification transaction; progress events were suppressed.
- The grader now handles nullable exit codes on timeout and compile failures,
  instead of incorrectly returning an internal error or treating missing runs
  as successful. Unit tests cover those classifications.
- No browser/mobile interaction or load/capacity certification is claimed.

## Rollback

Restore the backend's prior local runner URL and remove its hosted runner key,
then restart/reload the backend. The local pre-change `.env` backup is stored
privately outside the repository under `/tmp/hoctap-code-deploy/`.

Remove only the two `studynest-piston-*` objects from the gateway dynamic config;
preserve concurrent KTCT routing changes rather than blindly restoring an old
whole-file backup. Then run `docker compose down` in the runner directory.
Do not use `down -v`: preserve installed runtimes. No database migration or reset
is required. Exercise, enrollment, finance and learning history stay unchanged.
