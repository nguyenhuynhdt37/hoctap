# Official video course imports

These are free reference courses curated from the official VTV7 YouTube channel
(`UC5r0xuk4DsjsYiCq8H7AlDg`, `@VTV7tv`). Videos remain embedded at their source;
no video files, subtitles or transcripts are downloaded or reuploaded.
The internal course curator is not represented as the video author.

## November 12, 2026 batch

`vtv7-more-courses.json` records source playlists, individual video IDs, official
channel checks, duration, verification timestamps and source order.
`vtv7-more-import-report.json` records the local database import result.

| Course | Grade for discovery | Lessons |
| --- | --- | ---: |
| Toán lớp 2 | 2 | 70 |
| Tiếng Việt lớp 2 | 2 | 70 |
| Toán ôn thi vào lớp 10 — 2023 archive | 9 | 10 |
| Ngữ văn ôn thi vào lớp 10 — 2023 archive | 9 | 10 |
| Vật lí THPT — sơ đồ tư duy archive | 12 | 81 |
| Hóa học THPT — 2021 archive topics | 12 | 4 |
| Sinh học THPT — 2021 archive topics | 12 | 4 |
| Lịch sử THPT — sơ đồ tư duy archive | 12 | 40 |
| Địa lí THPT — 2021 archive topics | 12 | 5 |
| **New batch total** | | **294** |

English and computing subjects are excluded. The archive label is intentional:
these series do not claim coverage of the full current academic curriculum or
current examination format. THPT discovery uses grade 12 as the intended review
audience; the lessons can include prerequisite knowledge from earlier grades.
For the mixed 2021 playlist, only each explicitly identified subject's complete
4–5 lesson series is selected. Other subjects are not imported from that list.

Numbered series must have every episode exactly once. Unnumbered topic series
retain the publisher's playlist order. Playlist counts must match accessible
videos with no duplicate video IDs. Some older Chemistry, Biology and Geography
playlists failed these checks and were replaced with the short 2021 series.
Metadata and oEmbed checks do not constitute browser playback testing of every
video; future removal or restrictions by YouTube can still affect availability.

## Reproduce

From `studynest_be/`:

```sh
.venv/bin/python scripts/collect_vtv7_more_courses.py
.venv/bin/python scripts/import_vtv7_courses.py \
  --owner-id <existing-admin-lecturer-uuid> \
  --manifest ../data/lessons/vtv7-more-courses.json \
  --report ../data/lessons/vtv7-more-import-report.json \
  --apply --publish --embed-courses
```

Omit `--apply` for a preview. Without `--publish`, newly imported courses stay
unpublished and pending approval. Publishing requires an existing active owner
with both lecturer and admin roles. All new records, publication metadata,
taxonomy and optional course vectors commit together. Embedding errors roll
back that import. Existing matching courses are preserved on retry.

Course metadata embeddings use the existing configured Gemini embedding model;
they do not index the spoken contents of all videos. The one-lesson reindex
script also explicitly indexes lesson metadata only.

For rollback, use the report's new course IDs to unpublish only that batch.
Preserve any subsequent enrollment and learning history. Do not reset the DB or
delete financial or learning records.
