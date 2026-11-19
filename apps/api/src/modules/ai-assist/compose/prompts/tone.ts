import { TONE_PRESETS, type ToneInput } from "@repo/shared";

type TonePreset = (typeof TONE_PRESETS)[number];

interface TonePresetSpec {
  label: string;
  guide: string;
  /** Only illustrates rhythm; the prompts tell the model never to copy it. */
  example: string;
}

/** Spec section 3. Presets only prefill: a moderator's own description is free text. */
export const TONE_PRESET_TABLE: Record<TonePreset, TonePresetSpec> = {
  calm: {
    label: "Điềm đạm",
    guide: "Giọng kể điềm đạm, rõ ràng, câu vừa phải, ít cảm thán, giữ nhịp đều.",
    example: "Mùa thu năm 1010, một đoàn thuyền ngược sông Hồng về phía Đại La.",
  },
  close: {
    label: "Kể chuyện gần gũi",
    guide:
      "Giọng như kể cho người quen nghe: gần gũi, có thể dùng 'thử hình dung', 'bạn sẽ thấy', câu ngắn, hình ảnh cụ thể; không suồng sã, không tiếng lóng.",
    example: "Thử hình dung một buổi sáng mùa thu năm 1010, trên sông Hồng có đoàn thuyền lạ.",
  },
  formal: {
    label: "Trang trọng",
    guide:
      "Giọng trang trọng, gần văn sử: dùng niên hiệu, danh xưng; vẫn câu đủ ngắn để đọc thành tiếng; tránh Hán Việt dày đặc.",
    example: "Năm Canh Tuất, niên hiệu Thuận Thiên, triều đình Lý quyết định dời đô.",
  },
};

/** Text placed inside <tone>: a preset's guide plus its rhythm example, or the moderator's own words verbatim. */
export function toneInstruction(tone: ToneInput): string {
  if ("custom" in tone) return tone.custom;
  const spec = TONE_PRESET_TABLE[tone.preset];
  return `${spec.guide}\nVí dụ chỉ để minh họa nhịp, không được chép lại: "${spec.example}"`;
}
