import { Navigate, useParams } from "react-router";
import { HistoricalCatalogList } from "@/features/historical-library/components/HistoricalCatalogList";
import { APP_PATHS } from "@/shared/constants/routes";

const LIBRARY_SECTIONS = ["events", "sources", "pending", "schedule"] as const;
type LibrarySection = (typeof LIBRARY_SECTIONS)[number];

function isLibrarySection(value: string | undefined): value is LibrarySection {
  return LIBRARY_SECTIONS.some((section) => section === value);
}

// Route `moderator/:section` passes no props; the section comes from the URL.
export function ModeratorLibraryFeaturePage() {
  const { section } = useParams();
  if (!isLibrarySection(section)) return <Navigate to={APP_PATHS.moderator} replace />;
  return <HistoricalCatalogList key={section} section={section} />;
}
