import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ExhibitionPodcastOption } from "@repo/shared";
import { AudioPlayback } from "@/features/landing";
import { useCurrentUser } from "@/shared/hooks/useCurrentUser";
import { Button } from "@/shared/components/ui/button";
import { exhibitionService } from "../services/exhibitionService";

export function ArtworkPodcastPicker({ value, selectedLabel, ready, onChange }: { value: string | null; selectedLabel?: string; ready: boolean; onChange: (option: ExhibitionPodcastOption | null) => void }) {
  const [seriesId, setSeriesId] = useState("");
  const [seriesPage, setSeriesPage] = useState(1);
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState(false);
  const session = useCurrentUser();
  const series = useQuery({ queryKey: ["exhibition-series", seriesPage], queryFn: () => exhibitionService.series(seriesPage), enabled: ready });
  const options = useQuery({ queryKey: ["exhibition-podcasts", seriesId, page], queryFn: () => exhibitionService.podcastOptions("", page, seriesId), enabled: ready && !!seriesId });
  return <fieldset disabled={!ready} className="space-y-3 rounded-md border border-mod-border p-3">
    <legend className="px-1 text-sm font-semibold">Podcast của tranh</legend>
    {!ready && <p className="text-xs text-mod-text-secondary">Thêm ảnh và tiêu đề trước khi chọn podcast.</p>}
    {value && selectedLabel && <p className="text-xs leading-6 text-mod-text-secondary">Đang chọn: {selectedLabel}</p>}
    <label className="block text-sm">Series<select aria-label="Chọn series podcast" value={seriesId} onChange={event => { setSeriesId(event.target.value); setPage(1); setPreview(false); onChange(null); }} className="mt-2 w-full rounded-md border border-mod-border bg-mod-surface p-2"><option value="">Chọn series</option>{series.data?.items.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
    {series.isPending && ready && <p role="status" className="text-xs">Đang tải series…</p>}
    {series.isError && <Button type="button" variant="link" onClick={() => void series.refetch()}>Tải lại series</Button>}
    {series.data && series.data.total > series.data.limit && <div className="flex gap-2"><Button type="button" variant="ghost" size="sm" disabled={seriesPage === 1} onClick={() => setSeriesPage(seriesPage - 1)}>Series trước</Button><Button type="button" variant="ghost" size="sm" disabled={seriesPage * series.data.limit >= series.data.total} onClick={() => setSeriesPage(seriesPage + 1)}>Series sau</Button></div>}
    {seriesId && <><label className="block text-sm">Podcast<select aria-label="Chọn podcast" value={options.data?.items.some(item => item.id === value) ? value ?? "" : ""} onChange={event => { onChange(options.data?.items.find(item => item.id === event.target.value) ?? null); setPreview(false); }} className="mt-2 w-full rounded-md border border-mod-border bg-mod-surface p-2"><option value="">Chọn podcast</option>{options.data?.items.map(item => <option key={item.id} value={item.id}>{item.episodeTitle} · {item.narrationLabel}</option>)}</select></label>
    {options.isPending && <p role="status" className="text-xs">Đang tải podcast…</p>}{options.isError && <Button type="button" variant="link" onClick={() => void options.refetch()}>Tải lại podcast</Button>}{options.data?.total === 0 && <p className="text-xs text-mod-text-secondary">Series chưa có podcast công khai khả dụng.</p>}
    {options.data && options.data.total > options.data.limit && <div className="flex gap-2"><Button type="button" variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Trước</Button><Button type="button" variant="ghost" size="sm" disabled={page * options.data.limit >= options.data.total} onClick={() => setPage(page + 1)}>Sau</Button></div>}</>}
    {value && <><div className="flex gap-2"><Button type="button" size="sm" variant="outline" onClick={() => setPreview(!preview)}>{preview ? "Đóng nghe trước" : "Nghe trước podcast"}</Button><Button type="button" variant="ghost" size="sm" onClick={() => { onChange(null); setPreview(false); }}>Bỏ podcast</Button></div>{preview && session.data && <AudioPlayback key={value} narrationId={value} userId={session.data.id} />}</>}
  </fieldset>;
}
