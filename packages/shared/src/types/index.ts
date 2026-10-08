export interface SystemHealthDto {
  status: "ok" | "degraded" | "error";
  service: string;
  version: string;
  runtime: string;
  bunVersion: string;
  database: "connected" | "disconnected";
  queue: "running" | "stopped";
  ai: "ready" | "unavailable";
  uptimeSeconds: number;
  timestamp: string;
}
