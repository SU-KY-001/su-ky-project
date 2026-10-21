import type { ReactNode } from "react";
import { DashboardTableCard } from "@/shared/components/dashboard/DashboardTableCard";

export function ModeratorSectionPanel({ eyebrow, title, summary, toolbar, children, footer }: { eyebrow?: string; title: string; summary?: ReactNode; toolbar: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <DashboardTableCard
      eyebrow={eyebrow}
      title={title}
      summary={summary}
      toolbar={toolbar}
      footer={footer}
    >
      {children}
    </DashboardTableCard>
  );
}
