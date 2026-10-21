import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { moderatorReleaseService } from "../services/moderatorReleaseService";

export const moderatorTicketKeys = {
  root: ["moderator-release-tickets"] as const,
  list: ["moderator-release-tickets", "list"] as const,
  assignments: ["moderator-release-tickets", "assignments"] as const,
};

export function useModeratorTickets() {
  const queryClient = useQueryClient();
  const tickets = useQuery({
    queryKey: moderatorTicketKeys.list,
    queryFn: () => moderatorReleaseService.tickets(),
  });
  const assignments = useQuery({
    queryKey: moderatorTicketKeys.assignments,
    queryFn: moderatorReleaseService.assignments,
  });
  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: moderatorTicketKeys.root }),
      queryClient.invalidateQueries({ queryKey: ["moderator-releases"] }),
    ]);
  };
  const create = useMutation({
    mutationFn: ({ scheduleId, reason }: { scheduleId: string; reason: string }) =>
      moderatorReleaseService.createTicket(scheduleId, reason),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ ticketId, reason }: { ticketId: string; reason: string }) =>
      moderatorReleaseService.updateTicket(ticketId, reason),
    onSuccess: invalidate,
  });
  const cancel = useMutation({
    mutationFn: moderatorReleaseService.cancelTicket,
    onSuccess: invalidate,
  });
  return {
    tickets,
    assignments,
    create,
    update,
    cancel,
    busy: create.isPending || update.isPending || cancel.isPending,
  };
}
