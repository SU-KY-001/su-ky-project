import { useEffect, useMemo, useRef, useState, type ReactElement, type RefObject } from "react";
import { ArrowRight, Pencil, RefreshCw } from "lucide-react";
import { SCRIPT_MAX_CHARACTERS, type OutlineSection } from "@repo/shared";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAngles } from "../../angles/useAngles";
import { composeService } from "../../compose/composeService";
import { describeComposeError, isAbort } from "../../compose/composeMessages";
import {
  cleanedSections, clearOutline, DEFAULT_MINUTES, hasUntitledSection, loadOutline, saveOutline, sectionsAreEqual, wordsForMinutes,
} from "../../compose/outlineState";
import { DEFAULT_TONE_PRESET, toneInput } from "../../compose/toneOptions";
import type { RichScriptEditorHandle } from "../RichScriptEditor";
import { DraftOutlineStep } from "./DraftOutlineStep";
import { DraftResultStep } from "./DraftResultStep";
import { DraftToneStep, type ToneChoice } from "./DraftToneStep";
import { DraftTopicStep, type TopicForm } from "./DraftTopicStep";

const STEP_TITLES = ["Đề bài", "Dàn ý", "Giọng văn", "Bản nháp"] as const;
type Step = 0 | 1 | 2 | 3;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editorRef: RefObject<RichScriptEditorHandle | null>;
  episodeId: string | null;
  ensureEpisode: () => Promise<string>;
  wordsPerMinute: number;
  /** Characters in the script now, to tell how many a draft may still add. */
  scriptChars: number;
}

function Dots({ step }: { step: Step }): ReactElement {
  return (
    <div className="flex gap-1.5" aria-hidden="true">
      {STEP_TITLES.map((title, index) => <span key={title} className={cn("size-2 rounded-full", index === step ? "bg-mod-primary" : "bg-mod-border")} />)}
    </div>
  );
}

function Wizard({ onClose, editorRef, episodeId, ensureEpisode, wordsPerMinute, scriptChars }: Omit<Props, "open" | "onOpenChange"> & { onClose: () => void }): ReactElement {
  const angles = useAngles();
  const saved = useMemo(() => (episodeId ? loadOutline(episodeId) : null), [episodeId]);
  const [step, setStep] = useState<Step>(0);
  const [form, setForm] = useState<TopicForm>(() => ({
    topic: saved?.topic ?? "",
    angleId: saved?.angleId ?? "",
    minutes: DEFAULT_MINUTES,
    words: saved?.words ?? wordsForMinutes(DEFAULT_MINUTES, wordsPerMinute),
  }));
  const [sections, setSections] = useState<OutlineSection[] | null>(saved?.sections ?? null);
  const fetched = useRef<OutlineSection[] | null>(null);
  const [outlineLoading, setOutlineLoading] = useState(false);
  const [outlineError, setOutlineError] = useState("");
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [narration, setNarration] = useState<"THIRD_PERSON" | "FIRST_PERSON">("THIRD_PERSON");
  const [tone, setTone] = useState<ToneChoice>(DEFAULT_TONE_PRESET);
  const [custom, setCustom] = useState("");
  const controller = useRef<AbortController | null>(null);
  const [draftEpisodeId, setDraftEpisodeId] = useState(episodeId ?? "");

  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!form.angleId && angles.angles.length) setForm((current) => ({ ...current, angleId: angles.angles[0]!.id }));
    else if (form.angleId && angles.angles.length && !angles.angles.some((angle) => angle.id === form.angleId)) setForm((current) => ({ ...current, angleId: angles.angles[0]!.id }));
  }, [angles.angles, form.angleId]);
  useEffect(() => {
    if (draftEpisodeId && sections) saveOutline(draftEpisodeId, { topic: form.topic, angleId: form.angleId, words: form.words, sections });
  }, [draftEpisodeId, sections, form.topic, form.angleId, form.words]);

  const topicReady = form.topic.trim().length > 0 && form.angleId !== "";
  const toneValue = toneInput(tone, custom);
  const edited = sections !== null && fetched.current !== null && !sectionsAreEqual(sections, fetched.current);

  const createOutline = async (): Promise<void> => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setOutlineLoading(true);
    setOutlineError("");
    setConfirmRegenerate(false);
    setStep(1);
    try {
      const id = await ensureEpisode();
      setDraftEpisodeId(id);
      const response = await composeService.outline(id, { topic: form.topic.trim(), angleId: form.angleId, targetWords: form.words, narration }, current.signal);
      fetched.current = response.sections;
      setSections(response.sections);
    } catch (error) {
      if (isAbort(error)) return;
      setOutlineError(describeComposeError(error, "Không tạo được dàn ý."));
      if (!sections) setStep(0);
    } finally {
      if (controller.current === current) setOutlineLoading(false);
    }
  };

  const regenerate = (): void => {
    if (edited && !confirmRegenerate) return setConfirmRegenerate(true);
    void createOutline();
  };

  const cleaned = sections ? cleanedSections(sections) : [];

  return (
    <>
      <DialogHeader className="flex-row items-start justify-between border-b border-mod-border px-5 py-4 pr-14">
        <div>
          <DialogDescription className="text-xs text-mod-text-secondary">Soạn bản nháp</DialogDescription>
          <DialogTitle>{STEP_TITLES[step]}</DialogTitle>
        </div>
        <Dots step={step} />
      </DialogHeader>

      {step === 0 ? (
        <>
          <DraftTopicStep form={form} wordsPerMinute={wordsPerMinute} angles={{ items: angles.angles, loading: angles.loading, error: angles.error }} onChange={setForm} words={(minutes) => wordsForMinutes(minutes, wordsPerMinute)} />
          {outlineError ? <p role="alert" className="px-5 pb-3 text-sm text-mod-danger">{outlineError}</p> : null}
          <div className="flex justify-end gap-2 border-t border-mod-border px-5 py-3">
            <Button type="button" variant="outline" onClick={onClose}>Đóng</Button>
            {sections ? <Button type="button" variant="outline" onClick={() => setStep(1)}>Dùng dàn ý đã lưu</Button> : null}
            <Button type="button" disabled={!topicReady || outlineLoading} onClick={() => void createOutline()}>Tạo dàn ý <ArrowRight size={16} aria-hidden="true" /></Button>
          </div>
        </>
      ) : null}

      {step === 1 ? (
        <>
          <DraftOutlineStep sections={sections} loading={outlineLoading} error={outlineError} totalWords={form.words} onChange={setSections} />
          <div className="flex justify-end gap-2 border-t border-mod-border px-5 py-3">
            <Button type="button" variant="outline" disabled={outlineLoading} onClick={() => setStep(0)}>Quay lại</Button>
            <Button type="button" variant="outline" disabled={outlineLoading} onClick={regenerate}><RefreshCw size={15} aria-hidden="true" /> {confirmRegenerate ? "Bấm lần nữa để thay dàn ý đã sửa" : "Tạo lại dàn ý"}</Button>
            <Button type="button" disabled={outlineLoading || !sections || hasUntitledSection(sections)} onClick={() => setStep(2)}>Tiếp <ArrowRight size={16} aria-hidden="true" /></Button>
          </div>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <DraftToneStep narration={narration} firstPersonAvailable={false} tone={tone} custom={custom} onNarration={setNarration} onTone={setTone} onCustom={setCustom} />
          <div className="flex justify-end gap-2 border-t border-mod-border px-5 py-3">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>Quay lại</Button>
            <Button type="button" disabled={!toneValue} onClick={() => setStep(3)}><Pencil size={15} aria-hidden="true" /> Viết bản nháp</Button>
          </div>
        </>
      ) : null}

      {step === 3 && toneValue ? (
        <DraftResultStep
          key={cleaned.map((section) => section.id).join("|")}
          params={{ episodeId: draftEpisodeId, sections: cleaned, tone: toneValue, angleId: form.angleId, topic: form.topic.trim(), narration, remainingChars: () => Math.max(SCRIPT_MAX_CHARACTERS - scriptChars, 0) }}
          sections={cleaned}
          onBack={() => setStep(2)}
          onInsert={(items, at) => editorRef.current?.insertDraft(items, at) ?? { ok: false, reason: "CONFLICT" }}
          onInserted={() => {
            if (draftEpisodeId) clearOutline(draftEpisodeId);
            onClose();
          }}
        />
      ) : null}
    </>
  );
}

export function DraftWizardDialog({ open, onOpenChange, ...props }: Props): ReactElement {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 border-mod-border bg-mod-surface p-0 font-moderator text-mod-text sm:p-0">
        {open ? <Wizard {...props} onClose={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}
