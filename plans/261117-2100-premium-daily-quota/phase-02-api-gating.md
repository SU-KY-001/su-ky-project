# Phase 2 — Playback gating + admin-only premium labels

## Context Links

- `apps/api/src/modules/listening/application/listening.service.ts:116-175` (premium gate + URL choice)
- `apps/api/src/modules/listening/presentation/listening.routes.ts:20` (playback route, currently optional auth)
- `apps/api/src/modules/content/application/content.service.ts` (`createSeries`, `updateSeries`, `updateEpisode`)
- `apps/api/src/modules/content/infrastructure/prisma-content.repository.ts:817` (`updateEpisode`, no audit)
- `apps/api/src/core/audit.ts` (`writeAudit`)

## Overview

- Priority: P1
- Status: Done (2026-11-17, verified)
- Require auth to play, enforce the daily quota, sign all audio URLs, and restrict premium labels to admin with audit.

## Key Insights

- Playback is the only endpoint returning an audio URL; progress sync cannot leak audio, so quota belongs only there.
- `assertPremiumAccess` currently hides the "is this user unlimited" answer; split it so the quota check can be skipped for staff/premium.
- `updateEpisode` persists `isPremium` at runtime (rest-spread) but the service type omits it; fix the type while adding the gate.
- Episode premium changes currently leave no audit row; `updateSeries` already writes `series.updated` with before/after.

## Requirements

- `GET /api/narrations/:narrationId/playback`: `401 AUTH_REQUIRED` when not logged in.
- Free + non-staff: `403 DAILY_LISTEN_LIMIT_REACHED` when today's quota is spent. `DomainError` has no `details` slot (verified `core/errors/domain-error.ts`), so the message names the reset time as text; the machine-readable reset time lives in `/api/me/membership.quota.resetsAt`.
- Staff (`admin`/`moderator`) and active premium: skip quota.
- Premium content gate unchanged: free users get `403 PREMIUM_REQUIRED`; expired memberships re-lock premium content.
- All audio URLs use the expiring delivery path when configured.
- `isPremium` on series create/update and episode update: admin only, otherwise `403 PREMIUM_ADMIN_ONLY`.
- Audit `episode.premium_changed` whenever the flag changes (transactional with the update).

## Architecture

```
playback:
  auth(route) -> narration lookup -> audio ready?
    -> resolveAccess(isPremium,userId,role): staff|member => unlimited
       | premium && !entitled => 403 PREMIUM_REQUIRED
       | free => reserveDailyPlay -> limit => 403 DAILY_LISTEN_LIMIT_REACHED
    -> signed URL -> progress/sync payload

content:
  create/update series|episode: patch.isPremium !== undefined && role !== admin => 403
  updateEpisode repo: tx { before, update, audit if changed }
```

## Related Code Files

- Modify `apps/api/src/modules/listening/application/listening.service.ts`
- Modify `apps/api/src/modules/listening/presentation/listening.routes.ts`
- Modify `apps/api/src/modules/membership/presentation/membership.routes.ts` (compose quota onto entitlement)
- Modify `apps/api/src/modules/content/application/content.service.ts`
- Modify `apps/api/src/modules/content/domain/content.repository.ts` (`updateEpisode` audit param)
- Modify `apps/api/src/modules/content/infrastructure/prisma-content.repository.ts`
- Keep `apps/api/src/modules/membership/application/membership.service.ts` untouched (quota is composed in the route).

## Implementation Steps

1. `listening.service.ts`
   - Add `authRequired` guard: `userId === null` → `DomainError(401, "AUTH_REQUIRED", ...)`.
   - Replace `assertPremiumAccess` with `resolveUnlimited(isPremium, userId, role): Promise<boolean>`:
     - staff → true;
     - `hasActiveMembership(userId)` → true;
     - `isPremium` → throw `PREMIUM_REQUIRED`;
     - else false (quota applies).
   - After audio-ready checks: if not unlimited, `reserveDailyPlay(userId, narration.episodeId)`; `limit` outcome → `DomainError(403, "DAILY_LISTEN_LIMIT_REACHED", message with VN reset time)`.
   - `updateProgress`: keep the premium gate only (free content does not need quota there; no URL is returned).
   - Audio URL: always `audioDeliveryUrl(asset, ttl)` when `storage.audioDeliveryUrl` exists; fallback `deliveryUrl`. Safe: `cloudinaryType("AUDIO")` is already `authenticated`, so every audio asset is stored in the authenticated bucket.
   - Add `DAILY_LISTEN_LIMIT_REACHED` to `ERROR_CODES` in `packages/shared/src/schemas/problem.ts`.
2. `listening.routes.ts`: add `requireAuth` to the playback route; pass `c.get("session")!.user.id`.
3. `membership.routes.ts` `GET /`:
   ```ts
   const ent = await service.getEntitlement(userId);
   const quota = ent.tier === "free" && !isStaff(session.user.role)
     ? await getDailyQuotaStatus(userId) : null;
   return c.json({ ...ent, quota });
   ```
   (import `getDailyQuotaStatus` from the listening module; no cycle: daily-quota imports only prisma + config.)
4. `content.service.ts`
   - Add `isPremium?: boolean` to `createSeries` (already present), `updateSeries`, `updateEpisode` input types.
   - Gate: `isPremium === true` (create) / `isPremium !== undefined` (update) requires `session.user.role === "admin"`, else `403 PREMIUM_ADMIN_ONLY`.
   - `updateEpisode`: pass `{ actorId, ipAddress: null }` to the repo.
5. `prisma-content.repository.ts` + domain interface: `updateEpisode(id, patch, audit?)`; wrap in `prisma.$transaction`, read previous `isPremium`, update, and `writeAudit` `episode.premium_changed` with `{ before, after }` when the flag changes.

## Todo List

- [ ] Playback auth + quota + signed URL
- [ ] Entitlement quota composition
- [ ] Admin-only premium gate (series create/update, episode update)
- [ ] Episode premium audit
- [ ] Fix `isPremium` types

## Success Criteria

- Anonymous playback → 401; free user 5th distinct episode of the day → 403 with reset time; same episode replay → 200.
- Premium member and staff never hit the quota.
- Moderator PATCH with `isPremium` → 403; admin PATCH writes an audit row.
- All audio responses carry an expiring URL when `CLOUDINARY_AUTH_TOKEN_KEY` is set.

## Risk Assessment

- Breaking change for web/mobile: guest playback now 401. Must ship with FE login redirect; documented in CHANGELOG.
- `DomainError` meta support must be checked before use; if absent, encode `limit`/`resetsAt` in the message and add meta support only if the error envelope already carries it.
- Advisory lock + config read ordering: config outside tx keeps lock hold time minimal.

## Security Considerations

- Quota cannot be bypassed via direct `updateProgress` (no URL returned).
- Signed URLs prevent sharing one URL across users, but a user can reuse their own URL until TTL; acceptable (one playback session).
- Role read from session, never from request body.

## Next Steps

- Phase 3 updates shared schemas, OpenAPI, business docs, and tests.
