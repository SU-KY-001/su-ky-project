import { Fragment, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { TableCell, TableHead, TableRow } from "@/shared/components/ui/table";
import { useCurrentUser } from "@/shared/hooks/useCurrentUser";
import { HistoricalEventDetail } from "./HistoricalEventDetail";
import { SourceComposer, SourceVerification } from "./HistoricalSourceFields";
import {
  useHistoricalEntities,
  useHistoricalSources,
} from "../hooks/useHistoricalCatalog";
import type { CatalogSourceDto } from "@repo/shared";
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
  const [archived, setArchived] = useState(false);
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
  const sources = useHistoricalSources(q, page, archived);
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
                    {event.reviewStatus === "APPROVED"
                      ? "Đã duyệt"
                      : event.reviewStatus === "IN_REVIEW"
                        ? "Chờ duyệt"
                        : event.reviewStatus === "CHANGES_REQUESTED"
                          ? "Cần chỉnh sửa"
                          : "Bản nháp"}
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
              columns={["Nguồn tư liệu", "Ấn bản", "Trạng thái", "Thao tác"]}
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
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setEditing(s);
                            setCreating(true);
                          }}
                        >
                          Sửa nguồn
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                  {selected === s.id ? (
                    <TableRow>
                      <TableCell colSpan={4} className="space-y-3 p-5">
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
                <EmptyTableRow columns={4}>
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
            <div className="flex items-center gap-3 p-4">
              <Button
                disabled={page === 1}
                variant="ghost"
                onClick={() => setPage(page - 1)}
              >
                Trang trước
              </Button>
              <span className="text-xs">Trang {page}</span>
              <Button
                variant="ghost"
                disabled={
                  !sources.data ||
                  page * sources.data.limit >= sources.data.total
                }
                onClick={() => setPage(page + 1)}
              >
                Trang sau
              </Button>
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
      {creating ? (
        <SourceComposer
          key={editing?.id ?? "new"}
          source={editing}
          onCancel={() => {
            setCreating(false);
            setEditing(undefined);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(undefined);
          }}
        />
      ) : null}
    </section>
  );
}
