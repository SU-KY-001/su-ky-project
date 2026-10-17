import { ModeratorDashboard } from "@/features/moderator/components/ModeratorDashboard";
import { useCurrentUser } from "@/shared/hooks/useCurrentUser";
import type { ModeratorQuickAction } from "@/features/moderator/types";

export function ModeratorDashboardPage({ onAction }: { onAction?: (id: ModeratorQuickAction["id"]) => void }) {
  const { data: user } = useCurrentUser();
  return <ModeratorDashboard greetingLabel={user?.name ?? "Moderator"} onAction={onAction} />;
}
