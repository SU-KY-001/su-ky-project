import { RadioTower } from "lucide-react";
import { Link, NavLink, Outlet } from "react-router";
import { PlayerDock } from "../../features/audio-player/PlayerDock";

const navigation = [
  { to: "/timeline", label: "Dòng thời gian" },
  { to: "/series", label: "Series" },
  { to: "/search", label: "Tra cứu" },
];

export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0B0F17] font-sans text-slate-100">
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-[#0F1420]/90 backdrop-blur-md">
        <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-x-8 gap-y-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400">
            <span className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-red-600 font-serif text-xl font-bold text-white shadow-lg shadow-amber-500/20">
              Sử
            </span>
            <span>
              <span className="block font-serif text-xl font-bold tracking-tight text-white">Su-Ky</span>
              <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500">Podcast lịch sử Việt Nam</span>
            </span>
          </Link>

          <nav aria-label="Điều hướng chính" className="flex items-center gap-1 overflow-x-auto text-sm">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-md px-3 py-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400 ${
                    isActive ? "bg-amber-400/10 text-amber-300" : "text-slate-400 hover:bg-slate-800/70 hover:text-white"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-2 rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-[11px] font-mono text-slate-400 lg:flex">
            <RadioTower className="size-3.5 text-amber-400" aria-hidden="true" />
            <span>Hono RPC</span>
            <span className="text-slate-700">/</span>
            <span>React 19</span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      <PlayerDock />

      <footer className="border-t border-slate-900 px-4 py-4 text-center text-xs text-slate-600">
        Một hành trình lắng nghe lịch sử Việt Nam.
      </footer>
    </div>
  );
}
