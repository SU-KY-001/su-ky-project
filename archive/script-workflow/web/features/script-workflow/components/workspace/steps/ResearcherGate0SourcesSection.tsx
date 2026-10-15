import { useEffect, useState } from "react";
import { Plus, WarningCircle } from "@phosphor-icons/react";
import type { ResearchConsultation, SourceItem, WorkflowStep } from "@repo/shared";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { RateLimitNotice } from "../../create/Notices";
import { useGate0SourcesDraft } from "../gates/gate0Drafts";
import { SourceFormModal } from "../gates/SourceFormModal";
import { Callout, Chip } from "./stepUi";
import { Gate0SourcesList } from "./ResearcherGate0SourcesList";
import { DeletedSourceNotice, UnsavedSourcesBar } from "./ResearcherGate0SourceNotices";
import { ICON_SIZE_SM } from "./ResearcherSources";
import { useGate0SourcesSave } from "./useGate0SourcesSave";

type DeletedSourceSnapshot = { item: SourceItem; index: number };

type Gate0SourcesSectionProps = {
  workflowId: number;
  step: WorkflowStep;
  data: ResearchConsultation;
  onConflict: () => void;
};

/** Gate 0 source catalogue editor: add/edit/delete with undo, saved as a DIRECT_EDIT new version. */
export function Gate0SourcesSection({ workflowId, step, data, onConflict }: Gate0SourcesSectionProps) {
  const { sources, note, isDirty, updateSources, updateNote, reset } = useGate0SourcesDraft(workflowId, data);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<SourceItem | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [deletedSnapshot, setDeletedSnapshot] = useState<DeletedSourceSnapshot | null>(null);

  const { isPending, serverError, rateLimit, clearRateLimit, handleSave } = useGate0SourcesSave({
    workflowId,
    step,
    data,
    sources,
    note,
    clearDraft: () => {
      reset();
      setDeletedSnapshot(null);
    },
    onConflict,
  });

  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const handleDeleteSource = (sourceId: string) => {
    const index = sources.findIndex((item) => item.id === sourceId);
    const target = sources[index];
    if (index < 0 || !target) return;
    setDeletedSnapshot({ item: target, index });
    setConfirmingDeleteId(null);
    updateSources(sources.filter((item) => item.id !== sourceId));
  };

  const handleUndoDelete = () => {
    if (!deletedSnapshot) return;
    const next = [...sources];
    const insertAt = Math.min(Math.max(0, deletedSnapshot.index), next.length);
    next.splice(insertAt, 0, deletedSnapshot.item);
    updateSources(next);
    setDeletedSnapshot(null);
  };

  const handleSourceModalSubmit = (submitted: SourceItem) => {
    if (editingSource) {
      updateSources(sources.map((item) => (item.id === submitted.id ? submitted : item)));
    } else {
      updateSources([...sources, submitted]);
    }
    setModalOpen(false);
    setEditingSource(null);
  };

  return (
    <>
      <section id="gate0-sources-section" className="flex flex-col gap-3 rounded-[14px] border border-mod-border bg-mod-canvas/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <ModeratorText as="h3" className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-mod-text">
              <span aria-hidden="true" className="h-4 w-1.5 shrink-0 rounded-full bg-mod-primary" />
              <span>Danh mục nguồn ({sources.length})</span>
            </ModeratorText>
            {isDirty ? (
              <Chip tone="attention" icon={<WarningCircle size={ICON_SIZE_SM} weight="fill" aria-hidden={true} />}>
                Có thay đổi chưa lưu
              </Chip>
            ) : null}
          </div>
          <button
            id="gate0-add-source-btn"
            type="button"
            disabled={isPending}
            onClick={() => {
              setEditingSource(null);
              setModalOpen(true);
            }}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] bg-mod-primary px-4 font-moderator text-xs font-extrabold text-white shadow-sm hover:bg-mod-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary disabled:opacity-50"
          >
            <Plus size={ICON_SIZE_SM} weight="bold" aria-hidden={true} />
            Thêm nguồn
          </button>
        </div>
        {deletedSnapshot ? (
          <DeletedSourceNotice sourceName={deletedSnapshot.item.name} onUndo={handleUndoDelete} />
        ) : null}

        {serverError ? (
          <Callout tone="danger" title="Không thể lưu danh mục nguồn" role="alert">
            {serverError}
          </Callout>
        ) : null}

        {rateLimit ? (
          <RateLimitNotice key={rateLimit.startedAt} seconds={rateLimit.seconds} onElapsed={clearRateLimit} />
        ) : null}

        {isDirty ? (
          <UnsavedSourcesBar
            note={note}
            saving={isPending}
            saveDisabled={isPending || rateLimit !== null || step.currentVersion === null}
            onNoteChange={updateNote}
            onResetAll={() => {
              reset();
              setDeletedSnapshot(null);
            }}
            onSave={handleSave}
          />
        ) : null}

        <Gate0SourcesList
          sources={sources}
          confirmingDeleteId={confirmingDeleteId}
          onEdit={(source) => {
            setEditingSource(source);
            setModalOpen(true);
          }}
          onRequestDelete={(sourceId) => setConfirmingDeleteId(sourceId)}
          onCancelDelete={() => setConfirmingDeleteId(null)}
          onConfirmDelete={(sourceId) => handleDeleteSource(sourceId)}
        />
      </section>

      <SourceFormModal
        open={modalOpen}
        editingSource={editingSource}
        existingSources={sources}
        onClose={() => {
          setModalOpen(false);
          setEditingSource(null);
        }}
        onSubmit={handleSourceModalSubmit}
      />
    </>
  );
}
