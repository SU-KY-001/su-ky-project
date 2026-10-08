import { useCallback, useId, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleNotch, PaperPlaneTilt, WarningCircle } from "@phosphor-icons/react";
import { CreateScriptWorkflowRequestSchema, type CreateScriptWorkflowRequest } from "@repo/shared";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { useModeratorToastStore } from "@/features/moderator/toastStore";
import { errorMessage, errorRequestId, isApiError } from "@/lib/apiError";
import { cn } from "@/lib/utils";
import { SCRIPT_WORKFLOWS_PATH } from "@/features/moderator/navItems";
import { workflowDetailPath } from "../../constants";
import { useCreateScriptWorkflow } from "../../hooks/useWorkflowMutations";
import { useSystemHealth } from "../../hooks/useWorkflowReads";
import {
  AI_UNAVAILABLE_MESSAGE,
  BAD_REQUEST_STATUS,
  DEFAULT_RETRY_AFTER_SECONDS,
  SERVICE_UNAVAILABLE_STATUS,
  TOO_MANY_REQUESTS_STATUS,
  TOPIC_MAX_LENGTH,
  TOPIC_MIN_LENGTH,
} from "./constants";
import { AiUnavailableNotice, RateLimitNotice } from "./Notices";

const TOPIC_ROWS = 4;
const SERVER_ERROR_TYPE = "server";

type RateLimit = { seconds: number; startedAt: number };

/** Zod's default English text is replaced; only server messages are shown verbatim. */
function topicErrorText(type: string | undefined, message: string | undefined, length: number): string | null {
  if (type === SERVER_ERROR_TYPE) return message ?? null;
  if (!type) return null;
  if (length > TOPIC_MAX_LENGTH) return `Chủ đề tối đa ${TOPIC_MAX_LENGTH} ký tự.`;
  return `Chủ đề cần ít nhất ${TOPIC_MIN_LENGTH} ký tự.`;
}

export function CreateWorkflowForm() {
  const navigate = useNavigate();
  const showToast = useModeratorToastStore((state) => state.show);
  const health = useSystemHealth();
  const mutation = useCreateScriptWorkflow();
  const [rateLimit, setRateLimit] = useState<RateLimit | null>(null);
  const topicId = useId();
  const topicHelpId = useId();
  const topicErrorId = useId();

  const form = useForm<CreateScriptWorkflowRequest>({
    resolver: zodResolver(CreateScriptWorkflowRequestSchema),
    mode: "onChange",
    defaultValues: { topic: "" },
  });
  const { register, handleSubmit, setError, control, formState } = form;
  const topic = useWatch({ control, name: "topic" });
  const length = topic.trim().length;
  const overLimit = length > TOPIC_MAX_LENGTH;

  const clearRateLimit = useCallback(() => setRateLimit(null), []);
  const aiUnavailable = health.data?.ai === "unavailable";
  const submitting = mutation.isPending || mutation.isSuccess;
  const mutationError = mutation.error;
  const serviceUnavailable = isApiError(mutationError, SERVICE_UNAVAILABLE_STATUS);
  const canSubmit = formState.isValid && !aiUnavailable && !submitting && rateLimit === null;

  const submit = handleSubmit((values) => {
    mutation.mutate(values, {
      onSuccess: ({ id }) => {
        void navigate(workflowDetailPath(id));
      },
      onError: (error) => {
        if (isApiError(error, BAD_REQUEST_STATUS)) {
          setError("topic", { type: SERVER_ERROR_TYPE, message: error.message }, { shouldFocus: true });
        } else if (isApiError(error, TOO_MANY_REQUESTS_STATUS)) {
          setRateLimit({ seconds: error.retryAfterSeconds ?? DEFAULT_RETRY_AFTER_SECONDS, startedAt: Date.now() });
        } else if (!isApiError(error, SERVICE_UNAVAILABLE_STATUS)) {
          showToast(errorMessage(error), errorRequestId(error));
        }
      },
    });
  });

  const errorText = topicErrorText(formState.errors.topic?.type, formState.errors.topic?.message, length);
  const showError = errorText !== null && (formState.dirtyFields.topic === true || formState.errors.topic?.type === SERVER_ERROR_TYPE);

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      {aiUnavailable ? <AiUnavailableNotice title={AI_UNAVAILABLE_MESSAGE} hint="Vui lòng quay lại sau ít phút." /> : null}
      {serviceUnavailable ? (
        <AiUnavailableNotice title={AI_UNAVAILABLE_MESSAGE} hint="Chủ đề của bạn vẫn được giữ lại. Bạn có thể thử lại sau ít phút." />
      ) : null}
      {rateLimit ? <RateLimitNotice key={rateLimit.startedAt} seconds={rateLimit.seconds} onElapsed={clearRateLimit} /> : null}

      <fieldset disabled={submitting} className="flex min-w-0 flex-col gap-2 border-0 p-0">
        <label htmlFor={topicId} className="text-sm font-bold text-mod-text">
          <ModeratorText>Chủ đề lịch sử</ModeratorText>
        </label>
        <textarea
          id={topicId}
          rows={TOPIC_ROWS}
          placeholder="Ví dụ: Chiến thắng Bạch Đằng năm 1288"
          aria-invalid={showError}
          aria-describedby={showError ? `${topicHelpId} ${topicErrorId}` : topicHelpId}
          className={cn(
            "field-sizing-content max-h-[50dvh] min-h-[120px] w-full resize-y rounded-[12px] border bg-mod-surface p-3 font-moderator text-sm text-mod-text placeholder:text-mod-text-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-mod-primary disabled:opacity-60",
            showError ? "border-mod-danger" : "border-mod-border",
          )}
          {...register("topic")}
        />
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
          <div id={topicErrorId} role="alert" className="min-h-5">
            {showError ? (
              <ModeratorText className="inline-flex items-center gap-1.5 text-xs font-bold text-mod-danger">
                <WarningCircle size={14} weight="fill" aria-hidden={true} />
                {errorText}
              </ModeratorText>
            ) : null}
          </div>
          <ModeratorText id={topicHelpId} className={cn("text-xs", overLimit ? "font-bold text-mod-danger" : "text-mod-text-muted")}>
            {length} / {TOPIC_MAX_LENGTH} ký tự (tối thiểu {TOPIC_MIN_LENGTH})
          </ModeratorText>
        </div>
      </fieldset>

      <ModeratorText className="rounded-[12px] bg-mod-canvas-accent p-3 text-xs text-mod-text-muted">
        Kết quả: 3 tập, văn nói, có nguồn tham khảo. Bạn sẽ duyệt ở 3 điểm trong quá trình.
      </ModeratorText>

      <div className="flex flex-wrap justify-end gap-3">
        <Link
          to={SCRIPT_WORKFLOWS_PATH}
          aria-disabled={submitting}
          className="inline-flex min-h-11 items-center rounded-[10px] border border-mod-border bg-mod-surface px-4 text-sm font-bold text-mod-text no-underline hover:bg-mod-canvas-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mod-primary"
        >
          Hủy
        </Link>
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-mod-primary px-4 text-sm font-bold text-white hover:bg-mod-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mod-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? (
            <CircleNotch size={18} weight="bold" className="motion-safe:animate-spin" aria-hidden={true} />
          ) : (
            <PaperPlaneTilt size={18} weight="bold" aria-hidden={true} />
          )}
          {submitting ? "Đang khởi tạo…" : "Bắt đầu tạo kịch bản"}
        </button>
      </div>
    </form>
  );
}
