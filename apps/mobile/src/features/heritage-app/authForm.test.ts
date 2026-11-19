import { describe, expect, test } from "bun:test";
import { AxiosError } from "axios";
import { authErrorMessage, validateAuthForm } from "./authForm";

describe("auth form", () => {
  const valid = { isRegister: true, name: "Nguyễn An", email: "an@example.com", password: "password123", confirmPassword: "password123" };

  test("requires matching confirmation only when registering", () => {
    expect(validateAuthForm({ ...valid, confirmPassword: "different" })).toBe("Mật khẩu xác nhận không khớp.");
    expect(validateAuthForm({ ...valid, isRegister: false, confirmPassword: "" })).toBeNull();
  });

  test("checks registration details before submission", () => {
    expect(validateAuthForm({ ...valid, name: "A" })).toBe("Tên phải có từ 2 đến 100 ký tự.");
    expect(validateAuthForm({ ...valid, email: "invalid" })).toBe("Vui lòng nhập email hợp lệ.");
    expect(validateAuthForm({ ...valid, password: "short" })).toBe("Mật khẩu phải có từ 8 đến 128 ký tự.");
    expect(validateAuthForm(valid)).toBeNull();
  });

  test("explains duplicate accounts without exposing technical messages", () => {
    const error = new AxiosError("Request failed with status code 422", "ERR_BAD_REQUEST", undefined, undefined, { data: { code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" }, status: 422, statusText: "", headers: {}, config: { headers: {} as never } });
    expect(authErrorMessage(error, true)).toBe("Email này đã được đăng ký. Hãy đăng nhập hoặc sử dụng email khác.");
    expect(authErrorMessage(new Error("internal detail"), true)).toBe("Không thể tạo tài khoản lúc này. Vui lòng thử lại sau.");
  });
});
