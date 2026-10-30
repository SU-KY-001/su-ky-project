import { useEffect, useRef, useState, type ReactElement, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { AudioUploadDropzone } from "@/shared/components/common/AudioUploadDropzone";
import { ImageUploadDropzone } from "@/shared/components/common/ImageUploadDropzone";
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

function RoomMap({ roomKey, roomCount }: { roomKey: string; roomCount: number }): ReactElement {
  const current = exhibitionTemplate.spawns.find(spawn => spawn.roomKey === roomKey);
  return <svg viewBox="-8 -42 16 56" role="img" aria-label={`Sơ đồ không gian ${roomCount} phòng`} className="h-28 w-24 rounded-md border border-mod-border bg-mod-surface/90 p-2 text-mod-text-secondary">
    <g>{exhibitionTemplate.floorAreas.slice(0, roomCount).map(area => <rect key={`${area.x}-${area.z}`} x={area.x - area.width / 2} y={area.z - area.depth / 2} width={area.width} height={area.depth} fill="var(--color-mod-canvas-accent)" stroke="currentColor" strokeWidth="0.25" />)}{current && <circle cx={current.position[0]} cy={current.position[2]} r="1" fill="var(--color-mod-primary)" />}</g>
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
  const [audioFiles, setAudioFiles] = useState<Record<string, { url: string }>>(() => initial.document.audioAssetId && initial.resolved.audio ? { [initial.document.audioAssetId]: initial.resolved.audio } : {});
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [original, setOriginal] = useState("");
  const [images, setImages] = useState<Record<string, ResolvedExhibition["items"][number]["image"]>>(() => Object.fromEntries(initial.resolved.items.map(item => [item.imageAssetId, item.image])));
  const [narrations, setNarrations] = useState<Record<string, NonNullable<ResolvedExhibition["items"][number]["narration"]>>>(() => Object.fromEntries(initial.resolved.items.flatMap(item => item.narration ? [[item.narration.id, item.narration]] : [])));
  const [showGuide, setShowGuide] = useState(true);
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

  const resolved: ResolvedExhibition = { audio: state.document.audioAssetId ? audioFiles[state.document.audioAssetId] ?? null : null, metadata: state.document.metadata, chapters: state.document.chapters, items: state.document.items.flatMap(item => {
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
  const occupied = (wallId: string, offset: number, excludeId?: string): boolean => state.document.items.some(item => {
    if (item.id === excludeId || item.placement.wallId !== wallId) return false;
    const image = images[item.imageAssetId];
    const width = image ? exhibitionArtworkLayout(item.placement.width, image.width / image.height, item.placement.widthMode).width : item.placement.width;
    return Math.abs(item.placement.offset - offset) < (width + 1.5) / 2 + 0.1;
  });
  const add = async (wallId?: string, offset?: number): Promise<void> => {
    if (!await canLeaveBuffer()) return;
    const selectedWall = exhibitionTemplate.walls.find(value => value.id === wallId);
    const chapter = selectedWall ? state.document.chapters.find(value => value.roomKey === selectedWall.roomKey) : state.document.chapters.find(value => value.id === chapterId);
    if (!chapter) return;
    const points = exhibitionTemplate.suggestions.filter(point => exhibitionTemplate.walls.find(wall => wall.id === point.wallId)?.roomKey === chapter.roomKey);
    const free = (point: typeof points[number]): boolean => !occupied(point.wallId, point.offset);
    const point = wallId && offset !== undefined ? points.find(value => value.wallId === wallId && value.offset === offset && free(value)) : points.find(free);
    if (!point) { notify.warning({ title: "Không còn vị trí trống trong phòng" }); return; }
    setChapterId(chapter.id);
    const item: Item = { id: crypto.randomUUID(), chapterId: chapter.id, imageAssetId: "", title: "", description: "", displayDate: "", credit: "", sourceUrl: "", rights: "", narrationId: null, placement: { ...point, width: 1.5, widthMode: "actual" } };
    setBuffer(item); setOriginal(""); setShowTree(false); setShowInspector(true); setInspectorTab("content");
  };
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
      if (fresh.document.audioAssetId && fresh.resolved.audio) setAudioFiles(current => ({ ...current, [fresh.document.audioAssetId!]: fresh.resolved.audio! }));
      setBuffer(null); setDirty(false); save.reset();
    } catch (error) { notify.error({ title: "Không tải được bản mới", description: error instanceof Error ? error.message : "Vui lòng thử lại" }); }
  };
  const uploadStoryAudio = async (file: File): Promise<void> => {
    setUploadingAudio(true);
    try {
      const result = await exhibitionService.uploadAudio(file, new AbortController().signal);
      setAudioFiles(current => ({ ...current, [result.id]: { url: result.url } }));
      setInfoBuffer(current => current ? { ...current, audioAssetId: result.id } : current);
    } catch (error) { notify.error({ title: "Không thể tải âm thanh", description: error instanceof Error ? error.message : "Vui lòng thử lại" }); throw error; }
    finally { setUploadingAudio(false); }
  };
  const move = (id: string, offset: number): void => {
    const candidate = { ...state.document, items: state.document.items.map(item => item.id === id ? { ...item, placement: { ...item.placement, offset } } : item) };
    const errors = validateExhibitionPlacements(candidate, dimensions);
    if (errors.length) { notify.warning({ title: "Không thể đặt tại vị trí này", description: errors.join("; ") }); return; }
    changeDocument(candidate);
    if (buffer?.id === id && !bufferDirty) { const item = candidate.items.find(value => value.id === id)!; setBuffer(item); setOriginal(JSON.stringify(item)); }
  };

  return <div className="exhibition-editor flex min-h-0 flex-col gap-4 font-moderator lg:h-full lg:gap-0"><header className="flex min-h-[68px] flex-wrap items-center gap-3 border-b border-mod-border px-5 py-4"><Button variant="ghost" onClick={() => void navigate(moderatorExhibitionPath.list)}>← Triển lãm</Button><span aria-hidden="true" className="text-mod-text-low">/</span><h1 className="text-xl font-bold">{state.document.metadata.title}</h1><span className="rounded-md bg-mod-canvas-accent px-2 py-1 text-xs font-semibold text-mod-text-secondary">Nháp</span><span className="mr-auto min-w-36 text-sm text-mod-text-secondary">{save.isPending ? "Đang lưu…" : save.isError ? "Lưu thất bại" : dirty ? "Có thay đổi chưa lưu" : "Đã lưu"}</span>{save.error instanceof ApiError && save.error.errorCode === "EXHIBITION_REVISION_CONFLICT" && <Button variant="outline" onClick={() => void reload()}>Tải bản mới nhất</Button>}<Button variant="outline" onClick={() => setShowGuide(true)}>Hướng dẫn</Button><Button variant="outline" onClick={() => setInfoBuffer(state.document)}>Thông tin</Button><Button variant="outline" disabled={save.isPending} onClick={() => void preview()}>Xem thử</Button><Button disabled={save.isPending || !dirty} onClick={() => void saveNow()}>Lưu nháp</Button></header>
    <div className="grid min-h-[620px] min-w-0 gap-0 overflow-hidden border-y border-mod-border bg-mod-surface lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(245px,21%)_minmax(0,1fr)_minmax(300px,26%)]">
      <ResponsivePanel title="Nội dung triển lãm" side="left" open={showTree} onOpenChange={setShowTree}><h2 className="hidden text-lg font-bold lg:block">Nội dung triển lãm</h2><div className="mt-4 flex-1 space-y-4 overflow-auto">{state.document.chapters.map((chapter, index) => <section key={chapter.id}><button type="button" aria-pressed={chapterId === chapter.id} className={`flex w-full items-center gap-3 rounded-md border px-3 py-3 text-left text-sm font-semibold ${chapterId === chapter.id ? "border-mod-primary bg-mod-primary/10 text-mod-primary" : "border-mod-border text-mod-text hover:bg-mod-canvas-accent"}`} onClick={() => void selectChapter(chapter.id)}><span className="text-xs">{String(index + 1).padStart(2, "0")}</span><span className="min-w-0 flex-1">{chapter.title}</span><span className="text-xs font-normal">{state.document.items.filter(item => item.chapterId === chapter.id).length} tranh</span></button>{state.document.items.filter(item => item.chapterId === chapter.id).map(item => <button type="button" key={item.id} onClick={() => void select(item)} className={`mt-1 block w-full rounded-md px-3 py-2 text-left text-sm ${buffer?.id === item.id ? "bg-mod-primary/10 text-mod-primary" : "text-mod-text-secondary"}`}>{item.title}</button>)}</section>)}</div><Button variant="outline" onClick={() => void add()}>+ Thêm tranh mới</Button></ResponsivePanel>
      <main className="relative min-h-[480px] min-w-0 bg-mod-canvas-accent"><div className="absolute left-1/2 top-3 z-10 flex -translate-x-1/2 gap-2 rounded-lg bg-mod-surface p-1"><Button size="sm" variant={mode === "layout" ? "default" : "ghost"} onClick={() => setMode("layout")}>Bố trí</Button><Button size="sm" variant={mode === "walk" ? "default" : "ghost"} onClick={() => setMode("walk")}>Đi thử</Button><Button size="sm" variant="outline" disabled={!state.history.length} onClick={() => void undo()}>Hoàn tác</Button></div><div className="pointer-events-none absolute bottom-5 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-mod-surface px-4 py-3 text-xs text-mod-text-secondary shadow-sm lg:block">Chọn tranh để sửa · Chọn vị trí gợi ý để thêm tranh</div><div className="absolute bottom-3 left-3 z-10 hidden lg:block"><RoomMap roomCount={state.document.chapters.length} roomKey={state.document.chapters.find(chapter => chapter.id === chapterId)?.roomKey ?? "room-1"} /></div><div className="absolute left-3 top-16 z-10 flex gap-2 lg:hidden"><Button variant="outline" onClick={() => setShowTree(true)}>Nội dung</Button><Button variant="outline" disabled={!buffer} onClick={() => setShowInspector(true)}>Thuộc tính</Button></div>{mode === "layout" ? <EditorScene exhibition={resolved} canDrag={false} selectedId={buffer?.id ?? null} selectedPlacement={buffer?.placement} initialView={savedView.current} onViewChange={view => { savedView.current = view; }} roomKey={state.document.chapters.find(chapter => chapter.id === chapterId)?.roomKey ?? "room-1"} onSelect={id => { const item = state.document.items.find(value => value.id === id); if (item) void select(item); }} onAdd={(wallId, offset) => void add(wallId, offset)} onMove={move} /> : <GalleryScene active pointerLockOnClick input={input} view={savedView.current ?? initialView} onViewChange={view => { savedView.current = view; }} items={resolvedArtworks(resolved)} chapterText={resolved.chapters} onPause={() => { if (document.pointerLockElement) document.exitPointerLock(); input.current.keys.clear(); setMode("layout"); }} onNavigate={() => undefined} onInspect={id => { const item = state.document.items.find(value => value.id === id); if (item) { input.current.keys.clear(); if (document.pointerLockElement) document.exitPointerLock(); setMode("layout"); void select(item); } }} onTarget={() => undefined} onChapter={() => undefined} onUnavailable={() => { setMode("layout"); notify.warning({ title: "Không thể mở cảnh 3D" }); }} />}</main>
      <ResponsivePanel title="Điểm trưng bày" side="right" open={showInspector} onOpenChange={setShowInspector}>{buffer ? <><h2 className="hidden text-lg font-bold lg:block">Điểm trưng bày</h2><div role="group" aria-label="Thuộc tính điểm trưng bày" className="mt-4 flex border-b border-mod-border">{([{ id: "content", label: "Nội dung" }, { id: "position", label: "Vị trí" }] as const).map(tab => <button key={tab.id} type="button" aria-pressed={inspectorTab === tab.id} onClick={() => setInspectorTab(tab.id)} className={`flex-1 border-b-2 py-2 text-sm font-semibold ${inspectorTab === tab.id ? "border-mod-primary text-mod-primary" : "border-transparent text-mod-text-secondary"}`}>{tab.label}</button>)}</div><div className="mt-4 flex-1 space-y-3 overflow-auto">{inspectorTab === "content" && <>{policy.isError && !policy.data ? <div className="space-y-2"><p role="alert" className="text-xs text-mod-danger">Không tải được điều kiện chọn ảnh.</p><Button type="button" variant="outline" size="sm" onClick={() => void policy.refetch()}>Thử lại</Button></div> : <ImageUploadDropzone key={buffer.id} label="Ảnh trưng bày" policy={policy.data} disabled={policy.isPending} value={images[buffer.imageAssetId] ? { assetId: buffer.imageAssetId, url: images[buffer.imageAssetId]!.url, fileName: "Ảnh đã chọn", sizeBytes: null } : null} onBusyChange={setUploadingImage} successMessage="Ảnh đã được tải lên. Bấm Áp dụng để thêm vào triển lãm." onUpload={async (file, signal) => { const result = await exhibitionService.uploadImage(file, signal); setImages(current => ({ ...current, [result.id]: result.image })); return { assetId: result.id, url: result.image.url, fileName: file.name, sizeBytes: file.size }; }} onChange={image => { const id = buffer.id; setBuffer(current => current?.id === id ? { ...current, imageAssetId: image?.assetId ?? "" } : current); }} />}
        <label className="block text-sm font-semibold">Tiêu đề<Input value={buffer.title} onChange={event => setBuffer({ ...buffer, title: event.target.value })} /></label><label className="block text-sm font-semibold">Mô tả<Textarea value={buffer.description} onChange={event => setBuffer({ ...buffer, description: event.target.value })} /></label>
        {([ ["displayDate", "Ngày hiển thị"], ["credit", "Nguồn ảnh"], ["sourceUrl", "URL nguồn"] ] as const).map(([field, label]) => <label key={field} className="block text-sm font-semibold">{label}<Input value={buffer[field]} onChange={event => setBuffer({ ...buffer, [field]: event.target.value })} /></label>)}
        </>}
        {inspectorTab === "position" && <div className="space-y-3"><p className="text-sm text-mod-text-secondary">Chọn một vị trí gợi ý còn trống trong phòng. Kích thước tranh được điều chỉnh phù hợp với không gian.</p>{exhibitionTemplate.suggestions.filter(point => exhibitionTemplate.walls.find(wall => wall.id === point.wallId)?.roomKey === state.document.chapters.find(chapter => chapter.id === buffer.chapterId)?.roomKey).map((point, index) => { const taken = occupied(point.wallId, point.offset, buffer.id); const selected = buffer.placement.wallId === point.wallId && buffer.placement.offset === point.offset; return <button type="button" key={point.wallId + point.offset} disabled={taken} aria-pressed={selected} className={`block w-full rounded-md border px-3 py-2 text-left text-sm ${selected ? "border-mod-primary bg-mod-primary/10 text-mod-primary" : "border-mod-border text-mod-text"} disabled:opacity-50`} onClick={() => setBuffer({ ...buffer, placement: { ...buffer.placement, wallId: point.wallId, offset: point.offset, width: 1.5, widthMode: "actual" } })}>Vị trí {index + 1}{taken ? " · Đã có tranh" : selected ? " · Đang chọn" : " · Còn trống"}</button>; })}</div>}
      </div><div className="mt-4 flex gap-2"><Button variant="outline" onClick={() => void remove()}>Xóa điểm</Button><Button className="flex-1" disabled={uploadingImage} onClick={apply}>Áp dụng</Button></div></> : <p className="text-sm text-mod-text-secondary">Chọn hoặc thêm điểm trưng bày để chỉnh sửa.</p>}</ResponsivePanel>
    </div><p className="text-sm text-mod-text-secondary lg:hidden">Chọn nội dung hoặc thuộc tính để chỉnh sửa trên màn hình nhỏ.</p><Dialog open={showGuide} onOpenChange={setShowGuide}><DialogContent className="border-mod-border bg-mod-surface font-moderator text-mod-text sm:max-w-lg"><DialogHeader><DialogTitle>Hướng dẫn bố trí triển lãm</DialogTitle><DialogDescription>Thiết lập từng phòng theo các bước sau.</DialogDescription></DialogHeader><ol className="list-decimal space-y-3 pl-5 text-sm text-mod-text"><li>Chọn phòng trong mục Nội dung triển lãm.</li><li>Chọn “Thêm tranh mới” hoặc một vị trí gợi ý trong phòng.</li><li>Tải ảnh, nhập nội dung và chọn vị trí trống; sau đó bấm Áp dụng.</li><li>Lưu bản nháp và xem thử trước khi công khai.</li></ol><DialogFooter><Button type="button" onClick={() => setShowGuide(false)}>Đã hiểu</Button></DialogFooter></DialogContent></Dialog><Dialog open={!!infoBuffer} onOpenChange={open => { if (!open) void (async () => { if (!infoDirty || await requestConfirmation({ title: "Bỏ thay đổi thông tin?", description: "Thông tin chưa áp dụng sẽ bị mất.", confirmLabel: "Bỏ thay đổi", destructive: true })) setInfoBuffer(null); })(); }}><DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden border-mod-border bg-mod-surface p-0 font-moderator text-mod-text sm:max-w-2xl"><DialogHeader className="shrink-0 border-b border-mod-border px-5 py-4 sm:px-6"><DialogTitle>Thông tin triển lãm</DialogTitle><DialogDescription>Chỉnh sửa thông tin và các chương của không gian.</DialogDescription></DialogHeader>{infoBuffer && <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6"><label className="block text-sm font-semibold">Tên triển lãm<Input className="mt-1.5" placeholder="Ví dụ: Ký ức ngày thống nhất" maxLength={255} value={infoBuffer.metadata.title} onChange={event => setInfoBuffer({ ...infoBuffer, metadata: { ...infoBuffer.metadata, title: event.target.value } })} /></label><label className="block text-sm font-semibold">Phụ đề<Input className="mt-1.5" placeholder="Ví dụ: Những câu chuyện mùa xuân 1975" maxLength={255} value={infoBuffer.metadata.subtitle} onChange={event => setInfoBuffer({ ...infoBuffer, metadata: { ...infoBuffer.metadata, subtitle: event.target.value } })} /></label><label className="block text-sm font-semibold">Giới thiệu<Textarea className="mt-1.5" placeholder="Giới thiệu chủ đề và câu chuyện của triển lãm" maxLength={2000} value={infoBuffer.metadata.description} onChange={event => setInfoBuffer({ ...infoBuffer, metadata: { ...infoBuffer.metadata, description: event.target.value } })} /></label><AudioUploadDropzone busy={uploadingAudio} hasAudio={!!infoBuffer.audioAssetId} previewUrl={infoBuffer.audioAssetId ? audioFiles[infoBuffer.audioAssetId]?.url : null} onSelect={uploadStoryAudio} onRemove={() => setInfoBuffer({ ...infoBuffer, audioAssetId: null })} />{infoBuffer.chapters.map((chapter, index) => <fieldset key={chapter.id} className="space-y-2 border-t border-mod-border pt-3"><legend className="text-sm font-semibold">Chương {index + 1}</legend><Input placeholder="Tên chương" aria-label={`Tên chương ${index + 1}`} value={chapter.title} onChange={event => setInfoBuffer({ ...infoBuffer, chapters: infoBuffer.chapters.map(value => value.id === chapter.id ? { ...value, title: event.target.value } : value) })} /><Input placeholder="Thời kỳ, ví dụ: Tháng 4 năm 1975" aria-label={`Thời kỳ chương ${index + 1}`} value={chapter.period} onChange={event => setInfoBuffer({ ...infoBuffer, chapters: infoBuffer.chapters.map(value => value.id === chapter.id ? { ...value, period: event.target.value } : value) })} /><Textarea placeholder="Mô tả nội dung của chương" aria-label={`Mô tả chương ${index + 1}`} value={chapter.description} onChange={event => setInfoBuffer({ ...infoBuffer, chapters: infoBuffer.chapters.map(value => value.id === chapter.id ? { ...value, description: event.target.value } : value) })} /></fieldset>)}</div>}<DialogFooter className="shrink-0 border-t border-mod-border px-5 py-4 sm:px-6"><Button disabled={uploadingAudio} onClick={() => { const parsed = ExhibitionDocumentSchema.safeParse(infoBuffer); if (!parsed.success) { notify.error({ title: "Thông tin chưa hợp lệ", description: "Kiểm tra tên và giới hạn các trường." }); return; } changeDocument(parsed.data); setInfoBuffer(null); }}>Áp dụng thông tin</Button></DialogFooter></DialogContent></Dialog><ConfirmationDialog {...confirmation} /></div>;
}
