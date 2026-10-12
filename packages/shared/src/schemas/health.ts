import { z } from "zod";

export const SystemHealthSchema = z.object({
  status: z.enum(["ok", "degraded", "error"]),
  service: z.string(),
  version: z.string(),
  runtime: z.string(),
  bunVersion: z.string(),
  database: z.enum(["connected", "disconnected"]),
  queue: z.enum(["running", "stopped"]),
  uptimeSeconds: z.number(),
  timestamp: z.string(),
});

export type SystemHealthDto = z.infer<typeof SystemHealthSchema>;
