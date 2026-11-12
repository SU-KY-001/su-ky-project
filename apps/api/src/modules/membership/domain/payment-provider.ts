export type PaymentDirection = "in" | "out";

/** Provider-neutral bank transfer, produced by an adapter from that provider's webhook payload. */
export interface PaymentEvent {
  provider: string;
  externalId: string;
  referenceCode: string | null;
  amount: number;
  accumulated: bigint | null;
  content: string;
  code: string | null;
  gateway: string | null;
  accountNumber: string | null;
  subAccount: string | null;
  transactionAt: Date;
  direction: PaymentDirection;
  rawPayload: unknown;
}

export interface PaymentProviderAdapter {
  readonly name: string;
  /** Throws DomainError when the request is not authentic. */
  authorize(authorization: string | undefined): void;
  /** Throws DomainError when the payload is not valid for this provider. */
  parse(body: unknown): PaymentEvent;
}
