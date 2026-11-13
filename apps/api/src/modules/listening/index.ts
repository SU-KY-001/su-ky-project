import { mediaStorage } from "../media";
import { ListeningService } from "./application/listening.service";
import { PrismaListeningRepository } from "./infrastructure/prisma-listening.repository";
import { createMeListeningRoute, createPublicListeningRoute } from "./presentation/listening.routes";

const listeningService = new ListeningService(new PrismaListeningRepository(), mediaStorage);
export const publicListeningRoute = createPublicListeningRoute(listeningService);
export const meListeningRoute = createMeListeningRoute(listeningService);
