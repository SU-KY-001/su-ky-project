import { mediaService } from "../media";
import { AdminMembershipService } from "./application/admin-membership.service";
import { MembershipService } from "./application/membership.service";
import { PaymentWebhookService } from "./application/payment-webhook.service";
import { SepayPaymentProvider } from "./infrastructure/providers/sepay.provider";
import { PrismaMembershipRepository } from "./infrastructure/prisma-membership.repository";
import { createAdminMembershipRoute } from "./presentation/admin-membership.routes";
import { createMeMembershipRoute, createPublicMembershipRoute } from "./presentation/membership.routes";
import { createPaymentWebhookRoute } from "./presentation/payment-webhook.routes";

export const membershipRepository = new PrismaMembershipRepository();
export const membershipService = new MembershipService(membershipRepository, mediaService);
const sepayProvider = new SepayPaymentProvider();
export const paymentWebhookService = new PaymentWebhookService(
  membershipRepository,
  new Map([[sepayProvider.name, sepayProvider]]),
);
export const adminMembershipService = new AdminMembershipService(membershipRepository);

export const publicMembershipRoute = createPublicMembershipRoute(membershipService);
export const meMembershipRoute = createMeMembershipRoute(membershipService);
export const paymentWebhookRoute = createPaymentWebhookRoute(paymentWebhookService);
export const adminMembershipRoute = createAdminMembershipRoute(adminMembershipService);
