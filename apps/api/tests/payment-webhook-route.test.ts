import { expect, test } from "bun:test";
import { Hono } from "hono";
import type { PaymentWebhookService } from "../src/modules/membership/application/payment-webhook.service";
import { createPaymentWebhookRoute } from "../src/modules/membership/presentation/payment-webhook.routes";

test("webhook route forwards provider, header and JSON body, then acks SePay", async () => {
  const calls: unknown[][] = [];
  const service = {
    handle: async (...args: unknown[]) => {
      calls.push(args);
    },
  } as unknown as PaymentWebhookService;
  const app = new Hono().route("/api/payments", createPaymentWebhookRoute(service));

  const response = await app.request("/api/payments/sepay/webhook", {
    method: "POST",
    headers: { Authorization: "Apikey secret", "Content-Type": "application/json" },
    body: JSON.stringify({ id: 1 }),
  });

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ success: true });
  expect(calls).toEqual([["sepay", "Apikey secret", { id: 1 }]]);
});
