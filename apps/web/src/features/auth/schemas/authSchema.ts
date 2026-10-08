import { z } from "zod";

const email = z.string().trim().min(1, "Nhập địa chỉ email.").email("Địa chỉ email chưa hợp lệ.");
const password = z.string().min(1, "Nhập mật khẩu.");

export const signInSchema = z.object({ email, password, rememberMe: z.boolean() });
export const signUpSchema = z.object({
  name: z.string().trim().min(1, "Nhập tên của bạn.").max(80, "Tên không được dài quá 80 ký tự."),
  email,
  password: z.string().min(8, "Mật khẩu cần có ít nhất 8 ký tự.").max(128, "Mật khẩu quá dài."),
  confirmPassword: z.string().min(1, "Nhập lại mật khẩu."),
}).refine((values) => values.password === values.confirmPassword, {
  message: "Hai mật khẩu chưa trùng khớp.",
  path: ["confirmPassword"],
});
export const requestPasswordResetSchema = z.object({ email });

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
export type RequestPasswordResetValues = z.infer<typeof requestPasswordResetSchema>;

export const authResponseSchema = z.object({
  token: z.string().min(1).nullable().optional(),
  user: z.object({ id: z.string(), email: z.string() }),
});

export const passwordResetResponseSchema = z.object({ status: z.literal(true) });
