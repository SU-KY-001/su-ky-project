import { CardBadge, cardBadgeToneForStatus } from "@/shared/components/dashboard/CardBadge";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { HistoricalEntityDetailDto } from "@repo/shared";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { formField } from "@/features/moderator/components/CreationPage";
import { useCurrentUser } from "@/shared/hooks/useCurrentUser";
import { notify } from "@/shared/lib/notifications";
import { historicalCatalogService as api } from "../services/historicalCatalogService";
import { useCatalogInvalidation } from "../hooks/useHistoricalCatalog";
const reasons: Record<string, string> = {
  MISSING_PARENT: "Chưa có giai đoạn hợp lệ",
  MISSING_TIME: "Chưa có mốc thời gian",
  MISSING_SOURCE: "Chưa có nguồn tư liệu",
  SOURCE_UNVERIFIED: "Nguồn chưa được xác minh",
  SOURCE_OUTDATED: "Trích dẫn đang dùng phiên bản nguồn cũ",
  SOURCE_ARCHIVED: "Nguồn đã lưu trữ",
  MISSING_LOCATOR: "Chưa có vị trí trích dẫn",
  CONTENT_NOT_APPROVED: "Nội dung chưa được duyệt",
  MISSING_INFO: "Thiếu tên hoặc mô tả",
  CONTENT_IN_TRASH: "Nội dung đã bị xóa",
  MISSING_TIME_NOTE: "Mốc ước lượng cần ghi chú căn cứ thời gian",
  PARENT_IN_TRASH: "Nhánh cha đã bị xóa",
  DELETED: "Nội dung đã bị xóa",
};
export function HistoricalReviewPanel({
  entity,
}: {
  entity: HistoricalEntityDetailDto;
}) {
  const user = useCurrentUser().data;
  const invalidate = useCatalogInvalidation();
  const [note, setNote] = useState("");
  const owner = user?.id === entity.createdById;
  const canSubmit = owner || user?.role === "admin";
  const reviewer =
    !owner && (user?.role === "moderator" || user?.role === "admin");
  const mutation = useMutation({
    mutationFn: (decision: "SUBMIT" | "APPROVE" | "REQUEST_CHANGES") =>
      decision === "SUBMIT" &&
      (entity.reviewStatus === "DRAFT" ||
        entity.reviewStatus === "CHANGES_REQUESTED")
        ? api.submit(entity.id, entity.version, entity.reviewStatus)
        : api.reviewEvent(entity.id, {
            baseVersion: entity.version,
            expectedStatus: entity.reviewStatus,
            decision: decision === "APPROVE" ? "APPROVE" : "REQUEST_CHANGES",
            note,
          }),
    onSuccess: async () => {
      await invalidate();
      notify.success({ title: "Đã cập nhật quyết định kiểm duyệt." });
    },
  });
  const readyToSubmit =
    entity.readiness.reasons.filter((r) => r !== "CONTENT_NOT_APPROVED")
      .length === 0;
  return (
    <section className="space-y-3" aria-label="Kiểm duyệt nội dung">
      <h3 className="font-semibold">Kiểm duyệt · phiên bản {entity.version}</h3>
      <CardBadge type="status" tone={cardBadgeToneForStatus(entity.reviewStatus)}>{entity.reviewStatus === "IN_REVIEW"
          ? "Đang chờ người khác duyệt"
          : entity.reviewStatus === "APPROVED"
            ? "Đã duyệt"
            : entity.reviewStatus === "CHANGES_REQUESTED"
              ? "Cần chỉnh sửa"
              : "Bản nháp"}</CardBadge>
      {entity.reviewNote ? (
        <p className="text-sm">Nhận xét: {entity.reviewNote}</p>
      ) : null}
      <ul className="list-disc pl-5 text-sm text-mod-text-secondary">
        {entity.readiness.reasons.map((r) => (
          <li key={r}>{reasons[r] ?? r}</li>
        ))}
      </ul>
      {canSubmit &&
      (entity.reviewStatus === "DRAFT" ||
        entity.reviewStatus === "CHANGES_REQUESTED") ? (
        <Button
          disabled={!readyToSubmit || mutation.isPending}
          onClick={() => mutation.mutate("SUBMIT")}
        >
          Gửi duyệt
        </Button>
      ) : null}
      {reviewer && entity.reviewStatus === "IN_REVIEW" ? (
        <>
          <label className="block text-sm">
            Nhận xét kiểm duyệt
            <Textarea
              autoGrow
              className={formField}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <div className="flex gap-2">
            <Button
              disabled={!note.trim() || mutation.isPending}
              onClick={() => mutation.mutate("APPROVE")}
            >
              Duyệt nội dung
            </Button>
            <Button
              variant="outline"
              disabled={!note.trim() || mutation.isPending}
              onClick={() => mutation.mutate("REQUEST_CHANGES")}
            >
              Yêu cầu chỉnh sửa
            </Button>
          </div>
        </>
      ) : null}
      {mutation.error ? (
        <p role="alert" className="text-sm text-mod-danger">
          {mutation.error.message} Nếu phiên bản đã thay đổi, tải lại nội dung
          trước khi duyệt.
        </p>
      ) : null}
    </section>
  );
}
