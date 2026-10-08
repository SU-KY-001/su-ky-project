import { ZodError } from "zod";

/**
 * zValidator hook: rethrow validation failures so the global errorHandler renders
 * them in the standard ApiResponse envelope (400 VALIDATION_ERROR with details)
 * instead of zValidator's default bare JSON body.
 */
export const throwOnInvalid = (result: { success: boolean; error?: unknown }): void => {
  if (!result.success && result.error instanceof ZodError) {
    throw result.error;
  }
};
