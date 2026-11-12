# Combo Commerce V2 — repository audit

Status: audit in progress; no commerce behavior changed or production migration run.

## Confirmed existing foundations

`app/services/bundles.py` provides deterministic Decimal/largest-remainder allocation, immutable published versions, personalized ownership credit, coupon quote hashing, buyer advisory locks shared with legacy purchases, wallet/treasury locking, unique buyer idempotency, per-course purchase/earning snapshots and one SQL transaction per checkout. `bundle_coupons.py` locks the coupon before rechecking total/per-user redemption limits; historical orders count even after refund. `bundle_settlement.py` maps each bundle line to its exact purchase and earning. PostgreSQL triggers protect published versions, their children, order and line snapshots. Existing integration tests cover allocation, concurrent checkout/redemption, rollback and legacy mapping conflicts; these tests have not yet been rerun for this task.

## Required extensions and migrations

CourseBundle has no owner; created_by belongs to versions and cannot be treated as product ownership. Add nullable owner FK with explicit lecturer/legacy_admin origin, code, lifecycle/audit fields and indexes; retain old roots as legacy without inferred ownership. Keep moderation separate from immutable version content. Add product metadata/classification/media on existing versions, guarded by existing publication triggers. Add separate bundle favorites/reviews, persistent cart if offered, append-only order state/refund events and entitlement-source records. Existing order snapshots must remain untouched: legacy financial policy is derived from absence of V2 purchase metadata, not by rewriting old orders.

## Confirmed cart behavior

Search found no cart model/service/API. The shopping-cart icon on the course sidebar opens direct registration confirmation; it is not a cart. Mobile translation strings likewise do not prove a persistent cart exists. A promised cart must have server persistence and an explicit multi-product transaction protocol; single-bundle checkout cannot be relabeled multi-product checkout.

## Financial and compatibility boundaries

Preserve VND Decimal amounts and existing transaction/earning mappings; sum of paid lines equals wallet debit, and instructor/platform shares equal paid amounts. Distinguish gross sales, liability holdings, released earnings and withdrawable funds. Keep immutable coupon/refund policy snapshots and deterministic locks. Existing checkout uses internal wallet; references to external gateways in transaction history do not prove external bundle payment support. External payment/payout callbacks require further inspection.

Legacy line refunds must remain supported for old orders. New instructor orders require an explicit full-order policy marker and order-level refund workflow. Never loop through existing line-review methods: they commit per line and would violate all-or-nothing refunds. Published-version and order triggers must not be disabled to implement lifecycle changes.

## Critical risks found

- Current line refund checks other completed PurchaseItems and deletes CourseEnrollments if none remain. That does not prove absence of a separate free/manual access grant. Existing enrollment stores aggregate user/course access without source identity; provenance must be added conservatively and every grant/revoke entry point audited.
- CourseEnrollments has no unique user/course pair in its ORM table definition. Buyer advisory locking is necessary; do not assume a database uniqueness constraint exists.
- Bundle administration and coupons currently have only admin routes. Lecturer access must be added through authenticated owner scoping, never caller-supplied owner IDs or reuse of admin=True as authorization.
- Public favorites currently remove course favorites during list reads for enrolled courses. Preserve course API behavior while defining bundle favorites independently; do not generalize this side effect into paid-product history.
- New ownership checks must revalidate published/approved/not-deleted courses, provider sellability and VND at draft, submit, publication and checkout.
- Root visibility must retain all existing access. Reviews, claims and analytics must not substitute course reviews or unverified counters for bundle metrics.

## Remaining audit work before implementation

Finish direct/free course grant and all refund/payout entry points, payment-provider callbacks, complete frontend/admin review/receipt components, mobile native commerce integration and migration chain/current schema checks. Existing docs contain historical test claims; they are evidence of intended design, not current verification results.

## Baseline validation and first isolated ownership foundation

- Actual checkout is synchronous internal wallet; no pending bundle payment/reservation entity exists. PayPal service exposes external capture/payout integrations elsewhere; existing bundle payout dispatches to internal-wallet settlement. V2 must not claim an external refund was reversed by SQL rollback.
- Direct/free enrollment writes were found in `services/user/courses.py` and `services/shares/transaction.py`; refund deletions in both legacy refund branches and bundle line settlement must be coordinated with provenance. LessonProgress is a separate user/lesson record, but deleting enrollment is still inappropriate for V2 history.
- FE currently has admin-only combo editor, a minimal public library/detail and per-line receipt refund; no lecturer combo workspace or bundle favorite/review domain. Mobile has bundle list/detail/quote/checkout/receipt service contracts; native UI parity is not established.
- Single Alembic head before this task: h45c78d90e12. New ownership revision i56d89e01f23 has been applied ONLY on `studynest_combo_v2_test`, after stamp to the actual base schema, with successful upgrade/downgrade/upgrade. No existing order/version snapshots are changed. Backfill labels legacy roots and leaves owner null; identity/owner trigger prevents reassignment. Downgrade refuses existing instructor products.
- Existing integration baseline: 35 passed on schema-only isolated DB with generated fixtures. Fixed a fixture referring to removed PlatformSettings.platform_name; this is not an application behavior change.
- Ownership policy plus baseline: 38 passed, including foreign courses, duplicate IDs, unpublished courses, banned owners, cross-owner IDOR and unclaimable legacy roots. The policy is not yet registered as a public endpoint or connected to live commerce. The main DB has not received the new ownership migration.
