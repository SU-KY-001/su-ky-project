import { ModeratorDashboard } from "@/features/moderator/components/ModeratorDashboard";
import { useCurrentUser } from "@/shared/hooks/useCurrentUser";

export function ModeratorDashboardPage() {
  const { data: user } = useCurrentUser();
  return <ModeratorDashboard greetingLabel={user?.name ?? "Moderator"} />;
}
