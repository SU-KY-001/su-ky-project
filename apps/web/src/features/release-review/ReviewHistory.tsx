import type { ReactElement } from "react";
import type { PublicationAssessment, ReleaseScheduleRecord } from "@repo/shared";

export type StoredReview = Pick<ReleaseScheduleRecord["reviews"][number], "status" | "revision"> &
  Partial<Pick<ReleaseScheduleRecord["reviews"][number], "reviewNote" | "readinessSnapshot" | "reviewedAt">>;

const DECISION_LABEL: Record<string, string> = { APPROVED: "Đã duyệt", CHANGES_REQUESTED: "Yêu cầu chỉnh sửa" };
const dateTime = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" });

function Field({ label, value }: { label: string; value: string | null }): ReactElement | null {
  if (!value) return null;
  return <div><dt className="text-mod-text-secondary">{label}</dt><dd className="mt-0.5 whitespace-pre-wrap break-words">{value}</dd></div>;
}

export function AssessmentSummary({ assessment }: { assessment: PublicationAssessment }): ReactElement {
  return (
    <dl className="space-y-2 text-xs leading-5">
      <Field label="Kết luận nội dung và nguồn" value={assessment.editorialNote} />
      <Field label="Căn cứ quyền sử dụng" value={assessment.rightsNote} />
      <Field label="Kết luận bản nghe" value={assessment.audioNote} />
      <Field label="Quyền hết hạn" value={assessment.rightsExpiresAt ? new Date(assessment.rightsExpiresAt).toLocaleDateString("vi-VN") : null} />
      <Field label="Thông báo AI" value={assessment.aiDisclosure} />
      <Field label="Ghi công" value={assessment.credits} />
      <Field label="Lý do chấp nhận cảnh báo" value={assessment.warningAcceptance} />
    </dl>
  );
}

/** Decisions already recorded for a schedule, with the notes and readiness stored at decision time. */
export function ReviewHistory({ reviews }: { reviews: StoredReview[] }): ReactElement | null {
  const decided = reviews.filter((review) => review.status in DECISION_LABEL);
  if (!decided.length) return null;
  return (
    <section aria-label="Lịch sử kiểm duyệt" className="space-y-3 border-t border-mod-border pt-4">
      <h3 className="text-sm font-semibold">Lịch sử kiểm duyệt</h3>
      <ul className="space-y-3">
        {decided.map((review, index) => {
          const snapshot = review.readinessSnapshot ?? null;
          const warnings = snapshot?.readiness.items.filter((item) => item.state === "WARN").length ?? 0;
          return (
            <li key={`${review.revision}-${index}`} className="space-y-2 rounded-lg border border-mod-border p-3 text-sm">
              <p className="font-semibold">{DECISION_LABEL[review.status]} · Phiên bản {review.revision}{review.reviewedAt ? ` · ${dateTime.format(review.reviewedAt)}` : ""}</p>
              {review.reviewNote ? <p className="whitespace-pre-wrap break-words text-xs leading-5">Ghi chú: {review.reviewNote}</p> : null}
              {snapshot ? <p className="text-xs text-mod-text-secondary">Lúc quyết định: {snapshot.readiness.ready ? "đủ điều kiện" : "chưa đủ điều kiện"}, {warnings} cảnh báo.</p> : null}
              {snapshot?.assessment ? <AssessmentSummary assessment={snapshot.assessment} /> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
