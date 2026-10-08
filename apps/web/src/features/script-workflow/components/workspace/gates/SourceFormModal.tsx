import { useEffect, useId, useRef, useState } from "react";
import {
  SOURCE_TIERS,
  SOURCE_TIER_LABELS,
  SourceItemSchema,
  type SourceItem,
  type SourceTier,
} from "@repo/shared";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { ModalDialog } from "../dialogs/ModalDialog";
import { Callout } from "../steps/stepUi";
import { nextCustomSourceId } from "./gateDrafts";

const MIN_RELIABILITY_SCORE = 1;
const MAX_RELIABILITY_SCORE = 10;
const DEFAULT_RELIABILITY_SCORE = 8;
const NOTES_ROWS = 3;

const INPUT_CLASS =
  "min-h-11 w-full rounded-[10px] border border-mod-border bg-mod-surface px-3 font-moderator text-sm text-mod-text placeholder:text-mod-text-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary";

function isSourceTier(value: string): value is SourceTier {
  return SOURCE_TIERS.some((tier) => tier === value);
}

function isValidHttpUrl(value: string): boolean {
  if (!/^https?:\/\//i.test(value)) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

type SourceFormModalProps = {
  open: boolean;
  editingSource: SourceItem | null;
  existingSources: readonly SourceItem[];
  onClose: () => void;
  onSubmit: (source: SourceItem) => void;
};

export function SourceFormModal({
  open,
  editingSource,
  existingSources,
  onClose,
  onSubmit,
}: SourceFormModalProps) {
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const formId = useId();

  const [name, setName] = useState("");
  const [authorOrOrigin, setAuthorOrOrigin] = useState("");
  const [tier, setTier] = useState<SourceTier>("TIER_1_CHINH_SU");
  const [tierDescription, setTierDescription] = useState<string>(SOURCE_TIER_LABELS.TIER_1_CHINH_SU);
  const [reliabilityScore, setReliabilityScore] = useState<number>(DEFAULT_RELIABILITY_SCORE);
  const [crossVerificationNotes, setCrossVerificationNotes] = useState("");
  const [isPrimaryAssertionSource, setIsPrimaryAssertionSource] = useState(true);
  const [url, setUrl] = useState("");
  const [locationInSource, setLocationInSource] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setErrors([]);
    if (editingSource) {
      setName(editingSource.name);
      setAuthorOrOrigin(editingSource.authorOrOrigin);
      setTier(editingSource.tier);
      setTierDescription(editingSource.tierDescription);
      setReliabilityScore(editingSource.reliabilityScore);
      setCrossVerificationNotes(editingSource.crossVerificationNotes);
      setIsPrimaryAssertionSource(editingSource.isPrimaryAssertionSource);
      setUrl(editingSource.url ?? "");
      setLocationInSource(editingSource.locationInSource ?? "");
    } else {
      setName("");
      setAuthorOrOrigin("");
      setTier("TIER_1_CHINH_SU");
      setTierDescription(SOURCE_TIER_LABELS.TIER_1_CHINH_SU);
      setReliabilityScore(DEFAULT_RELIABILITY_SCORE);
      setCrossVerificationNotes("");
      setIsPrimaryAssertionSource(true);
      setUrl("");
      setLocationInSource("");
    }
  }, [open, editingSource]);

  const handleSave = () => {
    const nextErrors: string[] = [];
    if (!name.trim()) nextErrors.push("Tên nguồn không được để trống.");
    if (!authorOrOrigin.trim()) nextErrors.push("Tác giả / xuất xứ không được để trống.");
    if (!tierDescription.trim()) nextErrors.push("Mô tả phân hạng không được để trống.");
    if (
      !Number.isFinite(reliabilityScore) ||
      reliabilityScore < MIN_RELIABILITY_SCORE ||
      reliabilityScore > MAX_RELIABILITY_SCORE
    ) {
      nextErrors.push(`Điểm tin cậy phải từ ${MIN_RELIABILITY_SCORE} đến ${MAX_RELIABILITY_SCORE}.`);
    }
    if (!crossVerificationNotes.trim()) {
      nextErrors.push("Ghi chú đối chiếu không được để trống.");
    }
    const trimmedUrl = url.trim();
    if (trimmedUrl.length > 0 && !isValidHttpUrl(trimmedUrl)) {
      nextErrors.push("Liên kết URL phải bắt đầu bằng http:// hoặc https:// và đúng định dạng.");
    }

    if (nextErrors.length > 0) {
      setErrors(nextErrors);
      return;
    }

    const candidate: SourceItem = {
      id: editingSource ? editingSource.id : nextCustomSourceId(existingSources),
      name: name.trim(),
      authorOrOrigin: authorOrOrigin.trim(),
      tier,
      tierDescription: tierDescription.trim(),
      reliabilityScore: Math.round(reliabilityScore),
      crossVerificationNotes: crossVerificationNotes.trim(),
      isPrimaryAssertionSource,
      ...(trimmedUrl.length > 0 ? { url: trimmedUrl } : {}),
      ...(locationInSource.trim().length > 0 ? { locationInSource: locationInSource.trim() } : {}),
      ...(editingSource?.catalogSourceId ? { catalogSourceId: editingSource.catalogSourceId } : {}),
    };

    const parsed = SourceItemSchema.safeParse(candidate);
    if (!parsed.success) {
      setErrors(parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`));
      return;
    }

    onSubmit(parsed.data);
  };

  return (
    <ModalDialog
      open={open}
      title={editingSource ? "Sửa nguồn tham khảo" : "Thêm nguồn tham khảo"}
      description={
        editingSource
          ? `Mã nguồn: ${editingSource.id}`
          : "Nguồn thêm tay sẽ được lưu vào danh mục của phiên bản mới khi bạn bấm Lưu chỉnh sửa."
      }
      initialFocusRef={nameInputRef}
      maxWidthClass="max-w-xl"
      onClose={onClose}
    >
      <div className="flex flex-col gap-3.5">
        {errors.length > 0 ? (
          <Callout tone="danger" title="Thông tin nguồn chưa hợp lệ" role="alert">
            <ul className="list-disc pl-5">
              {errors.map((err, idx) => (
                <li key={`${idx}-${err}`}>{err}</li>
              ))}
            </ul>
          </Callout>
        ) : null}

        <label className="flex flex-col gap-1">
          <ModeratorText className="text-sm font-bold text-mod-text">Tên nguồn *</ModeratorText>
          <input
            ref={nameInputRef}
            id={`${formId}-name`}
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ví dụ: Đại Việt sử ký toàn thư"
            className={INPUT_CLASS}
          />
        </label>

        <label className="flex flex-col gap-1">
          <ModeratorText className="text-sm font-bold text-mod-text">Tác giả / Xuất xứ *</ModeratorText>
          <input
            type="text"
            value={authorOrOrigin}
            onChange={(event) => setAuthorOrOrigin(event.target.value)}
            placeholder="Ví dụ: Ngô Sĩ Liên và các sử thần nhà Lê"
            className={INPUT_CLASS}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <ModeratorText className="text-sm font-bold text-mod-text">Nhóm nguồn (Tier) *</ModeratorText>
            <select
              value={tier}
              onChange={(event) => {
                if (isSourceTier(event.target.value)) {
                  const nextTier = event.target.value;
                  setTier(nextTier);
                  if (!tierDescription.trim() || tierDescription === SOURCE_TIER_LABELS[tier]) {
                    setTierDescription(SOURCE_TIER_LABELS[nextTier]);
                  }
                }
              }}
              className={INPUT_CLASS}
            >
              {SOURCE_TIERS.map((value) => (
                <option key={value} value={value}>
                  {SOURCE_TIER_LABELS[value]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <ModeratorText className="text-sm font-bold text-mod-text">
              Điểm tin cậy ({MIN_RELIABILITY_SCORE}–{MAX_RELIABILITY_SCORE}) *
            </ModeratorText>
            <input
              type="number"
              min={MIN_RELIABILITY_SCORE}
              max={MAX_RELIABILITY_SCORE}
              step={1}
              value={reliabilityScore}
              onChange={(event) => setReliabilityScore(Number(event.target.value))}
              className={INPUT_CLASS}
            />
          </label>
        </div>

        <label className="flex flex-col gap-1">
          <ModeratorText className="text-sm font-bold text-mod-text">Mô tả phân hạng *</ModeratorText>
          <input
            type="text"
            value={tierDescription}
            onChange={(event) => setTierDescription(event.target.value)}
            placeholder="Ví dụ: Chính sử biên niên triều đình"
            className={INPUT_CLASS}
          />
        </label>

        <label className="flex flex-col gap-1">
          <ModeratorText className="text-sm font-bold text-mod-text">Ghi chú đối chiếu chéo *</ModeratorText>
          <textarea
            rows={NOTES_ROWS}
            value={crossVerificationNotes}
            onChange={(event) => setCrossVerificationNotes(event.target.value)}
            placeholder="Ghi chú mức độ khớp với các sử liệu khác hoặc giới hạn của nguồn này…"
            className="w-full resize-y rounded-[10px] border border-mod-border bg-mod-surface p-3 font-moderator text-sm text-mod-text placeholder:text-mod-text-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <ModeratorText className="text-sm font-bold text-mod-text">Vị trí trong nguồn (tuỳ chọn)</ModeratorText>
            <input
              type="text"
              value={locationInSource}
              onChange={(event) => setLocationInSource(event.target.value)}
              placeholder="Ví dụ: Bản kỷ, Quyển V, tờ 42a"
              className={INPUT_CLASS}
            />
          </label>

          <label className="flex flex-col gap-1">
            <ModeratorText className="text-sm font-bold text-mod-text">Liên kết URL (tuỳ chọn)</ModeratorText>
            <input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://..."
              className={INPUT_CLASS}
            />
          </label>
        </div>

        <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[10px] border border-mod-border bg-mod-canvas px-3">
          <input
            type="checkbox"
            checked={isPrimaryAssertionSource}
            onChange={(event) => setIsPrimaryAssertionSource(event.target.checked)}
            className="h-4 w-4 accent-mod-primary"
          />
          <ModeratorText className="text-sm font-semibold text-mod-text">
            Nguồn khẳng định chính (dùng để xác lập sự kiện cốt lõi)
          </ModeratorText>
        </label>

        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center rounded-[10px] border border-mod-border bg-mod-surface px-4 font-moderator text-sm font-bold text-mod-text hover:bg-mod-canvas-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex min-h-11 items-center rounded-[10px] bg-mod-primary px-4 font-moderator text-sm font-bold text-white hover:bg-mod-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mod-primary"
          >
            {editingSource ? "Cập nhật nguồn" : "Thêm vào danh mục"}
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}
