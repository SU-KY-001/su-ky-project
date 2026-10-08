import { List, MagnifyingGlass, X } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { scrollToLandingTarget } from "../hooks/useLandingMotion";
import { useStickyHeader } from "../hooks/useStickyHeader";

const links = [
  { label: "Khám phá", target: "discover" },
  { label: "Dòng thời gian", target: "timeline" },
  { label: "Ôn tập", target: "learn" },
];

function jumpTo(target: string): void {
  scrollToLandingTarget(target);
}

export function LandingHeader() {
  const { headerRef } = useStickyHeader();
  const reducedMotion = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 -mb-[94px] h-[94px] w-full overflow-visible">
      <div
        ref={headerRef}
        className="mx-auto flex h-14 w-[calc(100%_-_32px)] max-w-[1328px] items-center justify-between gap-3 rounded-[20px] border border-white/15 bg-night/45 px-4 shadow-[0_8px_24px_rgba(20,17,15,.12)] backdrop-blur-md transition-[height,border-radius,background-color,box-shadow] md:px-6"
      >
        <Button variant="ghost" className="h-auto gap-2 px-0 text-paper-soft hover:bg-transparent hover:text-white active:scale-[.98]" onClick={() => jumpTo("hero")} aria-label="Về đầu trang">
          <span className="grid size-9 rotate-[-2deg] place-items-center rounded border border-bronze bg-vermilion font-serif text-lg font-bold text-paper-soft">Sử</span>
          <span className="flex flex-col items-start leading-tight">
            <span className="font-serif text-lg font-bold tracking-tight">Sử Ký</span>
            <span className="max-w-40 truncate text-[10px] text-paper-deep">Podcast lịch sử Việt Nam</span>
          </span>
        </Button>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Điều hướng chính">
          {links.map((link) => (
            <Button key={link.target} variant="ghost" size="sm" className="rounded-full text-paper-soft hover:bg-white/10 hover:text-white" onClick={() => jumpTo(link.target)}>
              {link.label}
            </Button>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" size="icon" className="rounded-full text-paper-soft hover:bg-white/10 hover:text-white" aria-label="Mở tìm kiếm">
            <MagnifyingGlass size={19} weight="regular" />
          </Button>
          <Button className="rounded-full bg-vermilion px-4 text-paper-soft hover:bg-vermilion-dark" onClick={() => jumpTo("signup")}>Đăng nhập</Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="rounded-full text-paper-soft hover:bg-white/10 hover:text-white md:hidden"
          aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((current) => !current)}
        >
          {menuOpen ? <X size={24} /> : <List size={24} />}
        </Button>
      </div>

      {menuOpen ? (
        <nav className={cn("absolute left-4 right-4 top-[66px] flex flex-col gap-1 rounded-xl border border-white/15 bg-night p-3 shadow-[0_18px_48px_rgba(20,17,15,.2)] md:hidden", reducedMotion ? "transition-none" : "transition-opacity duration-200")} aria-label="Điều hướng chính">
          {links.map((link) => (
            <Button key={link.target} variant="ghost" className="justify-start px-3 py-3 text-paper-soft hover:bg-white/10 hover:text-white" onClick={() => { jumpTo(link.target); setMenuOpen(false); }}>
              {link.label}
            </Button>
          ))}
          <Button className="mt-2 rounded-full bg-vermilion px-4 py-3 text-paper-soft hover:bg-vermilion-dark" onClick={() => { jumpTo("signup"); setMenuOpen(false); }}>
            Đăng nhập
          </Button>
        </nav>
      ) : null}
    </header>
  );
}
