import type { ReactElement } from "react";
import { DIALOGUE_VOICES } from "@repo/shared";
import { VoiceSelect } from "./VoiceSelect";
import type { PodcastCreationWizard } from "../hooks/usePodcastCreationWizard";
import { updateSpeaker } from "../dialogueState";

export function DialogueVoiceConfiguration({ wizard, disabled }: { wizard: PodcastCreationWizard; disabled: boolean }): ReactElement | null {
  const dialogue = wizard.state.dialogue;
  if (!dialogue) return null;
  return <section className="rounded-xl border border-mod-border bg-mod-surface p-5"><h3 className="font-semibold text-mod-text">Giọng AI cho từng người nói</h3><p className="mt-1 text-xs text-mod-text-secondary">Mỗi vai dùng một giọng riêng. Cấu hình được lưu cùng kịch bản trước khi tạo âm thanh.</p><div className="mt-4 grid gap-4 md:grid-cols-2">{dialogue.speakers.map((speaker) => <div key={speaker.key} className="grid gap-2"><label className="text-sm font-medium text-mod-text" htmlFor={`dialogue-voice-${speaker.key}`}>{speaker.name}</label><VoiceSelect id={"dialogue-voice-" + speaker.key} label={"Giọng AI của " + speaker.name} value={speaker.voice} disabled={disabled} voices={DIALOGUE_VOICES} onChange={(voice) => wizard.dispatch({ type: "setDialogue", value: updateSpeaker(dialogue, speaker.key, { voice }) })} /></div>)}</div>{new Set(dialogue.speakers.map((speaker) => speaker.voice)).size !== dialogue.speakers.length ? <p role="alert" className="mt-3 text-sm text-mod-danger">Các người nói phải dùng giọng khác nhau.</p> : null}</section>;
}
