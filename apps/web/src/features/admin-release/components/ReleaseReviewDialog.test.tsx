import { afterEach, beforeEach, expect, it, mock } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { releaseReviewFixture } from "@/test/releaseReviewFixtures";
import { useNotificationStore } from "@/shared/lib/notifications";
import { adminReleaseService } from "../services/adminReleaseService";
import { ReleaseReviewDialog } from "./ReleaseReviewDialog";

let root: Root | undefined;
let queryClient: QueryClient | undefined;
beforeEach(() => useNotificationStore.setState({ notifications: [] }));
afterEach(() => {
  act(() => root?.unmount());
  queryClient?.clear();
  document.body.innerHTML = "";
  useNotificationStore.setState({ notifications: [] });
});

async function renderReview(options: { stale?: boolean; fail?: boolean; notReady?: boolean } = {}) {
  const { schedule, episode } = releaseReviewFixture();
  if (options.stale) schedule.episode!.contentRevision = 4;
  const onClose = mock(() => undefined);
  const review = mock(async () => {
    if (options.fail) throw new Error("Phiên bản đã được người khác xử lý");
    return { ...schedule.reviews[0]!, status: "APPROVED" as const };
  });
  const readiness = {
    ready: !options.notReady,
    contentRevision: options.stale ? 4 : 3,
    computedAt: new Date(),
    items: [
      { key: "BASIC_INFO" as const, level: "REQUIRED" as const, state: "OK" as const },
      { key: "THIRD_PERSON_AUDIO" as const, level: "REQUIRED" as const, state: options.notReady ? ("MISSING" as const) : ("OK" as const) },
    ],
  };
  const service = { ...adminReleaseService, get: async () => schedule, reviewContent: async () => ({ episode, readiness, aiSummary: null }), review };
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => {
    root?.render(<QueryClientProvider client={queryClient!}><ReleaseReviewDialog schedule={schedule} onClose={onClose} service={service} /></QueryClientProvider>);
  });
  const deadline = Date.now() + 1000;
  while (!document.body.querySelector("[data-testid='script-body']") && Date.now() < deadline) {
    await act(async () => { await Bun.sleep(0); });
  }
  return { schedule, review, onClose };
}

const button = (text: string) => [...document.body.querySelectorAll<HTMLButtonElement>("button")].find((item) => item.textContent?.trim() === text);

const ASSESSMENT_TEXT = {
  editorialNote: "Đã đối chiếu kịch bản với nguồn chính sử.",
  rightsNote: "Ảnh và tư liệu thuộc phạm vi công cộng.",
  audioNote: "Đã nghe toàn bộ bản thu, khớp kịch bản.",
};

async function setField(selector: string, value: string) {
  const element = document.body.querySelector<HTMLTextAreaElement | HTMLInputElement>(selector)!;
  const prototype = element instanceof window.HTMLInputElement ? window.HTMLInputElement.prototype : window.HTMLTextAreaElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function fillAssessment() {
  await setField("#admin-review-note-editorialNote", ASSESSMENT_TEXT.editorialNote);
  await setField("#admin-review-note-rightsNote", ASSESSMENT_TEXT.rightsNote);
  await setField("#admin-review-note-audioNote", ASSESSMENT_TEXT.audioNote);
}

it("loads script, playable audio and documents before submitting the exact revision", async () => {
  const { schedule, review, onClose } = await renderReview();
  expect(document.body.textContent).toContain("Nội dung kịch bản cần kiểm duyệt.");
  expect(document.body.querySelector("script")).toBeNull();
  expect(document.body.querySelector("audio")?.getAttribute("src")).toBe("https://example.org/recording.mp3");
  expect(document.body.querySelector('a[href="https://example.org/document.pdf"]')?.textContent).toContain("Tài liệu chiến dịch.pdf");
  await fillAssessment();
  await act(async () => {
    button("Duyệt nội dung")?.click();
    await new Promise((resolve) => setTimeout(resolve, 30));
  });
  expect(review).toHaveBeenCalledWith(schedule.id, {
    decision: "APPROVE",
    contentRevision: 3,
    reviewNote: null,
    assessment: { ...ASSESSMENT_TEXT, credits: null, rightsExpiresAt: null, aiDisclosure: null, warningAcceptance: null },
  });
  expect(onClose).toHaveBeenCalled();
  expect(useNotificationStore.getState().notifications.at(-1)?.status).toBe("success");
});

it("keeps approval locked and lists what is missing until every required note has 10 characters", async () => {
  const { review } = await renderReview();
  expect(button("Duyệt nội dung")?.disabled).toBe(true);
  expect(document.body.textContent).toContain("Kết luận nội dung và nguồn");
  await setField("#admin-review-note-editorialNote", "quá ngắn");
  expect(button("Duyệt nội dung")?.disabled).toBe(true);
  expect(document.body.querySelector('input[type="checkbox"]')).toBeNull();
  await fillAssessment();
  expect(button("Duyệt nội dung")?.disabled).toBe(false);
  await setField("#admin-review-note-rightsExpiresAt", "2000-01-01");
  expect(button("Duyệt nội dung")?.disabled).toBe(true);
  expect(document.body.textContent).toContain("Quyền đã hết hạn");
  expect(review).not.toHaveBeenCalled();
});

it("locks 'Yêu cầu chỉnh sửa' until a note is written", async () => {
  const { review } = await renderReview();
  expect(button("Yêu cầu chỉnh sửa")?.disabled).toBe(true);
  const note = document.body.querySelector<HTMLTextAreaElement>("#admin-review-note")!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")!.set!.call(note, "Bổ sung nguồn tư liệu cho đoạn kết.");
    note.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => button("Yêu cầu chỉnh sửa")?.click());
  expect(review).toHaveBeenCalledWith(expect.any(String), { decision: "REQUEST_CHANGES", contentRevision: 3, reviewNote: "Bổ sung nguồn tư liệu cho đoạn kết." });
});

it("locks approval and names the first missing required item when the episode is not ready", async () => {
  const { review } = await renderReview({ notReady: true });
  expect(button("Duyệt nội dung")?.disabled).toBe(true);
  expect(document.body.textContent).toContain("Chưa thể Duyệt: Chưa có âm thanh ngôi thứ ba sẵn sàng");
  expect(review).not.toHaveBeenCalled();
});

it("does not offer approval of a stale submitted revision", async () => {
  const { review } = await renderReview({ stale: true });
  expect(button("Duyệt nội dung")).toBeUndefined();
  expect(document.body.textContent).toContain("nội dung đã thay đổi");
  expect(review).not.toHaveBeenCalled();
});

it("keeps detail open, reports a failed decision through toast and keeps the typed assessment", async () => {
  const { onClose } = await renderReview({ fail: true });
  await fillAssessment();
  await act(async () => button("Duyệt nội dung")?.click());
  expect(onClose).not.toHaveBeenCalled();
  expect(useNotificationStore.getState().notifications.at(-1)?.description).toBe("Phiên bản đã được người khác xử lý");
  expect(document.body.querySelector('[role="alert"]')).toBeNull();
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 30)); });
  expect(document.body.querySelector<HTMLTextAreaElement>("#admin-review-note-editorialNote")?.value).toBe(ASSESSMENT_TEXT.editorialNote);
});

it("collapses the script by default and expands it on demand", async () => {
  await renderReview();
  expect(document.body.querySelector('[data-testid="script-body"]')?.className).toContain("max-h-[150px]");
  await act(async () => button("Xem hết 1 đoạn")?.click());
  expect(document.body.querySelector('[data-testid="script-body"]')?.className).toContain("max-h-[360px]");
  expect(button("Thu gọn")).toBeDefined();
  expect(document.body.textContent).toContain("Có thể Duyệt.");
});

it("lets an Admin open the explicit exception form without entering the moderator workspace", async () => {
  await renderReview();
  await act(async () => button("Xuất bản ngoại lệ…")?.click());
  expect(document.body.querySelector("#exception-reason")).not.toBeNull();
  expect(button("Xuất bản ngoại lệ")?.disabled).toBe(true);
});
