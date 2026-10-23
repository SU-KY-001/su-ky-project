import { lazy, useState, type ReactElement } from "react";
import { ModeratorLayout } from "@/features/moderator/components/ModeratorLayout";
import { ModeratorContentBoundary } from "@/features/moderator/components/ModeratorContentBoundary";
import type { ModeratorQuickAction, ModeratorSection } from "@/features/moderator/types";

import { ModeratorDashboardPage } from "./ModeratorDashboardPage";
import { ModeratorAssignments } from "@/features/moderator/components/ModeratorAssignments";
import { ModeratorReleaseSchedule } from "@/features/moderator/components/ModeratorReleaseSchedule";
import { ModeratorReviewQueue } from "@/features/moderator/components/ModeratorReviewQueue";
import { ModeratorTickets } from "@/features/moderator/components/ModeratorTickets";

const Timeline = lazy(() => import("./ModeratorTimelinePage").then((module) => ({ default: module.ModeratorTimelinePage })));
const Podcast = lazy(() => import("./PodcastProductionPage").then((module) => ({ default: module.PodcastProductionPage })));
const Library = lazy(() => import("./ModeratorLibraryFeaturePage").then((module) => ({ default: module.ModeratorLibraryFeaturePage })));
const Quizzes = lazy(() => import("@/features/moderator/components/ModeratorQuizzes").then((module) => ({ default: module.ModeratorQuizzes })));

interface WorkspaceContentProps {
  section: ModeratorSection;
  creation: ModeratorQuickAction["id"] | null;
  onAction: (id: ModeratorQuickAction["id"]) => void;
}

function WorkspaceContent({ section, creation, onAction }: WorkspaceContentProps): ReactElement {
  switch (section) {
    case "overview": return <ModeratorDashboardPage onAction={onAction} />;
    case "timeline": return <Timeline initialCreating={creation === "add-milestone"} />;
    case "podcast": return <Podcast initialKind={creation === "create-series" ? "series" : creation === "create-episode" ? "episode" : undefined} />;
    case "assignments": return <ModeratorAssignments />;
    case "tickets": return <ModeratorTickets />;
    case "quizzes": return <Quizzes />;
    case "schedule": return <ModeratorReleaseSchedule />;
    case "pending": return <ModeratorReviewQueue />;
    default: return <Library key={section} section={section} />;
  }
}

export function ModeratorWorkspacePage(): ReactElement {
  const [section, setSection] = useState<ModeratorSection>("overview");
  const [creation, setCreation] = useState<ModeratorQuickAction["id"] | null>(null);
  const selectSection = (next: ModeratorSection) => { setCreation(null); setSection(next); };
  const onAction = (id: ModeratorQuickAction["id"]) => { setCreation(id); setSection(id === "add-milestone" ? "timeline" : "podcast"); };
  return (
    <ModeratorLayout section={section} onSelect={selectSection}>
      <ModeratorContentBoundary section={section}>
        <div key={section} className="mod-content-view"><WorkspaceContent section={section} creation={creation} onAction={onAction} /></div>
      </ModeratorContentBoundary>
    </ModeratorLayout>
  );
}
