import type { EpisodeAiSummary } from "@repo/shared";
import type { EpisodeRepository } from "../content";
import type { MediaStorageGateway } from "../media";
import { ContentReleasePublisher } from "./application/release.mappers";
import { ReleaseService } from "./application/release.service";
import { PrismaReleaseRepository } from "./infrastructure/prisma-release.repository";

export const releaseRepository = new PrismaReleaseRepository();

/** Wired by the composition root (`app.ts`) so this module never imports another module's infrastructure. */
export function createReleaseService(
  episodes: EpisodeRepository,
  storage: MediaStorageGateway,
  aiSummary: (episodeId: string) => Promise<EpisodeAiSummary | null>,
): ReleaseService {
  return new ReleaseService(
    releaseRepository,
    new ContentReleasePublisher(episodes, storage, aiSummary),
  );
}

export * from "./application/release.service";
export * from "./domain/release.repository";
export { createReleaseRoutes } from "./presentation/release.routes";
