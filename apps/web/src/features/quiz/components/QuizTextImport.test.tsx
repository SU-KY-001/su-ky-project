import { afterEach, expect, it } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { parseQuizDocument } from "@repo/shared";
import { QuizImportPreview } from "./QuizImportPreview";
let root: Root | undefined;
afterEach(() => { act(() => root?.unmount()); root=undefined; document.body.innerHTML=""; });
it("renders source excerpts as text and preserves unknown regions", async () => {
  const result = parseQuizDocument({fileName:"q.txt",format:"txt",blocks:[{text:"<img src=x onerror=alert(1)>",page:null,line:1}]},20);
  const host=document.createElement("div"); document.body.append(host); root=createRoot(host);
  await act(async()=>root?.render(<QuizImportPreview result={result}/>));
  expect(host.textContent).toContain("Nội dung chưa nhận diện");
  expect(host.textContent).toContain("<img src=x onerror=alert(1)>");
  expect(host.querySelector("img") === null).toBe(true);
});
it("reports only real page locations without inventing line numbers",async()=>{
  const result=parseQuizDocument({fileName:"q.pdf",format:"pdf",blocks:[{text:"Câu 1: Hỏi?\nA. Một\nB. Hai",page:4,line:null}]},20);
  const host=document.createElement("div"); document.body.append(host); root=createRoot(host);
  await act(async()=>root?.render(<QuizImportPreview result={result}/>));
  expect(host.textContent).toContain("trang 4");
  expect(host.textContent).not.toContain("dòng");
});
it("highlights a specific error summary before the questions and links to the affected question", async () => {
  const result = parseQuizDocument({ fileName: "errors.txt", format: "txt", blocks: [{ text: "Câu 1: Hỏi một?\nĐáp án: Có\nCâu 2: Hỏi hai?\nA. Một\nB. Hai", page: null, line: 1 }] }, 20);
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => root?.render(<QuizImportPreview result={result} />));
  const summary = host.querySelector('[role="alert"]');
  expect(Boolean(summary)).toBe(true);
  expect(summary?.textContent).toContain("1 lỗi cần sửa");
  expect(summary?.textContent).toContain("Câu 2");
  expect(summary?.textContent).toContain("Chưa có đáp án đúng");
  expect(summary?.textContent).toContain("Cách sửa");
  const target = host.querySelector<HTMLElement>('li[aria-label="Câu 2"]')!;
  Object.defineProperty(target, "scrollIntoView", { configurable: true, value: (): void => {} });
  await act(async () => summary?.querySelector<HTMLAnchorElement>("a")?.click());
  expect(document.activeElement === target).toBe(true);
});
it("does not show a blocking error summary for a successful import", async () => {
  const result = parseQuizDocument({ fileName: "ok.txt", format: "txt", blocks: [{ text: "Câu 1: Hỏi?\nĐáp án: Có", page: null, line: 1 }] }, 20);
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => root?.render(<QuizImportPreview result={result} />));
  expect(host.querySelector('[role="alert"]') === null).toBe(true);
});
