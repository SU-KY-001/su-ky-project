import { mediaStorage } from "../media";
import { ListeningService } from "./listening.service";
import { createMeListeningRoute, createPublicListeningRoute } from "./presentation/listening.routes";

const listeningService = new ListeningService(mediaStorage);
export const publicListeningRoute = createPublicListeningRoute(listeningService, mediaStorage);
export const meListeningRoute = createMeListeningRoute(listeningService);
