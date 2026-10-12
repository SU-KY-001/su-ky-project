import { afterEach, expect, it } from "bun:test";
import { act, lazy } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ModeratorSection } from "../types";
import { ModeratorContentBoundary } from "./ModeratorContentBoundary";

let root: Root | undefined;
afterEach(() => { act(() => { root?.unmount(); }); root = undefined; document.body.innerHTML = ""; });

for (const section of ["overview", "timeline", "podcast", "events", "sources", "pending", "schedule"] satisfies ModeratorSection[]) {
  it(section === "overview" ? "does not stack a skeleton beneath the initial overview loader" : `uses a table skeleton while switching to ${section}`, async () => {
    let resolveContent: (() => void) | undefined;
    const Content = lazy(() => new Promise<{ default: () => React.JSX.Element }>((resolve) => {
      resolveContent = () => resolve({ default: () => <h1>Nội dung đã tải</h1> });
    }));
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => { root?.render(<><aside>Menu moderator</aside><ModeratorContentBoundary section={section}><Content /></ModeratorContentBoundary></>); });
    if (section === "overview") expect(Boolean(document.querySelector('[data-skeleton-layout]'))).toBe(false);
    else expect(document.querySelector('[aria-busy="true"]')?.getAttribute("data-skeleton-layout")).toBe("table");
    expect(Boolean(document.querySelector(".animate-spin"))).toBe(false);
    const sidebar = document.querySelector("aside");
    await act(async () => { resolveContent?.(); });
    expect(document.querySelector("h1")?.textContent).toBe("Nội dung đã tải");
    expect(Boolean(document.querySelector('[aria-busy="true"]'))).toBe(false);
    expect(document.querySelector("aside") === sidebar).toBe(true);
  });
}
