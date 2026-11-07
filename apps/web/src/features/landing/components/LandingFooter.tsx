import { ArrowRight } from "@phosphor-icons/react/dist/icons/ArrowRight";
import { ArrowUp } from "@phosphor-icons/react/dist/icons/ArrowUp";
import type { ReactElement } from "react";
import { Link, useNavigate } from "react-router";
import brandLogo from "@/public/brand-su-ky-viet-nam.png";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Separator } from "@/shared/components/ui/separator";
import { scrollToLandingTarget } from "../hooks/useLandingMotion";
import { landingLinks } from "../navigation";

export function LandingFooter(): ReactElement {
  const navigate = useNavigate();
  function jumpTo(target: string): void {
    if (document.getElementById(target)) scrollToLandingTarget(target);
    else navigate(`/#${target}`);
  }
  return (
    <footer id="signup" aria-label="Chân trang Sử Ký" className="bg-paper-footer text-foreground">
      <div className="mx-auto max-w-[1280px] px-5 pb-6 pt-12 md:px-7 md:pt-16">
        <div className="grid gap-10 pb-10 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr] lg:gap-16">
          <div className="flex flex-col items-start gap-5 sm:col-span-2 lg:col-span-1">
            <Button variant="ghost" className="h-auto p-0 hover:bg-transparent" onClick={() => jumpTo("hero")} aria-label="Sử Ký Việt Nam — về đầu trang">
              <img src={brandLogo} alt="Sử Ký Việt Nam" className="h-auto w-44" />
            </Button>
            <Badge variant="outline">Podcast lịch sử Việt Nam</Badge>
            <p className="max-w-sm text-sm leading-7 text-muted-foreground">
              Kết nối với quá khứ qua từng câu chuyện. Khám phá những con người, sự kiện và dấu mốc đã làm nên lịch sử Việt Nam.
            </p>
          </div>

          <nav aria-labelledby="footer-discover-heading" className="flex flex-col items-start gap-4">
            <h2 id="footer-discover-heading" className="text-sm font-semibold">Khám phá Sử Ký</h2>
            <ul className="flex flex-col items-start gap-1">
              {landingLinks.map(({ label, target }) => (
                <li key={target}>
                  <Button variant="link" className="h-auto justify-start whitespace-normal px-0 py-2 text-left text-muted-foreground" onClick={() => jumpTo(target)}>
                    {label}
                  </Button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex flex-col items-start gap-4">
            <h2 className="text-sm font-semibold">Lắng nghe. Khám phá. Ghi nhớ.</h2>
            <p className="max-w-sm text-sm leading-7 text-muted-foreground">
              Chọn một tập podcast bạn yêu thích và bắt đầu hành trình tìm hiểu lịch sử theo nhịp của riêng mình.
            </p>
            <Button onClick={() => jumpTo("library-podcasts")}>
              Khám phá podcast <ArrowRight aria-hidden="true" />
            </Button>
            <Button asChild variant="link" className="h-auto whitespace-normal px-0 text-left">
              <Link to="/login">Đăng nhập để lưu hành trình nghe</Link>
            </Button>
          </div>
        </div>

        <Separator />

        <div className="flex flex-col items-start justify-between gap-4 pt-5 sm:flex-row sm:items-center">
          <p className="text-xs leading-6 text-muted-foreground">© {new Date().getFullYear()} Sử Ký Việt Nam. Mỗi câu chuyện, một góc nhìn lịch sử.</p>
          <Button variant="ghost" size="sm" onClick={() => jumpTo("hero")}>
            Về đầu trang <ArrowUp aria-hidden="true" />
          </Button>
        </div>
      </div>
    </footer>
  );
}
