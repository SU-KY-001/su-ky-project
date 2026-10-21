import { useEffect, useRef, useState, type ReactElement } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import type { LibraryChapter } from "@repo/shared";
import { Headphones } from "@phosphor-icons/react";
import { Button } from "@/shared/components/ui/button";
import { useCurrentUser } from "@/shared/hooks/useCurrentUser";
import { notify } from "@/shared/lib/notifications";
import { libraryService } from "../../services/libraryService";
import { LibrarySelect, LibraryState } from "./LibraryPrimitives";
import { EpisodeQuiz } from "./EpisodeQuiz";

function AudioPlayback({ narrationId, userId }: { narrationId: string; userId: string }): ReactElement {
  const playback = useQuery({ queryKey: ["library-playback", userId, narrationId], queryFn: ({ signal }) => libraryService.playback(narrationId, signal), staleTime: 0, refetchOnWindowFocus: false });
  const audio = useRef<HTMLAudioElement>(null);
  const queryClient = useQueryClient();
  const [audioError, setAudioError] = useState(false);
  const [speed, setSpeed] = useState("1");
  const progress = useRef({ bits: new Uint8Array(), previous: -1, positionMs: 0, dirty: false, saving: false, failed: false });

  useEffect(() => {
    const value = playback.data;
    if (!value) return;
    const bits = new Uint8Array(Math.ceil(Math.ceil(value.audio.durationMs / 1000) / 8));
    if (value.progress?.playedBitmap) {
      const stored = Uint8Array.from(atob(value.progress.playedBitmap), (c) => c.charCodeAt(0));
      bits.set(stored.subarray(0, bits.length));
    }
    progress.current = { bits, previous: -1, positionMs: value.progress?.positionMs ?? 0, dirty: false, saving: false, failed: false };
    async function save(): Promise<void> {
      const state = progress.current;
      if (!state.dirty || state.saving) return;
      state.saving = true;
      state.dirty = false;
      const bitmap = btoa(Array.from(state.bits, (byte) => String.fromCharCode(byte)).join(""));
      try {
        const result = await libraryService.saveProgress(narrationId, { assetId: value!.audio.assetId, positionMs: state.positionMs, playedBitmap: bitmap });
        state.failed = false;
        if (result.completedAt) {
          void queryClient.invalidateQueries({ queryKey: ["library-missions"] });
          void queryClient.invalidateQueries({ queryKey: ["library-honors"] });
        }
      } catch {
        state.dirty = true;
        if (!state.failed) notify.warning({ title: "Chưa lưu được tiến độ nghe", description: "Bạn vẫn có thể nghe. Hệ thống sẽ thử lưu lại." });
        state.failed = true;
      } finally { state.saving = false; }
    }
    const interval = window.setInterval(() => { void save(); }, Math.max(5000, value.sync.intervalMs));
    const element = audio.current;
    const flush = (): void => { void save(); };
    element?.addEventListener("pause", flush);
    element?.addEventListener("ended", flush);
    return () => { window.clearInterval(interval); element?.removeEventListener("pause", flush); element?.removeEventListener("ended", flush); element?.pause(); void save(); };
  }, [playback.data, narrationId, queryClient]);

  if (playback.isPending) return <LibraryState loading />;
  if (playback.isError) return <LibraryState error title="Chưa mở được bản thu" description="Kiểm tra kết nối hoặc đăng nhập lại để tiếp tục nghe." retry={() => { void playback.refetch(); }} />;
  return <div className="space-y-4">
    <audio ref={audio} controls preload="metadata" className="w-full" src={playback.data.audio.url} onLoadedMetadata={(event) => { event.currentTarget.currentTime = (playback.data.progress?.positionMs ?? 0) / 1000; event.currentTarget.playbackRate = Number(speed); }} onSeeking={() => { progress.current.previous = -1; }} onSeeked={(event) => { progress.current.previous = event.currentTarget.currentTime; }} onError={() => setAudioError(true)} onTimeUpdate={(event) => {
      const element = event.currentTarget;
      const state = progress.current;
      const now = element.currentTime;
      const delta = now - state.previous;
      if (state.previous >= 0 && delta > 0 && delta <= 5 && !element.seeking) {
        for (let second = Math.floor(state.previous); second < Math.floor(now); second++) {
          if (second >= 0 && second < Math.ceil(playback.data.audio.durationMs / 1000)) state.bits[Math.floor(second / 8)] |= 1 << (second % 8);
        }
        state.dirty = true;
      }
      state.positionMs = Math.min(Math.round(now * 1000), playback.data.audio.durationMs);
      state.previous = now;
    }} />
    <LibrarySelect id={`speed-${narrationId}`} label="Tốc độ nghe" value={speed} onChange={(value) => { if (!value) return; setSpeed(value); if (audio.current) audio.current.playbackRate = Number(value); }} options={["0.75", "1", "1.25", "1.5", "2"].map((value) => ({ id: value, name: `${value}×` }))} allLabel="Chọn tốc độ" />
    {audioError && <p role="alert" className="text-sm text-destructive">Không tải được tệp âm thanh. Vui lòng thử mở bản thu lại.</p>}
  </div>;
}

export function PodcastPlayer({ chapter }: { chapter: LibraryChapter }): ReactElement {
  const session = useCurrentUser();
  const available = chapter.narrations.filter((value) => value.available);
  const [choice, setChoice] = useState("");
  const selected = available.find((value) => value.id === choice) ?? available[0];
  const detail = useQuery({ queryKey: ["library-episode", chapter.slug], queryFn: ({ signal }) => libraryService.episode(chapter.slug, signal) });
  return <div className="space-y-5 rounded-xl border border-line bg-paper-soft p-5 md:p-6"><div className="flex items-start gap-3"><Headphones size={25} className="shrink-0 text-bronze-dark" aria-hidden="true" /><div><p className="text-xs text-muted-foreground">Đang chọn nghe</p><h3 className="mt-1 font-semibold leading-6">{chapter.title}</h3></div></div>
    {available.length > 1 && <LibrarySelect id={`voice-${chapter.id}`} label="Góc kể" value={selected?.id ?? ""} onChange={setChoice} options={available.map((value) => ({ id: value.id, name: value.type === "FIRST_PERSON" ? "Lời kể nhân vật" : "Người dẫn chuyện" }))} />}
    {session.isPending ? <LibraryState loading /> : session.isError ? <LibraryState error title="Chưa kiểm tra được tài khoản" retry={() => { void session.refetch(); }} /> : !session.data ? <div className="space-y-4"><p className="text-sm leading-6 text-muted-foreground">Đăng nhập để nghe bản thu và lưu tiến độ của bạn.</p><Button asChild><Link to="/login">Đăng nhập để nghe</Link></Button></div> : selected ? <AudioPlayback key={`${selected.id}-${session.data.id}`} narrationId={selected.id} userId={session.data.id} /> : <p className="text-sm text-muted-foreground">Bản thu của chương này chưa sẵn sàng.</p>}
    {detail.data?.hasQuiz && <EpisodeQuiz key={session.data?.id ?? "guest"} slug={chapter.slug} signedIn={Boolean(session.data)} />}
  </div>;
}
