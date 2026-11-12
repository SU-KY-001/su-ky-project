import { env } from "../../../core/env";

const DEV_ACCOUNT_NUMBER = "0909090909";
const DEV_ACCOUNT_NAME = "SU KY";

export interface BankBlock {
  bankName: string;
  accountNumber: string;
  accountName: string;
  qrUrl: string;
  amount: number;
  transferContent: string;
}

export function bankBlock(transferContent: string, amount: number): BankBlock {
  const accountNumber = env.BANK_ACCOUNT_NUMBER ?? DEV_ACCOUNT_NUMBER;
  const accountName = env.BANK_ACCOUNT_NAME ?? DEV_ACCOUNT_NAME;
  const qrUrl = `https://img.vietqr.io/image/${encodeURIComponent(env.BANK_SHORT_CODE)}-${encodeURIComponent(accountNumber)}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(accountName)}`;
  return { bankName: env.BANK_NAME, accountNumber, accountName, qrUrl, amount, transferContent };
}
