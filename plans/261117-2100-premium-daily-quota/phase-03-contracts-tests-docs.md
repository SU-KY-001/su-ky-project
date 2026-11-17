# Phase 3 — Contracts, docs, tests

## Context Links

- `packages/shared/src/schemas/membership.ts:20` (`MembershipEntitlementSchema`)
- `apps/api/src/routes/docs/paths/membership.ts:138`
- `apps/api/src/routes/docs/paths/listening.ts` (playback contract — locate during implementation)
- `apps/api/tests/membership-entitlement.test.ts`
- `apps/api/CHANGELOG.md`, `docs/premium-membership-business.md`

## Overview

- Priority: P1
- Status: Done (2026-11-17, verified)
- Publish the new contract, fix the business doc, and cover quota/gating with tests.

## Key Insights

- `MembershipEntitlementSchema` is the OpenAPI response model; adding `quota` there updates `/docs` automatically.
- Existing tests mock `system-config` and `entitlement`; the new `daily-quota` module must be mocked the same way to keep unit tests DB-free.
- `membership-entitlement.test.ts` asserts the old anonymous-free-playback behavior; update it to the new contract instead of deleting the case.

## Requirements

- `quota` field on `/api/me/membership`: `{ enforced, limit, usedToday, remaining, resetsAt } | null`.
- OpenAPI: playback `401 AUTH_REQUIRED`, `403 PREMIUM_REQUIRED | DAILY_LISTEN_LIMIT_REACHED`; studio premium only admin.
- CHANGELOG breaking-change entry.
- Unit tests: day math, quota outcomes at service level, admin-only premium gate, entitlement quota shape.

## Architecture

Not applicable (contract + verification phase).

## Related Code Files

- Modify `packages/shared/src/schemas/membership.ts`
- Modify `packages/shared/src/schemas/problem.ts` (`DAILY_LISTEN_LIMIT_REACHED`)
- Modify `apps/api/src/routes/docs/paths/membership.ts`
- Modify `apps/api/src/routes/docs/paths/listening.ts`
- Modify `apps/api/CHANGELOG.md`
- Modify `docs/premium-membership-business.md`
- Modify `apps/api/tests/membership-entitlement.test.ts`
- Create `apps/api/tests/listening-daily-quota.test.ts`

## Implementation Steps

1. Shared schema:
```ts
export const MembershipDailyQuotaSchema = z.object({
  enforced: z.boolean(),
  limit: z.number().int().positive().nullable(),
  usedToday: z.number().int().nonnegative(),
  remaining: z.number().int().nonnegative().nullable(),
  resetsAt: z.coerce.date(),
});
// MembershipEntitlementSchema: quota: MembershipDailyQuotaSchema.nullable()
```
2. OpenAPI path descriptions + error codes; note admin-only `isPremium`.
3. CHANGELOG (BREAKING + ADDITIVE sections): auth-required playback, quota config keys, entitlement `quota`, premium label admin-only.
4. `docs/premium-membership-business.md`: replace "Admin và Moderator" with admin-only; add daily quota section; update API section 10.1/10.4.
5. Tests:
   - `daily-quota` day math: 23:59 VN vs 00:00 VN rollover; `nextResetAt`.
   - `listening.service` playback: 401 anonymous; 403 quota limit; 200 same-day replay; premium/staff skip quota (mock `reserveDailyPlay` + `hasActiveMembership`).
   - Content: moderator `isPremium` PATCH → 403; admin allowed (service-level fake repo).
   - Entitlement route/service: free → quota object; premium/staff → null.
6. Run `bun run --cwd apps/api check-types` + targeted `bun test`.

## Todo List

- [ ] Shared schema
- [ ] OpenAPI docs
- [ ] CHANGELOG
- [ ] Business doc
- [ ] Tests
- [ ] Typecheck + targeted tests

## Success Criteria

- `check-types` clean for `packages/shared`, `packages/db`, `apps/api`.
- Targeted tests green; no DB required for unit tests.
- Docs match implementation (no "moderator can toggle premium" left).

## Risk Assessment

- `docs/` still contains the old premium doc used by the team; stale text is a real risk — update it in the same commit.
- Test fakes that cast `as unknown as ListeningRepository` do not need the new quota method (quota lives outside the repository).

## Security Considerations

- Docs must state that quota is unenforceable without `CLOUDINARY_AUTH_TOKEN_KEY` (public URLs bypass it).

## Next Steps

- Frontend contract handoff: plans page, `/me/membership.quota`, paywall codes.
