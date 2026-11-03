import type { ReactNode } from "react";
import type { Icon } from "@phosphor-icons/react";
import { AccountProfile } from "@/features/auth";
import {
  WorkspaceShell,
  type WorkspaceNavItem,
} from "@/shared/components/dashboard/WorkspaceShell";

export type ShellNavItem = WorkspaceNavItem & { icon?: Icon };

type ModeratorShellProps = {
  nav: ShellNavItem[];
  breadcrumb?: string;
  subtitle?: string;
  children: ReactNode;
  compact?: boolean;
};

export function ModeratorShell({ nav, children, compact }: ModeratorShellProps) {
  return (
    <WorkspaceShell
      navigationLabel="Điều hướng moderator"
      mobileNavigationTitle="Menu điều hướng moderator"
      brandCaption="KHÔNG GIAN BIÊN TẬP"
      nav={nav}
      profile={<AccountProfile variant="moderator" />}
      compact={compact}
    >
      {children}
    </WorkspaceShell>
  );
}
