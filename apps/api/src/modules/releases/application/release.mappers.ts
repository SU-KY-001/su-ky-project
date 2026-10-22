import type { EpisodeAiSummary, ReviewContent } from "@repo/shared";
import type { EpisodeRepository } from "../../content/domain/content.repository";
import { episodeChecklist, mapWorkspace } from "../../content/application/content.mappers";
import { computeEpisodeReadiness } from "../../content/application/episode-readiness";
import { getSystemConfig } from "../../../core/config/system-config";
import { DomainError } from "../../../core/errors/domain-error";
import type { MediaStorageGateway } from "../../media";
import type { ReleasePublisher } from "./release.service";

/** Adapts the existing episode publication transaction to the release use case. */
export class ContentReleasePublisher implements ReleasePublisher {
  constructor(
    private readonly episodes: EpisodeRepository,
    private readonly storage: MediaStorageGateway,
    private readonly aiSummary: (episodeId: string) => Promise<EpisodeAiSummary | null>,
  ) {}

  async checklistReady(episodeId: string): Promise<boolean> {
    const episode = await this.episodes.getEpisodeWorkspace(episodeId);
    return Boolean(episode && episodeChecklist(episode).ready);
  }

  async reviewContent(episodeId: string): Promise<ReviewContent | null> {
    const episode = await this.episodes.getEpisodeWorkspace(episodeId);
    if (!episode) return null;
    const aiEnabled = await getSystemConfig("ai_assist.enabled");
    const summary = aiEnabled ? await this.aiSummary(episodeId) : null;
    const workspace = await mapWorkspace(episode, this.storage);
    const readiness = computeEpisodeReadiness(
      episode,
      workspace.narrations,
      { minScriptWords: await getSystemConfig("readiness.min_script_words") },
      { enabled: aiEnabled, summary },
      new Date(),
    );
    return { episode: workspace, readiness, aiSummary: summary };
  }

  async publishEpisode(episodeId: string, baseUpdatedAt: Date): Promise<void> {
    const episode = await this.episodes.getEpisodeWorkspace(episodeId);
    if (!episode)
      throw new DomainError(404, "NOT_FOUND", "Không tìm thấy tập podcast");
    if (!episodeChecklist(episode).ready)
      throw new DomainError(
        422,
        "EPISODE_NOT_PUBLISHABLE",
        "Tập podcast chưa đạt checklist phát hành",
      );
    await this.episodes.publishEpisodeWithEvidence(null, episodeId, baseUpdatedAt);
  }
}
