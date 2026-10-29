import type { ReactElement } from "react";
import { ArrowRight } from "@phosphor-icons/react/dist/icons/ArrowRight";
import { BookOpen } from "@phosphor-icons/react/dist/icons/BookOpen";
import { Image } from "@phosphor-icons/react/dist/icons/Image";
import { MouseSimple } from "@phosphor-icons/react/dist/icons/MouseSimple";
import { Button } from "@/shared/components/ui/button";
import brandLogo from "@/public/brand-su-ky-viet-nam.png";

export function ExhibitionEntrance({ title, subtitle, description, artworkCount, chapterCount, ready, available, onEnter }: {
  title: string;
  subtitle: string;
  description: string;
  artworkCount: number;
  chapterCount: number;
  ready: boolean;
  available: boolean;
  onEnter: () => void;
}): ReactElement {
  const words = title.trim().split(/\s+/);
  const split = words.length > 2 ? Math.ceil(words.length / 2) : words.length;
  const leading = words.slice(0, split).join(" ");
  const accent = words.slice(split).join(" ");
  return <section className="exhibition-entrance" aria-label="Giới thiệu triển lãm">
    <div className="exhibition-cover-panel">
      <header className="exhibition-cover-brand"><img src={brandLogo} alt="Sử Ký Việt Nam" /><span>Không gian tư liệu</span></header>
      <div className="exhibition-cover-copy">
        <p className="exhibition-cover-eyebrow">Triển lãm 3D <span aria-hidden="true" /> Ảnh tư liệu</p>
        <h1 aria-label={title}>{leading}{accent && <> <span className="exhibition-cover-title-accent">{accent}</span></>}</h1>
        {subtitle && <p className="exhibition-cover-subtitle">{subtitle}</p>}
        {description && <p className="exhibition-cover-description">{description}</p>}
        <Button onClick={onEnter} disabled={!ready} className="exhibition-cover-enter">Bước vào triển lãm <ArrowRight size={20} aria-hidden="true" /></Button>
        {!ready && <p role="status" className="exhibition-cover-message">Đang chuẩn bị không gian…</p>}
        {!available && <p className="exhibition-cover-message">Thiết bị không hỗ trợ 3D. Bạn vẫn có thể xem ảnh và đọc câu chuyện.</p>}
      </div>
      <footer className="exhibition-cover-meta"><span><Image size={19} aria-hidden="true" /> {artworkCount} ảnh tư liệu</span><span><BookOpen size={19} aria-hidden="true" /> {chapterCount} chương</span></footer>
    </div>
    <div className="exhibition-cover-controls" aria-hidden="true"><MouseSimple size={17} /> Chuột để nhìn <span>·</span> WASD để di chuyển</div>
  </section>;
}
