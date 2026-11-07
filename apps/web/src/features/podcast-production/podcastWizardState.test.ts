import { describe, expect, it } from "bun:test";
import {
  createEnsureDraft,
  informationComplete,
  initialPodcastWizardState,
  podcastWizardStateFromEpisode,
  podcastWizardReducer,
  scriptComplete,
  voiceComplete,
} from "./podcastWizardState";

describe("podcast wizard state", () => {
  it("restores an existing episode without marking its script as changed", () => {
    const state = podcastWizardStateFromEpisode({
      id: "episode-1",
      seriesId: "series-1",
      title: "Khởi nghĩa",
      description: "Tập mở đầu",
      narrations: [{
        type: "THIRD_PERSON",
        scriptContent: "Nội dung cũ",
        scriptDocument: null,
        dialogue: null,
        audioAnalysis: null,
        audio: { assetId: "audio-1", previewUrl: "/audio.mp3" },
      }],
    }, "event-1");

    expect(state.episodeId).toBe("episode-1");
    expect(state.seriesId).toBe("series-1");
    expect(state.historicalEventId).toBe("event-1");
    expect(state.scriptText).toBe("Nội dung cũ");
    expect(state.scriptDirty).toBe(false);
    expect(state.uploadedAudio?.previewUrl).toBe("/audio.mp3");

    const edited = podcastWizardReducer(state, {
      type: "setScript",
      document: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Nội dung mới" }] }] },
      text: "Nội dung mới",
    });
    expect(edited.scriptDirty).toBe(true);
    expect(podcastWizardReducer(edited, { type: "scriptSaved" }).scriptDirty).toBe(false);
  });
  it("allows every step to be selected before earlier steps are complete", () => {
    const review = podcastWizardReducer(initialPodcastWizardState(), {
      type: "selectStep",
      step: "review",
    });
    const voice = podcastWizardReducer(review, {
      type: "selectStep",
      step: "voice",
    });

    expect(review.activeStep).toBe("review");
    expect(voice.activeStep).toBe("voice");
  });

  it("recomputes completion in both directions from current content", () => {
    let state = initialPodcastWizardState();
    state = podcastWizardReducer(state, {
      type: "updateInformation",
      value: {
        seriesId: "series-1",
        title: "Bạch Đằng",
        description: "Câu chuyện về trận Bạch Đằng",
        historicalEventId: "event-1",
      },
    });
    expect(informationComplete(state)).toBe(true);

    state = podcastWizardReducer(state, {
      type: "updateInformation",
      value: { description: "" },
    });
    expect(informationComplete(state)).toBe(false);

    state = podcastWizardReducer(state, {
      type: "setScriptText",
      value: "Năm 938",
    });
    expect(scriptComplete(state)).toBe(true);
    state = podcastWizardReducer(state, { type: "setScriptText", value: " " });
    expect(scriptComplete(state)).toBe(false);

    state = podcastWizardReducer(state, {
      type: "setUploadedAudio",
      value: { assetId: "audio-1", previewUrl: "blob:audio" },
    });
    expect(voiceComplete(state)).toBe(true);
    state = podcastWizardReducer(state, {
      type: "setUploadedAudio",
      value: null,
    });
    expect(voiceComplete(state)).toBe(false);
  });

  it("keeps local values while no episode exists", () => {
    let state = initialPodcastWizardState();
    state = podcastWizardReducer(state, {
      type: "updateInformation",
      value: { seriesId: "series-1", title: "Tập chưa lưu" },
    });
    state = podcastWizardReducer(state, {
      type: "selectStep",
      step: "script",
    });

    expect(state.episodeId).toBeNull();
    expect(state.title).toBe("Tập chưa lưu");
    expect(state.activeStep).toBe("script");
  });

  it("creates one draft for concurrent ensure calls", async () => {
    let calls = 0;
    let state = podcastWizardReducer(initialPodcastWizardState(), {
      type: "updateInformation",
      value: { seriesId: "series-1", title: "Bạch Đằng" },
    });
    const ensureDraft = createEnsureDraft(
      () => state,
      async () => {
        calls += 1;
        await Promise.resolve();
        return "episode-1";
      },
      (episodeId) => {
        state = podcastWizardReducer(state, { type: "draftCreated", episodeId });
      },
    );

    const [first, second] = await Promise.all([ensureDraft(), ensureDraft()]);

    expect(first).toBe("episode-1");
    expect(second).toBe("episode-1");
    expect(calls).toBe(1);
    expect(state.episodeId).toBe("episode-1");
  });

  it("reports missing series and title without clearing local content", async () => {
    const state = podcastWizardReducer(initialPodcastWizardState(), {
      type: "updateInformation",
      value: { description: "Nội dung đang soạn" },
    });
    const ensureDraft = createEnsureDraft(
      () => state,
      async () => "episode-1",
      () => undefined,
    );

    await expect(ensureDraft()).rejects.toThrow("Chọn series và nhập tên tập podcast");
    expect(state.description).toBe("Nội dung đang soạn");
  });
});
