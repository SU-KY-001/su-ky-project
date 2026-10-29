import { randomUUID } from "node:crypto";
import { prisma, type Prisma } from "@repo/db";
import { QuizDraftDataSchema, validateReadyQuiz, type QuizWorkspace, type QuizDraftData, type QuizWorkspaceListSchema } from "@repo/shared";
import type { z } from "zod";
import { DomainError } from "../../core/errors/domain-error";

export class QuizAuthoringService {
  async episode(episodeId: string, userId: string) {
    const row = await prisma.episode.findFirst({ where: { id: episodeId, series: { ownerId: userId } },
      include: { series: true } });
    if (!row) throw new DomainError(404, "NOT_FOUND", "Không tìm thấy tập thuộc quyền quản lý.");
    if (row.deletedAt || row.series.deletedAt) throw new DomainError(409, "CONTENT_IN_TRASH", "Tập hoặc series đang ở thùng rác.");
    if (row.adminLockedAt || row.series.adminLockedAt) throw new DomainError(403, "CONTENT_LOCKED", "Tập hoặc series đã bị khóa.");
    return row;
  }

  async list(userId: string): Promise<z.infer<typeof QuizWorkspaceListSchema>> {
    const episodes = await prisma.episode.findMany({ where: { deletedAt: null, series: { ownerId: userId, deletedAt: null } },
      select: { id: true, title: true, series: { select: { title: true } }, quiz: { select: { updatedAt: true, questions: { select: { id: true } } } } } });
    const drafts = await prisma.quizWorkspaceDraft.findMany({ where: { episodeId: { in: episodes.map(e => e.id) } } });
    const byEpisode = new Map(drafts.map(d => [d.episodeId, d]));
    const items: z.infer<typeof QuizWorkspaceListSchema>["items"] = [];
    for (const e of episodes) {
      const draft = byEpisode.get(e.id);
      if (!draft && !e.quiz) continue;
      const data = draft ? QuizDraftDataSchema.parse(draft.data) : null;
      const generated = data?.questions.filter(q => q.evidence).length ?? 0;
      items.push({ episodeId: e.id, episodeTitle: e.title, seriesTitle: e.series.title,
        title: data?.title || `Quiz · ${e.title}`, questions: data?.questions.length ?? e.quiz!.questions.length,
        updatedAt: draft?.updatedAt ?? e.quiz!.updatedAt, active: Boolean(e.quiz) && (!draft || draft.activatedRevision === draft.revision),
        method: !generated ? "manual" : generated === data?.questions.length ? "script" : "mixed" });
    }
    return { items: items.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()) };
  }

  async read(episodeId: string, userId: string): Promise<QuizWorkspace> {
    const episode = await this.episode(episodeId, userId);
    const [draft, active] = await Promise.all([
      prisma.quizWorkspaceDraft.findUnique({ where: { episodeId } }),
      prisma.quiz.findUnique({ where: { episodeId }, include: { questions: { orderBy: { sortOrder: "asc" }, include: { options: { orderBy: { optionLabel: "asc" } } } }, _count: { select: { attempts: true } } } }),
    ]);
    if (!draft && active?.questions.some(q => q.options.length > 4))
      throw new DomainError(409, "CONFLICT", "Quiz cũ có câu vượt quá bốn đáp án. Không thể mở trong trình soạn bốn đáp án; nội dung cũ được giữ nguyên.");
    const data: QuizDraftData = draft ? QuizDraftDataSchema.parse(draft.data) : {
      title: active?.title ?? (active ? `Quiz · ${episode.title}` : ""), description: active?.description ?? "", posterAssetId: active?.posterAssetId ?? null, referenceText: "", passScorePercent: active?.passScorePercent ?? 80,
      questions: active?.questions.map(q => ({ id: q.id, text: q.questionText, explanation: q.explanation ?? "", timeLimit: q.timeLimit ?? 20,
        options: Array.from({ length: 4 }, (_, i) => q.options[i]?.optionText ?? ""),
        correctIndex: q.options.findIndex(o => o.isCorrect), evidence: null })) ?? [{ id: randomUUID(), text: "", options: ["", "", "", ""], correctIndex: null, explanation: "", evidence: null, timeLimit: 20 }],
    };
    return { episodeId, episodeTitle: episode.title, seriesId: episode.seriesId, seriesTitle: episode.series.title,
      revision: draft?.revision ?? 0, updatedAt: draft?.updatedAt ?? null, data,
      active: Boolean(active) && (!draft || draft.activatedRevision === draft.revision), attemptCount: active?._count.attempts ?? 0,
      script: null, scriptChanged: false };
  }

  async save(episodeId: string, userId: string, revision: number, data: QuizDraftData): Promise<QuizWorkspace> {
    await this.episode(episodeId, userId);
    await prisma.$transaction(async db => {
      await db.$queryRaw`SELECT id FROM episodes WHERE id = ${episodeId}::uuid FOR UPDATE`;
      const current = await db.quizWorkspaceDraft.findUnique({ where: { episodeId } });
      if ((current?.revision ?? 0) !== revision) throw new DomainError(409, "STALE_WRITE", "Bản nháp đã được cập nhật ở nơi khác. Hãy tải lại trước khi lưu.");
      const json = QuizDraftDataSchema.parse(data);
      if (json.posterAssetId) {
        const poster = await db.mediaAsset.findFirst({ where: { id: json.posterAssetId, kind: "IMAGE", status: "READY", deletedAt: null, uploadedById: userId } });
        if (!poster) throw new DomainError(422, "VALIDATION_ERROR", "Ảnh quiz chưa hợp lệ hoặc không thuộc tài khoản của bạn.");
      }
      await db.quizWorkspaceDraft.upsert({ where: { episodeId },
        create: { episodeId, data: json, posterAssetId: json.posterAssetId ?? null, revision: 1 }, update: { data: json, posterAssetId: json.posterAssetId ?? null, revision: { increment: 1 } } });
    });
    return this.read(episodeId, userId);
  }

  async activate(episodeId: string, userId: string, revision: number): Promise<QuizWorkspace> {
    await this.episode(episodeId, userId);
    await prisma.$transaction(async (db: Prisma.TransactionClient) => {
      await db.$queryRaw`SELECT id FROM episodes WHERE id = ${episodeId}::uuid FOR UPDATE`;
      const draft = await db.quizWorkspaceDraft.findUnique({ where: { episodeId } });
      if (!draft || draft.revision !== revision) throw new DomainError(409, "STALE_WRITE", "Bản nháp đã thay đổi. Hãy tải lại.");
      const data = QuizDraftDataSchema.parse(draft.data);
      let input;
      try { input = validateReadyQuiz(data); }
      catch (error) { throw new DomainError(422, "VALIDATION_ERROR", error instanceof Error ? error.message : "Quiz chưa hoàn chỉnh."); }
      const existing = await db.quiz.findUnique({ where: { episodeId } });
      if (existing) {
        await db.$queryRaw`SELECT id FROM quizzes WHERE id = ${existing.id}::uuid FOR UPDATE`;
        if (await db.quizAttempt.count({ where: { quizId: existing.id } })) throw new DomainError(409, "CONFLICT", "Quiz đã có lượt làm. Bản nháp được giữ lại; không thể thay bộ câu hỏi đang sử dụng.");
        await db.quizQuestion.deleteMany({ where: { quizId: existing.id } });
      }
      const presentation = { title: data.title.trim(), description: data.description.trim() || null, posterAssetId: data.posterAssetId ?? null };
      const quiz = await db.quiz.upsert({ where: { episodeId }, create: { episodeId, passScorePercent: input.passScorePercent, ...presentation }, update: { passScorePercent: input.passScorePercent, ...presentation } });
      for (const [sortOrder, q] of input.questions.entries()) {
        await db.quizQuestion.create({ data: { quizId: quiz.id, questionText: q.text, explanation: q.explanation, timeLimit: q.timeLimit, sortOrder,
          options: { create: q.options.map(o => ({ optionLabel: o.label, optionText: o.text, isCorrect: o.isCorrect })) } } });
      }
      await db.quizWorkspaceDraft.update({ where: { episodeId }, data: { activatedRevision: revision } });
    });
    return this.read(episodeId, userId);
  }
}
export const quizAuthoringService = new QuizAuthoringService();
