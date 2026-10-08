import { RequestValidationError } from "../errors/request-validation-error";

export const throwOnInvalid = (result: { success: boolean }): void => {
  if (!result.success) throw new RequestValidationError();
};
