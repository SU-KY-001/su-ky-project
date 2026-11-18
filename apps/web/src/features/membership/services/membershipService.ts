import { z } from "zod";
import {
  MembershipEntitlementSchema,
  MembershipOrderSchema,
  MembershipPlanSchema,
  paginatedSchema,
} from "@repo/shared";
import { ApiError } from "@/lib/apiError";
import { client } from "@/lib/client";
import { newIdempotencyKey } from "@/lib/idempotency";

async function read<S extends z.ZodTypeAny>(
  request: Promise<Pick<Response, "ok" | "json" | "status" | "headers">>,
  schema: S,
): Promise<z.infer<S>> {
  const response = await request;
  if (!response.ok) throw await ApiError.fromResponse(response);
  return schema.parse(await response.json());
}

const options = (signal?: AbortSignal) => ({
  init: { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000) },
});
const idempotent = () => ({ ...options(), headers: { "Idempotency-Key": newIdempotencyKey() } });

export type MembershipPlan = z.infer<typeof MembershipPlanSchema>;
export type MembershipEntitlement = z.infer<typeof MembershipEntitlementSchema>;
export type MembershipOrder = z.infer<typeof MembershipOrderSchema>;

export const membershipService = {
  plans: (signal?: AbortSignal) =>
    read(client.api.membership.plans.$get({}, options(signal)), z.array(MembershipPlanSchema)),
  entitlement: (signal?: AbortSignal) =>
    read(client.api.me.membership.$get({}, options(signal)), MembershipEntitlementSchema),
  orders: (page: number, signal?: AbortSignal) =>
    read(
      client.api.me.membership.orders.$get({ query: { page: String(page), limit: "10" } }, options(signal)),
      paginatedSchema(MembershipOrderSchema),
    ),
  order: (id: string, signal?: AbortSignal) =>
    read(client.api.me.membership.orders[":id"].$get({ param: { id } }, options(signal)), MembershipOrderSchema),
  createOrder: (planCode: string) =>
    read(client.api.me.membership.orders.$post({ json: { planCode } }, idempotent()), MembershipOrderSchema),
  startQuiz: (quizId: string) =>
    read(
      client.api.quizzes[":quizId"].start.$post({ param: { quizId } }, idempotent()),
      z.object({ started: z.literal(true) }),
    ),
  enterExhibition: (slug: string) =>
    read(
      client.api.exhibitions[":slug"].enter.$post({ param: { slug } }, idempotent()),
      z.object({ entered: z.literal(true) }),
    ),
};
