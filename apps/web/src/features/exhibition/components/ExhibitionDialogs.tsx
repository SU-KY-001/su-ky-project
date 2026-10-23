import { ArrowRight, ArrowSquareOut, MapTrifold } from "@phosphor-icons/react";
import { useState, type ReactElement } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { artworks, chapters, walls, type Artwork } from "../data";

function FloorPlan({ chapter }: { chapter: number }): ReactElement {
  return <svg viewBox="-8 -26 32 40" role="img" aria-label={`Sơ đồ ba phòng. Bạn đang ở ${chapters[chapter]?.title}.`} className="exhibition-plan">
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
    <DialogContent className="exhibition-dialog exhibition-menu" onCloseAutoFocus={event => {
      event.preventDefault();
      queueMicrotask(() => onReturnFocus?.());
    }}>
      <div className="exhibition-menu-heading"><MapTrifold size={24} weight="light" /><span>THAM QUAN TRIỂN LÃM</span></div>
      <DialogTitle className="exhibition-dialog-title">Một hành trình, ba chương.</DialogTitle>
      <DialogDescription className="exhibition-dialog-description">Chọn một phòng để bước tiếp, hoặc mở một tác phẩm để đọc kỹ hơn.</DialogDescription>
      <div className="exhibition-menu-grid">
        <FloorPlan chapter={chapter} />
        <div className="exhibition-chapters">
          {chapters.map((item, index) => <button key={item.title} type="button" disabled={!available} className="exhibition-chapter-link" onClick={() => onTravel(index)} aria-current={chapter === index ? "location" : undefined}>
            <span className="exhibition-chapter-number">0{index + 1}</span><span><strong>{item.title}</strong><small>{item.period}</small></span><ArrowRight size={20} />
          </button>)}
        </div>
      </div>
      <div className="exhibition-instructions"><p><kbd>W A S D</kbd> / <kbd>↑ ← ↓ →</kbd> Di chuyển <span>Chuột để nhìn</span></p><p><kbd>E</kbd> Xem ảnh gần <kbd>M</kbd> Mục lục <kbd>Esc</kbd> Tạm dừng <span><kbd>Q</kbd> / <kbd>R</kbd> Xoay bằng bàn phím</span></p><p className="exhibition-touch-instruction">Trên màn hình cảm ứng: kéo để nhìn, giữ nút mũi tên để đi.</p></div>
      <details className="exhibition-catalog" open={!available}>
        <summary>Danh mục {artworks.length} ảnh tư liệu và nguồn ảnh</summary>
        <div>{artworks.map((artwork, index) => <button type="button" key={artwork.id} onClick={() => onInspect(artwork.id)}><span>{String(index + 1).padStart(2, "0")}</span><strong>{artwork.title}</strong><ArrowRight size={16} /></button>)}</div>
      </details>
    </DialogContent>
  </Dialog>;
}

export function ArtworkDetail({ artwork, onClose, onReturnFocus }: { artwork: Artwork | undefined; onClose: () => void; onReturnFocus?: () => void }): ReactElement {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  return <Dialog open={Boolean(artwork)} onOpenChange={value => { if (!value) onClose(); }}>
    <DialogContent className="exhibition-dialog exhibition-artwork-dialog" onCloseAutoFocus={event => {
      event.preventDefault();
      queueMicrotask(() => onReturnFocus?.());
    }}>
      {artwork && <>
        <div className="exhibition-detail-image">
          {failedImage === artwork.id ? <p>Không tải được ảnh. Bạn có thể xem tại nguồn tư liệu bên dưới.</p> : <img src={artwork.image} alt={artwork.description} onError={() => setFailedImage(artwork.id)} />}
        </div>
        <div className="exhibition-detail-copy">
          <p className="exhibition-detail-date">{artwork.date}</p>
          <DialogTitle className="exhibition-dialog-title">{artwork.title}</DialogTitle>
          <DialogDescription className="exhibition-dialog-description">{artwork.description}</DialogDescription>
          <div className="exhibition-credit"><strong>Ảnh: {artwork.credit}</strong><a href={artwork.sourceUrl} target="_blank" rel="noreferrer">Xem nguồn TTXVN <ArrowSquareOut size={15} /></a></div>
          <details className="exhibition-rights"><summary>Quyền sử dụng hình ảnh</summary><p>{artwork.rights}</p><p>Ảnh giữ nguyên màu sắc, tỉ lệ và dấu bản quyền của file được cung cấp.</p></details>
          <Button variant="outline" className="exhibition-secondary" onClick={onClose}>Trở lại phòng tranh <ArrowRight size={17} /></Button>
        </div>
      </>}
    </DialogContent>
  </Dialog>;
}
