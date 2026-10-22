import { CardBadge, cardBadgeToneForStatus } from "@/shared/components/dashboard/CardBadge";
import { Fragment, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { CaretDown, CaretUp, CaretUpDown, PencilSimple } from "@phosphor-icons/react";
import { DashboardRowActions } from "@/shared/components/dashboard/DashboardRowActions";
import { TableCell, TableHead, TableRow } from "@/shared/components/ui/table";
import { useCurrentUser } from "@/shared/hooks/useCurrentUser";
import { HistoricalEventDetail } from "./HistoricalEventDetail";
import { SourceComposer, SourceVerification } from "./HistoricalSourceFields";
import {
  useHistoricalEntities,
  useHistoricalSources,
} from "../hooks/useHistoricalCatalog";
import type {
  CatalogSourceDto,
} from "@repo/shared";
import type {
  SourceSortBy,
  SourceSortDirection,
} from "../services/historicalCatalogService";
import {
  ModeratorTable,
  EmptyTableRow,
  InteractiveTableRow,
  tableAction,
  tableCell,
} from "@/features/moderator/components/ModeratorTable";
import { ModeratorSectionPanel } from "@/features/moderator/components/ModeratorSectionPanel";
import { ModeratorListToolbar } from "@/features/moderator/components/ModeratorListToolbar";
import type { ModeratorSection } from "@/features/moderator/types";
import { DashboardPagination } from "@/shared/components/dashboard/DashboardPagination";
function SourceSortIcon({
  active,
  direction,
}: {
  active: boolean;
  direction: SourceSortDirection;
}) {
  if (!active) return <CaretUpDown size={15} aria-hidden="true" />;
  return direction === "asc" ? (
    <CaretUp size={15} aria-hidden="true" />
  ) : (
    <CaretDown size={15} aria-hidden="true" />
  );
}

export function HistoricalCatalogList({
  section,
}: {
  section: Extract<
    ModeratorSection,
    "events" | "sources" | "pending" | "schedule"
  >;
}) {
  const user = useCurrentUser().data;
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string>();
  const [page, setPage] = useState(1);
  const [review, setReview] = useState("all");
  const [editing, setEditing] = useState<CatalogSourceDto>();
  const [creating, setCreating] = useState(false);
  const [sourceBusy, setSourceBusy] = useState(false);
  const [archived, setArchived] = useState(false);
  const [sourceSort, setSourceSort] = useState<SourceSortBy>("title");
  const [sourceDirection, setSourceDirection] = useState<SourceSortDirection>("asc");
  const toggleSourceSort = (nextSort: SourceSortBy) => {
    if (nextSort === sourceSort) {
      setSourceDirection((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSourceSort(nextSort);
      setSourceDirection(nextSort === "createdAt" ? "desc" : "asc");
    }
    setPage(1);
  };
  const status =
    review === "DRAFT" ||
    review === "IN_REVIEW" ||
    review === "APPROVED" ||
    review === "CHANGES_REQUESTED"
      ? review
      : section === "pending"
        ? "IN_REVIEW"
        : undefined;
  const events = useHistoricalEntities(
    { q, reviewStatus: status },
    section === "events" || section === "pending",
  );
  const sources = useHistoricalSources(
    q,
    page,
    archived,
    sourceSort,
    sourceDirection,
  );
  const rows = events.data?.pages.flatMap((p) => p.items) ?? [];
  const title =
    section === "events"
      ? "Sự kiện"
      : section === "sources"
        ? "Nguồn tư liệu"
        : section === "pending"
          ? "Cần xử lý"
          : "Lịch phát hành";
  return (
    <section className="space-y-5 font-moderator">
      <header>
        <h1 className="text-2xl font-bold">{title}</h1>
      </header>
      <ModeratorSectionPanel
        title={title}
        eyebrow="THƯ VIỆN LỊCH SỬ"
        summary={
          section === "sources"
            ? `${sources.data?.total ?? 0} nguồn`
            : section === "schedule"
              ? "Chưa có chức năng đặt lịch"
              : `${events.data?.pages[0]?.total ?? 0} sự kiện`
        }
        toolbar={
          <ModeratorListToolbar
            searchLabel={`Tìm kiếm ${title}`}
            searchValue={q}
            onSearchChange={(value) => {
              setQ(value);
              setPage(1);
            }}
            filters={
              section === "events" || section === "pending"
                ? [
                    {
                      id: "review",
                      label: "Trạng thái",
                      value: review,
                      onValueChange: setReview,
                      options: [
                        {
                          value: "all",
                          label:
                            section === "pending"
                              ? "Chờ duyệt"
                              : "Tất cả trạng thái",
                        },
                        { value: "DRAFT", label: "Bản nháp" },
                        { value: "IN_REVIEW", label: "Chờ duyệt" },
                        { value: "APPROVED", label: "Đã duyệt" },
                        { value: "CHANGES_REQUESTED", label: "Cần chỉnh sửa" },
                      ],
                    },
                  ]
                : []
            }
            actions={
              section === "sources" ? (
                <Button onClick={() => setCreating(true)}>
                  Thêm nguồn mới
                </Button>
              ) : undefined
            }
          />
        }
      >
        {section === "events" || section === "pending" ? (
          <ModeratorTable
            embedded
            caption={title}
            columns={[
              "Sự kiện",
              "Thời kỳ / Giai đoạn",
              "Mốc thời gian",
              "Nguồn",
              "Podcast",
              "Trạng thái",
              "Cập nhật",
            ]}
          >
            {rows.map((event) => (
              <Fragment key={event.id}>
                <InteractiveTableRow
                  expanded={selected === event.id}
                  onActivate={() =>
                    setSelected(selected === event.id ? undefined : event.id)
                  }
                >
                  <TableHead scope="row" className={tableCell}>
                    <Button
                      variant="ghost"
                      className={tableAction}
                      aria-expanded={selected === event.id}
                      onClick={() =>
                        setSelected(
                          selected === event.id ? undefined : event.id,
                        )
                      }
                    >
                      {event.name}
                    </Button>
                  </TableHead>
                  <TableCell className={tableCell}>
                    {event.historicalPhase?.period?.name}
                    <span className="block text-xs">
                      {event.historicalPhase?.name}
                    </span>
                  </TableCell>
                  <TableCell className={tableCell}>{event.timeLabel}</TableCell>
                  <TableCell className={tableCell}>
                    {event.sourceCount}
                  </TableCell>
                  <TableCell className={tableCell}>
                    {event.podcastCount}
                  </TableCell>
                  <TableCell className={tableCell}>
                    <CardBadge type="status" tone={cardBadgeToneForStatus(event.reviewStatus)}>{event.reviewStatus === "APPROVED"
                      ? "Đã duyệt"
                      : event.reviewStatus === "IN_REVIEW"
                        ? "Chờ duyệt"
                        : event.reviewStatus === "CHANGES_REQUESTED"
                          ? "Cần chỉnh sửa"
                          : "Bản nháp"}</CardBadge>
                  </TableCell>
                  <TableCell className={tableCell}>
                    {event.updatedAt.toLocaleDateString("vi-VN")}
                  </TableCell>
                </InteractiveTableRow>
                {selected === event.id ? (
                  <TableRow>
                    <TableCell colSpan={7} className="p-5">
                      <HistoricalEventDetail id={event.id} />
                    </TableCell>
                  </TableRow>
                ) : null}
              </Fragment>
            ))}
            {events.isPending || events.error || !rows.length ? (
              <EmptyTableRow columns={7}>
                {events.isPending ? (
                  "Đang tải…"
                ) : events.error ? (
                  <span role="alert">{events.error.message}</span>
                ) : (
                  "Không có sự kiện phù hợp."
                )}
              </EmptyTableRow>
            ) : null}
            {events.hasNextPage ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      void events.fetchNextPage();
                    }}
                  >
                    Tải thêm sự kiện
                  </Button>
                </TableCell>
              </TableRow>
            ) : null}
          </ModeratorTable>
        ) : null}
        {section === "sources" ? (
          <>
            <label className="flex items-center gap-2 p-4 text-xs">
              <input
                type="checkbox"
                checked={archived}
                onChange={(e) => {
                  setArchived(e.target.checked);
                  setPage(1);
                }}
              />
              Gồm nguồn đã lưu trữ
            </label>
            <ModeratorTable
              embedded
              caption={title}
              columns={[
                <Button
                  key="title"
                  variant="ghost"
                  className={tableAction + " gap-1 font-bold"}
                  onClick={() => toggleSourceSort("title")}
                  aria-label={`Sắp xếp theo tên nguồn ${sourceSort === "title" && sourceDirection === "desc" ? "từ Z đến A" : "từ A đến Z"}`}
                >
                  Nguồn tư liệu
                  <SourceSortIcon active={sourceSort === "title"} direction={sourceDirection} />
                </Button>,
                <Button
                  key="createdAt"
                  variant="ghost"
                  className={tableAction + " gap-1 font-bold"}
                  onClick={() => toggleSourceSort("createdAt")}
                  aria-label={`Sắp xếp theo ngày tạo ${sourceSort === "createdAt" && sourceDirection === "asc" ? "cũ đến mới" : "mới đến cũ"}`}
                >
                  Ngày tạo
                  <SourceSortIcon active={sourceSort === "createdAt"} direction={sourceDirection} />
                </Button>,
                "Ấn bản",
                "Trạng thái",
                "Thao tác",
              ]}
              columnAriaSort={[
                sourceSort === "title"
                  ? sourceDirection === "asc"
                    ? "ascending"
                    : "descending"
                  : "none",
                sourceSort === "createdAt"
                  ? sourceDirection === "asc"
                    ? "ascending"
                    : "descending"
                  : "none",
                undefined,
                undefined,
                undefined,
              ]}
            >
              {sources.data?.items.map((s) => (
                <Fragment key={s.id}>
                  <TableRow>
                    <TableHead scope="row" className={tableCell}>
                      <Button
                        variant="ghost"
                        className={tableAction}
                        onClick={() =>
                          setSelected(selected === s.id ? undefined : s.id)
                        }
                      >
                        {s.title}
                      </Button>
                    </TableHead>
                    <TableCell className={tableCell}>
                      {s.createdAt.toLocaleString("vi-VN")}
                    </TableCell>
                    <TableCell className={tableCell}>
                      {[s.author, s.publisher, s.edition, s.publicationYear]
                        .filter(Boolean)
                        .join(" · ")}
                    </TableCell>
                    <TableCell className={tableCell}>
                      {s.verificationStatus === "VERIFIED"
                        ? "Đã xác minh"
                        : s.verificationStatus === "REJECTED"
                          ? "Bị từ chối"
                          : "Chưa xác minh"}
                    </TableCell>
                    <TableCell className={tableCell}>
                      {user?.role === "admin" || user?.id === s.createdById ? (
                        <DashboardRowActions label={s.title} actions={[{
                          id: "edit", label: "Sửa nguồn", icon: PencilSimple,
                          onSelect: () => {
                            setEditing(s);
                            setCreating(true);
                          },
                        }]} />
                      ) : null}
                    </TableCell>
                  </TableRow>
                  {selected === s.id ? (
                    <TableRow>
                      <TableCell colSpan={5} className="space-y-3 p-5">
                        {s.url ? (
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mr-4 underline"
                          >
                            Xem nguồn
                          </a>
                        ) : null}
                        {s.file ? (
                          <a
                            href={s.file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            Xem PDF
                          </a>
                        ) : null}
                        <SourceVerification source={s} />
                      </TableCell>
                    </TableRow>
                  ) : null}
                </Fragment>
              ))}
              {sources.isPending ||
              sources.error ||
              !sources.data?.items.length ? (
                <EmptyTableRow columns={5}>
                  {sources.isPending ? (
                    "Đang tải…"
                  ) : sources.error ? (
                    <span role="alert">{sources.error.message}</span>
                  ) : (
                    "Chưa có nguồn tư liệu."
                  )}
                </EmptyTableRow>
              ) : null}
            </ModeratorTable>
            <div className="border-t border-mod-border p-4">
              <DashboardPagination
                page={page}
                limit={sources.data?.limit ?? 20}
                total={sources.data?.total ?? 0}
                itemLabel="nguồn"
                onPageChange={setPage}
              />
            </div>
          </>
        ) : null}
        {section === "schedule" ? (
          <p className="p-5 text-sm">
            Podcast được phát hành trực tiếp từ mục Sản xuất podcast. Đặt lịch
            phát hành chưa thuộc phạm vi triển khai này.
          </p>
        ) : null}
      </ModeratorSectionPanel>
      <Dialog
        open={creating}
        onOpenChange={(open) => {
          if (!open && !sourceBusy) {
            setCreating(false);
            setEditing(undefined);
          }
        }}
      >
        <DialogContent
          showCloseButton={!sourceBusy}
          onEscapeKeyDown={(event) => { if (sourceBusy) event.preventDefault(); }}
          onPointerDownOutside={(event) => { if (sourceBusy) event.preventDefault(); }}
          className="flex max-h-[calc(100dvh-2rem)] max-w-3xl flex-col gap-0 overflow-hidden border-mod-border bg-mod-surface p-0 font-moderator text-mod-text sm:p-0 motion-reduce:animate-none"
        >
          <DialogHeader className="shrink-0 border-b border-mod-border px-6 py-5 pr-14 sm:px-8 sm:pr-16">
            <DialogTitle>
              {editing ? "Sửa nguồn tư liệu" : "Thêm nguồn tư liệu"}
            </DialogTitle>
            <DialogDescription>
              {editing ? "Cập nhật tài liệu dùng chung trong thư viện." : "Lưu tài liệu vào thư viện để sử dụng cho các series."}
            </DialogDescription>
          </DialogHeader>
            <SourceComposer
              key={editing?.id ?? "new"}
              inModal
              source={editing}
              onBusyChange={setSourceBusy}
              onCancel={() => {
                setCreating(false);
                setEditing(undefined);
              }}
              onSaved={() => {
                setCreating(false);
                setEditing(undefined);
              }}
            />
        </DialogContent>
      </Dialog>
    </section>
  );
}
