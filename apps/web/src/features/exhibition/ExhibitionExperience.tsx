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
import { initialView, type GalleryInput, type GalleryView } from "./components/GalleryControls";

const GalleryScene = lazy(() => import("./components/GalleryScene").then(module => ({ default: module.GalleryScene })));
type Phase = "intro" | "walking" | "paused" | "menu" | "artwork";

class SceneBoundary extends Component<{ children: ReactNode; onUnavailable: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } { return { failed: true }; }
  componentDidCatch(): void { this.props.onUnavailable(); }
  render(): ReactNode { return this.state.failed ? null : this.props.children; }
}

export function ExhibitionExperience({ exhibition, startInGallery = false }: { exhibition: ResolvedExhibition; startInGallery?: boolean }): ReactElement {
  const artworks = resolvedArtworks(exhibition);
  const chapters = exhibition.chapters.map((chapter) => ({ ...chapter, spawn: exhibitionTemplate.spawns.find(item => item.roomKey === chapter.roomKey)!.position, yaw: exhibitionTemplate.spawns.find(item => item.roomKey === chapter.roomKey)!.yaw }));
  const title = exhibition.metadata.title;
  const [phase, setPhase] = useState<Phase>(startInGallery ? "walking" : "intro");
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
  const menuReturnPhase = useRef<"walking" | "paused">("walking");
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
    const canvas = document.createElement("canvas");
    try {
      const context = canvas.getContext("webgl2");
      if (!context) { setAvailable(false); if (startInGallery) setPhase("paused"); }
      context?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch { setAvailable(false); if (startInGallery) setPhase("paused"); }
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
    menuReturnPhase.current = phase === "paused" ? "paused" : "walking";
    setPhase("menu"); releasePointer();
  }, [phase, releasePointer]);
  const inspect = useCallback((id: string): void => {
    artworkReturnPhase.current = phase === "menu" ? "menu" : "walking";
    setSelected(id); setPhase("artwork"); releasePointer();
  }, [phase, releasePointer]);
  const unavailable = useCallback((): void => { setAvailable(false); setPhase("paused"); releasePointer(); }, [releasePointer]);
  const enter = (): void => {
    if (!audioStarted.current && audio.current) {
      audioStarted.current = true;
      void audio.current.play().catch(() => { audioStarted.current = false; });
    }
    if (!available) { navigate(); return; }
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

  return <main ref={container} className={`exhibition${startInGallery ? " exhibition-preview" : ""}`} aria-label={`Triển lãm ảnh tư liệu: ${title}`}>
    {exhibition.audio && <audio ref={audio} src={exhibition.audio.url} controls preload="metadata" aria-label="Âm thanh kể chuyện triển lãm" className={phase === "intro" ? "exhibition-cover-audio" : "absolute bottom-4 right-4 z-20 w-64 max-w-[calc(100%-2rem)]"} />}
    <div className={`exhibition-stage absolute inset-0 touch-none [&_canvas]:block [&_canvas]:outline-none${phase === "intro" ? " exhibition-stage-cover" : ""}`} aria-hidden={phase === "intro" || phase === "menu" || phase === "artwork"}>
      {ready && available && <SceneBoundary onUnavailable={unavailable}><Suspense fallback={null}>
        <GalleryScene active={phase === "walking"} input={input} view={view} onPause={pause} onNavigate={navigate} onInspect={inspect} onTarget={setTarget} onChapter={setChapter} onUnavailable={unavailable} items={artworks} chapterText={chapters} />
      </Suspense></SceneBoundary>}
    </div>

    {phase === "intro" && <ExhibitionEntrance title={title} subtitle={exhibition.metadata.subtitle} description={exhibition.metadata.description} artworkCount={artworks.length} chapterCount={chapters.length} ready={ready} available={available} onEnter={enter} />}

    {phase === "walking" && <>
      <div className="exhibition-room-label pointer-events-none absolute left-9 top-[30px] flex items-center gap-[19px] bg-[color:var(--exhibit-paper)]/10 px-2.5 py-1 backdrop-blur-[6px]"><span>0{chapter + 1}</span><div>{chapters[chapter]?.title}<small>{chapters[chapter]?.period}</small></div></div>
      <Button variant="outline" size="icon" className="exhibition-navigation" onClick={navigate} aria-label="Mở mục lục triển lãm (M)" title="Mục lục (M)"><Compass size={24} weight="light" /><kbd>M</kbd></Button>
      {focusedArtwork && <div className="exhibition-focused absolute bottom-[90px] left-1/2 flex max-w-[calc(100vw-160px)] -translate-x-1/2 items-center gap-6 bg-[color:var(--exhibit-paper)]/95 px-[19px] py-3 text-xs" role="status"><span>{focusedArtwork.title}</span><button type="button" onClick={() => inspect(focusedArtwork.id)}><kbd>E</kbd> Xem chi tiết</button></div>}
      {hintVisible && <div className="exhibition-walking-hint pointer-events-none absolute bottom-[26px] left-1/2 -translate-x-1/2 whitespace-nowrap bg-transparent px-3 py-2 text-[10px] text-[var(--exhibit-muted)] opacity-[.58]">{locked ? <><kbd>Esc</kbd> để tạm dừng</> : <><span>Kéo chuột để nhìn</span><kbd>Esc</kbd> để tạm dừng</>}</div>}
      <div className="exhibition-touch-controls hidden" aria-label="Điều khiển di chuyển cảm ứng">
        {([{ key: "KeyW", label: "Đi tới", Icon: ArrowUp }, { key: "KeyA", label: "Sang trái", Icon: ArrowLeft }, { key: "KeyS", label: "Lùi lại", Icon: ArrowDown }, { key: "KeyD", label: "Sang phải", Icon: ArrowRight }]).map(({ key, label, Icon }) => <button key={key} className={`exhibition-touch-${key}`} type="button" aria-label={label} onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); input.current.keys.add(key); }} onPointerUp={() => input.current.keys.delete(key)} onPointerCancel={() => input.current.keys.delete(key)} onLostPointerCapture={() => input.current.keys.delete(key)}><Icon size={22} /></button>)}
      </div>
    </>}

    {phase === "paused" && <section className="exhibition-pause absolute inset-0 z-[2] grid place-items-center bg-[color:var(--exhibit-paper)]/85 p-7 backdrop-blur-[5px]" aria-label="Đã tạm dừng tham quan">
      <div><p className="exhibition-eyebrow mb-[27px] text-[10px] font-medium tracking-[.2em] text-[var(--exhibit-muted)]">SỬ KÝ / TRIỂN LÃM</p><h2>{available ? "Một khoảng lặng." : "Tiếp tục qua những bức ảnh."}</h2><p>{available ? "Không gian vẫn ở đây. Tiếp tục khi bạn sẵn sàng." : "Không gian 3D hiện không khả dụng. Toàn bộ ảnh, câu chuyện và nguồn tư liệu vẫn có trong mục lục."}</p>
        <Button ref={resumeButton} className="exhibition-enter" onClick={enter}>{available ? "Tiếp tục tham quan" : "Xem ảnh tư liệu"}<ArrowRight size={20} /></Button>
        {available && <Button variant="ghost" onClick={navigate} className="exhibition-pause-menu">Mục lục triển lãm <Compass size={18} /></Button>}
        {available && <p className="exhibition-pause-help mt-8 !text-[11px]">WASD / mũi tên để đi · Chuột để nhìn<br />E xem ảnh · M mở mục lục · Esc tạm dừng</p>}
      </div>
    </section>}

    {phase === "menu" && <ExhibitionMenu open chapter={chapter} available={available} items={artworks} chapterList={chapters} onClose={() => {
      if (available && menuReturnPhase.current === "walking") enter();
      else setPhase("paused");
    }} onTravel={travel} onInspect={inspect} onReturnFocus={() => {
      if (available && menuReturnPhase.current === "walking") container.current?.querySelector("canvas")?.focus();
    }} />}
    {phase === "artwork" && <ArtworkDetail artwork={selectedArtwork} narration={exhibition.audio ? null : exhibition.items.find(item => item.id === selected)?.narration} onClose={closeDetails} onReturnFocus={() => {
      if (available && artworkReturnPhase.current === "walking") container.current?.querySelector("canvas")?.focus();
    }} />}
  </main>;
}
