/** Agent output was invalid after the self-correction retries: a content error, not a transient one. */
export class AgentValidationError extends Error {
  readonly errors: string;
  constructor(message: string, errors: string) {
    super(message);
    this.name = "AgentValidationError";
    this.errors = errors;
  }
}
