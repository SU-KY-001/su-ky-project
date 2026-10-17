import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminUserService, type AdminUserListFilter, type AdminUserRole } from "../services/adminUserService";

export const adminUserKeys = {
  root: ["admin-users"] as const,
  list: (filter: AdminUserListFilter) => ["admin-users", "list", filter] as const,
};

export function useAdminUsers(filter: AdminUserListFilter) {
  return useQuery({
    queryKey: adminUserKeys.list(filter),
    queryFn: () => adminUserService.list(filter),
    placeholderData: keepPreviousData,
  });
}

export function useAdminUserActions() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: adminUserKeys.root });
  return {
    create: useMutation({
      mutationFn: adminUserService.create,
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: async ({ id, name, email, role, previousRole }: { id: string; name: string; email: string; role: AdminUserRole; previousRole: AdminUserRole }) => {
        const user = await adminUserService.update(id, { name, email });
        return role === previousRole ? user : adminUserService.setRole(id, role);
      },
      onSuccess: invalidate,
    }),
    ban: useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => adminUserService.ban(id, reason), onSuccess: invalidate }),
    unban: useMutation({ mutationFn: adminUserService.unban, onSuccess: invalidate }),
    remove: useMutation({ mutationFn: adminUserService.remove, onSuccess: invalidate }),
  };
}
