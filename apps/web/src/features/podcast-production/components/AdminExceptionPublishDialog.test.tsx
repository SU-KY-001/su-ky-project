import { afterEach, expect, it, mock } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { releaseReviewFixture } from "@/test/releaseReviewFixtures";
import { AdminExceptionPublishDialog } from "./AdminExceptionPublishDialog";

let root: Root | undefined;
afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
});

async function setField(selector: string, value: string) {
  const element = document.body.querySelector<HTMLTextAreaElement>(selector)!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")!.set!.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

const submit = () => [...document.body.querySelectorAll<HTMLButtonElement>("button")].find((item) => item.textContent?.includes("Xuất bản ngoại lệ"))!;

async function renderDialog(error = "") {
  const { episode } = releaseReviewFixture();
  const onConfirm = mock(() => undefined);
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root?.render(<AdminExceptionPublishDialog episode={episode} pending={false} error={error} onConfirm={onConfirm} onClose={() => undefined} />));
  return { onConfirm };
}

it("warns that independent review is bypassed and stays locked without a 20-character reason", async () => {
  const { onConfirm } = await renderDialog();
  expect(document.body.textContent).toContain("không qua người duyệt thứ hai");
  expect(submit().disabled).toBe(true);
  await setField("#exception-reason", "quá ngắn");
  await setField("#exception-editorialNote", "Đã đối chiếu nguồn chính sử.");
  await setField("#exception-rightsNote", "Tư liệu thuộc phạm vi công cộng.");
  await setField("#exception-audioNote", "Đã nghe toàn bộ bản thu.");
  expect(submit().disabled).toBe(true);
  expect(onConfirm).not.toHaveBeenCalled();
});

it("submits the trimmed reason with the full assessment and shows a server rejection", async () => {
  const { onConfirm } = await renderDialog("Dữ liệu đã thay đổi, hãy tải lại");
  await setField("#exception-reason", "  Sự kiện kỷ niệm đúng ngày, không có người duyệt khác.  ");
  await setField("#exception-editorialNote", "Đã đối chiếu nguồn chính sử.");
  await setField("#exception-rightsNote", "Tư liệu thuộc phạm vi công cộng.");
  await setField("#exception-audioNote", "Đã nghe toàn bộ bản thu.");
  expect(document.body.textContent).toContain("Dữ liệu đã thay đổi, hãy tải lại");
  await act(async () => submit().click());
  expect(onConfirm).toHaveBeenCalledWith({
    exceptionReason: "Sự kiện kỷ niệm đúng ngày, không có người duyệt khác.",
    assessment: {
      editorialNote: "Đã đối chiếu nguồn chính sử.",
      rightsNote: "Tư liệu thuộc phạm vi công cộng.",
      audioNote: "Đã nghe toàn bộ bản thu.",
      credits: null,
      rightsExpiresAt: null,
      aiDisclosure: null,
      warningAcceptance: null,
    },
  });
});
