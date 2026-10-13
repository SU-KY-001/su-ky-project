import { useCallback, useReducer, useRef } from "react";
import type { AudioAnalysis, EditorDocument } from "@repo/shared";
import { newIdempotencyKey } from "@/lib/idempotency";
import { podcastProductionService as api } from "../services/podcastProductionService";
import {
  createEnsureDraft,
  informationComplete,
  initialPodcastWizardState,
  podcastWizardReducer,
  scriptComplete,
  voiceComplete,
  type PodcastVoiceMode,
  type PodcastWizardState,
  type PodcastWizardStep,
  type WizardAudio,
} from "../podcastWizardState";
import { usePodcastInvalidation } from "./usePodcastProduction";

export function usePodcastCreationWizard(initialState?: () => PodcastWizardState) {
  const [state, dispatch] = useReducer(
    podcastWizardReducer,
    initialState,
    (value) => value?.() ?? initialPodcastWizardState(),
  );
  const stateRef = useRef(state);
  stateRef.current = state;
  const draftKey = useRef(newIdempotencyKey());
  const invalidate = usePodcastInvalidation();
  const ensureDraftRef = useRef<() => Promise<string>>(undefined);

  if (!ensureDraftRef.current) {
    ensureDraftRef.current = createEnsureDraft(
      () => stateRef.current,
      async (seriesId, title) => {
        const episode = await api.append(seriesId, title, draftKey.current);
        return episode.id;
      },
      (episodeId) => dispatch({ type: "draftCreated", episodeId }),
    );
  }

  const ensureDraft = useCallback(() => ensureDraftRef.current!(), []);

  const saveInformation = useCallback(async () => {
    const id = await ensureDraft();
    const current = stateRef.current;
    await api.patchEpisode(id, {
      title: current.title.trim(),
      description: current.description.trim() || null,
    });
    await invalidate();
    return id;
  }, [ensureDraft, invalidate]);

  const saveScript = useCallback(
    async (document: EditorDocument | null) => {
      const id = await ensureDraft();
      const narration = await api.script(id, { scriptDocument: document });
      if (stateRef.current.scriptDocument === document) dispatch({ type: "scriptSaved" });
      await invalidate();
      return narration;
    },
    [ensureDraft, invalidate],
  );

  const attachAudio = useCallback(
    async (assetId: string, analysis: AudioAnalysis, previewUrl: string | null, confirmReplacePublished = false) => {
      const id = await ensureDraft();
      const narration = await api.audio(id, { assetId, analysis, confirmReplacePublished });
      dispatch({
        type: "setUploadedAudio",
        value: { assetId, analysis, previewUrl: narration.audio?.previewUrl ?? previewUrl },
      });
      await invalidate();
      return narration;
    },
    [ensureDraft, invalidate],
  );

  return {
    state,
    dispatch,
    ensureDraft,
    saveInformation,
    saveScript,
    attachAudio,
    completion: {
      information: informationComplete(state),
      script: scriptComplete(state),
      voice: voiceComplete(state),
      review:
        informationComplete(state) &&
        scriptComplete(state) &&
        voiceComplete(state),
    },
    selectStep: (step: PodcastWizardStep) =>
      dispatch({ type: "selectStep", step }),
    setVoiceMode: (value: PodcastVoiceMode) =>
      dispatch({ type: "setVoiceMode", value }),
    setAudio: (value: WizardAudio | null) =>
      dispatch({ type: "setUploadedAudio", value }),
  };
}

export type PodcastCreationWizard = ReturnType<typeof usePodcastCreationWizard>;
