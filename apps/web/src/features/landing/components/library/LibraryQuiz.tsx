import { useState, type ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, Headphones, Trophy } from "@phosphor-icons/react";
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
    <div className="border-y border-line bg-paper-soft/45">
      <div className="grid lg:grid-cols-[minmax(280px,0.72fr)_minmax(0,1.28fr)]">
        <div className="border-b border-line bg-paper-deep/25 px-5 py-7 sm:px-7 lg:border-b-0 lg:border-r lg:py-9">
          <div className="mb-7">
            <p className="text-xs font-medium text-bronze-dark">Chọn nội dung</p>
            <h3 className="mt-2 text-xl font-semibold leading-7 text-ink">Bạn muốn ôn tập câu chuyện nào?</h3>
            <p className="mt-2 text-sm leading-6 text-ink-soft">Chọn series trước, sau đó chọn một tập podcast.</p>
          </div>

          <div>
            <div className="border-t border-line py-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="font-mono text-xs text-vermilion">01</span>
                <span className="text-sm font-medium text-ink">Series</span>
                {seriesSlug && <CheckCircle size={17} weight="fill" className="ml-auto text-bronze-dark" aria-label="Đã chọn series" />}
              </div>
              <LibrarySelect id="library-quiz-series" label="Câu chuyện lịch sử" value={seriesSlug} allLabel="Chọn một series" options={series.data.items.map((item) => ({ id: item.slug, name: item.title }))} onChange={(value) => { setSeriesSlug(value); setEpisodeSlug(""); }} />
              <LibraryPages page={page} limit={series.data.limit} total={series.data.total} onChange={(value) => { setPage(value); setSeriesSlug(""); setEpisodeSlug(""); }} />
            </div>

            <div className="border-t border-line py-5">
              <div className="mb-3 flex items-center gap-2">
                <span className={`font-mono text-xs ${seriesSlug ? "text-vermilion" : "text-ink-soft"}`}>02</span>
                <span className="text-sm font-medium text-ink">Tập podcast</span>
                {episodeSlug && <CheckCircle size={17} weight="fill" className="ml-auto text-bronze-dark" aria-label="Đã chọn tập" />}
              </div>
              {!seriesSlug ? (
                <p className="py-3 text-xs leading-5 text-ink-soft">Hoàn tất bước 01 để xem các tập đã phát hành.</p>
              ) : playlist.isPending ? (
                <LibraryState loading />
              ) : playlist.isError ? (
                <LibraryState error title="Chưa tải được các tập" retry={() => { void playlist.refetch(); }} />
              ) : playlist.data?.episodes.length ? (
                <LibrarySelect id="library-quiz-episode" label="Tập muốn ôn luyện" value={episodeSlug} allLabel="Chọn một tập podcast" options={playlist.data.episodes.map((item) => ({ id: item.slug, name: item.title }))} onChange={setEpisodeSlug} />
              ) : (
                <p className="py-3 text-xs leading-5 text-ink-soft">Series này chưa có tập đã phát hành.</p>
              )}
            </div>
          </div>
        </div>

        <div className="min-h-[390px] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
          {!episodeSlug ? (
            <div className="flex h-full min-h-[320px] max-w-xl flex-col justify-center">
              <p className="text-xs font-medium text-bronze-dark">Thử tài lịch sử</p>
              <h3 className="mt-3 text-2xl font-semibold leading-tight text-ink sm:text-3xl">Nghe để hiểu, trả lời để nhớ.</h3>
              <p className="mt-4 text-sm leading-7 text-ink-soft">Sau khi bạn chọn một tập podcast, phần giới thiệu và bài quiz của tập đó sẽ xuất hiện ở đây.</p>
              <div className="mt-8 h-px w-20 bg-bronze" aria-hidden="true" />
            </div>
          ) : episode.isPending ? (
            <LibraryState loading />
          ) : episode.isError ? (
            <LibraryState error title="Chưa tải được thông tin quiz" retry={() => { void episode.refetch(); }} />
          ) : !episode.data.hasQuiz ? (
            <LibraryState title="Tập này chưa có quiz" description="Bạn có thể chọn một tập podcast khác để tiếp tục ôn tập." />
          ) : (
            <div className="flex h-full min-h-[320px] max-w-2xl flex-col justify-center">
              <p className="text-xs font-medium text-bronze-dark">Quiz đã sẵn sàng</p>
              <p className="text-xs leading-5 text-ink-soft">{selectedSeries?.title}</p>
              <h3 className="mt-2 max-w-xl text-2xl font-semibold leading-tight text-ink sm:text-3xl">{episode.data.title}</h3>
              <p className="mt-4 max-w-lg text-sm leading-7 text-ink-soft">Một bài ôn ngắn dựa trên nội dung tập. Sau khi nộp, bạn có thể xem đáp án và lời giải.</p>

              <div className="my-7 flex flex-wrap gap-x-6 gap-y-2 border-y border-line py-4 text-xs text-ink-soft">
                <span className="flex items-center gap-2"><Headphones size={17} className="text-bronze-dark" aria-hidden="true" /> Nội dung từ tập podcast</span>
                <span className="flex items-center gap-2"><Trophy size={17} className="text-bronze-dark" aria-hidden="true" /> Có điểm và lời giải</span>
              </div>

              {session.isPending ? (
                <LibraryState loading />
              ) : session.isError ? (
                <LibraryState error title="Chưa kiểm tra được tài khoản" retry={() => { void session.refetch(); }} />
              ) : (
                <EpisodeQuiz key={`${episodeSlug}-${session.data?.id ?? "guest"}`} slug={episodeSlug} signedIn={Boolean(session.data)} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
