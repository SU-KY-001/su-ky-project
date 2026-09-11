export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    requestId?: string;
    total?: number;
    page?: number;
    limit?: number;
    timestamp: string;
  };
}

export interface SystemHealthDto {
  status: "ok" | "degraded" | "error";
  service: string;
  version: string;
  runtime: string;
  bunVersion: string;
  database: "connected" | "disconnected";
  uptimeSeconds: number;
  timestamp: string;
}
