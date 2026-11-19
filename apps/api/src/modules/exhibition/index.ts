import { mediaStorage } from "../media";
import { ExhibitionService } from "./application/exhibition.service";
import { PrismaExhibitionRepository } from "./infrastructure/prisma-exhibition.repository";
import { createPublicExhibitionRoute, createStudioExhibitionRoute } from "./presentation/exhibition.routes";

const service = new ExhibitionService(new PrismaExhibitionRepository(mediaStorage));
export const exhibitionRoute = createStudioExhibitionRoute(service);
export const publicExhibitionRoute = createPublicExhibitionRoute(service);
