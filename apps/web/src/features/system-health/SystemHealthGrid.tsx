import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Code2, Database, Server } from "lucide-react";
import { client } from "../../shared/api/client";

export function SystemHealthGrid() {
  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const response = await client.health.$get();
      if (!response.ok) {
        throw new Error(`API healthcheck returned status ${response.status}`);
      }
      return response.json();
    },
    refetchInterval: 10_000,
  });

  const health = healthQuery.data?.data;
  const apiStatus = healthQuery.isPending
    ? "Connecting..."
    : healthQuery.isError
      ? "Offline / Degraded"
      : health?.status === "ok"
        ? "Online & Healthy"
        : "Degraded";

  return (
    <section aria-label="Trạng thái hệ thống" className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <article className="space-y-3 rounded-xl border border-slate-800 bg-[#121824] p-5">
        <div className="flex items-center justify-between text-slate-400">
          <h2 className="flex items-center gap-2 text-sm font-medium text-slate-200"><Server className="size-4 text-indigo-400" />Hono Backend API</h2>
          {healthQuery.isError ? <AlertCircle className="size-4 text-rose-500" aria-label="Lỗi kết nối" /> : <CheckCircle2 className="size-4 text-emerald-400" aria-label="Đang kết nối" />}
        </div>
        <p className="text-2xl font-bold font-mono" aria-live="polite">{apiStatus}</p>
        <div className="space-y-1 text-xs font-mono text-slate-400">
          <p>Port: :3005</p>
          <p>Runtime: Bun {health?.bunVersion ?? "1.4.0"}</p>
          <p>Endpoint: /health</p>
        </div>
      </article>

      <article className="space-y-3 rounded-xl border border-slate-800 bg-[#121824] p-5">
        <div className="flex items-center justify-between text-slate-400">
          <h2 className="flex items-center gap-2 text-sm font-medium text-slate-200"><Database className="size-4 text-amber-400" />PostgreSQL 17</h2>
          {health?.database === "connected" ? <CheckCircle2 className="size-4 text-emerald-400" aria-label="Đã kết nối" /> : <AlertCircle className="size-4 text-amber-500" aria-label="Chưa kết nối" />}
        </div>
        <p className="text-2xl font-bold font-mono">{health?.database === "connected" ? "Connected" : "Standby / Docker"}</p>
        <div className="space-y-1 text-xs font-mono text-slate-400">
          <p>ORM: Prisma Client</p>
          <p>Docker Compose: suky-postgres:5432</p>
          <p>Status: {health?.database ?? "Disconnected"}</p>
        </div>
      </article>

      <article className="space-y-3 rounded-xl border border-slate-800 bg-[#121824] p-5">
        <div className="flex items-center justify-between text-slate-400">
          <h2 className="flex items-center gap-2 text-sm font-medium text-slate-200"><Code2 className="size-4 text-cyan-400" />End-to-End RPC</h2>
          <CheckCircle2 className="size-4 text-emerald-400" aria-label="Đã cấu hình" />
        </div>
        <p className="text-2xl font-bold font-mono text-cyan-400">Type-Safe hc</p>
        <div className="space-y-1 text-xs font-mono text-slate-400">
          <p>Contract: AppType from @repo/api</p>
          <p>Shared Schemas: @repo/shared</p>
          <p>Zero Client Runtime Leak</p>
        </div>
      </article>
    </section>
  );
}
