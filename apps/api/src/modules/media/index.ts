import { CloudinaryGateway } from "./infrastructure/cloudinary.gateway";
import { PrismaMediaRepository } from "./infrastructure/prisma-media.repository";
import { MediaService } from "./application/media.service";
import { createMediaRoute } from "./presentation/media.routes";

export const mediaStorage = new CloudinaryGateway();
export const mediaService = new MediaService(mediaStorage, new PrismaMediaRepository());
export const mediaRoute = createMediaRoute(mediaService);
export { MediaService } from "./application/media.service";
export type { MediaStorageGateway } from "./domain/media.repository";
export { audioMimeType } from "./domain/media.formats";
