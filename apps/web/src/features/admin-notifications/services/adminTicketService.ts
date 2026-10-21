import {
  ReleaseReassignmentTicketPageSchema,
  ReleaseReassignmentTicketSchema,
  type ReleaseReassignmentTicketStatus,
} from "@repo/shared";
import { z } from "zod";
import { ApiError } from "@/lib/apiError";
import { client } from "@/lib/client";

async function parse<S extends z.ZodTypeAny>(
  request: Promise<Pick<Response, "ok" | "json" | "status" | "headers">>,
  schema: S,
): Promise<z.infer<S>> {
  const response = await request;
  if (!response.ok) throw await ApiError.fromResponse(response);
  return schema.parse(await response.json());
}

const tickets = client.api.admin.releases["reassignment-tickets"];

export const adminTicketService = {
  list: (status?: ReleaseReassignmentTicketStatus) =>
    parse(
      tickets.$get({ query: { status, page: "1", limit: "50" } }),
      ReleaseReassignmentTicketPageSchema,
    ),
  approve: (ticketId: string, replacementModeratorId: string) =>
    parse(
      tickets[":id"].approve.$post({
        param: { id: ticketId },
        json: { replacementModeratorId },
      }),
      ReleaseReassignmentTicketSchema,
    ),
  reject: (ticketId: string, reason: string) =>
    parse(
      tickets[":id"].reject.$post({
        param: { id: ticketId },
        json: { reason },
      }),
      ReleaseReassignmentTicketSchema,
    ),
};
