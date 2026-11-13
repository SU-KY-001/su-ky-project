import { Hono } from "hono";
import { DomainError } from "../../../core/errors/domain-error";
import type { AppEnv } from "../../../types";
import type { PaymentWebhookService } from "../application/payment-webhook.service";

export function createPaymentWebhookRoute(service: PaymentWebhookService) {
  return new Hono<AppEnv>().post("/:provider/webhook", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      throw new DomainError(400, "VALIDATION_ERROR", "Request body is not valid JSON");
    }
    await service.handle(c.req.param("provider"), c.req.header("Authorization"), body);
    return c.json({ success: true });
  });
}
