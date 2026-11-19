import { describe, expect, it } from "bun:test";
import { initialPodcastWizardState, podcastWizardReducer } from "./podcastWizardState";
import { buildLocalReviewChecklist } from "./reviewChecklist";

describe("podcast review checklist", () => {
  it("reports every incomplete section with a stable label", () => {
    const items = buildLocalReviewChecklist(initialPodcastWizardState(), 0);

    expect(items).toEqual([
      { key: "information", label: "Thông tin tập podcast", ok: false },
      { key: "script", label: "Kịch bản", ok: false },
      { key: "attachments", label: "Tài liệu bổ sung", ok: true },
      { key: "audio", label: "File thu âm", ok: false },
    ]);
  });

  it("marks required sections complete while keeping attachments optional", () => {
    let state = initialPodcastWizardState();
    state = podcastWizardReducer(state, {
      type: "updateInformation",
      value: {
        seriesId: "series-1",
        title: "Bạch Đằng",
        description: "Mô tả",
        historicalEventId: "event-1",
      },
    });
    state = podcastWizardReducer(state, { type: "setScriptText", value: "Năm 938" });
    state = podcastWizardReducer(state, {
      type: "setUploadedAudio",
      value: { assetId: "audio-1", previewUrl: "https://cdn/audio.mp3" },
    });

    expect(buildLocalReviewChecklist(state, 2).every((item) => item.ok)).toBe(true);
  });
});
