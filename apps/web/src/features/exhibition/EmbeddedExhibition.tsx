import { Component, Suspense, useCallback, useEffect, useRef, useState, type ReactElement, type ReactNode } from "react";
import type { ResolvedExhibition } from "@repo/shared";
import { Button } from "@/shared/components/ui/button";
import { GalleryScene } from "./components/GalleryScene";
import { initialView, type GalleryInput } from "./components/GalleryControls";
import { resolvedArtworks } from "./resolvedLayout";

class EmbeddedBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } { return { failed: true }; }
  componentDidCatch(): void { this.props.onError(); }
  render(): ReactNode { return this.state.failed ? null : this.props.children; }
}

const ignore = (): void => {};

export function EmbeddedExhibition({ exhibition }: { exhibition: ResolvedExhibition }): ReactElement {
  const container = useRef<HTMLDivElement>(null);
  const input = useRef<GalleryInput>({ keys: new Set() });
  const [available, setAvailable] = useState(true);
  const [chapter, setChapter] = useState(0);
  const [visible, setVisible] = useState(false);
  const unavailable = useCallback((): void => { setAvailable(false); input.current.keys.clear(); }, []);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new IntersectionObserver(entries => setVisible(entries.some(entry => entry.isIntersecting)));
    observer.observe(element);
    return () => { observer.disconnect(); input.current.keys.clear(); };
  }, []);
  return <div ref={container} className="relative h-full bg-paper-deep" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) input.current.keys.clear(); }}>
    {available ? <EmbeddedBoundary onError={unavailable}><Suspense fallback={<p role="status" className="p-6 text-sm text-ink-soft">Đang dựng không gian 3D…</p>}>
      <GalleryScene active={visible} keyboardRequiresFocus input={input} view={initialView} items={resolvedArtworks(exhibition)} chapterText={exhibition.chapters} onPause={() => { input.current.keys.clear(); }} onNavigate={ignore} onInspect={ignore} onTarget={ignore} onChapter={setChapter} onUnavailable={unavailable} />
    </Suspense></EmbeddedBoundary> : <p role="status" className="grid h-full place-content-center p-6 text-center text-sm leading-7 text-ink-soft">Không gian 3D hiện không khả dụng.<br />Chọn “Bắt đầu tham quan” để đọc nội dung triển lãm.</p>}
    {available && <>
      <p className="pointer-events-none absolute left-3 top-3 max-w-[calc(100%-5rem)] rounded-md bg-night/85 px-3 py-2 text-sm text-paper">{exhibition.chapters[chapter]?.title}</p>
      {typeof document !== "undefined" && document.fullscreenEnabled && <Button type="button" variant="secondary" size="sm" className="absolute right-3 top-3" aria-label="Phóng toàn màn hình không gian 3D" onClick={() => { const element = container.current; if (!element) return; void (document.fullscreenElement ? document.exitFullscreen() : element.requestFullscreen()).catch(() => undefined); }}>⛶</Button>}
      <p className="pointer-events-none absolute bottom-3 left-3 right-3 rounded-md bg-night/85 px-3 py-2 text-xs leading-6 text-paper sm:right-auto">Kéo để nhìn · WASD hoặc phím mũi tên để di chuyển<span className="hidden sm:inline"> · Q / R để xoay</span></p>
      <div className="absolute bottom-20 left-3 hidden grid-cols-3 gap-1 [@media(pointer:coarse)]:grid" aria-label="Di chuyển trong triển lãm">
        {([{ key: "KeyW", label: "Đi tới", text: "↑", position: "col-start-2" }, { key: "KeyA", label: "Sang trái", text: "←", position: "col-start-1 row-start-2" }, { key: "KeyS", label: "Lùi lại", text: "↓", position: "row-start-2" }, { key: "KeyD", label: "Sang phải", text: "→", position: "row-start-2" }]).map(item => <Button key={item.key} type="button" variant="secondary" className={`size-11 touch-none ${item.position}`} aria-label={item.label} onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); input.current.keys.add(item.key); }} onPointerUp={() => input.current.keys.delete(item.key)} onPointerCancel={() => input.current.keys.delete(item.key)} onLostPointerCapture={() => input.current.keys.delete(item.key)}>{item.text}</Button>)}
      </div>
    </>}
  </div>;
}
