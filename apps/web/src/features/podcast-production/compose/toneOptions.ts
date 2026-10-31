import type { ToneInput } from "@repo/shared";

export interface TonePresetOption {
  preset: "calm" | "close" | "formal";
  label: string;
  sample: string;
}

/** Labels and samples shown to the moderator. The instruction sent to the model lives on the server. */
export const TONE_PRESET_OPTIONS: TonePresetOption[] = [
  { preset: "calm", label: "Điềm đạm", sample: "Mùa thu năm 1010, một đoàn thuyền ngược sông Hồng về phía Đại La." },
  { preset: "close", label: "Kể chuyện gần gũi", sample: "Thử hình dung một buổi sáng mùa thu năm 1010, trên sông Hồng có đoàn thuyền lạ." },
  { preset: "formal", label: "Trang trọng", sample: "Năm Canh Tuất, niên hiệu Thuận Thiên, triều đình Lý quyết định dời đô." },
];

export const CUSTOM_TONE = "custom" as const;
export const DEFAULT_TONE_PRESET: TonePresetOption["preset"] = "calm";
export const CUSTOM_TONE_PLACEHOLDER = "như người kể chuyện đêm khuya, chậm rãi, có chút hoài cổ";

export function toneInput(choice: TonePresetOption["preset"] | typeof CUSTOM_TONE, custom: string): ToneInput | null {
  if (choice !== CUSTOM_TONE) return { preset: choice };
  const text = custom.trim();
  return text ? { custom: text } : null;
}
