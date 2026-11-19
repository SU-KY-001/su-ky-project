import { z } from "zod";
import { apiRequest } from "@/lib/apiRequest";

export type AdminUserRole = "user" | "moderator" | "admin";

export interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: AdminUserRole;
  banned: boolean;
  banReason: string | null;
  banExpires: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminUserListFilter {
  page: number;
  limit: number;
  searchValue?: string;
  searchField?: "name" | "email";
  role?: AdminUserRole;
}

const AdminUserRoleSchema = z.enum(["user", "moderator", "admin"]);
const AdminUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  emailVerified: z.boolean().default(false),
  image: z.string().nullable().optional().transform((value) => value ?? null),
  role: AdminUserRoleSchema.nullable().optional().transform((value) => value ?? "user"),
  banned: z.boolean().nullable().optional().transform((value) => value ?? false),
  banReason: z.string().nullable().optional().transform((value) => value ?? null),
  banExpires: z.coerce.date().nullable().optional().transform((value) => value ?? null),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

const AdminUserListSchema = z.object({
  users: z.array(AdminUserSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number().optional(),
});
const WrappedUserSchema = z.object({ user: AdminUserSchema });
const RemoveUserSchema = z.object({ success: z.boolean() });

function postUser(path: string, body: unknown) {
  return apiRequest(path, WrappedUserSchema, { method: "POST", body }).then(({ user }) => user);
}

export const adminUserService = {
  async list(filter: AdminUserListFilter) {
    const search = new URLSearchParams({
      limit: String(filter.limit),
      offset: String((filter.page - 1) * filter.limit),
      sortBy: "createdAt",
      sortDirection: "desc",
    });
    if (filter.searchValue) {
      search.set("searchValue", filter.searchValue);
      search.set("searchField", filter.searchField ?? "name");
      search.set("searchOperator", "contains");
    }
    if (filter.role) {
      search.set("filterField", "role");
      search.set("filterValue", filter.role);
      search.set("filterOperator", "eq");
    }
    const response = await apiRequest(`/api/auth/admin/list-users?${search}`, AdminUserListSchema);
    return {
      items: response.users,
      page: Math.floor((response.offset ?? 0) / response.limit) + 1,
      limit: response.limit,
      total: response.total,
    };
  },
  create(input: { name: string; email: string; password: string; role: AdminUserRole }) {
    return postUser("/api/auth/admin/create-user", input);
  },
  update(id: string, input: { name: string; email: string }) {
    return apiRequest("/api/auth/admin/update-user", AdminUserSchema, {
      method: "POST",
      body: { userId: id, data: input },
    });
  },
  setRole(id: string, role: AdminUserRole) {
    return postUser("/api/auth/admin/set-role", { userId: id, role });
  },
  ban(id: string, reason: string) {
    return postUser("/api/auth/admin/ban-user", { userId: id, banReason: reason });
  },
  unban(id: string) {
    return postUser("/api/auth/admin/unban-user", { userId: id });
  },
  remove(id: string) {
    return apiRequest("/api/auth/admin/remove-user", RemoveUserSchema, {
      method: "POST",
      body: { userId: id },
    });
  },
};
