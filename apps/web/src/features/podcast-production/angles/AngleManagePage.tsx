import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { LockSimple } from "@phosphor-icons/react/dist/icons/LockSimple";
import { PencilSimple } from "@phosphor-icons/react/dist/icons/PencilSimple";
import { Plus } from "@phosphor-icons/react/dist/icons/Plus";
import type { Angle } from "@repo/shared";
import { errorMessage, isApiError } from "@/lib/apiError";
import { cn } from "@/lib/utils";
import { DashboardHeader } from "@/shared/components/dashboard/DashboardOverview";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { notify } from "@/shared/lib/notifications";
import { AngleFormCard } from "./AngleFormCard";
import { angleService } from "./angleService";
import {
  ANGLE_MESSAGES,
  EMPTY_ANGLE_FORM,
  deletedMessage,
  duplicateForm,
  filterAngles,
  groupAngles,
  toAngleForm,
  trimmedForm,
  validateAngleForm,
  type AngleForm,
} from "./angleState";
import { useAngles } from "./useAngles";

const NAME_TAKEN_STATUS = 409;
const NEW_PARAM = "new";

function AngleRow({ angle, selected, onOpen }: { angle: Angle; selected: boolean; onOpen: () => void }) {
  const Icon = angle.builtin ? LockSimple : PencilSimple;
  return (
    <button type="button" onClick={onOpen} aria-current={selected || undefined} className={cn("flex w-full items-start gap-3 rounded-lg border bg-mod-surface px-3.5 py-3 text-left hover:bg-mod-canvas-accent focus-visible:outline-2", selected ? "border-mod-text" : "border-mod-border")}>
      <Icon className="mt-0.5 size-4 shrink-0 text-mod-text-secondary" aria-hidden />
      <span className="min-w-0">
        <b className="block truncate font-semibold text-mod-text">{angle.name}</b>
        <span className="block truncate text-sm text-mod-text-secondary">{angle.description || ANGLE_MESSAGES.noDescription}</span>
      </span>
    </button>
  );
}

function AngleGroup({ label, total, shown, emptyText, selectedId, onOpen }: { label: string; total: number; shown: Angle[]; emptyText: string; selectedId: string | null; onOpen: (a: Angle) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-mod-text-secondary">{label} <span className="text-xs font-medium">({total})</span></span>
      {shown.length ? shown.map((a) => <AngleRow key={a.id} angle={a} selected={a.id === selectedId} onOpen={() => onOpen(a)} />) : <div className="rounded-lg border border-dashed border-mod-border p-4 text-sm text-mod-text-secondary">{emptyText}</div>}
    </div>
  );
}

export function AngleManagePage() {
  const { angles, loading, error: loadError, refresh } = useAngles();
  const [params] = useSearchParams();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<AngleForm>(EMPTY_ANGLE_FORM);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement | null>(null);

  const selected = angles.find((a) => a.id === selectedId) ?? null;
  const mode = !selected ? "create" : selected.builtin ? "readonly" : "edit";
  const { mine, builtin } = groupAngles(angles);

  useEffect(() => { if (params.has(NEW_PARAM)) nameRef.current?.focus(); }, [params]);

  const open = (angle: Angle | null, next: AngleForm = angle ? toAngleForm(angle) : EMPTY_ANGLE_FORM) => {
    setSelectedId(angle?.id ?? null);
    setForm(next);
    setError(null);
    setConfirming(false);
  };
  const fail = (message: string, focus = false) => { setError(message); if (focus) nameRef.current?.focus(); };

  const save = async () => {
    const invalid = validateAngleForm(form, angles, selected?.id ?? null);
    if (invalid) return fail(invalid.message, true);
    setBusy(true);
    try {
      const body = trimmedForm(form);
      const saved = selected ? await angleService.update(selected.id, body) : await angleService.create(body);
      await refresh();
      open(saved);
      notify.success({ title: ANGLE_MESSAGES.saved });
    } catch (e) {
      if (isApiError(e, NAME_TAKEN_STATUS)) fail(ANGLE_MESSAGES.nameTaken, true);
      else fail(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!selected) return;
    if (!confirming) return setConfirming(true);
    setBusy(true);
    try {
      await angleService.remove(selected.id);
      await refresh();
      notify.success({ title: deletedMessage(selected.name) });
      open(null);
    } catch (e) {
      fail(errorMessage(e));
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  };

  const duplicate = () => {
    if (!selected) return;
    open(null, duplicateForm(selected));
    nameRef.current?.focus();
  };
  const cancel = () => open(mode === "edit" ? selected : null);
  const create = () => { open(null); nameRef.current?.focus(); };

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <DashboardHeader title="Góc kể của tôi" description="Góc kể là cách AI dẫn dắt câu chuyện khi soạn dàn ý và bản nháp. Chọn một góc có sẵn, hoặc tạo góc riêng với chỉ dẫn của bạn." actions={<span className="text-sm text-mod-text-secondary">Chỉ bạn thấy các góc kể của mình</span>} />
      {loadError ? <p role="alert" className="text-sm text-mod-danger">{loadError}</p> : null}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <section aria-busy={loading} className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <Input type="search" aria-label="Tìm góc kể" placeholder="Tìm góc kể" value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-65" />
            <Button type="button" onClick={create}><Plus aria-hidden />Tạo góc kể mới</Button>
          </div>
          <AngleGroup label="Của bạn" total={mine.length} shown={filterAngles(mine, query)} emptyText={mine.length ? ANGLE_MESSAGES.noMatch : ANGLE_MESSAGES.noMineYet} selectedId={selectedId} onOpen={open} />
          <AngleGroup label="Có sẵn" total={builtin.length} shown={filterAngles(builtin, query)} emptyText={ANGLE_MESSAGES.noMatch} selectedId={selectedId} onOpen={open} />
        </section>
        <AngleFormCard mode={mode} title={selected?.name ?? "Góc kể mới"} form={form} error={error} confirmingDelete={confirming} busy={busy} nameRef={nameRef} onChange={(patch) => setForm((f) => ({ ...f, ...patch }))} onSave={save} onCancel={cancel} onDuplicate={duplicate} onDelete={remove} />
      </div>
    </div>
  );
}
