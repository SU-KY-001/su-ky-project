import { afterEach, expect, it, spyOn } from "bun:test";
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Editor } from "@tiptap/core";
import { emptyScriptDocument } from "../scriptEditor";
import { RichScriptEditor } from "./RichScriptEditor";

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
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
