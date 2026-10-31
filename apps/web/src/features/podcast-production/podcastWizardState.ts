import { dialogueScriptContent, type AudioAnalysis, type Dialogue, type EditorDocument, type EpisodeWorkspaceDto, type EpisodePoster } from "@repo/shared";
import { legacyScriptToDocument, scriptDocumentText } from "./scriptEditor";

export type PodcastWizardStep = "information" | "script" | "voice" | "review";
export type PodcastVoiceMode = "upload" | "ai";

export interface WizardAudio {
  assetId: string;
  previewUrl: string | null;
  analysis?: AudioAnalysis;
}

export interface PodcastWizardState {
  activeStep: PodcastWizardStep;
  episodeId: string | null;
  seriesId: string;
  title: string;
  description: string;
  historicalEventId: string;
  scriptDocument: EditorDocument | null;
  /** Two-person script; when set the episode is a dialogue and `scriptDocument` is unused. */
  dialogue: Dialogue | null;
  scriptText: string;
  scriptDirty: boolean;
  voiceMode: PodcastVoiceMode;
  uploadedAudio: WizardAudio | null;
  poster: EpisodePoster | null;
  posterDirty: boolean;
}

export type PodcastWizardAction =
  | { type: "setPoster"; value: EpisodePoster | null }
  | { type: "posterSaved"; assetId: string | null }
  | { type: "selectStep"; step: PodcastWizardStep }
  | {
      type: "updateInformation";
      value: Partial<
        Pick<
          PodcastWizardState,
          "seriesId" | "title" | "description" | "historicalEventId"
        >
      >;
    }
  | { type: "draftCreated"; episodeId: string }
  | {
      type: "setScript";
      document: EditorDocument | null;
      text: string;
    }
  | { type: "setDialogue"; value: Dialogue | null }
  | { type: "setScriptText"; value: string }
  | { type: "scriptSaved" }
  | { type: "setVoiceMode"; value: PodcastVoiceMode }
  | { type: "setUploadedAudio"; value: WizardAudio | null };

export function initialPodcastWizardState(): PodcastWizardState {
  return {
    activeStep: "information",
    episodeId: null,
    seriesId: "",
    title: "",
    description: "",
    historicalEventId: "",
    scriptDocument: null,
    dialogue: null,
    scriptText: "",
    scriptDirty: false,
    voiceMode: "upload",
    uploadedAudio: null,
    poster: null,
    posterDirty: false,
  };
}

type ExistingEpisode = Pick<EpisodeWorkspaceDto, "id" | "seriesId" | "title" | "description" | "poster"> & {
  narrations: Array<Pick<EpisodeWorkspaceDto["narrations"][number], "type" | "scriptContent" | "scriptDocument" | "dialogue" | "audioAnalysis"> & {
    audio: Pick<NonNullable<EpisodeWorkspaceDto["narrations"][number]["audio"]>, "assetId" | "previewUrl"> | null;
  }>;
};

export function podcastWizardStateFromEpisode(
  episode: ExistingEpisode,
  historicalEventId: string,
): PodcastWizardState {
  const narration = episode.narrations.find((item) => item.type === "THIRD_PERSON");
  const scriptDocument = narration?.scriptDocument ??
    (narration?.scriptContent ? legacyScriptToDocument(narration.scriptContent) : null);
  return {
    ...initialPodcastWizardState(),
    episodeId: episode.id,
    seriesId: episode.seriesId,
    title: episode.title,
    description: episode.description ?? "",
    poster: episode.poster ?? null,
    historicalEventId,
    scriptDocument,
    dialogue: narration?.dialogue ?? null,
    scriptText: narration?.dialogue ? dialogueScriptContent(narration.dialogue) : scriptDocument ? scriptDocumentText(scriptDocument) : "",
    uploadedAudio: narration?.audio ? {
      assetId: narration.audio.assetId,
      previewUrl: narration.audio.previewUrl,
      analysis: narration.audioAnalysis ?? undefined,
    } : null,
  };
}

export function podcastWizardReducer(
  state: PodcastWizardState,
  action: PodcastWizardAction,
): PodcastWizardState {
  switch (action.type) {
    case "setPoster":
      return { ...state, poster: action.value, posterDirty: true };
    case "posterSaved":
      return (state.poster?.assetId ?? null) === action.assetId ? { ...state, posterDirty: false } : state;
    case "selectStep":
      return { ...state, activeStep: action.step };
    case "updateInformation":
      return { ...state, ...action.value };
    case "draftCreated":
      return { ...state, episodeId: action.episodeId };
    case "setScript":
      return {
        ...state,
        scriptDocument: action.document,
        scriptText: action.text,
        scriptDirty: true,
      };
    case "scriptSaved":
      return { ...state, scriptDirty: false };
    case "setDialogue":
      return {
        ...state,
        dialogue: action.value,
        scriptText: action.value ? dialogueScriptContent(action.value) : state.scriptDocument ? scriptDocumentText(state.scriptDocument) : "",
        scriptDirty: true,
      };
    case "setScriptText":
      return { ...state, scriptText: action.value };
    case "setVoiceMode":
      return { ...state, voiceMode: action.value };
    case "setUploadedAudio":
      return { ...state, uploadedAudio: action.value };
  }
}

export function informationComplete(state: PodcastWizardState): boolean {
  return Boolean(
    state.seriesId &&
      state.title.trim() &&
      state.description.trim() &&
      state.historicalEventId,
  );
}

export function scriptComplete(state: PodcastWizardState): boolean {
  return Boolean(state.scriptText.trim());
}

export function voiceComplete(state: PodcastWizardState): boolean {
  return Boolean(state.uploadedAudio?.assetId);
}

export function createEnsureDraft(
  readState: () => PodcastWizardState,
  create: (seriesId: string, title: string) => Promise<string>,
  onCreated: (episodeId: string) => void,
): () => Promise<string> {
  let inFlight: Promise<string> | null = null;

  return async () => {
    const current = readState();
    if (current.episodeId) return current.episodeId;
    if (!current.seriesId || !current.title.trim()) {
      throw new Error("Chọn series và nhập tên tập podcast trước khi lưu.");
    }
    if (inFlight) return inFlight;

    inFlight = create(current.seriesId, current.title.trim())
      .then((episodeId) => {
        onCreated(episodeId);
        return episodeId;
      })
      .finally(() => {
        inFlight = null;
      });
    return inFlight;
  };
}
