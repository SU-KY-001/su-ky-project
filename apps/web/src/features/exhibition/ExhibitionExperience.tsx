import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactElement, type ReactNode } from "react";
import { ArrowDown } from "@phosphor-icons/react/dist/icons/ArrowDown";
import { ArrowLeft } from "@phosphor-icons/react/dist/icons/ArrowLeft";
import { ArrowRight } from "@phosphor-icons/react/dist/icons/ArrowRight";
import { ArrowUp } from "@phosphor-icons/react/dist/icons/ArrowUp";
import { Compass } from "@phosphor-icons/react/dist/icons/Compass";
import { MouseSimple } from "@phosphor-icons/react/dist/icons/MouseSimple";
import { Button } from "@/shared/components/ui/button";
import { artworks, chapters } from "./data";
import { ArtworkDetail, ExhibitionMenu } from "./components/ExhibitionDialogs";
import { initialView, type GalleryInput, type GalleryView } from "./components/GalleryControls";
import "./exhibition.css";
import exhibitionSoundtrack from "../../public/audio-trienlam-3d/Toàn Cảnh Giải Phóng Miền Nam 1975 ĐỈNH CAO CỦA CHIẾN THUẬT  Lịch Sử Quân Sự - Lịch Sử Quân Sự (1).mp3?url";

const GalleryScene = lazy(() => import("./components/GalleryScene").then(module => ({ default: module.GalleryScene })));
type Phase = "intro" | "walking" | "paused" | "menu" | "artwork";

class SceneBoundary extends Component<{ children: ReactNode; onUnavailable: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } { return { failed: true }; }
  componentDidCatch(): void { this.props.onUnavailable(); }
  render(): ReactNode { return this.state.failed ? null : this.props.children; }
}

export function ExhibitionExperience(): ReactElement {
  const [phase, setPhase] = useState<Phase>("intro");
  const [ready, setReady] = useState(false);
  const [available, setAvailable] = useState(true);
  const [locked, setLocked] = useState(false);
  const [hintVisible, setHintVisible] = useState(true);
  const [chapter, setChapter] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [view, setView] = useState<GalleryView>(initialView);
  const container = useRef<HTMLElement>(null);
  const resumeButton = useRef<HTMLButtonElement>(null);
  const input = useRef<GalleryInput>({ keys: new Set() });
  const soundtrack = useRef<HTMLAudioElement>(null);
  const overlayUnlock = useRef(false);
  const artworkReturnPhase = useRef<"walking" | "menu">("walking");
  const menuReturnPhase = useRef<"walking" | "paused">("walking");
  const focusedArtwork = artworks.find(item => item.id === target);
  const selectedArtwork = artworks.find(item => item.id === selected);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Khoảnh khắc toàn thắng 1975 | Sử Ký";
    let alive = true;
    void Promise.all([document.fonts.load('400 16px "Be Vietnam Pro"', "Đường đến Sài Gòn"), document.fonts.load('600 16px "Be Vietnam Pro"', "Khoảnh khắc toàn thắng"), document.fonts.load('400 16px "Cormorant Garamond"', "Đất nước liền một dải")]).then(() => { if (alive) setReady(true); }, () => { if (alive) setReady(true); });
    const canvas = document.createElement("canvas");
    try {
      const context = canvas.getContext("webgl2");
      if (!context) setAvailable(false);
      context?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch { setAvailable(false); }
    const lockChanged = (): void => {
      setLocked(Boolean(document.pointerLockElement));
      if (!document.pointerLockElement) {
        if (overlayUnlock.current) { overlayUnlock.current = false; return; }
        setPhase(value => value === "walking" ? "paused" : value);
      }
    };
    document.addEventListener("pointerlockchange", lockChanged);
    return () => {
      alive = false;
      document.title = previousTitle;
      document.removeEventListener("pointerlockchange", lockChanged);
      if (document.pointerLockElement) document.exitPointerLock();
    };
  }, []);

  useEffect(() => { if (phase === "paused") resumeButton.current?.focus(); }, [phase]);
  useEffect(() => {
    const audio = soundtrack.current;
    if (!audio) return;
    if (phase === "intro" || phase === "paused") audio.pause();
    const visibilityChanged = (): void => {
      if (document.hidden) audio.pause();
      else if (phase !== "intro" && phase !== "paused") void audio.play().catch(() => undefined);
    };
    document.addEventListener("visibilitychange", visibilityChanged);
    return () => document.removeEventListener("visibilitychange", visibilityChanged);
  }, [phase]);
  useEffect(() => {
    const audio = soundtrack.current;
    return () => { audio?.pause(); };
  }, []);
  useEffect(() => {
    if (phase !== "walking") return;
    setHintVisible(true);
    const timer = window.setTimeout(() => setHintVisible(false), 4500);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const releasePointer = useCallback((): void => {
    input.current.keys.clear();
    if (document.pointerLockElement) {
      overlayUnlock.current = true;
      document.exitPointerLock();
    }
  }, []);
  const pause = useCallback((): void => {
    setPhase(value => value === "walking" ? "paused" : value); releasePointer();
  }, [releasePointer]);
  const navigate = useCallback((): void => {
    menuReturnPhase.current = phase === "paused" ? "paused" : "walking";
    setPhase("menu"); releasePointer();
  }, [phase, releasePointer]);
  const inspect = useCallback((id: string): void => {
    artworkReturnPhase.current = phase === "menu" ? "menu" : "walking";
    setSelected(id); setPhase("artwork"); releasePointer();
  }, [phase, releasePointer]);
  const unavailable = useCallback((): void => { setAvailable(false); setPhase("paused"); releasePointer(); }, [releasePointer]);
  const enter = (): void => {
    if (!available) { navigate(); return; }
    if (soundtrack.current) {
      soundtrack.current.volume = 0.65;
      void soundtrack.current.play().catch(() => undefined);
    }
    setPhase("walking");
    const canvas = container.current?.querySelector("canvas");
    if (!canvas) return;
    canvas.tabIndex = 0;
    canvas.focus();
    if (!window.matchMedia("(pointer: coarse)").matches && canvas.requestPointerLock) {
      try {
        const request = canvas.requestPointerLock();
        if (request) void request.catch(() => setLocked(false));
      } catch { setLocked(false); }
    }
  };
  const travel = (index: number): void => {
    const destination = chapters[index];
    if (!destination) return;
    setView(value => ({ position: [...destination.spawn], yaw: destination.yaw, revision: value.revision + 1 }));
    setChapter(index); enter();
  };
  const closeDetails = (): void => {
    setSelected(null);
    if (available && artworkReturnPhase.current === "walking") enter();
    else setPhase("menu");
  };

  return <main ref={container} className="exhibition" aria-label="Triển lãm ảnh tư liệu: Khoảnh khắc toàn thắng và Giải phóng miền Nam 1975">
    <audio ref={soundtrack} src={exhibitionSoundtrack} preload="none" />
    <div className="exhibition-stage" aria-hidden={phase === "intro" || phase === "menu" || phase === "artwork"}>
      {ready && available && <SceneBoundary onUnavailable={unavailable}><Suspense fallback={null}>
        <GalleryScene active={phase === "walking"} input={input} view={view} onPause={pause} onNavigate={navigate} onInspect={inspect} onTarget={setTarget} onChapter={setChapter} onUnavailable={unavailable} />
      </Suspense></SceneBoundary>}
    </div>

    {phase === "intro" && <section className="exhibition-entrance">
      <header className="exhibition-brand"><span>SỬ KÝ</span><span>KHÔNG GIAN TƯ LIỆU</span></header>
      <div className="exhibition-intro-copy">
        <p className="exhibition-eyebrow">TRIỂN LÃM ẢNH TƯ LIỆU</p>
        <h1>Khoảnh khắc<br />toàn thắng<span>.</span></h1>
        <p className="exhibition-subtitle">Giải phóng miền Nam, 1975</p>
        <p className="exhibition-invitation">Bước vào ký ức.<br />Lắng lại trước những khoảnh khắc lịch sử.</p>
        <Button onClick={enter} disabled={!ready} className="exhibition-enter">Enter <ArrowRight size={22} weight="light" /></Button>
        {!ready && <p role="status" className="exhibition-loading">Đang chuẩn bị không gian…</p>}
        {!available && <p className="exhibition-loading">Thiết bị không hỗ trợ 3D. Enter để xem ảnh và đọc câu chuyện.</p>}
      </div>
      <footer className="exhibition-entry-footer"><span>30.04.1975</span><span>12 ảnh tư liệu <span aria-hidden="true">/</span> 3 chương</span><span className="exhibition-entry-controls"><MouseSimple size={18} /> Chuột để nhìn <span aria-hidden="true">/</span> WASD để bước đi</span></footer>
    </section>}

    {phase === "walking" && <>
      <div className="exhibition-room-label"><span>0{chapter + 1}</span><div>{chapters[chapter]?.title}<small>{chapters[chapter]?.period}</small></div></div>
      <Button variant="outline" size="icon" className="exhibition-navigation" onClick={navigate} aria-label="Mở mục lục triển lãm (M)" title="Mục lục (M)"><Compass size={24} weight="light" /><kbd>M</kbd></Button>
      {focusedArtwork && <div className="exhibition-focused" role="status"><span>{focusedArtwork.title}</span><button type="button" onClick={() => inspect(focusedArtwork.id)}><kbd>E</kbd> Xem chi tiết</button></div>}
      {hintVisible && <div className="exhibition-walking-hint">{locked ? <><kbd>Esc</kbd> để tạm dừng</> : <><span>Kéo chuột để nhìn</span><kbd>Esc</kbd> để tạm dừng</>}</div>}
      <div className="exhibition-touch-controls" aria-label="Điều khiển di chuyển cảm ứng">
        {([{ key: "KeyW", label: "Đi tới", Icon: ArrowUp }, { key: "KeyA", label: "Sang trái", Icon: ArrowLeft }, { key: "KeyS", label: "Lùi lại", Icon: ArrowDown }, { key: "KeyD", label: "Sang phải", Icon: ArrowRight }]).map(({ key, label, Icon }) => <button key={key} className={`exhibition-touch-${key}`} type="button" aria-label={label} onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); input.current.keys.add(key); }} onPointerUp={() => input.current.keys.delete(key)} onPointerCancel={() => input.current.keys.delete(key)} onLostPointerCapture={() => input.current.keys.delete(key)}><Icon size={22} /></button>)}
      </div>
    </>}

    {phase === "paused" && <section className="exhibition-pause" aria-label="Đã tạm dừng tham quan">
      <div><p className="exhibition-eyebrow">SỬ KÝ / TRIỂN LÃM 1975</p><h2>{available ? "Một khoảng lặng." : "Tiếp tục qua những bức ảnh."}</h2><p>{available ? "Không gian vẫn ở đây. Tiếp tục khi bạn sẵn sàng." : "Không gian 3D hiện không khả dụng. Toàn bộ ảnh, câu chuyện và nguồn tư liệu vẫn có trong mục lục."}</p>
        <Button ref={resumeButton} className="exhibition-enter" onClick={enter}>{available ? "Tiếp tục tham quan" : "Xem ảnh tư liệu"}<ArrowRight size={20} /></Button>
        {available && <Button variant="ghost" onClick={navigate} className="exhibition-pause-menu">Mục lục triển lãm <Compass size={18} /></Button>}
        {available && <p className="exhibition-pause-help">WASD / mũi tên để đi · Chuột để nhìn<br />E xem ảnh · M mở mục lục · Esc tạm dừng</p>}
      </div>
    </section>}

    {phase === "menu" && <ExhibitionMenu open chapter={chapter} available={available} onClose={() => {
      if (available && menuReturnPhase.current === "walking") enter();
      else setPhase("paused");
    }} onTravel={travel} onInspect={inspect} onReturnFocus={() => {
      if (available && menuReturnPhase.current === "walking") container.current?.querySelector("canvas")?.focus();
    }} />}
    {phase === "artwork" && <ArtworkDetail artwork={selectedArtwork} onClose={closeDetails} onReturnFocus={() => {
      if (available && artworkReturnPhase.current === "walking") container.current?.querySelector("canvas")?.focus();
    }} />}
  </main>;
}
