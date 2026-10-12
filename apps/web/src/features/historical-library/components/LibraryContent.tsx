import { TableRow, TableCell, TableHead } from "@/shared/components/ui/table";
import { EmptyTableRow, ModeratorTable, tableCell } from "@/features/moderator/components/ModeratorTable";
import type { SelectedHistoryNode } from "../types";
import { LibraryStatusBadge } from "./LibraryStatusBadge";

export function LibraryContent({ selected }: { selected: SelectedHistoryNode | null }) {
  if (!selected) return null;
  return <section aria-label="Nội dung lịch sử đang chọn" className="flex min-w-0 flex-col gap-4 font-moderator">
    <header>
      <p className="mb-2 text-xs text-mod-text-secondary">{selected.period.name}{selected.type !== "period" ? " / " + selected.stage.name : ""}</p>
      <div className="flex flex-wrap items-center gap-3"><h2 className="text-lg font-bold text-mod-text">{selected.node.name}</h2><LibraryStatusBadge status={selected.node.status} /></div>
      <p className="mt-2 text-xs text-mod-text-secondary">{selected.node.timeLabel}{selected.type === "event" ? " · " + selected.event.podcastCount + " tập podcast · Cập nhật " + selected.event.updatedAt : ""}</p>
    </header>
    <p className="max-w-4xl whitespace-pre-wrap text-sm leading-6 text-mod-text-secondary">{selected.node.summary}</p>
    {selected.type === "event" ? <ModeratorTable caption={"Nguồn tư liệu của " + selected.event.name} columns={["Nguồn tư liệu", "Thông tin trích dẫn"]}>
      {selected.event.sources.map((source) => <TableRow key={source.id}><TableHead scope="row" className={tableCell + " font-semibold text-mod-text"}>{source.title}</TableHead><TableCell className={tableCell}>{source.meta}</TableCell></TableRow>)}
      {!selected.event.sources.length ? <EmptyTableRow columns={2}>Sự kiện chưa có nguồn tư liệu. Cần bổ sung nguồn trước khi sản xuất.</EmptyTableRow> : null}
    </ModeratorTable> : null}
  </section>;
}

