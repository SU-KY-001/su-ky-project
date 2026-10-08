import { ArrowClockwise, WifiSlash } from "@phosphor-icons/react";
import { Button } from "../components/ui/button";

export function RouteErrorFallback() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-paper px-5 py-10 text-center" role="alert">
      <div className="grid size-16 place-items-center rounded-full bg-paper-deep text-ink-soft">
        <WifiSlash size={28} aria-hidden="true" />
      </div>
      <div className="flex max-w-[420px] flex-col items-center gap-2">
        <h1 className="font-serif text-3xl font-bold text-ink">Chưa tải được trang</h1>
        <p className="text-base leading-7 text-ink-soft">
          Kết nối có thể đã bị gián đoạn. Bạn có thể thử tải lại trang.
        </p>
      </div>
      <Button className="rounded-full bg-vermilion px-5 text-paper-soft hover:bg-vermilion-dark" onClick={() => window.location.reload()}>
        <ArrowClockwise size={18} aria-hidden="true" />
        Thử tải lại
      </Button>
    </main>
  );
}
