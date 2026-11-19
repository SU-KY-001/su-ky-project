import { expect, it } from "bun:test";
import { formatClock, paragraphCount } from "./readinessLabels";


it("counts script paragraphs and formats the audio clock", () => {
  expect(paragraphCount("Một\n\nHai\n  \nBa")).toBe(3);
  expect(paragraphCount("")).toBe(0);
  expect(formatClock(252_000)).toBe("04:12");
});
