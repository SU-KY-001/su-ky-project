import { afterEach, expect, it } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { usePodcastCreationWizard } from "../hooks/usePodcastCreationWizard";
import { initialPodcastWizardState } from "../podcastWizardState";
import { structuredDialogue } from "../structuredScript";
import { DialogueVoiceConfiguration } from "./DialogueVoiceConfiguration";
import { DialogueRecordingSheet } from "./DialogueRecordingSheet";

let root: Root | undefined; let client: QueryClient | undefined;
afterEach(() => { act(() => root?.unmount()); client?.clear(); document.body.innerHTML = ""; });
it("shows a compact reading preview and highlights roles without dropping other turns", async () => {
  const dialogue = structuredDialogue("MC: Xin chào\nKhách mời: Cảm ơn\nMC: Bắt đầu nhé");
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => root?.render(<DialogueRecordingSheet dialogue={dialogue} />));
  expect(host.textContent).toContain("3 lượt thoại · 2 người nói");
  expect(host.textContent).not.toContain("In / lưu PDF");
  expect(host.textContent).not.toContain("Thu ngoài hệ thống");
  expect(host.querySelectorAll("li")).toHaveLength(3);
  await act(async () => host.querySelector('[role="combobox"]')?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })));
  await act(async () => Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find((option) => option.textContent === "MC")?.click());
  expect(host.querySelectorAll('[data-dimmed="true"]')).toHaveLength(1);
  expect(host.querySelectorAll("li")).toHaveLength(3);
});
it("changes each role's stored voice at the voice step and reports duplicates", async () => {
  function Harness() {
    const wizard = usePodcastCreationWizard(() => ({ ...initialPodcastWizardState(), dialogue: structuredDialogue("MC: Xin chào\nKhách mời: Cảm ơn") }));
    return <><DialogueVoiceConfiguration wizard={wizard} disabled={false} /><output>{wizard.state.dialogue?.speakers.map((speaker) => speaker.voice).join(",")}</output></>;
  }
  client = new QueryClient(); const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => root?.render(<QueryClientProvider client={client!}><Harness /></QueryClientProvider>));
  const original = host.querySelector("output")?.textContent?.split(",");
  const firstLabel = host.querySelectorAll('[role="combobox"]')[0]?.textContent;
  await act(async () => host.querySelectorAll('[role="combobox"]')[1]?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })));
  const groups = Array.from(document.querySelectorAll('[role="group"]'));
  expect(groups).toHaveLength(2);
  expect(groups[0]?.textContent).toContain("Giọng nữ");
  expect(groups[1]?.textContent).toContain("Giọng nam");
  expect(groups[0]?.textContent).toContain("Aoede");
  expect(groups[0]?.textContent).not.toContain("Charon");
  expect(groups[1]?.textContent).toContain("Charon");
  await act(async () => Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find((option) => option.textContent === firstLabel)?.click());
  expect(host.querySelector("output")?.textContent).toBe(`${original?.[0]},${original?.[0]}`);
  expect(host.querySelector('[role="alert"]')?.textContent).toContain("giọng khác nhau");
});
