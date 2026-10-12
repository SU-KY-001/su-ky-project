import { lazy, useState, type ReactElement } from "react";
import { ModeratorLayout } from "@/features/moderator/components/ModeratorLayout";
import { ModeratorContentBoundary } from "@/features/moderator/components/ModeratorContentBoundary";
import type { ModeratorSection } from "@/features/moderator/types";
import { WorkspaceDataProvider } from "@/features/moderator/WorkspaceData";
import { ModeratorDashboardPage } from "./ModeratorDashboardPage";

const Timeline = lazy(() => import("./ModeratorTimelinePage").then((module) => ({ default: module.ModeratorTimelinePage })));
const Podcast = lazy(() => import("./PodcastProductionPage").then((module) => ({ default: module.PodcastProductionPage })));
const Library = lazy(() => import("./ModeratorLibraryFeaturePage").then((module) => ({ default: module.ModeratorLibraryFeaturePage })));

interface WorkspaceContentProps {
  section: ModeratorSection;
}

function WorkspaceContent({ section }: WorkspaceContentProps): ReactElement {
  switch (section) {
    case "overview": return <ModeratorDashboardPage />;
    case "timeline": return <Timeline />;
    case "podcast": return <Podcast />;
    default: return <Library key={section} section={section} />;
  }
}

export function ModeratorWorkspacePage(): ReactElement {
  const [section, setSection] = useState<ModeratorSection>("overview");
  const selectSection = (next: ModeratorSection) => setSection(next);
  return (
    <WorkspaceDataProvider><ModeratorLayout section={section} onSelect={selectSection}>
      <ModeratorContentBoundary section={section}>
        <div key={section} className="mod-content-view"><WorkspaceContent section={section} /></div>
      </ModeratorContentBoundary>
    </ModeratorLayout></WorkspaceDataProvider>
  );
}
