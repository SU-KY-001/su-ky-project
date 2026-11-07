import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  BaseVersionSchema,
  HistoricalCitationInputSchema,
  PatchHistoricalCitationSchema,
} from "@repo/shared";
import { requireAuth, requireRole } from "../../auth";
import {
  idempotency,
  rateLimit,
  throwOnInvalid,
} from "../../../core/middleware";
import type { AppEnv } from "../../../types";
import type { HistoricalNodeKind } from "../domain/historical-catalog.repository";
import type { HistoricalCitationService } from "../application/historical-citation.service";
const param = z.object({ id: z.string().uuid() });
const child = z.object({
  id: z.string().uuid(),
  citationId: z.string().uuid(),
});
function ownerRoute(
  service: HistoricalCitationService,
  kind: HistoricalNodeKind,
) {
  return new Hono<AppEnv>()
    .get(
      "/:id/sources",
      zValidator("param", param, throwOnInvalid),
      async (c) =>
        c.json({
          items: await service.listCitations({
            kind,
            id: c.req.valid("param").id,
          }),
        }),
    )
    .post(
      "/:id/sources",
      idempotency(),
      rateLimit("write"),
      zValidator("param", param, throwOnInvalid),
      zValidator("json", HistoricalCitationInputSchema, throwOnInvalid),
      async (c) => {
        const u = c.get("session")!.user;
        return c.json(
          await service.addCitation(
            { userId: u.id, role: u.role },
            { kind, id: c.req.valid("param").id },
            c.req.valid("json"),
          ),
          201,
        );
      },
    )
    .patch(
      "/:id/sources/:citationId",
      rateLimit("write"),
      zValidator("param", child, throwOnInvalid),
      zValidator("json", PatchHistoricalCitationSchema, throwOnInvalid),
      async (c) => {
        const u = c.get("session")!.user;
        const p = c.req.valid("param");
        return c.json(
          await service.patchCitation(
            { userId: u.id, role: u.role },
            { kind, id: p.id },
            p.citationId,
            c.req.valid("json"),
          ),
        );
      },
    )
    .delete(
      "/:id/sources/:citationId",
      rateLimit("write"),
      zValidator("param", child, throwOnInvalid),
      zValidator("json", BaseVersionSchema, throwOnInvalid),
      async (c) => {
        const u = c.get("session")!.user;
        const p = c.req.valid("param");
        await service.deleteCitation(
          { userId: u.id, role: u.role },
          { kind, id: p.id },
          p.citationId,
          c.req.valid("json").baseVersion,
        );
        return c.body(null, 204);
      },
    );
}
export function createHistoricalCitationRoutes(
  service: HistoricalCitationService,
) {
  return new Hono<AppEnv>()
    .use("*", requireAuth, requireRole("moderator", "admin"))
    .route("/historical-periods", ownerRoute(service, "period"))
    .route("/historical-phases", ownerRoute(service, "phase"))
    .route("/historical-entities", ownerRoute(service, "entity"));
}
