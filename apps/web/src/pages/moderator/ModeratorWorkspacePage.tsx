import { lazy, type ReactElement } from "react";
import { useLocation, useMatch, useNavigate, useSearchParams } from "react-router";
import { ModeratorLayout } from "@/features/moderator/components/ModeratorLayout";
import { ModeratorContentBoundary } from "@/features/moderator/components/ModeratorContentBoundary";
import { moderatorPodcastPath, moderatorSectionFromPath, moderatorSectionPath } from "@/features/moderator/paths";
import type { ModeratorQuickAction, ModeratorSection } from "@/features/moderator/types";

import { ModeratorDashboardPage } from "./ModeratorDashboardPage";

const Timeline = lazy(() => import("./ModeratorTimelinePage").then((module) => ({ default: module.ModeratorTimelinePage })));
const Podcast = lazy(() => import("./PodcastProductionPage").then((module) => ({ default: module.PodcastProductionPage })));
const Library = lazy(() => import("./ModeratorLibraryFeaturePage").then((module) => ({ default: module.ModeratorLibraryFeaturePage })));
const Assignments = lazy(() => import("@/features/moderator/components/ModeratorAssignments").then((module) => ({ default: module.ModeratorAssignments })));
const ReleaseSchedule = lazy(() => import("@/features/moderator/components/ModeratorReleaseSchedule").then((module) => ({ default: module.ModeratorReleaseSchedule })));
const ReviewQueue = lazy(() => import("@/features/moderator/components/ModeratorReviewQueue").then((module) => ({ default: module.ModeratorReviewQueue })));
const Tickets = lazy(() => import("@/features/moderator/components/ModeratorTickets").then((module) => ({ default: module.ModeratorTickets })));
const Angles = lazy(() => import("@/features/podcast-production/angles/AngleManagePage").then((module) => ({ default: module.AngleManagePage })));
const Quizzes = lazy(() => import("@/features/moderator/components/ModeratorQuizzes").then((module) => ({ default: module.ModeratorQuizzes })));
const Exhibitions = lazy(() => import("./ModeratorExhibitionPage").then((module) => ({ default: module.ModeratorExhibitionPage })));

const CREATE_MILESTONE_QUERY = "?create=milestone";

const quickActionTarget: Record<ModeratorQuickAction["id"], string> = {
  "add-milestone": `${moderatorSectionPath.timeline}${CREATE_MILESTONE_QUERY}`,
  "create-series": moderatorPodcastPath.newSeries,
  "create-episode": moderatorPodcastPath.newEpisode,
  "add-reference": moderatorSectionPath.sources,
};

interface WorkspaceContentProps {
  section: ModeratorSection;
  creatingMilestone: boolean;
  onAction: (id: ModeratorQuickAction["id"]) => void;
}

function WorkspaceContent({ section, creatingMilestone, onAction }: WorkspaceContentProps): ReactElement {
  switch (section) {
    case "overview": return <ModeratorDashboardPage onAction={onAction} />;
    case "timeline": return <Timeline initialCreating={creatingMilestone} />;
    case "podcast": return <Podcast />;
    case "assignments": return <Assignments />;
    case "tickets": return <Tickets />;
    case "quizzes": return <Quizzes />;
    case "exhibitions": return <Exhibitions />;
    case "schedule": return <ReleaseSchedule />;
    case "pending": return <ReviewQueue />;
    case "angles": return <Angles />;
    default: return <Library key={section} section={section} />;
  }
}

// The router's child routes only declare which URLs are valid (unknown ones fall through to 404);
// this layout picks the screen from the pathname, so it renders no <Outlet />.
export function ModeratorWorkspacePage(): ReactElement {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const editingExhibition = useMatch("/moderator/exhibitions/:id/edit");
  const section = moderatorSectionFromPath(pathname);
  return (
    <ModeratorLayout section={section} compact={Boolean(editingExhibition)}>
      <ModeratorContentBoundary section={section}>
        <div key={section} className="mod-content-view">
          <WorkspaceContent
            section={section}
            creatingMilestone={searchParams.get("create") === "milestone"}
            onAction={(id) => navigate(quickActionTarget[id])}
          />
        </div>
      </ModeratorContentBoundary>
    </ModeratorLayout>
  );
}
