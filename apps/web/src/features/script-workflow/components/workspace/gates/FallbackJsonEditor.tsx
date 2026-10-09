import { useCallback, useId, useState } from "react";
import { CircleNotch, FloppyDisk } from "@phosphor-icons/react";
import { STEP_OUTPUT_SCHEMAS, type WorkflowStep } from "@repo/shared";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { useModeratorToastStore } from "@/features/moderator/toastStore";
import { errorMessage, errorRequestId, isApiError } from "@/lib/apiError";
import { useStepDecision } from "../../../hooks/useWorkflowMutations";
import { STEP_LABELS } from "../../../labels";
import { useWorkflowUiStore } from "../../../store";
import { RateLimitNotice } from "../../create/Notices";
import { ConfirmDialog } from "../dialogs/ConfirmDialog";
import { Callout } from "../steps/stepUi";
import {
  DEFAULT_RATE_LIMIT_SECONDS,
  HTTP_BAD_REQUEST,
  HTTP_CONFLICT,
  HTTP_TOO_MANY_REQUESTS,
  useJsonEditDraft,
  type RateLimitState,
} from "./gateDrafts";

const JSON_ROWS = 18;
const ICON_SIZE = 18;
const NEXT_VERSION_OFFSET = 1;

type FallbackJsonEditorProps = {
  workflowId: number;
  step: WorkflowStep;
  output: unknown;
  onSaved: () => void;
  onCancel: () => void;
  onConflict: () => void;
};

export function FallbackJsonEditor({
  workflowId,
  step,
  output,
  onSaved,
  onCancel,
  onConflict,
}: FallbackJsonEditorProps) {
  const jsonInputId = useId();
  const noteInputId = useId();
  const { rawText, note, isDirty, update, clear } = useJsonEditDraft(workflowId, step.type, output);
  const viewVersion = useWorkflowUiStore((state) => state.viewVersion);
  const showToast = useModeratorToastStore((state) => state.show);
  const mutation = useStepDecision(workflowId);

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [rateLimit, setRateLimit] = useState<RateLimitState | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const clearRateLimit = useCallback(() => setRateLimit(null), []);

  const handleSave = () => {
    if (step.currentVersion === null || mutation.isPending || rateLimit !== null) return;
    setValidationErrors([]);
    setServerError(null);

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawText);
    } catch {
      setValidationErrors(["Cú pháp JSON không hợp lệ. Vui lòng kiểm tra dấu ngoặc, dấu phẩy và dấu nháy kép."]);
      return;
    }

    const schema = STEP_OUTPUT_SCHEMAS[step.type];
    const parsed = schema.safeParse(parsedJson);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((issue) => {
        const pathLabel = issue.path.length > 0 ? issue.path.join(".") : "dữ liệu gốc";
        return `Trường "${pathLabel}": không đúng định dạng (${issue.message}).`;
      });
      setValidationErrors(issues);
      return;
    }

    const currentBaseVersion = step.currentVersion;
    const trimmedNote = note.trim();

    mutation.mutate(
      {
        action: "DIRECT_EDIT",
        stepType: step.type,
        baseVersion: currentBaseVersion,
        editedOutputJson: parsed.data,
        ...(trimmedNote.length > 0 ? { note: trimmedNote } : {}),
      },
      {
        onSuccess: (res) => {
          const nextVer = res.newVersion ?? currentBaseVersion + NEXT_VERSION_OFFSET;
          clear();
          viewVersion(step.type, null);
          showToast(`Đã lưu v${nextVer}. Chưa duyệt.`);
          onSaved();
        },
        onError: (error) => {
          if (isApiError(error, HTTP_CONFLICT)) {
            onConflict();
          } else if (isApiError(error, HTTP_BAD_REQUEST)) {
            setServerError(error.message);
          } else if (isApiError(error, HTTP_TOO_MANY_REQUESTS)) {
            setRateLimit({ seconds: error.retryAfterSeconds ?? DEFAULT_RATE_LIMIT_SECONDS, startedAt: Date.now() });
          } else {
            showToast(errorMessage(error), errorRequestId(error));
          }
        },
      },
    );
  };

  const handleCancelClick = () => {
    if (isDirty) {
      setConfirmCancel(true);
      return;
    }
    clear();
    onCancel();
  };

  return (
    <div className="flex flex-col gap-4 rounded-[12px] border border-mod-border bg-mod-canvas p-4">
      <Callout
        tone="info"
        title={
          step.type === "FACT_CHECKER"
            ? "Chỉnh báo cáo kiểm định, không chỉnh văn bản kịch bản"
            : `Sửa tay JSON · ${STEP_LABELS[step.type]}`
        }
        role="status"
      >
        {step.type === "FACT_CHECKER"
          ? "Bạn đang chỉnh sửa trực tiếp dữ liệu báo cáo kiểm định. Văn bản kịch bản văn nói không bị thay đổi ở bước này."
          : "Chỉnh sửa dữ liệu theo đúng cấu trúc của bước này trước khi lưu phiên bản mới."}
      </Callout>

      {validationErrors.length > 0 ? (
        <Callout tone="danger" title="Dữ liệu chưa đúng cấu trúc" role="alert">
          <ul className="list-disc pl-5">
            {validationErrors.map((err, index) => (
              <li key={`${index}-${err}`}>{err}</li>
            ))}
          </ul>
        </Callout>
      ) : null}

      {serverError ? (
        <Callout tone="danger" title="Máy chủ từ chối dữ liệu" role="alert">
          {serverError}
        </Callout>
      ) : null}

      {rateLimit ? (
        <RateLimitNotice key={rateLimit.startedAt} seconds={rateLimit.seconds} onElapsed={clearRateLimit} />
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor={jsonInputId} className="font-moderator text-sm font-bold text-mod-text">
          Nội dung JSON
        </label>
        <textarea
          id={jsonInputId}
          rows={JSON_ROWS}
          disabled={mutation.isPending}
          value={rawText}
          onChange={(event) => {
            update(event.target.value, note);
            if (validationErrors.length > 0) setValidationErrors([]);
            if (serverError) setServerError(null);
          }}
          className="w-full resize-y rounded-[12px] border border-mod-border bg-mod-surface p-3 font-mono text-xs text-mod-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary disabled:opacity-60"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={noteInputId} className="font-moderator text-sm font-bold text-mod-text">
          Ghi chú thay đổi (tuỳ chọn)
        </label>
        <input
          id={noteInputId}
          type="text"
          disabled={mutation.isPending}
          value={note}
          onChange={(event) => update(rawText, event.target.value)}
          placeholder="Ví dụ: Điều chỉnh trạng thái câu đã đối chiếu lại với nguồn chính sử"
          className="min-h-11 w-full rounded-[10px] border border-mod-border bg-mod-surface px-3 font-moderator text-sm text-mod-text placeholder:text-mod-text-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary disabled:opacity-60"
        />
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        <button
          type="button"
          disabled={mutation.isPending}
          onClick={handleCancelClick}
          className="inline-flex min-h-11 items-center rounded-[10px] border border-mod-border bg-mod-surface px-4 font-moderator text-sm font-bold text-mod-text hover:bg-mod-canvas-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary disabled:opacity-50"
        >
          Hủy
        </button>
        <button
          type="button"
          disabled={mutation.isPending || rateLimit !== null || step.currentVersion === null}
          onClick={handleSave}
          className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-mod-primary px-4 font-moderator text-sm font-bold text-white hover:bg-mod-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mod-primary disabled:opacity-50"
        >
          {mutation.isPending ? (
            <CircleNotch size={ICON_SIZE} weight="bold" className="motion-safe:animate-spin" aria-hidden={true} />
          ) : (
            <FloppyDisk size={ICON_SIZE} weight="bold" aria-hidden={true} />
          )}
          <ModeratorText>Lưu chỉnh sửa</ModeratorText>
        </button>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        title="Bỏ thay đổi chưa lưu?"
        description="Các chỉnh sửa JSON bạn vừa nhập sẽ bị xoá và không thể khôi phục."
        confirmLabel="Bỏ thay đổi"
        tone="danger"
        onCancel={() => setConfirmCancel(false)}
        onConfirm={() => {
          setConfirmCancel(false);
          clear();
          onCancel();
        }}
      />
    </div>
  );
}
