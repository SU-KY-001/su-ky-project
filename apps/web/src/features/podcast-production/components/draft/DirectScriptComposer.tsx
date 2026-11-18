import { useEffect, useRef, useState, type RefObject } from "react";
import { LoaderCircle, RefreshCw, Sparkles } from "lucide-react";
import { OUTLINE_TOPIC_MAX, SCRIPT_MAX_CHARACTERS, TONE_CUSTOM_MAX, analyzeStructuredScript } from "@repo/shared";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { ConfirmationDialog } from "@/shared/components/common/ConfirmationDialog";
import { useConfirmationDialog } from "@/shared/hooks/useConfirmationDialog";
import { notify } from "@/shared/lib/notifications";
import { ModeratorSelect } from "@/features/moderator/components/ModeratorSelect";
import { moderatorSectionPath } from "@/features/moderator/paths";
import { useAngles } from "../../angles/useAngles";
import { composeService } from "../../compose/composeService";
import { describeComposeError } from "../../compose/composeMessages";
import { DEFAULT_MINUTES, minutesLimits, wordsForMinutes } from "../../compose/outlineState";
import { CUSTOM_TONE, CUSTOM_TONE_PLACEHOLDER, DEFAULT_TONE_PRESET, TONE_PRESET_OPTIONS, toneInput } from "../../compose/toneOptions";
import type { RichScriptEditorHandle } from "../RichScriptEditor";
import type { ToneChoice } from "./DraftToneStep";

interface Props {
  editorRef: RefObject<RichScriptEditorHandle | null>;
  ensureEpisode: () => Promise<string>;
  wordsPerMinute: number;
}

/** One request produces the complete narration; the existing editor remains the source of truth. */
export function DirectScriptComposer({ editorRef, ensureEpisode, wordsPerMinute }: Props) {
  const angles = useAngles();
  const [topic, setTopic] = useState("");
  const [chosenAngle, setChosenAngle] = useState("");
  const [words, setWords] = useState(() => wordsForMinutes(DEFAULT_MINUTES, wordsPerMinute));
  const [tone, setTone] = useState<ToneChoice>(DEFAULT_TONE_PRESET);
  const [custom, setCustom] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [generated, setGenerated] = useState("");
  const [pending, setPending] = useState("");
  const controller = useRef<AbortController | null>(null);
  const working = useRef(false);
  const { requestConfirmation, confirmation } = useConfirmationDialog();
  useEffect(() => () => controller.current?.abort(), []);
  const angleId = angles.angles.some((angle) => angle.id === chosenAngle) ? chosenAngle : angles.angles[0]?.id ?? "";
  const selectedTone = toneInput(tone, custom);
  const minutes = Math.round(words / wordsPerMinute * 10) / 10;
  const limits = minutesLimits(wordsPerMinute);

  const confirmReplacement = async (): Promise<boolean> => !editorRef.current?.getText().trim() || requestConfirmation({
    title: "Tạo bản mới thay kịch bản hiện tại?",
    description: "Nội dung hiện tại được giữ nguyên trong lúc AI viết. Chỉ thay thế khi bản mới tạo thành công.",
    confirmLabel: "Tạo kịch bản mới", destructive: true,
  });

  const create = async (): Promise<void> => {
    if (working.current || !topic.trim() || !angleId || !selectedTone) return;
    working.current = true;
    try {
      if (!await confirmReplacement()) return;
      const editor = editorRef.current;
      if (!editor) return;
      const expected = editor.getText();
      const current = new AbortController(); controller.current = current;
      setRunning(true); setError(""); setNote("");
      const episodeId = await ensureEpisode();
      if (current.signal.aborted) return;
      // The existing draft endpoint accepts one section representing the entire script.
      // No outline model call, outline approval, or section-by-section wizard is involved.
      const result = await composeService.draftSection(episodeId, {
        topic: topic.trim(), angleId, tone: selectedTone, narration: "THIRD_PERSON",
        outline: [{ title: "Kịch bản podcast độc thoại hoàn chỉnh", goal: "Viết toàn bộ kịch bản theo chủ đề: có mở đầu cuốn hút, nội dung phát triển liền mạch và kết thúc tự nhiên.", points: [], targetWords: words }],
        index: 0, remainingChars: SCRIPT_MAX_CHARACTERS,
      }, current.signal);
      if (current.signal.aborted) return;
      const text = result.paragraphs.join("\n\n").trim();
      if (!text) throw new Error("AI chưa trả về nội dung. Hãy thử tạo lại.");
      if (result.exceedsLimit || text.length > SCRIPT_MAX_CHARACTERS) throw new Error("Kịch bản vượt giới hạn ký tự. Hãy giảm thời lượng rồi tạo lại. Nội dung đang soạn được giữ nguyên.");
      if (analyzeStructuredScript(text).kind !== "monologue") throw new Error("Bản AI tạo chưa đúng cấu trúc độc thoại. Hãy tạo lại; nội dung đang soạn được giữ nguyên.");
      setGenerated(text);
      const applied = editorRef.current?.importText(text, true, expected);
      if (!applied?.ok) {
        setPending(text);
        setError("Kịch bản đã thay đổi trong lúc AI viết. Bản mới được giữ lại; xác nhận bên dưới nếu muốn áp dụng.");
        return;
      }
      setPending("");
      setNote(result.novelNumbers.length ? `Cần kiểm tra các số liệu: ${result.novelNumbers.join(", ")}.` : result.lengthStatus !== "OK" ? "Độ dài bản tạo có chênh lệch so với mục tiêu; bạn có thể sửa hoặc tạo lại." : "Kịch bản đã có trong trình soạn bên dưới. Bạn có thể sửa trực tiếp và bấm Lưu kịch bản.");
      notify.success({ title: "Đã tạo kịch bản", description: "Chỉnh sửa bên dưới và bấm Lưu kịch bản khi hoàn tất." });
    } catch (caught) {
      if (!controller.current?.signal.aborted) setError(describeComposeError(caught, "Không tạo được kịch bản. Nội dung đang soạn được giữ nguyên."));
    } finally {
      working.current = false; setRunning(false); controller.current = null;
    }
  };

  const applyPending = async (): Promise<void> => {
    if (!pending || working.current) return;
    working.current = true;
    try {
      if (!await confirmReplacement()) return;
      const editor = editorRef.current;
      const result = editor?.importText(pending, true, editor.getText());
      if (!result?.ok) { setError("Chưa áp dụng được bản mới. Nội dung đang soạn được giữ nguyên."); return; }
      setPending(""); setError(""); setNote("Đã áp dụng bản AI tạo. Bấm Lưu kịch bản khi hoàn tất.");
    } finally { working.current = false; }
  };

  return <section aria-label="Tạo kịch bản độc thoại với AI" className="space-y-4 p-4 sm:p-5">
    <fieldset disabled={running} className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.5fr)_minmax(0,1fr)_minmax(0,1fr)]">
      <label className="space-y-1.5 md:col-span-2 xl:col-span-4"><span className="text-sm font-semibold">Chủ đề của tập</span><Input value={topic} maxLength={OUTLINE_TOPIC_MAX} placeholder="Vì sao Lý Thái Tổ dời đô từ Hoa Lư ra Thăng Long" onChange={(event) => setTopic(event.target.value)} /></label>
      <div className="min-w-0 space-y-1.5"><label htmlFor="ai-script-angle" className="text-sm font-semibold">Góc kể</label><ModeratorSelect id="ai-script-angle" label="Góc kể" value={angleId} onValueChange={setChosenAngle} options={angles.angles.map((angle) => ({ value: angle.id, label: angle.name }))} placeholder={angles.loading ? "Đang tải góc kể…" : "Chọn góc kể"} disabled={angles.loading} /><div className="flex gap-3 text-xs"><a href={`${moderatorSectionPath.angles}?new=1`} target="_blank" rel="noreferrer" className="text-mod-primary hover:underline">Tạo góc kể mới</a><a href={moderatorSectionPath.angles} target="_blank" rel="noreferrer" className="text-mod-text-secondary hover:underline">Quản lý góc kể</a></div>{angles.error ? <p role="alert" className="text-xs text-mod-danger">{angles.error}</p> : null}</div>
      <div className="min-w-0 space-y-1.5"><label htmlFor="ai-script-minutes" className="text-sm font-semibold">Thời lượng mục tiêu</label><div className="relative w-full"><Input id="ai-script-minutes" type="number" aria-label="Số phút" className="h-11 w-full pr-12" min={limits.min} max={limits.max} value={minutes} onChange={(event) => setWords(wordsForMinutes(Math.min(limits.max, Math.max(limits.min, Number(event.target.value) || limits.min)), wordsPerMinute))} /><span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-mod-text-secondary">phút</span></div></div>
      <div className="space-y-1.5"><label htmlFor="ai-script-tone" className="text-sm font-semibold">Giọng văn</label><ModeratorSelect id="ai-script-tone" label="Giọng văn" value={tone} onValueChange={(value) => { if (value === CUSTOM_TONE || value === "calm" || value === "close" || value === "formal") setTone(value); }} options={[...TONE_PRESET_OPTIONS.map((option) => ({ value: option.preset, label: option.label })), { value: CUSTOM_TONE, label: "Tự mô tả" }]} placeholder="Chọn giọng văn" /><p className="text-xs text-mod-text-secondary">{TONE_PRESET_OPTIONS.find((option) => option.preset === tone)?.sample}</p></div>
      {tone === CUSTOM_TONE ? <label className="space-y-1.5 md:col-span-2 xl:col-span-4"><span className="text-sm font-semibold">Mô tả giọng văn</span><Textarea aria-label="Mô tả giọng văn" maxLength={TONE_CUSTOM_MAX} placeholder={CUSTOM_TONE_PLACEHOLDER} value={custom} onChange={(event) => setCustom(event.target.value)} /></label> : null}
      <div className="space-y-1.5"><span className="text-sm font-semibold">Ngôi kể</span><ModeratorSelect label="Ngôi kể" value="THIRD_PERSON" onValueChange={() => {}} options={[{ value: "THIRD_PERSON", label: "Ngôi thứ ba" }, { value: "FIRST_PERSON", label: "Ngôi thứ nhất (chưa khả dụng)" }]} placeholder="Ngôi kể" disabled /></div>
    </fieldset>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-mod-border pt-4"><p role="status" className="text-xs text-mod-text-secondary">{running ? "AI đang viết kịch bản. Bạn vẫn có thể chỉnh nội dung bên dưới." : "AI dùng nguồn của series làm ngữ cảnh khi có. Hãy kiểm tra thông tin trước khi lưu."}</p><div className="flex gap-2">{running ? <Button type="button" variant="outline" onClick={() => controller.current?.abort()}>Dừng tạo</Button> : null}<Button type="button" disabled={running || !topic.trim() || !angleId || !selectedTone} onClick={() => void create()}>{running ? <LoaderCircle className="size-4 animate-spin" /> : generated ? <RefreshCw size={16} /> : <Sparkles size={16} />}{running ? "Đang tạo kịch bản…" : generated ? "Tạo lại kịch bản" : "Tạo kịch bản"}</Button></div></div>
    {error ? <p role="alert" className="text-sm text-mod-danger">{error}</p> : null}
    {note ? <p role="status" className="text-sm text-mod-text-secondary">{note}</p> : null}
    {pending ? <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-mod-border p-3"><span className="text-sm">Bản AI vừa tạo: {pending.length.toLocaleString("vi-VN")} ký tự</span><Button type="button" variant="outline" disabled={running} onClick={() => void applyPending()}>Áp dụng bản vừa tạo</Button></div> : null}
    <ConfirmationDialog {...confirmation} />
  </section>;
}
