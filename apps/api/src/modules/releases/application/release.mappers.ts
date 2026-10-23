import type { EpisodeRepository } from "../../content/domain/content.repository";
import { episodeChecklist } from "../../content/application/content.mappers";
import { DomainError } from "../../../core/errors/domain-error";
import type { ReleasePublisher } from "./release.service";

/** Adapts the existing episode publication transaction to the release use case. */
export class ContentReleasePublisher implements ReleasePublisher {
  constructor(private readonly episodes: EpisodeRepository) {}

  async checklistReady(episodeId: string): Promise<boolean> {
    const episode = await this.episodes.getEpisodeWorkspace(episodeId);
    return Boolean(episode && episodeChecklist(episode).ready);
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
