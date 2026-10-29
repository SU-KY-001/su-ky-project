import { useEffect, useRef, useState, type ReactElement, type ReactNode } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBlocker, useLocation, useNavigate } from "react-router";
import { exhibitionArtworkLayout, exhibitionTemplate, ExhibitionDocumentSchema, ExhibitionWorkspaceSchema, validateExhibitionPlacements, type ExhibitionDocument, type ExhibitionWorkspace, type ResolvedExhibition } from "@repo/shared";
import { z } from "zod";
import { ApiError } from "@/lib/apiError";
import { GalleryScene, initialView, resolvedArtworks, type GalleryInput, type GalleryView } from "@/features/exhibition";
import { moderatorExhibitionPath } from "@/features/moderator/paths";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet";
import { ConfirmationDialog } from "@/shared/components/common/ConfirmationDialog";
import { useConfirmationDialog } from "@/shared/hooks/useConfirmationDialog";
import { notify } from "@/shared/lib/notifications";
import { editDocument, undoDocument } from "../editorState";
import { exhibitionService } from "../services/exhibitionService";
import { EditorScene } from "./EditorScene";

type Item = ExhibitionDocument["items"][number];
const returnStateSchema = z.object({ workspace: ExhibitionWorkspaceSchema, dirty: z.boolean(), savedDocument: ExhibitionDocumentSchema.optional() });

function ResponsivePanel({ title, open, onOpenChange, children, side }: { title: string; open: boolean; onOpenChange: (open: boolean) => void; children: ReactNode; side: "left" | "right" }): ReactElement {
  const [small, setSmall] = useState(() => window.matchMedia("(max-width: 1023px)").matches);
  useEffect(() => { const media = window.matchMedia("(max-width: 1023px)"); const change = (): void => setSmall(media.matches); media.addEventListener("change", change); return () => media.removeEventListener("change", change); }, []);
  if (small) return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent side={side} className="flex w-[min(90vw,380px)] flex-col overflow-hidden bg-mod-surface p-4 font-moderator"><SheetHeader><SheetTitle>{title}</SheetTitle></SheetHeader>{children}</SheetContent></Sheet>;
  return <aside className={`flex min-h-0 flex-col p-4 ${side === "left" ? "border-r" : "border-l"} border-mod-border`}>{children}</aside>;
}

function RoomMap({ roomKey }: { roomKey: string }): ReactElement {
  const current = exhibitionTemplate.spawns.find(spawn => spawn.roomKey === roomKey);
  return <svg viewBox="-8 -42 16 56" role="img" aria-label="Sơ đồ không gian ba phòng" className="h-28 w-24 rounded-md border border-mod-border bg-mod-surface/90 p-2 text-mod-text-secondary">
    <g>{exhibitionTemplate.floorAreas.map(area => <rect key={`${area.x}-${area.z}`} x={area.x - area.width / 2} y={area.z - area.depth / 2} width={area.width} height={area.depth} fill="var(--color-mod-canvas-accent)" stroke="currentColor" strokeWidth="0.25" />)}{current && <circle cx={current.position[0]} cy={current.position[2]} r="1" fill="var(--color-mod-primary)" />}</g>
  </svg>;
}

export function ExhibitionEditor({ id }: { id: string }): ReactElement {
  const location = useLocation();
  const previous = returnStateSchema.safeParse(location.state);
  const query = useQuery({ queryKey: ["exhibition", id], queryFn: () => exhibitionService.get(id) });
  if (query.isPending) return <p role="status">Đang tải triển lãm…</p>;
  if (query.isError) return <div role="alert"><p>{query.error.message}</p><Button onClick={() => void query.refetch()}>Thử lại</Button></div>;
  const initial = previous.success && previous.data.workspace.id === id ? previous.data.workspace : query.data;
  return <Editor key={id} initial={initial} initialDirty={previous.success && initial === previous.data.workspace && previous.data.dirty} initialSaved={previous.success && initial === previous.data.workspace ? previous.data.savedDocument ?? initial.document : query.data.document} />;
}

function Editor({ initial, initialDirty, initialSaved }: { initial: ExhibitionWorkspace; initialDirty: boolean; initialSaved: ExhibitionDocument }): ReactElement {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [workspace, setWorkspace] = useState(initial);
  const [savedDocument, setSavedDocument] = useState(initialSaved);
  const [state, setState] = useState({ document: initial.document, history: [] as ExhibitionDocument[] });
  const latestDocument = useRef(state.document);
  latestDocument.current = state.document;
  const [dirty, setDirty] = useState(initialDirty);
  const [chapterId, setChapterId] = useState(initial.document.chapters[0]!.id);
  const [buffer, setBuffer] = useState<Item | null>(null);
  const [infoBuffer, setInfoBuffer] = useState<ExhibitionDocument | null>(null);
  const [original, setOriginal] = useState("");
  const [images, setImages] = useState<Record<string, ResolvedExhibition["items"][number]["image"]>>(() => Object.fromEntries(initial.resolved.items.map(item => [item.imageAssetId, item.image])));
  const [narrations, setNarrations] = useState<Record<string, NonNullable<ResolvedExhibition["items"][number]["narration"]>>>(() => Object.fromEntries(initial.resolved.items.flatMap(item => item.narration ? [[item.narration.id, item.narration]] : [])));
  const [search, setSearch] = useState("");
  const [podcastPage, setPodcastPage] = useState(1);
  const [seriesId, setSeriesId] = useState("");
  const [showPodcasts, setShowPodcasts] = useState(false);
  const [showTree, setShowTree] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<"content" | "position">("content");
  const [mode, setMode] = useState<"layout" | "walk">("layout");
  const input = useRef<GalleryInput>({ keys: new Set() });
  const savedView = useRef<GalleryView | undefined>(undefined);
  const allowNavigation = useRef(false);
  const { requestConfirmation, confirmation } = useConfirmationDialog();
  const bufferDirty = buffer !== null && JSON.stringify(buffer) !== original;
  const infoDirty = infoBuffer !== null && JSON.stringify(infoBuffer) !== JSON.stringify(state.document);
  const blocker = useBlocker(() => (dirty || bufferDirty || infoDirty) && !allowNavigation.current);
  const policy = useQuery({ queryKey: ["image-policy"], queryFn: exhibitionService.imagePolicy });
  const podcasts = useQuery({ queryKey: ["exhibition-podcasts", search, seriesId, podcastPage], queryFn: () => exhibitionService.podcastOptions(search, podcastPage, seriesId || undefined), enabled: showPodcasts });
  const series = useInfiniteQuery({ queryKey: ["exhibition-podcast-series"], queryFn: ({ pageParam }) => exhibitionService.series(pageParam), initialPageParam: 1, getNextPageParam: last => last.page * last.limit < last.total ? last.page + 1 : undefined, enabled: showPodcasts });
  const save = useMutation({ mutationFn: (document: ExhibitionDocument) => exhibitionService.save(workspace.id, workspace.revision, document), onSuccess: (value, submitted) => { queryClient.setQueryData(["exhibition", workspace.id], value); setWorkspace(value); setSavedDocument(value.document); const unchanged = JSON.stringify(latestDocument.current) === JSON.stringify(submitted); setDirty(!unchanged); if (unchanged) setState(current => ({ ...current, document: value.document })); notify.success({ title: unchanged ? "Đã lưu bản nháp" : "Đã lưu phiên bản trước; còn thay đổi chưa lưu" }); }, onError: error => notify.error({ title: "Không thể lưu bản nháp", description: error.message }) });

  useEffect(() => {
    const before = (event: BeforeUnloadEvent): void => { if (dirty || bufferDirty || infoDirty) event.preventDefault(); };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [dirty, bufferDirty, infoDirty]);
  useEffect(() => {
    if (blocker.state !== "blocked") return;
    void requestConfirmation({ title: "Rời trình biên tập?", description: "Các thay đổi chưa lưu sẽ bị mất.", confirmLabel: "Rời trang", destructive: true }).then(confirmed => { if (confirmed) blocker.proceed(); else blocker.reset(); });
  }, [blocker, requestConfirmation]);

  const resolved: ResolvedExhibition = { metadata: state.document.metadata, chapters: state.document.chapters, items: state.document.items.flatMap(item => {
    const image = images[item.imageAssetId];
    if (!image) return [];
    return [{ ...item, image, narration: item.narrationId ? narrations[item.narrationId] ?? null : null }];
  }) };
  const dimensions = Object.fromEntries(Object.entries(images).map(([id, image]) => [id, { width: image.width, height: image.height }]));
  const changeDocument = (next: ExhibitionDocument): void => { setState(current => editDocument(current, next)); setDirty(JSON.stringify(next) !== JSON.stringify(savedDocument)); };
  const canLeaveBuffer = async (): Promise<boolean> => !bufferDirty || requestConfirmation({ title: "Bỏ thay đổi chưa áp dụng?", description: "Nội dung trong bảng thuộc tính chưa được áp dụng vào triển lãm.", confirmLabel: "Bỏ thay đổi", destructive: true });
  const select = async (item: Item): Promise<void> => { if (!await canLeaveBuffer()) return; setChapterId(item.chapterId); setBuffer(item); setOriginal(JSON.stringify(item)); setShowTree(false); setShowInspector(true); };
  const selectChapter = async (id: string): Promise<void> => { if (!await canLeaveBuffer()) return; setBuffer(null); setChapterId(id); };
  const undo = async (): Promise<void> => { if (!await canLeaveBuffer()) return; const next = undoDocument(state); setState(next); setDirty(JSON.stringify(next.document) !== JSON.stringify(savedDocument)); setBuffer(null); };
  const add = async (wallId?: string, offset?: number): Promise<void> => { if (!await canLeaveBuffer()) return; const selectedWall = exhibitionTemplate.walls.find(value => value.id === wallId); const chapter = selectedWall ? state.document.chapters.find(value => value.roomKey === selectedWall.roomKey)! : state.document.chapters.find(value => value.id === chapterId)!; const wall = selectedWall ?? exhibitionTemplate.walls.find(value => value.roomKey === chapter.roomKey)!; setChapterId(chapter.id); const item: Item = { id: crypto.randomUUID(), chapterId: chapter.id, imageAssetId: "", title: "", description: "", displayDate: "", credit: "", sourceUrl: "", rights: "", narrationId: null, placement: { wallId: wall.id, offset: offset ?? (wall.range[0] + wall.range[1]) / 2, width: 2, widthMode: "actual" } }; setBuffer(item); setOriginal(""); setShowTree(false); setShowInspector(true); };
  const apply = (): void => {
    if (!buffer) return;
    const candidate = { ...state.document, items: [...state.document.items.filter(item => item.id !== buffer.id), buffer] };
    const parsed = ExhibitionDocumentSchema.safeParse(candidate);
    if (!parsed.success) { notify.error({ title: "Chưa thể áp dụng", description: "Kiểm tra ảnh, tiêu đề, nguồn và các trường của điểm trưng bày." }); return; }
    const errors = validateExhibitionPlacements(parsed.data, dimensions);
    if (errors.length) { notify.error({ title: "Vị trí không hợp lệ", description: errors.join("; ") }); return; }
    changeDocument(parsed.data); setOriginal(JSON.stringify(buffer));
  };
  const remove = async (): Promise<void> => {
    if (!buffer) return;
    if (!state.document.items.some(item => item.id === buffer.id)) { setBuffer(null); return; }
    if (!await requestConfirmation({ title: "Xóa điểm trưng bày?", description: `Điểm “${buffer.title}” sẽ được xóa khỏi bản đang biên tập.`, confirmLabel: "Xóa điểm", destructive: true })) return;
    changeDocument({ ...state.document, items: state.document.items.filter(item => item.id !== buffer.id) }); setBuffer(null);
  };
  const preview = async (): Promise<void> => {
    if (!await canLeaveBuffer()) return;
    allowNavigation.current = true;
    await navigate(moderatorExhibitionPath.preview(workspace.id), { state: { workspace: { ...workspace, document: state.document, resolved }, dirty, savedDocument } });
  };
  const saveNow = async (): Promise<void> => { if (!await canLeaveBuffer()) return; if (bufferDirty) setBuffer(null); save.mutate(state.document); };
  const reload = async (): Promise<void> => {
    if (!await requestConfirmation({ title: "Tải bản mới nhất?", description: "Bản đang sửa trên thiết bị này sẽ bị bỏ. Hãy sao lưu nội dung cần giữ trước khi tiếp tục.", confirmLabel: "Tải bản mới", destructive: true })) return;
    try {
      const fresh = await exhibitionService.get(workspace.id);
      queryClient.setQueryData(["exhibition", workspace.id], fresh); setWorkspace(fresh); setSavedDocument(fresh.document); setState({ document: fresh.document, history: [] });
      setImages(Object.fromEntries(fresh.resolved.items.map(item => [item.imageAssetId, item.image])));
      setNarrations(Object.fromEntries(fresh.resolved.items.flatMap(item => item.narration ? [[item.narration.id, item.narration]] : [])));
      setBuffer(null); setDirty(false); save.reset();
    } catch (error) { notify.error({ title: "Không tải được bản mới", description: error instanceof Error ? error.message : "Vui lòng thử lại" }); }
  };
  const upload = async (file: File): Promise<void> => {
    if (!buffer) return;
    const itemId = buffer.id;
    try {
      if (!policy.data) throw new Error("Chưa tải được chính sách ảnh");
      if (file.size > policy.data.maxBytes || !policy.data.mimeTypes.includes(file.type)) throw new Error("Ảnh không đúng định dạng hoặc vượt dung lượng cho phép");
      const result = await exhibitionService.uploadImage(file, new AbortController().signal);
      setImages(current => ({ ...current, [result.id]: result.image })); setBuffer(current => current?.id === itemId ? { ...current, imageAssetId: result.id } : current);
    } catch (error) { notify.error({ title: "Không thể tải ảnh", description: error instanceof Error ? error.message : "Vui lòng thử lại" }); }
  };
  const move = (id: string, offset: number): void => {
    const candidate = { ...state.document, items: state.document.items.map(item => item.id === id ? { ...item, placement: { ...item.placement, offset } } : item) };
    const errors = validateExhibitionPlacements(candidate, dimensions);
    if (errors.length) { notify.warning({ title: "Không thể đặt tại vị trí này", description: errors.join("; ") }); return; }
    changeDocument(candidate);
    if (buffer?.id === id && !bufferDirty) { const item = candidate.items.find(value => value.id === id)!; setBuffer(item); setOriginal(JSON.stringify(item)); }
  };

  return <div className="exhibition-editor flex min-h-0 flex-col gap-4 font-moderator lg:h-full lg:gap-0"><header className="flex min-h-[68px] flex-wrap items-center gap-3 border-b border-mod-border px-5 py-3"><Button variant="ghost" onClick={() => void navigate(moderatorExhibitionPath.list)}>← Triển lãm</Button><span aria-hidden="true" className="text-mod-text-low">/</span><h1 className="text-xl font-bold">{state.document.metadata.title}</h1><span className="rounded-md bg-mod-canvas-accent px-2 py-1 text-xs font-semibold text-mod-text-secondary">Nháp</span><span className="mr-auto text-sm text-mod-text-secondary">{save.isPending ? "Đang lưu…" : save.isError ? "Lưu thất bại" : dirty ? "Có thay đổi chưa lưu" : "Đã lưu"}</span>{save.error instanceof ApiError && save.error.errorCode === "EXHIBITION_REVISION_CONFLICT" && <Button variant="outline" onClick={() => void reload()}>Tải bản mới nhất</Button>}<Button variant="outline" onClick={() => setInfoBuffer(state.document)}>Thông tin</Button><Button variant="outline" disabled={save.isPending} onClick={() => void preview()}>Xem thử</Button><Button disabled={save.isPending || !dirty} onClick={() => void saveNow()}>Lưu nháp</Button></header>
    <div className="grid min-h-[620px] min-w-0 gap-0 overflow-hidden border-y border-mod-border bg-mod-surface lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(245px,21%)_minmax(0,1fr)_minmax(300px,26%)]">
      <ResponsivePanel title="Nội dung triển lãm" side="left" open={showTree} onOpenChange={setShowTree}><h2 className="hidden text-lg font-bold lg:block">Nội dung triển lãm</h2><div className="mt-4 flex-1 space-y-4 overflow-auto">{state.document.chapters.map((chapter, index) => <section key={chapter.id}><button type="button" className="w-full text-left font-semibold" onClick={() => void selectChapter(chapter.id)}>{String(index + 1).padStart(2, "0")} &nbsp; {chapter.title}</button>{state.document.items.filter(item => item.chapterId === chapter.id).map(item => <button type="button" key={item.id} onClick={() => void select(item)} className={`mt-1 block w-full rounded-md px-3 py-2 text-left text-sm ${buffer?.id === item.id ? "bg-mod-primary/10 text-mod-primary" : "text-mod-text-secondary"}`}>{item.title}</button>)}</section>)}</div><Button variant="outline" onClick={() => void add()}>+ Thêm điểm trưng bày</Button></ResponsivePanel>
      <main className="relative min-h-[480px] min-w-0 bg-mod-canvas-accent"><div className="absolute left-1/2 top-3 z-10 flex -translate-x-1/2 gap-2 rounded-lg bg-mod-surface p-1"><Button size="sm" variant={mode === "layout" ? "default" : "ghost"} onClick={() => setMode("layout")}>Bố trí</Button><Button size="sm" variant={mode === "walk" ? "default" : "ghost"} onClick={() => setMode("walk")}>Đi thử</Button><Button size="sm" variant="outline" disabled={!state.history.length} onClick={() => void undo()}>Hoàn tác</Button></div><div className="pointer-events-none absolute bottom-5 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-mod-surface px-4 py-3 text-xs text-mod-text-secondary shadow-sm lg:block">Chọn ảnh để sửa · Kéo trên tường để đổi vị trí</div><div className="absolute bottom-3 left-3 z-10 hidden lg:block"><RoomMap roomKey={state.document.chapters.find(chapter => chapter.id === chapterId)?.roomKey ?? "room-1"} /></div><div className="absolute left-3 top-16 z-10 flex gap-2 lg:hidden"><Button variant="outline" onClick={() => setShowTree(true)}>Nội dung</Button><Button variant="outline" disabled={!buffer} onClick={() => setShowInspector(true)}>Thuộc tính</Button></div>{mode === "layout" ? <EditorScene exhibition={resolved} canDrag={!bufferDirty} selectedId={buffer?.id ?? null} initialView={savedView.current} onViewChange={view => { savedView.current = view; }} roomKey={state.document.chapters.find(chapter => chapter.id === chapterId)?.roomKey ?? "room-1"} onSelect={id => { const item = state.document.items.find(value => value.id === id); if (item) void select(item); }} onAdd={(wallId, offset) => void add(wallId, offset)} onMove={move} /> : <GalleryScene active pointerLockOnClick input={input} view={savedView.current ?? initialView} onViewChange={view => { savedView.current = view; }} items={resolvedArtworks(resolved)} chapterText={resolved.chapters} onPause={() => { if (document.pointerLockElement) document.exitPointerLock(); input.current.keys.clear(); setMode("layout"); }} onNavigate={() => undefined} onInspect={id => { const item = state.document.items.find(value => value.id === id); if (item) { input.current.keys.clear(); if (document.pointerLockElement) document.exitPointerLock(); setMode("layout"); void select(item); } }} onTarget={() => undefined} onChapter={() => undefined} onUnavailable={() => { setMode("layout"); notify.warning({ title: "Không thể mở cảnh 3D" }); }} />}</main>
      <ResponsivePanel title="Điểm trưng bày" side="right" open={showInspector} onOpenChange={setShowInspector}>{buffer ? <><h2 className="hidden text-lg font-bold lg:block">Điểm trưng bày</h2><div role="group" aria-label="Thuộc tính điểm trưng bày" className="mt-4 flex border-b border-mod-border">{([{ id: "content", label: "Nội dung" }, { id: "position", label: "Vị trí" }] as const).map(tab => <button key={tab.id} type="button" aria-pressed={inspectorTab === tab.id} onClick={() => setInspectorTab(tab.id)} className={`flex-1 border-b-2 py-2 text-sm font-semibold ${inspectorTab === tab.id ? "border-mod-primary text-mod-primary" : "border-transparent text-mod-text-secondary"}`}>{tab.label}</button>)}</div><div className="mt-4 flex-1 space-y-3 overflow-auto">{inspectorTab === "content" && <>{images[buffer.imageAssetId] && <img src={images[buffer.imageAssetId]!.url} alt="Ảnh đã chọn" className="h-48 w-full rounded-md object-cover" />}<label className="block cursor-pointer rounded-md border border-mod-border px-3 py-2 text-center text-sm font-semibold text-mod-text-secondary hover:bg-mod-canvas-accent"><span>{images[buffer.imageAssetId] ? "Thay ảnh / poster" : "Chọn ảnh / poster"}</span><Input className="sr-only" type="file" accept={policy.data?.mimeTypes.join(",")} onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file); }} /></label>
        <label className="block text-sm font-semibold">Tiêu đề<Input value={buffer.title} onChange={event => setBuffer({ ...buffer, title: event.target.value })} /></label><label className="block text-sm font-semibold">Mô tả<Textarea value={buffer.description} onChange={event => setBuffer({ ...buffer, description: event.target.value })} /></label>
        {([ ["displayDate", "Ngày hiển thị"], ["credit", "Nguồn ảnh"], ["sourceUrl", "URL nguồn"] ] as const).map(([field, label]) => <label key={field} className="block text-sm font-semibold">{label}<Input value={buffer[field]} onChange={event => setBuffer({ ...buffer, [field]: event.target.value })} /></label>)}
        <label className="block text-sm font-semibold">Quyền sử dụng<Textarea value={buffer.rights} onChange={event => setBuffer({ ...buffer, rights: event.target.value })} /></label></>}
        {inspectorTab === "position" && <><label className="block text-sm font-semibold">Tường<select className="mt-1 w-full rounded-md border border-mod-border bg-mod-surface p-2" value={buffer.placement.wallId} onChange={event => { const wall = exhibitionTemplate.walls.find(value => value.id === event.target.value); if (wall) setBuffer({ ...buffer, placement: { ...buffer.placement, wallId: wall.id, offset: (wall.range[0] + wall.range[1]) / 2 } }); }}>{exhibitionTemplate.walls.filter(wall => wall.roomKey === state.document.chapters.find(chapter => chapter.id === buffer.chapterId)?.roomKey).map(wall => <option key={wall.id} value={wall.id}>{wall.id}</option>)}</select></label>
        <label className="block text-sm font-semibold">Khoảng cách dọc tường (m)<Input type="number" step="0.1" min="0" value={buffer.placement.offset} onChange={event => setBuffer({ ...buffer, placement: { ...buffer.placement, offset: Number(event.target.value) } })} /></label><label className="block text-sm font-semibold">Chiều rộng thực tế (m)<Input type="number" step="0.1" min="0.1" max={images[buffer.imageAssetId] ? 2 * images[buffer.imageAssetId]!.width / images[buffer.imageAssetId]!.height : undefined} disabled={!images[buffer.imageAssetId]} value={images[buffer.imageAssetId] ? Number(exhibitionArtworkLayout(buffer.placement.width, images[buffer.imageAssetId]!.width / images[buffer.imageAssetId]!.height, buffer.placement.widthMode).width.toFixed(2)) : ""} onChange={event => setBuffer({ ...buffer, placement: { ...buffer.placement, width: Number(event.target.value), widthMode: "actual" } })} /></label></>}
        {inspectorTab === "content" && <div><p className="text-sm font-semibold">Podcast đính kèm</p>{buffer.narrationId && <div className="flex items-center gap-2"><p className="text-sm">{narrations[buffer.narrationId]?.episodeTitle ?? "Bản kể đã chọn"}</p><Button variant="ghost" size="sm" onClick={() => setBuffer({ ...buffer, narrationId: null })}>Bỏ chọn</Button></div>}<Button variant="outline" onClick={() => setShowPodcasts(value => !value)}>Chọn từ thư viện podcast</Button>{showPodcasts && <div className="mt-2 space-y-2"><Input placeholder="Tìm tập podcast" value={search} onChange={event => { setSearch(event.target.value); setPodcastPage(1); }} /><label className="block text-sm">Series<select className="w-full rounded-md border border-mod-border bg-mod-surface p-2" value={seriesId} onChange={event => { setSeriesId(event.target.value); setPodcastPage(1); }}><option value="">Tất cả series</option>{series.data?.pages.flatMap(page => page.items).map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>{series.hasNextPage && <Button variant="ghost" size="sm" disabled={series.isFetchingNextPage} onClick={() => void series.fetchNextPage()}>Tải thêm series</Button>}{series.isError && <p role="alert">Không tải được series.</p>}{podcasts.isError && <p role="alert">Không tải được podcast.</p>}{podcasts.isPending && <p>Đang tải bản kể…</p>}{podcasts.data?.items.map(option => <button type="button" key={option.id} className="block w-full border-b border-mod-border p-2 text-left text-sm" onClick={() => { setNarrations(current => ({ ...current, [option.id]: { id: option.id, episodeTitle: option.episodeTitle, seriesTitle: option.seriesTitle, narrationLabel: option.narrationLabel, available: true } })); setBuffer({ ...buffer, narrationId: option.id }); setShowPodcasts(false); }}>{option.episodeTitle} · {option.narrationLabel}</button>)}{podcasts.data && !podcasts.data.items.length && <p className="text-sm">Không có bản kể phù hợp.</p>}<div className="flex justify-between text-sm"><Button variant="ghost" size="sm" disabled={podcastPage <= 1} onClick={() => setPodcastPage(page => page - 1)}>Trước</Button><span>Trang {podcastPage}</span><Button variant="ghost" size="sm" disabled={!podcasts.data || podcastPage * podcasts.data.limit >= podcasts.data.total} onClick={() => setPodcastPage(page => page + 1)}>Sau</Button></div></div>}</div>}
      </div><div className="mt-4 flex gap-2"><Button variant="outline" onClick={() => void remove()}>Xóa điểm</Button><Button className="flex-1" onClick={apply}>Áp dụng</Button></div></> : <p className="text-sm text-mod-text-secondary">Chọn hoặc thêm điểm trưng bày để chỉnh sửa.</p>}</ResponsivePanel>
    </div><p className="text-sm text-mod-text-secondary lg:hidden">Để kéo ảnh chính xác trên tường, hãy dùng máy tính; trên màn hình nhỏ bạn vẫn có thể sửa vị trí trong thuộc tính.</p><Dialog open={!!infoBuffer} onOpenChange={open => { if (!open) void (async () => { if (!infoDirty || await requestConfirmation({ title: "Bỏ thay đổi thông tin?", description: "Thông tin chưa áp dụng sẽ bị mất.", confirmLabel: "Bỏ thay đổi", destructive: true })) setInfoBuffer(null); })(); }}><DialogContent className="max-h-[90dvh] overflow-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Thông tin triển lãm</DialogTitle><DialogDescription>Chỉnh sửa thông tin và ba chương của không gian.</DialogDescription></DialogHeader>{infoBuffer && <div className="space-y-3"><label className="block text-sm font-semibold">Tên triển lãm<Input maxLength={255} value={infoBuffer.metadata.title} onChange={event => setInfoBuffer({ ...infoBuffer, metadata: { ...infoBuffer.metadata, title: event.target.value } })} /></label><label className="block text-sm font-semibold">Phụ đề<Input maxLength={255} value={infoBuffer.metadata.subtitle} onChange={event => setInfoBuffer({ ...infoBuffer, metadata: { ...infoBuffer.metadata, subtitle: event.target.value } })} /></label><label className="block text-sm font-semibold">Giới thiệu<Textarea maxLength={2000} value={infoBuffer.metadata.description} onChange={event => setInfoBuffer({ ...infoBuffer, metadata: { ...infoBuffer.metadata, description: event.target.value } })} /></label>{infoBuffer.chapters.map((chapter, index) => <fieldset key={chapter.id} className="space-y-2 border-t border-mod-border pt-3"><legend className="text-sm font-semibold">Chương {index + 1}</legend><Input aria-label={`Tên chương ${index + 1}`} value={chapter.title} onChange={event => setInfoBuffer({ ...infoBuffer, chapters: infoBuffer.chapters.map(value => value.id === chapter.id ? { ...value, title: event.target.value } : value) })} /><Input aria-label={`Thời kỳ chương ${index + 1}`} value={chapter.period} onChange={event => setInfoBuffer({ ...infoBuffer, chapters: infoBuffer.chapters.map(value => value.id === chapter.id ? { ...value, period: event.target.value } : value) })} /><Textarea aria-label={`Mô tả chương ${index + 1}`} value={chapter.description} onChange={event => setInfoBuffer({ ...infoBuffer, chapters: infoBuffer.chapters.map(value => value.id === chapter.id ? { ...value, description: event.target.value } : value) })} /></fieldset>)}</div>}<DialogFooter><Button onClick={() => { const parsed = ExhibitionDocumentSchema.safeParse(infoBuffer); if (!parsed.success) { notify.error({ title: "Thông tin chưa hợp lệ", description: "Kiểm tra tên và giới hạn các trường." }); return; } changeDocument(parsed.data); setInfoBuffer(null); }}>Áp dụng thông tin</Button></DialogFooter></DialogContent></Dialog><ConfirmationDialog {...confirmation} /></div>;
}
