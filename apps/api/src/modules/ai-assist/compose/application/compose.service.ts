import { randomUUID } from "node:crypto";
import {
  hashBlockText,
  REWRITE_MAX_CHARS,
  type CreateOutlineInput,
  type DraftSectionRequest,
  type DraftSectionResponse,
  type OutlineResponse,
  type RewriteRequest,
  type RewriteResponse,
} from "@repo/shared";
import type { ZodType } from "zod";
import { DomainError } from "../../../../core/errors/domain-error";
import { logger } from "../../../../core/logger";
import { AiDisabledError, AiUnavailableError, createRunGuard, type AgentUsage } from "../../../ai-engine";
import type { Session } from "../../../auth";
import type { ContentService } from "../../../content/application/content.service";
import type { ResolvedAngle } from "../../angles/angle.service";
import type { ComposeConfig } from "../compose.config";
import {
  APPROX_CHARS_PER_WORD,
  COMPOSE_LOG_SCOPE,
  COMPOSE_THINKING,
  DRAFT_PROMPT_VERSION,
  OUTLINE_PROMPT_VERSION,
  REWRITE_PROMPT_VERSION,
} from "../constants";
import { buildDraftInput } from "../input/draft-section.input";
import { buildOutlineInput, type NarratorInput } from "../input/outline.input";
import { buildRewriteInput } from "../input/rewrite.input";
import { buildSourcesBlock, type SeriesContext, type SourcesBlock } from "../input/xml";
import { ComposeBadOutputError } from "../errors";
import { mapComposeFailure } from "./compose-failure";
import { DRAFT_SECTION_PROMPT } from "../prompts/draft-section.prompt";
import { OUTLINE_PROMPT } from "../prompts/outline.prompt";
import { REWRITE_PROMPT } from "../prompts/rewrite.prompt";
import { DraftSectionOutputSchema } from "../schemas/draft-section.schema";
import { OutlineOutputSchema } from "../schemas/outline.schema";
import { RewriteOutputSchema } from "../schemas/rewrite.schema";
import { validateDraft } from "../validators/draft";
import { validateOutline } from "../validators/outline";
import { validateVariants } from "../validators/variants";
import type { ComposeContextLoader } from "../infrastructure/compose-context";
import type { AgentRunner } from "../../review/application/script-review.runner";
import type { ModelGate } from "../../model-gate";

type ComposeFn = "outline" | "draft-section" | "rewrite";

export interface ComposeServiceDeps {
  content: Pick<ContentService, "loadEpisodeForRead">;
  angles: { resolveAngle(userId: string, angleId: string): Promise<ResolvedAngle | null> };
  context: ComposeContextLoader;
  gate: ModelGate;
  config: ComposeConfig;
  /** Injected so tests never call a model. */
  runAgent: AgentRunner;
  /** Throws AiDisabledError / AiUnavailableError (engine `assertAiReady`). */
  assertReady: () => Promise<void>;
  scriptMaxChars: () => Promise<number>;
  modelId: () => string | null;
  newId?: () => string;
}

interface EpisodeContext {
  series: SeriesContext;
  episode: SeriesContext;
  seriesId: string;
}

interface CallSpec<TOut, TResult> {
  fn: ComposeFn;
  session: Session;
  episodeId: string;
  promptVersion: number;
  systemPrompt: string;
  userPrompt: string;
  schema: ZodType<TOut>;
  signal: AbortSignal;
  /** Validates the model output; may throw ComposeBadOutputError. `stats` go to the structured log (counts only). */
  finish: (data: TOut) => { result: TResult; stats: Record<string, number> };
}

const countsOf = (usage: AgentUsage): { tokensIn: number; tokensOut: number } => ({ tokensIn: usage.input, tokensOut: usage.output });

/** Synchronous AI compose: one model call per request, nothing is stored (spec-prompts-compose.md). */
export class ComposeService {
  /** In-flight compose calls of THIS process per user (background checks are counted through the DB). */
  private readonly inFlight = new Map<string, number>();
  private readonly newId: () => string;

  constructor(private readonly deps: ComposeServiceDeps) {
    this.newId = deps.newId ?? randomUUID;
  }

  async outline(session: Session, episodeId: string, input: CreateOutlineInput, signal: AbortSignal): Promise<OutlineResponse> {
    const ctx = await this.loadEpisode(session, episodeId);
    if (input.targetWords * APPROX_CHARS_PER_WORD > (await this.deps.scriptMaxChars())) {
      throw new DomainError(422, "SCRIPT_TOO_LONG", "Số từ đích vượt quá số ký tự tối đa của kịch bản");
    }
    await this.assertReady();
    const angle = await this.requireAngle(session, input.angleId);
    const narrator = await this.resolveNarrator(input.narration, input.narratorEntityId);
    const sources = await this.loadSources(ctx.seriesId);
    return this.call({
      fn: "outline",
      session,
      episodeId,
      promptVersion: OUTLINE_PROMPT_VERSION,
      systemPrompt: OUTLINE_PROMPT,
      userPrompt: buildOutlineInput({ ...ctx, sourcesXml: sources.xml, topic: input.topic, angle, narrator, targetWords: input.targetWords }),
      schema: OutlineOutputSchema,
      signal,
      finish: (data) => {
        const { sections, dropped } = validateOutline(data, input.targetWords, this.newId);
        return {
          result: { sections, promptVersion: OUTLINE_PROMPT_VERSION, sources: { total: sources.total, used: sources.used, truncated: sources.truncated } },
          stats: { sectionsRaw: data.sections.length, sectionsKept: sections.length, ...dropped },
        };
      },
    });
  }

  async draftSection(session: Session, episodeId: string, input: DraftSectionRequest, signal: AbortSignal): Promise<DraftSectionResponse> {
    const ctx = await this.loadEpisode(session, episodeId);
    await this.assertReady();
    const angle = await this.requireAngle(session, input.angleId);
    const narrator = await this.resolveNarrator(input.narration, input.narratorEntityId);
    const sources = await this.loadSources(ctx.seriesId);
    const target = input.outline[input.index]!;
    const reference = [
      input.topic,
      ctx.series.title,
      ctx.series.description ?? "",
      ctx.episode.title,
      ctx.episode.description ?? "",
      ...input.outline.flatMap((s) => [s.title, s.goal, ...s.points]),
      sources.text,
    ].join("\n");
    return this.call({
      fn: "draft-section",
      session,
      episodeId,
      promptVersion: DRAFT_PROMPT_VERSION,
      systemPrompt: DRAFT_SECTION_PROMPT,
      userPrompt: buildDraftInput({ ...ctx, sourcesXml: sources.xml, request: input, angle, narrator }),
      schema: DraftSectionOutputSchema,
      signal,
      finish: (data) => {
        const validated = validateDraft({ text: data.text, targetWords: target.targetWords, remainingChars: input.remainingChars, reference });
        return {
          result: { ...validated, promptVersion: DRAFT_PROMPT_VERSION },
          stats: { wordCount: validated.wordCount, targetWords: target.targetWords, novelNumbers: validated.novelNumbers.length, cleaned: validated.cleaned ? 1 : 0 },
        };
      },
    });
  }

  async rewrite(session: Session, episodeId: string, input: RewriteRequest, signal: AbortSignal): Promise<RewriteResponse> {
    const ctx = await this.loadEpisode(session, episodeId);
    if (input.blocks.reduce((sum, b) => sum + b.text.length, 0) > REWRITE_MAX_CHARS) {
      throw new DomainError(422, "SCRIPT_TOO_LONG", "Đoạn chọn quá dài để viết lại");
    }
    if (input.blocks.some((b) => hashBlockText(b.text) !== b.hash)) {
      throw new DomainError(409, "HASH_MISMATCH", "Nội dung đoạn không khớp mã băm");
    }
    if (input.count > this.deps.config.maxVariants) {
      throw new DomainError(422, "VALIDATION_ERROR", `Tối đa ${this.deps.config.maxVariants} bản mỗi lần`);
    }
    await this.assertReady();
    const sources = await this.loadSources(ctx.seriesId);
    const original = input.blocks.map((b) => b.text).join("\n\n");
    return this.call({
      fn: "rewrite",
      session,
      episodeId,
      promptVersion: REWRITE_PROMPT_VERSION,
      systemPrompt: REWRITE_PROMPT,
      userPrompt: buildRewriteInput({ ...ctx, sourcesXml: sources.xml, request: input }),
      schema: RewriteOutputSchema,
      signal,
      finish: (data) => {
        const { variants, dropped } = validateVariants({ output: data, original, count: input.count, newId: this.newId });
        if (variants.length === 0) throw new ComposeBadOutputError("No usable rewrite variant", "NO_VARIANTS");
        return {
          result: { variants, requested: input.count, returned: variants.length, promptVersion: REWRITE_PROMPT_VERSION },
          stats: { variantsRaw: data.variants.length, variantsKept: variants.length, ...dropped },
        };
      },
    });
  }

  /** Concurrency slot + deadline + model gate + error mapping around the one model call of a request. */
  private async call<TOut, TResult>(spec: CallSpec<TOut, TResult>): Promise<TResult> {
    const { fn, session, episodeId } = spec;
    const userId = session.user.id;
    const running = this.inFlight.get(userId) ?? 0;
    if (running >= this.deps.config.maxConcurrentPerUser) {
      throw new DomainError(429, "AI_CONCURRENCY_LIMIT", "Bạn đang có quá nhiều lời gọi AI chạy cùng lúc");
    }
    this.inFlight.set(userId, running + 1);
    const guard = createRunGuard(spec.signal, this.deps.config.callTimeoutMs);
    const log = logger.child({ scope: COMPOSE_LOG_SCOPE, fn, userId, episodeId });
    const base = { event: "ai.call", fn, promptVersion: spec.promptVersion, model: this.deps.modelId(), inputChars: spec.userPrompt.length };
    const startedAt = Date.now();
    try {
      const run = await this.deps.gate.run(() =>
        this.deps.runAgent({
          systemPrompt: spec.systemPrompt,
          userPrompt: spec.userPrompt,
          schema: spec.schema,
          tools: "NONE",
          thinking: COMPOSE_THINKING,
          signal: guard.signal,
          redactContent: true,
          label: `ai-compose:${fn}`,
        }),
      );
      const { result, stats } = spec.finish(run.data);
      log.info({ ...base, ...countsOf(run.usage), durationMs: Date.now() - startedAt, attempts: run.attempts, outcome: "ok", ...stats }, "ai call finished");
      return result;
    } catch (err) {
      const { error, outcome } = mapComposeFailure(err, guard.signal, spec.signal);
      log.warn({ ...base, durationMs: Date.now() - startedAt, outcome }, "ai call failed");
      throw error;
    } finally {
      guard.dispose();
      const left = (this.inFlight.get(userId) ?? 1) - 1;
      if (left <= 0) this.inFlight.delete(userId);
      else this.inFlight.set(userId, left);
    }
  }

  private async loadEpisode(session: Session, episodeId: string): Promise<EpisodeContext> {
    const episode = await this.deps.content.loadEpisodeForRead(session, episodeId);
    return {
      seriesId: episode.seriesId,
      series: { title: episode.series.title, description: episode.series.description },
      episode: { title: episode.title, description: episode.description },
    };
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

  /** The client sends only an id; the guide text comes from the server (never trusted from the request). */
  private async requireAngle(session: Session, angleId: string): Promise<ResolvedAngle> {
    const angle = await this.deps.angles.resolveAngle(session.user.id, angleId);
    if (!angle) throw new DomainError(422, "VALIDATION_ERROR", "Góc kể không tồn tại");
    return angle;
  }

  private async resolveNarrator(narration: "THIRD_PERSON" | "FIRST_PERSON", entityId: string | undefined): Promise<NarratorInput | null> {
    if (narration !== "FIRST_PERSON" || !entityId) return null;
    const narrator = await this.deps.context.loadNarrator(entityId);
    if (!narrator) throw new DomainError(422, "VALIDATION_ERROR", "Nhân vật kể không tồn tại");
    return narrator;
  }

  private async loadSources(seriesId: string): Promise<SourcesBlock> {
    return buildSourcesBlock(await this.deps.context.loadSources(seriesId), this.deps.config.maxSourceChars);
  }
}
