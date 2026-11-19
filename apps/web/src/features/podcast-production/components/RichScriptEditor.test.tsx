import { afterEach, expect, it, spyOn } from "bun:test";
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Editor } from "@tiptap/core";
import { SCRIPT_MAX_CHARACTERS } from "@repo/shared";
import { emptyScriptDocument, legacyScriptToDocument } from "../scriptEditor";
import { RichScriptEditor } from "./RichScriptEditor";
import { readFileSync } from "node:fs";

let root: Root | undefined;

it("preserves select-all and dragged selections instead of applying AI rewrite range limits", async () => {
  let editor: Editor | undefined;
  const original = Editor.prototype.setOptions;
  const capture = spyOn(Editor.prototype, "setOptions").mockImplementation(function (this: Editor, options) { editor = this; original.call(this, options); });
  try {
    const container = document.createElement("div"); document.body.append(container); root = createRoot(container);
    const text = Array.from({ length: 10 }, (_, index) => `Đoạn ${index + 1}. Câu tiếp theo của kịch bản.`).join("\n\n");
    await act(async () => root?.render(<RichScriptEditor initialDocument={legacyScriptToDocument(text)} onChange={() => {}} onRewriteRequest={() => {}} />));
    if (!editor) throw new Error("Editor did not initialize");
    const current = editor;
    const viewport = container.querySelector('[data-script-scroll-region]')!;
    await act(async () => current.commands.selectAll());
    const all = { from: current.state.selection.from, to: current.state.selection.to };
    await act(async () => { viewport.dispatchEvent(new KeyboardEvent("keyup", { key: "a", ctrlKey: true, bubbles: true })); await new Promise((resolve) => setTimeout(resolve, 5)); });
    expect({ from: current.state.selection.from, to: current.state.selection.to }).toEqual(all);
    expect(current.state.doc.textBetween(all.from, all.to, "\n\n")).toBe(text);
    expect(container.textContent).not.toContain("Viết lại");
    const coordinates = spyOn(current.view, "coordsAtPos").mockReturnValue({ left: 10, right: 20, top: 100, bottom: 120 });
    try {
      await act(async () => current.commands.setTextSelection({ from: 3, to: 14 }));
      await act(async () => { viewport.dispatchEvent(new MouseEvent("mouseup", { bubbles: true })); await new Promise((resolve) => setTimeout(resolve, 5)); });
      expect(current.state.selection.from).toBe(3);
      expect(current.state.selection.to).toBe(14);
      expect(container.textContent).toContain("Viết lại");
    } finally { coordinates.mockRestore(); }
  } finally { capture.mockRestore(); }
});

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
});

it("allows vertical scroll chaining when the script is short or reaches an edge", async () => {
  const css = readFileSync(new URL("../../../styles/globals.css", import.meta.url), "utf8");
  const viewportRule = css.match(/\.podcast-editor-viewport\s*\{([^}]+)\}/)?.[1] ?? "";
  expect(viewportRule).toContain("overflow-y: auto");
  expect(viewportRule).toContain("overscroll-behavior-y: auto");
  expect(viewportRule).not.toMatch(/overscroll-behavior\s*:\s*(contain|none)/);
  const container = document.createElement("div"); document.body.append(container); root = createRoot(container);
  await act(async () => root?.render(<RichScriptEditor initialDocument={emptyScriptDocument()} onChange={() => undefined} />));
  const viewport = container.querySelector('[data-script-scroll-region]');
  const wheel = new WheelEvent("wheel", { deltaY: 100, bubbles: true, cancelable: true });
  await act(async () => viewport?.dispatchEvent(wheel));
  expect(wheel.defaultPrevented).toBe(false);
});

it("keeps the editor mounted and its text visible after a large formatted paste", async () => {
  const warnings = spyOn(console, "warn");
  const setOptions = spyOn(Editor.prototype, "setOptions");
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  function Harness() {
    const [text, setText] = useState("");
    return (
      <>
        <RichScriptEditor
          initialDocument={emptyScriptDocument()}
          onChange={(document) => {
            setText(document.content?.length.toString() ?? "0");
          }}
        />
        <output data-testid="content-count">{text}</output>
      </>
    );
  }

  await act(async () => root?.render(<Harness />));
  const editable = container.querySelector('[contenteditable="true"]');
  expect(editable).not.toBeNull();
  const optionUpdatesBeforePaste = setOptions.mock.calls.length;

  const clipboardData = new DataTransfer();
  const paragraphs = Array.from({ length: 80 }, (_, index) => `Đoạn ${index + 1}: Nội dung lịch sử.`);
  clipboardData.setData("text/plain", paragraphs.join("\n\n"));
  clipboardData.setData("text/html", paragraphs.map((paragraph) => `<p><strong>${paragraph}</strong></p>`).join(""));
  await act(async () => {
    editable?.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData }));
  });

  expect(container.querySelector('[contenteditable="true"]')).toBe(editable);
  expect(container.querySelector('[aria-label="Nội dung kịch bản podcast"]')).not.toBeNull();
  expect(container.querySelector('[data-testid="content-count"]')?.textContent).not.toBe("");
  expect(editable?.textContent).toContain("Đoạn 80");
  expect(setOptions.mock.calls.length).toBe(optionUpdatesBeforePaste);
  expect(warnings.mock.calls.some((args) => String(args[0]).includes("Duplicate extension names"))).toBe(false);
  warnings.mockRestore();
  setOptions.mockRestore();
});

it("strips clipboard HTML, clamps oversized text, and keeps overflow inside the editor", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  let limitReached = 0;

  await act(async () => {
    root?.render(
      <RichScriptEditor
        initialDocument={emptyScriptDocument()}
        onChange={() => undefined}
        onPasteLimitReached={(limit) => {
          limitReached = limit;
        }}
      />,
    );
  });

  const editable = container.querySelector<HTMLElement>('[contenteditable="true"]');
  const clipboardData = new DataTransfer();
  const oversizedText = `Mở đầu\n${"Nội dung-không-có-khoảng-trắng".repeat(3_000)}`;
  clipboardData.setData("text/plain", oversizedText);
  clipboardData.setData(
    "text/html",
    `<html><body><!--StartFragment--><div class="docs-internal-guid"><script>throw new Error("unsafe")</script>${oversizedText}</div><!--EndFragment--></body></html>`,
  );

  await act(async () => {
    editable?.dispatchEvent(
      new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData,
      }),
    );
  });

  expect(limitReached).toBe(SCRIPT_MAX_CHARACTERS);
  expect(editable?.textContent?.length).toBeLessThanOrEqual(SCRIPT_MAX_CHARACTERS);
  expect(editable?.querySelector("script")).toBeNull();
  expect(editable?.className).toContain("[overflow-wrap:anywhere]");
  expect(
    container.querySelector("[data-script-scroll-region]")?.className,
  ).toContain("podcast-editor-viewport");
  expect(container.querySelector('[aria-label="Nội dung kịch bản podcast"]')).toBe(editable);
});
