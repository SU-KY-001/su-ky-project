import { z } from "zod";
import { AdminAuditLogSchema, AdminConfigSchema, AdminContentSeriesSchema, AdminCreateUserSchema, AdminDashboardSchema, AdminUpdateUserSchema, AdminUserSchema, MissionActivityTypeSchema, MissionTemplateInputSchema, MissionTemplatePatchSchema, paginatedSchema } from "@repo/shared";
import { apiRequest } from "@/lib/apiRequest";

const missionTemplateSchema = z.object({ id: z.string().uuid(), title: z.string(), description: z.string().nullable(), activityType: MissionActivityTypeSchema, targetCount: z.number(), xpReward: z.number(), isActive: z.boolean(), createdAt: z.coerce.date(), updatedAt: z.coerce.date() });
const weeklyMissionSchema = z.object({ id: z.string().uuid(), missionTemplateId: z.string().uuid(), weekStartDate: z.coerce.date(), title: z.string(), activityType: MissionActivityTypeSchema, targetCount: z.number(), xpReward: z.number(), activatedAt: z.coerce.date(), missionTemplate: missionTemplateSchema, _count: z.object({ userMissions: z.number() }) });

const query = (values: Record<string, string | undefined>) => {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => { if (value) params.set(key, value); });
  const text = params.toString(); return text ? `?${text}` : "";
};

export const adminService = {
  dashboard: () => apiRequest("/api/admin/dashboard", AdminDashboardSchema),
  users: (input: { page?: number; q?: string; role?: string; status?: string }) => apiRequest(`/api/admin/users${query({ page: String(input.page ?? 1), limit: "20", q: input.q, role: input.role, status: input.status })}`, paginatedSchema(AdminUserSchema)),
  createUser: (input: z.input<typeof AdminCreateUserSchema>) => apiRequest("/api/admin/users", AdminUserSchema, { method: "POST", body: input }),
  updateUser: (id: string, input: z.input<typeof AdminUpdateUserSchema>) => apiRequest(`/api/admin/users/${id}`, AdminUserSchema, { method: "PATCH", body: input }),
  banUser: (id: string, reason: string) => apiRequest(`/api/admin/users/${id}/ban`, AdminUserSchema, { method: "POST", body: { reason } }),
  unbanUser: (id: string) => apiRequest(`/api/admin/users/${id}/unban`, AdminUserSchema, { method: "POST" }),
  content: () => apiRequest("/api/admin/content?page=1&limit=50", paginatedSchema(AdminContentSeriesSchema)),
  interveneContent: (kind: "series" | "episodes", id: string, action: "hide" | "trash" | "restore") => apiRequest(`/api/admin/content/${kind}/${id}`, z.unknown(), { method: "POST", body: { action } }),
  configs: () => apiRequest("/api/admin/configs", z.object({ items: z.array(AdminConfigSchema) })),
  updateConfig: (key: string, value: unknown) => apiRequest(`/api/admin/configs/${encodeURIComponent(key)}`, AdminConfigSchema, { method: "PATCH", body: { value } }),
  audit: (input: { page?: number; actorId?: string; action?: string; from?: string; to?: string }) => apiRequest(`/api/admin/audit-logs${query({ page: String(input.page ?? 1), limit: "20", actorId: input.actorId, action: input.action, from: input.from, to: input.to })}`, paginatedSchema(AdminAuditLogSchema)),
  missionTemplates: () => apiRequest("/api/admin/mission-templates", z.object({ items: z.array(missionTemplateSchema) })),
  createMissionTemplate: (input: z.input<typeof MissionTemplateInputSchema>) => apiRequest("/api/admin/mission-templates", missionTemplateSchema, { method: "POST", body: input }),
  patchMissionTemplate: (id: string, input: z.input<typeof MissionTemplatePatchSchema>) => apiRequest(`/api/admin/mission-templates/${id}`, missionTemplateSchema, { method: "PATCH", body: input }),
  weeklyMissions: () => apiRequest("/api/admin/weekly-missions", z.object({ items: z.array(weeklyMissionSchema) })),
  activateMission: (missionTemplateId: string, weekStartDate: Date) => apiRequest("/api/admin/weekly-missions", weeklyMissionSchema.omit({ missionTemplate: true, _count: true }), { method: "POST", body: { missionTemplateId, weekStartDate } }),
};

export type AdminSection = "overview" | "users" | "content" | "missions" | "configs" | "audit";
