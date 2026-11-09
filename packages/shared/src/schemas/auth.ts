import { z } from "zod";

export const UserRoleEnum = z.enum(["user", "moderator", "admin"]);
export type UserRole = z.infer<typeof UserRoleEnum>;

export const SignInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});
export type SignInInput = z.infer<typeof SignInSchema>;

export const SignUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});
export type SignUpInput = z.infer<typeof SignUpSchema>;

export const UserProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  emailVerified: z.boolean(),
  image: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  createdAt: z.date().or(z.string()).optional(),
  updatedAt: z.date().or(z.string()).optional(),
});
export type UserProfileDto = z.infer<typeof UserProfileSchema>;

export const UpdateProfileSchema = z.object({
  name: z.string().trim().min(2, "Tên cần ít nhất 2 ký tự").max(100).optional(),
  image: z.null().optional(),
}).strict().refine((value) => value.name !== undefined || value.image === null, "Chưa có thay đổi");
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

export const DeleteProfileSchema = z.object({
  password: z.string().min(1).max(128),
  confirm: z.literal(true),
}).strict();
export type DeleteProfileInput = z.infer<typeof DeleteProfileSchema>;
