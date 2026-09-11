import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { client } from "./lib/api";
import {
  Sparkles,
  Server,
  Database,
  Radio,
  Clock,
  BookOpen,
  Code2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
interface TimelinePeriodItem {
  id: string;
  name: string;
  slug: string;
  startYear: number;
  endYear?: number | null;
  description: string;
  episodesCount?: number;
  seriesCount?: number;
}


export function App() {
  const [isClientReady, setIsClientReady] = useState(false);

  useEffect(() => {
    setIsClientReady(true);
  }, []);

  // 1. Check API & DB Health via Typed RPC
  const { data: healthData, isLoading: isHealthLoading, error: healthError } = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const res = await client.health.$get();
      if (!res.ok) {
        throw new Error(`API healthcheck returned status ${res.status}`);
      }
      return res.json();
    },
    refetchInterval: 10000,
  });

  // 2. Fetch Sample Historical Periods via Typed RPC
  const { data: timelineData, isLoading: isTimelineLoading } = useQuery({
    queryKey: ["timeline"],
    queryFn: async () => {
      const res = await client.api.timeline.$get();
      if (!res.ok) throw new Error("Failed to load timeline periods");
      return res.json();
    },
  });

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-[#0F1420]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center font-serif text-xl font-bold text-white shadow-lg shadow-amber-500/20">
              Sử
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white font-serif">
                Su-Ky
              </span>
              <span className="ml-2 text-xs font-mono uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                Monorepo Starter
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4 text-xs font-mono text-slate-400">
            <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Bun v1.4.0</span>
            </div>
            <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md">
              <span>Hono v4 RPC</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        {/* Banner */}
        <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-[#131B2A] via-[#0E1522] to-[#0B0F17] p-6 sm:p-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Khung Dự Án Sẵn Sàng Cho Frontend Team (WDP301)</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight font-serif text-white">
              Nền Tảng Podcast Kể Chuyện Lịch Sử Việt Nam
            </h1>

            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Dự án đã được thiết lập đầy đủ hạ tầng monorepo: Turborepo, Bun 1.4, Hono backend với RPC Client, và PostgreSQL database layer. Dưới đây là kết nối mẫu kiểm tra API hoạt động theo thời gian thực.
            </p>
          </div>
        </div>

        {/* System Health & Connectivity Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Backend Health */}
          <div className="rounded-xl border border-slate-800 bg-[#121824] p-5 space-y-3">
            <div className="flex items-center justify-between text-slate-400">
              <div className="flex items-center space-x-2 text-sm font-medium text-slate-200">
                <Server className="w-4 h-4 text-indigo-400" />
                <span>Hono Backend API</span>
              </div>
              {isHealthLoading ? (
                <span className="text-xs font-mono text-slate-500">Pinging...</span>
              ) : healthError ? (
                <AlertCircle className="w-4 h-4 text-rose-500" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}
            </div>

            <div className="text-2xl font-bold font-mono">
              {isHealthLoading
                ? "Connecting..."
                : healthError
                ? "Offline / Degraded"
                : healthData?.data?.status === "ok"
                ? "Online & Healthy"
                : "Degraded"}
            </div>

            <div className="text-xs font-mono text-slate-400 space-y-1">
              <div>Port: :3000</div>
              <div>Runtime: Bun {healthData?.data?.bunVersion || "1.4.0"}</div>
              <div>Endpoint: /health</div>
            </div>
          </div>

          {/* Database Health */}
          <div className="rounded-xl border border-slate-800 bg-[#121824] p-5 space-y-3">
            <div className="flex items-center justify-between text-slate-400">
              <div className="flex items-center space-x-2 text-sm font-medium text-slate-200">
                <Database className="w-4 h-4 text-amber-400" />
                <span>PostgreSQL 17</span>
              </div>
              {healthData?.data?.database === "connected" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-500" />
              )}
            </div>

            <div className="text-2xl font-bold font-mono">
              {healthData?.data?.database === "connected" ? "Connected" : "Standby / Docker"}
            </div>

            <div className="text-xs font-mono text-slate-400 space-y-1">
              <div>ORM: Prisma Client</div>
              <div>Docker Compose: suky-postgres:5432</div>
              <div>Status: {healthData?.data?.database || "Disconnected"}</div>
            </div>
          </div>

          {/* RPC Client Status */}
          <div className="rounded-xl border border-slate-800 bg-[#121824] p-5 space-y-3">
            <div className="flex items-center justify-between text-slate-400">
              <div className="flex items-center space-x-2 text-sm font-medium text-slate-200">
                <Code2 className="w-4 h-4 text-cyan-400" />
                <span>End-to-End RPC</span>
              </div>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>

            <div className="text-2xl font-bold font-mono text-cyan-400">
              Type-Safe hc
            </div>

            <div className="text-xs font-mono text-slate-400 space-y-1">
              <div>Contract: AppType from @repo/api</div>
              <div>Shared Schemas: @repo/shared</div>
              <div>Zero Client Runtime Leak</div>
            </div>
          </div>
        </div>

        {/* Live Data RPC Demo: Historical Periods */}
        <div className="rounded-xl border border-slate-800 bg-[#0F1420] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-bold font-serif text-white flex items-center space-x-2">
                <Radio className="w-4 h-4 text-amber-500" />
                <span>Dữ Liệu Dòng Thời Gian Mẫu (Từ Backend RPC)</span>
              </h2>
              <p className="text-xs text-slate-400">
                Được truy vấn tự động thông qua Hono Client <code>client.api.timeline.$get()</code>
              </p>
            </div>
          </div>

          {isTimelineLoading ? (
            <div className="py-8 text-center text-sm font-mono text-slate-500 animate-pulse">
              Đang tải danh sách triều đại từ backend...
            </div>
          ) : timelineData?.data?.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {timelineData.data.map((period: TimelinePeriodItem) => (
                <div
                  key={period.id}
                  className="p-4 rounded-lg border border-slate-800 bg-[#131B2A]/60 hover:border-amber-500/40 transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-slate-200">
                      {period.name}
                    </span>
                    <span className="text-xs font-mono text-amber-400/80 bg-amber-400/10 px-2 py-0.5 rounded">
                      {period.startYear} - {period.endYear || "nay"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2">
                    {period.description || "Chưa có mô tả chi tiết."}
                  </p>
                  <div className="flex items-center space-x-3 text-[11px] font-mono text-slate-500 pt-1">
                    <span>{period.episodesCount || 0} tập podcast</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 rounded-lg border border-dashed border-slate-800 text-center text-xs text-slate-400 space-y-2">
              <p>Backend đã sẵn sàng nhận kết nối. Khi khởi động PostgreSQL và chạy seed (<code>bun run db:seed</code>), dữ liệu triều đại sẽ tự động hiển thị tại đây.</p>
            </div>
          )}
        </div>

        {/* Guidance for Frontend Team */}
        <div className="rounded-xl border border-dashed border-slate-800 bg-[#0C111A] p-6 space-y-4">
          <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-slate-300 flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <span>Hướng Dẫn Dành Cho Frontend Team</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-400">
            <div className="space-y-1.5">
              <span className="font-semibold text-slate-200">1. Tài Liệu Thiết Kế & Wireframe:</span>
              <p>
                Tham khảo <code>docs/design-guidelines.md</code> và wireframe mẫu tại <code>docs/wireframe/index.html</code> để áp dụng bảng màu, font chữ (Playfair Display + Plus Jakarta Sans) và layout podcast player.
              </p>
            </div>
            <div className="space-y-1.5">
              <span className="font-semibold text-slate-200">2. Gọi API với Type-Safety tuyệt đối:</span>
              <p>
                Sử dụng <code>client.api.episodes.$get(...)</code> trong <code>src/lib/api.ts</code> để tự động có full gợi ý code và type contract từ Hono backend mà không cần viết lại interface.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Sticky Bottom Mini Player Placeholder */}
      <footer className="border-t border-slate-800 bg-[#0F1420]/95 backdrop-blur-md py-3 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-amber-500 font-bold">
              ▶
            </div>
            <div>
              <div className="text-slate-200 font-medium">Bạch Đằng 938: Ngô Quyền (Audio Player Slot)</div>
              <div className="text-slate-500 font-mono text-[11px]">Dành cho Frontend Team gắn player component</div>
            </div>
          </div>
          <div className="flex items-center space-x-4 font-mono text-[11px]">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>00:00 / 19:00</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
