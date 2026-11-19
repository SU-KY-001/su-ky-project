import { afterEach, expect, it } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { DialogueSchema, type Dialogue } from "@repo/shared";
import { structuredDialogue } from "../structuredScript";
import { DialogueRichEditor } from "./DialogueRichEditor";
let root: Root | undefined;
afterEach(() => { act(() => root?.unmount()); document.body.innerHTML = ""; });

it("deletes a turn directly while retaining speakers and other dialogue", async () => {
  const initial = structuredDialogue("MC: Xin chào\nKhách mời: Cảm ơn\nMC: Bắt đầu nhé");
  let result = initial;
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => root?.render(<DialogueRichEditor dialogue={initial} onChange={(value) => { result = value; }} />));
  expect(host.querySelector('[aria-label="Thao tác lượt 1"]')).toBeNull();
  await act(async () => host.querySelector<HTMLButtonElement>('button[aria-label="Xóa lượt 2"]')?.click());
  expect(result.turns.map((turn) => turn.text)).toEqual(["Xin chào", "Bắt đầu nhé"]);
  expect(result.speakers).toEqual(initial.speakers);
  expect(host.querySelectorAll('[data-dialogue-turn]')).toHaveLength(2);
});

it("renders typed turns in one rich editor, preserves roles and formatted documents through edits", async () => {
  const initial = structuredDialogue("MC: Xin chào\nKhách mời: Cảm ơn\nMC: Bắt đầu nhé");
  initial.turns[0]!.style = "Bình tĩnh"; initial.turns[0]!.note = "Mở đầu";
  let result: Dialogue = initial;
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => root?.render(<DialogueRichEditor dialogue={initial} onChange={(value) => { result = value; }} />));
  expect(host.querySelectorAll('[contenteditable="true"]')).toHaveLength(1);
  expect(host.querySelectorAll('[data-dialogue-turn]')).toHaveLength(3);
  expect(host.querySelector('[role="toolbar"][aria-label="Công cụ hội thoại"]')).not.toBeNull();
  expect(host.textContent).not.toContain("Hướng dẫn nhập thoại");
  expect(host.querySelectorAll('[role="combobox"]')).toHaveLength(3);
  expect(host.querySelector('.dialogue-turn-number')?.textContent).toBe("01");
  expect(host.querySelector('[data-dialogue-turn]')?.getAttribute('data-speaker-label')).toBe("MC");
  await act(async () => host.querySelector<HTMLButtonElement>('button[aria-label="Đậm"]')?.click());
  await act(async () => Array.from(host.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent === "Thêm thoại")?.click());
  expect(result.turns[0]?.speaker).toBe(initial.turns[0]?.speaker);
  expect(result.turns[0]?.style).toBe("Bình tĩnh");
  expect(result.turns[0]?.note).toBe("Mở đầu");
  expect(result.turns[0]?.document).toBeDefined();
  expect(result.turns[0]?.text).toBe("Xin chào");
  expect(result.turns).toHaveLength(4);
  expect(DialogueSchema.safeParse({ ...result, turns: result.turns.slice(0, 3) }).success).toBe(true);
});

it("assigns a role directly from a row and preserves its text and metadata", async () => {
  const initial = structuredDialogue("MC: Xin chào\nKhách mời: Cảm ơn");
  initial.turns[0]!.note = "Ghi chú đang có";
  let result = initial;
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => root?.render(<DialogueRichEditor dialogue={initial} onChange={(value) => { result = value; }} />));
  await act(async () => host.querySelector('[role="combobox"][aria-label="Người nói lượt 1"]')?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })));
  await act(async () => Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find((item) => item.textContent === "Khách mời")?.click());
  expect(result.turns[0]?.speaker).toBe(initial.speakers[1]?.key);
  expect(result.turns[0]?.text).toBe("Xin chào");
  expect(result.turns[0]?.note).toBe("Ghi chú đang có");
});
