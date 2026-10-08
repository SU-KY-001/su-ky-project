import { List, MagnifyingGlass, X } from "@phosphor-icons/react";
import { useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import brandLogo from "@/public/brand-su-ky-viet-nam.png";
import { scrollToLandingTarget } from "../hooks/useLandingMotion";
import { useNavbarScrollAnimation } from "../hooks/useNavbarScrollAnimation";
import { useReducedMotion } from "../hooks/useReducedMotion";

const links = [
  { label: "Khám phá", target: "discover" },
  { label: "Dòng thời gian", target: "timeline" },
  { label: "Ôn tập", target: "learn" },
];

function jumpTo(target: string): void {
  scrollToLandingTarget(target);
}

export function LandingHeader() {
  const reducedMotion = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const { navbarRef, isScrolled } = useNavbarScrollAnimation(reducedMotion);

  return (
    <header data-navbar-scrolled={isScrolled ? "true" : "false"} className="sticky top-4 z-40 -mb-[76px] h-[76px] w-full overflow-visible bg-transparent">
      <div
        ref={navbarRef}
        className={cn(
          "mx-auto flex h-[76px] w-full max-w-[1248px] items-center justify-between gap-3 rounded-none border-0 bg-transparent px-4 shadow-none md:px-6",
        )}
      >
        <Button data-navbar-tone="primary" variant="ghost" className="landing-nav-hover h-auto shrink-0 gap-2 rounded-xl px-2 py-1 text-paper-soft transition-[background-color,color] duration-200 active:scale-[.98]" onClick={() => jumpTo("hero")} aria-label="Về đầu trang">
          <img
            src={brandLogo}
            alt="Sử Ký Việt Nam"
            className={cn("h-auto w-[164px] object-contain transition-[filter] duration-300 sm:w-[180px]", !isScrolled && "brightness-0 invert")}
          />
        </Button>

        <nav data-navbar-scrolled={isScrolled ? "true" : "false"} className="hidden items-center gap-1 lg:flex" aria-label="Điều hướng chính">
          {links.map((link) => (
            <Button key={link.target} data-navbar-tone="primary" variant="ghost" size="sm" className="landing-nav-hover relative rounded-xl text-paper-soft transition-[background-color,color] duration-200 after:absolute after:bottom-0 after:left-3 after:right-3 after:h-[2px] after:origin-left after:scale-x-0 after:rounded-full after:bg-current after:transition-transform after:duration-200 after:content-[''] hover:after:scale-x-100" onClick={() => jumpTo(link.target)}>
              {link.label}
            </Button>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Button data-navbar-tone="primary" variant="ghost" size="icon" className="landing-nav-hover rounded-xl text-paper-soft transition-[background-color,color] duration-200" aria-label="Mở tìm kiếm">
            <MagnifyingGlass size={19} weight="regular" />
          </Button>
          <Button asChild className="rounded-lg bg-vermilion px-4 text-paper-soft hover:bg-vermilion-dark"><Link to="/login">Đăng nhập</Link></Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          data-navbar-tone="primary"
          className="landing-nav-hover rounded-xl text-paper-soft transition-[background-color,color] duration-200 lg:hidden"
          aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((current) => !current)}
        >
          {menuOpen ? <X size={24} /> : <List size={24} />}
        </Button>
      </div>

      {menuOpen ? (
        <nav className={cn("absolute left-3 right-3 top-[72px] flex flex-col gap-1 rounded-2xl border p-3 shadow-[0_18px_48px_rgba(28,23,20,.16)] lg:hidden", isScrolled ? "border-line bg-paper-soft" : "border-white/15 bg-night/95")} aria-label="Điều hướng chính">
          {links.map((link) => (
          <Button key={link.target} variant="ghost" className={cn("justify-start px-3 py-3 transition-[background-color] duration-200", isScrolled ? "text-ink hover:bg-ink/5" : "text-paper-soft hover:bg-white/10")} onClick={() => { jumpTo(link.target); setMenuOpen(false); }}>
              {link.label}
            </Button>
          ))}
          <Button asChild className="mt-2 rounded-lg bg-vermilion px-4 py-3 text-paper-soft hover:bg-vermilion-dark">
            <Link to="/login" onClick={() => setMenuOpen(false)}>Đăng nhập</Link>
          </Button>
        </nav>
      ) : null}
    </header>
  );
}
