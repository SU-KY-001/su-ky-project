import { afterEach, expect, it } from "bun:test";
import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createMemoryRouter, RouterProvider } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { QuizWorkspace } from "@repo/shared";
import { QuizEditor } from "./QuizEditor";
import { QuizPreview } from "./QuizPreview";

let root: Root | undefined;
let client: QueryClient | undefined;
afterEach(() => {
  act(() => root?.unmount());
  client?.clear();
  document.body.innerHTML = "";
});

const workspace: QuizWorkspace = {
  episodeId: "e", episodeTitle: "Những ngày mùa thu", seriesId: "s", seriesTitle: "Cách mạng tháng Tám",
  revision: 1, updatedAt: new Date(), active: false, attemptCount: 0, scriptChanged: false,
  script: { hash: "current", updatedAt: new Date(), characters: 200 },
  data: { title: "Quiz lịch sử", description: "", passScorePercent: 80, questions: [
    { id: "q1", text: "Khởi nghĩa Hà Nội thắng lợi vào ngày nào?", options: ["16/8", "19/8", "23/8", "25/8"], correctIndex: 1, explanation: "Ngày 19/8, Hà Nội giành chính quyền.", timeLimit: 20, evidence: { quote: "Ngày 19/8, cuộc khởi nghĩa tại Hà Nội thắng lợi.", scriptHash: "current" } },
    { id: "q2", text: "Câu tự soạn", options: ["A", "B", "C", "D"], correctIndex: null, explanation: "", timeLimit: 20, evidence: null },
  ] },
};

async function render(element: ReactElement): Promise<HTMLDivElement> {
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => root?.render(element));
  return host;
}

function button(container: ParentNode, text: string): HTMLButtonElement {
  const found = [...container.querySelectorAll("button")].find(item => item.textContent?.includes(text));
  if (!found) throw new Error(`Missing button: ${text}`);
  return found;
}

it("switches between question evidence and the full script without changing the draft", async () => {
  client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  client.setQueryData(["quiz", "workspace", "e"], workspace);
  client.setQueryData(["quiz", "script", "e", "current"], "Toàn bộ kịch bản gốc của tập podcast.");
  const router = createMemoryRouter([{ path: "/", element: <QueryClientProvider client={client}><QuizEditor initial={workspace} mode="manual" onBack={() => {}} /></QueryClientProvider> }]);
  const host = await render(<RouterProvider router={router} />);
  const reference = host.querySelector('[aria-label="Kịch bản tham chiếu"]');
  expect(reference).not.toBeNull();
  expect(reference?.textContent).toContain(workspace.data.questions[0].evidence!.quote);
  await act(async () => button(reference!, "Toàn bộ").click());
  expect(reference?.textContent).toContain("Toàn bộ kịch bản gốc của tập podcast.");
  expect(host.querySelector<HTMLTextAreaElement>("#quiz-question")?.value).toBe(workspace.data.questions[0].text);
  await act(async () => button(reference!, "Đoạn liên quan").click());
  expect(reference?.textContent).toContain(workspace.data.questions[0].evidence!.quote);
  await act(async () => button(host.querySelector('[aria-label="Danh sách câu hỏi"]')!, "Câu tự soạn").click());
  expect(reference?.textContent).toContain("Toàn bộ kịch bản gốc của tập podcast.");
  await act(async () => host.querySelector<HTMLInputElement>('input[aria-label="Chọn C là đáp án đúng"]')!.click());
  expect(host.querySelector<HTMLInputElement>('input[aria-label="Chọn C là đáp án đúng"]')?.checked).toBe(true);
  await act(async () => button(host.querySelector('[aria-label="Danh sách câu hỏi"]')!, "Khởi nghĩa Hà Nội").click());
  expect(host.querySelector<HTMLInputElement>('input[aria-label="Chọn B là đáp án đúng"]')?.checked).toBe(true);
  expect(host.querySelector<HTMLTextAreaElement>("#quiz-explanation")?.value).toBe(workspace.data.questions[0].explanation);
});

it("keeps manual authoring available when an episode has no script", async () => {
  const initial = { ...workspace, script: null, data: { ...workspace.data, questions: [workspace.data.questions[1]] } };
  client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  client.setQueryData(["quiz", "workspace", "e"], initial);
  const router = createMemoryRouter([{ path: "/", element: <QueryClientProvider client={client}><QuizEditor initial={initial} mode="manual" onBack={() => {}} /></QueryClientProvider> }]);
  const host = await render(<RouterProvider router={router} />);
  expect(host.querySelector('[aria-label="Kịch bản tham chiếu"]')?.textContent).toContain("Chưa có kịch bản");
  expect(host.querySelector<HTMLTextAreaElement>("#quiz-question")?.disabled).toBe(false);
  expect(button(host, "Tạo bộ câu hỏi").disabled).toBe(true);
  expect(button(host, "Lưu nháp").disabled).toBe(false);
});

it("previews answers locally and resets choices when reopened", async () => {
  const host = await render(<QuizPreview open onOpenChange={() => {}} data={workspace.data} />);
  let dialog = document.querySelector('[role="dialog"]')!;
  await act(async () => button(dialog, "19/8").click());
  expect(dialog.textContent).toContain("Đáp án đúng");
  expect(dialog.textContent).toContain(workspace.data.questions[0].explanation);
  await act(async () => button(dialog, "Câu tiếp").click());
  expect(dialog.textContent).toContain("Câu tự soạn");
  await act(async () => button(dialog, "Câu trước").click());
  expect(button(dialog, "19/8").disabled).toBe(true);
  await act(async () => root?.render(<QuizPreview open={false} onOpenChange={() => {}} data={workspace.data} />));
  await act(async () => root?.render(<QuizPreview open onOpenChange={() => {}} data={workspace.data} />));
  dialog = document.querySelector('[role="dialog"]')!;
  expect(button(dialog, "19/8").disabled).toBe(false);
  expect(host.textContent).toBe("");
});
