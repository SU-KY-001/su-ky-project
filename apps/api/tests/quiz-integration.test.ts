import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { prisma } from "@repo/db";
import { DomainError } from "../src/core/errors/domain-error";
import { AdminService } from "../src/modules/admin/admin.service";
import { GamificationService } from "../src/modules/gamification/gamification.service";
import {
  assertTestDatabase,
  createModerator,
  removeFixtures,
  RUN_INTEGRATION,
  uniqueSuffix,
} from "./support/integration";

const QUIZ_XP = 10;
// Each poll is a DB round trip (no wall-clock wait); the loop ends as soon as a backend running the
// expected lock statement is reported as waiting on a lock.
const MAX_LOCK_POLLS = 2_000;

async function waitForBlockedBackend(mode: "SHARE" | "UPDATE") {
  const pattern = `%FROM quizzes%FOR ${mode}%`;
  for (let poll = 0; poll < MAX_LOCK_POLLS; poll += 1) {
    const [row] = await prisma.$queryRaw<Array<{ n: number }>>`
      SELECT count(*)::int AS n FROM pg_stat_activity
      WHERE datname = current_database() AND pid <> pg_backend_pid() AND state = 'active'
        AND wait_event_type = 'Lock' AND query LIKE ${pattern}`;
    if (row && row.n > 0) return;
  }
  throw new Error(`No backend became blocked on a quiz FOR ${mode} lock`);
}

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

async function expectDomainError(
  promise: Promise<unknown>,
  status: DomainError["status"],
  code: DomainError["code"],
) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(DomainError);
  expect({
    status: (error as DomainError).status,
    code: (error as DomainError).code,
  }).toEqual({ status, code });
}

describe.skipIf(!RUN_INTEGRATION)("quiz + admin mutations (database)", () => {
  const runId = uniqueSuffix();
  const moderatorId = `it-mod-${runId}`;
  const learnerId = `it-learner-${runId}`;
  const adminId = `it-admin-${runId}`;
  const rollbackUserId = `it-rollback-${runId}`;
  const service = new GamificationService();
  const admin = new AdminService();
  let seriesId = "";

  async function makeEpisode(
    name: string,
    data: { deletedAt?: Date; adminLockedAt?: Date } = {},
  ) {
    return prisma.episode.create({
      data: {
        seriesId,
        title: name,
        slug: `it-${name}-${runId}`,
        sortOrder: 0,
        status: "PUBLISHED",
        ...data,
      },
    });
  }

  beforeAll(async () => {
    assertTestDatabase();
    await createModerator(moderatorId);
    await prisma.user.createMany({
      data: [
        {
          id: learnerId,
          name: "Learner",
          email: `${learnerId}@example.com`,
          emailVerified: true,
          role: "user",
        },
        {
          id: adminId,
          name: "Admin",
          email: `${adminId}@example.com`,
          emailVerified: true,
          role: "admin",
        },
        {
          id: rollbackUserId,
          name: "Rollback",
          email: `${rollbackUserId}@example.com`,
          emailVerified: true,
          role: "user",
        },
      ],
    });
    seriesId = (
      await prisma.series.create({
        data: {
          ownerId: moderatorId,
          title: `it-${runId}`,
          slug: `it-series-${runId}`,
          status: "PUBLISHED",
        },
      })
    ).id;
  });

  afterAll(async () => {
    await prisma.xpAward.deleteMany({ where: { userId: learnerId } });
    await prisma.auditLog.deleteMany({ where: { actorId: adminId } });
    await removeFixtures(moderatorId);
    await prisma.user.deleteMany({
      where: { id: { in: [learnerId, adminId, rollbackUserId] } },
    });
  });

  it("hides the quiz and rejects attempts once the episode is trashed", async () => {
    const episode = await makeEpisode("trash");
    const quiz = await service.upsertQuiz(episode.id, moderatorId, quizInput);
    expect((await service.getPublishedQuiz(episode.slug)).id).toBe(quiz.id);

    await prisma.episode.update({
      where: { id: episode.id },
      data: { deletedAt: new Date() },
    });

    await expectDomainError(
      service.getPublishedQuiz(episode.slug),
      404,
      "NOT_FOUND",
    );
    await expectDomainError(
      service.submitAttempt(quiz.id, learnerId, {
        answers: [
          {
            questionId: quiz.questions[0]!.id,
            optionId: quiz.questions[0]!.options[0]!.id,
          },
        ],
      }),
      404,
      "NOT_FOUND",
    );
  });

  it("blocks moderator quiz edits on admin-locked or trashed content", async () => {
    const locked = await makeEpisode("locked", { adminLockedAt: new Date() });
    await expectDomainError(
      service.upsertQuiz(locked.id, moderatorId, quizInput),
      403,
      "CONTENT_LOCKED",
    );

    const trashed = await makeEpisode("trashed", { deletedAt: new Date() });
    await expectDomainError(
      service.upsertQuiz(trashed.id, moderatorId, quizInput),
      409,
      "CONTENT_IN_TRASH",
    );
  });

  it("awards quiz XP once and only on a pass", async () => {
    const episode = await makeEpisode("xp");
    const quiz = await service.upsertQuiz(episode.id, moderatorId, quizInput);
    const question = quiz.questions[0]!;
    const right = question.options.find((o) => o.label === "A")!.id;
    const wrong = question.options.find((o) => o.label === "B")!.id;
    const attempt = (optionId: string) =>
      service.submitAttempt(quiz.id, learnerId, {
        answers: [{ questionId: question.id, optionId }],
      });

    const failed = await attempt(wrong);
    expect({ passed: failed.isPassed, xp: failed.xpAwarded }).toEqual({
      passed: false,
      xp: 0,
    });

    const first = await attempt(right);
    const second = await attempt(right);
    expect({ xp: first.xpAwarded, again: second.xpAwarded }).toEqual({
      xp: QUIZ_XP,
      again: 0,
    });
    expect(second.totalXp).toBe(QUIZ_XP);

    await expectDomainError(
      service.upsertQuiz(episode.id, moderatorId, quizInput),
      409,
      "CONFLICT",
    );
  });

  it("maps only 'not found' to 404 and writes the audit row with the ban", async () => {
    await expectDomainError(
      admin.banUser(
        "00000000-0000-0000-0000-000000000000",
        { reason: "x" },
        { actorId: adminId, ipAddress: null },
      ),
      404,
      "NOT_FOUND",
    );
    await admin.banUser(
      learnerId,
      { reason: "spam" },
      { actorId: adminId, ipAddress: null },
    );
    const audit = await prisma.auditLog.findFirst({
      where: { actorId: adminId, action: "user.banned", resourceId: learnerId },
    });
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: learnerId } }))
        .banned,
    ).toBe(true);
    expect(audit).not.toBeNull();
  });

  it("refuses an admin demoting or banning their own account with 409 CONFLICT", async () => {
    const self = { actorId: adminId, ipAddress: null };
    await expectDomainError(
      admin.updateUser(adminId, { role: "user" }, self),
      409,
      "CONFLICT",
    );
    await expectDomainError(
      admin.banUser(adminId, { reason: "self" }, self),
      409,
      "CONFLICT",
    );
    const row = await prisma.user.findUniqueOrThrow({ where: { id: adminId } });
    expect({ role: row.role, banned: row.banned }).toEqual({
      role: "admin",
      banned: false,
    });
  });

  it("rolls back the mutation when the audit write fails", async () => {
    const ghostActor = `it-ghost-${runId}`;
    await expect(
      admin.banUser(
        rollbackUserId,
        { reason: "spam" },
        { actorId: ghostActor, ipAddress: null },
      ),
    ).rejects.toThrow();
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: rollbackUserId },
    });
    expect(user.banned).toBe(false);
  });

  it("rejects weekly missions that do not start at Monday 00:00 UTC", async () => {
    const template = await admin.createMissionTemplate(
      {
        title: `t-${runId}`,
        activityType: "PASS_QUIZ",
        targetCount: 1,
        xpReward: 5,
      },
      { actorId: adminId, ipAddress: null },
    );
    const audit = { actorId: adminId, ipAddress: null };
    try {
      await expectDomainError(
        admin.activateWeeklyMission(
          {
            missionTemplateId: template.id,
            weekStartDate: new Date("2026-10-12T10:00:00Z"),
          },
          audit,
        ),
        422,
        "VALIDATION_ERROR",
      );
      await expectDomainError(
        admin.activateWeeklyMission(
          {
            missionTemplateId: template.id,
            weekStartDate: new Date("2026-10-13T00:00:00Z"),
          },
          audit,
        ),
        422,
        "VALIDATION_ERROR",
      );
      await admin.activateWeeklyMission(
        {
          missionTemplateId: template.id,
          weekStartDate: new Date("2026-10-12T00:00:00Z"),
        },
        audit,
      );
      await expectDomainError(
        admin.activateWeeklyMission(
          {
            missionTemplateId: template.id,
            weekStartDate: new Date("2026-10-12T00:00:00Z"),
          },
          audit,
        ),
        409,
        "CONFLICT",
      );
    } finally {
      await prisma.weeklyMission.deleteMany({
        where: { missionTemplateId: template.id },
      });
      await prisma.missionTemplate.delete({ where: { id: template.id } });
    }
  });

  it("makes a submit wait for an in-flight quiz edit instead of grading stale questions", async () => {
    const episode = await makeEpisode("lock-submit");
    const quiz = await service.upsertQuiz(episode.id, moderatorId, quizInput);
    const oldQuestion = quiz.questions[0]!;
    const oldOption = oldQuestion.options[0]!.id;

    let submit: Promise<unknown> = Promise.resolve();
    let submitSettled = false;
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM quizzes WHERE id = ${quiz.id}::uuid FOR UPDATE`;
      await tx.quizQuestion.deleteMany({ where: { quizId: quiz.id } });
      submit = service
        .submitAttempt(quiz.id, learnerId, {
          answers: [{ questionId: oldQuestion.id, optionId: oldOption }],
        })
        .finally(() => {
          submitSettled = true;
        });
      submit.catch(() => undefined);
      await waitForBlockedBackend("SHARE");
      expect(submitSettled).toBe(false);
    });
    await expectDomainError(submit, 422, "VALIDATION_ERROR");
    expect(await prisma.quizAttempt.count({ where: { quizId: quiz.id } })).toBe(
      0,
    );
  });

  it("makes a quiz edit wait for an in-flight submit and then refuse because an attempt exists", async () => {
    const episode = await makeEpisode("lock-edit");
    const quiz = await service.upsertQuiz(episode.id, moderatorId, quizInput);
    const question = quiz.questions[0]!;
    const optionId = question.options[0]!.id;

    let edit: Promise<unknown> = Promise.resolve();
    let editSettled = false;
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM quizzes WHERE id = ${quiz.id}::uuid FOR SHARE`;
      edit = service
        .upsertQuiz(episode.id, moderatorId, quizInput)
        .finally(() => {
          editSettled = true;
        });
      edit.catch(() => undefined);
      await waitForBlockedBackend("UPDATE");
      expect(editSettled).toBe(false);
      await tx.quizAttempt.create({
        data: {
          quizId: quiz.id,
          userId: learnerId,
          answers: [{ questionId: question.id, optionId }],
          scorePercent: 100,
          isPassed: true,
        },
      });
    });
    await expectDomainError(edit, 409, "CONFLICT");
    expect(
      (await prisma.quizQuestion.findMany({ where: { quizId: quiz.id } })).map(
        (q) => q.id,
      ),
    ).toEqual([question.id]);
  });

  it("lets two concurrent first saves both succeed instead of failing on the unique episode_id", async () => {
    const episode = await makeEpisode("lock-create");
    const results = await Promise.all([
      service.upsertQuiz(episode.id, moderatorId, quizInput),
      service.upsertQuiz(episode.id, moderatorId, quizInput),
    ]);
    expect(results[0].episodeId).toBe(results[1].episodeId);
    expect(await prisma.quiz.count({ where: { episodeId: episode.id } })).toBe(
      1,
    );
  });
});
