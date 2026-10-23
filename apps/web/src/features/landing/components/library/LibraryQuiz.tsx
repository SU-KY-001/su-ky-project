import { useState, type ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import { Headphones } from "@phosphor-icons/react";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/components/ui/card";
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

  const selectedSeries = series.data.items.find((item) => item.slug === seriesSlug);

  return (
    <Card className="gap-0 border-line bg-paper-soft py-0 shadow-none">
      <CardHeader className="border-b border-line px-5 py-5 sm:px-6">
        <CardTitle className="text-lg text-ink">Chọn bài quiz</CardTitle>
        <CardDescription>Quiz được tạo theo nội dung của từng tập podcast đã phát hành.</CardDescription>
      </CardHeader>

      <CardContent className="grid gap-5 px-5 py-6 sm:grid-cols-2 sm:px-6">
        <div>
          <LibrarySelect
            id="library-quiz-series"
            label="Series"
            value={seriesSlug}
            allLabel="Chọn series"
            options={series.data.items.map((item) => ({ id: item.slug, name: item.title }))}
            onChange={(value) => { setSeriesSlug(value); setEpisodeSlug(""); }}
          />
          <LibraryPages page={page} limit={series.data.limit} total={series.data.total} onChange={(value) => { setPage(value); setSeriesSlug(""); setEpisodeSlug(""); }} />
        </div>

        <div>
          {!seriesSlug ? (
            <LibrarySelect id="library-quiz-episode" label="Tập podcast" value="" allLabel="Chọn series trước" options={[]} onChange={setEpisodeSlug} disabled />
          ) : playlist.isPending ? (
            <LibraryState loading />
          ) : playlist.isError ? (
            <LibraryState error title="Chưa tải được các tập" retry={() => { void playlist.refetch(); }} />
          ) : playlist.data?.episodes.length ? (
            <LibrarySelect id="library-quiz-episode" label="Tập podcast" value={episodeSlug} allLabel="Chọn tập podcast" options={playlist.data.episodes.map((item) => ({ id: item.slug, name: item.title }))} onChange={setEpisodeSlug} />
          ) : (
            <p className="py-7 text-sm text-ink-soft">Series này chưa có tập đã phát hành.</p>
          )}
        </div>
      </CardContent>

      <CardFooter className="min-h-36 border-t border-line bg-paper px-5 py-5 sm:px-6">
        {!episodeSlug ? (
          <p className="text-sm leading-6 text-ink-soft">Chọn series và tập podcast để xem bài quiz tương ứng.</p>
        ) : episode.isPending ? (
          <div className="w-full"><LibraryState loading /></div>
        ) : episode.isError ? (
          <div className="w-full"><LibraryState error title="Chưa tải được thông tin quiz" retry={() => { void episode.refetch(); }} /></div>
        ) : !episode.data.hasQuiz ? (
          <div className="w-full"><LibraryState title="Tập này chưa có quiz" description="Bạn có thể chọn một tập podcast khác." /></div>
        ) : (
          <div className="flex w-full flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-line bg-paper-soft text-ink-soft"><Headphones aria-hidden="true" /> Quiz sau khi nghe</Badge>
                <span className="text-xs text-ink-soft">{selectedSeries?.title}</span>
              </div>
              <h3 className="mt-2 text-lg font-semibold leading-7 text-ink">{episode.data.title}</h3>
            </div>

            {session.isPending ? (
              <div className="w-full sm:w-48"><LibraryState loading /></div>
            ) : session.isError ? (
              <div className="w-full"><LibraryState error title="Chưa kiểm tra được tài khoản" retry={() => { void session.refetch(); }} /></div>
            ) : (
              <EpisodeQuiz key={`${episodeSlug}-${session.data?.id ?? "guest"}`} slug={episodeSlug} signedIn={Boolean(session.data)} />
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
