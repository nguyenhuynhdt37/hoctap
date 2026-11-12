# Controlled implementation plan

1. Finish audit, record business rules and migration/legacy policy.
2. Add owner/origin, immutable product metadata, moderation/audit state and source-aware entitlement schema; test migrations on a disposable restored copy.
3. Implement authenticated lecturer management/course eligibility, version lifecycle, owner-scoped coupons and admin moderation.
4. Extend discovery/favorites/cart with explicit quote/overlap and transaction semantics.
5. Integrate V2 order metadata, entitlement sources and all-or-nothing refunds; preserve legacy line refunds and released-earning escalation. Prove conservation, rollback, concurrency and access preservation before exposing purchase/refund UI.
6. Implement lecturer wizard/dashboard, learner catalog/details/orders/refunds, admin oversight, analytics and verified reviews with Cloudy Blue primitives.
7. Update mobile contracts and relevant screens; state native gaps honestly.
8. Run migration, integration/concurrency, financial, frontend/mobile and authenticated browser checks. Document rollout, rollback and reconciliation. No production migration/deployment without authorization.

Progress: Phase 0 in progress. Implementation and verification not yet complete.
