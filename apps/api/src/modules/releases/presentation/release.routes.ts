import {
  CreateReleaseScheduleSchema,
  ReleaseScheduleQuerySchema,
  ReplaceReleaseAssigneesSchema,
  ReviewEpisodeSchema,
  SubmitEpisodeReviewSchema,
  LinkReleaseEpisodeSchema,
  UpdateReleaseScheduleSchema,
  UuidParamSchema,
} from "@repo/shared";
import { zValidator } from "@hono/zod-validator";
import { Hono, type MiddlewareHandler } from "hono";
import { rateLimit, throwOnInvalid } from "../../../core/middleware";
import type { AppEnv } from "../../../types";
import { requireRole } from "../../auth";
import type { ReleaseService } from "../application/release.service";

interface ReleaseRouteGuards {
  admin: MiddlewareHandler<AppEnv>;
  studio: MiddlewareHandler<AppEnv>;
  write: MiddlewareHandler<AppEnv>;
}

const defaultGuards: ReleaseRouteGuards = {
  admin: requireRole("admin"),
  studio: requireRole("moderator"),
  write: rateLimit("write"),
};

export function createReleaseRoutes(
  service: ReleaseService,
  guards: ReleaseRouteGuards = defaultGuards,
) {
  const admin = new Hono<AppEnv>()
    .use("*", guards.admin)
    .get(
      "/",
      zValidator("query", ReleaseScheduleQuerySchema, throwOnInvalid),
      async (c) => c.json(await service.listSchedules(c.get("session")!, c.req.valid("query"))),
    )
    .post(
      "/",
      guards.write,
      zValidator("json", CreateReleaseScheduleSchema, throwOnInvalid),
      async (c) => {
        const schedule = await service.createSchedule(
          c.get("session")!,
          c.req.valid("json"),
          c.get("requestId"),
        );
        c.header("Location", `/api/admin/releases/${schedule.id}`);
        return c.json(schedule, 201);
      },
    )
    .get("/dashboard", async (c) =>
      c.json(await service.dashboard(c.get("session")!)),
    )
    .get("/moderators", async (c) =>
      c.json({ items: await service.moderators(c.get("session")!) }),
    )
    .post(
      "/:id/check-readiness",
      guards.write,
      zValidator("param", UuidParamSchema, throwOnInvalid),
      async (c) =>
        c.json(
          await service.checkReadiness(
            c.get("session")!,
            c.req.valid("param").id,
            c.get("requestId"),
          ),
        ),
    )
    .get(
      "/:id",
      zValidator("param", UuidParamSchema, throwOnInvalid),
      async (c) =>
        c.json(
          await service.getSchedule(c.get("session")!, c.req.valid("param").id),
        ),
    )
    .patch(
      "/:id",
      guards.write,
      zValidator("param", UuidParamSchema, throwOnInvalid),
      zValidator("json", UpdateReleaseScheduleSchema, throwOnInvalid),
      async (c) =>
        c.json(
          await service.updateSchedule(
            c.get("session")!,
            c.req.valid("param").id,
            c.req.valid("json"),
            c.get("requestId"),
          ),
        ),
    )
    .put(
      "/:id/assignees",
      guards.write,
      zValidator("param", UuidParamSchema, throwOnInvalid),
      zValidator("json", ReplaceReleaseAssigneesSchema, throwOnInvalid),
      async (c) => {
        const id = c.req.valid("param").id;
        await service.replaceAssignees(
          c.get("session")!,
          id,
          c.req.valid("json").moderatorIds,
          c.get("requestId"),
        );
        return c.json(await service.getSchedule(c.get("session")!, id));
      },
    )
    .get(
      "/:id/progress",
      zValidator("param", UuidParamSchema, throwOnInvalid),
      async (c) =>
        c.json({
          items: await service.progress(
            c.get("session")!,
            c.req.valid("param").id,
          ),
        }),
    )
    .post(
      "/:id/publish-now",
      guards.write,
      zValidator("param", UuidParamSchema, throwOnInvalid),
      async (c) =>
        c.json({
          result: await service.publishNow(
            c.get("session")!,
            c.req.valid("param").id,
            c.get("requestId"),
          ),
        }),
    )
    .post(
      "/:id/retry",
      guards.write,
      zValidator("param", UuidParamSchema, throwOnInvalid),
      async (c) => {
        await service.retrySchedule(
          c.get("session")!,
          c.req.valid("param").id,
          c.get("requestId"),
        );
        return c.json({ status: "READY_TO_PUBLISH" });
      },
    )
    .post(
      "/:id/cancel",
      guards.write,
      zValidator("param", UuidParamSchema, throwOnInvalid),
      async (c) => {
        await service.cancelSchedule(
          c.get("session")!,
          c.req.valid("param").id,
          c.get("requestId"),
        );
        return c.json({ status: "CANCELLED" });
      },
    );

  const studio = new Hono<AppEnv>()
    .use("*", guards.studio)
    .get("/assignments", async (c) =>
      c.json({ items: await service.assignedWork(c.get("session")!) }),
    )
    .get("/assignable-episodes", async (c) =>
      c.json({ items: await service.assignableEpisodes(c.get("session")!) }),
    )
    .get("/review-queue", async (c) =>
      c.json({ items: await service.reviewQueue(c.get("session")!) }),
    )
    .get("/reminders", async (c) =>
      c.json({ items: await service.productionReminders(c.get("session")!) }),
    )
    .get(
      "/:id/progress",
      zValidator("param", UuidParamSchema, throwOnInvalid),
      async (c) =>
        c.json({
          items: await service.progress(
            c.get("session")!,
            c.req.valid("param").id,
          ),
        }),
    )
    .post(
      "/:id/link-episode",
      guards.write,
      zValidator("param", UuidParamSchema, throwOnInvalid),
      zValidator("json", LinkReleaseEpisodeSchema, throwOnInvalid),
      async (c) =>
        c.json(
          await service.linkEpisode(
            c.get("session")!,
            c.req.valid("param").id,
            c.req.valid("json").episodeId,
            c.get("requestId"),
          ),
        ),
    )
    .post(
      "/:id/submit-review",
      guards.write,
      zValidator("param", UuidParamSchema, throwOnInvalid),
      zValidator("json", SubmitEpisodeReviewSchema, throwOnInvalid),
      async (c) =>
        c.json(
          await service.submitReview(
            c.get("session")!,
            c.req.valid("param").id,
            c.req.valid("json").contentRevision,
            c.get("requestId"),
          ),
        ),
    )
    .post(
      "/:id/review",
      guards.write,
      zValidator("param", UuidParamSchema, throwOnInvalid),
      zValidator("json", ReviewEpisodeSchema, throwOnInvalid),
      async (c) =>
        c.json(
          await service.reviewEpisode(
            c.get("session")!,
            c.req.valid("param").id,
            c.req.valid("json"),
            c.get("requestId"),
          ),
        ),
    );

  return { admin, studio };
}
