import { describe, expect, it } from "bun:test";
import { ANGLE_MESSAGES, ANGLE_NAME_MAX, duplicateForm, filterAngles, groupAngles, validateAngleForm, type AngleItem } from "./angleState";

const angle = (id: string, name: string, description = "", builtin = false): AngleItem => ({ id, name, description, guide: `guide ${name}`, builtin });
const angles = [
  angle("builtin:a", "Nhân vật", "Kể qua một người.", true),
  angle("builtin:b", "Đối lập", "Hai phía.", true),
  angle("u1", "Một ngày ở kinh đô", "Cảnh sinh hoạt"),
];

describe("filterAngles", () => {
  it("matches name and description case-insensitively", () => {
    expect(filterAngles(angles, "  NHÂN ").map((a) => a.id)).toEqual(["builtin:a"]);
    expect(filterAngles(angles, "sinh hoạt").map((a) => a.id)).toEqual(["u1"]);
  });
  it("keeps all on empty query and none on no match", () => {
    expect(filterAngles(angles, "  ")).toHaveLength(3);
    expect(filterAngles(angles, "zzz")).toEqual([]);
  });
});

describe("groupAngles", () => {
  it("splits by builtin", () => {
    const { mine, builtin } = groupAngles(angles);
    expect(mine.map((a) => a.id)).toEqual(["u1"]);
    expect(builtin).toHaveLength(2);
  });
});

describe("validateAngleForm", () => {
  const form = (name: string) => ({ name, description: "", guide: "" });
  it("rejects blank name first", () => {
    expect(validateAngleForm(form("   "), angles, null)?.message).toBe(ANGLE_MESSAGES.nameRequired);
  });
  it("rejects too long name before duplicate check", () => {
    expect(validateAngleForm(form("x".repeat(ANGLE_NAME_MAX + 1)), angles, null)?.message).toBe(ANGLE_MESSAGES.nameTooLong);
    expect(validateAngleForm(form("x".repeat(ANGLE_NAME_MAX)), angles, null)).toBeNull();
  });
  it("rejects a duplicate of builtin or mine, case-insensitively", () => {
    expect(validateAngleForm(form("nhân vật"), angles, null)?.message).toBe(ANGLE_MESSAGES.nameTaken);
    expect(validateAngleForm(form(" MỘT NGÀY Ở KINH ĐÔ "), angles, null)?.message).toBe(ANGLE_MESSAGES.nameTaken);
  });
  it("lets an angle keep its own name", () => {
    expect(validateAngleForm(form("Một ngày ở kinh đô"), angles, "u1")).toBeNull();
  });
});

describe("duplicateForm", () => {
  it("prefills name with the suffix and copies the rest", () => {
    expect(duplicateForm(angles[0]!)).toEqual({ name: "Nhân vật (của tôi)", description: "Kể qua một người.", guide: "guide Nhân vật" });
  });
});
