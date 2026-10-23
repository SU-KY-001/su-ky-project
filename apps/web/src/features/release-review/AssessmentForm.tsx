import type { ReactElement } from "react";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  ASSESSMENT_CREDITS_MAX_CHARS,
  ASSESSMENT_DISCLOSURE_MAX_CHARS,
  ASSESSMENT_NOTE_MAX_CHARS,
  ASSESSMENT_NOTE_MIN_CHARS,
  ASSESSMENT_WARNING_MAX_CHARS,
  todayIsoDate,
  type AssessmentDraft,
  type AssessmentRequirements,
} from "./publicationAssessment";

interface TextField {
  key: Exclude<keyof AssessmentDraft, "rightsExpiresAt">;
  label: string;
  hint: string;
  max: number;
  required: boolean | "disclosure" | "warning";
}

const FIELDS: TextField[] = [
  { key: "editorialNote", label: "Kết luận nội dung và nguồn", hint: "Bạn đã xem phần nào, nguồn trọng yếu nào, kết luận gì. Đây là xác nhận có trách nhiệm của bạn, hệ thống không tự chứng minh.", max: ASSESSMENT_NOTE_MAX_CHARS, required: true },
  { key: "rightsNote", label: "Căn cứ quyền sử dụng", hint: "Tài sản dùng trong tập (ảnh, nhạc, tư liệu, giọng) có quyền nào; ghi rõ nếu có đồng ý của người liên quan.", max: ASSESSMENT_NOTE_MAX_CHARS, required: true },
  { key: "audioNote", label: "Kết luận bản nghe", hint: "Bản thu bạn đã nghe thế nào và có khớp kịch bản không. Không có ô tick nghe xong vì hệ thống không biết bạn đã nghe.", max: ASSESSMENT_NOTE_MAX_CHARS, required: true },
  { key: "aiDisclosure", label: "Thông báo AI cho người nghe", hint: "Hiện công khai ở trang tập. Bắt buộc khi âm thanh do giọng AI tạo.", max: ASSESSMENT_DISCLOSURE_MAX_CHARS, required: "disclosure" },
  { key: "credits", label: "Ghi công (tùy chọn)", hint: "Hiện công khai ở trang tập.", max: ASSESSMENT_CREDITS_MAX_CHARS, required: false },
  { key: "warningAcceptance", label: "Lý do chấp nhận cảnh báo", hint: "Bắt buộc khi hệ thống còn cảnh báo: nêu vì sao vẫn có thể phát hành.", max: ASSESSMENT_WARNING_MAX_CHARS, required: "warning" },
];

interface Props {
  idPrefix: string;
  draft: AssessmentDraft;
  requirements: AssessmentRequirements;
  disabled: boolean;
  onChange: (draft: AssessmentDraft) => void;
}

/** Assessment inputs shared by the reviewer's Approve and the Admin exception publish. Nothing is prefilled. */
export function AssessmentForm({ idPrefix, draft, requirements, disabled, onChange }: Props): ReactElement {
  const isRequired = (field: TextField): boolean => field.required === true || (field.required === "disclosure" && requirements.disclosure) || (field.required === "warning" && requirements.warning);
  const minToday = todayIsoDate();
  return (
    <fieldset className="space-y-3" disabled={disabled}>
      <legend className="text-sm font-semibold">Xác nhận trước khi phát hành</legend>
      {FIELDS.map((field) => {
        const id = `${idPrefix}-${field.key}`;
        const required = isRequired(field);
        return (
          <div key={field.key} className="space-y-1">
            <label htmlFor={id} className="text-xs font-semibold">{field.label}{required ? <span className="text-mod-danger"> *</span> : null}</label>
            <Textarea id={id} value={draft[field.key]} maxLength={field.max} rows={2} aria-required={required} aria-describedby={`${id}-hint`} onChange={(event) => onChange({ ...draft, [field.key]: event.target.value })} className="min-h-16 resize-y border-mod-border bg-mod-surface text-sm" />
            <p id={`${id}-hint`} className="text-xs text-mod-text-secondary">{field.hint}{required && field.required === true ? ` Tối thiểu ${ASSESSMENT_NOTE_MIN_CHARS} ký tự.` : ""}</p>
          </div>
        );
      })}
      <div className="space-y-1">
        <label htmlFor={`${idPrefix}-rightsExpiresAt`} className="text-xs font-semibold">Quyền hết hạn vào (tùy chọn)</label>
        <Input id={`${idPrefix}-rightsExpiresAt`} type="date" min={minToday} value={draft.rightsExpiresAt} onChange={(event) => onChange({ ...draft, rightsExpiresAt: event.target.value })} className="border-mod-border bg-mod-surface" />
        <p className="text-xs text-mod-text-secondary">Để trống nếu quyền không hết hạn. Hệ thống kiểm lại ngày này lúc duyệt và lúc phát hành.</p>
      </div>
    </fieldset>
  );
}
