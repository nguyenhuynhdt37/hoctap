# Mây Mây subject covers

Ten original illustrations generated with the built-in `image_gen` tool for
the Cloudy Blue design system. Each cover includes the Mây Mây name, a cloud
motif and subject-specific educational objects. These are new Mây Mây graphics,
not VTV7 artwork or logos.

Final assets are opaque JPEGs, 1600 × 900 pixels (16:9), optimized at JPEG quality
86. Original generated PNGs are retained in the generation tool's output folder.

- [Toán](toan-may-may-v1.jpg)
- [Tiếng Việt](tieng-viet-may-may-v1.jpg)
- [Ngữ văn](ngu-van-may-may-v1.jpg)
- [Vật lí](vat-ly-may-may-v1.jpg)
- [Hóa học](hoa-hoc-may-may-v1.jpg)
- [Sinh học](sinh-hoc-may-may-v1.jpg)
- [Lịch sử](lich-su-may-may-v1.jpg)
- [Địa lí](dia-ly-may-may-v1.jpg)
- [Tin học — C++](tin-hoc-cpp-may-may-v1.jpg)
- [Tin học — JavaScript](tin-hoc-javascript-may-may-v1.jpg)

[prompts.json](prompts.json) contains the full generation prompts.
[coding-generated-assets.json](coding-generated-assets.json) contains the two
coding-cover prompts and workspace paths; [coding-assignments.json](coding-assignments.json)
records their R2 assets on the original coding course IDs.
[generated-assets.json](generated-assets.json) maps original outputs to the
workspace files. [assignments.json](assignments.json) records the R2 object keys,
course IDs, previous thumbnails and content hashes for the 11 imported courses.

Run `scripts/assign_vtv7_course_covers.py` from `studynest_be` for a preview, or
add `--apply` to upload and assign. Existing unrelated thumbnails are preserved;
checkpointed objects are reused on retries. All course thumbnail changes commit
in one database transaction after uploads complete.

Verified all 11 URLs through the public catalog and storage proxy: HTTP 200,
image/jpeg, matching SHA-256 content and 1600 × 900 dimensions. All ten images
were visually reviewed for subject, branding, composition and Vietnamese text.
