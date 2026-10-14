import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { prisma } from "@repo/db";
import { ErrorResponseSchema, QuizAttemptResultSchema } from "@repo/shared";
import { app } from "../src/app";
import { GamificationService } from "../src/modules/gamification/gamification.service";
import {
  assertTestDatabase,
  createModerator,
  removeFixtures,
  RUN_INTEGRATION,
  uniqueSuffix,
} from "./support/integration";

const TEST_SESSION_TTL_MS = 60_000;

const quizInput = {
  passScorePercent: 100,
  questions: [
    {
      text: "Q1",
      explanation: null,
      options: [
        { label: "A", text: "right", isCorrect: true },
        { label: "B", text: "wrong", isCorrect: false },
      ],
    },
  ],
};

describe.skipIf(!RUN_INTEGRATION)("quiz attempt idempotency (HTTP)", () => {
  const runId = uniqueSuffix();
  const moderatorId = `it-idem-mod-${runId}`;
  const learnerId = `it-idem-learner-${runId}`;
  const token = crypto.randomUUID();
  let quizId = "";
  let rightOptionId = "";
  let wrongOptionId = "";
  let questionId = "";

  const attempt = (key: string, optionId: string) =>
    app.request(`/api/quizzes/${quizId}/attempts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Idempotency-Key": key,
      },
      body: JSON.stringify({ answers: [{ questionId, optionId }] }),
    });

  beforeAll(async () => {
    assertTestDatabase();
    await createModerator(moderatorId);
    await prisma.user.create({
      data: {
        id: learnerId,
        name: "Learner",
        email: `${learnerId}@example.com`,
        emailVerified: true,
        role: "user",
      },
    });
    await prisma.session.create({
      data: {
        id: crypto.randomUUID(),
        userId: learnerId,
        token,
        expiresAt: new Date(Date.now() + TEST_SESSION_TTL_MS),
      },
    });
    const series = await prisma.series.create({
      data: {
        ownerId: moderatorId,
        title: `it-${runId}`,
        slug: `it-idem-series-${runId}`,
        status: "PUBLISHED",
      },
    });
    const episode = await prisma.episode.create({
      data: {
        seriesId: series.id,
        title: "idem",
        slug: `it-idem-ep-${runId}`,
        sortOrder: 0,
        status: "PUBLISHED",
      },
    });
    const quiz = await new GamificationService().upsertQuiz(
      episode.id,
      moderatorId,
      quizInput,
    );
    quizId = quiz.id;
    const question = quiz.questions[0]!;
    questionId = question.id;
    rightOptionId = question.options.find((o) => o.label === "A")!.id;
    wrongOptionId = question.options.find((o) => o.label === "B")!.id;
  });

  afterAll(async () => {
    await prisma.idempotencyKey.deleteMany({ where: { userId: learnerId } });
    await prisma.xpAward.deleteMany({ where: { userId: learnerId } });
    await removeFixtures(moderatorId);
    await prisma.user.deleteMany({ where: { id: learnerId } });
  });

  it("replays the stored response for the same key and payload without a second attempt", async () => {
    const key = crypto.randomUUID();
    const first = await attempt(key, rightOptionId);
    expect(first.status).toBe(201);
    expect(first.headers.get("Idempotent-Replayed")).toBeNull();
    const firstBody = QuizAttemptResultSchema.parse(await first.json());

    const replay = await attempt(key, rightOptionId);
    expect(replay.status).toBe(201);
    expect(replay.headers.get("Idempotent-Replayed")).toBe("true");
    expect(QuizAttemptResultSchema.parse(await replay.json()).id).toBe(
      firstBody.id,
    );
    expect(await prisma.quizAttempt.count({ where: { quizId } })).toBe(1);
  });

  it("rejects reusing a key with a different payload", async () => {
    const key = crypto.randomUUID();
    expect((await attempt(key, wrongOptionId)).status).toBe(201);
    const reused = await attempt(key, rightOptionId);
    expect(reused.status).toBe(422);
    expect(ErrorResponseSchema.parse(await reused.json()).error_code).toBe(
      "IDEMPOTENCY_KEY_REUSED",
    );
  });

  it("requires a UUID v4 key", async () => {
    const response = await attempt("not-a-uuid", rightOptionId);
    expect(response.status).toBe(400);
    expect(ErrorResponseSchema.parse(await response.json()).error_code).toBe(
      "IDEMPOTENCY_KEY_REQUIRED",
    );
  });
});
