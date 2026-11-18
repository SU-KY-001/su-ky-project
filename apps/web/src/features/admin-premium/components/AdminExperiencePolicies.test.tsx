import { afterEach, expect, it, spyOn } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ExperiencePolicy } from "@repo/shared";
import { adminPolicyService } from "../services/adminPolicyService";
import { AdminExperiencePolicies } from "./AdminExperiencePolicies";

let root: Root | undefined;
let client: QueryClient | undefined;
let restore: (() => void) | undefined;

afterEach(() => {
  act(() => root?.unmount());
  client?.clear();
  restore?.();
  document.body.innerHTML = "";
});

const policies: ExperiencePolicy[] = [
  { feature: "podcast", mode: "free_limited", dailyQuota: 7 },
  { feature: "quiz", mode: "free_unlimited", dailyQuota: null },
  { feature: "exhibition", mode: "premium_only", dailyQuota: null },
];
const labels = ["Giới hạn lượt Free", "Miễn phí không giới hạn", "Chỉ Premium"];

for (const [index, policy] of policies.entries()) {
  it(`opens ${policy.mode} with the saved selection and quota`, async () => {
    const list = spyOn(adminPolicyService, "list").mockResolvedValue(policies);
    restore = () => list.mockRestore();
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    await act(async () => {
      root?.render(<QueryClientProvider client={client!}><AdminExperiencePolicies /></QueryClientProvider>);
    });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 30)); });
    const button = host.querySelectorAll<HTMLButtonElement>("tbody button")[index];
    expect(button?.textContent).toBe("Chỉnh sửa");
    await act(async () => button?.click());
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog?.querySelector('[role="combobox"]')?.textContent).toBe(labels[index]);
    const quota = dialog?.querySelector<HTMLInputElement>('input[type="number"]');
    if (policy.mode === "free_limited") expect(quota?.value).toBe("7");
    else expect(quota).toBeNull();
  });
}
