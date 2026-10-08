import { CheckCircle, CloudSlash, WarningCircle } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { moderatorStatusTokens } from "../theme";
import type { ModeratorIntegration } from "../types";
import { ModeratorText } from "./ModeratorText";

const statusIcons = { connected: CheckCircle, unconfigured: CloudSlash, error: WarningCircle } as const;

export function IntegrationStatusCard({ integration }: { integration: ModeratorIntegration }) {
  const status = moderatorStatusTokens[integration.status];
  const StatusIcon = statusIcons[integration.status];

  return (
    <Card className="flex min-h-[100px] min-w-0 flex-1 flex-col gap-[15px] rounded-[17px] border-mod-border bg-mod-surface p-[18px] shadow-[0_8px_22px_rgba(15,23,42,.035)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <ModeratorText className="text-sm font-bold text-mod-text">{integration.name}</ModeratorText>
          <ModeratorText className="text-xs text-mod-text-secondary">{integration.detail}</ModeratorText>
        </div>
        <Badge variant="outline" className="shrink-0 gap-1.5 border-mod-border bg-mod-canvas px-2 py-1 font-medium" style={{ color: status.color }}>
          <StatusIcon size={14} weight="fill" aria-hidden={true} />
          {status.label}
        </Badge>
      </div>
    </Card>
  );
}
