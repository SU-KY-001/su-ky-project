import { afterEach, expect, it } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ModeratorDashboard } from "./ModeratorDashboard";

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
});

it("shows the signed-in moderator as a name badge", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);

  await act(async () => {
    root?.render(<ModeratorDashboard greetingLabel="Nguyễn Minh Anh" />);
  });

  expect(host.querySelector('[data-card-badge-type="name"]')?.textContent).toBe("Nguyễn Minh Anh");
});
