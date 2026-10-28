import { ArrowRight } from "@phosphor-icons/react/dist/icons/ArrowRight";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/icons/ArrowSquareOut";
import { MapTrifold } from "@phosphor-icons/react/dist/icons/MapTrifold";
import { useState, type ReactElement } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { artworks, chapters, walls, type Artwork } from "../data";

function FloorPlan({ chapter }: { chapter: number }): ReactElement {
  return <svg viewBox="-8 -26 32 40" role="img" aria-label={`Sơ đồ ba phòng. Bạn đang ở ${chapters[chapter]?.title}.`} className="exhibition-plan max-h-60 w-full text-[var(--exhibit-ink)]">
    <g transform="translate(0 -12) scale(1 -1)">
      <path d="M-6-8H6V4H22V-24H12L10-22V-8H6V12H-6Z" fill="var(--exhibit-soft)" />
      {walls.map((wall, index) => <line key={index} x1={wall.a[0]} y1={wall.a[1]} x2={wall.b[0]} y2={wall.b[1]} stroke="currentColor" strokeWidth="0.25" />)}
      {chapters.map((item, index) => <circle key={item.title} cx={index === 0 ? 0 : 16} cy={index === 0 ? 2 : index === 1 ? -2 : -16} r={chapter === index ? 0.9 : 0.45} fill={chapter === index ? "var(--exhibit-ink)" : "var(--exhibit-muted)"} />)}
    </g>
  </svg>;
}

export function ExhibitionMenu({ open, chapter, available, onClose, onTravel, onInspect, onReturnFocus }: {
  open: boolean; chapter: number; available: boolean; onClose: () => void; onTravel: (index: number) => void; onInspect: (id: string) => void; onReturnFocus?: () => void;
}): ReactElement {
  return <Dialog open={open} onOpenChange={value => { if (!value) onClose(); }}>
    <DialogContent className="exhibition-dialog exhibition-menu max-w-[720px]" onCloseAutoFocus={event => {
      event.preventDefault();
      queueMicrotask(() => onReturnFocus?.());
    }}>
      <div className="exhibition-menu max-w-[720px]-heading mb-3 flex items-center gap-3 text-[9px] tracking-[.15em]"><MapTrifold size={24} weight="light" /><span>THAM QUAN TRIỂN LÃM</span></div>
      <DialogTitle className="exhibition-dialog-title text-[28px] font-medium leading-[1.35] tracking-[-.04em] text-[var(--exhibit-ink)]">Một hành trình, ba chương.</DialogTitle>
      <DialogDescription className="exhibition-dialog-description text-[13px] leading-[1.9] text-[var(--exhibit-muted)]">Chọn một phòng để bước tiếp, hoặc mở một tác phẩm để đọc kỹ hơn.</DialogDescription>
      <div className="exhibition-menu max-w-[720px]-grid my-3 grid grid-cols-[160px_1fr] items-center gap-8">
        <FloorPlan chapter={chapter} />
        <div className="exhibition-chapters">
          {chapters.map((item, index) => <button key={item.title} type="button" disabled={!available} className="exhibition-chapter-link flex w-full items-center gap-[17px] border-b border-[var(--exhibit-line)] py-[19px] text-left" onClick={() => onTravel(index)} aria-current={chapter === index ? "location" : undefined}>
            <span className="exhibition-chapter-number text-[11px] text-[var(--exhibit-muted)]">0{index + 1}</span><span><strong>{item.title}</strong><small>{item.period}</small></span><ArrowRight size={20} />
          </button>)}
        </div>
      </div>
      <div className="exhibition-instructions border-y border-[var(--exhibit-line)] py-4 text-[10px] leading-[2.7] text-[var(--exhibit-muted)]"><p><kbd>W A S D</kbd> / <kbd>↑ ← ↓ →</kbd> Di chuyển <span>Chuột để nhìn</span></p><p><kbd>E</kbd> Xem ảnh gần <kbd>M</kbd> Mục lục <kbd>Esc</kbd> Tạm dừng <span><kbd>Q</kbd> / <kbd>R</kbd> Xoay bằng bàn phím</span></p><p className="exhibition-touch-instruction hidden">Trên màn hình cảm ứng: kéo để nhìn, giữ nút mũi tên để đi.</p></div>
      <details className="exhibition-catalog text-xs" open={!available}>
        <summary>Danh mục {artworks.length} ảnh tư liệu và nguồn ảnh</summary>
        <div>{artworks.map((artwork, index) => <button type="button" key={artwork.id} onClick={() => onInspect(artwork.id)}><span>{String(index + 1).padStart(2, "0")}</span><strong>{artwork.title}</strong><ArrowRight size={16} /></button>)}</div>
      </details>
    </DialogContent>
  </Dialog>;
}

export function ArtworkDetail({ artwork, onClose, onReturnFocus }: { artwork: Artwork | undefined; onClose: () => void; onReturnFocus?: () => void }): ReactElement {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  return <Dialog open={Boolean(artwork)} onOpenChange={value => { if (!value) onClose(); }}>
    <DialogContent className="exhibition-dialog exhibition-artwork-dialog grid max-w-[1140px] grid-cols-[minmax(0,1.6fr)_minmax(250px,1fr)] gap-[34px] p-8" onCloseAutoFocus={event => {
      event.preventDefault();
      queueMicrotask(() => onReturnFocus?.());
    }}>
      {artwork && <>
        <div className="exhibition-detail-image flex min-h-[300px] items-center justify-center bg-[var(--exhibit-soft)]">
          {failedImage === artwork.id ? <p>Không tải được ảnh. Bạn có thể xem tại nguồn tư liệu bên dưới.</p> : <img src={artwork.image} alt={artwork.description} onError={() => setFailedImage(artwork.id)} />}
        </div>
        <div className="exhibition-detail-copy self-center py-[30px]">
          <p className="exhibition-detail-date mb-[15px] text-[11px] text-[var(--exhibit-muted)]">{artwork.date}</p>
          <DialogTitle className="exhibition-dialog-title text-[28px] font-medium leading-[1.35] tracking-[-.04em] text-[var(--exhibit-ink)]">{artwork.title}</DialogTitle>
          <DialogDescription className="exhibition-dialog-description text-[13px] leading-[1.9] text-[var(--exhibit-muted)]">{artwork.description}</DialogDescription>
          <div className="exhibition-credit mt-7 flex flex-col gap-2.5 text-[11px]"><strong>Ảnh: {artwork.credit}</strong><a href={artwork.sourceUrl} target="_blank" rel="noreferrer">Xem nguồn TTXVN <ArrowSquareOut size={15} /></a></div>
          <details className="exhibition-rights mt-[22px] border-t border-[var(--exhibit-line)] pt-2 text-[10px] leading-[1.9] text-[var(--exhibit-muted)]"><summary>Quyền sử dụng hình ảnh</summary><p>{artwork.rights}</p><p>Ảnh giữ nguyên màu sắc, tỉ lệ và dấu bản quyền của file được cung cấp.</p></details>
          <Button variant="outline" className="exhibition-secondary" onClick={onClose}>Trở lại phòng tranh <ArrowRight size={17} /></Button>
        </div>
      </>}
    </DialogContent>
  </Dialog>;
}
