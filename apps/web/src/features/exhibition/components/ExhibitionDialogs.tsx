import { ArrowRight } from "@phosphor-icons/react/dist/icons/ArrowRight";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/icons/ArrowSquareOut";
import { MapTrifold } from "@phosphor-icons/react/dist/icons/MapTrifold";
import { Headphones } from "@phosphor-icons/react/dist/icons/Headphones";
import { Play } from "@phosphor-icons/react/dist/icons/Play";
import { useState, type ReactElement } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { AudioPlayback } from "@/features/landing";
import { useCurrentUser } from "@/shared/hooks/useCurrentUser";
import { exhibitionTemplate, type ResolvedExhibition } from "@repo/shared";
import { walls, type Artwork } from "../data";
import brandLogo from "@/public/brand-su-ky-viet-nam.png";

function FloorPlan({ chapter, chapterList }: { chapter: number; chapterList: { title: string; period: string }[] }): ReactElement {
  return <svg viewBox={`-8 ${6 - chapterList.length * 16} 16 ${chapterList.length * 16 + 4}`} role="img" aria-label={`Sơ đồ ${chapterList.length} phòng. Phòng đã chọn: ${chapterList[chapter]?.title}.`} className="exhibition-plan h-56 w-full text-bronze">
    <g>
      {exhibitionTemplate.floorAreas.slice(0, chapterList.length).map((area, index) => <rect key={area.z} x={area.x - area.width / 2} y={area.z - area.depth / 2} width={area.width} height={area.depth} fill={chapter === index ? "var(--color-paper-deep)" : "var(--color-paper)"} />)}
      {walls.map((wall, index) => <line key={index} x1={wall.a[0]} y1={Math.max(wall.a[1], chapterList.length === 1 ? -8 : chapterList.length === 2 ? -24 : -40)} x2={wall.b[0]} y2={Math.max(wall.b[1], chapterList.length === 1 ? -8 : chapterList.length === 2 ? -24 : -40)} stroke="currentColor" strokeWidth="0.25" />)}
      {exhibitionTemplate.floorAreas.slice(0, chapterList.length).map((area, index) => <circle key={area.z} cx={area.x} cy={area.z} r={chapter === index ? 0.9 : 0.45} fill={chapter === index ? "var(--color-vermilion)" : "var(--color-bronze)"} />)}
    </g>
  </svg>;
}

export function ExhibitionMenu({ open, chapter, available, onClose, onTravel, onInspect, onReturnFocus, chapterList, items }: {
  open: boolean; chapter: number; available: boolean; onClose: () => void; onTravel: (index: number) => void; onInspect: (id: string) => void; onReturnFocus?: () => void; chapterList: { title: string; period: string }[]; items: Artwork[];
}): ReactElement {
  return <Dialog open={open} onOpenChange={value => { if (!value) onClose(); }}>
    <DialogContent className="exhibition-dialog exhibition-menu max-w-[720px]" onCloseAutoFocus={event => {
      event.preventDefault();
      queueMicrotask(() => { if (!document.querySelector('[role="dialog"]')) onReturnFocus?.(); });
    }}>
      <div className="exhibition-menu-heading flex flex-wrap items-center justify-between gap-4 pr-8"><img src={brandLogo} alt="Sử Ký Việt Nam" className="h-auto w-36" /><span className="flex items-center gap-2 text-xs text-bronze-dark"><MapTrifold size={18} /><span>Bản đồ triển lãm</span></span></div>
      <DialogTitle className="exhibition-dialog-title">Hành trình triển lãm</DialogTitle>
      <DialogDescription className="exhibition-dialog-description">Chọn một phòng để bắt đầu khám phá, hoặc mở ảnh tư liệu để đọc câu chuyện và nguồn trích dẫn.</DialogDescription>
      {!available && <p role="status" className="rounded-lg border border-line bg-paper-deep/50 p-4 text-sm leading-6 text-ink-soft">Chưa mở được không gian 3D. Bạn vẫn có thể xem ảnh và nguồn tư liệu bên dưới.</p>}
      <div className="exhibition-menu-grid my-2 grid grid-cols-[120px_minmax(0,1fr)] items-center gap-6 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-8">
        <div className="rounded-xl bg-paper-deep/40 px-3 py-5"><FloorPlan chapter={chapter} chapterList={chapterList} /><p className="mt-4 text-center text-xs text-ink-soft">{chapterList.length} phòng trưng bày</p></div>
        <div className="exhibition-chapters">
          {chapterList.map((item, index) => <button key={index} type="button" disabled={!available} className="exhibition-chapter-link flex w-full items-center gap-[17px] border-b border-[var(--exhibit-line)] py-[19px] text-left" onClick={() => onTravel(index)} aria-current={chapter === index ? "location" : undefined}>
            <span className="exhibition-chapter-number text-[11px] text-[var(--exhibit-muted)]">0{index + 1}</span><span className="min-w-0"><strong>{item.title}</strong><small>{item.period}</small></span><ArrowRight size={20} />
          </button>)}
        </div>
      </div>
      <div className="exhibition-instructions border-y border-[var(--exhibit-line)] py-4 text-[10px] leading-[2.7] text-[var(--exhibit-muted)]"><p><kbd>W A S D</kbd> / <kbd>↑ ← ↓ →</kbd> Di chuyển <span>Chuột để nhìn</span></p><p><kbd>E</kbd> Xem ảnh gần <kbd>M</kbd> Mục lục <kbd>Esc</kbd> Tạm dừng <span><kbd>Q</kbd> / <kbd>R</kbd> Xoay bằng bàn phím</span></p><p className="exhibition-touch-instruction hidden">Trên màn hình cảm ứng: kéo để nhìn, giữ nút mũi tên để đi.</p></div>
      <details className="exhibition-catalog text-xs" open={!available}>
        <summary>Danh mục {items.length} ảnh tư liệu và nguồn ảnh</summary>
        <div>{items.map((artwork, index) => <button type="button" key={artwork.id} onClick={() => onInspect(artwork.id)}><span>{String(index + 1).padStart(2, "0")}</span><strong>{artwork.title}</strong><ArrowRight size={16} /></button>)}</div>
      </details>
    </DialogContent>
  </Dialog>;
}

export function ArtworkDetail({ artwork, narration, onPlayingChange, onClose, onReturnFocus }: { artwork: Artwork | undefined; narration?: ResolvedExhibition["items"][number]["narration"]; onPlayingChange?: (playing: boolean) => void; onClose: () => void; onReturnFocus?: () => void }): ReactElement {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const session = useCurrentUser();
  const [openPlayer, setOpenPlayer] = useState(false);
  return <Dialog open={Boolean(artwork)} onOpenChange={value => { if (!value) onClose(); }}>
    <DialogContent className="exhibition-dialog exhibition-artwork-dialog" data-orientation={artwork && artwork.aspect < 1 ? "portrait" : "landscape"} onCloseAutoFocus={event => {
      event.preventDefault();
      queueMicrotask(() => { if (!document.querySelector('[role="dialog"]')) onReturnFocus?.(); });
    }}>
      {artwork && <>
        <div className="exhibition-detail-image">
          {failedImage === artwork.id ? <p role="status">Không tải được ảnh. Bạn có thể xem tại nguồn tư liệu bên dưới.</p> : <img src={artwork.image} alt={artwork.description || artwork.title} decoding="async" onError={() => setFailedImage(artwork.id)} />}
        </div>
        <div className="exhibition-detail-copy">
          <DialogTitle className="exhibition-dialog-title text-[28px] font-medium leading-[1.35] tracking-[-.04em] text-[var(--exhibit-ink)]">{artwork.title}</DialogTitle>
          <p className="exhibition-detail-date mt-2 text-sm text-[var(--exhibit-muted)]">{artwork.date}</p>
          <DialogDescription className="exhibition-dialog-description text-[13px] leading-[1.9] text-[var(--exhibit-muted)]">{artwork.description}</DialogDescription>
          <div className="exhibition-credit mt-7 flex flex-col gap-2.5 text-[11px]">{artwork.credit && <strong>Ảnh: {artwork.credit}</strong>}{artwork.sourceUrl && <a href={artwork.sourceUrl} target="_blank" rel="noreferrer">Xem nguồn <ArrowSquareOut size={15} /></a>}</div>
          {artwork.rights && <details className="exhibition-rights mt-[22px] border-t border-[var(--exhibit-line)] pt-2 text-[10px] leading-[1.9] text-[var(--exhibit-muted)]"><summary>Quyền sử dụng hình ảnh</summary><p>{artwork.rights}</p><p>Ảnh giữ nguyên màu sắc, tỉ lệ và dấu bản quyền của file được cung cấp.</p></details>}
          {narration && <section className="mt-6 rounded-lg border border-[var(--exhibit-line)]/40 bg-[var(--exhibit-soft)]/35 p-4"><p className="flex items-center gap-3 text-xs font-semibold"><Headphones size={22} /> PODCAST LIÊN QUAN</p><h3 className="mt-4 text-lg font-bold">{narration.episodeTitle}</h3><p className="mt-1 text-sm text-[var(--exhibit-muted)]">Bản thu: {narration.narrationLabel}</p>{!narration.available ? <p className="mt-4 text-sm">Bản thu hiện không khả dụng.</p> : !session.data ? <p className="mt-4 text-sm">Đăng nhập để nghe podcast.</p> : openPlayer ? <AudioPlayback narrationId={narration.id} userId={session.data.id} appearance="exhibition" autoPlayOnReady onPlayingChange={onPlayingChange} /> : <button type="button" className="mt-5 flex items-center gap-4 text-left text-sm font-semibold" onClick={() => setOpenPlayer(true)}><span className="grid size-14 place-items-center rounded-full bg-vermilion text-white"><Play size={22} weight="fill" /></span>Nghe podcast</button>}</section>}
          <Button className="exhibition-return" onClick={onClose}>Trở lại phòng tranh <ArrowRight size={17} /></Button>
        </div>
      </>}
    </DialogContent>
  </Dialog>;
}
