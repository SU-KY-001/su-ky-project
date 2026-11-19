import { afterEach, expect, it } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { CardBadge, cardBadgeToneForStatus } from "./CardBadge";

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
});

it("identifies a name tag as a card badge", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);

  await act(async () => {
    root?.render(<CardBadge type="name">Nguyễn Minh Anh</CardBadge>);
  });

  const badge = host.querySelector('[data-slot="card-badge"]');
  expect(badge?.textContent).toBe("Nguyễn Minh Anh");
  expect(badge?.getAttribute("data-card-badge-type")).toBe("name");
  expect(badge?.getAttribute("data-tone")).toBe("neutral");
});

it("exposes the selected semantic tone for a status", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);

  await act(async () => {
    root?.render(
      <CardBadge type="status" tone="danger">
        Phát hành thất bại
      </CardBadge>,
    );
  });

  const badge = host.querySelector('[data-slot="card-badge"]');
  expect(badge?.textContent).toBe("Phát hành thất bại");
  expect(badge?.getAttribute("data-card-badge-type")).toBe("status");
  expect(badge?.getAttribute("data-tone")).toBe("danger");
});

it("maps workflow statuses to consistent semantic tones", () => {
  expect(cardBadgeToneForStatus("READY_TO_PUBLISH")).toBe("success");
  expect(cardBadgeToneForStatus("IN_REVIEW")).toBe("info");
  expect(cardBadgeToneForStatus("BLOCKED")).toBe("warning");
  expect(cardBadgeToneForStatus("FAILED")).toBe("danger");
  expect(cardBadgeToneForStatus("CANCELLED")).toBe("neutral");
  expect(cardBadgeToneForStatus("UNRECOGNIZED")).toBe("neutral");
});
