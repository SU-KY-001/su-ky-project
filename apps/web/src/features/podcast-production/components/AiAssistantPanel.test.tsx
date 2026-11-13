import { afterEach, expect, it, mock } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { hashBlockText, type AiCheck, type AiCheckItem } from "@repo/shared";
import { useState, type RefObject } from "react";
import { AiAssistantPanel, type DockState } from "./AiAssistantPanel";
import type { RichScriptEditorHandle } from "./RichScriptEditor";

function DockHarness({ editorRef }: { editorRef: RefObject<RichScriptEditorHandle | null> }) {
  const [dock, setDock] = useState<DockState>("panel");
  return <AiAssistantPanel editorRef={editorRef} episodeId={EPISODE_ID} ensureEpisode={async () => EPISODE_ID} sources={[]} hasScript dock={dock} onDockChange={setDock} />;
}

let root: Root | undefined;
const originalFetch = globalThis.fetch;
const EPISODE_ID = "00000000-0000-4000-8000-000000000001";
const CHECK_ID = "00000000-0000-4000-8000-000000000002";
const ITEM_ID = "00000000-0000-4000-8000-000000000003";

const check: AiCheck = {
  id: CHECK_ID,
  episodeId: EPISODE_ID,
  kind: "SCRIPT_REVIEW",
  status: "SUCCEEDED",
  processedBlocks: 1,
  totalBlocks: 1,
  failedBlocks: 0,
  toolCalls: 1,
  inputTokens: 1,
  outputTokens: 1,
  errorCode: null,
  itemCounts: { open: 1, reviewed: 0 },
  startedAt: new Date(),
  finishedAt: new Date(),
};

const makeItem = (appliedAt: Date | null = null): AiCheckItem => ({
  id: ITEM_ID,
  checkId: CHECK_ID,
  seq: 0,
  blockRef: "b0",
  blockHash: hashBlockText("Bản gốc"),
  blockPrevHash: "",
  blockDup: 1,
  kind: "FACT_DOUBT",
  severity: "HIGH",
  basis: "CONTRADICTED",
  evidence: [],
  message: "Cần đối chiếu lại.",
  suggestion: "Bản đề xuất",
  status: "OPEN",
  appliedAt,
  createdAt: new Date(),
  updatedAt: new Date(),
});

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  act(() => root?.unmount());
  globalThis.fetch = originalFetch;
  document.body.innerHTML = "";
});

it("retries only PATCH after an apply acknowledgement failure", async () => {
  let patchCalls = 0;
  let currentItem = makeItem();
  globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    if (method === "PATCH") {
      patchCalls += 1;
      if (patchCalls === 1) return response({ code: "HTTP_ERROR", message: "temporary" }, 500);
      currentItem = makeItem(new Date());
      return response(currentItem);
    }
    if (url.endsWith(`/episodes/${EPISODE_ID}/ai-checks`)) return response({ items: [check] });
    if (url.includes(`/ai-checks/${CHECK_ID}`)) return response({ check, items: [currentItem] });
    throw new Error(`Unexpected request: ${method} ${url}`);
  }) as unknown as typeof fetch;

  let blockText = "Bản gốc";
  const replaceBlockText = mock(() => {
    blockText = "Bản đề xuất";
    return "ok" as const;
  });
  const setBlockHighlights = mock(() => undefined);
  const editorRef = {
    current: {
      getBlocks: () => [{ ref: "b0", text: blockText, hash: hashBlockText(blockText), prev: "", dup: 1 }],
      getSelectionBlocks: () => [],
      focusBlock: () => undefined,
      replaceBlockText,
      setBlockHighlights,
      insertCitation: () => undefined,
    },
  } as unknown as RefObject<RichScriptEditorHandle | null>;
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root?.render(<DockHarness editorRef={editorRef} />);
    await Bun.sleep(50);
  });

  const issue = host.querySelector<HTMLButtonElement>('button[aria-label^="Mở cảnh báo"]');
  expect(issue).toBeTruthy();
  await act(async () => issue?.click());
  const apply = () => [...host.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent?.includes("Áp dụng đề xuất"));
  await act(async () => apply()?.click());
  await Bun.sleep(20);
  expect(host.textContent).toContain("chưa ghi nhận được");
  await act(async () => apply()?.click());
  await Bun.sleep(20);

  expect(replaceBlockText).toHaveBeenCalledTimes(1);
  expect(patchCalls).toBe(2);
  expect(host.textContent).toContain("Đã áp dụng vào đoạn này. Bấm Ctrl+Z trong editor để hoàn tác.");
  // The block no longer matches the snapshot hash because we replaced it: that must not read as a conflict.
  expect(host.textContent).not.toContain("Đoạn đã đổi, chạy lại");
  expect(setBlockHighlights).toHaveBeenLastCalledWith([{ ref: "b0", kind: "current" }]);
});
