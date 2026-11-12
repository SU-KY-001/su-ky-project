import { createHash, timingSafeEqual } from "node:crypto";
import { SepayWebhookSchema } from "@repo/shared";
import { DomainError } from "../../../../core/errors/domain-error";
import { env } from "../../../../core/env";
import type { PaymentEvent, PaymentProviderAdapter } from "../../domain/payment-provider";

const CODE_PATTERN = /\bSK[A-Z0-9]{8}\b/;

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function sameSecret(actual: string | undefined, expected: string): boolean {
  if (!actual) return false;
  return timingSafeEqual(digest(actual), digest(expected));
}

function parseTransactionDate(value: string): Date {
  const iso = value.includes("T") ? value : value.replace(" ", "T");
  // SePay normally sends no zone; keep an explicit zone instead of appending a second one.
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(iso);
  const date = new Date(hasZone ? iso : `${iso}+07:00`);
  if (Number.isNaN(date.getTime())) throw new DomainError(400, "VALIDATION_ERROR", "transactionDate is invalid");
  return date;
}

function extractCode(explicitCode: string | null | undefined, content: string): string | null {
  const explicit = explicitCode?.trim().toUpperCase() ?? "";
  if (CODE_PATTERN.test(explicit)) return explicit;
  return content.toUpperCase().match(CODE_PATTERN)?.[0] ?? null;
}

export class SepayPaymentProvider implements PaymentProviderAdapter {
  readonly name = "sepay";

  authorize(authorization: string | undefined): void {
    const key = env.SEPAY_WEBHOOK_API_KEY;
    if (!key) throw new DomainError(503, "PAYMENT_PROVIDER_NOT_CONFIGURED", "sepay webhook is not configured");
    if (!sameSecret(authorization, `Apikey ${key}`))
      throw new DomainError(401, "PAYMENT_UNAUTHORIZED", "Invalid webhook credentials");
  }

  parse(body: unknown): PaymentEvent {
    const parsed = SepayWebhookSchema.safeParse(body);
    if (!parsed.success) throw new DomainError(400, "VALIDATION_ERROR", "Webhook payload is invalid");
    const payload = parsed.data;
    return {
      provider: this.name,
      externalId: payload.id,
      referenceCode: payload.referenceCode ?? null,
      amount: payload.transferAmount,
      accumulated: payload.accumulated === undefined ? null : BigInt(payload.accumulated),
      content: payload.content,
      code: extractCode(payload.code, payload.content),
      gateway: payload.gateway ?? null,
      accountNumber: payload.accountNumber ?? null,
      subAccount: payload.subAccount ?? null,
      transactionAt: parseTransactionDate(payload.transactionDate),
      direction: payload.transferType,
      rawPayload: payload,
    };
  }
}
