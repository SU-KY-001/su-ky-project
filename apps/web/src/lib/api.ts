import { hc } from "hono/client";
import type { AppType } from "@repo/api/types";

// Base API URL from environment variable or default local dev server
const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Export typed RPC client
export const client = hc<AppType>(apiUrl);
export default client;
