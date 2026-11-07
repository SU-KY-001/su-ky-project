import type { ReactElement } from "react";
import brandLogo from "@/public/brand-su-ky-viet-nam.png";

export function LandingLoader(): ReactElement {
  return (
    <div className="flex w-full max-w-[360px] flex-col items-center gap-4 text-center" role="status" aria-live="polite" aria-atomic="true">
      <img src={brandLogo} width={220} height={110} alt="Sử Ký - Podcast lịch sử Việt Nam" fetchPriority="high" className="h-[110px] w-[220px] max-w-full object-contain" />
      <p className="text-lg font-bold leading-snug text-ink">Đang mở Sử Ký</p>
      <p className="text-sm leading-relaxed text-ink-soft">Đang chuẩn bị không gian nghe lịch sử Việt Nam.</p>
      <span className="landing-loader-track relative h-[3px] w-[132px] overflow-hidden rounded-full bg-paper-deep" aria-hidden="true" />
    </div>
  );
}
