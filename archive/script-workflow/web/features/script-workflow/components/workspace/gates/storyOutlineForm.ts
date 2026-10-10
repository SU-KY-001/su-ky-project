import { STEP_OUTPUT_SCHEMAS, type StoryEpisodeOutline, type StoryOutline } from "@repo/shared";

export const SPDC_FIELDS: readonly { key: keyof StoryEpisodeOutline["spdcCycle"]; label: string }[] = [
  { key: "situation", label: "Bối cảnh" },
  { key: "problem", label: "Vấn đề" },
  { key: "decision", label: "Quyết định" },
  { key: "consequence", label: "Hệ quả" },
];

export const INPUT_CLASS =
  "min-h-11 w-full rounded-[10px] border border-mod-border bg-mod-surface px-3 font-moderator text-sm text-mod-text placeholder:text-mod-text-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary disabled:opacity-60";

export const TEXTAREA_CLASS =
  "w-full resize-y rounded-[10px] border border-mod-border bg-mod-surface p-3 font-moderator text-sm text-mod-text placeholder:text-mod-text-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary disabled:opacity-60";

export function validateStoryOutlineClient(outline: StoryOutline): string[] {
  const errors: string[] = [];
  if (!outline.seriesTitle.trim()) errors.push("Tiêu đề series không được để trống.");
  if (!outline.narrativeFocus.trim()) errors.push("Trọng tâm kể không được để trống.");

  for (const ep of outline.episodes) {
    const label = `Tập ${ep.episodeNumber}`;
    if (!ep.episodeTitle.trim()) errors.push(`${label}: Tiêu đề tập không được để trống.`);
    if (!ep.centralQuestion.trim()) errors.push(`${label}: Câu hỏi trung tâm không được để trống.`);
    for (const cell of SPDC_FIELDS) {
      if (!ep.spdcCycle[cell.key].trim()) {
        errors.push(`${label}: Ô "${cell.label}" không được để trống.`);
      }
    }
    if (!ep.hookEnd.trim()) errors.push(`${label}: Câu móc cuối tập không được để trống.`);
    if (ep.narrativeBeats.some((beat) => !beat.trim())) {
      errors.push(`${label}: Có dòng Nhịp kể đang để trống.`);
    }
    if (ep.pacingPlan.summaryMoments.some((item) => !item.trim())) {
      errors.push(`${label}: Có dòng Kể lướt đang để trống.`);
    }
    if (ep.pacingPlan.detailedSceneMoments.some((item) => !item.trim())) {
      errors.push(`${label}: Có dòng Kể chi tiết đang để trống.`);
    }
  }

  const parsed = STEP_OUTPUT_SCHEMAS.STORY_PLANNER.safeParse(outline);
  if (!parsed.success && errors.length === 0) {
    for (const issue of parsed.error.issues) {
      errors.push(`Trường "${issue.path.join(".")}": ${issue.message}`);
    }
  }
  return errors;
}
