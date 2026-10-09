import type { Session } from "../../auth";
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
  EpisodeSourceWithSourceEntity,
  EpisodeWorkspaceEntity,
  MediaAssetEntity,
  NarrationType,
  SeriesDetailEntity,
  SeriesListItemEntity,
} from "../domain/content.entity";
import { episodeChecklist, seriesChecklist } from "./content.mappers";

/**
 * Studio orchestration for series/episode content. Ports are injected; Prisma
 * lives in infrastructure/prisma-content.repository.ts. Business rules and
 * DomainError semantics are carried over verbatim from the former inline
 * route-handler logic.
 */
export class ContentService {
  constructor(
    private readonly series: SeriesRepository,
    private readonly episodes: EpisodeRepository
  ) {}

  // --- shared guards (moved verbatim from application/content-access.ts) ---

  async loadSeriesForRead(session: Session, id: string) {
    const series = await this.series.findSeriesById(id);
    if (!series || (session.user.role !== "admin" && series.ownerId !== session.user.id)) {
      throw new DomainError(404, "NOT_FOUND", "Series not found");
    }
    return series;
  }

  async loadEpisodeForRead(session: Session, id: string) {
    const episode = await this.episodes.findEpisodeWithSeries(id);
    if (!episode || (session.user.role !== "admin" && episode.series.ownerId !== session.user.id)) {
      throw new DomainError(404, "NOT_FOUND", "Episode not found");
    }
    return episode;
  }

  async assertBaseUpdatedAt(
    model: "series" | "episode" | "narration",
    id: string,
    baseUpdatedAt?: Date
  ): Promise<void> {
    if (!baseUpdatedAt) return;
    const current =
      model === "series"
        ? await this.series.findSeriesUpdatedAt(id)
        : model === "episode"
          ? await this.episodes.findEpisodeUpdatedAt(id)
          : await this.episodes.findNarrationUpdatedAt(id);
    if (!current || current.getTime() !== baseUpdatedAt.getTime()) {
      throw new DomainError(409, "STALE_WRITE", "Content was updated by another request");
    }
  }

  private assertCoverAssetUsable(asset: MediaAssetEntity | null, session: Session): void {
    if (!asset || asset.kind !== "IMAGE" || asset.status !== "READY" || (session.user.role !== "admin" && asset.uploadedById !== session.user.id)) {
      throw new DomainError(422, "VALIDATION_ERROR", "Cover image asset is not usable");
    }
  }

  private assertAudioAssetUsable(asset: MediaAssetEntity | null, session: Session): void {
    if (!asset || asset.kind !== "AUDIO" || asset.status !== "READY" || (session.user.role !== "admin" && asset.uploadedById !== session.user.id)) {
      throw new DomainError(422, "VALIDATION_ERROR", "Audio asset is not usable");
    }
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

  async listSeries(session: Session, filter: { page: number; limit: number; status?: string | null; q?: string | null; ownerId?: string | null }): Promise<{ items: SeriesListItemEntity[]; page: number; limit: number; total: number }> {
    const items = await this.series.listSeries({
      ownerId: session.user.role === "admin" ? (filter.ownerId ?? null) : session.user.id,
      status: (filter.status as ContentStatus | "TRASH" | null | undefined) ?? null,
      q: filter.q ?? null,
      page: filter.page,
      limit: filter.limit,
    });
    return { items: items.items, page: filter.page, limit: filter.limit, total: items.total };
  }

  async createSeries(session: Session, input: { title: string; slug?: string; description?: string | null; topicId?: string | null; historicalPeriodId?: string | null; startYear?: number | null; endYear?: number | null; coverImageAssetId?: string | null }, ipAddress: string | null): Promise<SeriesDetailEntity> {
    if (input.coverImageAssetId) {
      this.assertCoverAssetUsable(await this.series.findMediaAsset(input.coverImageAssetId), session);
    }
    const created = await this.series.createSeries({ ...input, ownerId: session.user.id, actorId: session.user.id, ipAddress });
    return this.getSeriesDetail(created.id);
  }

  async getSeriesDetailForRead(session: Session, id: string): Promise<SeriesDetailEntity> {
    await this.loadSeriesForRead(session, id);
    return this.getSeriesDetail(id);
  }

  async updateSeries(session: Session, id: string, input: { title?: string; slug?: string; description?: string | null; topicId?: string | null; historicalPeriodId?: string | null; startYear?: number | null; endYear?: number | null; coverImageAssetId?: string | null; baseUpdatedAt?: Date }, ipAddress: string | null): Promise<SeriesDetailEntity> {
    const current = await this.loadSeriesForRead(session, id);
    assertWritable(session, current);
    await this.assertBaseUpdatedAt("series", id, input.baseUpdatedAt);
    const { baseUpdatedAt: _ignored, ...patch } = input;
    if (patch.slug !== undefined && current.status !== "DRAFT") throw new DomainError(409, "SLUG_LOCKED", "Published or hidden series slug cannot change");
    if (patch.slug !== undefined) {
      patch.slug = await insertWithUniqueSlug(patch.slug, async (candidate) => !(await this.series.seriesSlugConflict(candidate, id)));
    }
    if (patch.coverImageAssetId) {
      this.assertCoverAssetUsable(await this.series.findMediaAsset(patch.coverImageAssetId), session);
    }
    const update: UpdateSeriesInput = {
      id, patch,
      previousCoverImageAssetId: current.coverImageAssetId,
      before: current,
      after: patch,
      actorId: session.user.id,
      ipAddress,
    };
    await this.series.updateSeries(update);
    return this.getSeriesDetail(id);
  }

  async publishSeries(session: Session, id: string): Promise<SeriesDetailEntity> {
    const current = await this.loadSeriesForRead(session, id);
    assertWritable(session, current);
    const series = await this.getSeriesDetail(id);
    if (!seriesChecklist(series).ready) throw new DomainError(422, "SERIES_NOT_PUBLISHABLE", "Series does not meet publishing requirements");
    if (series.status !== "PUBLISHED") await this.series.publishSeries(id, series.publishedAt ?? new Date());
    return this.getSeriesDetail(id);
  }

  async hideSeries(session: Session, id: string): Promise<SeriesDetailEntity> {
    const current = await this.loadSeriesForRead(session, id);
    assertWritable(session, current);
    if (current.status === "DRAFT") throw new DomainError(409, "INVALID_STATE_TRANSITION", "Only published series can be hidden");
    if (current.status !== "HIDDEN") await this.series.hideSeries(id);
    return this.getSeriesDetail(id);
  }

  async deleteSeries(session: Session, id: string): Promise<void> {
    const current = await this.loadSeriesForRead(session, id);
    if (current.deletedAt) return;
    assertWritable(session, current);
    await this.series.trashSeries(id, current.status);
  }

  async restoreSeries(session: Session, id: string): Promise<SeriesDetailEntity> {
    const current = await this.loadSeriesForRead(session, id);
    if (session.user.role !== "admin" && current.adminLockedAt) throw new DomainError(403, "CONTENT_LOCKED", "Content is locked by an administrator");
    if (current.deletedAt) await this.series.restoreSeries(id, current.statusBeforeDelete ?? "DRAFT");
    return this.getSeriesDetail(id);
  }

  async reorderEpisodes(session: Session, id: string, episodeIds: string[], baseUpdatedAt?: Date): Promise<SeriesDetailEntity> {
    const current = await this.loadSeriesForRead(session, id);
    assertWritable(session, current);
    await this.assertBaseUpdatedAt("series", id, baseUpdatedAt);
    const existing = await this.episodes.listActiveEpisodeIds(id);
    if (new Set(existing).size !== episodeIds.length || episodeIds.some((episodeId) => !existing.includes(episodeId))) {
      throw new DomainError(422, "EPISODE_ORDER_MISMATCH", "Episode order must contain every active episode exactly once");
    }
    await this.episodes.reorderEpisodes(episodeIds, id);
    return this.getSeriesDetail(id);
  }

  // --- episodes --------------------------------------------------------------

  async appendEpisode(session: Session, seriesId: string, input: AppendEpisodeInput): Promise<EpisodeWorkspaceEntity> {
    const series = await this.loadSeriesForRead(session, seriesId);
    assertWritable(session, series);
    const [created] = await this.episodes.appendEpisodes(seriesId, [input]);
    return this.getEpisodeWorkspace(created!.episodeId);
  }

  async getEpisodeForRead(session: Session, id: string): Promise<EpisodeWorkspaceEntity> {
    await this.loadEpisodeForRead(session, id);
    return this.getEpisodeWorkspace(id);
  }

  async updateEpisode(session: Session, id: string, input: { title?: string; slug?: string; description?: string | null; baseUpdatedAt?: Date }): Promise<EpisodeWorkspaceEntity> {
    const current = await this.loadEpisodeForRead(session, id);
    assertWritable(session, current.series, current);
    await this.assertBaseUpdatedAt("episode", id, input.baseUpdatedAt);
    const { baseUpdatedAt: _ignored, ...patch } = input;
    if (patch.slug !== undefined && current.status !== "DRAFT") throw new DomainError(409, "SLUG_LOCKED", "Published or hidden episode slug cannot change");
    if (patch.slug !== undefined) {
      patch.slug = await insertWithUniqueSlug(patch.slug, async (candidate) => !(await this.episodes.episodeSlugConflict(candidate, id)));
    }
    await this.episodes.updateEpisode(id, patch);
    return this.getEpisodeWorkspace(id);
  }

  async publishEpisode(session: Session, id: string): Promise<EpisodeWorkspaceEntity> {
    const current = await this.loadEpisodeForRead(session, id);
    assertWritable(session, current.series, current);
    const episode = await this.getEpisodeWorkspace(id);
    if (!episodeChecklist(episode).ready) throw new DomainError(422, "EPISODE_NOT_PUBLISHABLE", "Episode does not meet publishing requirements");
    if (episode.status !== "PUBLISHED") await this.episodes.publishEpisode(id, episode.publishedAt ?? new Date());
    return this.getEpisodeWorkspace(id);
  }

  async hideEpisode(session: Session, id: string): Promise<EpisodeWorkspaceEntity> {
    const current = await this.loadEpisodeForRead(session, id);
    assertWritable(session, current.series, current);
    if (current.status === "DRAFT") throw new DomainError(409, "INVALID_STATE_TRANSITION", "Only published episodes can be hidden");
    if (current.status !== "HIDDEN") await this.episodes.hideEpisode(id);
    return this.getEpisodeWorkspace(id);
  }

  async deleteEpisode(session: Session, id: string): Promise<void> {
    const current = await this.loadEpisodeForRead(session, id);
    if (current.deletedAt) return;
    assertWritable(session, current.series, current);
    await this.episodes.trashEpisode(id, current.status);
  }

  async restoreEpisode(session: Session, id: string): Promise<EpisodeWorkspaceEntity> {
    const current = await this.loadEpisodeForRead(session, id);
    if (current.series.deletedAt) throw new DomainError(409, "PARENT_IN_TRASH", "Restore the parent series first");
    if (session.user.role !== "admin" && (current.series.adminLockedAt || current.adminLockedAt)) throw new DomainError(403, "CONTENT_LOCKED", "Content is locked by an administrator");
    if (current.deletedAt) await this.episodes.restoreEpisode(id, current.statusBeforeDelete ?? "DRAFT");
    return this.getEpisodeWorkspace(id);
  }

  // --- narrations --------------------------------------------------------------

  async getNarration(session: Session, id: string, type: NarrationType): Promise<EpisodeNarrationDetailEntity> {
    await this.loadEpisodeForRead(session, id);
    const narration = await this.episodes.findNarrationByType(id, type);
    if (!narration) throw new DomainError(404, "NOT_FOUND", "Narration not found");
    return narration;
  }

  async putNarration(session: Session, id: string, type: NarrationType, input: { baseUpdatedAt?: Date; scriptContent?: string | null; narratorEntityId?: string | null }): Promise<EpisodeNarrationDetailEntity> {
    const episode = await this.loadEpisodeForRead(session, id);
    assertWritable(session, episode.series, episode);
    const current = await this.episodes.findNarrationByType(id, type);
    if (current) await this.assertBaseUpdatedAt("narration", current.id, input.baseUpdatedAt);
    if (type === "THIRD_PERSON" && episode.status === "PUBLISHED" && !input.scriptContent?.trim()) throw new DomainError(409, "REQUIRED_FOR_PUBLISHED", "Published episodes require a third-person script");
    if (type === "FIRST_PERSON") {
      if (!input.narratorEntityId) throw new DomainError(422, "VALIDATION_ERROR", "First-person narration requires a narrator");
      const entity = await this.episodes.findHistoricalEntity(input.narratorEntityId);
      if (!entity || entity.entityType !== "FIGURE") throw new DomainError(422, "VALIDATION_ERROR", "Narrator must be a historical figure");
    }
    return this.episodes.upsertNarration({ episodeId: id, narrationType: type, scriptContent: input.scriptContent, narratorEntityId: type === "FIRST_PERSON" ? input.narratorEntityId! : null });
  }

  async deleteNarration(session: Session, id: string): Promise<void> {
    const episode = await this.loadEpisodeForRead(session, id);
    assertWritable(session, episode.series, episode);
    const narration = await this.episodes.findNarrationByType(id, "FIRST_PERSON");
    if (!narration) return;
    await this.episodes.deleteNarration(narration.id, narration.audioAssetId);
  }

  async getAiOriginal(session: Session, id: string, type: NarrationType): Promise<{ scriptContent: string }> {
    await this.loadEpisodeForRead(session, id);
    const narration = await this.episodes.findNarrationWithPublication(id, type);
    if (!narration?.scriptPublication || !narration.scriptPublicationEpisodeNo) throw new DomainError(404, "NOT_FOUND", "AI original is not available");
    const segment = narration.scriptPublication.finalScript.split("\n\n---\n\n")[narration.scriptPublicationEpisodeNo - 1];
    const content = segment?.slice(segment.indexOf("\n\n") + 2);
    if (!content) throw new DomainError(404, "NOT_FOUND", "AI original is not available");
    return { scriptContent: content };
  }

  async attachAudio(session: Session, id: string, type: NarrationType, input: { assetId: string; provider: "UPLOAD" | "ELEVENLABS"; confirmReplacePublished?: boolean }): Promise<EpisodeNarrationDetailEntity> {
    const episode = await this.loadEpisodeForRead(session, id);
    assertWritable(session, episode.series, episode);
    this.assertAudioAssetUsable(await this.series.findMediaAsset(input.assetId), session);
    const narration = await this.episodes.findNarrationByType(id, type);
    if (!narration) throw new DomainError(404, "NOT_FOUND", "Narration not found");
    const used = await this.episodes.findNarrationUsingAsset(input.assetId, narration.id);
    if (used) throw new DomainError(409, "ASSET_IN_USE", "Audio asset is already attached");
    if (episode.status === "PUBLISHED" && narration.audioAssetId && narration.audioAssetId !== input.assetId && !input.confirmReplacePublished) {
      throw new DomainError(409, "REPLACE_CONFIRMATION_REQUIRED", "Confirm replacing published audio");
    }
    return this.episodes.attachAudio(narration.id, { previousAudioAssetId: narration.audioAssetId, assetId: input.assetId, provider: input.provider });
  }

  async detachAudio(session: Session, id: string, type: NarrationType): Promise<void> {
    const episode = await this.loadEpisodeForRead(session, id);
    assertWritable(session, episode.series, episode);
    const narration = await this.episodes.findNarrationByType(id, type);
    if (!narration) throw new DomainError(404, "NOT_FOUND", "Narration not found");
    if (episode.status === "PUBLISHED" && type === "THIRD_PERSON") throw new DomainError(409, "REQUIRED_FOR_PUBLISHED", "Published episodes require third-person audio");
    await this.episodes.detachAudio(narration.id, narration.audioAssetId);
  }

  // --- episode sources ---------------------------------------------------------

  async listSources(session: Session, id: string): Promise<EpisodeSourceWithSourceEntity[]> {
    await this.loadEpisodeForRead(session, id);
    return this.episodes.listEpisodeSources(id);
  }

  async addSource(session: Session, id: string, input: { sourceId: string; locator: string; excerpt?: string | null }): Promise<EpisodeSourceWithSourceEntity> {
    const episode = await this.loadEpisodeForRead(session, id);
    assertWritable(session, episode.series, episode);
    const created = await this.episodes.createEpisodeSource(id, input);
    if (!created) throw new DomainError(409, "EPISODE_SOURCE_DUPLICATE", "Source is already attached at this locator");
    return this.episodes.findCreatedEpisodeSource(id, input.sourceId, input.locator);
  }

  async patchSource(session: Session, id: string, childId: string, input: { locator?: string; excerpt?: string | null }): Promise<EpisodeSourceWithSourceEntity> {
    const episode = await this.loadEpisodeForRead(session, id);
    assertWritable(session, episode.series, episode);
    const existing = await this.episodes.findEpisodeSource(id, childId);
    if (!existing) throw new DomainError(404, "NOT_FOUND", "Episode source not found");
    return this.episodes.updateEpisodeSource(childId, input);
  }

  async deleteSource(session: Session, id: string, childId: string): Promise<void> {
    const episode = await this.loadEpisodeForRead(session, id);
    assertWritable(session, episode.series, episode);
    if (episode.status === "PUBLISHED" && (await this.episodes.countEpisodeSources(id)) <= 1) {
      throw new DomainError(409, "REQUIRED_FOR_PUBLISHED", "Published episodes require a source");
    }
    await this.episodes.deleteEpisodeSource(id, childId);
  }

  async reorderSources(session: Session, id: string, ids: string[]): Promise<EpisodeSourceWithSourceEntity[]> {
    const episode = await this.loadEpisodeForRead(session, id);
    assertWritable(session, episode.series, episode);
    const rows = await this.episodes.listEpisodeSourceIds(id);
    if (ids.length !== rows.length || ids.some((value) => !rows.includes(value))) {
      throw new DomainError(422, "EPISODE_ORDER_MISMATCH", "Source order must contain every source exactly once");
    }
    await this.episodes.reorderEpisodeSources(ids);
    return this.episodes.listEpisodeSources(id);
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

  async patchEntityTag(session: Session, id: string, childId: string, status: "CONFIRMED" | "REJECTED") {
    const episode = await this.loadEpisodeForRead(session, id);
    assertWritable(session, episode.series, episode);
    const existing = await this.episodes.findEpisodeEntityTag(id, childId);
    if (!existing) throw new DomainError(404, "NOT_FOUND", "Entity tag not found");
    return this.episodes.updateEpisodeEntityTag(childId, {
      status,
      confirmedById: status === "CONFIRMED" ? session.user.id : null,
      confirmedAt: status === "CONFIRMED" ? new Date() : null,
    });
  }

  async deleteEntityTag(session: Session, id: string, childId: string): Promise<void> {
    const episode = await this.loadEpisodeForRead(session, id);
    assertWritable(session, episode.series, episode);
    await this.episodes.deleteEpisodeEntityTag(id, childId);
  }
}

/** Pure business rule carried over verbatim from application/content-access.ts. */
export function assertWritable(
  session: Session,
  series: { deletedAt: Date | null; adminLockedAt: Date | null },
  episode?: { deletedAt: Date | null; adminLockedAt: Date | null }
): void {
  if (series.deletedAt || episode?.deletedAt) throw new DomainError(409, "CONTENT_IN_TRASH", "Content is in trash");
  if (session.user.role !== "admin" && (series.adminLockedAt || episode?.adminLockedAt)) {
    throw new DomainError(403, "CONTENT_LOCKED", "Content is locked by an administrator");
  }
}
