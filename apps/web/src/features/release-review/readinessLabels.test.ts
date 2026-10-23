import { expect, it } from "bun:test";
import type { EpisodeReadiness, ReadinessItem } from "@repo/shared";
import { formatClock, paragraphCount, reviewReason } from "./readinessLabels";

const readiness = (items: ReadinessItem[], ready = true): EpisodeReadiness => ({ ready, contentRevision: 1, computedAt: new Date(), items });
const row = (key: ReadinessItem["key"], level: ReadinessItem["level"], state: ReadinessItem["state"], params?: ReadinessItem["params"]): ReadinessItem => ({ key, level, state, ...(params ? { params } : {}) });

it("blocks approval with the first missing required row", () => {
  const reason = reviewReason(readiness([row("BASIC_INFO", "REQUIRED", "OK"), row("THIRD_PERSON_AUDIO", "REQUIRED", "MISSING")], false));
  expect(reason).toEqual({ tone: "blocked", text: "Chưa thể Duyệt: Chưa có âm thanh ngôi thứ ba sẵn sàng" });
});

it("allows approval with a note when only warnings remain", () => {
  const reason = reviewReason(readiness([row("BASIC_INFO", "REQUIRED", "OK"), row("ENTITY_TAGS_UNCONFIRMED", "WARNING", "WARN", { count: 2 })]));
  expect(reason).toEqual({ tone: "warn", text: "Có thể Duyệt. Cảnh báo không chặn, nhưng bạn nên xem." });
});

it("says 'Có thể Duyệt.' when everything is fine, ignoring AI rows and info rows", () => {
  const reason = reviewReason(readiness([row("BASIC_INFO", "REQUIRED", "OK"), row("AI_REVIEW_STALE", "WARNING", "WARN"), row("EPISODE_POSTER", "INFO", "INFO")]));
  expect(reason).toEqual({ tone: "ok", text: "Có thể Duyệt." });
});

it("counts script paragraphs and formats the audio clock", () => {
  expect(paragraphCount("Một\n\nHai\n  \nBa")).toBe(3);
  expect(paragraphCount("")).toBe(0);
  expect(formatClock(252_000)).toBe("04:12");
});
