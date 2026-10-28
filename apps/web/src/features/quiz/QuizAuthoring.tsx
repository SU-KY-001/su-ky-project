import { useState, type ReactElement } from "react";
import { PencilSimple } from "@phosphor-icons/react/dist/icons/PencilSimple";
import { ArrowLeft } from "@phosphor-icons/react/dist/icons/ArrowLeft";
import { Headphones } from "@phosphor-icons/react/dist/icons/Headphones";
import { Plus } from "@phosphor-icons/react/dist/icons/Plus";
import { Exam } from "@phosphor-icons/react/dist/icons/Exam";
import { Button } from "@/shared/components/ui/button";
import { DashboardHeader } from "@/shared/components/dashboard/DashboardOverview";
import { DashboardTableCard } from "@/shared/components/dashboard/DashboardTableCard";
import { DashboardDataTable, DashboardEmptyTableRow, dashboardTableCell } from "@/shared/components/dashboard/DashboardDataTable";
import { DashboardRowActions } from "@/shared/components/dashboard/DashboardRowActions";
import { DashboardPagination } from "@/shared/components/dashboard/DashboardPagination";
import { TableCell, TableRow } from "@/shared/components/ui/table";
import { ModeratorSelect } from "@/features/moderator/components/ModeratorSelect";
import { ModeratorListToolbar } from "@/features/moderator/components/ModeratorListToolbar";
import { useQuizList, useQuizSeries, useQuizSeriesDetail, useQuizWorkspace } from "./useQuiz";
import { QuizEditor } from "./QuizEditor";

function ErrorState({ message, retry }: { message: string; retry: () => void }): ReactElement {
  return <div className="rounded-lg border border-mod-border bg-mod-surface p-6 text-sm"><p role="alert" className="text-mod-danger">{message}</p><Button className="mt-3" variant="outline" onClick={retry}>Thử lại</Button></div>;
}
function OpenEditor({ episodeId, onBack }: { episodeId: string; onBack: () => void }): ReactElement {
  const workspace = useQuizWorkspace(episodeId);
  if (workspace.isPending) return <p role="status" className="p-6">Đang tải bộ quiz và kịch bản…</p>;
  if (workspace.isError && !workspace.data) return <><Button variant="ghost" onClick={onBack}><ArrowLeft />Quay lại</Button><ErrorState message={workspace.error.message} retry={() => void workspace.refetch()} /></>;
  if (!workspace.data) return <p role="status">Đang tải bộ quiz…</p>;
  return <QuizEditor key={episodeId} initial={workspace.data} onBack={onBack} />;
}
function ChooseEpisode({ onOpen, onBack }: { onOpen: (episodeId: string) => void; onBack: () => void }): ReactElement {
  const [seriesId, setSeriesId] = useState("");
  const [episodeId, setEpisodeId] = useState("");
  const series = useQuizSeries();
  const detail = useQuizSeriesDetail(seriesId);
  const rows = series.data?.pages.flatMap(p => p.items) ?? [];
  return <section className="mx-auto w-full max-w-3xl font-moderator"><Button variant="ghost" onClick={onBack} className="mb-6"><ArrowLeft />Quay lại</Button><div className="rounded-xl border border-mod-border bg-mod-surface p-6 sm:p-8"><span className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-mod-primary/5 text-mod-primary"><PencilSimple size={26} /></span><h1 className="text-2xl font-bold">Tự soạn bộ quiz</h1><p className="mt-2 text-sm leading-6 text-mod-text-secondary">Chọn tập podcast để gắn bộ câu hỏi. Bắt đầu với câu hỏi trống và viết theo nội dung bạn muốn ôn tập.</p><div className="mt-8 space-y-6">
    {series.isError ? <ErrorState message={series.error.message} retry={() => void series.refetch()} /> : <div><label className="mb-2 block text-sm font-semibold" htmlFor="quiz-series">Series podcast</label><ModeratorSelect id="quiz-series" label="Series podcast" value={seriesId} onValueChange={value => { setSeriesId(value); setEpisodeId(""); }} options={rows.map(s => ({ value: s.id, label: s.title }))} placeholder={series.isPending ? "Đang tải series…" : "Chọn series"} disabled={series.isPending} />{!series.isPending && !rows.length && <p className="mt-2 text-xs text-mod-text-secondary">Bạn chưa có series. Hãy tạo series trong phần Sản xuất podcast trước.</p>}{series.hasNextPage && <Button className="mt-2" variant="ghost" disabled={series.isFetchingNextPage} onClick={() => void series.fetchNextPage()}>Tải thêm series</Button>}</div>}
    {detail.isError ? <ErrorState message={detail.error.message} retry={() => void detail.refetch()} /> : <div><label className="mb-2 block text-sm font-semibold" htmlFor="quiz-episode">Tập podcast</label><ModeratorSelect id="quiz-episode" label="Tập podcast" value={episodeId} onValueChange={setEpisodeId} options={(detail.data?.episodes ?? []).map(e => ({ value: e.id, label: `${e.sortOrder}. ${e.title}${e.status === "DRAFT" ? " · Bản nháp" : ""}` }))} placeholder={!seriesId ? "Chọn series trước" : detail.isPending ? "Đang tải tập…" : "Chọn tập podcast"} disabled={!seriesId || detail.isPending} />{detail.data && !detail.data.episodes.length && <p className="mt-2 text-xs text-mod-text-secondary">Series chưa có tập podcast.</p>}</div>}
    <div className="flex justify-end border-t border-mod-border pt-5"><Button disabled={!episodeId} onClick={() => onOpen(episodeId)}>Mở trình soạn<Plus /></Button></div>
  </div></div></section>;
}
export function QuizAuthoring(): ReactElement {
  const [choosingEpisode, setChoosingEpisode] = useState(false);
  const [episodeId, setEpisodeId] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const quizzes = useQuizList();
  const back = (): void => { setEpisodeId(""); setChoosingEpisode(false); };
  if (episodeId) return <OpenEditor episodeId={episodeId} onBack={back} />;
  if (choosingEpisode) return <ChooseEpisode onOpen={setEpisodeId} onBack={back} />;
  const filtered = (quizzes.data?.items ?? []).filter(q => `${q.title} ${q.episodeTitle} ${q.seriesTitle}`.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi")) && (status === "all" || (q.active ? "ready" : "draft") === status));
  const visible = filtered.slice((page - 1) * 10, page * 10);
  return <div className="flex min-w-0 flex-col gap-6 font-moderator">
    <DashboardHeader eyebrow="KHÔNG GIAN SÁNG TẠO" title="Tạo quiz" description="Biến câu chuyện trong mỗi tập podcast thành bộ câu hỏi để người nghe ôn tập." />
    {quizzes.isError ? <ErrorState message={quizzes.error.message} retry={() => void quizzes.refetch()} /> : <DashboardTableCard title="Bộ quiz của bạn" description="Tiếp tục biên tập hoặc xem lại bộ câu hỏi đã lưu." summary={quizzes.isPending ? "Đang tải…" : `${quizzes.data.items.length} bộ quiz`}
      toolbar={<ModeratorListToolbar searchLabel="Tìm quiz, series hoặc tập podcast" searchValue={search} onSearchChange={v => { setSearch(v); setPage(1); }} filters={[{ id: "quiz-status", label: "Trạng thái quiz", value: status, onValueChange: v => { setStatus(v); setPage(1); }, options: [{ value: "all", label: "Tất cả trạng thái" }, { value: "draft", label: "Bản nháp" }, { value: "ready", label: "Đang sử dụng" }] }]} actions={<Button className="h-10 px-4" onClick={() => setChoosingEpisode(true)}><Plus />Tạo quiz</Button>} />}
      footer={<DashboardPagination page={page} limit={10} total={filtered.length} itemLabel="bộ quiz" onPageChange={setPage} />}>
      <DashboardDataTable embedded responsive caption="Danh sách bộ quiz" columns={["Tên bộ quiz", "Số câu", "Cập nhật", "Thao tác"]} minWidth={0}>
        {visible.map(q => <TableRow key={q.episodeId}><TableCell data-label="Tên bộ quiz" className={dashboardTableCell}><div className="flex items-center gap-3"><Exam size={24} className="shrink-0 text-mod-primary" /><div><p className="whitespace-normal break-words font-semibold">{q.title}</p><p className="mt-1 flex items-start gap-1 text-xs text-mod-text-secondary"><Headphones className="mt-0.5 shrink-0" /><span className="whitespace-normal break-words">{q.episodeTitle}</span></p></div></div></TableCell><TableCell data-label="Số câu" className={dashboardTableCell}>{q.questions}</TableCell><TableCell data-label="Cập nhật" className={dashboardTableCell}>{q.updatedAt.toLocaleDateString("vi-VN")}</TableCell><TableCell data-label="Thao tác" className={dashboardTableCell}><DashboardRowActions label={q.title} actions={[{ id: "edit", label: "Tiếp tục soạn", onSelect: () => { setEpisodeId(q.episodeId); } }]} /></TableCell></TableRow>)}
        {!visible.length && <DashboardEmptyTableRow columns={4}>{quizzes.isPending ? "Đang tải bộ quiz…" : search || status !== "all" ? "Không tìm thấy quiz phù hợp." : "Chưa có bộ quiz. Chọn “Tạo quiz” để bắt đầu soạn câu hỏi."}</DashboardEmptyTableRow>}
      </DashboardDataTable>
    </DashboardTableCard>}
  </div>;
}
