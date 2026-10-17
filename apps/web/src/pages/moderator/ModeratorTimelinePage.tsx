import { HistoricalLibraryWorkspace } from "@/features/historical-library";

export function ModeratorTimelinePage({ initialCreating = false }: { initialCreating?: boolean }) {
  return <HistoricalLibraryWorkspace initialCreating={initialCreating} />;
}
