import { Books, ClockCounterClockwise, House, List, Target, X } from "@phosphor-icons/react";
import { useState } from "react";
import { Link, useLocation } from "react-router";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";
import brandLogo from "@/public/brand-su-ky-viet-nam.png";
import { useCurrentUser } from "@/shared/hooks/useCurrentUser";
import { AccountProfile } from "@/features/auth";
import { APP_PATHS } from "@/shared/constants/routes";

export function MainHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const session = useCurrentUser();

  const navLinks = [
    { label: "Trang chủ", to: APP_PATHS.home, icon: House },
    { label: "Thư viện Series", to: APP_PATHS.series, icon: Books },
    ...(session.data
      ? [
          { label: "Lịch sử nghe", to: APP_PATHS.listeningHistory, icon: ClockCounterClockwise },
          { label: "Nhiệm vụ tuần", to: APP_PATHS.weeklyMissions, icon: Target },
        ]
      : []),
  ];

  const accountControl = session.data ? (
    <AccountProfile />
  ) : session.isPending ? (
    <span className="h-9 w-24 rounded-lg bg-paper-deep/20" role="status" aria-label="Đang kiểm tra tài khoản" />
  ) : (
    <Button asChild className="rounded-lg bg-vermilion px-4 font-semibold text-paper-soft hover:bg-vermilion-dark shadow-sm">
      <Link to={APP_PATHS.login} state={{ from: { pathname: location.pathname } }}>
        Đăng nhập
      </Link>
    </Button>
  );

  return (
    <header className="sticky top-0 z-40 w-full border-b border-line/80 bg-paper-soft/95 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 w-full max-w-[1248px] items-center justify-between gap-4 px-4 md:px-6">
        {/* Brand Logo */}
        <Link to={APP_PATHS.home} className="flex items-center gap-2.5 transition-transform hover:scale-[1.02]" aria-label="Sử Ký — Về trang chủ">
          <img
            src={brandLogo}
            alt="Sử Ký Việt Nam"
            className="h-9 w-auto object-contain"
          />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Điều hướng chính">
          {navLinks.map(({ label, to, icon: Icon }) => {
            const active = location.pathname === to || (to !== APP_PATHS.home && location.pathname.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-[color,background-color] duration-150",
                  active
                    ? "bg-bronze/12 text-bronze-dark"
                    : "text-ink-soft hover:bg-paper-deep/60 hover:text-ink",
                )}
              >
                <Icon size={16} weight={active ? "fill" : "regular"} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="hidden items-center gap-3 md:flex">
          {accountControl}
        </div>

        {/* Mobile Hamburger Button */}
        <Button
          variant="ghost"
          size="icon"
          className="rounded-lg text-ink md:hidden hover:bg-paper-deep"
          aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={22} /> : <List size={22} />}
        </Button>
      </div>

      {/* Mobile Drawer */}
      {menuOpen ? (
        <div className="border-t border-line bg-paper-soft px-4 py-4 md:hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <nav className="flex flex-col gap-1" aria-label="Điều hướng di động">
            {navLinks.map(({ label, to, icon: Icon }) => {
              const active = location.pathname === to || (to !== APP_PATHS.home && location.pathname.startsWith(to));
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                    active
                      ? "bg-bronze/12 text-bronze-dark"
                      : "text-ink-soft hover:bg-paper-deep/60 hover:text-ink",
                  )}
                >
                  <Icon size={18} weight={active ? "fill" : "regular"} />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-4 border-t border-line pt-3">
            {accountControl}
          </div>
        </div>
      ) : null}
    </header>
  );
}
