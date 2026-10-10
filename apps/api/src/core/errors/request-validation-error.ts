export class RequestValidationError extends Error {
  constructor() {
    super("Request validation failed");
    this.name = "RequestValidationError";
  }
}
