import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Tên hiển thị cần ít nhất 2 ký tự.").max(100, "Tên hiển thị không được quá 100 ký tự."),
  image: z.string().trim().refine(
    (value) => value === "" || z.string().url().safeParse(value).success,
    "Ảnh đại diện phải là một đường dẫn hợp lệ.",
  ),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Nhập mật khẩu hiện tại."),
  newPassword: z.string().min(8, "Mật khẩu mới cần ít nhất 8 ký tự.").max(128, "Mật khẩu mới quá dài."),
  confirmPassword: z.string().min(1, "Nhập lại mật khẩu mới."),
}).refine((values) => values.newPassword === values.confirmPassword, {
  message: "Hai mật khẩu mới chưa trùng khớp.",
  path: ["confirmPassword"],
}).refine((values) => values.currentPassword !== values.newPassword, {
  message: "Mật khẩu mới phải khác mật khẩu hiện tại.",
  path: ["newPassword"],
});

export type UpdateProfileValues = z.infer<typeof updateProfileSchema>;
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
