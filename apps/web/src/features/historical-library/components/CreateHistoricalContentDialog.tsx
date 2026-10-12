import { useState, type FormEvent, type ReactElement, type ReactNode } from "react";
import {
  HistoricalTimeSchema,
  type HistoricalPeriodDetailDto,
  type HistoricalPhaseDetailDto,
  type HistoricalEntityDetailDto,
} from "@repo/shared";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  FormField,
  formField,
} from "@/features/moderator/components/CreationPage";
import { ModeratorSelect } from "@/features/moderator/components/ModeratorSelect";
import {
  primaryAction,
  secondaryAction,
} from "@/features/moderator/components/ModeratorTable";
import {
  useCreateHistoricalItem,
  usePatchHistoricalItem,
  useHistoricalPeriods,
  useHistoricalPhases,
} from "../hooks/useHistoricalCatalog";
import type { HistoricalKind } from "../services/historicalCatalogService";
import { historicalCatalogService } from "../services/historicalCatalogService";
import { ApiError } from "@/lib/apiError";
import {
  HistoricalTimeFields,
  emptyHistoricalTime,
} from "./HistoricalTimeFields";
import { notify } from "@/shared/lib/notifications";
export type HistoricalNodeDto =
  | HistoricalPeriodDetailDto
  | HistoricalPhaseDetailDto
  | HistoricalEntityDetailDto;
export interface HistoricalEdit {
  kind: HistoricalKind;
  node: HistoricalNodeDto;
}
interface HistoricalContentFormProps {
  onBack: () => void;
  onSaved: (kind: HistoricalKind, node: HistoricalNodeDto) => void;
  edit?: HistoricalEdit;
  initialKind?: HistoricalKind;
  initialPeriodId?: string;
  initialPhaseId?: string;
  contentSelection?: (busy: boolean) => ReactNode;
  canSave?: boolean;
}

export function CreateHistoricalContentDialog(props: HistoricalContentFormProps): ReactElement {
  return (
    <DialogContent className="flex h-auto max-h-[calc(100dvh-2rem)] max-w-2xl flex-col gap-0 overflow-hidden border-mod-border bg-mod-surface p-0 font-moderator text-mod-text sm:p-0">
      <DialogHeader className="shrink-0 border-b border-mod-border px-5 py-4 pr-16">
        <DialogTitle>{props.edit ? "Sửa nội dung lịch sử" : "Tạo nội dung lịch sử"}</DialogTitle>
        <DialogDescription className="text-mod-text-secondary">
          {props.edit
            ? "Cập nhật thông tin và thời gian của nội dung đã có."
            : "Chọn loại nội dung, nhập thông tin và thời gian. Bổ sung nguồn sau khi lưu nháp."}
        </DialogDescription>
      </DialogHeader>
      <HistoricalContentForm {...props} />
    </DialogContent>
  );
}

export function HistoricalContentForm({
  onBack,
  onSaved,
  edit,
  initialKind = "period",
  initialPeriodId = "",
  initialPhaseId = "",
  contentSelection,
  canSave = true,
}: HistoricalContentFormProps): ReactElement {
  const [kind, setKind] = useState<HistoricalKind>(edit?.kind ?? initialKind);
  const [periodId, setPeriodId] = useState(
    edit?.node && "periodId" in edit.node
      ? edit.node.periodId
      : edit?.node && "historicalPhase" in edit.node
        ? (edit.node.historicalPhase?.periodId ?? initialPeriodId)
        : initialPeriodId,
  );
  const [phaseId, setPhaseId] = useState(
    edit?.node && "historicalPhaseId" in edit.node
      ? (edit.node.historicalPhaseId ?? initialPhaseId)
      : initialPhaseId,
  );
  const [name, setName] = useState(edit?.node.name ?? "");
  const [summary, setSummary] = useState(edit?.node.summary ?? "");
  const [baseVersion, setBaseVersion] = useState(edit?.node.version ?? 1);
  const [time, setTime] = useState(
    edit?.node.time ?? emptyHistoricalTime(kind !== "entity"),
  );
  const [error, setError] = useState("");
  const periods = useHistoricalPeriods();
  const phases = useHistoricalPhases(periodId, {}, Boolean(periodId));
  const create = useCreateHistoricalItem();
  const patch = usePatchHistoricalItem();
  const busy = create.isPending || patch.isPending;
  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (busy || !canSave) return;
    setError("");
    const uncertainTime = time.kind === "UNKNOWN" || (time.kind === "RANGE" && (time.start === null || time.endState === "UNKNOWN"));
    const parsed = HistoricalTimeSchema.safeParse(uncertainTime ? time : { ...time, note: undefined });
    if (!name.trim() || (!edit && !summary.trim())) {
      setError(edit ? "Vui lòng nhập tên nội dung." : "Vui lòng nhập tên và mô tả.");
      return;
    }
    if (!parsed.success) {
      setError(
        parsed.error.issues[0]?.message ?? "Mốc thời gian không hợp lệ.",
      );
      return;
    }
    if (kind !== "period" && !periodId) {
      setError("Vui lòng chọn thời kỳ cha.");
      return;
    }
    if (kind === "entity" && !phaseId) {
      setError("Vui lòng chọn giai đoạn cha.");
      return;
    }
    try {
      const draft = {
        kind,
        name: name.trim(),
        summary: summary.trim(),
        time: parsed.data,
        periodId: kind === "phase" ? periodId : undefined,
        historicalPhaseId: kind === "entity" ? phaseId : undefined,
      };
      const result = edit
        ? await patch.mutateAsync({
            kind,
            id: edit.node.id,
            input: draft,
            baseVersion,
          })
        : await create.mutateAsync(draft);
      notify.success({
        title: edit
          ? "Đã cập nhật nội dung lịch sử."
          : `Đã tạo bản nháp ${kind === "period" ? "thời kỳ" : kind === "phase" ? "giai đoạn" : "sự kiện"} “${name.trim()}”.`,
        description: "Đã lưu vào hệ thống; dữ liệu được giữ khi tải lại trang.",
      });
      onSaved(kind, result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được nội dung.");
    }
  };
  return (
      <form
        noValidate
        onSubmit={(e) => {
          void submit(e);
        }}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="mod-dialog-scroll-area flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-5">
          <div className="grid items-start gap-4 sm:grid-cols-2">
          {contentSelection ? contentSelection(busy) : <FormField label="Loại nội dung" htmlFor="history-kind">
            <ModeratorSelect
              id="history-kind"
              label="Loại nội dung"
              disabled={Boolean(edit) || busy}
              value={
                kind === "entity"
                  ? "event"
                  : kind === "phase"
                    ? "stage"
                    : "period"
              }
              onValueChange={(v) => {
                const next =
                  v === "event" ? "entity" : v === "stage" ? "phase" : "period";
                setKind(next);
                setTime(emptyHistoricalTime(next !== "entity"));
              }}
              options={[
                { value: "period", label: "Thời kỳ" },
                { value: "stage", label: "Giai đoạn" },
                { value: "event", label: "Sự kiện" },
              ]}
              placeholder="Chọn loại"
            />
          </FormField>}
          <FormField label="Tên nội dung" htmlFor="history-name">
            <Input
              id="history-name"
              aria-label="Tên nội dung"
              className={formField}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </FormField>
          {kind !== "period" ? (
            <FormField label="Thời kỳ" htmlFor="history-period">
              <ModeratorSelect
                id="history-period"
                label="Thời kỳ"
                value={periodId}
                onValueChange={(v) => {
                  setPeriodId(v);
                  setPhaseId("");
                }}
                options={
                  periods.data?.pages.flatMap((p) =>
                    p.items.map((n) => ({ value: n.id, label: n.name })),
                  ) ?? []
                }
                placeholder="Chọn thời kỳ"
              />
              {periods.hasNextPage ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    void periods.fetchNextPage();
                  }}
                >
                  Tải thêm thời kỳ
                </Button>
              ) : null}
              {periods.error ? (
                <p role="alert">{periods.error.message}</p>
              ) : null}
            </FormField>
          ) : null}
          {kind === "entity" ? (
            <FormField label="Giai đoạn" htmlFor="history-phase">
              <ModeratorSelect
                id="history-phase"
                label="Giai đoạn"
                disabled={!periodId || phases.isPending}
                value={phaseId}
                onValueChange={setPhaseId}
                options={
                  phases.data?.pages.flatMap((p) =>
                    p.items.map((n) => ({ value: n.id, label: n.name })),
                  ) ?? []
                }
                placeholder="Chọn giai đoạn"
              />
              {phases.hasNextPage ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    void phases.fetchNextPage();
                  }}
                >
                  Tải thêm giai đoạn
                </Button>
              ) : null}
              {phases.error ? <p role="alert">{phases.error.message}</p> : null}
            </FormField>
          ) : null}
          </div>
          <HistoricalTimeFields
            value={time}
            onChange={setTime}
            taxonomy={kind !== "entity"}
          />
          <FormField label="Mô tả" htmlFor="history-summary">
            <Textarea
              id="history-summary"
              aria-label="Mô tả"
              className={`${formField} min-h-28 resize-y`}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
          </FormField>
          {error ? (
            <p role="alert" className="text-sm text-mod-danger">
              {error}
            </p>
          ) : null}
          {edit &&
          patch.error instanceof ApiError &&
          patch.error.errorCode === "STALE_WRITE" ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void historicalCatalogService
                  .detail(kind, edit.node.id)
                  .then((latest) => {
                    setBaseVersion(latest.version);
                    setError(
                      `Đã tải phiên bản ${latest.version}. Nội dung hiện tại: ${latest.name} — ${latest.summary ?? ""}. Nội dung đang nhập được giữ để bạn đối chiếu trước khi lưu.`,
                    );
                  })
                  .catch((e) =>
                    setError(
                      e instanceof Error
                        ? e.message
                        : "Không tải được phiên bản mới.",
                    ),
                  );
              }}
            >
              Tải phiên bản mới để đối chiếu
            </Button>
          ) : null}
        </div>
        <footer className="flex shrink-0 justify-end gap-3 border-t border-mod-border bg-mod-surface px-5 py-3">
          <Button
            type="button"
            variant="outline"
            className={secondaryAction}
            onClick={onBack}
            disabled={busy}
          >
            Hủy
          </Button>
          <Button type="submit" className={primaryAction} disabled={busy || !canSave}>
            {busy ? "Đang lưu…" : edit ? "Lưu thay đổi" : "Lưu bản nháp"}
          </Button>
        </footer>
      </form>
  );
}
