import { ANGLE_BUILTIN_PREFIX, type Angle } from "@repo/shared";

/** Read-only angles shipped with the app (same copy as mockups/angles.js). Ids are `builtin:<slug>`, never uuids. */
export const BUILTIN_ANGLES: readonly Angle[] = [
  {
    id: `${ANGLE_BUILTIN_PREFIX}chuoi-su-kien`,
    name: "Chuỗi sự kiện",
    description: "Trước, trong, sau.",
    guide: "Kể theo trình tự thời gian: bối cảnh trước, diễn biến chính, hệ quả sau.",
    builtin: true,
  },
  {
    id: `${ANGLE_BUILTIN_PREFIX}nhan-vat`,
    name: "Nhân vật",
    description: "Kể qua một người.",
    guide: "Chọn một nhân vật làm sợi chỉ xuyên suốt; sự kiện hiện ra qua lựa chọn và cảm nhận của họ.",
    builtin: true,
  },
  {
    id: `${ANGLE_BUILTIN_PREFIX}nguyen-nhan-he-qua`,
    name: "Nguyên nhân – hệ quả",
    description: "Vì sao, rồi sao.",
    guide: "Mở bằng câu hỏi vì sao; lần lượt gỡ từng nguyên nhân rồi kể hệ quả.",
    builtin: true,
  },
  {
    id: `${ANGLE_BUILTIN_PREFIX}doi-lap`,
    name: "Đối lập",
    description: "Hai phía, hai lựa chọn.",
    guide: "Đặt hai phía hoặc hai phương án cạnh nhau; để người nghe thấy cái giá của mỗi lựa chọn.",
    builtin: true,
  },
];

export function findBuiltinAngle(id: string): Angle | undefined {
  return BUILTIN_ANGLES.find((angle) => angle.id === id);
}
