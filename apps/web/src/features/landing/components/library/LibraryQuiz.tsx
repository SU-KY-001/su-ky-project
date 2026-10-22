import { useState, type ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/shared/hooks/useCurrentUser";
import { libraryService } from "../../services/libraryService";
import { EpisodeQuiz } from "./EpisodeQuiz";
import { LibraryPages, LibrarySelect, LibraryState } from "./LibraryPrimitives";

export function LibraryQuiz(): ReactElement {
  const [page, setPage] = useState(1);
  const [seriesSlug, setSeriesSlug] = useState("");
  const [episodeSlug, setEpisodeSlug] = useState("");
  const session = useCurrentUser();
  const series = useQuery({ queryKey: ["library-quiz-series", page], queryFn: ({ signal }) => libraryService.series({ page }, signal), staleTime: 60000 });
  const playlist = useQuery({ queryKey: ["library-series", seriesSlug], queryFn: ({ signal }) => libraryService.seriesDetail(seriesSlug, signal), enabled: Boolean(seriesSlug) });
  const episode = useQuery({ queryKey: ["library-episode", episodeSlug], queryFn: ({ signal }) => libraryService.episode(episodeSlug, signal), enabled: Boolean(episodeSlug) });
  if (series.isPending) return <LibraryState loading />;
  if (series.isError) return <LibraryState error title="Chưa tải được series để chọn quiz" retry={() => { void series.refetch(); }} />;
  if (!series.data.items.length) return <LibraryState title="Quiz đang được chuẩn bị" description="Câu hỏi sẽ xuất hiện cùng các tập podcast đã phát hành." />;
  return <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"><div className="space-y-5">
    <LibrarySelect id="library-quiz-series" label="Series" value={seriesSlug} allLabel="Chọn series" options={series.data.items.map(item => ({ id: item.slug, name: item.title }))} onChange={value => { setSeriesSlug(value); setEpisodeSlug(""); }} />
    <LibraryPages page={page} limit={series.data.limit} total={series.data.total} onChange={value => { setPage(value); setSeriesSlug(""); setEpisodeSlug(""); }} />
    {seriesSlug && (playlist.isPending ? <LibraryState loading /> : playlist.isError ? <LibraryState error title="Chưa tải được các tập" retry={() => { void playlist.refetch(); }} /> : playlist.data?.episodes.length ? <LibrarySelect id="library-quiz-episode" label="Tập podcast" value={episodeSlug} allLabel="Chọn tập để ôn kiến thức" options={playlist.data.episodes.map(item => ({ id: item.slug, name: item.title }))} onChange={setEpisodeSlug} /> : <LibraryState title="Series chưa có tập đã phát hành" />)}
  </div><div>
    {!episodeSlug ? <LibraryState title="Thử tài cùng một câu chuyện lịch sử." description="Chọn series và tập podcast để khám phá câu hỏi ôn tập." /> : episode.isPending ? <LibraryState loading /> : episode.isError ? <LibraryState error title="Chưa tải được thông tin quiz" retry={() => { void episode.refetch(); }} /> : !episode.data.hasQuiz ? <LibraryState title="Tập này chưa có quiz" description="Bạn có thể chọn một tập podcast khác để tiếp tục ôn tập." /> : <div className="space-y-5 rounded-xl bg-paper-deep/40 p-6"><h3 className="text-xl font-semibold leading-8">{episode.data.title}</h3><p className="text-sm leading-7 text-muted-foreground">Trả lời câu hỏi, ghi nhớ những dấu mốc và xem kết quả của bạn.</p>{session.isPending ? <LibraryState loading /> : session.isError ? <LibraryState error title="Chưa kiểm tra được tài khoản" retry={() => { void session.refetch(); }} /> : <EpisodeQuiz key={`${episodeSlug}-${session.data?.id ?? "guest"}`} slug={episodeSlug} signedIn={Boolean(session.data)} />}</div>}
  </div></div>;
}
