import { useMemo, useState } from "react";
import { Plus, ArrowRight, CalendarBlank } from "@phosphor-icons/react";
import { useSearchParams } from "react-router";
import { useModeratorToastStore } from "@/features/moderator/toastStore";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/shared/components/ui/accordion";
import { historicalLibraryFixture } from "../data";
import { createSessionEvent, createSessionPeriod, createSessionStage, findSelectedNode } from "../model";
import type { HistoricalPeriod, HistorySelection } from "../types";
import { CreateHistoricalItemDialog, type HistoricalDraftInput, type HistoricalDraftKind } from "./CreateHistoricalItemDialog";
import { LibraryContent } from "./LibraryContent";
import { LibraryStatusBadge } from "./LibraryStatusBadge";

function parseSelection(periods: HistoricalPeriod[], params: URLSearchParams): HistorySelection | null {
  const id = params.get("node");
  if (!id) return null;
  for (const period of periods) {
    if (period.id === id) return { type: "period", id };
    for (const stage of period.stages) {
      if (stage.id === id) return { type: "stage", id };
      if (stage.events.some((event) => event.id === id)) return { type: "event", id };
    }
  }
  return null;
}

export function HistoricalLibraryWorkspace() {
  const [periods, setPeriods] = useState<HistoricalPeriod[]>(historicalLibraryFixture);
  const [searchParams, setSearchParams] = useSearchParams();
  const [createKind, setCreateKind] = useState<HistoricalDraftKind>("period");
  const [createOpen, setCreateOpen] = useState(false);
  const showToast = useModeratorToastStore((state) => state.show);
  const selection = parseSelection(periods, searchParams);
  const selectedNode = useMemo(() => selection ? findSelectedNode(periods, selection) : null, [periods, selection]);

  const selectNode = (next: HistorySelection) => setSearchParams({ node: next.id });
  const selectedPeriodId = selectedNode?.period.id ?? "";
  const selectedStageId = selectedNode && selectedNode.type !== "period" ? selectedNode.stage.id : "";
  const openCreation = (kind: HistoricalDraftKind) => { setCreateKind(kind); setCreateOpen(true); };
  const submitDraft = (input: HistoricalDraftInput) => {
    if (createKind === "period") {
      const period = createSessionPeriod(input);
      setPeriods((current) => [...current, period]);
      setSearchParams({ node: period.id });
      selectNode({ type: "period", id: period.id });
      showToast("Đã thêm thời kỳ trong phiên hiện tại.");
      return;
    }
    if (!selectedNode) return;
    if (createKind === "stage") {
      const stage = createSessionStage(input);
      const periodId = selectedNode.period.id;
      setPeriods((current) => current.map((period) => period.id === periodId ? { ...period, stages: [...period.stages, stage] } : period));
      setSearchParams({ node: stage.id });
      showToast("Đã thêm giai đoạn trong phiên hiện tại.");
      return;
    }
    if (selectedNode.type !== "stage") return;
    const event = createSessionEvent(input);
    const stageId = selectedNode.stage.id;
    setPeriods((current) => current.map((period) => ({
      ...period,
      stages: period.stages.map((stage) => stage.id === stageId ? { ...stage, events: [...stage.events, event] } : stage),
    })));
    setSearchParams({ node: event.id });
    showToast("Đã thêm sự kiện trong phiên hiện tại.");
  };

  const parentLabel = createKind === "stage" ? selectedNode?.period.name : createKind === "event" && selectedNode?.type === "stage" ? selectedNode.stage.name : undefined;

  const setPeriodOpen = (value: string) => {
    if (!value) {
      setSearchParams({});
      return;
    }
    const period = periods.find((item) => item.id === value);
    if (period) selectNode({ type: "period", id: period.id });
  };

  const setStageOpen = (period: HistoricalPeriod, value: string) => {
    if (!value) {
      selectNode({ type: "period", id: period.id });
      return;
    }
    selectNode({ type: "stage", id: value });
  };

  return (
    <div className="flex w-full flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Dòng lịch sử</h1>
          <p className="mt-1 text-sm text-ink-soft">Đi lần lượt từ thời kỳ đến giai đoạn, rồi mở từng sự kiện lịch sử.</p>
        </div>
        <button type="button" onClick={() => openCreation("period")} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-vermilion px-4 text-sm font-bold text-white hover:bg-vermilion-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
          <Plus size={17} weight="bold" aria-hidden="true" />Tạo thời kỳ
        </button>
      </header>

      {periods.length ? (
        <Accordion type="single" collapsible value={selectedPeriodId} onValueChange={setPeriodOpen} className="w-full">
          {periods.map((period, periodIndex) => (
            <AccordionItem key={period.id} value={period.id} className="border-b border-mod-border">
              <AccordionTrigger className="py-5 hover:no-underline">
                <span className="flex min-w-0 items-center gap-4">
                  <span className="w-8 shrink-0 text-xs font-bold tabular-nums text-mod-text-low">{String(periodIndex + 1).padStart(2, "0")}</span>
                  <span className="min-w-0 text-left">
                    <span className="block text-base font-bold text-mod-text">{period.name}</span>
                    <span className="mt-1 flex items-center gap-1.5 text-xs font-normal text-mod-text-secondary"><CalendarBlank size={13} aria-hidden="true" />{period.timeLabel}</span>
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-5 pl-12">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="max-w-3xl text-sm leading-6 text-mod-text-secondary">{period.summary}</p>
                  <button type="button" onClick={() => openCreation("stage")} className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold text-mod-primary hover:bg-mod-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary"> <Plus size={15} aria-hidden="true" />Thêm giai đoạn</button>
                </div>

                {period.stages.length ? (
                  <Accordion type="single" collapsible value={selectedPeriodId === period.id ? selectedStageId : ""} onValueChange={(value) => setStageOpen(period, value)} className="ml-2 border-l border-mod-border pl-5">
                    {period.stages.map((stage, stageIndex) => (
                      <AccordionItem key={stage.id} value={stage.id} className="border-b border-mod-border/70 last:border-b-0">
                        <AccordionTrigger className="py-4 hover:no-underline">
                          <span className="flex min-w-0 items-start gap-3">
                            <span className="mt-0.5 text-[11px] font-bold tabular-nums text-mod-text-low">{String(stageIndex + 1).padStart(2, "0")}</span>
                            <span className="min-w-0 text-left"><span className="block text-sm font-bold text-mod-text">{stage.name}</span><span className="mt-1 block text-xs font-normal text-mod-text-secondary">{stage.timeLabel} · {stage.events.length} sự kiện</span></span>
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4 pl-8">
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <p className="max-w-3xl text-sm leading-6 text-mod-text-secondary">{stage.summary}</p>
                            <button type="button" onClick={() => { selectNode({ type: "stage", id: stage.id }); openCreation("event"); }} className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-md px-2 text-xs font-semibold text-mod-primary hover:bg-mod-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary"><Plus size={14} aria-hidden="true" />Thêm sự kiện</button>
                          </div>
                          {stage.events.length ? <ul className="divide-y divide-mod-border border-y border-mod-border">
                            {stage.events.map((event) => (
                              <li key={event.id}>
                                <button type="button" onClick={() => selectNode({ type: "event", id: event.id })} aria-current={selectedNode?.type === "event" && selectedNode.event.id === event.id ? "true" : undefined} className="group flex w-full items-center gap-3 py-3 text-left hover:bg-mod-canvas-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary">
                                  <span className="size-2 shrink-0 rounded-full bg-mod-primary/70 ring-4 ring-mod-primary/5" />
                                  <span className="min-w-0 flex-1"><strong className="block text-sm font-semibold text-mod-text">{event.name}</strong><span className="mt-1 block text-xs text-mod-text-secondary">{event.timeLabel}</span></span>
                                  <LibraryStatusBadge status={event.status} compact />
                                  <ArrowRight size={15} className="shrink-0 text-mod-text-low transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                                </button>
                              </li>
                            ))}
                          </ul> : <p className="border-y border-dashed border-mod-border py-5 text-sm text-mod-text-secondary">Giai đoạn này chưa có sự kiện.</p>}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                ) : <p className="ml-2 border-l border-dashed border-mod-border py-4 pl-5 text-sm text-mod-text-secondary">Thời kỳ này chưa có giai đoạn.</p>}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : <p className="py-12 text-center text-sm text-mod-text-secondary">Chưa có thời kỳ nào trong thư viện.</p>}

      {selectedNode?.type === "event" ? <section className="border-t border-mod-border pt-5"><LibraryContent selected={selectedNode} onSelect={selectNode} onCreateChild={openCreation} /></section> : null}
      <CreateHistoricalItemDialog open={createOpen} kind={createKind} parentLabel={parentLabel} onOpenChange={setCreateOpen} onSubmit={submitDraft} />
    </div>
  );
}
