import { useEffect, useRef, useState, type ReactElement } from "react";
import {
  DIALOGUE_MAX_SPEAKERS,
  DIALOGUE_NOTE_MAX_CHARS,
  DIALOGUE_STYLE_MAX_CHARS,
  DIALOGUE_TAGS,
  DIALOGUE_TURN_MAX_CHARS,
  DIALOGUE_VOICES,
  dialogueUsedSpeakerKeys,
  type Dialogue,
} from "@repo/shared";
import { ArrowDown, ArrowUp, ChevronDown, LoaderCircle, Plus, Save, X } from "lucide-react";
import { FormField } from "@/features/moderator/components/CreationPage";
import { ModeratorSelect } from "@/features/moderator/components/ModeratorSelect";
import { cn } from "@/lib/utils";
import { ConfirmationDialog } from "@/shared/components/common/ConfirmationDialog";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { notify } from "@/shared/lib/notifications";
import { Input } from "@/shared/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { Textarea } from "@/shared/components/ui/textarea";
import { savedAtLabel } from "../aiCheck/presentation";
import {
  addSpeaker,
  assignTurns,
  dialogueIssues,
  importTurns,
  insertTag,
  moveTurn,
  nextTurnSpeaker,
  newTurn,
  removeSpeaker,
  removeTurn,
  splitScript,
  unassignedTurns,
  updateSpeaker,
  updateTurn,
} from "../dialogueState";
import type { PodcastCreationWizard } from "../hooks/usePodcastCreationWizard";
import { useWordsPerMinute } from "../hooks/usePodcastProduction";
import { estimatedReadMinutes, scriptWordCount } from "../scriptDuration";
import { speakerColorClass } from "../speakerColor";
import { VOICE_LABEL } from "../voice/voiceLabels";

const AUTOSAVE_DELAY_MS = 900;
const MULTI_SPEAKER_COUNT = 2;
const SPEAKER_NAME_MAX_CHARS = 40;
const ISSUES_SHOWN = 5;

const hasSpokenTurn = (dialogue: Dialogue): boolean => dialogue.turns.some((turn) => turn.text.trim());

export function DialogueScriptStep({ wizard, readOnly }: { wizard: PodcastCreationWizard; readOnly: boolean }): ReactElement {
  const dialogue = wizard.state.dialogue!;
  const textareas = useRef(new Map<string, HTMLTextAreaElement>());
  const changed = useRef(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState("");
  const [pasteOpen, setPasteOpen] = useState(!hasSpokenTurn(dialogue));
  const [pasteText, setPasteText] = useState("");
  const [pasteError, setPasteError] = useState("");
  const [replaceWith, setReplaceWith] = useState<{ paragraphs: string[]; splitLong: number } | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [speakerPickerTurn, setSpeakerPickerTurn] = useState<string | null>(null);
  const wordsPerMinute = useWordsPerMinute();
  const issues = dialogueIssues(dialogue);
  const unassigned = unassignedTurns(dialogue);
  const usedSpeakers = dialogueUsedSpeakerKeys(dialogue).filter((key) => dialogue.speakers.some((speaker) => speaker.key === key));
  const { scriptText } = wizard.state;

  const edit = (next: Dialogue): void => {
    changed.current = true;
    wizard.dispatch({ type: "setDialogue", value: next });
  };

  const persist = async (manual = false): Promise<void> => {
    setSaving(true);
    setError("");
    try {
      await wizard.saveScript(null);
      setSavedAt(new Date());
      if (manual) notify.success({ title: "Đã lưu kịch bản" });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Không lưu được kịch bản.";
      setError(message);
      if (manual) notify.error({ title: "Không thể lưu kịch bản", description: message });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (readOnly || !changed.current || !wizard.state.scriptDirty || issues.length) return;
    const timer = window.setTimeout(() => void persist(), AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [readOnly, dialogue, wizard.state.scriptDirty]);

  const addTurn = (): void => {
    edit({ ...dialogue, turns: [...dialogue.turns, newTurn(nextTurnSpeaker(dialogue))] });
  };

  const addTag = (id: string, tag: (typeof DIALOGUE_TAGS)[number]): void => {
    const turn = dialogue.turns.find((item) => item.id === id);
    const field = textareas.current.get(id);
    if (!turn || !field) return;
    const { text, caret } = insertTag(turn.text, field.selectionStart ?? turn.text.length, tag);
    edit(updateTurn(dialogue, id, { text }));
    requestAnimationFrame(() => { field.focus(); field.setSelectionRange(caret, caret); });
  };

  const applyImport = (paragraphs: string[], mode: "append" | "replace", splitLong: number): void => {
    const result = importTurns(dialogue, paragraphs, mode);
    if ("error" in result) {
      setPasteError(result.error);
      return;
    }
    edit(result.dialogue);
    setSelected(new Set());
    setPasteText("");
    setPasteError("");
    setPasteOpen(false);
    notify.success({ title: `Đã nhập ${paragraphs.length} lượt`, description: splitLong ? `Đã tách thêm ${splitLong} đoạn quá dài.` : undefined });
  };

  const splitPasted = (mode: "append" | "replace"): void => {
    const { paragraphs, splitLong } = splitScript(pasteText);
    if (!paragraphs.length) {
      setPasteError("Không thấy đoạn nào. Mỗi đoạn cách nhau một dòng trống.");
      return;
    }
    if (mode === "replace" && hasSpokenTurn(dialogue)) {
      setReplaceWith({ paragraphs, splitLong });
      return;
    }
    applyImport(paragraphs, mode, splitLong);
  };

  const toggleSelected = (id: string, on: boolean): void => {
    const next = new Set(selected);
    if (on) next.add(id);
    else next.delete(id);
    setSelected(next);
  };

  const assignSelected = (key: string): void => {
    edit(assignTurns(dialogue, selected, key));
    setSelected(new Set());
  };

  const dropSpeaker = (key: string): void => {
    const { dialogue: next, blockedBy } = removeSpeaker(dialogue, key);
    if (blockedBy > 0) notify.error({ title: "Chưa xóa được người nói", description: `${blockedBy} lượt đang dùng người này. Gán các lượt đó cho người khác trước.` });
    else edit(next);
  };

  const ttsPath =
    issues.length || !dialogue.turns.length
      ? null
      : usedSpeakers.length === MULTI_SPEAKER_COUNT
        ? "AI đọc hai người nói theo từng đoạn dài, mỗi đoạn một lượt gọi."
        : `AI sẽ đọc từng lượt: ${dialogue.turns.length} lượt gọi.`;

  return (
    <section aria-labelledby="dialogue-script-title" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="dialogue-script-title" className="text-lg font-bold text-mod-text">Kịch bản hội thoại nhiều người</h2>
          <p className="mt-1 text-sm text-mod-text-secondary">Dán văn bản, tách đoạn rồi gán người đọc cho từng đoạn. Dùng chung cho giọng AI và bản đọc để thu âm.</p>
          {!readOnly && !scriptText.trim() ? (
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => wizard.dispatch({ type: "setDialogue", value: null })}>Chuyển về một người kể</Button>
          ) : null}
        </div>
        <p className={cn("text-xs", error || issues.length ? "text-mod-danger" : "text-mod-success")}>
          {saving ? "Đang lưu tự động…" : error ? "Chưa lưu được" : issues.length ? "Chưa hợp lệ, chưa lưu" : savedAt ? savedAtLabel(savedAt) : "Chưa có thay đổi"}
        </p>
      </div>

      {readOnly ? null : pasteOpen ? (
        <div className="space-y-2 rounded-xl border border-dashed border-mod-border bg-mod-surface p-3">
          <Textarea
            aria-label="Dán kịch bản"
            className="min-h-32 text-sm"
            placeholder="Dán văn bản. Mỗi đoạn cách nhau một dòng trống."
            value={pasteText}
            onChange={(event) => { setPasteText(event.target.value); setPasteError(""); }}
          />
          {pasteError ? <p role="alert" className="text-sm text-mod-danger">{pasteError}</p> : null}
          <div className="flex gap-2">
            {hasSpokenTurn(dialogue) ? (
              <>
                <Button type="button" onClick={() => splitPasted("append")} disabled={!pasteText.trim()}>Tách và nối thêm</Button>
                <Button type="button" variant="outline" onClick={() => splitPasted("replace")} disabled={!pasteText.trim()}>Tách và thay thế</Button>
                <Button type="button" variant="ghost" onClick={() => { setPasteOpen(false); setPasteError(""); }}>Hủy</Button>
              </>
            ) : (
              <Button type="button" onClick={() => splitPasted("replace")} disabled={!pasteText.trim()}>Tách đoạn</Button>
            )}
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" className="w-full border-dashed" onClick={() => setPasteOpen(true)}>Dán thêm kịch bản</Button>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          {readOnly ? null : (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Button type="button" size="xs" variant="outline" onClick={() => setSelected(new Set(dialogue.turns.map((turn) => turn.id)))}>Chọn tất cả</Button>
              <Button type="button" size="xs" variant="outline" disabled={!unassigned.length} onClick={() => setSelected(new Set(unassigned))}>Chọn lượt chưa gán ({unassigned.length})</Button>
            </div>
          )}
          {dialogue.turns.map((turn, index) => {
            const speaker = dialogue.speakers.find((item) => item.key === turn.speaker);
            return (
              <article
                key={turn.id}
                className={cn("group rounded-xl border bg-mod-surface transition-colors focus-within:border-mod-primary hover:border-mod-text-secondary", speaker ? "border-mod-border" : "border-mod-danger")}
                aria-label={`Lượt ${index + 1}`}
              >
                <div className="flex flex-wrap items-center gap-2 px-3 pt-2">
                  {readOnly ? null : (
                    <Checkbox className="size-5.5 shrink-0 self-center" aria-label={`Chọn lượt ${index + 1}`} checked={selected.has(turn.id)} onCheckedChange={(checked) => toggleSelected(turn.id, checked === true)} />
                  )}
                  <span className="text-xs text-mod-text-secondary">#{index + 1}</span>
                  <Popover open={speakerPickerTurn === turn.id} onOpenChange={(open) => setSpeakerPickerTurn(open ? turn.id : null)}>
                    <PopoverTrigger asChild>
                      <Button type="button" size="sm" variant="outline" className={cn("max-w-48 rounded-full", !speaker && "border-dashed border-mod-danger text-mod-danger")} disabled={readOnly} aria-label={`Người nói của lượt ${index + 1}`}>
                        <span className={cn("size-2.5 rounded-sm", speakerColorClass(dialogue, turn.speaker))} aria-hidden="true" />
                        <span className="truncate">{speaker?.name ?? "Chưa gán người"}</span>
                        <ChevronDown size={14} aria-hidden="true" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="max-h-64 w-56 space-y-1 overflow-y-auto p-2">
                      {dialogue.speakers.map((option) => (
                        <Button key={option.key} type="button" size="sm" variant={option.key === turn.speaker ? "secondary" : "ghost"} className="w-full justify-start" onClick={() => { edit(updateTurn(dialogue, turn.id, { speaker: option.key })); setSpeakerPickerTurn(null); }}>
                          <span className={cn("size-2.5 rounded-sm", speakerColorClass(dialogue, option.key))} aria-hidden="true" />
                          <span className="truncate">{option.name}</span>
                        </Button>
                      ))}
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button type="button" size="sm" variant="ghost" className="max-w-48 truncate" disabled={readOnly} aria-label={`Giọng điệu của lượt ${index + 1}`}>{turn.style?.trim() || "Giọng điệu"}</Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-72 p-3">
                      <Input
                        aria-label={`Giọng điệu của lượt ${index + 1}`}
                        placeholder="Mô tả giọng điệu cả lượt (ví dụ: thì thầm, nói chậm)"
                        maxLength={DIALOGUE_STYLE_MAX_CHARS}
                        value={turn.style ?? ""}
                        onChange={(event) => edit(updateTurn(dialogue, turn.id, { style: event.target.value }))}
                      />
                    </PopoverContent>
                  </Popover>
                  {readOnly ? null : (
                    <>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button type="button" size="sm" variant="ghost"><Plus aria-hidden="true" /> Expression</Button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-72 p-3">
                          <p className="text-xs font-semibold text-mod-text">Chèn tại con trỏ</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {DIALOGUE_TAGS.map((tag) => (
                              <Button key={tag} type="button" size="xs" variant="outline" className="font-mono" onClick={() => addTag(turn.id, tag)}>{`<${tag}>`}</Button>
                            ))}
                          </div>
                          <p className="mt-2 text-xs text-mod-text-secondary">Tag viết tiếng Anh dù lời là tiếng Việt. Dùng <span className="font-mono">|ừ|</span> để người kia chen vào mà không tách lượt (chỉ có tác dụng khi kịch bản có đúng hai người nói).</p>
                        </PopoverContent>
                      </Popover>
                      <div className="ml-auto flex items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100">
                        <Button type="button" size="icon-sm" variant="ghost" aria-label="Chuyển lượt lên" disabled={index === 0} onClick={() => edit(moveTurn(dialogue, turn.id, -1))}><ArrowUp size={15} /></Button>
                        <Button type="button" size="icon-sm" variant="ghost" aria-label="Chuyển lượt xuống" disabled={index === dialogue.turns.length - 1} onClick={() => edit(moveTurn(dialogue, turn.id, 1))}><ArrowDown size={15} /></Button>
                        <Button type="button" size="icon-sm" variant="ghost" aria-label="Xóa lượt" disabled={dialogue.turns.length <= 1} onClick={() => { toggleSelected(turn.id, false); edit(removeTurn(dialogue, turn.id)); }}><X size={15} /></Button>
                      </div>
                    </>
                  )}
                </div>
                <Textarea
                  ref={(node) => { if (node) textareas.current.set(turn.id, node); else textareas.current.delete(turn.id); }}
                  aria-label={`Lời của lượt ${index + 1}`}
                  className="min-h-20 rounded-none border-0 bg-transparent px-4 py-3 text-sm leading-7 focus-visible:ring-0"
                  placeholder="Lời nói của lượt này"
                  maxLength={DIALOGUE_TURN_MAX_CHARS}
                  value={turn.text}
                  disabled={readOnly}
                  onChange={(event) => edit(updateTurn(dialogue, turn.id, { text: event.target.value }))}
                />
                <Input
                  className={cn("rounded-none border-0 bg-transparent px-4 text-xs", !turn.note && "hidden group-focus-within:block")}
                  aria-label={`Ghi chú của lượt ${index + 1}`}
                  placeholder="Ghi chú cho người thu (không gửi cho AI)"
                  maxLength={DIALOGUE_NOTE_MAX_CHARS}
                  value={turn.note ?? ""}
                  disabled={readOnly}
                  onChange={(event) => edit(updateTurn(dialogue, turn.id, { note: event.target.value }))}
                />
              </article>
            );
          })}
          {readOnly ? null : (
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <span aria-hidden="true" />
              <Button type="button" variant="outline" onClick={addTurn}>
                <Plus aria-hidden="true" /> Thêm khối hội thoại
              </Button>
              <Button type="button" variant="outline" className="justify-self-end" disabled={saving || issues.length > 0} onClick={() => void persist(true)}>
                {saving ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />} Lưu kịch bản
              </Button>
            </div>
          )}
          {readOnly || !selected.size ? null : (
            <div className="sticky bottom-3 z-10 space-y-2 rounded-xl border-2 border-mod-primary bg-mod-surface px-4 py-3 text-mod-text shadow-2xl ring-4 ring-mod-primary/10" role="region" aria-label="Gán người đọc hàng loạt">
              <div className="flex items-center justify-between gap-2 text-sm">
                <b>Đã chọn {selected.size}/{dialogue.turns.length} lượt. Gán cho:</b>
                <Button type="button" size="xs" variant="ghost" onClick={() => setSelected(new Set())}>Bỏ chọn</Button>
              </div>
              <div className="flex max-h-22 flex-wrap gap-1.5 overflow-auto">
                {dialogue.speakers.map((speaker) => (
                  <Button key={speaker.key} type="button" size="xs" variant="outline" onClick={() => assignSelected(speaker.key)}>
                    <span className={cn("size-2.5 rounded-sm", speakerColorClass(dialogue, speaker.key))} aria-hidden="true" />
                    {speaker.name}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {error ? <p role="alert" className="text-sm text-mod-danger">{error}</p> : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start" aria-label="Người nói và tóm tắt">
          <div className="space-y-4 rounded-xl border border-mod-border bg-mod-surface p-4">
            <h3 className="font-bold text-mod-text">Người nói ({dialogue.speakers.length}/{DIALOGUE_MAX_SPEAKERS})</h3>
            {dialogue.speakers.map((speaker) => (
              <div key={speaker.key} className="space-y-3 border-t border-mod-border pt-3 first:border-0 first:pt-0">
                <div className="flex items-center gap-2">
                  <span className={cn("size-2.5 shrink-0 rounded-sm", speakerColorClass(dialogue, speaker.key))} aria-hidden="true" />
                  <Input aria-label={`Tên người nói ${speaker.name}`} className="font-semibold" maxLength={SPEAKER_NAME_MAX_CHARS} value={speaker.name} disabled={readOnly} onChange={(event) => edit(updateSpeaker(dialogue, speaker.key, { name: event.target.value }))} />
                  {readOnly ? null : (
                    <Button type="button" size="icon-sm" variant="ghost" aria-label={`Xóa người nói ${speaker.name}`} disabled={dialogue.speakers.length <= 2} onClick={() => dropSpeaker(speaker.key)}><X size={15} /></Button>
                  )}
                </div>
                <FormField label="Giọng AI" htmlFor={`voice-${speaker.key}`}>
                  <ModeratorSelect
                    id={`voice-${speaker.key}`}
                    label={`Giọng AI của người nói ${speaker.name}`}
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
            {readOnly ? null : (
              <Button type="button" variant="outline" className="w-full" disabled={dialogue.speakers.length >= DIALOGUE_MAX_SPEAKERS} onClick={() => edit(addSpeaker(dialogue))}>
                <Plus aria-hidden="true" /> Thêm người nói
              </Button>
            )}
            <p className="text-xs text-mod-text-secondary">Giọng AI chỉ dùng khi tạo giọng bằng AI. Các người nói phải khác tên và khác giọng.</p>
          </div>

          <div className="space-y-2 rounded-xl border border-mod-border bg-mod-surface p-4 text-sm">
            <h3 className="font-bold text-mod-text">Tóm tắt</h3>
            <dl className="grid grid-cols-2 gap-y-1 text-mod-text-secondary">
              <dt>Số lượt</dt><dd className="text-right text-mod-text">{dialogue.turns.length}</dd>
              <dt>Người nói (dùng / khai báo)</dt><dd className="text-right text-mod-text">{usedSpeakers.length} / {dialogue.speakers.length}</dd>
              <dt>Chưa gán</dt><dd className="text-right text-mod-text">{unassigned.length}</dd>
              <dt>Số ký tự</dt><dd className="text-right text-mod-text">{scriptText.length.toLocaleString("vi-VN")}</dd>
              <dt>Ước tính</dt>
              <dd className="text-right text-mod-text">{wordsPerMinute ? `~${estimatedReadMinutes(scriptText, wordsPerMinute)} phút` : `${scriptWordCount(scriptText)} từ`}</dd>
            </dl>
            {ttsPath ? <p className="rounded-md bg-mod-bg px-2 py-1.5 text-xs text-mod-text-secondary">{ttsPath}</p> : null}
            {issues.length ? (
              <ul role="alert" className="list-disc space-y-1 pl-5 text-xs text-mod-danger">
                {issues.slice(0, ISSUES_SHOWN).map((issue) => <li key={issue}>{issue}</li>)}
                {issues.length > ISSUES_SHOWN ? <li>và {issues.length - ISSUES_SHOWN} vấn đề khác</li> : null}
              </ul>
            ) : <p className="text-xs text-mod-success">Hợp lệ</p>}
          </div>
        </aside>
      </div>

      <ConfirmationDialog
        request={replaceWith ? { title: "Thay thế toàn bộ kịch bản?", description: `Nội dung hiện tại sẽ bị xóa và thay bằng ${replaceWith.paragraphs.length} đoạn mới, chưa gán người đọc.`, confirmLabel: "Thay thế", cancelLabel: "Giữ nguyên", destructive: true } : null}
        onResolve={(confirmed) => {
          const pending = replaceWith;
          setReplaceWith(null);
          if (confirmed && pending) applyImport(pending.paragraphs, "replace", pending.splitLong);
        }}
      />
    </section>
  );
}
