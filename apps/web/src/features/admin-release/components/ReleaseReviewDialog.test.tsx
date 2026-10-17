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

async function renderReview(options: { stale?: boolean; fail?: boolean } = {}) {
  const { schedule, episode } = releaseReviewFixture();
  if (options.stale) schedule.episode!.contentRevision = 4;
  const onClose = mock(() => undefined);
  const review = mock(async () => {
    if (options.fail) throw new Error("Phiên bản đã được người khác xử lý");
    return { ...schedule.reviews[0]!, status: "APPROVED" as const };
  });
  const service = { ...adminReleaseService, get: async () => schedule, content: async () => episode, review };
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => {
    root?.render(<QueryClientProvider client={queryClient!}><ReleaseReviewDialog schedule={schedule} onClose={onClose} service={service} /></QueryClientProvider>);
    await new Promise((resolve) => setTimeout(resolve, 30));
  });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 30)); });
  return { schedule, review, onClose };
}

const button = (text: string) => [...document.body.querySelectorAll<HTMLButtonElement>("button")].find((item) => item.textContent?.trim() === text);

it("loads script, playable audio and documents before submitting the exact revision", async () => {
  const { schedule, review, onClose } = await renderReview();
  expect(document.body.textContent).toContain("Nội dung kịch bản cần kiểm duyệt.");
  expect(document.body.querySelector("script")).toBeNull();
  expect(document.body.querySelector("audio")?.getAttribute("src")).toBe("https://example.org/recording.mp3");
  expect(document.body.querySelector('a[href="https://example.org/document.pdf"]')?.textContent).toContain("Tài liệu chiến dịch.pdf");
  await act(async () => button("Duyệt nội dung")?.click());
  expect(review).toHaveBeenCalledWith(schedule.id, { decision: "APPROVE", contentRevision: 3, reviewNote: null });
  expect(onClose).toHaveBeenCalled();
  expect(useNotificationStore.getState().notifications.at(-1)?.status).toBe("success");
});

it("requires a reason in a toast before requesting changes", async () => {
  const { review } = await renderReview();
  await act(async () => button("Yêu cầu chỉnh sửa")?.click());
  expect(review).not.toHaveBeenCalled();
  expect(useNotificationStore.getState().notifications.at(-1)?.title).toBe("Cần nhập nhận xét chỉnh sửa");
  const note = document.body.querySelector<HTMLTextAreaElement>("#admin-review-note")!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")!.set!.call(note, "Bổ sung nguồn tư liệu cho đoạn kết.");
    note.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => button("Yêu cầu chỉnh sửa")?.click());
  expect(review).toHaveBeenCalledWith(expect.any(String), { decision: "REQUEST_CHANGES", contentRevision: 3, reviewNote: "Bổ sung nguồn tư liệu cho đoạn kết." });
});

it("does not offer approval of a stale submitted revision", async () => {
  const { review } = await renderReview({ stale: true });
  expect(button("Duyệt nội dung")).toBeUndefined();
  expect(document.body.textContent).toContain("nội dung đã thay đổi");
  expect(review).not.toHaveBeenCalled();
});

it("keeps detail open and reports a failed decision through toast", async () => {
  const { onClose } = await renderReview({ fail: true });
  await act(async () => button("Duyệt nội dung")?.click());
  expect(onClose).not.toHaveBeenCalled();
  expect(useNotificationStore.getState().notifications.at(-1)?.description).toBe("Phiên bản đã được người khác xử lý");
  expect(document.body.querySelector('[role="alert"]')).toBeNull();
});
