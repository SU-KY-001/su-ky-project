import { exhibitionTemplate } from "@repo/shared";
import type { GalleryView } from "./components/GalleryControls";

export const initialView: GalleryView = { position: [...exhibitionTemplate.spawns[0].position], yaw: exhibitionTemplate.spawns[0].yaw, revision: 0 };
