import { useState, type ReactElement } from "react";
import { Exam, FilePdf, Lightning, PlusSquare, Sparkle, type Icon } from "@phosphor-icons/react";
import { useReducedMotion } from "motion/react";
import { DashboardHeader } from "@/shared/components/dashboard/DashboardOverview";
import { DashboardTableCard } from "@/shared/components/dashboard/DashboardTableCard";
import { DashboardDataTable, DashboardEmptyTableRow, dashboardTableCell } from "@/shared/components/dashboard/DashboardDataTable";
import { DashboardPagination } from "@/shared/components/dashboard/DashboardPagination";
import { DashboardRowActions } from "@/shared/components/dashboard/DashboardRowActions";
import { CardBadge } from "@/shared/components/dashboard/CardBadge";
import { Button } from "@/shared/components/ui/button";
import { MagicCard } from "@/shared/components/ui/magic-card";
import { InteractiveHoverButton } from "@/shared/components/ui/interactive-hover-button";
import { TableCell, TableRow } from "@/shared/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { notify } from "@/shared/lib/notifications";
import { ModeratorListToolbar } from "./ModeratorListToolbar";
import { quizPreviewData, type QuizPreview } from "../quizPreviewData";

interface QuizQuickTool {
  id: string;
  title: string;
  description: string;
  action: string;
  icon: Icon;
  assisted: boolean;
}

const quickTools: QuizQuickTool[] = [
  { id: "manual", title: "Tự tay tạo bộ quiz", description: "Bắt đầu từ ý tưởng của bạn, viết câu hỏi theo cách riêng.", action: "Tạo mới", icon: PlusSquare, assisted: false },
  { id: "ai", title: "Biến ý tưởng thành quiz với AI", description: "Tạo nhanh câu hỏi từ chủ đề hoặc nội dung podcast.", action: "Bắt đầu tạo", icon: Sparkle, assisted: true },
  { id: "pdf", title: "Tạo quiz từ tài liệu PDF", description: "Chuyển tài liệu của bạn thành bộ câu hỏi ôn tập.", action: "Tải PDF lên", icon: FilePdf, assisted: true },
];

const PAGE_SIZE = 5;
const dateFormatter = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });

function QuizQuickTools(): ReactElement {
  const reducedMotion = useReducedMotion();
  return (
    <section aria-labelledby="quiz-tools-heading" className="space-y-3">
      <h2 id="quiz-tools-heading" className="text-base font-bold text-mod-text">Bắt đầu với công cụ tạo nhanh</h2>
      <div className="grid gap-4 xl:grid-cols-3">
        {quickTools.map(({ id, title, description, action, icon: ToolIcon, assisted }) => (
          <article key={id} className="min-w-0 rounded-xl shadow-mod-quiz">
            <MagicCard mode="orb" glowFrom="var(--modPrimary)" glowTo="var(--color-mod-quiz-surface)" glowOpacity={reducedMotion ? 0 : 0.05} glowBlur={45} glowSize={240} gradientFrom="var(--color-mod-quiz-surface)" gradientTo="var(--color-mod-quiz-surface)" className="h-full rounded-xl border-0 [--background:var(--modQuizSurface)] [--color-background:var(--modQuizSurface)] [--color-border:transparent] [&>div:last-child]:h-full">
            <div className="flex h-full min-h-36 flex-col justify-between gap-3 p-4 text-mod-text">
            <div className="flex items-start gap-3">
              <span className="grid size-7 shrink-0 place-items-center text-mod-primary"><ToolIcon size={24} weight="regular" aria-hidden="true" /></span>
              <div className="min-w-0"><h3 className="text-sm font-bold leading-5">{title}</h3><p className="mt-1 text-xs leading-5 text-mod-text-secondary">{description}</p></div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              {assisted ? <span className="inline-flex items-center gap-1 text-[11px] font-medium text-mod-primary"><Lightning size={12} weight="fill" aria-hidden="true" />AI hỗ trợ</span> : <span className="text-[11px] font-medium text-mod-text-secondary">Tự do sáng tạo</span>}
              <InteractiveHoverButton className="min-h-9 px-3 py-1.5 text-xs! text-mod-primary [--color-primary-foreground:var(--color-paper-soft)]" onClick={() => notify.info({ title: `${action} — Bản xem trước`, description: "Chức năng tạo quiz sẽ được bổ sung sau." })}>{action}</InteractiveHoverButton>
            </div>
            </div>
            </MagicCard>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ModeratorQuizzes(): ReactElement {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<QuizPreview | null>(null);
  const filtered = quizPreviewData.filter((quiz) => (status === "all" || quiz.status === status) && `${quiz.title} ${quiz.episode}`.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi")));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex min-w-0 flex-col gap-6 font-moderator">
      <DashboardHeader eyebrow="KHÔNG GIAN SÁNG TẠO" title="Tạo quiz" description="Biến mỗi câu chuyện lịch sử thành một trải nghiệm ôn tập thú vị." />
      <QuizQuickTools />
      <DashboardTableCard title="Bộ quiz đã tạo" description="Tìm kiếm và xem lại các bộ câu hỏi của bạn." summary={`${quizPreviewData.length} bộ quiz mẫu`}
        toolbar={<ModeratorListToolbar searchLabel="Tìm tên quiz hoặc tập podcast" searchValue={search} onSearchChange={(value) => { setSearch(value); setPage(1); }} filters={[{ id: "quiz-status", label: "Trạng thái quiz", value: status, onValueChange: (value) => { setStatus(value); setPage(1); }, options: [{ value: "all", label: "Tất cả trạng thái" }, { value: "draft", label: "Bản nháp" }, { value: "ready", label: "Sẵn sàng" }] }]} />}
        footer={<DashboardPagination page={page} limit={PAGE_SIZE} total={filtered.length} itemLabel="bộ quiz" onPageChange={setPage} />}>
        <DashboardDataTable embedded caption="Danh sách bộ quiz mẫu" columns={["Tên bộ quiz", "Số câu hỏi", "Cách tạo", "Trạng thái", "Cập nhật", "Thao tác"]} columnWidths={["35%", "11%", "12%", "13%", "13%", "16%"]} minWidth={980}>
          {visible.length ? visible.map((quiz) => (
            <TableRow key={quiz.id} className="border-mod-border hover:bg-mod-canvas-accent/60">
              <TableCell className={dashboardTableCell}><div className="flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-lg border border-mod-primary/10 bg-mod-primary/5 text-mod-primary"><Exam size={21} aria-hidden="true" /></span><div className="min-w-0"><p className="whitespace-normal break-words text-sm font-semibold leading-6">{quiz.title}</p><p className="mt-0.5 whitespace-normal break-words text-xs leading-5 text-mod-text-secondary">{quiz.episode}</p></div></div></TableCell>
              <TableCell className={`${dashboardTableCell} text-sm tabular-nums`}>{quiz.questions} câu</TableCell>
              <TableCell className={`${dashboardTableCell} whitespace-normal text-xs`}>{quiz.method}</TableCell>
              <TableCell className={dashboardTableCell}><CardBadge type="status" tone={quiz.status === "ready" ? "success" : "neutral"}>{quiz.status === "ready" ? "Sẵn sàng" : "Bản nháp"}</CardBadge></TableCell>
              <TableCell className={`${dashboardTableCell} text-xs tabular-nums`}>{dateFormatter.format(new Date(`${quiz.updatedAt}T00:00:00+07:00`))}</TableCell>
              <TableCell className={dashboardTableCell}><DashboardRowActions label={quiz.title} actions={[{ id: "detail", label: "Xem chi tiết", onSelect: () => setSelected(quiz) }]} /></TableCell>
            </TableRow>
          )) : <DashboardEmptyTableRow columns={6}>Không tìm thấy bộ quiz phù hợp. Hãy thử tên hoặc trạng thái khác.</DashboardEmptyTableRow>}
        </DashboardDataTable>
      </DashboardTableCard>
      <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="border-mod-border bg-mod-surface font-moderator text-mod-text">
          <DialogHeader><DialogTitle>{selected?.title}</DialogTitle><DialogDescription>Thông tin minh họa của bộ quiz trong bản xem trước giao diện.</DialogDescription></DialogHeader>
          {selected && <dl className="grid grid-cols-2 gap-5 py-3 text-sm"><div className="col-span-2"><dt className="text-mod-text-secondary">Tập podcast</dt><dd className="mt-1 font-semibold">{selected.episode}</dd></div><div><dt className="text-mod-text-secondary">Số câu hỏi</dt><dd className="mt-1 font-semibold">{selected.questions} câu</dd></div><div><dt className="text-mod-text-secondary">Cách tạo</dt><dd className="mt-1 font-semibold">{selected.method}</dd></div><div><dt className="text-mod-text-secondary">Trạng thái</dt><dd className="mt-1">{selected.status === "ready" ? "Sẵn sàng" : "Bản nháp"}</dd></div><div><dt className="text-mod-text-secondary">Cập nhật</dt><dd className="mt-1">{dateFormatter.format(new Date(`${selected.updatedAt}T00:00:00+07:00`))}</dd></div></dl>}
          <div className="flex justify-end"><Button type="button" variant="outline" onClick={() => setSelected(null)}>Đóng</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
