import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReleaseReassignmentTicketStatus } from "@repo/shared";
import { adminReleaseKeys } from "@/features/admin-release/hooks/useAdminReleases";
import { adminReleaseService } from "@/features/admin-release/services/adminReleaseService";
import { adminTicketService } from "../services/adminTicketService";

export const adminTicketKeys = {
  root: ["admin-release-tickets"] as const,
  list: (status: ReleaseReassignmentTicketStatus | "") => ["admin-release-tickets", "list", status] as const,
};

export function useAdminTickets(status: ReleaseReassignmentTicketStatus | "") {
  const queryClient = useQueryClient();
  const tickets = useQuery({
    queryKey: adminTicketKeys.list(status),
    queryFn: () => adminTicketService.list(status || undefined),
  });
  const moderators = useQuery({
    queryKey: adminReleaseKeys.moderators,
    queryFn: adminReleaseService.moderators,
  });
  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminTicketKeys.root }),
      queryClient.invalidateQueries({ queryKey: adminReleaseKeys.root }),
      queryClient.invalidateQueries({ queryKey: ["moderator-release-tickets"] }),
      queryClient.invalidateQueries({ queryKey: ["moderator-release-assignments"] }),
    ]);
  };
  const approve = useMutation({
    mutationFn: ({ ticketId, replacementModeratorId }: { ticketId: string; replacementModeratorId: string }) =>
      adminTicketService.approve(ticketId, replacementModeratorId),
    onSuccess: invalidate,
  });
  const reject = useMutation({
    mutationFn: ({ ticketId, reason }: { ticketId: string; reason: string }) =>
      adminTicketService.reject(ticketId, reason),
    onSuccess: invalidate,
  });
  return {
    tickets,
    moderators,
    approve,
    reject,
    busy: approve.isPending || reject.isPending,
  };
}
