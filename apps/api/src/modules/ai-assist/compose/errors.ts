/** The model answered with valid JSON but nothing usable; mapped to 502 AI_BAD_OUTPUT (or AI_NO_VARIANTS). */
export class ComposeBadOutputError extends Error {
  constructor(
    message: string,
    readonly reason: "SECTION_COUNT" | "EMPTY_TEXT" | "NO_VARIANTS",
  ) {
    super(message);
    this.name = "ComposeBadOutputError";
  }
}
