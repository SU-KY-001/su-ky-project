import { useState, type ReactElement } from "react";
import { canEditHistoricalContent, type HistoricalPeriodDetailDto } from "@repo/shared";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { primaryAction, secondaryAction } from "@/features/moderator/components/ModeratorTable";
import { FormField } from "@/features/moderator/components/CreationPage";
import { ModeratorSelect } from "@/features/moderator/components/ModeratorSelect";
import { useHistoricalBranch } from "../hooks/useHistoricalCatalog";
import { ContentKindIcon } from "@/features/moderator/components/ModeratorTreeNode";
import { HistoricalBranchContent } from "./HistoricalBranchContent";
import { HistoricalContentForm, type HistoricalEdit } from "./CreateHistoricalContentDialog";
import { useCurrentUser } from "@/shared/hooks/useCurrentUser";
import type { HistoricalKind } from "../services/historicalCatalogService";
import { PencilSimple } from "@phosphor-icons/react";

interface HistoricalBranchDetailDialogProps {
  period: HistoricalPeriodDetailDto;
}

interface HistoricalBranchEditorProps {
  items: HistoricalEdit[];
  canEdit: (item: HistoricalEdit) => boolean;
  onBack: () => void;
}

function HistoricalBranchEditor({ items, canEdit, onBack }: HistoricalBranchEditorProps): ReactElement {
  const [kind, setKind] = useState<HistoricalKind>("period");
  const [selectedId, setSelectedId] = useState("");
  const matching = items.filter((item) => item.kind === kind);
  const selected = matching.find((item) => item.node.id === selectedId) ?? matching[0];
  const contentSelection = (busy: boolean): ReactElement => <>
    <FormField label="Loại nội dung" htmlFor="history-kind">
      <ModeratorSelect id="history-kind" label="Loại nội dung" disabled={busy}
        value={kind === "entity" ? "event" : kind === "phase" ? "stage" : "period"}
        onValueChange={(value) => {
          setKind(value === "event" ? "entity" : value === "stage" ? "phase" : "period");
          setSelectedId("");
        }}
        options={[{ value: "period", label: "Thời kỳ" }, { value: "stage", label: "Giai đoạn" }, { value: "event", label: "Sự kiện" }]}
        placeholder="Chọn loại" />
    </FormField>
    <FormField label="Nội dung cần chỉnh sửa" htmlFor="history-edit-target">
      <ModeratorSelect id="history-edit-target" label="Nội dung cần chỉnh sửa" disabled={busy || matching.length === 0}
        value={selected?.node.id ?? ""} onValueChange={setSelectedId}
        options={matching.map(({ node }) => ({ value: node.id, label: node.name }))}
        placeholder="Chọn nội dung" />
    </FormField>
    {selected && !canEdit(selected) ? <p role="status" className="text-sm text-mod-text-secondary sm:col-span-2">Bạn không có quyền chỉnh sửa nội dung này.</p> : null}
  </>;

  if (!selected) return <div className="flex min-h-0 flex-1 flex-col">
    <div className="mod-dialog-scroll-area min-h-0 flex-1 overflow-y-auto p-5">
      <div className="grid items-start gap-4 sm:grid-cols-2">{contentSelection(false)}</div>
      <p role="status" className="mt-4 text-sm text-mod-text-secondary">{kind === "period" ? "Không có thời kỳ đang hoạt động để chỉnh sửa." : kind === "phase" ? "Chưa có giai đoạn để chỉnh sửa." : "Chưa có sự kiện để chỉnh sửa."}</p>
    </div>
    <footer className="flex shrink-0 justify-end border-t border-mod-border px-5 py-3">
      <Button type="button" variant="outline" className={secondaryAction} onClick={onBack}>Hủy</Button>
    </footer>
  </div>;

  return <HistoricalContentForm key={kind + ":" + selected.node.id} edit={selected}
    contentSelection={contentSelection} canSave={canEdit(selected)}
    onBack={onBack} onSaved={onBack} />;
}

export function HistoricalBranchDetailDialog({ period }: HistoricalBranchDetailDialogProps): ReactElement {
  const detail = useHistoricalBranch(period.id, false);
  const node = detail.data?.period ?? period;
  const [editing, setEditing] = useState(false);
  const user = useCurrentUser().data;
  const items = ([
    { kind: "period", node },
    ...(detail.data?.phases.flatMap(({ phase, events }): HistoricalEdit[] => [
      { kind: "phase", node: phase },
      ...events.map((event): HistoricalEdit => ({ kind: "entity", node: event })),
    ]) ?? []),
  ] satisfies HistoricalEdit[]).filter((item) => !item.node.deletedAt);
  const canEdit = (item: HistoricalEdit): boolean => canEditHistoricalContent(
    user ? { userId: user.id, role: user.role } : undefined, item.node.createdById, item.kind,
  );
  return (
    <DialogContent className="flex h-auto max-h-[85dvh] max-w-3xl flex-col gap-0 overflow-hidden rounded-xl border-mod-border bg-mod-surface p-0 font-moderator text-mod-text shadow-lg sm:p-0">
      <DialogHeader className="shrink-0 border-b border-mod-border px-5 py-4 pr-16">
        <DialogTitle className="break-words text-xl leading-7">{editing ? "Chỉnh sửa nội dung" : node.name}</DialogTitle>
        <DialogDescription className="text-sm text-mod-text-secondary">
          {editing ? "Chọn loại và nội dung trong thời kỳ này để chỉnh sửa." : "Thời kỳ · " + node.timeLabel}
        </DialogDescription>
      </DialogHeader>
      {editing ? <HistoricalBranchEditor items={items} canEdit={canEdit} onBack={() => setEditing(false)} /> : <>
      <div className="mod-dialog-scroll-area min-h-0 flex-auto overflow-y-auto overscroll-contain px-5 py-4" tabIndex={0} role="region" aria-label="Nội dung chi tiết">
        {detail.isPending ? <p role="status" className="text-sm text-mod-text-secondary">Đang tải toàn bộ nhánh lịch sử…</p>
          : detail.error ? (
            <div role="alert" className="space-y-3 text-sm text-mod-danger">
              <p>{detail.error.message}</p>
              <Button variant="outline" onClick={() => { void detail.refetch(); }}>Thử lại</Button>
            </div>
          ) : detail.data ? (
            <div className="space-y-4">
              <HistoricalBranchContent kind="period" node={detail.data.period} />
              <section aria-label="Các giai đoạn trong thời kỳ" className="space-y-4">
                <h2 className="text-lg font-bold">Giai đoạn và sự kiện ({detail.data.phases.length} giai đoạn)</h2>
                {detail.data.phases.length === 0 ? <p className="text-sm text-mod-text-secondary">Thời kỳ chưa có giai đoạn.</p> : null}
                {detail.data.phases.map(({ phase, events }, index) => (
                  <section key={phase.id} aria-label={phase.name} className="space-y-3 border-t border-mod-border pt-4">
                    <header className="flex items-center gap-3">
                      <ContentKindIcon kind="stage" />
                      <div className="min-w-0">
                        <h3 className="break-words text-base font-semibold">{index + 1}. {phase.name}</h3>
                        <p className="text-sm text-mod-text-secondary">Giai đoạn · {phase.timeLabel}</p>
                      </div>
                    </header>
                    <HistoricalBranchContent kind="phase" node={phase} />
                    <section aria-label={"Sự kiện thuộc " + phase.name} className="space-y-3 border-l border-mod-border pl-4">
                      {events.length === 0 ? <p className="text-xs text-mod-text-secondary">Chưa có sự kiện.</p> : <h4 className="text-sm font-semibold">Sự kiện ({events.length})</h4>}
                      {events.map((event) => (
                        <article key={event.id} aria-label={event.name} className="space-y-2">
                          <header className="flex items-center gap-3">
                            <ContentKindIcon kind="event" />
                            <div className="min-w-0">
                              <h5 className="break-words font-bold">{event.name}</h5>
                              <p className="text-sm text-mod-text-secondary">Sự kiện · {event.timeLabel}</p>
                            </div>
                          </header>
                          <HistoricalBranchContent kind="entity" node={event} />
                        </article>
                      ))}
                    </section>
                  </section>
                ))}
              </section>
            </div>
          ) : null}
      </div>
      <footer className="flex shrink-0 justify-end gap-2 border-t border-mod-border px-5 py-3">
        <Button type="button" className={primaryAction} disabled={!items.some(canEdit) || Boolean(detail.error) || detail.isPending}
          onClick={() => setEditing(true)}><PencilSimple size={15} aria-hidden="true" />Chỉnh sửa</Button>
      </footer>
      </>}
    </DialogContent>
  );
}
