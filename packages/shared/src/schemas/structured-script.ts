export type ScriptKind = "monologue" | "dialogue";
export interface StructuredScriptAnalysis {
  kind: ScriptKind | "ambiguous";
  turns: Array<{ speaker: string; text: string }>;
  unassigned: string;
  title: string | null;
  issues: string[];
}

/** Type declarations describe the document; they are neither speakers nor spoken content. */
export function normalizeStructuredScriptText(input: string): string {
  return input.normalize("NFC").replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((line) => !/^\s*\[?\s*(?:loại\s+(?:kịch bản|podcast)|script\s+type)\s*:\s*(?:podcast\s+)?(?:độc thoại|hội thoại|monologue|dialogue)\s*\]?\s*$/iu.test(line))
    .join("\n").trim();
}

/** Conservative syntax recognition, never inferred semantic speaker assignment. */
export function analyzeStructuredScript(input: string): StructuredScriptAnalysis {
  const text = normalizeStructuredScriptText(input);
  const turns: StructuredScriptAnalysis["turns"] = [];
  const introduction: string[] = [];
  const uncertainLabels = new Set<string>();
  const excluded = /^(loại kịch bản|loại podcast|tiêu đề|tên kịch bản|tên podcast|nguồn|chú ý|lưu ý|ghi chú|tóm tắt|kết luận|mở đầu|nội dung|ví dụ|chủ đề|thời gian|địa điểm|phần\b|chương\b|https?\b)/iu;
  const labelPattern = /^\s*(?:\*\*|\[)?([\p{L}][\p{L}\p{M}\d ._-]{0,39}?)(?:\*\*|\])?\s*:\s*(.*)$/u;
  const isRole = (name: string): boolean => !excluded.test(name) && name.split(/\s+/).length <= 5 && (/^(MC|host|guest|khách|người|vai|speaker|nhân vật|dẫn chuyện)\b/iu.test(name) || /^[\p{Lu}][\p{L}\p{M}]*(?:\s+[\p{Lu}][\p{L}\p{M}]*){0,3}$/u.test(name));
  const roleKey = (name: string): string => name.replace(/\s+/g, " ").toLocaleLowerCase("vi-VN");
  const knownRoles = new Map<string, string>();
  for (const line of text.split("\n")) {
    const name = labelPattern.exec(line)?.[1]?.trim();
    if (name && isRole(name) && !knownRoles.has(roleKey(name))) knownRoles.set(roleKey(name), name);
  }
  for (const line of text.split("\n")) {
    const match = labelPattern.exec(line);
    const name = match?.[1]?.trim();
    const role = name && knownRoles.get(roleKey(name));
    if (match && name && !role && !excluded.test(name) && name.split(/\s+/).length <= 3) uncertainLabels.add(name);
    if (match && name && role) turns.push({ speaker: role, text: match[2] ?? "" });
    else if (turns.length) turns[turns.length - 1]!.text += `\n${line}`;
    else introduction.push(line);
  }
  for (const turn of turns) turn.text = turn.text.trim();
  const introductionLines = introduction.map((line) => line.trim()).filter(Boolean);
  const firstLine = introductionLines[0];
  // Only accept an explicit heading or an all-capital heading as metadata.
  // Other introductory prose still needs a speaker; never guess who says it.
  const title = firstLine && firstLine.length <= 240 && (
    /^(?:#{1,6}\s+|(?:tiêu đề|tên kịch bản|tên podcast)\s*:)/iu.test(firstLine) ||
    (/\p{L}/u.test(firstLine) && firstLine === firstLine.toLocaleUpperCase("vi-VN") && !/[.!?…]$/u.test(firstLine))
  ) ? firstLine : null;
  const unassigned = (title ? introductionLines.slice(1) : introductionLines).join("\n").trim();
  const speakers = new Set(turns.map((turn) => turn.speaker.toLocaleLowerCase("vi-VN")));
  const issues: string[] = [];
  if (uncertainLabels.size) issues.push(`Có nhãn chưa xác định: ${[...uncertainLabels].join(", ")}. Kiểm tra và viết rõ tên người nói trước khi nhập.`);
  if (speakers.size >= 2 && unassigned) issues.push("Có nội dung đầu file chưa gắn người nói. Thêm nhãn người nói cho đoạn này hoặc chỉnh lại file.");
  if (turns.some((turn) => !turn.text)) issues.push("Có lượt thoại chưa có lời.");
  if (!text) issues.push("Kịch bản đang trống.");
  return { kind: issues.length ? "ambiguous" : speakers.size >= 2 ? "dialogue" : "monologue", turns, unassigned, title, issues };
}
