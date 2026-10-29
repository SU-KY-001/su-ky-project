import { MAX_ERROR_DETAILS, type ErrorResponse } from "@repo/shared";

interface ValidationIssue {
  path: readonly PropertyKey[];
  code: string;
}

export class RequestValidationError extends Error {
  readonly details: NonNullable<ErrorResponse["details"]>;

  constructor(issues: readonly ValidationIssue[] = []) {
    super("Request validation failed");
    this.name = "RequestValidationError";
    // zod's own message can echo the received value (enum: "received 'x'"), so only its machine code is sent.
    this.details = issues.slice(0, MAX_ERROR_DETAILS).map((issue) => ({ path: issue.path.map(String).join("."), code: issue.code }));
  }
}
