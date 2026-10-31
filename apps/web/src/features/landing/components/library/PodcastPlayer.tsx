import { useEffect, useId, useRef, useState, type ReactElement } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { LibraryChapter } from "@repo/shared";
import { Headphones } from "@phosphor-icons/react/dist/icons/Headphones";
import { Play } from "@phosphor-icons/react/dist/icons/Play";
import { Pause } from "@phosphor-icons/react/dist/icons/Pause";
import { Shuffle } from "@phosphor-icons/react/dist/icons/Shuffle";
import { SkipBack } from "@phosphor-icons/react/dist/icons/SkipBack";
import { SkipForward } from "@phosphor-icons/react/dist/icons/SkipForward";
import { Repeat } from "@phosphor-icons/react/dist/icons/Repeat";
import { SpeakerHigh } from "@phosphor-icons/react/dist/icons/SpeakerHigh";
import { Button } from "@/shared/components/ui/button";
import { useCurrentUser } from "@/shared/hooks/useCurrentUser";
import { notify } from "@/shared/lib/notifications";
import { libraryService } from "../../services/libraryService";
import { LibrarySelect, LibraryState } from "./LibraryPrimitives";
import { EpisodeQuiz } from "./EpisodeQuiz";
import { PublicationNoticeView } from "./PublicationNotice";
import { audioTime } from "./playlistFormat";
import { Slider } from "@/shared/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Label } from "@/shared/components/ui/label";
import { mergePlayedRanges } from "./listeningBitmap";

const compactSlider = "h-[18px] min-w-0 [&_[data-slot=slider-track]]:h-[3px] [&_[data-slot=slider-track]]:bg-ink/20 [&_[data-slot=slider-range]]:bg-ink-soft [&_[data-slot=slider-thumb]]:size-[9px] [&_[data-slot=slider-thumb]]:border-0 [&_[data-slot=slider-thumb]]:bg-ink-soft [&_[data-slot=slider-thumb]]:shadow-none hover:[&_[data-slot=slider-range]]:bg-vermilion hover:[&_[data-slot=slider-thumb]]:bg-vermilion focus-within:[&_[data-slot=slider-range]]:bg-vermilion focus-within:[&_[data-slot=slider-thumb]]:bg-vermilion";

interface AudioPlaybackProps {
  autoPlayOnReady?: boolean;
  appearance?: "default" | "exhibition";
  narrationId: string;
  userId: string;
  playlist?: boolean;
  controlsHidden?: boolean;
  playRequest?: number;
  onPlayingChange?: (playing: boolean) => void;
  onFinished?: () => void;
  shuffle?: boolean;
  repeat?: "off" | "all" | "one";
  onShuffle?: () => void;
  onRepeat?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
}

export function AudioPlayback({ narrationId, userId, playlist = false, controlsHidden = false, playRequest = 0, autoPlayOnReady = false, appearance = "default", onPlayingChange, onFinished, shuffle = false, repeat = "off", onShuffle, onRepeat, onPrevious, onNext }: AudioPlaybackProps): ReactElement {
  const speedControlId = useId();
  const playback = useQuery({ queryKey: ["library-playback", userId, narrationId], queryFn: ({ signal }) => libraryService.playback(narrationId, signal), staleTime: 0, refetchOnWindowFocus: false });
  const audio = useRef<HTMLAudioElement>(null);
  const autoPlayRequested = useRef(autoPlayOnReady);
  const queryClient = useQueryClient();
  const [audioError, setAudioError] = useState(false);
  const [speed, setSpeed] = useState("1");
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [volume, setVolume] = useState(1);
  useEffect(() => {
    const pauseWhenHidden = (): void => { if (document.hidden) audio.current?.pause(); };
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => document.removeEventListener("visibilitychange", pauseWhenHidden);
  }, []);
  function toggle(): void {
    if (!audio.current) return;
    if (audio.current.paused) void audio.current.play().catch(() => { setPlaying(false); onPlayingChange?.(false); });
    else audio.current.pause();
  }
  useEffect(() => {
    if (playRequest && audio.current && audio.current.readyState >= 1) toggle();
  }, [playRequest]);
  const progress = useRef({ bits: new Uint8Array(), previous: -1, positionMs: 0, dirty: false, saving: false, failed: false });
  const flushProgress = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    const value = playback.data;
    if (!value) return;
    const bits = new Uint8Array(Math.ceil(Math.ceil(value.audio.durationMs / 1000) / 8));
    if (value.progress?.playedBitmap) {
      const stored = Uint8Array.from(atob(value.progress.playedBitmap), (c) => c.charCodeAt(0));
      bits.set(stored.subarray(0, bits.length));
    }
    progress.current = { bits, previous: -1, positionMs: value.progress?.positionMs ?? 0, dirty: false, saving: false, failed: false };
    // Capture this narration's state: an old request must never save the next track's state.
    const state = progress.current;
    let pending: Promise<void> | null = null;
    async function save(): Promise<void> {
      if (pending) { await pending; if (state.dirty) await save(); return; }
      const element = audio.current;
      if (element && progress.current === state) {
        const positionMs = Math.min(Math.round(element.currentTime * 1000), value!.audio.durationMs);
        if (positionMs !== state.positionMs || element.ended) state.dirty = true;
        mergePlayedRanges(state.bits, element.played, value!.audio.durationMs);
        state.positionMs = positionMs;
      }
      if (!state.dirty) return;
      state.saving = true;
      state.dirty = false;
      const bitmap = btoa(Array.from(state.bits, (byte) => String.fromCharCode(byte)).join(""));
      pending = (async () => { try {
        const result = await libraryService.saveProgress(narrationId, { assetId: value!.audio.assetId, positionMs: state.positionMs, playedBitmap: bitmap });
        state.failed = false;
        void queryClient.invalidateQueries({ queryKey: ["listening-history"] });
        if (result.completedAt) {
          void queryClient.invalidateQueries({ queryKey: ["library-missions"] });
          void queryClient.invalidateQueries({ queryKey: ["library-honors"] });
        }
      } catch {
        state.dirty = true;
        if (!state.failed) notify.warning({ title: "Chưa lưu được tiến độ nghe", description: "Bạn vẫn có thể nghe. Hệ thống sẽ thử lưu lại." });
        state.failed = true;
      } finally { state.saving = false; } })();
      await pending;
      pending = null;
    }
    flushProgress.current = save;
    const interval = window.setInterval(() => { void save(); }, Math.max(5000, value.sync.intervalMs));
    const element = audio.current;
    const flush = (): void => { void save(); };
    const flushWhenHidden = (): void => { if (document.visibilityState === "hidden") flush(); };
    element?.addEventListener("pause", flush);
    element?.addEventListener("ended", flush);
    document.addEventListener("visibilitychange", flushWhenHidden);
    window.addEventListener("pagehide", flush);
    return () => { window.clearInterval(interval); element?.removeEventListener("pause", flush); element?.removeEventListener("ended", flush); document.removeEventListener("visibilitychange", flushWhenHidden); window.removeEventListener("pagehide", flush); element?.pause(); void save(); };
  }, [playback.data, narrationId, queryClient]);

  if (playback.isPending) return playlist ? <p role="status" className="py-3 text-xs text-ink-soft">Đang mở bản thu…</p> : <LibraryState loading />;
  if (playback.isError) return playlist ? <div role="alert" className="flex flex-wrap items-center gap-3 text-xs"><p>Chưa mở được bản thu. Vui lòng thử lại.</p><Button size="sm" variant="outline" onClick={() => { void playback.refetch(); }}>Thử lại</Button></div> : <LibraryState error title="Chưa mở được bản thu" description="Kiểm tra kết nối hoặc đăng nhập lại để tiếp tục nghe." retry={() => { void playback.refetch(); }} />;
  return <div className={playlist ? "contents" : "space-y-4"}>
    <audio ref={audio} controls={!playlist && appearance !== "exhibition"} preload="metadata" className={playlist || appearance === "exhibition" ? "hidden" : "w-full"} src={playback.data.audio.url} onPlay={event => { progress.current.previous = event.currentTarget.currentTime; setPlaying(true); onPlayingChange?.(true); }} onPause={() => { setPlaying(false); onPlayingChange?.(false); }} onEnded={async event => { const element = event.currentTarget; setPlaying(false); onPlayingChange?.(false); await flushProgress.current(); if (repeat === "one") { element.currentTime = 0; progress.current.previous = -1; void element.play().catch(() => {}); } else onFinished?.(); }} onLoadedMetadata={(event) => { event.currentTarget.currentTime = (playback.data.progress?.positionMs ?? 0) / 1000; setPosition(event.currentTarget.currentTime); event.currentTarget.playbackRate = Number(speed); const shouldPlay = playlist || autoPlayRequested.current; autoPlayRequested.current = false; if (shouldPlay && !document.hidden) void event.currentTarget.play().catch(() => { setPlaying(false); onPlayingChange?.(false); }); }} onSeeking={() => { progress.current.previous = -1; }} onSeeked={(event) => { progress.current.previous = event.currentTarget.currentTime; progress.current.positionMs = Math.min(Math.round(event.currentTarget.currentTime * 1000), playback.data.audio.durationMs); progress.current.dirty = true; }} onError={() => setAudioError(true)} onTimeUpdate={(event) => {
      const element = event.currentTarget;
      const state = progress.current;
      const now = element.currentTime;
      if (playlist || appearance === "exhibition") setPosition(now);
      const delta = now - state.previous;
      if (delta > 0 && !element.seeking) {
        mergePlayedRanges(state.bits, element.played, playback.data.audio.durationMs);
        state.dirty = true;
      }
      state.positionMs = Math.min(Math.round(now * 1000), playback.data.audio.durationMs);
      state.previous = now;
      if (Math.floor(now) !== Math.floor(now - Math.max(0, delta))) {
        const playedSeconds = mergePlayedRanges(state.bits, element.played, playback.data.audio.durationMs);
        const percent = Math.min(100, playedSeconds / Math.ceil(playback.data.audio.durationMs / 1000) * 100);
        queryClient.setQueriesData<Awaited<ReturnType<typeof libraryService.history>>>({ queryKey: ["listening-history", userId] }, old => old ? { ...old, items: old.items.map(item => item.lastNarrationId === narrationId ? { ...item, percent: Math.max(item.percent, percent), lastPositionMs: state.positionMs } : item) } : old);
      }
    }} />
    {controlsHidden ? null : appearance === "exhibition" ? <div className="mt-4 flex items-center gap-4"><Button type="button" size="icon" className="size-14 shrink-0 rounded-full bg-vermilion text-white hover:bg-vermilion-dark" aria-label={playing ? "Tạm dừng podcast" : "Phát podcast"} onClick={toggle}>{playing ? <Pause weight="fill" /> : <Play weight="fill" />}</Button><div className="min-w-0 flex-1"><p className="mb-3 text-sm font-semibold">{playing ? "Đang phát podcast" : "Nghe podcast"}</p><div className="flex items-center gap-2"><Slider aria-label="Vị trí phát podcast" className={compactSlider} min={0} max={playback.data.audio.durationMs / 1000} step={0.1} value={[position]} onValueChange={([value]) => { setPosition(value); if (audio.current) { progress.current.previous = -1; audio.current.currentTime = value; } }} /><span className="shrink-0 text-xs tabular-nums">{audioTime(position)} / {audioTime(playback.data.audio.durationMs / 1000)}</span></div></div></div> : playlist ? <div className="contents">
      <div className="col-span-2 row-start-2 flex items-center justify-center gap-3.5 min-[761px]:col-span-1 min-[761px]:col-start-2 min-[761px]:row-start-1 [&>button]:size-7 [&>button]:text-ink-soft">
        <Button variant="ghost" size="icon-sm" className="aria-pressed:text-mod-success" aria-label="Phát ngẫu nhiên" aria-pressed={shuffle} onClick={onShuffle}><Shuffle /></Button>
        <Button variant="ghost" size="icon-sm" aria-label="Tập trước" disabled={!onPrevious} onClick={onPrevious}><SkipBack weight="fill" /></Button>
        <Button className="!size-9 rounded-full border border-line bg-paper-soft text-ink shadow-sm hover:bg-paper" size="icon" aria-label={playing ? "Tạm dừng" : "Phát podcast"} onClick={toggle}>{playing ? <Pause weight="fill" /> : <Play weight="fill" />}</Button>
        <Button variant="ghost" size="icon-sm" aria-label="Tập tiếp theo" disabled={!onNext} onClick={onNext}><SkipForward weight="fill" /></Button>
        <Button variant="ghost" size="icon-sm" className="relative aria-pressed:text-mod-success" aria-label={repeat === "one" ? "Lặp một tập" : repeat === "all" ? "Lặp playlist" : "Bật lặp lại"} aria-pressed={repeat !== "off"} onClick={onRepeat}><Repeat />{repeat === "one" && <span className="absolute right-0 top-0 text-[9px]">1</span>}</Button>
      </div>
      <div className="col-span-2 row-start-3 flex w-[min(100%,460px)] min-w-0 items-center gap-2.5 justify-self-center text-[10px] tabular-nums text-ink-soft min-[761px]:col-span-1 min-[761px]:col-start-2 min-[761px]:row-start-2 min-[761px]:w-full [&>span]:min-w-7 [&>span:last-child]:text-right"><span>{audioTime(position)}</span><Slider className={compactSlider} aria-label="Vị trí phát podcast" min={0} max={playback.data.audio.durationMs / 1000} step={.1} value={[position]} onValueChange={([value]) => { setPosition(value); if (audio.current) { progress.current.previous = -1; audio.current.currentTime = value; } }} /><span>{audioTime(playback.data.audio.durationMs / 1000)}</span></div>
      <div className="col-start-2 row-start-1 flex min-w-0 items-center justify-end gap-2.5 min-[761px]:col-start-3 min-[761px]:row-span-2 min-[1051px]:gap-[18px]">
        <div className="flex min-w-0 items-center gap-2"><Label className="whitespace-nowrap text-[11px] text-ink-soft" htmlFor={speedControlId}>Tốc độ nghe</Label><Select value={speed} onValueChange={value => { setSpeed(value); if (audio.current) audio.current.playbackRate = Number(value); }}><SelectTrigger id={speedControlId} className="h-[30px] w-[58px] rounded-lg border-bronze/55 bg-paper-deep px-[9px] text-[11px] font-semibold text-ink shadow-sm min-[421px]:w-[78px]" aria-describedby={`${speedControlId}-hint`}><SelectValue>{speed}×</SelectValue></SelectTrigger><SelectContent className="border-line bg-paper-soft font-sans text-ink">{["0.75", "1", "1.25", "1.5", "2"].map(value => <SelectItem key={value} value={value}>{value}×</SelectItem>)}</SelectContent></Select><span id={`${speedControlId}-hint`} className="sr-only">1× là tốc độ gốc. Chọn giá trị nhỏ hơn để nghe chậm hoặc lớn hơn để nghe nhanh.</span></div>
        <div className="flex w-[65px] items-center gap-[5px] min-[421px]:w-[85px] min-[421px]:gap-2 min-[1051px]:w-28 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-ink-soft"><SpeakerHigh aria-hidden="true" /><Slider className={`${compactSlider} w-11 min-[421px]:w-[60px] min-[1051px]:w-[86px]`} aria-label="Âm lượng" min={0} max={1} step={.05} value={[volume]} onValueChange={([value]) => { setVolume(value); if (audio.current) audio.current.volume = value; }} /></div>
      </div>    </div> : <LibrarySelect id={`speed-${narrationId}`} label="Tốc độ nghe" value={speed} onChange={(value) => { if (!value) return; setSpeed(value); if (audio.current) audio.current.playbackRate = Number(value); }} options={["0.75", "1", "1.25", "1.5", "2"].map((value) => ({ id: value, name: `${value}×` }))} allLabel="Chọn tốc độ" />}
    {audioError && <p role="alert" className="text-sm text-destructive">Không tải được tệp âm thanh. Vui lòng thử mở bản thu lại.</p>}
  </div>;
}

export function PodcastPlayer({ chapter }: { chapter: LibraryChapter }): ReactElement | null {
  const session = useCurrentUser();
  const available = chapter.narrations.filter((value) => value.available);
  const [choice, setChoice] = useState("");
  const selected = available.find((value) => value.id === choice) ?? available[0];
  const detail = useQuery({ queryKey: ["library-episode", chapter.slug], queryFn: ({ signal }) => libraryService.episode(chapter.slug, signal) });
  if (!session.isPending && !session.isError && !session.data) return null;
  return <div className="space-y-5 rounded-xl border border-line bg-paper-soft p-5 md:p-6"><div className="flex items-start gap-3"><Headphones size={25} className="shrink-0 text-bronze-dark" aria-hidden="true" /><div><p className="text-xs text-muted-foreground">Đang chọn nghe</p><h3 className="mt-1 font-semibold leading-6">{chapter.title}</h3></div></div>
    {available.length > 1 && <LibrarySelect id={`voice-${chapter.id}`} label="Góc kể" value={selected?.id ?? ""} onChange={setChoice} options={available.map((value) => ({ id: value.id, name: value.type === "FIRST_PERSON" ? "Lời kể nhân vật" : "Người dẫn chuyện" }))} />}
    {session.isPending ? <LibraryState loading /> : session.isError ? <LibraryState error title="Chưa kiểm tra được tài khoản" retry={() => { void session.refetch(); }} /> : session.data && selected ? <AudioPlayback key={`${selected.id}-${session.data.id}`} narrationId={selected.id} userId={session.data.id} /> : <p className="text-sm text-muted-foreground">Bản thu của chương này chưa sẵn sàng.</p>}
    <PublicationNoticeView info={detail.data?.publicationInfo} />
    {detail.data?.hasQuiz && <EpisodeQuiz key={session.data?.id ?? "guest"} slug={chapter.slug} signedIn={Boolean(session.data)} />}
  </div>;
}
