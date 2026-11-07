import type { PodcastWizardState } from "./podcastWizardState";
import {
  informationComplete,
  scriptComplete,
  voiceComplete,
} from "./podcastWizardState";

export function buildLocalReviewChecklist(
  state: PodcastWizardState,
  attachmentCount: number,
) {
  return [
    { key: "information", label: "Thông tin tập podcast", ok: informationComplete(state) },
    { key: "script", label: "Kịch bản", ok: scriptComplete(state) },
    {
      key: "attachments",
      label: attachmentCount ? `Tài liệu bổ sung (${attachmentCount})` : "Tài liệu bổ sung",
      ok: true,
    },
    { key: "audio", label: "File thu âm", ok: voiceComplete(state) },
  ];
}

