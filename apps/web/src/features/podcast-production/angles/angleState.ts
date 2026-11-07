import { ANGLE_GUIDE_MAX, ANGLE_NAME_MAX } from "@repo/shared";

export { ANGLE_GUIDE_MAX, ANGLE_NAME_MAX };
/** UX 06 caps the short description at 120; the API accepts up to 160. */
export const ANGLE_DESCRIPTION_MAX = 120;
export const ANGLE_COPY_SUFFIX = " (của tôi)";

export const ANGLE_MESSAGES = {
  nameRequired: "Cần có tên góc kể.",
  nameTooLong: `Tên tối đa ${ANGLE_NAME_MAX} ký tự.`,
  nameTaken: "Đã có góc kể trùng tên.",
  noMineYet: "Bạn chưa có góc kể riêng. Bấm Tạo góc kể mới, hoặc Nhân bản một góc có sẵn để chỉnh.",
  noMatch: "Không có góc kể khớp.",
  noDescription: "Không có mô tả",
  saved: "Đã lưu góc kể",
} as const;

export interface AngleItem {
  id: string;
  name: string;
  description: string;
  guide: string;
  builtin: boolean;
}

export interface AngleForm {
  name: string;
  description: string;
  guide: string;
}

export interface AngleFieldError {
  field: "name";
  message: string;
}

export const EMPTY_ANGLE_FORM: AngleForm = { name: "", description: "", guide: "" };

export const toAngleForm = (angle: AngleItem): AngleForm => ({ name: angle.name, description: angle.description, guide: angle.guide });

export const deletedMessage = (name: string): string => `Đã xóa "${name}"`;

/** Matches name or description, case-insensitive; an empty query keeps everything. */
export function filterAngles<T extends AngleItem>(angles: readonly T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  return q ? angles.filter((angle) => `${angle.name} ${angle.description}`.toLowerCase().includes(q)) : [...angles];
}

/** Counts are totals of each group, never the filtered size. */
export function groupAngles<T extends AngleItem>(angles: readonly T[]): { mine: T[]; builtin: T[] } {
  return { mine: angles.filter((angle) => !angle.builtin), builtin: angles.filter((angle) => angle.builtin) };
}

/** Order: empty name, too long, then duplicate against every other angle (builtin included). */
export function validateAngleForm(form: AngleForm, angles: readonly AngleItem[], currentId: string | null): AngleFieldError | null {
  const name = form.name.trim();
  if (!name) return { field: "name", message: ANGLE_MESSAGES.nameRequired };
  if (name.length > ANGLE_NAME_MAX) return { field: "name", message: ANGLE_MESSAGES.nameTooLong };
  const lower = name.toLowerCase();
  if (angles.some((angle) => angle.id !== currentId && angle.name.trim().toLowerCase() === lower)) return { field: "name", message: ANGLE_MESSAGES.nameTaken };
  return null;
}

export const duplicateForm = (angle: AngleItem): AngleForm => ({ ...toAngleForm(angle), name: `${angle.name}${ANGLE_COPY_SUFFIX}` });

export const trimmedForm = (form: AngleForm): AngleForm => ({ name: form.name.trim(), description: form.description.trim(), guide: form.guide.trim() });
