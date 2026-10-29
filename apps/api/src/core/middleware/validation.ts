import { RequestValidationError } from "../errors/request-validation-error";

type Issues = ConstructorParameters<typeof RequestValidationError>[0];

export const throwOnInvalid = (result: { success: boolean; error?: { issues: NonNullable<Issues> } }): void => {
  if (!result.success) throw new RequestValidationError(result.error?.issues);
};
