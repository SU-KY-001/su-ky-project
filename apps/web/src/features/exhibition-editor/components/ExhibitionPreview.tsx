import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useBlocker, useLocation, useNavigate } from "react-router";
import { z } from "zod";
import { ExhibitionDocumentSchema, ExhibitionWorkspaceSchema } from "@repo/shared";
import { ExhibitionExperience } from "@/features/exhibition";
import { moderatorExhibitionPath } from "@/features/moderator/paths";
import { Button } from "@/shared/components/ui/button";
import { ConfirmationDialog } from "@/shared/components/common/ConfirmationDialog";
import { useConfirmationDialog } from "@/shared/hooks/useConfirmationDialog";
import { exhibitionService } from "../services/exhibitionService";

const previewState = z.object({ workspace: ExhibitionWorkspaceSchema, dirty: z.boolean(), savedDocument: ExhibitionDocumentSchema.optional() });
export function ExhibitionPreview({ id }: { id: string }) {
  const location = useLocation(); const navigate = useNavigate();
  const state = previewState.safeParse(location.state);
  const allowReturn = useRef(false);
  const { requestConfirmation, confirmation } = useConfirmationDialog();
  const blocker = useBlocker(() => state.success && state.data.dirty && !allowReturn.current);
  useEffect(() => { if (state.success) window.history.replaceState({ ...window.history.state, usr: null }, ""); }, []);
  useEffect(() => {
    if (!state.success || !state.data.dirty) return;
    const before = (event: BeforeUnloadEvent): void => { event.preventDefault(); };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [state.success && state.data.dirty]);
  useEffect(() => {
    if (blocker.state !== "blocked") return;
    void requestConfirmation({ title: "Rời bản xem thử?", description: "Các thay đổi chưa lưu trong trình biên tập sẽ bị mất.", confirmLabel: "Rời trang", destructive: true }).then(confirmed => { if (confirmed) blocker.proceed(); else blocker.reset(); });
  }, [blocker, requestConfirmation]);
  const query = useQuery({ queryKey: ["exhibition", id], queryFn: () => exhibitionService.get(id) });
  if (query.isPending) return <p role="status">Đang tải bản xem thử…</p>;
  if (query.isError) return <div role="alert"><p>{query.error.message}</p><Button onClick={() => void query.refetch()}>Thử lại</Button></div>;
  const active = state.success && state.data.workspace.id === id ? state.data : { workspace: query.data, dirty: false };
  const returnToEditor = (): void => { allowReturn.current = true; void navigate(moderatorExhibitionPath.edit(id), { state: active }); };
  return <><ExhibitionExperience exhibition={active.workspace.resolved} startInGallery /><header className="fixed inset-x-0 top-0 z-[60] flex min-h-11 items-center justify-between bg-mod-surface px-5 py-1 font-moderator text-mod-text"><Button variant="ghost" onClick={returnToEditor}>← Quay lại biên tập</Button><span className="text-sm font-semibold">Xem thử bằng tài khoản hiện tại{active.dirty ? " · Có thay đổi chưa lưu" : ""}</span><Button variant="ghost" className="text-mod-primary" onClick={returnToEditor}>Kết thúc xem thử</Button></header><ConfirmationDialog {...confirmation} /></>;
}
