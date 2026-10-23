import {
  CreateReleaseScheduleSchema,
  ApproveReleaseReassignmentTicketSchema,
  CreateReleaseReassignmentTicketSchema,
  RejectReleaseReassignmentTicketSchema,
  ReleaseReassignmentTicketQuerySchema,
  ReleaseScheduleQuerySchema,
  ReplaceReleaseAssigneeSchema,
  ReviewEpisodeSchema,
  SubmitEpisodeReviewSchema,
  LinkReleaseEpisodeSchema,
  UpdateReleaseScheduleSchema,
  UpdateReleaseReassignmentTicketSchema,
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
    .post(
      "/:id/review",
      guards.write,
      zValidator("param", UuidParamSchema, throwOnInvalid),
      zValidator("json", ReviewEpisodeSchema, throwOnInvalid),
      async (c) => c.json(await service.reviewEpisode(
        c.get("session")!, c.req.valid("param").id, c.req.valid("json"), c.get("requestId"),
      )),
    )
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
    .get("/workload", async (c) =>
      c.json({ items: await service.workload(c.get("session")!) }),
    )
    .get(
      "/reassignment-tickets",
      zValidator("query", ReleaseReassignmentTicketQuerySchema, throwOnInvalid),
      async (c) =>
        c.json(await service.listReassignmentTickets(c.get("session")!, c.req.valid("query"))),
    )
    .post(
      "/reassignment-tickets/:id/approve",
      guards.write,
      zValidator("param", UuidParamSchema, throwOnInvalid),
      zValidator("json", ApproveReleaseReassignmentTicketSchema, throwOnInvalid),
      async (c) =>
        c.json(await service.approveReassignmentTicket(
          c.get("session")!,
          c.req.valid("param").id,
          c.req.valid("json").replacementModeratorId,
          c.get("requestId"),
        )),
    )
    .post(
      "/reassignment-tickets/:id/reject",
      guards.write,
      zValidator("param", UuidParamSchema, throwOnInvalid),
      zValidator("json", RejectReleaseReassignmentTicketSchema, throwOnInvalid),
      async (c) =>
        c.json(await service.rejectReassignmentTicket(
          c.get("session")!,
          c.req.valid("param").id,
          c.req.valid("json").reason,
          c.get("requestId"),
        )),
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
      zValidator("json", ReplaceReleaseAssigneeSchema, throwOnInvalid),
      async (c) => {
        const id = c.req.valid("param").id;
        await service.replaceAssignee(
          c.get("session")!,
          id,
          c.req.valid("json").moderatorId,
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
      "/reassignment-tickets",
      zValidator("query", ReleaseReassignmentTicketQuerySchema, throwOnInvalid),
      async (c) =>
        c.json(await service.listMyReassignmentTickets(c.get("session")!, c.req.valid("query"))),
    )
    .patch(
      "/reassignment-tickets/:id",
      guards.write,
      zValidator("param", UuidParamSchema, throwOnInvalid),
      zValidator("json", UpdateReleaseReassignmentTicketSchema, throwOnInvalid),
      async (c) =>
        c.json(await service.updateReassignmentTicket(
          c.get("session")!,
          c.req.valid("param").id,
          c.req.valid("json").reason,
          c.get("requestId"),
        )),
    )
    .post(
      "/reassignment-tickets/:id/cancel",
      guards.write,
      zValidator("param", UuidParamSchema, throwOnInvalid),
      async (c) =>
        c.json(await service.cancelReassignmentTicket(
          c.get("session")!,
          c.req.valid("param").id,
          c.get("requestId"),
        )),
    )
    .post(
      "/:id/reassignment-tickets",
      guards.write,
      zValidator("param", UuidParamSchema, throwOnInvalid),
      zValidator("json", CreateReleaseReassignmentTicketSchema, throwOnInvalid),
      async (c) => {
        const ticket = await service.createReassignmentTicket(
          c.get("session")!,
          c.req.valid("param").id,
          c.req.valid("json").reason,
          c.get("requestId"),
        );
        c.header("Location", `/api/studio/releases/reassignment-tickets/${ticket.id}`);
        return c.json(ticket, 201);
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
