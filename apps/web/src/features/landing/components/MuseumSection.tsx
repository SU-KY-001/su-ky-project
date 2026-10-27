import type { ReactElement } from "react";
import { Link } from "react-router";
import { ArrowRight } from "@phosphor-icons/react/dist/icons/ArrowRight";
import { Button } from "@/shared/components/ui/button";
import museumPhoto from "@/public/30-4-1975/vna-potal-48-nam-ngay-giai-phong-hoan-toan-mien-nam-thong-nhat-dat-nuoc-3041975-3042023-trang-su-hao-hung-tren-con-duong-dung-nuoc-va-giu-nuoc-669855518-9-57-50.jpg";
import { LibrarySection } from "./library/LibraryPrimitives";

export function MuseumSection(): ReactElement {
  return <LibrarySection id="history-museum" title="Khám phá bảo tàng lịch sử">
    <div className="grid items-center gap-7 lg:grid-cols-[1.15fr_1fr] lg:gap-12">
      <figure className="min-w-0">
        <img src={museumPhoto} alt="Xe tăng quân giải phóng vượt cổng Dinh Độc Lập ngày 30 tháng 4 năm 1975." loading="lazy" decoding="async" width={850} height={595} className="aspect-[850/595] w-full rounded-lg object-contain" />
        <figcaption className="mt-3 text-xs leading-6 text-ink-soft">Ảnh: Mai Hưởng / TTXVN</figcaption>
      </figure>
      <div className="flex flex-col items-start">
        <p className="text-sm text-bronze-dark">Triển lãm ảnh 3D · 1975</p>
        <h3 className="mt-4 text-2xl font-semibold leading-tight tracking-tight text-ink sm:text-3xl">Khoảnh khắc toàn thắng</h3>
        <p className="mt-4 max-w-md text-sm leading-7 text-ink-soft">Bước vào phòng tranh, đến gần từng bức ảnh và khám phá câu chuyện giải phóng miền Nam qua ba chương tư liệu.</p>
        <Button asChild className="mt-7"><Link to="/trien-lam-1975">Tham quan bảo tàng <ArrowRight aria-hidden="true" /></Link></Button>
      </div>
    </div>
  </LibrarySection>;
}
