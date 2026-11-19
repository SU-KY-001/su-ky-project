import { act } from "react";

export async function openDashboardActions(recordLabel: string, scope: ParentNode = document): Promise<void> {
  const trigger = [...scope.querySelectorAll<HTMLButtonElement>('[data-slot="dashboard-row-actions"] button')]
    .find((button) => button.getAttribute("aria-label") === `Mở thao tác cho ${recordLabel}`);
  if (!trigger) throw new Error(`Không tìm thấy menu thao tác: ${recordLabel}`);
  await act(async () => {
    trigger.focus();
    trigger.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown" }));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

export async function selectDashboardAction(recordLabel: string, actionLabel: string, scope: ParentNode = document): Promise<void> {
  const direct = [...scope.querySelectorAll<HTMLButtonElement>('[data-slot="dashboard-row-actions"] button')]
    .find((button) => button.getAttribute("aria-label") === `${actionLabel} ${recordLabel}`);
  if (direct) {
    await act(async () => direct.click());
    return;
  }
  await openDashboardActions(recordLabel, scope);
  const action = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((item) => item.textContent?.trim() === actionLabel);
  if (!action) throw new Error(`Không tìm thấy thao tác: ${actionLabel}`);
  await act(async () => action.click());
}
