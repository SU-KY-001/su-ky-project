import type { AiCheck, AiCheckItem, CreateAiCheckInput, PatchAiCheckItemInput } from "@repo/shared";
import { DomainError } from "../../../core/errors/domain-error";
import { logger } from "../../../core/logger";
import { AiDisabledError, AiUnavailableError } from "../../ai-engine";
import type { Session } from "../../auth";
import type { ContentService } from "../../content/application/content.service";
import type { SeriesReviewSourceEntity } from "../../content/domain/content.entity";
import type { ReviewSource, SourcePageStore } from "../ai-assist.types";
import type { AiAssistConfig } from "../ai-assist.config";
import type { AiCheckRepository } from "../domain/ai-check.repository";
import { PROMPT_VERSION } from "../prompts/script-review.prompt";
import type { ScriptReviewRunner } from "./script-review.runner";

const RECENT_CHECKS_LIMIT = 20;

export interface AiCheckServiceDeps {
  repo: AiCheckRepository;
  content: Pick<ContentService, "loadEpisodeForRead" | "listReviewSources">;
  store: SourcePageStore;
  runner: ScriptReviewRunner;
  config: AiAssistConfig;
  scriptMaxChars: () => Promise<number>;
  /** Throws AiDisabledError / AiUnavailableError (engine `assertAiReady`). */
  assertReady: () => Promise<void>;
  modelId: () => string | null;
}

export interface AiCheckDetail {
  check: AiCheck;
  items: AiCheckItem[];
}

export class AiCheckService {
  /** Cancel handles of checks running in THIS process; a check of another instance is closed through the DB. */
  private readonly running = new Map<string, AbortController>();

  constructor(private readonly deps: AiCheckServiceDeps) {}

  async create(session: Session, episodeId: string, input: CreateAiCheckInput): Promise<{ id: string }> {
    const { repo, config } = this.deps;
    const rows = await this.deps.content.listReviewSources(session, episodeId);
    const totalChars = input.blocks.reduce((sum, b) => sum + b.text.length, 0);
    if (totalChars > (await this.deps.scriptMaxChars())) {
      throw new DomainError(422, "VALIDATION_ERROR", "Kịch bản vượt quá số ký tự tối đa");
    }

    const sources = await this.selectSources(rows);
    if (sources.length === 0) {
      throw new DomainError(422, "NO_READABLE_SOURCE", "Series chưa có nguồn đã xác minh mà AI đọc được");
    }
    await this.assertReady();

    const created = await repo.createRunning({
      userId: session.user.id,
      episodeId,
      scope: input.scope,
      note: input.note?.trim() || null,
      totalBlocks: input.blocks.length,
      model: this.deps.modelId(),
      promptVersion: String(PROMPT_VERSION),
      maxConcurrentPerUser: config.maxConcurrentPerUser,
      staleAfterMs: config.staleAfterMs,
    });
    if (!created.ok) {
      if (created.reason === "USER_LIMIT") throw new DomainError(429, "AI_CONCURRENCY_LIMIT", "Bạn đang có quá nhiều lượt rà chạy cùng lúc");
      throw new DomainError(409, "AI_CHECK_ALREADY_RUNNING", "Tập này đang có một lượt rà chạy");
    }

    const controller = new AbortController();
    this.running.set(created.id, controller);
    void this.deps.runner
      .run({ checkId: created.id, blocks: input.blocks, note: input.note?.trim() || null, sources, signal: controller.signal })
      .catch((err: unknown) => logger.error({ err, checkId: created.id }, "ai check run crashed"))
      .finally(() => this.running.delete(created.id));
    return { id: created.id };
  }

  async list(session: Session, episodeId: string): Promise<AiCheck[]> {
    await this.deps.content.loadEpisodeForRead(session, episodeId);
    return this.deps.repo.listChecks(episodeId, RECENT_CHECKS_LIMIT);
  }

  async get(session: Session, episodeId: string, checkId: string): Promise<AiCheckDetail> {
    await this.deps.content.loadEpisodeForRead(session, episodeId);
    const check = await this.requireCheck(episodeId, checkId);
    return { check, items: await this.deps.repo.listItems(checkId) };
  }

  async cancel(session: Session, episodeId: string, checkId: string): Promise<AiCheck> {
    await this.deps.content.loadEpisodeForRead(session, episodeId);
    await this.requireCheck(episodeId, checkId);
    this.running.get(checkId)?.abort();
    // CAS: a no-op when the runner already reached a final state.
    await this.deps.repo.finish(checkId, "CANCELLED", null, []);
    return this.requireCheck(episodeId, checkId);
  }

  async patchItem(session: Session, episodeId: string, checkId: string, itemId: string, patch: PatchAiCheckItemInput): Promise<AiCheckItem> {
    await this.deps.content.loadEpisodeForRead(session, episodeId);
    const item = await this.deps.repo.patchItem(episodeId, checkId, itemId, patch);
    if (!item) throw new DomainError(404, "NOT_FOUND", "Mục không tồn tại");
    return item;
  }

  private async requireCheck(episodeId: string, checkId: string): Promise<AiCheck> {
    const check = await this.deps.repo.findCheck(episodeId, checkId);
    if (!check) throw new DomainError(404, "NOT_FOUND", "Lượt rà không tồn tại");
    return check;
  }

  private async assertReady(): Promise<void> {
    try {
      await this.deps.assertReady();
    } catch (err) {
      if (err instanceof AiDisabledError) throw new DomainError(503, "AI_DISABLED", "Trợ lý AI đang tắt");
      if (err instanceof AiUnavailableError) throw new DomainError(503, "AI_UNAVAILABLE", "Trợ lý AI chưa sẵn sàng");
      throw err;
    }
  }

  /** Verified-at-current-version sources only. A PDF is usable once its pages are loaded; a URL source always is. */
  private async selectSources(rows: SeriesReviewSourceEntity[]): Promise<ReviewSource[]> {
    const picked: Array<Omit<ReviewSource, "label">> = [];
    for (const row of rows) {
      if (row.verificationStatus !== "VERIFIED" || row.verifiedVersion !== row.version) continue;
      const base = { sourceId: row.sourceId, version: row.version, title: row.title };
      if (row.hasFile && (await this.deps.store.hasPages(row.sourceId, row.version))) picked.push({ ...base, kind: "PDF", url: row.url });
      else if (row.url) picked.push({ ...base, kind: "URL", url: row.url });
    }
    return picked.map((source, index) => ({ ...source, label: `S${index + 1}` }));
  }
}
