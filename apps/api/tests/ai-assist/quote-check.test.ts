import { describe, expect, test } from "bun:test";
import { quoteInPage } from "../../src/modules/ai-assist/review/sources/quote-check";

const PAGE = "Quân Tống chết hơn 1 nghìn người. Quách Quỳ lui quân, lại lấy châu Quảng Nguyên\ncủa ta. Vua sai Lý Thường Kiệt đón đánh, đến sông Như Nguyệt533\nđánh tan được [9b] giặc.";

describe("quoteInPage", () => {
  test("accepts a verbatim clause that omits footnote digits and page markers", () => {
    expect(quoteInPage("đến sông Như Nguyệt đánh tan được giặc", PAGE)).toBe(true);
  });
  test("accepts ordered verbatim fragments joined by an ellipsis", () => {
    expect(quoteInPage("Quân Tống chết hơn 1 nghìn người ... Lý Thường Kiệt đón đánh", PAGE)).toBe(true);
  });
  test("rejects fragments out of page order", () => {
    expect(quoteInPage("Lý Thường Kiệt đón đánh ... Quân Tống chết hơn 1 nghìn người", PAGE)).toBe(false);
  });
  test("rejects a real excerpt followed by a short invented tail", () => {
    expect(quoteInPage("Quân Tống chết hơn 1 nghìn người … không đúng", PAGE)).toBe(false);
    expect(quoteInPage("Quân Tống chết hơn 1 nghìn người ... sai", PAGE)).toBe(false);
  });
  test("rejects a long invented fragment and an empty quote", () => {
    expect(quoteInPage("Quân Tống chết hơn 1 nghìn người ... và quân ta thua to", PAGE)).toBe(false);
    expect(quoteInPage("…", PAGE)).toBe(false);
  });
  test("a leading or trailing ellipsis around one exact fragment is fine", () => {
    expect(quoteInPage("… Quách Quỳ lui quân, lại lấy châu Quảng Nguyên …", PAGE)).toBe(true);
  });
});
