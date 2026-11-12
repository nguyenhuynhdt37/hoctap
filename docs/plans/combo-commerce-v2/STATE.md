# Implementation state

User objective remains the complete Combo Commerce V2 request. Do not report completion from the foundation below.

Implemented and verified in isolation:
- Architecture audit/rules/controlled plan.
- Additive ownership migration i56d89e01f23, following h45c78d90e12; legacy/null owner, stable unique codes, immutable owner/origin/code, owner index, guarded downgrade.
- BundleOwnershipPolicy: active lecturer checks, owner-root scoping, eligible own course selection, 2–60 publish requirement.
- Existing test fixture correction; 35 legacy + 3 ownership integration tests pass.

Not implemented yet:
- ORM ownership integration and lecturer endpoints/lifecycle/moderation.
- Rich immutable product metadata/media/classification.
- Owner-scoped coupon management, catalog/filter/favorites/reviews/analytics.
- Entitlement-source schema/backfill/write integration.
- V2 purchase metadata, full-order refunds, payout holds, legacy dispatch guard and financial/concurrency matrix.
- Lecturer/public/admin UI, mobile updates and final operational verification.

Current scratch DB: studynest_combo_v2_test (schema copied from local; generated test data only), migrated i56d89e01f23. Main DB remains h45c78d90e12.
Scripts: /tmp/run_combo_v2_baseline.py, /tmp/test_combo_ownership_migration.py. Baseline log /tmp/combo-v2-ownership.log.
No production migration, deployment, payment or payout executed. Many unrelated pre-existing modifications exist; do not revert or include indiscriminately.


## Continued implementation

- Added j67e90f12a34: separate bundle_version_reviews and append-only bundle_audit_events. Tested schema upgrade/downgrade/upgrade ONLY on studynest_combo_v2_test. The main DB is still h45c78d90e12.
- Added BundleManagementService: owner-scoped draft saves, pending-review edit guard, eligible-own-course validation, submit, admin changes-requested/approval with reason and audit in one transaction. Existing BundleService.create/publish now support commit=False for outer transaction ownership; default legacy commit behavior preserved.
- Registered management-only API module app/api/v1/bundle_management.py in main.py. GET/POST /lecturer/bundles, GET course-options, GET/PUT versions/{id}, POST versions/{id}/submit, POST /admin/bundles/versions/{id}/review. New DB-dependent routes fail clearly with 503 until schema is deployed; no migration run automatically.
- New instructor-root publication/quote is explicitly gated while V2 checkout/refund policy remains unfinished. Legacy product sales remain unchanged. Do not remove this financial gate before complete all-or-nothing settlement and entitlement-source coverage.
- 39 integration tests pass (35 existing + 4 ownership/management). Ruff and diff checks pass. New HTTP routes have not yet received HTTP-level integration tests; service lifecycle is tested against real PostgreSQL. Frontend/mobile were not changed or reverified in this continuation.
- Full product metadata, publication/clone/visibility, coupon owner routes, sources/refunds, favorites/reviews/analytics, all UI/mobile and final release verification remain outstanding. No complete V2 system delivered yet.
