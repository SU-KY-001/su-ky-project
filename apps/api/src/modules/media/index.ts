import { CloudinaryGateway } from "./infrastructure/cloudinary.gateway";
import { MediaService } from "./application/media.service";
import { createMediaRoute } from "./presentation/media.routes";

export const mediaStorage = new CloudinaryGateway();
export const mediaService = new MediaService(mediaStorage);
export const mediaRoute = createMediaRoute(mediaService);
export { MediaService } from "./application/media.service";
export type { MediaStorageGateway } from "./application/media-storage";
