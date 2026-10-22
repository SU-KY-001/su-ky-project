import type { DraftSectionRequest } from "@repo/shared";
import { buildDraftInput } from "../input/draft-section.input";
import { DRAFT_SECTION_PROMPT } from "../prompts/draft-section.prompt";
import { DraftSectionOutputSchema, type DraftSectionOutput } from "../schemas/draft-section.schema";
import { validateDraft, type DraftValidation } from "../validators/draft";
import { CHAIN_ANGLE, EPISODE, NARRATOR, SERIES } from "./fixtures";
import { failed, type GoldenCase } from "./types";

type DraftGolden = GoldenCase<DraftSectionOutput, DraftValidation>;

const TARGET_WORDS = 30;
const HEDGE = /(có lẽ|dường như|nhiều người cho rằng|có thể hình dung|hình như)/i;
const QUOTES = /["“”«»]/;
const SPEECH_VERB = /(nói rằng|nói:|bảo rằng|tuyên bố rằng)/i;

const outline = (points: string[], index: number, previousText?: string): Pick<DraftSectionRequest, "outline" | "index" | "previousText"> => ({
  outline: [
    { title: "Một kinh đô chật hẹp", goal: "Người nghe thấy vì sao Hoa Lư không đủ.", points: [], targetWords: TARGET_WORDS },
    { title: "Lời chiếu", goal: "Quyết định được tuyên bố.", points, targetWords: TARGET_WORDS },
    { title: "Rồng bay lên", goal: "Kinh đô mới mở ra.", points: [], targetWords: TARGET_WORDS },
  ],
  index,
  previousText,
});

interface Options {
  index?: number;
  points: string[];
  previousText?: string;
  narrator?: boolean;
  recorded: string;
  extra?: (v: DraftValidation) => Record<string, boolean>;
  promptChecks?: (prompt: string) => string[];
}

function draftCase(name: string, o: Options): DraftGolden {
  const request: DraftSectionRequest = {
    ...outline(o.points, o.index ?? 1, o.previousText),
    tone: { preset: "calm" },
    angleId: "builtin:chuoi-su-kien",
    topic: "Vì sao Lý Thái Tổ dời đô ra Đại La",
    narration: o.narrator ? "FIRST_PERSON" : "THIRD_PERSON",
  };
  const userPrompt = buildDraftInput({ series: SERIES, episode: EPISODE, sourcesXml: null, request, angle: CHAIN_ANGLE, narrator: o.narrator ? NARRATOR : null });
  const reference = [request.topic, SERIES.description, EPISODE.description, ...request.outline.flatMap((s) => [s.title, s.goal, ...s.points])].join("\n");
  return {
    name,
    systemPrompt: DRAFT_SECTION_PROMPT,
    userPrompt,
    schema: DraftSectionOutputSchema,
    recorded: { text: o.recorded },
    validate: (raw) => validateDraft({ text: raw.text, targetWords: TARGET_WORDS, reference }),
    invariants: (v) =>
      failed({
        "no markdown": !/^\s*(#|[-*]\s|\d+[.)]\s)|\*\*|`/m.test(v.paragraphs.join("\n")),
        "no source marks": !/CẦN NGUỒN/i.test(v.paragraphs.join("\n")),
        "no parentheses": !/[()]/.test(v.paragraphs.join("\n")),
        ...o.extra?.(v),
      }),
    promptChecks: o.promptChecks,
  };
}

const PLAIN = "Sáng hôm ấy, gió thổi nhẹ qua những dãy núi đá quanh kinh thành. Triều đình họp bàn rất lâu về chuyện dời đi. Nhiều người lo lắng cho phía trước còn dài.";

export const DRAFT_GOLDEN: DraftGolden[] = [
  draftCase("first-section-hook", {
    index: 0,
    points: [],
    recorded: "Gió thổi qua dãy núi đá, và trong cung điện chật hẹp, một người đàn ông đang nhìn bản đồ. Ông tự hỏi liệu mảnh đất này còn đủ rộng cho một vương triều không.",
    extra: (v) => ({ "no flat opening": !/^hôm nay chúng ta sẽ/i.test(v.paragraphs[0]!) }),
    promptChecks: (p) => failed({ "first section has no <before>": !p.includes("<before>"), "position FIRST": p.includes('position="FIRST"') }),
  }),
  draftCase("last-section-no-subscribe", {
    index: 2,
    points: [],
    previousText: "Đoàn thuyền cập bến khi trời sẩm tối.",
    recorded: "Và thế là một kinh đô mới bắt đầu. Câu hỏi còn lại là liệu nó sẽ đứng vững bao lâu.",
    extra: (v) => ({ "no subscribe call": !/(đăng ký|theo dõi|subscribe|like)/i.test(v.paragraphs.join(" ")) }),
    promptChecks: (p) => failed({ "position LAST": p.includes('position="LAST"') }),
  }),
  draftCase("numbers-readable", {
    points: ["Triều Lý tồn tại hơn hai trăm năm."],
    // Recorded output is compliant; the invariants bite on the live model (the validator does not rewrite wording).
    recorded: "Triều Lý bắt đầu từ đầu thế kỷ mười một và kéo dài hơn hai trăm năm. Người dân sống yên ổn trong phần lớn thời gian đó, như người ta vẫn kể lại.",
    extra: (v) => ({
      "no TK/vv": !/\bTK\b|\bvv\./.test(v.paragraphs.join(" ")),
      "no year range with dash": !/\d{3,4}\s*[-–]\s*\d{3,4}/.test(v.paragraphs.join(" ")),
      "no symbols": !/[%&/]/.test(v.paragraphs.join(" ")),
    }),
  }),
  draftCase("no-markdown", {
    points: [],
    // Flaws on purpose: heading, bullet, bold, fence, [CẦN NGUỒN], stage direction and three blank lines.
    recorded: `\`\`\`\n## Lời chiếu\n\n**Sáng hôm ấy**, triều đình họp rất lâu. [CẦN NGUỒN]\n\n\n\n- Nhiều người lo lắng cho phía trước.\n[nhạc nền]\n1. Rồi mọi chuyện được quyết định.\n\`\`\``,
    extra: (v) => ({ "reported as cleaned": v.cleaned, "split into paragraphs": v.paragraphs.length >= 2 }),
  }),
  draftCase("length-within-tolerance", {
    points: [],
    recorded: PLAIN,
    extra: (v) => ({ "length OK": v.lengthStatus === "OK" }),
  }),
  draftCase("first-person-no-fake-quote", {
    points: ["Nhà vua cân nhắc chuyện dời đô."],
    narrator: true,
    recorded: "Tôi đứng trước bản đồ rất lâu. Có lẽ tôi đã nghĩ rằng Hoa Lư không còn đủ chỗ cho một vương triều đang lớn dần.",
    extra: (v) => ({ "no quotation marks": !QUOTES.test(v.paragraphs.join(" ")) }),
    promptChecks: (p) => failed({ "narrator tag present": p.includes("<narrator") }),
  }),
  draftCase("previous-text-continuity", {
    points: ["Triều đình họp bàn."],
    previousText: "Mùa thu năm ấy, một tờ chiếu được soạn.",
    recorded: "Tờ chiếu ấy nhanh chóng đến tay các quan. Họ đọc nó trong im lặng, rồi bắt đầu bàn bạc về chuyện phải làm.",
    extra: (v) => ({ "no greeting": !/^(xin chào|chào các bạn|chào mừng)/i.test(v.paragraphs[0]!) }),
    promptChecks: (p) => failed({ "before tag present": p.includes("<before>Mùa thu năm ấy") }),
  }),
  draftCase("no-invented-specifics", {
    points: ["Triều đình họp bàn rất lâu.", "Quyết định được đưa ra."],
    recorded: "Triều đình họp bàn rất lâu trong sảnh lớn. Cuối cùng, quyết định được đưa ra và cả sảnh lặng đi.",
    extra: (v) => ({ "no new numbers": v.novelNumbers.length === 0 }),
  }),
  draftCase("motive-as-interpretation", {
    points: ["Nhà vua muốn một nơi rộng rãi hơn cho kinh đô."],
    recorded: "Có lẽ nhà vua muốn một nơi rộng rãi hơn cho kinh đô. Dường như ông nhìn thấy ở đó một tương lai khác.",
    extra: (v) => ({ "hedged": HEDGE.test(v.paragraphs.join(" ")) }),
  }),
  draftCase("no-unsourced-speech", {
    points: ["Nhà vua đứng trước triều thần."],
    recorded: "Nhà vua đứng trước triều thần và im lặng một lúc. Có thể hình dung ông nói rằng đã đến lúc phải đi, nhưng không ai còn nhớ chính xác lời ấy.",
    extra: (v) => ({
      "no quotation marks": !QUOTES.test(v.paragraphs.join(" ")),
      "speech only marked as reconstruction": !SPEECH_VERB.test(v.paragraphs.join(" ")) || /có thể hình dung/i.test(v.paragraphs.join(" ")),
    }),
  }),
];
