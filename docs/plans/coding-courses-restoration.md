# Restore the two coding courses — 2026-11-12

The original C++ and JavaScript course IDs had been reused for math drafts while
their original curricula were attached to archive rows. Purchases and enrollments
still referenced the original IDs. Coding content is now back on those IDs; math
drafts are preserved separately.

| Product | Original ID / public slug | Preserved curriculum |
| --- | --- | --- |
| Tin học THPT · Nền tảng lập trình C++ | `075522a0-adb5-4816-9593-da0d254acf45` / `lap-trinh-c-co-ban-nang-cao` | 11 sections, 13 lessons, 12 exercises, 33 test cases |
| Tin học THPT · JavaScript và lập trình web | `e03af09c-57cc-4eec-b16d-47ccf745aa25` / `lap-trinh-javascript-co-ban` | 14 sections, 63 lessons, 14 exercises, 44 test cases |

Both products are public under `tin-hoc`, grades 10–12, using the shared Cloudy
Blue catalog/detail UI. Introductions, outcomes, requirements and audience now
describe actual content. C++ is foundation material; unfinished advanced chapters
remain in its existing outline. Original base prices are preserved.

Two covers were generated with built-in `image_gen`, optimized to 1600 × 900 JPEG
and uploaded with `FileStorageService` to R2. Full prompts and workspace paths are
in `data/lessons/covers/coding-generated-assets.json`; R2 references are in
`coding-cover-map.json` and `coding-assignments.json` there. Course metadata
embeddings and full-text indexes were regenerated. Lesson/chunk embeddings were
not rewritten.

## Preservation

`scripts/restore_coding_courses.py` is scoped to four explicit original/archive
IDs. Applying it requires a PostgreSQL custom-format backup. The private local
backup is `/tmp/hoctap-restore-coding/before-restore.dump` (0600), outside Git.

Only parent pointers are swapped for sections and lessons. Related quiz,
progress, navigation and tutor-context parents are aligned. IDs, titles, order,
video references, quizzes, solutions, test cases and history payloads stay intact.
Navigation has a composite primary key; identical user/lesson/timestamp payloads
are moved within one transaction to avoid uniqueness collisions during the swap.

Before commit, counts and canonical JSON fingerprints across 17 content/history
tables must match, excluding only the moved `course_id` pointer. Separate checks
compare every field in purchases, transactions, enrollments, coupon targets,
reviews, favorites and bundle/path references. The 16 purchase items,
16 transactions and 9 enrollments stay unchanged. Base prices remain
1,299,000 VND and 999,999 VND; no ledger or entitlement mutation is performed.

Math drafts remain private under `b81809f1-f8c6-59b2-9400-0aa9decb010b` and
`0b604358-05c9-53ff-a57e-186151cc74a8`, with their curriculum and classification.
They do not inherit the code products' cached student/review metrics.

## Verification

On an isolated local database restored from backup, with embedding mocked:

- Injected embedding failure rolled back the entire restoration.
- Successful restoration and idempotent retry preserved all fingerprints.
- Original products became public; math drafts remained private.
- Cached statistics matched actual reviews and enrollments.

The temporary database was removed after verification. On the main local DB,
real configured Gemini embeddings were generated and preservation checks passed.

Running application verification:

- Both products appear in `/courses?subject=tin-hoc` and grades 10, 11, 12.
- Original detail URLs return HTTP 200.
- R2 images match recorded hashes and 1600 × 900 dimensions.
- Browser catalog/detail show new copy and loaded covers.
- Protected content/history and commerce fingerprints still match.
- Frontend TypeScript check passes.

Old cached rating counters had no corresponding reviews. They now derive from
actual review/enrollment rows. The header shows “Chưa có đánh giá” instead of a
default 5.0. Instructor public metrics use published courses, distinct active
students and actual reviews instead of stale profile counters. Private draft
counts are excluded. Profile biography and review rows are not replaced.

No browser/mobile load or production-readiness certification is claimed.

## Recovery

Inspect `data/lessons/coding-course-restoration.json` before reapplying. Restored
roots are recognized and their children are not swapped again. Unexpected
concurrent content/commerce changes abort the transaction. Do not run the earlier
K12 conversion to reverse this operation. Use the private backup only during
coordinated recovery, preserving subsequent user activity instead of blindly
resetting a live database.
