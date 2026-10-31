import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactElement, type ReactNode } from "react";
import { ArrowDown } from "@phosphor-icons/react/dist/icons/ArrowDown";
import { ArrowLeft } from "@phosphor-icons/react/dist/icons/ArrowLeft";
import { ArrowRight } from "@phosphor-icons/react/dist/icons/ArrowRight";
import { ArrowUp } from "@phosphor-icons/react/dist/icons/ArrowUp";
import { Compass } from "@phosphor-icons/react/dist/icons/Compass";
import { Button } from "@/shared/components/ui/button";
import { exhibitionTemplate } from "@repo/shared";
import { resolvedArtworks } from "./resolvedLayout";
import type { ResolvedExhibition } from "@repo/shared";
import { ExhibitionEntrance } from "./components/ExhibitionEntrance";
import { ArtworkDetail, ExhibitionMenu } from "./components/ExhibitionDialogs";
import type { GalleryInput, GalleryView } from "./components/GalleryControls";
import { initialView } from "./galleryView";
import brandLogo from "@/public/brand-su-ky-viet-nam.png";

const GalleryScene = lazy(() => import("./components/GalleryScene").then(module => ({ default: module.GalleryScene })));
type Phase = "intro" | "loading" | "walking" | "paused" | "menu" | "artwork";

class SceneBoundary extends Component<{ children: ReactNode; onUnavailable: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } { return { failed: true }; }
  componentDidCatch(error: Error): void { console.error("Không thể khởi tạo triển lãm 3D", error); this.props.onUnavailable(); }
  render(): ReactNode { return this.state.failed ? null : this.props.children; }
}

export function ExhibitionExperience({ exhibition, startInGallery = false }: { exhibition: ResolvedExhibition; startInGallery?: boolean }): ReactElement {
  const artworks = resolvedArtworks(exhibition);
  const chapters = exhibition.chapters.map((chapter) => ({ ...chapter, spawn: exhibitionTemplate.spawns.find(item => item.roomKey === chapter.roomKey)!.position, yaw: exhibitionTemplate.spawns.find(item => item.roomKey === chapter.roomKey)!.yaw }));
  const title = exhibition.metadata.title;
  const [phase, setPhase] = useState<Phase>(startInGallery ? "loading" : "intro");
  const [sceneReady, setSceneReady] = useState(false);
  const [sceneRequested, setSceneRequested] = useState(startInGallery);
  const [ready, setReady] = useState(false);
  const [available, setAvailable] = useState(true);
  const [locked, setLocked] = useState(false);
  const [hintVisible, setHintVisible] = useState(true);
  const [chapter, setChapter] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [view, setView] = useState<GalleryView>(initialView);
  const container = useRef<HTMLElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const audioStarted = useRef(false);
  const resumeButton = useRef<HTMLButtonElement>(null);
  const input = useRef<GalleryInput>({ keys: new Set() });
  const overlayUnlock = useRef(false);
  const artworkReturnPhase = useRef<"walking" | "menu">("walking");
  const menuReturnPhase = useRef<"intro" | "walking" | "paused">("intro");
  const focusedArtwork = artworks.find(item => item.id === target);
  const selectedArtwork = artworks.find(item => item.id === selected);

  useEffect(() => {
    if (startInGallery && audio.current) {
      audioStarted.current = true;
      void audio.current.play().catch(() => { audioStarted.current = false; });
    }
  }, [startInGallery, exhibition.audio?.url]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${title} | Sử Ký`;
    let alive = true;
    void Promise.all([document.fonts.load('400 16px "Be Vietnam Pro"', title), document.fonts.load('600 16px "Be Vietnam Pro"', title), document.fonts.load('400 16px "Cormorant Garamond"', title)]).then(() => { if (alive) setReady(true); }, () => { if (alive) setReady(true); });
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
  }, [title, startInGallery]);

  useEffect(() => { if (phase === "paused") resumeButton.current?.focus(); }, [phase]);
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
    menuReturnPhase.current = phase === "intro" ? "intro" : phase === "paused" ? "paused" : "walking";
    setPhase("menu"); releasePointer();
  }, [phase, releasePointer]);
  const inspect = useCallback((id: string): void => {
    artworkReturnPhase.current = phase === "menu" ? "menu" : "walking";
    setSelected(id); setPhase("artwork"); releasePointer();
  }, [phase, releasePointer]);
  const unavailable = useCallback((): void => { setAvailable(false); menuReturnPhase.current = "intro"; setPhase("menu"); releasePointer(); }, [releasePointer]);
  const enter = (): void => {
    if (!audioStarted.current && audio.current) {
      audioStarted.current = true;
      void audio.current.play().catch(() => { audioStarted.current = false; });
    }
    if (!available) { navigate(); return; }
    setSceneRequested(true);
    setPhase(sceneReady ? "walking" : "loading");
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

  return <main ref={container} className={`exhibition${startInGallery ? " exhibition-preview" : ""}`} aria-label={`Triển lãm ảnh tư liệu: ${title}`}>
    {(phase === "intro" || phase === "loading" || !sceneRequested) && exhibition.items[0] && <img src={exhibition.items[0].image.url} alt="" decoding="async" className="exhibition-stage-cover absolute inset-0 h-full w-full object-cover" />}
    {exhibition.audio && <audio ref={audio} src={exhibition.audio.url} controls preload="none" aria-label="Âm thanh kể chuyện triển lãm" className={phase === "intro" || phase === "loading" ? "exhibition-cover-audio" : "absolute bottom-4 right-4 z-20 w-64 max-w-[calc(100%-2rem)]"} />}
    <div className={`exhibition-stage absolute inset-0 touch-none [&_canvas]:block [&_canvas]:outline-none${phase === "intro" || phase === "loading" ? " exhibition-stage-cover" : ""}`} aria-hidden={phase === "intro" || phase === "loading" || phase === "menu" || phase === "artwork"}>
      {sceneRequested && phase !== "intro" && ready && available && <SceneBoundary onUnavailable={unavailable}><Suspense fallback={null}>
        <GalleryScene active={phase === "walking"} pointerLockOnClick input={input} view={view} onPause={pause} onNavigate={navigate} onInspect={inspect} onTarget={setTarget} onChapter={setChapter} onUnavailable={unavailable} onReady={() => { setSceneReady(true); setPhase(value => value === "loading" ? "walking" : value); container.current?.querySelector("canvas")?.focus({ preventScroll: true }); }} items={artworks} chapterText={chapters} />
      </Suspense></SceneBoundary>}
    </div>

    {(phase === "intro" || phase === "loading" || !sceneRequested) && <ExhibitionEntrance title={title} subtitle={exhibition.metadata.subtitle} description={exhibition.metadata.description} artworkCount={artworks.length} chapterCount={chapters.length} ready={ready} available={available} loading={phase === "loading"} onEnter={navigate} onCancel={() => { setPhase("intro"); setSceneReady(false); setSceneRequested(false); input.current.keys.clear(); audio.current?.pause(); audioStarted.current = false; }} />}

    {phase === "walking" && <>
      <div className="exhibition-room-label pointer-events-none absolute left-9 top-[30px] flex items-center gap-[19px] bg-[color:var(--exhibit-paper)]/10 px-2.5 py-1 backdrop-blur-[6px]"><span>0{chapter + 1}</span><div>{chapters[chapter]?.title}<small>{chapters[chapter]?.period}</small></div></div>
      <Button variant="outline" size="icon" className="exhibition-navigation" onClick={navigate} aria-label="Mở mục lục triển lãm (M)" title="Mục lục (M)"><Compass size={24} weight="light" /><kbd>M</kbd></Button>
      {focusedArtwork && <div className="exhibition-focused absolute bottom-[90px] left-1/2 flex max-w-[calc(100vw-160px)] -translate-x-1/2 items-center gap-6 bg-[color:var(--exhibit-paper)]/95 px-[19px] py-3 text-xs" role="status"><span>{focusedArtwork.title}</span><button type="button" onClick={() => inspect(focusedArtwork.id)}><kbd>E</kbd> Xem chi tiết</button></div>}
      {hintVisible && <div className="exhibition-walking-hint pointer-events-none absolute bottom-[26px] left-1/2 -translate-x-1/2 whitespace-nowrap bg-transparent px-3 py-2 text-[10px] text-[var(--exhibit-muted)] opacity-[.58]">{locked ? <><kbd>Esc</kbd> để tạm dừng</> : <><span>Kéo chuột để nhìn</span><kbd>Esc</kbd> để tạm dừng</>}</div>}
      <div className="exhibition-touch-controls hidden" aria-label="Điều khiển di chuyển cảm ứng">
        {([{ key: "KeyW", label: "Đi tới", Icon: ArrowUp }, { key: "KeyA", label: "Sang trái", Icon: ArrowLeft }, { key: "KeyS", label: "Lùi lại", Icon: ArrowDown }, { key: "KeyD", label: "Sang phải", Icon: ArrowRight }]).map(({ key, label, Icon }) => <button key={key} className={`exhibition-touch-${key}`} type="button" aria-label={label} onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); input.current.keys.add(key); }} onPointerUp={() => input.current.keys.delete(key)} onPointerCancel={() => input.current.keys.delete(key)} onLostPointerCapture={() => input.current.keys.delete(key)}><Icon size={22} /></button>)}
      </div>
    </>}

    {phase === "paused" && available && <section className="exhibition-pause absolute inset-0 z-[2] flex flex-col items-center overflow-y-auto bg-night/45 p-4 backdrop-blur-[5px] sm:p-7" aria-labelledby="exhibition-pause-title">
      <div className="my-auto shrink-0 rounded-2xl border border-line bg-paper p-6 text-ink sm:p-10">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4"><img src={brandLogo} alt="Sử Ký Việt Nam" className="h-auto w-36" /><span className="text-xs font-medium text-bronze-dark">Đang tạm dừng</span></header>
        <h2 id="exhibition-pause-title">Một khoảng lặng.</h2>
        <p>Hành trình của bạn vẫn ở đây. Tiếp tục khám phá khi bạn sẵn sàng.</p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Button ref={resumeButton} className="h-12 gap-5 rounded-lg bg-vermilion px-5 text-paper-soft hover:bg-vermilion-dark" onClick={enter}>Tiếp tục tham quan<ArrowRight size={20} aria-hidden="true" /></Button>
          <Button variant="outline" onClick={navigate} className="h-12 gap-3 rounded-lg border-line bg-transparent px-5 text-ink hover:bg-paper-deep"><Compass size={19} aria-hidden="true" />Bản đồ triển lãm</Button>
        </div>
        <footer className="mt-8 grid gap-x-5 gap-y-2 border-t border-line pt-5 text-xs leading-6 text-ink-soft sm:grid-cols-2"><span><kbd className="font-medium text-ink">WASD / ↑ ← ↓ →</kbd> · Di chuyển</span><span>Chuột · Nhìn xung quanh</span><span><kbd className="font-medium text-ink">E</kbd> · Xem ảnh gần</span><span><kbd className="font-medium text-ink">M</kbd> · Bản đồ &nbsp; <kbd className="font-medium text-ink">Esc</kbd> · Tạm dừng</span></footer>
      </div>
    </section>}

    {phase === "menu" && <ExhibitionMenu open chapter={chapter} available={available} items={artworks} chapterList={chapters} onClose={() => {
      if (!available || menuReturnPhase.current === "intro") setPhase("intro");
      else if (menuReturnPhase.current === "walking") enter();
      else setPhase("paused");
    }} onTravel={travel} onInspect={inspect} onReturnFocus={() => {
      if (available && menuReturnPhase.current === "walking") container.current?.querySelector("canvas")?.focus();
      else if (menuReturnPhase.current === "intro") container.current?.querySelector<HTMLButtonElement>(".exhibition-cover-enter")?.focus();
    }} />}
    {phase === "artwork" && <ArtworkDetail artwork={selectedArtwork} narration={exhibition.audio ? null : exhibition.items.find(item => item.id === selected)?.narration} onClose={closeDetails} onReturnFocus={() => {
      if (available && artworkReturnPhase.current === "walking") container.current?.querySelector("canvas")?.focus();
    }} />}
  </main>;
}
