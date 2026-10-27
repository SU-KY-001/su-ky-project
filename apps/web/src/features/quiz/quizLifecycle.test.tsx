import { afterEach, expect, it, spyOn } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createMemoryRouter, RouterProvider } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { QuizWorkspace } from "@repo/shared";
import { QuizAuthoring } from "./QuizAuthoring";
import { useQuizMutations } from "./useQuiz";
import { quizService } from "./quizService";
import { useNotificationStore } from "@/shared/lib/notifications";
let root: Root | undefined;
let client: QueryClient;
let restore: (() => void) | undefined;
afterEach(() => { act(() => root?.unmount()); client?.clear(); restore?.(); restore = undefined; useNotificationStore.setState({ notifications: [] }); document.body.innerHTML = ""; });
const workspace: QuizWorkspace = {
  episodeId: "e", episodeTitle: "Tập 1", seriesId: "s", seriesTitle: "Series", revision: 1, updatedAt: new Date(),
  data: { title: "Quiz đã lưu", description: "", passScorePercent: 80, questions: [{ id: "q", text: "Câu đang soạn", options: ["", "", "", ""], correctIndex: null, explanation: "", evidence: null, timeLimit: 20 }] },
  active: false, attemptCount: 0, script: null, scriptChanged: false,
};
it("keeps the existing editor mounted on background fetch failure", async () => {
  client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  client.setQueryData(["quiz", "list"], { items: [{ episodeId: "e", episodeTitle: "Tập 1", seriesTitle: "Series", title: "Quiz đã lưu", questions: 1, updatedAt: new Date(), active: false, method: "manual" }] });
  client.setQueryData(["quiz", "workspace", "e"], workspace);
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  const router = createMemoryRouter([{ path: "/", element: <QueryClientProvider client={client}><QuizAuthoring /></QueryClientProvider> }]);
  await act(async () => root?.render(<RouterProvider router={router} />));
  expect([...host.querySelectorAll('thead th')].map(cell => cell.textContent)).toEqual(["Tên bộ quiz", "Số câu", "Cập nhật", "Thao tác"]);
  await act(async () => host.querySelector<HTMLButtonElement>('[data-slot="dashboard-row-actions"] button')!.click());
  const editor = host.querySelector('.quiz-editor'); expect(editor).not.toBeNull();
  await act(async () => { client.getQueryCache().find({ queryKey: ["quiz", "workspace", "e"] })!.setState({ status: "error", error: new Error("Mạng bị ngắt") }); await Bun.sleep(20); });
  expect(host.querySelector('.quiz-editor') === editor).toBe(true);
  expect(host.querySelector<HTMLTextAreaElement>('#quiz-question')?.value).toBe("Câu đang soạn");
});
it("updates workspace cache from a successful draft save", async () => {
  client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  client.setQueryData(["quiz", "workspace", "e"], workspace);
  const next = { ...workspace, revision: 2, data: { ...workspace.data, title: "Tên mới" } };
  const spy = spyOn(quizService, "save").mockResolvedValue(next); restore = () => spy.mockRestore();
  function Probe() { const { save } = useQuizMutations(); return <button onClick={() => save.mutate(["e", 1, next.data])}>Lưu</button>; }
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => root?.render(<QueryClientProvider client={client}><Probe /></QueryClientProvider>));
  await act(async () => { host.querySelector('button')!.click(); await Bun.sleep(20); });
  expect(client.getQueryData<QuizWorkspace>(["quiz", "workspace", "e"])).toEqual(next);
});
