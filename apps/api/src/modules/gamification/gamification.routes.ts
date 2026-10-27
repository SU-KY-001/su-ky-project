import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import {
  MyWeeklyMissionsSchema,
  PublicQuizSchema,
  QuizAttemptResultSchema,
  StudioQuizSchema,
  SubmitQuizAttemptSchema,
  UpsertQuizSchema,
  WeeklyMissionQuerySchema,
} from "@repo/shared";
import { idempotency, rateLimit, throwOnInvalid } from "../../core/middleware";
import type { AppEnv } from "../../types";
import { attachSession, requireAuth, requireRole } from "../auth";
import { GamificationService } from "./gamification.service";
import { quizAuthoringRoute } from "./quiz-authoring.routes";

const episodeIdParam = z.object({ episodeId: z.string().uuid() });
const quizIdParam = z.object({ quizId: z.string().uuid() });
const slugParam = z.object({ slug: z.string().min(1) });

export const gamificationService = new GamificationService();

export const studioQuizRoute = new Hono<AppEnv>()
  .route("/", quizAuthoringRoute)
  .use("/episodes/:episodeId/quiz", requireRole("moderator"))
  .get(
    "/episodes/:episodeId/quiz",
    zValidator("param", episodeIdParam, throwOnInvalid),
    async (c) =>
      c.json(
        StudioQuizSchema.parse(
          await gamificationService.getStudioQuiz(
            c.req.valid("param").episodeId,
            c.get("session")!.user.id,
          ),
        ),
      ),
  )
  .put(
    "/episodes/:episodeId/quiz",
    rateLimit("write"),
    zValidator("param", episodeIdParam, throwOnInvalid),
    zValidator("json", UpsertQuizSchema, throwOnInvalid),
    async (c) =>
      c.json(
        StudioQuizSchema.parse(
          await gamificationService.upsertQuiz(
            c.req.valid("param").episodeId,
            c.get("session")!.user.id,
            c.req.valid("json"),
          ),
        ),
      ),
  )
  .delete(
    "/episodes/:episodeId/quiz",
    rateLimit("write"),
    zValidator("param", episodeIdParam, throwOnInvalid),
    async (c) => {
      await gamificationService.deleteQuiz(
        c.req.valid("param").episodeId,
        c.get("session")!.user.id,
      );
      return c.body(null, 204);
    },
  );

export const publicQuizRoute = new Hono<AppEnv>()
  .use("*", attachSession)
  .get(
    "/episodes/:slug/quiz",
    zValidator("param", slugParam, throwOnInvalid),
    async (c) =>
      c.json(
        PublicQuizSchema.parse(
          await gamificationService.getPublishedQuiz(c.req.valid("param").slug),
        ),
      ),
  )
  .post(
    "/quizzes/:quizId/attempts",
    requireAuth,
    rateLimit("write"),
    idempotency(),
    zValidator("param", quizIdParam, throwOnInvalid),
    zValidator("json", SubmitQuizAttemptSchema, throwOnInvalid),
    async (c) =>
      c.json(
        QuizAttemptResultSchema.parse(
          await gamificationService.submitAttempt(
            c.req.valid("param").quizId,
            c.get("session")!.user.id,
            c.req.valid("json"),
          ),
        ),
        201,
      ),
  );

export const meMissionRoute = new Hono<AppEnv>()
  .use("*", requireAuth)
  .get(
    "/weekly-missions",
    zValidator("query", WeeklyMissionQuerySchema, throwOnInvalid),
    async (c) =>
      c.json(
        MyWeeklyMissionsSchema.parse(
          await gamificationService.listWeeklyMissions(
            c.get("session")!.user.id,
            c.req.valid("query").weekStartDate,
          ),
        ),
      ),
  );
