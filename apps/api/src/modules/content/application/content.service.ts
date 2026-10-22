import type { Session } from "../../auth";
import {
  AudioAnalysisSchema,
  EditorDocumentSchema,
  type AudioAnalysis,
  type EditorDocument,
} from "@repo/shared";
import { DomainError } from "../../../core/errors/domain-error";
import { insertWithUniqueSlug } from "../../../core/slug";
import type {
  AppendEpisodeInput,
  EpisodeRepository,
  SeriesRepository,
  UpdateSeriesInput,
} from "../domain/content.repository";
import type {
  ContentStatus,
  EpisodeNarrationDetailEntity,
  EpisodeAttachmentEntity,
  SeriesReviewSourceEntity,
  SeriesSourceWithSourceEntity,
  EpisodeWorkspaceEntity,
  MediaAssetEntity,
  NarrationType,
  SeriesDetailEntity,
  SeriesListItemEntity,
} from "../domain/content.entity";
import { getSystemConfig } from "../../../core/config/system-config";
import { episodeChecklist, seriesChecklist } from "./content.mappers";
import {
  extractCitationSourceIds,
  extractScriptText,
} from "./script-document";

/** Scripts are plain text read aloud: markup would be spoken or rendered literally. */
const HTML_TAG_PATTERN = /<\/?[a-z!][^>]*>/i;

export interface ContentServiceConfig {
  get(key: "script.max_chars"): Promise<number>;
}

const defaultContentServiceConfig: ContentServiceConfig = {
  get: (key) => getSystemConfig(key),
};

/**
 * Studio orchestration for series/episode content. Ports are injected; Prisma
 * lives in infrastructure/prisma-content.repository.ts. Business rules and
 * DomainError semantics are carried over verbatim from the former inline
 * route-handler logic.
 */
export class ContentService {
  constructor(
    private readonly series: SeriesRepository,
    private readonly episodes: EpisodeRepository,
    private readonly config: ContentServiceConfig = defaultContentServiceConfig,
  ) {}

  // --- shared guards (moved verbatim from application/content-access.ts) ---

  async loadSeriesForRead(session: Session, id: string) {
    const series = await this.series.findSeriesById(id);
    const isCollaborator = Boolean(
      series &&
      session.user.role !== "admin" &&
      series.ownerId !== session.user.id &&
      await this.series.isActiveReleaseCollaboratorForSeries?.(id, session.user.id),
    );
    if (
      !series ||
      (session.user.role !== "admin" && series.ownerId !== session.user.id && !isCollaborator)
    ) {
      throw new DomainError(404, "NOT_FOUND", "Series not found");
    }
    return series;
  }

  async loadEpisodeForRead(session: Session, id: string) {
    const episode = await this.episodes.findEpisodeWithSeries(id);
    const isCollaborator = Boolean(
      episode &&
      session.user.role !== "admin" &&
      episode.series.ownerId !== session.user.id &&
      await this.series.isActiveReleaseCollaboratorForEpisode?.(id, session.user.id),
    );
    if (
      !episode ||
      (session.user.role !== "admin" &&
        episode.series.ownerId !== session.user.id &&
        !isCollaborator)
    ) {
      throw new DomainError(404, "NOT_FOUND", "Episode not found");
    }
    return episode;
  }

  async assertBaseUpdatedAt(
    model: "series" | "episode" | "narration",
    id: string,
    baseUpdatedAt?: Date,
  ): Promise<void> {
    if (!baseUpdatedAt) return;
    const current =
      model === "series"
        ? await this.series.findSeriesUpdatedAt(id)
        : model === "episode"
          ? await this.episodes.findEpisodeUpdatedAt(id)
          : await this.episodes.findNarrationUpdatedAt(id);
    if (!current || current.getTime() !== baseUpdatedAt.getTime()) {
      throw new DomainError(
        409,
        "STALE_WRITE",
        "Content was updated by another request",
      );
    }
  }

  /** Dimensions are null only for assets verified before width/height were stored; those are not rejected. */
  private assertCoverAssetUsable(
    asset: MediaAssetEntity | null,
    session: Session,
    orientation: "portrait" | "landscape" = "portrait",
  ): void {
    if (
      !asset ||
      asset.kind !== "IMAGE" ||
      asset.status !== "READY" ||
      (session.user.role !== "admin" && asset.uploadedById !== session.user.id)
    ) {
      throw new DomainError(
        422,
        "VALIDATION_ERROR",
        "Cover image asset is not usable",
      );
    }
    const { widthPx, heightPx } = asset;
    if (widthPx == null || heightPx == null) return;
    const fits = orientation === "portrait" ? heightPx > widthPx : widthPx > heightPx;
    if (!fits) {
      throw new DomainError(
        422,
        "VALIDATION_ERROR",
        `Cover image must be ${orientation} (got ${widthPx}x${heightPx})`,
      );
    }
  }

  private assertAudioAssetUsable(
    asset: MediaAssetEntity | null,
    session: Session,
  ): void {
    if (
      !asset ||
      asset.kind !== "AUDIO" ||
      asset.status !== "READY" ||
      (session.user.role !== "admin" && asset.uploadedById !== session.user.id)
    ) {
      throw new DomainError(
        422,
        "VALIDATION_ERROR",
        "Audio asset is not usable",
      );
    }
  }

  private assertDocumentAssetUsable(
    asset: MediaAssetEntity | null,
    session: Session,
  ): void {
    if (
      !asset ||
      asset.kind !== "DOCUMENT" ||
      asset.status !== "READY" ||
      (session.user.role !== "admin" && asset.uploadedById !== session.user.id)
    ) {
      throw new DomainError(
        422,
        "VALIDATION_ERROR",
        "Document asset is not usable",
      );
    }
  }

  private async assertPhaseUsable(
    phaseId: string | null | undefined,
  ): Promise<void> {
    if (phaseId && !(await this.series.historicalPhaseExists(phaseId))) {
      throw new DomainError(
        422,
        "VALIDATION_ERROR",
        "Historical phase does not exist",
      );
    }
  }

  private async assertScriptValid(
    script: string | null | undefined,
  ): Promise<void> {
    if (!script) return;
    const maxChars = await this.config.get("script.max_chars");
    if (script.length > maxChars)
      throw new DomainError(
        422,
        "VALIDATION_ERROR",
        `Script exceeds ${maxChars} characters`,
      );
    if (HTML_TAG_PATTERN.test(script))
      throw new DomainError(
        422,
        "VALIDATION_ERROR",
        "Script must be plain text without HTML",
      );
  }

  private async getSeriesDetail(id: string) {
    const series = await this.series.getSeriesDetail(id);
    if (!series) throw new DomainError(404, "NOT_FOUND", "Series not found");
    return series;
  }

  private async getEpisodeWorkspace(id: string) {
    const episode = await this.episodes.getEpisodeWorkspace(id);
    if (!episode) throw new DomainError(404, "NOT_FOUND", "Episode not found");
    return episode;
  }

  // --- series ---------------------------------------------------------------

  async listSeries(
    session: Session,
    filter: {
      page: number;
      limit: number;
      status?: string | null;
      q?: string | null;
      ownerId?: string | null;
    },
  ): Promise<{
    items: SeriesListItemEntity[];
    page: number;
    limit: number;
    total: number;
  }> {
    const items = await this.series.listSeries({
      ownerId:
        session.user.role === "admin"
          ? (filter.ownerId ?? null)
          : null,
      viewerId: session.user.role === "admin" ? null : session.user.id,
      status:
        (filter.status as ContentStatus | "TRASH" | null | undefined) ?? null,
      q: filter.q ?? null,
      page: filter.page,
      limit: filter.limit,
    });
    return {
      items: items.items,
      page: filter.page,
      limit: filter.limit,
      total: items.total,
    };
  }

  async createSeries(
    session: Session,
    input: {
      title: string;
      slug?: string;
      description?: string | null;
      topicId?: string | null;
      historicalPhaseId?: string | null;
      primaryHistoricalEventId?: string | null;
      startYear?: number | null;
      endYear?: number | null;
      coverImageAssetId?: string | null;
      coverLandscapeAssetId?: string | null;
    },
    ipAddress: string | null,
  ): Promise<SeriesDetailEntity> {
    await this.assertPhaseUsable(input.historicalPhaseId);
    if (input.coverImageAssetId) {
      this.assertCoverAssetUsable(
        await this.series.findMediaAsset(input.coverImageAssetId),
        session,
      );
    }
    if (input.coverLandscapeAssetId) {
      this.assertCoverAssetUsable(
        await this.series.findMediaAsset(input.coverLandscapeAssetId),
        session,
        "landscape",
      );
    }
    const created = await this.series.createSeries({
      ...input,
      ownerId: session.user.id,
      actorId: session.user.id,
      ipAddress,
    });
    return this.getSeriesDetail(created.id);
  }

  async getSeriesDetailForRead(
    session: Session,
    id: string,
  ): Promise<SeriesDetailEntity> {
    await this.loadSeriesForRead(session, id);
    return this.getSeriesDetail(id);
  }

  async updateSeries(
    session: Session,
    id: string,
    input: {
      title?: string;
      slug?: string;
      description?: string | null;
      topicId?: string | null;
      historicalPhaseId?: string | null;
      primaryHistoricalEventId?: string | null;
      startYear?: number | null;
      endYear?: number | null;
      coverImageAssetId?: string | null;
      coverLandscapeAssetId?: string | null;
      baseUpdatedAt?: Date;
    },
    ipAddress: string | null,
  ): Promise<SeriesDetailEntity> {
    const current = await this.loadSeriesForRead(session, id);
    assertWritable(session, current);
    await this.assertBaseUpdatedAt("series", id, input.baseUpdatedAt);
    const { baseUpdatedAt: _ignored, ...patch } = input;
    if (patch.slug !== undefined && current.status !== "DRAFT")
      throw new DomainError(
        409,
        "SLUG_LOCKED",
        "Published or hidden series slug cannot change",
      );
    if (patch.slug !== undefined) {
      patch.slug = await insertWithUniqueSlug(
        patch.slug,
        async (candidate) =>
          !(await this.series.seriesSlugConflict(candidate, id)),
      );
    }
    await this.assertPhaseUsable(patch.historicalPhaseId);
    if (patch.coverImageAssetId) {
      this.assertCoverAssetUsable(
        await this.series.findMediaAsset(patch.coverImageAssetId),
        session,
      );
    }
    if (patch.coverLandscapeAssetId) {
      this.assertCoverAssetUsable(
        await this.series.findMediaAsset(patch.coverLandscapeAssetId),
        session,
        "landscape",
      );
    }
    const update: UpdateSeriesInput = {
      id,
      patch,
      previousCoverImageAssetId: current.coverImageAssetId,
      previousCoverLandscapeAssetId: current.coverLandscapeAssetId,
      before: current,
      after: patch,
      actorId: session.user.id,
      ipAddress,
    };
    await this.series.updateSeries(update);
    return this.getSeriesDetail(id);
  }

  async publishSeries(
    session: Session,
    id: string,
    baseUpdatedAt?: Date,
  ): Promise<SeriesDetailEntity> {
    const current = await this.loadSeriesForRead(session, id);
    assertWritable(session, current);
    const series = await this.getSeriesDetail(id);
    if (!seriesChecklist(series).ready)
      throw new DomainError(
        422,
        "SERIES_NOT_PUBLISHABLE",
        "Series does not meet publishing requirements",
      );
    await this.series.publishSeriesWithEvidence(
      session.user.id,
      id,
      baseUpdatedAt ?? series.updatedAt,
    );
    return this.getSeriesDetail(id);
  }

  async hideSeries(session: Session, id: string): Promise<SeriesDetailEntity> {
    const current = await this.loadSeriesForRead(session, id);
    assertWritable(session, current);
    if (current.status === "DRAFT")
      throw new DomainError(
        409,
        "INVALID_STATE_TRANSITION",
        "Only published series can be hidden",
      );
    if (current.status !== "HIDDEN") await this.series.hideSeries(id);
    return this.getSeriesDetail(id);
  }

  async deleteSeries(session: Session, id: string): Promise<void> {
    const current = await this.loadSeriesForRead(session, id);
    if (current.deletedAt) return;
    assertWritable(session, current);
    await this.series.trashSeries(id, current.status);
  }

  async restoreSeries(
    session: Session,
    id: string,
  ): Promise<SeriesDetailEntity> {
    const current = await this.loadSeriesForRead(session, id);
    if (session.user.role !== "admin" && current.adminLockedAt)
      throw new DomainError(
        403,
        "CONTENT_LOCKED",
        "Content is locked by an administrator",
      );
    if (current.deletedAt)
      await this.series.restoreSeries(
        id,
        current.statusBeforeDelete ?? "DRAFT",
      );
    return this.getSeriesDetail(id);
  }

  // --- series sources ------------------------------------------------------------

  async listSources(
    session: Session,
    seriesId: string,
  ): Promise<SeriesSourceWithSourceEntity[]> {
    await this.loadSeriesForRead(session, seriesId);
    return this.series.listSeriesSources(seriesId);
  }

  async addSource(
    session: Session,
    seriesId: string,
    input: {
      sourceId?: string;
      locator?: string;
      excerpt?: string | null;
      historicalCitationId?: string;
    },
  ): Promise<SeriesSourceWithSourceEntity> {
    const series = await this.loadSeriesForRead(session, seriesId);
    assertWritable(session, series);
    const resolved = input.historicalCitationId
      ? await this.series.resolveHistoricalCitation(
          seriesId,
          input.historicalCitationId,
        )
      : {
          sourceId: input.sourceId!,
          locator: input.locator ?? "",
          excerpt: input.excerpt,
        };
    const created = await this.series.createSeriesSource(seriesId, resolved);
    if (!created)
      throw new DomainError(
        409,
        "SERIES_SOURCE_DUPLICATE",
        "Source is already attached at this locator",
      );
    return this.series.findCreatedSeriesSource(
      seriesId,
      resolved.sourceId,
      resolved.locator,
    );
  }

  async patchSource(
    session: Session,
    seriesId: string,
    childId: string,
    input: { locator?: string; excerpt?: string | null },
  ): Promise<SeriesSourceWithSourceEntity> {
    const series = await this.loadSeriesForRead(session, seriesId);
    assertWritable(session, series);
    const existing = await this.series.findSeriesSource(seriesId, childId);
    if (!existing)
      throw new DomainError(404, "NOT_FOUND", "Series source not found");
    return this.series.updateSeriesSource(childId, input);
  }

  async deleteSource(
    session: Session,
    seriesId: string,
    childId: string,
  ): Promise<void> {
    const series = await this.loadSeriesForRead(session, seriesId);
    assertWritable(session, series);
    const existing = await this.series.findSeriesSource(seriesId, childId);
    if (!existing) return;
    if (
      series.status === "PUBLISHED" &&
      (await this.series.countSeriesSources(seriesId)) <= 1
    ) {
      throw new DomainError(
        409,
        "REQUIRED_FOR_PUBLISHED",
        "Published series require a source",
      );
    }
    await this.series.deleteSeriesSource(seriesId, childId);
  }

  async reorderSources(
    session: Session,
    seriesId: string,
    ids: string[],
  ): Promise<SeriesSourceWithSourceEntity[]> {
    const series = await this.loadSeriesForRead(session, seriesId);
    assertWritable(session, series);
    const rows = await this.series.listSeriesSourceIds(seriesId);
    if (
      ids.length !== rows.length ||
      new Set(ids).size !== ids.length ||
      ids.some((value) => !rows.includes(value))
    ) {
      throw new DomainError(
        422,
        "SERIES_SOURCE_ORDER_MISMATCH",
        "Source order must contain every source exactly once",
      );
    }
    await this.series.reorderSeriesSources(ids);
    return this.series.listSeriesSources(seriesId);
  }

  async reorderEpisodes(
    session: Session,
    id: string,
    episodeIds: string[],
    baseUpdatedAt?: Date,
  ): Promise<SeriesDetailEntity> {
    const current = await this.loadSeriesForRead(session, id);
    assertWritable(session, current);
    await this.assertBaseUpdatedAt("series", id, baseUpdatedAt);
    const existing = await this.episodes.listActiveEpisodeIds(id);
    if (
      new Set(existing).size !== episodeIds.length ||
      episodeIds.some((episodeId) => !existing.includes(episodeId))
    ) {
      throw new DomainError(
        422,
        "EPISODE_ORDER_MISMATCH",
        "Episode order must contain every active episode exactly once",
      );
    }
    await this.episodes.reorderEpisodes(episodeIds, id);
    return this.getSeriesDetail(id);
  }

  // --- episodes --------------------------------------------------------------

  async appendEpisode(
    session: Session,
    seriesId: string,
    input: AppendEpisodeInput,
  ): Promise<EpisodeWorkspaceEntity> {
    const series = await this.loadSeriesForRead(session, seriesId);
    assertWritable(session, series);
    const [created] = await this.episodes.appendEpisodes(seriesId, [input]);
    return this.getEpisodeWorkspace(created!.episodeId);
  }

  async getEpisodeForRead(
    session: Session,
    id: string,
  ): Promise<EpisodeWorkspaceEntity> {
    await this.loadEpisodeForRead(session, id);
    return this.getEpisodeWorkspace(id);
  }

  /** Sources of the episode's series for the AI review; same access rule as reading the episode. */
  async listReviewSources(session: Session, episodeId: string): Promise<SeriesReviewSourceEntity[]> {
    const episode = await this.loadEpisodeForRead(session, episodeId);
    return this.series.listReviewSources(episode.seriesId);
  }

  async updateEpisode(
    session: Session,
    id: string,
    input: {
      title?: string;
      slug?: string;
      description?: string | null;
      baseUpdatedAt?: Date;
    },
  ): Promise<EpisodeWorkspaceEntity> {
    const current = await this.loadEpisodeForRead(session, id);
    assertWritable(session, current.series, current);
    await this.assertBaseUpdatedAt("episode", id, input.baseUpdatedAt);
    const { baseUpdatedAt: _ignored, ...patch } = input;
    if (patch.slug !== undefined && current.status !== "DRAFT")
      throw new DomainError(
        409,
        "SLUG_LOCKED",
        "Published or hidden episode slug cannot change",
      );
    if (patch.slug !== undefined) {
      patch.slug = await insertWithUniqueSlug(
        patch.slug,
        async (candidate) =>
          !(await this.episodes.episodeSlugConflict(candidate, id)),
      );
    }
    await this.episodes.updateEpisode(id, patch);
    return this.getEpisodeWorkspace(id);
  }

  async publishEpisode(
    session: Session,
    id: string,
    baseUpdatedAt?: Date,
  ): Promise<EpisodeWorkspaceEntity> {
    if (session.user.role !== "admin")
      throw new DomainError(
        403,
        "FORBIDDEN",
        "Podcast phải được gửi duyệt và phát hành theo lịch",
      );
    const current = await this.loadEpisodeForRead(session, id);
    assertWritable(session, current.series, current);
    const episode = await this.getEpisodeWorkspace(id);
    if (!episodeChecklist(episode).ready)
      throw new DomainError(
        422,
        "EPISODE_NOT_PUBLISHABLE",
        "Episode does not meet publishing requirements",
      );
    await this.episodes.publishEpisodeWithEvidence(
      session.user.id,
      id,
      baseUpdatedAt ?? episode.updatedAt,
    );
    return this.getEpisodeWorkspace(id);
  }

  async hideEpisode(
    session: Session,
    id: string,
  ): Promise<EpisodeWorkspaceEntity> {
    const current = await this.loadEpisodeForRead(session, id);
    assertWritable(session, current.series, current);
    if (current.status === "DRAFT")
      throw new DomainError(
        409,
        "INVALID_STATE_TRANSITION",
        "Only published episodes can be hidden",
      );
    if (current.status !== "HIDDEN") await this.episodes.hideEpisode(id);
    return this.getEpisodeWorkspace(id);
  }

  async deleteEpisode(session: Session, id: string): Promise<void> {
    const current = await this.loadEpisodeForRead(session, id);
    if (current.deletedAt) return;
    assertWritable(session, current.series, current);
    await this.episodes.trashEpisode(id, current.status);
  }

  async restoreEpisode(
    session: Session,
    id: string,
  ): Promise<EpisodeWorkspaceEntity> {
    const current = await this.loadEpisodeForRead(session, id);
    if (current.series.deletedAt)
      throw new DomainError(
        409,
        "PARENT_IN_TRASH",
        "Restore the parent series first",
      );
    if (
      session.user.role !== "admin" &&
      (current.series.adminLockedAt || current.adminLockedAt)
    )
      throw new DomainError(
        403,
        "CONTENT_LOCKED",
        "Content is locked by an administrator",
      );
    if (current.deletedAt)
      await this.episodes.restoreEpisode(
        id,
        current.statusBeforeDelete ?? "DRAFT",
      );
    return this.getEpisodeWorkspace(id);
  }

  // --- narrations --------------------------------------------------------------

  async listEpisodeDocuments(
    session: Session,
    id: string,
  ): Promise<EpisodeAttachmentEntity[]> {
    await this.loadEpisodeForRead(session, id);
    return this.episodes.listEpisodeAttachments(id);
  }

  async setEpisodePoster(session: Session, id: string, input: { assetId: string | null; fileName?: string }): Promise<EpisodeWorkspaceEntity> {
    const episode = await this.loadEpisodeForRead(session, id);
    assertWritable(session, episode.series, episode);
    if (input.assetId) {
      const asset = await this.series.findMediaAsset(input.assetId);
      if (!asset || asset.kind !== "IMAGE" || asset.status !== "READY" || asset.deletedAt || (session.user.role !== "admin" && asset.uploadedById !== session.user.id)) throw new DomainError(422, "VALIDATION_ERROR", "Ảnh poster chưa hợp lệ hoặc không thuộc tài khoản của bạn. Vui lòng tải lại ảnh.");
    }
    await this.episodes.setEpisodePoster(id, input.assetId, input.fileName ?? "poster");
    return this.getEpisodeWorkspace(id);
  }

  async attachEpisodeDocument(
    session: Session,
    id: string,
    input: { assetId: string; fileName: string },
  ): Promise<EpisodeAttachmentEntity> {
    const episode = await this.loadEpisodeForRead(session, id);
    assertWritable(session, episode.series, episode);
    this.assertDocumentAssetUsable(
      await this.series.findMediaAsset(input.assetId),
      session,
    );
    if (await this.episodes.findEpisodeAttachmentUsingAsset(input.assetId)) {
      throw new DomainError(
        409,
        "ASSET_IN_USE",
        "Document asset is already attached",
      );
    }
    return this.episodes.attachEpisodeDocument({
      episodeId: id,
      mediaAssetId: input.assetId,
      fileName: input.fileName,
    });
  }

  async detachEpisodeDocument(
    session: Session,
    id: string,
    attachmentId: string,
  ): Promise<void> {
    const episode = await this.loadEpisodeForRead(session, id);
    assertWritable(session, episode.series, episode);
    const attachment = await this.episodes.findEpisodeAttachment(
      id,
      attachmentId,
    );
    if (!attachment || attachment.mediaAsset.kind !== "DOCUMENT")
      throw new DomainError(404, "NOT_FOUND", "Attachment not found");
    await this.episodes.detachEpisodeDocument(attachment.id);
  }

  async getNarration(
    session: Session,
    id: string,
    type: NarrationType,
  ): Promise<EpisodeNarrationDetailEntity> {
    await this.loadEpisodeForRead(session, id);
    const narration = await this.episodes.findNarrationByType(id, type);
    if (!narration)
      throw new DomainError(404, "NOT_FOUND", "Narration not found");
    return narration;
  }

  async putNarration(
    session: Session,
    id: string,
    type: NarrationType,
    input: {
      baseUpdatedAt?: Date;
      scriptContent?: string | null;
      scriptDocument?: EditorDocument | null;
      narratorEntityId?: string | null;
    },
  ): Promise<EpisodeNarrationDetailEntity> {
    const episode = await this.loadEpisodeForRead(session, id);
    assertWritable(session, episode.series, episode);
    const current = await this.episodes.findNarrationByType(id, type);
    if (current)
      await this.assertBaseUpdatedAt(
        "narration",
        current.id,
        input.baseUpdatedAt,
      );
    let scriptDocument = input.scriptDocument;
    let scriptContent = input.scriptContent;
    if (input.scriptDocument === undefined && input.scriptContent !== undefined) {
      scriptDocument = null;
    }
    if (input.scriptDocument !== undefined) {
      if (input.scriptDocument === null) {
        scriptContent = null;
      } else {
        const parsed = EditorDocumentSchema.safeParse(input.scriptDocument);
        if (!parsed.success)
          throw new DomainError(
            422,
            "VALIDATION_ERROR",
            "Script document contains unsupported content",
          );
        scriptDocument = parsed.data;
        scriptContent = extractScriptText(parsed.data);
        const citationIds = extractCitationSourceIds(parsed.data);
        if (citationIds.length) {
          const allowed = new Set(
            await this.series.listSeriesSourceIds(episode.seriesId),
          );
          if (citationIds.some((sourceId) => !allowed.has(sourceId))) {
            throw new DomainError(
              422,
              "VALIDATION_ERROR",
              "Script cites a source that is not attached to this series",
            );
          }
        }
      }
    }
    await this.assertScriptValid(scriptContent);
    if (
      type === "THIRD_PERSON" &&
      episode.status === "PUBLISHED" &&
      !scriptContent?.trim()
    )
      throw new DomainError(
        409,
        "REQUIRED_FOR_PUBLISHED",
        "Published episodes require a third-person script",
      );
    if (type === "FIRST_PERSON") {
      if (!input.narratorEntityId)
        throw new DomainError(
          422,
          "VALIDATION_ERROR",
          "First-person narration requires a narrator",
        );
      const entity = await this.episodes.findHistoricalEntity(
        input.narratorEntityId,
      );
      if (!entity || entity.entityType !== "FIGURE")
        throw new DomainError(
          422,
          "VALIDATION_ERROR",
          "Narrator must be a historical figure",
        );
    }
    return this.episodes.upsertNarration({
      episodeId: id,
      narrationType: type,
      scriptContent,
      scriptDocument,
      narratorEntityId:
        type === "FIRST_PERSON" ? input.narratorEntityId! : null,
    });
  }

  async deleteNarration(session: Session, id: string): Promise<void> {
    const episode = await this.loadEpisodeForRead(session, id);
    assertWritable(session, episode.series, episode);
    const narration = await this.episodes.findNarrationByType(
      id,
      "FIRST_PERSON",
    );
    if (!narration) return;
    await this.episodes.deleteNarration(narration.id, narration.audioAssetId);
  }

  async attachAudio(
    session: Session,
    id: string,
    type: NarrationType,
    input: {
      assetId: string;
      analysis?: AudioAnalysis;
      confirmReplacePublished?: boolean;
    },
  ): Promise<EpisodeNarrationDetailEntity> {
    const episode = await this.loadEpisodeForRead(session, id);
    assertWritable(session, episode.series, episode);
    this.assertAudioAssetUsable(
      await this.series.findMediaAsset(input.assetId),
      session,
    );
    const narration = await this.episodes.findNarrationByType(id, type);
    if (!narration)
      throw new DomainError(404, "NOT_FOUND", "Narration not found");
    const used = await this.episodes.findNarrationUsingAsset(
      input.assetId,
      narration.id,
    );
    if (used)
      throw new DomainError(
        409,
        "ASSET_IN_USE",
        "Audio asset is already attached",
      );
    if (
      episode.status === "PUBLISHED" &&
      narration.audioAssetId &&
      narration.audioAssetId !== input.assetId &&
      !input.confirmReplacePublished
    ) {
      throw new DomainError(
        409,
        "REPLACE_CONFIRMATION_REQUIRED",
        "Confirm replacing published audio",
      );
    }
    const analysis = input.analysis
      ? AudioAnalysisSchema.parse(input.analysis)
      : undefined;
    return this.episodes.attachAudio(narration.id, {
      previousAudioAssetId: narration.audioAssetId,
      assetId: input.assetId,
      analysis,
    });
  }

  async detachAudio(
    session: Session,
    id: string,
    type: NarrationType,
  ): Promise<void> {
    const episode = await this.loadEpisodeForRead(session, id);
    assertWritable(session, episode.series, episode);
    const narration = await this.episodes.findNarrationByType(id, type);
    if (!narration)
      throw new DomainError(404, "NOT_FOUND", "Narration not found");
    if (episode.status === "PUBLISHED" && type === "THIRD_PERSON")
      throw new DomainError(
        409,
        "REQUIRED_FOR_PUBLISHED",
        "Published episodes require third-person audio",
      );
    await this.episodes.detachAudio(narration.id, narration.audioAssetId);
  }

  // --- episode entity tags -------------------------------------------------------

  async listEntityTags(session: Session, id: string) {
    await this.loadEpisodeForRead(session, id);
    return this.episodes.listEpisodeEntityTags(id);
  }

  async addEntityTag(session: Session, id: string, entityId: string) {
    const episode = await this.loadEpisodeForRead(session, id);
    assertWritable(session, episode.series, episode);
    return this.episodes.upsertEpisodeEntityTag(id, entityId, session.user.id);
  }

  async patchEntityTag(
    session: Session,
    id: string,
    childId: string,
    status: "CONFIRMED" | "REJECTED",
  ) {
    const episode = await this.loadEpisodeForRead(session, id);
    assertWritable(session, episode.series, episode);
    const existing = await this.episodes.findEpisodeEntityTag(id, childId);
    if (!existing)
      throw new DomainError(404, "NOT_FOUND", "Entity tag not found");
    return this.episodes.updateEpisodeEntityTag(childId, {
      status,
      confirmedById: status === "CONFIRMED" ? session.user.id : null,
      confirmedAt: status === "CONFIRMED" ? new Date() : null,
    });
  }

  async deleteEntityTag(
    session: Session,
    id: string,
    childId: string,
  ): Promise<void> {
    const episode = await this.loadEpisodeForRead(session, id);
    assertWritable(session, episode.series, episode);
    await this.episodes.deleteEpisodeEntityTag(id, childId);
  }
}

/** Pure business rule carried over verbatim from application/content-access.ts. */
export function assertWritable(
  session: Session,
  series: { deletedAt: Date | null; adminLockedAt: Date | null },
  episode?: { deletedAt: Date | null; adminLockedAt: Date | null },
): void {
  if (series.deletedAt || episode?.deletedAt)
    throw new DomainError(409, "CONTENT_IN_TRASH", "Content is in trash");
  if (
    session.user.role !== "admin" &&
    (series.adminLockedAt || episode?.adminLockedAt)
  ) {
    throw new DomainError(
      403,
      "CONTENT_LOCKED",
      "Content is locked by an administrator",
    );
  }
}
