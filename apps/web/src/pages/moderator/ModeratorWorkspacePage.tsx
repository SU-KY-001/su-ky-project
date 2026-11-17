import { lazy, type ReactElement } from "react";
import { Navigate, useLocation, useMatch, useSearchParams } from "react-router";
import { ModeratorLayout } from "@/features/moderator/components/ModeratorLayout";
import { ModeratorContentBoundary } from "@/features/moderator/components/ModeratorContentBoundary";
import { moderatorSectionFromPath, moderatorSectionPath } from "@/features/moderator/paths";
import type { ModeratorSection } from "@/features/moderator/types";

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

interface WorkspaceContentProps {
  section: ModeratorSection;
  creatingMilestone: boolean;
}

function WorkspaceContent({ section, creatingMilestone }: WorkspaceContentProps): ReactElement {
  switch (section) {
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
  const { pathname, search } = useLocation();
  const [searchParams] = useSearchParams();
  const editingExhibition = useMatch("/moderator/exhibitions/:id/edit");
  const section = moderatorSectionFromPath(pathname);
  if (pathname.replace(/\/$/, "") === "/moderator") return <Navigate to={`${moderatorSectionPath.timeline}${search}`} replace />;
  return (
    <ModeratorLayout section={section} compact={Boolean(editingExhibition)}>
      <ModeratorContentBoundary section={section}>
        <div key={section} className="mod-content-view">
          <WorkspaceContent
            section={section}
            creatingMilestone={searchParams.get("create") === "milestone"}
          />
        </div>
      </ModeratorContentBoundary>
    </ModeratorLayout>
  );
}
