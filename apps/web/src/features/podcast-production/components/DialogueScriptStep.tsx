import { useEffect, useRef, useState, type ReactElement } from "react";
import { DIALOGUE_NOTE_MAX_CHARS, DIALOGUE_STYLE_MAX_CHARS, DIALOGUE_TAGS, DIALOGUE_TURN_MAX_CHARS, DIALOGUE_VOICES, type Dialogue, type DialogueSpeakerKey } from "@repo/shared";
import { ArrowDown, ArrowUp, LoaderCircle, Plus, Save, Trash2 } from "lucide-react";
import { FormField } from "@/features/moderator/components/CreationPage";
import { ModeratorSelect } from "@/features/moderator/components/ModeratorSelect";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { Textarea } from "@/shared/components/ui/textarea";
import { savedAtLabel } from "../aiCheck/presentation";
import { dialogueIssues, insertTag, moveTurn, newTurn, removeTurn, updateSpeaker, updateTurn } from "../dialogueState";
import type { PodcastCreationWizard } from "../hooks/usePodcastCreationWizard";
import { useWordsPerMinute } from "../hooks/usePodcastProduction";
import { estimatedReadMinutes, scriptWordCount } from "../scriptDuration";
import { VOICE_LABEL } from "../voice/voiceLabels";

const AUTOSAVE_DELAY_MS = 900;
const speakerDot: Record<DialogueSpeakerKey, string> = { A: "bg-mod-text", B: "bg-mod-primary" };

export function DialogueScriptStep({ wizard, readOnly }: { wizard: PodcastCreationWizard; readOnly: boolean }): ReactElement {
  const dialogue = wizard.state.dialogue!;
  const textareas = useRef(new Map<string, HTMLTextAreaElement>());
  const changed = useRef(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState("");
  const wordsPerMinute = useWordsPerMinute();
  const issues = dialogueIssues(dialogue);
  const { scriptText } = wizard.state;

  const edit = (next: Dialogue): void => {
    changed.current = true;
    wizard.dispatch({ type: "setDialogue", value: next });
  };

  const persist = async (): Promise<void> => {
    setSaving(true);
    setError("");
    try {
      await wizard.saveScript(null);
      setSavedAt(new Date());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không lưu được kịch bản.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (readOnly || !changed.current || !wizard.state.scriptDirty || issues.length) return;
    const timer = window.setTimeout(() => void persist(), AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [readOnly, dialogue, wizard.state.scriptDirty]);

  const addTurn = (speaker: DialogueSpeakerKey): void => edit({ ...dialogue, turns: [...dialogue.turns, newTurn(speaker)] });

  const addTag = (id: string, tag: (typeof DIALOGUE_TAGS)[number]): void => {
    const turn = dialogue.turns.find((item) => item.id === id);
    const field = textareas.current.get(id);
    if (!turn || !field) return;
    const { text, caret } = insertTag(turn.text, field.selectionStart ?? turn.text.length, tag);
    edit(updateTurn(dialogue, id, { text }));
    requestAnimationFrame(() => { field.focus(); field.setSelectionRange(caret, caret); });
  };

  return (
    <section aria-labelledby="dialogue-script-title" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="dialogue-script-title" className="text-lg font-bold text-mod-text">Kịch bản hội thoại hai người</h2>
          <p className="mt-1 text-sm text-mod-text-secondary">Mỗi lượt nói là một thẻ: chọn người nói, giọng điệu và expression. Dùng chung cho giọng AI và bản đọc để thu âm.</p>
          {!readOnly && !scriptText.trim() ? (
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => wizard.dispatch({ type: "setDialogue", value: null })}>Chuyển về một người kể</Button>
          ) : null}
        </div>
        <p className={cn("text-xs", error || issues.length ? "text-mod-danger" : "text-mod-success")}>
          {saving ? "Đang lưu tự động…" : error ? "Chưa lưu được" : issues.length ? "Chưa hợp lệ, chưa lưu" : savedAt ? savedAtLabel(savedAt) : "Chưa có thay đổi"}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          {dialogue.turns.map((turn, index) => (
            <article key={turn.id} className="overflow-hidden rounded-xl border border-mod-border bg-mod-surface" aria-label={`Lượt ${index + 1}`}>
              <div className="flex flex-wrap items-center gap-2 bg-mod-canvas-accent px-3 py-2">
                <span className={cn("size-2.5 rounded-sm", speakerDot[turn.speaker])} aria-hidden="true" />
                <div className="w-44">
                  <ModeratorSelect
                    label={`Người nói của lượt ${index + 1}`}
                    value={turn.speaker}
                    onValueChange={(value) => edit(updateTurn(dialogue, turn.id, { speaker: value === "B" ? "B" : "A" }))}
                    options={dialogue.speakers.map((speaker) => ({ value: speaker.key, label: `${speaker.key} · ${speaker.name}` }))}
                    placeholder="Người nói"
                    disabled={readOnly}
                  />
                </div>
                <Input
                  className="min-w-40 flex-1"
                  aria-label={`Giọng điệu của lượt ${index + 1}`}
                  placeholder="Giọng điệu cả lượt (ví dụ: thì thầm, nói chậm)"
                  maxLength={DIALOGUE_STYLE_MAX_CHARS}
                  value={turn.style ?? ""}
                  disabled={readOnly}
                  onChange={(event) => edit(updateTurn(dialogue, turn.id, { style: event.target.value }))}
                />
                {readOnly ? null : (
                  <>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button type="button" size="sm" variant="outline"><Plus aria-hidden="true" /> Expression</Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-72 p-3">
                        <p className="text-xs font-semibold text-mod-text">Chèn tại con trỏ</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {DIALOGUE_TAGS.map((tag) => (
                            <Button key={tag} type="button" size="xs" variant="outline" className="font-mono" onClick={() => addTag(turn.id, tag)}>{`<${tag}>`}</Button>
                          ))}
                        </div>
                        <p className="mt-2 text-xs text-mod-text-secondary">Tag viết tiếng Anh dù lời là tiếng Việt. Dùng <span className="font-mono">|ừ|</span> để người kia chen vào mà không tách lượt.</p>
                      </PopoverContent>
                    </Popover>
                    <Button type="button" size="icon-sm" variant="ghost" aria-label="Chuyển lượt lên" disabled={index === 0} onClick={() => edit(moveTurn(dialogue, turn.id, -1))}><ArrowUp size={15} /></Button>
                    <Button type="button" size="icon-sm" variant="ghost" aria-label="Chuyển lượt xuống" disabled={index === dialogue.turns.length - 1} onClick={() => edit(moveTurn(dialogue, turn.id, 1))}><ArrowDown size={15} /></Button>
                    <Button type="button" size="icon-sm" variant="ghost" aria-label="Xóa lượt" disabled={dialogue.turns.length <= 1} onClick={() => edit(removeTurn(dialogue, turn.id))}><Trash2 size={15} /></Button>
                  </>
                )}
              </div>
              <Textarea
                ref={(node) => { if (node) textareas.current.set(turn.id, node); else textareas.current.delete(turn.id); }}
                aria-label={`Lời của lượt ${index + 1}`}
                className="min-h-20 rounded-none border-0 px-4 py-3 text-sm leading-7 focus-visible:ring-0"
                placeholder="Lời nói của lượt này"
                maxLength={DIALOGUE_TURN_MAX_CHARS}
                value={turn.text}
                disabled={readOnly}
                onChange={(event) => edit(updateTurn(dialogue, turn.id, { text: event.target.value }))}
              />
              <Input
                className="rounded-none border-0 border-t border-mod-border text-xs"
                aria-label={`Ghi chú của lượt ${index + 1}`}
                placeholder="Ghi chú cho người thu (không gửi cho AI)"
                maxLength={DIALOGUE_NOTE_MAX_CHARS}
                value={turn.note ?? ""}
                disabled={readOnly}
                onChange={(event) => edit(updateTurn(dialogue, turn.id, { note: event.target.value }))}
              />
            </article>
          ))}
          {readOnly ? null : (
            <div className="flex flex-wrap items-center gap-2">
              {dialogue.speakers.map((speaker) => (
                <Button key={speaker.key} type="button" variant="outline" onClick={() => addTurn(speaker.key)}>
                  <span className={cn("size-2.5 rounded-sm", speakerDot[speaker.key])} aria-hidden="true" /> Thêm lượt {speaker.name}
                </Button>
              ))}
              <Button type="button" variant="outline" className="ml-auto" disabled={saving || issues.length > 0} onClick={() => void persist()}>
                {saving ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />} Lưu kịch bản
              </Button>
            </div>
          )}
          {error ? <p role="alert" className="text-sm text-mod-danger">{error}</p> : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start" aria-label="Người nói và tóm tắt">
          <div className="space-y-4 rounded-xl border border-mod-border bg-mod-surface p-4">
            <h3 className="font-bold text-mod-text">Người nói</h3>
            {dialogue.speakers.map((speaker) => (
              <div key={speaker.key} className="space-y-3 border-t border-mod-border pt-3 first:border-0 first:pt-0">
                <div className="flex items-center gap-2">
                  <span className={cn("size-2.5 rounded-sm", speakerDot[speaker.key])} aria-hidden="true" />
                  <Input aria-label={`Tên người nói ${speaker.key}`} className="font-semibold" maxLength={40} value={speaker.name} disabled={readOnly} onChange={(event) => edit(updateSpeaker(dialogue, speaker.key, { name: event.target.value }))} />
                </div>
                <FormField label="Giọng AI" htmlFor={`voice-${speaker.key}`}>
                  <ModeratorSelect
                    id={`voice-${speaker.key}`}
                    label={`Giọng AI của người nói ${speaker.key}`}
                    value={speaker.voice}
                    onValueChange={(value) => {
                      const voice = DIALOGUE_VOICES.find((id) => id === value);
                      if (voice) edit(updateSpeaker(dialogue, speaker.key, { voice }));
                    }}
                    options={DIALOGUE_VOICES.map((id) => ({ value: id, label: `${VOICE_LABEL[id].name} — ${VOICE_LABEL[id].detail}` }))}
                    placeholder="Chọn giọng"
                    disabled={readOnly}
                  />
                </FormField>
              </div>
            ))}
            <p className="text-xs text-mod-text-secondary">Giọng AI chỉ dùng khi tạo giọng bằng AI. Hai người nói phải khác tên và khác giọng.</p>
          </div>

          <div className="space-y-2 rounded-xl border border-mod-border bg-mod-surface p-4 text-sm">
            <h3 className="font-bold text-mod-text">Tóm tắt</h3>
            <dl className="grid grid-cols-2 gap-y-1 text-mod-text-secondary">
              <dt>Số lượt</dt><dd className="text-right text-mod-text">{dialogue.turns.length}</dd>
              <dt>Số ký tự</dt><dd className="text-right text-mod-text">{scriptText.length.toLocaleString("vi-VN")}</dd>
              <dt>Ước tính</dt>
              <dd className="text-right text-mod-text">{wordsPerMinute ? `~${estimatedReadMinutes(scriptText, wordsPerMinute)} phút` : `${scriptWordCount(scriptText)} từ`}</dd>
            </dl>
            {issues.length ? (
              <ul role="alert" className="list-disc space-y-1 pl-5 text-xs text-mod-danger">{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>
            ) : <p className="text-xs text-mod-success">Hợp lệ</p>}
          </div>
        </aside>
      </div>
    </section>
  );
}
