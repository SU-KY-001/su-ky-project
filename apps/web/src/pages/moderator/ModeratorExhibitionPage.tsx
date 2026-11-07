import { useMatch, useParams } from "react-router";
import { lazy } from "react";
import { ExhibitionCreate } from "@/features/exhibition-editor/components/ExhibitionCreate";
import { ExhibitionList } from "@/features/exhibition-editor/components/ExhibitionList";
const ExhibitionEditor = lazy(() => import("@/features/exhibition-editor/components/ExhibitionEditor").then(module => ({ default: module.ExhibitionEditor })));
const ExhibitionPreview = lazy(() => import("@/features/exhibition-editor/components/ExhibitionPreview").then(module => ({ default: module.ExhibitionPreview })));

export function ModeratorExhibitionPage() {
  const { id } = useParams();
  const isNew = useMatch("/moderator/exhibitions/new");
  const isPreview = useMatch("/moderator/exhibitions/:id/preview");
  if (isNew) return <ExhibitionCreate />;
  if (id) return isPreview ? <ExhibitionPreview id={id} /> : <ExhibitionEditor id={id} />;
  return <ExhibitionList />;
}
