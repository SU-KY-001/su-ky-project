import { Prisma, prisma } from "@repo/db";
import { getSystemConfig } from "../../../core/config/system-config";
import { DomainError } from "../../../core/errors/domain-error";
import { logger } from "../../../core/logger";
import { writeAudit } from "../../../core/audit";
import type { PaymentProviderAdapter } from "../domain/payment-provider";
import type { MembershipRepository } from "../domain/membership.repository";

export class PaymentWebhookService {
  constructor(
    private readonly repo: MembershipRepository,
    private readonly providers: ReadonlyMap<string, PaymentProviderAdapter>,
  ) {}

  async handle(providerName: string, authorization: string | undefined, body: unknown): Promise<void> {
    const provider = this.providers.get(providerName);
    if (!provider) throw new DomainError(404, "PAYMENT_PROVIDER_UNSUPPORTED", "Payment provider is not supported");
    provider.authorize(authorization);
    const event = provider.parse(body);

    let transaction;
    try {
      transaction = await this.repo.insertTransaction({
        provider: event.provider,
        externalId: event.externalId,
        referenceCode: event.referenceCode,
        amount: event.amount,
        accumulated: event.accumulated,
        content: event.content,
        code: event.code,
        gateway: event.gateway,
        accountNumber: event.accountNumber,
        subAccount: event.subAccount,
        transactionAt: event.transactionAt,
        rawPayload: event.rawPayload,
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
      const existing = await this.repo.findTransactionByProviderRef(event.provider, event.externalId);
      if (!existing) throw error;
      transaction = existing;
    }

    if (transaction.status === "matched" || transaction.status === "ignored") return;

    if (event.direction !== "in") {
      await this.repo.markTransaction(transaction.id, "ignored", "OUTBOUND");
      return;
    }

    const order = event.code ? await this.repo.findOrderByTransferContent(event.code) : null;
    if (!order) {
      await this.repo.markTransaction(transaction.id, "unmatched", "NO_MATCHING_ORDER");
      return;
    }

    const maxStackDays = await getSystemConfig("premium.max_stack_days");
    const result = await this.repo.applyTransaction({
      transactionId: transaction.id,
      orderId: order.id,
      actorId: null,
      maxStackDays,
      now: new Date(),
    });
    logger.info(
      { provider: event.provider, externalId: event.externalId, orderId: order.id, status: result.status, reason: result.reason },
      "Payment transaction applied",
    );
    if (result.membershipId) {
      await writeAudit(prisma, {
        actorId: null,
        actorType: "SYSTEM",
        action: "membership.activated",
        resourceType: "membership",
        resourceId: result.membershipId,
        changes: {
          orderId: order.id,
          provider: event.provider,
          externalId: event.externalId,
          transferContent: event.code,
        },
        ipAddress: null,
      });
    }
  }
}
