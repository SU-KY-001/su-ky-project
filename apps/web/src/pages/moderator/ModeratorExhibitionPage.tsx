import { useMatch, useParams } from "react-router";
import { ExhibitionCreate, ExhibitionEditor, ExhibitionList, ExhibitionPreview } from "@/features/exhibition-editor";

export function ModeratorExhibitionPage() {
  const { id } = useParams();
  const isNew = useMatch("/moderator/exhibitions/new");
  const isPreview = useMatch("/moderator/exhibitions/:id/preview");
  if (isNew) return <ExhibitionCreate />;
  if (id) return isPreview ? <ExhibitionPreview id={id} /> : <ExhibitionEditor id={id} />;
  return <ExhibitionList />;
}
