import { Fragment, useState, type ReactNode } from "react";
import { Eye, Plus } from "@phosphor-icons/react";
import { DashboardRowActions } from "@/shared/components/dashboard/DashboardRowActions";
import type {
  HistoricalPeriodDetailDto,
  HistoricalPhaseDetailDto,
  HistoricalEntityDetailDto,
} from "@repo/shared";
import { Button } from "@/shared/components/ui/button";
import { TableRow, TableCell, TableHead } from "@/shared/components/ui/table";
import { Dialog, DialogTrigger } from "@/shared/components/ui/dialog";
import {
  ModeratorTable,
  InteractiveTableRow,
  EmptyTableRow,
  tableCell,
  primaryAction,
} from "@/features/moderator/components/ModeratorTable";
import {
  ModeratorTreeNode,
  ContentKindLegend,
  ContentKindIcon,
} from "@/features/moderator/components/ModeratorTreeNode";
import { ModeratorSectionPanel } from "@/features/moderator/components/ModeratorSectionPanel";
import { ModeratorListToolbar } from "@/features/moderator/components/ModeratorListToolbar";
import {
  useHistoricalPeriods,
  useHistoricalPhases,
  useHistoricalEntities,
  useHistoricalSummary,
} from "../hooks/useHistoricalCatalog";
import {
  CreateHistoricalContentDialog,
  type HistoricalNodeDto,
} from "./CreateHistoricalContentDialog";
import type {
  HistoricalKind,
  CatalogFilter,
} from "../services/historicalCatalogService";
import { HistoricalBranchDetailDialog } from "./HistoricalBranchDetailDialog";
import { LibraryStatusBadge } from "./LibraryStatusBadge";
import { cn } from "@/lib/utils";

type TreeContext = {
  expanded: Set<string>;
  toggle: (id: string) => void;
  openDetail: (period: HistoricalPeriodDetailDto) => void;
  filter: CatalogFilter;
  kindFilter: string;
};
function LoadRows({
  pending,
  error,
  empty,
  more,
  onMore,
}: {
  pending: boolean;
  error: Error | null;
  empty: boolean;
  more?: boolean;
  onMore?: () => void;
}) {
  return (
    <>
      {pending ? (
        <EmptyTableRow columns={6} compact>Đang tải nội dung…</EmptyTableRow>
      ) : error ? (
        <EmptyTableRow columns={6} compact>
          <span role="alert">{error.message}</span>
          <Button type="button" onClick={onMore} variant="ghost">
            Thử lại
          </Button>
        </EmptyTableRow>
      ) : empty ? (
        <EmptyTableRow columns={6} compact>
          Chưa có nội dung phù hợp trong nhánh này.
        </EmptyTableRow>
      ) : null}
      {more ? (
        <TableRow>
          <TableCell colSpan={6}>
            <Button type="button" variant="ghost" onClick={onMore}>
              Tải thêm nội dung
            </Button>
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}
function Cells({
  kind,
  node,
  ctx,
}: {
  kind: HistoricalKind;
  node: HistoricalNodeDto;
  ctx: TreeContext;
}) {
  return (
    <>
      <TableCell className={cn(tableCell, "align-middle")}>
        {node.timeLabel}
        {node.deletedAt ? (
          <span className="mt-1 block text-xs text-mod-danger">Đã xóa</span>
        ) : null}
      </TableCell>
      <TableCell className={cn(tableCell, "align-middle")}>{node.sourceCount}</TableCell>
      <TableCell className={cn(tableCell, "align-middle")}>{node.podcastCount}</TableCell>
      <TableCell className={cn(tableCell, "align-middle")}>
        {"displayStatus" in node ? (
          <LibraryStatusBadge
            status={
              node.displayStatus === "COMPLETE"
                ? "complete"
                : node.displayStatus === "MISSING_SOURCE"
                  ? "missing_source"
                  : node.displayStatus === "DRAFT"
                    ? "draft"
                    : "needs_review"
            }
            compact
          />
        ) : (
          <span className="text-xs text-mod-text-secondary">
            {node.childCount} {kind === "period" ? "giai đoạn" : "sự kiện"}
          </span>
        )}
      </TableCell>
      <TableCell className={cn(tableCell, "align-middle")}>
        {kind === "period" && "phases" in node ? (
          <DashboardRowActions label={node.name} actions={[{ id: "detail", label: "Xem chi tiết", icon: Eye, onSelect: () => ctx.openDetail(node) }]} />
        ) : null}
      </TableCell>
    </>
  );
}
function EventRows({
  phase,
  ctx,
}: {
  phase: HistoricalPhaseDetailDto;
  ctx: TreeContext;
}) {
  const query = useHistoricalEntities({
    ...ctx.filter,
    historicalPhaseId: phase.id,
  });
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <>
      {items.map((event, index) => (
          <TableRow key={event.id}
            className="mod-tree-child hover:bg-transparent"
          >
            <TableHead scope="row" className={tableCell}>
              <div className="mod-tree-node" data-depth={2} data-last={index === items.length - 1}>
                <div className="mod-tree-button flex min-h-8 items-center px-1 py-1 text-left text-mod-text">
                  <span className="w-3.5 shrink-0" aria-hidden="true" />
                  <ContentKindIcon kind="event" />
                  <span className="mod-tree-name">{event.name}</span>
                </div>
              </div>
            </TableHead>
            <Cells kind="entity" node={event} ctx={ctx} />
          </TableRow>
      ))}
      <LoadRows
        pending={query.isPending}
        error={query.error}
        empty={!items.length}
        more={query.hasNextPage}
        onMore={() => {
          void (query.error ? query.refetch() : query.fetchNextPage());
        }}
      />
    </>
  );
}
function PhaseRows({
  period,
  ctx,
}: {
  period: HistoricalPeriodDetailDto;
  ctx: TreeContext;
}) {
  const query = useHistoricalPhases(period.id, {
    q: ctx.filter.q,
    includeDeleted: ctx.filter.includeDeleted,
  });
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <>
      {items.map((phase, index) => {
        const open =
          ctx.expanded.has(phase.id) ||
          (Boolean(ctx.filter.q) && !ctx.expanded.has("closed:" + phase.id));
        return (
          <Fragment key={phase.id}>
            <InteractiveTableRow
              className="mod-tree-child hover:bg-transparent"
              onActivate={() => ctx.toggle(phase.id)}
            >
              <TableHead scope="row" className={tableCell}>
                <ModeratorTreeNode
                  kind="stage"
                  depth={1}
                  last={index === items.length - 1}
                  name={phase.name}
                  open={open}
                  onClick={() => ctx.toggle(phase.id)}
                />
              </TableHead>
              <Cells kind="phase" node={phase} ctx={ctx} />
            </InteractiveTableRow>
            {open && ctx.kindFilter !== "stage" ? (
              <EventRows phase={phase} ctx={ctx} />
            ) : null}
          </Fragment>
        );
      })}
      <LoadRows
        pending={query.isPending}
        error={query.error}
        empty={!items.length}
        more={query.hasNextPage}
        onMore={() => {
          void (query.error ? query.refetch() : query.fetchNextPage());
        }}
      />
    </>
  );
}
export function HistoricalLibraryWorkspace({
  initialCreating = false,
}: {
  initialCreating?: boolean;
}) {
  const [creating, setCreating] = useState(initialCreating);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [detailRecord, setDetailRecord] = useState<HistoricalPeriodDetailDto>();
  const [q, setQ] = useState("");
  const [kindFilter, setKindFilter] = useState("all");
  const [reviewStatus, setReviewStatus] = useState("all");
  const filter: CatalogFilter = {
    q,
    reviewStatus:
      reviewStatus === "DRAFT" ||
      reviewStatus === "IN_REVIEW" ||
      reviewStatus === "APPROVED" ||
      reviewStatus === "CHANGES_REQUESTED"
        ? reviewStatus
        : undefined,
  };
  const periods = useHistoricalPeriods({ q });
  const summary = useHistoricalSummary();
  const items = periods.data?.pages.flatMap((p) => p.items) ?? [];
  const toggle = (id: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      const auto = Boolean(q) && !current.has("closed:" + id);
      if (next.has(id) || auto) {
        next.delete(id);
        next.add("closed:" + id);
      } else {
        next.add(id);
        next.delete("closed:" + id);
      }
      return next;
    });
  const ctx: TreeContext = {
    expanded,
    toggle,
    openDetail: setDetailRecord,
    filter,
    kindFilter,
  };
  const saved = (kind: HistoricalKind, node: HistoricalNodeDto) => {
    setCreating(false);
    setExpanded(
      (current) =>
        new Set([
          ...current,
          node.id,
          ...("periodId" in node
            ? [node.periodId]
            : "historicalPhase" in node && node.historicalPhase
              ? [node.historicalPhase.periodId, node.historicalPhase.id]
              : []),
        ]),
    );
  };
  return (
    <Dialog
      open={creating || Boolean(detailRecord)}
      onOpenChange={(open) => {
        if (open && !detailRecord) setCreating(true);
        if (!open) {
          setCreating(false);
          setDetailRecord(undefined);
        }
      }}
    >
      <section className="flex w-full flex-col gap-5 font-moderator [overflow-anchor:none]">
        <header className="border-b border-mod-border pb-4">
          <h1 className="text-2xl font-bold text-mod-text">Dòng lịch sử</h1>
          <p className="mt-1 text-sm text-mod-text-secondary">
            Quản lý phân kỳ, sự kiện và nguồn tư liệu lịch sử.
          </p>
        </header>
        <ModeratorSectionPanel
          title="Danh sách dòng lịch sử"
          eyebrow="THƯ VIỆN LỊCH SỬ"
          summary={
            summary.data
              ? `${summary.data.periods} thời kỳ · ${summary.data.phases} giai đoạn · ${summary.data.events} sự kiện`
              : "Đang tải tổng số…"
          }
          toolbar={
            <ModeratorListToolbar
              searchLabel="Tìm trong dòng lịch sử"
              searchValue={q}
              onSearchChange={(value) => {
                setQ(value);
                setExpanded(new Set());
              }}
              filters={[
                {
                  id: "kind",
                  label: "Loại nội dung",
                  value: kindFilter,
                  onValueChange: setKindFilter,
                  options: [
                    { value: "all", label: "Tất cả loại" },
                    { value: "period", label: "Thời kỳ" },
                    { value: "stage", label: "Giai đoạn" },
                    { value: "event", label: "Sự kiện" },
                  ],
                },
                {
                  id: "review",
                  label: "Trạng thái",
                  value: reviewStatus,
                  onValueChange: setReviewStatus,
                  options: [
                    { value: "all", label: "Tất cả trạng thái" },
                    { value: "DRAFT", label: "Bản nháp" },
                    { value: "IN_REVIEW", label: "Chờ duyệt" },
                    { value: "APPROVED", label: "Đã duyệt" },
                    { value: "CHANGES_REQUESTED", label: "Cần chỉnh sửa" },
                  ],
                },
              ]}
              actions={
                <DialogTrigger asChild>
                  <Button
                    className={primaryAction}
                  >
                    <Plus size={17} />
                    Tạo nội dung
                  </Button>
                </DialogTrigger>
              }
            />
          }
        >
          <ModeratorTable
            embedded
            caption="Dòng lịch sử theo thời kỳ, giai đoạn và sự kiện"
            columns={[
              "Nội dung",
              "Mốc thời gian",
              "Nguồn",
              "Podcast",
              "Trạng thái",
              "Thao tác",
            ]}
            columnWidths={["36%", "20%", "7%", "7%", "14%", "16%"]}
            minWidth={1000}
          >
            {items.map((period) => {
              const open =
                expanded.has(period.id) ||
                (Boolean(q) && !expanded.has("closed:" + period.id));
              return (
                <Fragment key={period.id}>
                  <InteractiveTableRow
                    className="mod-tree-root hover:bg-transparent"
                    onActivate={() => toggle(period.id)}
                  >
                    <TableHead scope="row" className={tableCell}>
                      <ModeratorTreeNode
                        kind="period"
                        name={period.name}
                        open={open}
                        onClick={() => toggle(period.id)}
                      />
                    </TableHead>
                    <Cells kind="period" node={period} ctx={ctx} />
                  </InteractiveTableRow>
                  {open && kindFilter !== "period" ? (
                    <PhaseRows period={period} ctx={ctx} />
                  ) : null}
                </Fragment>
              );
            })}
            <LoadRows
              pending={periods.isPending}
              error={periods.error}
              empty={!items.length}
              more={periods.hasNextPage}
              onMore={() => {
                void (periods.error
                  ? periods.refetch()
                  : periods.fetchNextPage());
              }}
            />
          </ModeratorTable>
          <ContentKindLegend kinds={["period", "stage", "event"]} />
        </ModeratorSectionPanel>
      </section>
      {detailRecord ? (
        <HistoricalBranchDetailDialog
          key={detailRecord.id}
          period={detailRecord}
        />
      ) : null}
      {creating ? (
        <CreateHistoricalContentDialog
          onBack={() => setCreating(false)}
          onSaved={saved}
        />
      ) : null}
    </Dialog>
  );
}
