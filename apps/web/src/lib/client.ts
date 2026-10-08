import { hc } from "hono/client";
import type { AppType } from "@repo/api/types";

export const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3005";

export const client = hc<AppType>(apiUrl, { init: { credentials: "include" } });
export default client;
