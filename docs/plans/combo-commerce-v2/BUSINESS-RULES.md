# Combo Commerce V2 — proposed implementation contract

This is a design contract, not a claim that these behaviors are implemented.

## Products and lifecycle

Reuse course_bundles as product root, course_bundle_versions for immutable purchased content, and course_bundle_items for ordered course allocations. Existing roots remain legacy_admin with null owner; never infer owner from version creator or courses. New lecturer roots receive authenticated owner, stable code/slug, explicit moderation and audit records. Version commercial/content metadata is immutable after publication; marketing changes also require a version initially, avoiding ambiguous historical meaning. Review state is separate from draft/published/archived version storage. Publication and checkout revalidate owner/course eligibility under existing public_course/provider policy. Require 2–60 distinct courses for publication; allow an empty saved draft, but every selected course must be eligible and owned at every write.

Classification uses existing grades, subjects and categories; bundle metadata stores explicit selected IDs validated against those catalogs. No CEFR inference. Media must use scoped canonical storage keys tied to the authenticated bundle owner. Do not accept arbitrary external image paths.

## Checkout and cart

Preserve wallet-only direct bundle checkout and existing Decimal allocation, quote hash, buyer advisory lock and per-line financial mappings. A V2 order receives immutable purchase metadata with policy `full_bundle_v2`, selected course/owner/version snapshots and effective refund deadline. Old orders lacking that metadata remain legacy line-refund policy; do not UPDATE immutable order snapshots to backfill a new policy.

Already-owned line allocations are credited, with no second charge/earning. A credited line does not create another paid entitlement. A fully owned bundle returns explicit already_owned and creates no meaningless order. Free acquired lines get an entitlement source even though they have no PurchaseItem or earning.

No real cart was found. If cart is exposed, persist discriminated course/bundle entries with quantity one. Cart quote deterministically allocates overlapping courses once and binds the entire ordered product/coupon/ownership set. All wallet lines must settle atomically; no partial financial success. A separate cart checkout coordinator must own the transaction and may not invoke existing committing checkout methods in a loop. Coupon scope is per bundle line, one bundle coupon, never automatic course/platform stacking. Until a complete atomic coordinator is verified, do not expose Add to Cart or claim multi-product checkout support.

## Entitlements and historical data

Keep CourseEnrollments as the existing aggregate access/progress integration. Add independent source grants (direct purchase, bundle order line, legacy/free/manual) with unique source identity and revocation timestamps. Conservatively backfill ambiguous existing active enrollments as legacy grants; do not fabricate a purchase source from incomplete financial history. When a completed purchase source can be proven, map it explicitly and avoid an extra permanent legacy grant for the same sole ownership. Audit every legacy grant/revoke path to maintain sources. Revocation marks only the corresponding source inactive; deactivate aggregate enrollment only when no active source remains, never delete progress or enrollment history.

## Full order refund

Dedicated order-level requests/events and append-only order state preserve immutable orders/lines. V2 purchase items must reject course-level refund entry points. Legacy line refunds retain their existing policy and exact mappings.

Lock order must be verified against checkout, direct purchase, legacy refunds and payout: buyer purchase advisory lock, course locks ordered UUID, order/refund, earnings ordered UUID, affected wallets in deterministic order, then platform treasury. Payout release must take the same coordination locks and hold on a pending full-order refund. Never call committing line review/release methods to settle a full order.

Refund actual total_paid exactly once, including platform share, and atomically reverse every required paid line/holding, mark transactions/purchases/earnings, revoke bundle-exclusive paid and free source grants, update order state and append audit. Previously owned/credited lines remain untouched. Snapshot refund policy/deadline applies, not current platform settings. If any earning has been released or external payout prevents safe reversal, enter explicit reconciliation_required; do not debit wallets below zero or pretend external payout was reversed. Rejected requests may be escalated to admin with complete history; concurrent approval/retry must not create a second refund.

Coupon usage counts committed successful orders and is not restored after full refund, preserving current anti-abuse semantics. No usage is consumed by a quote or rolled-back checkout; current synchronous wallet checkout creates no unpaid reservation. Future external pending payments require a separately verified reservation/callback lifecycle.

## Reviews and analytics

One active review per buyer/product, tied to eligible V2 or verified legacy purchase. No self-review. Full refund removes verified-purchase/public eligibility; retain moderated review history privately rather than erase it. Course reviews are not bundle reviews. Analytics aggregate actual snapshots/earnings/refunds and distinguish gross, discounts, net paid, refunded, holding and released income. Omit conversion rate until valid view instrumentation exists.

## Release

Additive migrations only; retain all historical financial columns/triggers. New routes must enforce owner/admin/buyer scope independently of UI. Test migration/backfill on a restored disposable DB and comprehensive failure/concurrency scenarios before enabling V2 checkout. No production migration, gateway charge or external payout without deployment authorization. Current R2 TLS interception is a separate environment limitation and must not be bypassed with verification disabled.
