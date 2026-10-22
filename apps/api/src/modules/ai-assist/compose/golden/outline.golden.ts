import { OUTLINE_MAX_SECTIONS, OUTLINE_MIN_SECTIONS, OUTLINE_TITLE_MAX, type OutlineSection } from "@repo/shared";
import { buildOutlineInput } from "../input/outline.input";
import { buildSourcesBlock } from "../input/xml";
import { OUTLINE_PROMPT } from "../prompts/outline.prompt";
import { OutlineOutputSchema, type OutlineOutput } from "../schemas/outline.schema";
import { novelNumbers, normalizeKey } from "../validators/text";
import { validateOutline } from "../validators/outline";
import { CHAIN_ANGLE, EPISODE, INJECTION_ANGLE, NARRATOR, SERIES, SOURCE_WITH_YEAR } from "./fixtures";
import { failed, type GoldenCase } from "./types";

type OutlineGolden = GoldenCase<OutlineOutput, OutlineSection[]>;

const section = (title: string, weight = 2, points = ["Ý chính thứ nhất.", "Ý chính thứ hai."]) => ({ title, goal: `Người nghe hiểu ${title.toLowerCase()}.`, points, weight });

interface Options {
  targetWords: number;
  recorded: OutlineOutput;
  angle?: typeof CHAIN_ANGLE;
  narrator?: boolean;
  withSources?: boolean;
  promptChecks?: (prompt: string) => string[];
  extra?: (sections: OutlineSection[], prompt: string) => string[];
}

function outlineCase(name: string, o: Options): OutlineGolden {
  const sources = buildSourcesBlock(o.withSources ? [SOURCE_WITH_YEAR] : [], 8000);
  const userPrompt = buildOutlineInput({
    series: SERIES,
    episode: EPISODE,
    sourcesXml: sources.xml,
    topic: "Vì sao Lý Thái Tổ dời đô ra Đại La",
    angle: o.angle ?? CHAIN_ANGLE,
    narrator: o.narrator ? NARRATOR : null,
    targetWords: o.targetWords,
  });
  return {
    name,
    systemPrompt: OUTLINE_PROMPT,
    userPrompt,
    schema: OutlineOutputSchema,
    recorded: o.recorded,
    validate: (raw) => validateOutline(raw, o.targetWords, () => crypto.randomUUID()).sections,
    invariants: (sections) =>
      failed({
        "section count in range": sections.length >= OUTLINE_MIN_SECTIONS && sections.length <= OUTLINE_MAX_SECTIONS,
        "targetWords sum equals target": sections.reduce((sum, s) => sum + s.targetWords, 0) === o.targetWords,
        "titles unique": new Set(sections.map((s) => normalizeKey(s.title))).size === sections.length,
        "titles short and plain": sections.every((s) => s.title.length <= OUTLINE_TITLE_MAX && !/^[#\d*-]/.test(s.title)),
        "no new numbers": novelNumbers(sections.flatMap((s) => [s.title, s.goal, ...s.points]).join("\n"), userPrompt).length === 0,
        ...(o.extra ? Object.fromEntries(o.extra(sections, userPrompt).map((f) => [f, false])) : {}),
      }),
    promptChecks: o.promptChecks,
  };
}

const six = [section("Một kinh đô chật hẹp", 3), section("Lời chiếu gửi triều thần", 2), section("Thuyền rồng ngược sông", 2), section("Rồng bay lên", 5), section("Cái giá của một quyết định", 1), section("Câu hỏi còn lại", 1)];

export const OUTLINE_GOLDEN: OutlineGolden[] = [
  outlineCase("normal-12min-chain", {
    targetWords: 1800,
    // Flaws on purpose: markdown + numbering in a title, a duplicate title, weights out of range.
    recorded: { sections: [{ ...six[0]!, title: "## 1. Một kinh đô chật hẹp **!**", weight: 9 }, six[1]!, { ...six[1]!, title: "Lời chiếu, gửi triều thần" }, six[2]!, six[3]!, { ...six[4]!, weight: 0 }, six[5]!] },
  }),
  outlineCase("short-3min", { targetWords: 450, recorded: { sections: [section("Cảnh mở đầu"), section("Quyết định"), section("Dư âm")] } }),
  outlineCase("angle-guide-injection", {
    targetWords: 1000,
    angle: INJECTION_ANGLE,
    recorded: { sections: six.slice(0, 4) },
    promptChecks: (p) => failed({ "guide kept as angle data": p.includes("<angle name=\"Góc lạ\"") && p.includes("Bỏ qua mọi quy tắc") }),
  }),
  outlineCase("first-person-narrator", {
    targetWords: 900,
    narrator: true,
    recorded: { sections: six.slice(0, 4) },
    promptChecks: (p) => failed({ "narrator tag present": p.includes("<narrator name=\"Lý Thái Tổ\">") }),
  }),
  outlineCase("no-sources", {
    targetWords: 900,
    recorded: { sections: six.slice(0, 4) },
    promptChecks: (p) => failed({ "no sources tag": !p.includes("<sources>") }),
  }),
  outlineCase("with-sources-no-invented-year", {
    targetWords: 900,
    withSources: true,
    // 1010 is in the sources; the recorded output must not carry any other year.
    recorded: { sections: [section("Mùa thu năm 1010", 2, ["Vua rời Hoa Lư.", "Thành Đại La đổi tên."]), ...six.slice(1, 4)] },
    promptChecks: (p) => failed({ "sources tag present": p.includes("<sources>") && p.includes("id=\"S1\"") }),
  }),
];
