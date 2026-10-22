import { PrismaEpisodeRepository } from "../content/infrastructure/prisma-content.repository";
import { getEpisodeAiSummary } from "../ai-assist/infrastructure/episode-ai-summary";
import { mediaStorage } from "../media";
import { ReleaseService } from "./application/release.service";
import { ContentReleasePublisher } from "./application/release.mappers";
import { PrismaReleaseRepository } from "./infrastructure/prisma-release.repository";

export const releaseRepository = new PrismaReleaseRepository();
export const releaseService = new ReleaseService(
  releaseRepository,
  new ContentReleasePublisher(new PrismaEpisodeRepository(), mediaStorage, getEpisodeAiSummary),
);

export * from "./application/release.service";
export * from "./domain/release.repository";
