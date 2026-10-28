import { afterEach, expect, it, spyOn } from "bun:test";
import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createMemoryRouter, RouterProvider } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { QuizDraftData, QuizWorkspace } from "@repo/shared";
import { QuizEditor } from "./QuizEditor";
import { QuizPreview } from "./QuizPreview";
import { quizService } from "./quizService";

let root: Root | undefined;
let client: QueryClient | undefined;
let restore: (() => void) | undefined;
afterEach(() => {
  act(() => root?.unmount());
  client?.clear();
  restore?.(); restore = undefined;
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

it("applies the chosen time to every question and newly added questions in the saved draft", async () => {
  let savedData: QuizDraftData | undefined;
  const save = spyOn(quizService, "save").mockImplementation(async (_episodeId, _revision, data) => {
    savedData = data;
    return { ...workspace, revision: 2, data };
  });
  restore = () => save.mockRestore();
  client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  client.setQueryData(["quiz", "workspace", "e"], workspace);
  const router = createMemoryRouter([{ path: "/", element: <QueryClientProvider client={client}><QuizEditor initial={workspace} onBack={() => {}} /></QueryClientProvider> }]);
  const host = await render(<RouterProvider router={router} />);
  await act(async () => host.querySelector("#quiz-time")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
  await act(async () => document.querySelector<HTMLElement>('[role="option"][data-value="60"]')!.click());
  await act(async () => button(host, "Thêm câu hỏi").click());
  await act(async () => { button(host, "Lưu nháp").click(); await Bun.sleep(30); });
  expect(savedData?.questions.map(question => question.timeLimit)).toEqual([60, 60, 60]);
  expect(savedData?.questions[0].text).toBe(workspace.data.questions[0].text);
  expect(savedData?.questions[1].text).toBe(workspace.data.questions[1].text);
});

it("keeps inputs editable during a save and preserves edits made while the request is pending", async () => {
  let resolveSave: (workspace: QuizWorkspace) => void = () => {};
  const save = spyOn(quizService, "save").mockImplementationOnce(() => new Promise<QuizWorkspace>(resolve => { resolveSave = resolve; }));
  restore = () => save.mockRestore();
  client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  client.setQueryData(["quiz", "workspace", "e"], workspace);
  const router = createMemoryRouter([{ path: "/", element: <QueryClientProvider client={client}><QuizEditor initial={workspace} onBack={() => {}} /></QueryClientProvider> }]);
  const host = await render(<RouterProvider router={router} />);
  expect(host.querySelector(".quiz-editor-toolbar")?.textContent).not.toContain("Lưu nháp");
  await act(async () => { button(host, "Lưu nháp").click(); await Bun.sleep(20); });
  const question = host.querySelector<HTMLTextAreaElement>("#quiz-question")!;
  expect(question.matches(":disabled")).toBe(false);
  expect(host.querySelector<HTMLInputElement>("#quiz-name")?.disabled).toBe(false);
  expect(button(host, "Đang lưu").disabled).toBe(true);
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(question, "Câu vừa chỉnh trong lúc lưu");
    question.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => { resolveSave({ ...workspace, revision: 2 }); await Bun.sleep(20); });
  expect(question.value).toBe("Câu vừa chỉnh trong lúc lưu");
  expect(host.querySelector(".quiz-save-status")?.textContent).toContain("Chưa lưu thay đổi");
  save.mockResolvedValue({ ...workspace, revision: 3 });
  await act(async () => { button(host, "Lưu nháp").click(); await Bun.sleep(20); });
  expect(save.mock.calls[1]?.[1]).toBe(2);
  expect(save.mock.calls[1]?.[2].questions[0].text).toBe("Câu vừa chỉnh trong lúc lưu");
});

it("keeps edits made while attaching a quiz and shows the attached state clearly", async () => {
  const ready: QuizWorkspace = { ...workspace, data: { ...workspace.data, questions: [workspace.data.questions[0]] } };
  let resolveActivation: (result: QuizWorkspace) => void = () => {};
  const activate = spyOn(quizService, "activate").mockImplementationOnce(() => new Promise<QuizWorkspace>(resolve => { resolveActivation = resolve; }));
  restore = () => activate.mockRestore();
  client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  client.setQueryData(["quiz", "workspace", "e"], ready);
  const router = createMemoryRouter([{ path: "/", element: <QueryClientProvider client={client}><QuizEditor initial={ready} onBack={() => {}} /></QueryClientProvider> }]);
  const host = await render(<RouterProvider router={router} />);
  await act(async () => button(host, "Gắn quiz với tập podcast").click());
  const dialog = document.querySelector('[role="alertdialog"]')!;
  await act(async () => { button(dialog, "Gắn quiz với tập").click(); await Bun.sleep(20); });
  const question = host.querySelector<HTMLTextAreaElement>("#quiz-question")!;
  expect(question.matches(":disabled")).toBe(false);
  expect(host.querySelector<HTMLInputElement>("#quiz-name")?.disabled).toBe(false);
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(question, "Chỉnh sửa sau khi gửi gắn quiz");
    question.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => { resolveActivation({ ...ready, active: true }); await Bun.sleep(20); });
  expect(question.value).toBe("Chỉnh sửa sau khi gửi gắn quiz");
  expect(host.querySelector(".quiz-save-status")?.textContent).toContain("Chưa lưu thay đổi");
  expect(button(host, "Gắn quiz với tập podcast").disabled).toBe(false);
});

it("shows an attached quiz as a success status rather than a disabled button", async () => {
  const active = { ...workspace, active: true };
  client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  client.setQueryData(["quiz", "workspace", "e"], active);
  const router = createMemoryRouter([{ path: "/", element: <QueryClientProvider client={client}><QuizEditor initial={active} onBack={() => {}} /></QueryClientProvider> }]);
  const host = await render(<RouterProvider router={router} />);
  expect(host.querySelector('[data-card-badge-type="status"][data-tone="success"]')?.textContent).toContain("Đã gắn với tập podcast");
  expect([...host.querySelectorAll("button")].some(item => item.textContent?.includes("Đã gắn với tập podcast"))).toBe(false);
});

it("saves independent quiz reference text and restores it when reopened", async () => {
  let persisted: QuizWorkspace = { ...workspace, data: { ...workspace.data, referenceText: "Căn cứ riêng của quiz." } };
  const save = spyOn(quizService, "save").mockImplementation(async (_episodeId, _revision, data) => {
    persisted = { ...persisted, revision: 2, data };
    return persisted;
  });
  restore = () => save.mockRestore();
  client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  client.setQueryData(["quiz", "workspace", "e"], persisted);
  const createRouter = () => createMemoryRouter([{ path: "/", element: <QueryClientProvider client={client!}><QuizEditor initial={persisted} onBack={() => {}} /></QueryClientProvider> }]);
  const host = await render(<RouterProvider router={createRouter()} />);
  let editor = host.querySelector<HTMLTextAreaElement>("#quiz-reference-text")!;
  expect(editor.value).toBe("Căn cứ riêng của quiz.");
  const text = "Nội dung tự soạn.\nNguồn đối chiếu đáp án.";
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(editor, text);
    editor.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => button(host.querySelector('[aria-label="Danh sách câu hỏi"]')!, "Câu tự soạn").click());
  expect(editor.value).toBe(text);
  await act(async () => { button(host, "Lưu nháp").click(); await Bun.sleep(30); });
  expect(persisted.data.referenceText).toBe(text);
  await act(async () => root?.unmount());
  root = undefined;
  const reopened = await render(<RouterProvider router={createRouter()} />);
  editor = reopened.querySelector<HTMLTextAreaElement>("#quiz-reference-text")!;
  expect(editor.value).toBe(text);
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(editor, "");
    editor.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => { button(reopened, "Lưu nháp").click(); await Bun.sleep(30); });
  expect(persisted.data.referenceText).toBe("");
});
it("previews answers locally and resets choices when reopened", async () => {
  const host = await render(<QuizPreview open onOpenChange={() => {}} data={workspace.data} />);
  let dialog = document.querySelector('[role="dialog"]')!;
  await act(async () => button(dialog, "19/8").click());
  expect(dialog.textContent).toContain("Bạn chọn đúng");
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

it("clearly identifies the selected wrong answer and the correct answer in preview", async () => {
  await render(<QuizPreview open onOpenChange={() => {}} data={workspace.data} />);
  const dialog = document.querySelector('[role="dialog"]')!;
  await act(async () => button(dialog, "16/8").click());
  expect(button(dialog, "16/8").textContent).toContain("Bạn chọn sai");
  expect(button(dialog, "19/8").textContent).toContain("Đáp án đúng");
  expect(dialog.textContent).toContain("Chưa chính xác. Đáp án đúng là B.");
  expect(button(dialog, "23/8").textContent).not.toContain("Đáp án đúng");
});

it("enables deletion after adding a second question and protects the last remaining question", async () => {
  const initial = { ...workspace, script: null, data: { ...workspace.data, questions: [workspace.data.questions[1]] } };
  client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  client.setQueryData(["quiz", "workspace", "e"], initial);
  const router = createMemoryRouter([{ path: "/", element: <QueryClientProvider client={client}><QuizEditor initial={initial} onBack={() => {}} /></QueryClientProvider> }]);
  const host = await render(<RouterProvider router={router} />);
  expect(button(host, "Xóa câu").matches(":disabled")).toBe(true);
  await act(async () => button(host, "Thêm câu hỏi").click());
  expect(button(host, "Xóa câu").matches(":disabled")).toBe(false);
  await act(async () => button(host, "Xóa câu").click());
  let dialog = document.querySelector('[role="alertdialog"]');
  expect(dialog).not.toBeNull();
  await act(async () => button(dialog!, "Quay lại").click());
  expect(host.querySelectorAll(".quiz-question-link").length).toBe(2);
  expect(button(host, "Xóa câu").matches(":disabled")).toBe(false);
  await act(async () => button(host, "Xóa câu").click());
  dialog = document.querySelector('[role="alertdialog"]');
  await act(async () => button(dialog!, "Xóa câu").click());
  expect(host.querySelectorAll(".quiz-question-link").length).toBe(1);
  expect(button(host, "Xóa câu").matches(":disabled")).toBe(true);
});

it("uses the shared leave confirmation without triggering the browser reload warning", async () => {
  const initial = { ...workspace, script: null, data: { ...workspace.data, questions: [workspace.data.questions[1]] } };
  let leaveCount = 0;
  client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  client.setQueryData(["quiz", "workspace", "e"], initial);
  const router = createMemoryRouter([{ path: "/", element: <QueryClientProvider client={client}><QuizEditor initial={initial} onBack={() => { leaveCount++; }} /></QueryClientProvider> }]);
  const host = await render(<RouterProvider router={router} />);
  await act(async () => button(host, "Thêm câu hỏi").click());
  const reload = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(reload);
  expect(reload.defaultPrevented).toBe(false);
  const back = host.querySelector<HTMLButtonElement>('[aria-label="Quay lại danh sách quiz"]')!;
  await act(async () => back.click());
  let dialog = document.querySelector('[role="alertdialog"]');
  expect(dialog?.textContent).toContain("Các thay đổi chưa lưu sẽ mất");
  expect(leaveCount).toBe(0);
  await act(async () => button(dialog!, "Quay lại").click());
  expect(leaveCount).toBe(0);
  expect(host.querySelectorAll(".quiz-question-link").length).toBe(2);
  await act(async () => back.click());
  dialog = document.querySelector('[role="alertdialog"]');
  await act(async () => button(dialog!, "Rời màn hình").click());
  expect(leaveCount).toBe(1);
});
