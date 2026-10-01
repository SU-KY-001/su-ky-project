import { hc } from "hono/client";
import type { AppType } from "@repo/api/types";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const client = hc<AppType>(apiUrl);
export default client;
