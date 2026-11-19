import { artworkFocusId, editorRoomView, artworkEditorView } from "../cameraFocus";
import { Component, memo, useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode, type ComponentRef, type RefObject } from "react";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { Edges, OrbitControls } from "@react-three/drei";
import { NoToneMapping } from "three";
import { exhibitionArtworkLayout, exhibitionTemplate, type ExhibitionDocument, type ResolvedExhibition } from "@repo/shared";
import { GalleryArchitecture, GalleryArtwork, GalleryArtworkLights, GalleryCeilingLights, galleryPalette, placementToPose, resolvedArtworks, type GalleryView } from "@/features/exhibition";

import { findWallDrop, wallInteractionPosition } from "../wallDrag";

const StableGalleryArchitecture = memo(GalleryArchitecture);
const StableGalleryArtwork = memo(GalleryArtwork);

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } { return { failed: true }; }
  render(): ReactNode { return this.state.failed ? <p className="p-5 text-sm">Không thể bố trí bằng 3D trên thiết bị này. Bạn vẫn có thể chọn điểm và sửa nội dung trong danh sách.</p> : this.props.children; }
}

function FocusArtwork({ artwork, roomKey, initialView, onViewChange, focusRevision, resetRevision, overview, controls }: { overview?: { id: string; position: [number, number, number] }; controls: RefObject<ComponentRef<typeof OrbitControls> | null>; resetRevision: number; artwork: Pick<ReturnType<typeof resolvedArtworks>[number], "id" | "position" | "rotation"> | undefined; focusRevision: number; roomKey: string; initialView?: GalleryView; onViewChange: (view: GalleryView) => void }): null {
  const { camera } = useThree();
  const first = useRef(true);
  const previousRoom = useRef(roomKey);
  const previousReset = useRef(resetRevision);
  useEffect(() => () => onViewChange({ position: [camera.position.x, camera.position.y, camera.position.z], yaw: camera.rotation.y, revision: (initialView?.revision ?? 0) + 1 }), [camera]);
  useEffect(() => {
    if (first.current && initialView && !artwork && !overview && resetRevision === 0) { first.current = false; const view = editorRoomView(roomKey); camera.position.set(...view.position); camera.lookAt(...view.target); controls.current?.target.set(...view.target); return; }
    const initializing = first.current;
    const roomChanged = previousRoom.current !== roomKey;
    const resetRequested = previousReset.current !== resetRevision;
    previousRoom.current = roomKey;
    previousReset.current = resetRevision;
    first.current = false;
    if (overview && !artwork && !resetRequested) {
      const index = exhibitionTemplate.spawns.findIndex(value => value.roomKey === roomKey);
      const area = exhibitionTemplate.floorAreas[index];
      if (area) {
        const view = editorRoomView(roomKey);
        const dx = overview.position[0] - view.target[0]; const dz = overview.position[2] - view.target[2]; const length = Math.hypot(dx, dz) || 1;
        camera.position.set(view.target[0] - dx / length * 4.5, 2.15, view.target[2] - dz / length * 4.5);
        camera.lookAt(...view.target);
        controls.current?.target.set(...view.target);
        controls.current?.update();
      }
      return;
    }
    if (!artwork) {
      if (!initializing && !roomChanged && !resetRequested) return;
      const view = editorRoomView(roomKey);
      camera.position.set(...view.position);
      camera.lookAt(...view.target);
      controls.current?.target.set(...view.target);
      controls.current?.update();
      return;
    }
    const view = artworkEditorView(roomKey, artwork);
    camera.position.set(...view.position);
    camera.lookAt(...view.target);
    controls.current?.target.set(...view.target); controls.current?.update();
  }, [camera, artwork?.id, roomKey, focusRevision, resetRevision, overview?.id]);
  return null;
}

export function EditorScene({ focusSelection = true, exhibition, selectedId, selectedPlacement, draftPlacements = [], roomKey, initialView, onViewChange, onSelect, onMove, onAdd, canDrag }: { focusSelection?: boolean; exhibition: ResolvedExhibition; selectedId: string | null; selectedPlacement?: ExhibitionDocument["items"][number]["placement"]; draftPlacements?: { id: string; placement: ExhibitionDocument["items"][number]["placement"] }[]; roomKey: string; initialView?: GalleryView; onViewChange: (view: GalleryView) => void; onSelect: (id: string) => void; onMove: (id: string, wallId: string, offset: number) => void; onAdd: (wallId: string, offset: number) => void; canDrag: boolean }): ReactElement {
  const [hovered, setHovered] = useState<{ id: string; message: string } | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [drop, setDrop] = useState<{ wallId: string; offset: number } | null>(null);
  const latest = useRef<{ wallId: string; offset: number } | null>(null);
  const [resetRevision, setResetRevision] = useState(0);
  const [dismissedSelection, setDismissedSelection] = useState<string | null>(null);
  const resetRoom = (): void => { setDismissedSelection(selectedId); setFocus(null); setResetRevision(value => value + 1); };
  useEffect(() => { const onKey = (event: KeyboardEvent): void => { if (event.key === "Escape" && !document.querySelector('[role="dialog"], [role="alertdialog"]')) resetRoom(); }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [selectedId]);
  useEffect(() => { setDismissedSelection(null); }, [selectedId, focusSelection]);
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const [focus, setFocus] = useState<{ id: string; revision: number } | null>(null);
  const zoom = (id: string): void => { onSelect(id); setFocus(current => ({ id, revision: (current?.revision ?? 0) + 1 })); };
  const artworks = useMemo(() => resolvedArtworks({ ...exhibition, items: exhibition.items.map(item => item.id === dragging && drop ? { ...item, placement: { ...item.placement, ...drop } } : item) }), [exhibition, dragging, drop]);
  const selected = resolvedArtworks(exhibition).find(item => item.id === selectedId);
  const focusId = artworkFocusId(selectedId, focus?.id ?? null, dismissedSelection, focusSelection);
  const focusedDraft = draftPlacements.find(item => item.id === focusId && exhibitionTemplate.walls.find(wall => wall.id === item.placement.wallId)?.roomKey === roomKey);
  const focusTarget = resolvedArtworks(exhibition).find(item => item.id === focusId && exhibitionTemplate.walls.find(wall => wall.id === exhibition.items.find(value => value.id === item.id)?.placement.wallId)?.roomKey === roomKey) ?? (focusedDraft ? { id: focusedDraft.id, ...placementToPose(focusedDraft.placement) } : undefined);
  const defaultView = editorRoomView(roomKey);
  const overview = !focusSelection && selectedId && selectedPlacement && dismissedSelection !== selectedId ? { id: selectedId, position: [placementToPose(selectedPlacement).position[0], 2.15, placementToPose(selectedPlacement).position[2]] as [number, number, number] } : undefined;
  const initialOrbitTarget = useMemo<[number, number, number]>(() => editorRoomView(roomKey).target, [roomKey]);
  const move = (event: ThreeEvent<PointerEvent>, id: string): void => {
    if (dragging !== id) return;
    event.stopPropagation();
    const item = exhibition.items.find(value => value.id === id);
    const width = item ? exhibitionArtworkLayout(item.placement.width, item.image.width / item.image.height, item.placement.widthMode).width : 1.5;
    const next = findWallDrop(event.ray, roomKey, width);
    latest.current = next; setDrop(next);
  };
  const selectionColor = getComputedStyle(document.documentElement).getPropertyValue("--modPrimary").trim();
  return <div className="relative h-full min-h-[480px] w-full"><SceneBoundary><Canvas style={{ cursor: dragging ? "grabbing" : hovered ? "pointer" : "grab" }} onPointerLeave={() => setHovered(null)} gl={{ antialias: true, powerPreference: "high-performance", alpha: false, toneMapping: NoToneMapping }} fallback={<p className="p-5 text-sm">Thiết bị không hỗ trợ bố trí 3D; bạn vẫn có thể sửa nội dung theo danh sách.</p>} camera={{ position: defaultView.position, fov: 66 }}><color attach="background" args={[galleryPalette.wall]} /><ambientLight intensity={0.55} color={galleryPalette.light} /><hemisphereLight args={[galleryPalette.light, galleryPalette.floor, 0.35]} /><directionalLight position={[-3, 8, 6]} intensity={Math.PI * 0.078} color={galleryPalette.light} /><StableGalleryArchitecture chapterText={exhibition.chapters} artworks={artworks} /><GalleryCeilingLights /><GalleryArtworkLights artworks={artworks} /><FocusArtwork controls={controls} overview={overview} artwork={focusTarget} resetRevision={resetRevision} focusRevision={focus?.revision ?? 0} roomKey={roomKey} initialView={initialView} onViewChange={onViewChange} />
    {artworks.map(artwork => <group key={artwork.id} onDoubleClick={event => { event.stopPropagation(); zoom(artwork.id); }} onPointerOver={event => { event.stopPropagation(); setHovered({ id: artwork.id, message: selectedId === artwork.id ? `Đang chỉnh sửa: ${artwork.title}` : `Nhấn để chỉnh sửa: ${artwork.title}` }); }} onPointerOut={event => { event.stopPropagation(); setHovered(current => current?.id === artwork.id ? null : current); }} onPointerDown={event => { event.stopPropagation(); if (selectedId !== artwork.id) onSelect(artwork.id); if (!canDrag) return; setDragging(artwork.id); latest.current = null; const target = event.target; if (target && "setPointerCapture" in target && typeof target.setPointerCapture === "function") target.setPointerCapture(event.pointerId); }} onPointerMove={event => move(event, artwork.id)} onPointerUp={event => { event.stopPropagation(); if (latest.current !== null) onMove(artwork.id, latest.current.wallId, latest.current.offset); const target = event.target; if (target && "releasePointerCapture" in target && typeof target.releasePointerCapture === "function") target.releasePointerCapture(event.pointerId); latest.current = null; setDragging(null); setDrop(null); }} onPointerCancel={() => { setDragging(null); setDrop(null); }}>
      <StableGalleryArtwork artwork={artwork} />
      {(selectedId === artwork.id || hovered?.id === artwork.id) && <mesh raycast={() => null} position={[artwork.position[0] + Math.sin(artwork.rotation) * 0.12, exhibitionArtworkLayout(artwork.width, artwork.aspect, artwork.widthMode).centerY, artwork.position[2] + Math.cos(artwork.rotation) * 0.12]} rotation={[0, artwork.rotation, 0]}><planeGeometry args={[exhibitionArtworkLayout(artwork.width, artwork.aspect, artwork.widthMode).width + 0.2, exhibitionArtworkLayout(artwork.width, artwork.aspect, artwork.widthMode).height + 0.2]} /><meshBasicMaterial transparent opacity={selectedId === artwork.id ? 0.12 : 0.08} color={selectionColor} depthWrite={false} /><Edges color={selectionColor} /></mesh>}
    </group>)}
    {draftPlacements.map(draft => {
      const selectedPlacement = draft.placement;
      const draftId = draft.id;
      const pose = placementToPose({ ...selectedPlacement, ...(dragging === draftId && drop ? drop : {}) });
      return <mesh key={draftId} position={[pose.position[0], 2.15, pose.position[2]]} rotation={[0, pose.rotation, 0]} onDoubleClick={event => { event.stopPropagation(); zoom(draftId); }} onPointerDown={event => { event.stopPropagation(); if (draftId !== selectedId) onSelect(draftId); if (!canDrag) return; setDragging(draftId); latest.current = null; const target = event.target; if (target && "setPointerCapture" in target && typeof target.setPointerCapture === "function") target.setPointerCapture(event.pointerId); }} onPointerMove={event => move(event, draftId)} onPointerUp={event => { event.stopPropagation(); if (latest.current !== null) onMove(draftId, latest.current.wallId, latest.current.offset); const target = event.target; if (target && "releasePointerCapture" in target && typeof target.releasePointerCapture === "function") target.releasePointerCapture(event.pointerId); latest.current = null; setDragging(null); setDrop(null); }} onPointerCancel={() => { setDragging(null); setDrop(null); }}><planeGeometry args={[1.5, 1.4]} /><meshBasicMaterial transparent opacity={0.25} color={selectionColor} /><Edges color={selectionColor} /></mesh>;
    })}
    {exhibitionTemplate.walls.filter(wall => wall.roomKey === roomKey).map(wall => {
      const length = wall.range[1] - wall.range[0];
      const pose = placementToPose({ wallId: wall.id, offset: (wall.range[0] + wall.range[1]) / 2, width: 1.5 });
      return <mesh key={wall.id} position={wallInteractionPosition(wall.id, (wall.range[0] + wall.range[1]) / 2)} rotation={[0, pose.rotation, 0]} onDoubleClick={event => {
        event.stopPropagation();
        const dx = wall.b[0] - wall.a[0]; const dz = wall.b[1] - wall.a[1]; const fullLength = Math.hypot(dx, dz);
        const distance = ((event.point.x - wall.a[0]) * dx + (event.point.z - wall.a[1]) * dz) / fullLength;
        onAdd(wall.id, Math.round(distance * 100) / 100);
      }}><planeGeometry args={[length, 3.3]} /><meshBasicMaterial transparent opacity={0.015} depthWrite={false} color={selectionColor} /></mesh>;
    })}
    <OrbitControls ref={controls} key={`room-${roomKey}`} enabled={!dragging} enableRotate={!focusTarget} target={initialOrbitTarget} enablePan={false} enableDamping dampingFactor={0.12} rotateSpeed={0.75} minDistance={0.8} maxDistance={4.8} minPolarAngle={Math.PI / 2} maxPolarAngle={Math.PI / 2} />
  </Canvas></SceneBoundary><button type="button" onClick={resetRoom} className="absolute right-3 top-16 z-20 rounded-md border border-mod-border bg-mod-surface px-3 py-2 text-xs font-semibold text-mod-text shadow-sm hover:bg-mod-canvas-accent focus-visible:outline-2 focus-visible:outline-mod-primary">Về góc nhìn mặc định · Esc</button>{(hovered || selectedId) && <div role="status" className="pointer-events-none absolute left-3 top-3 z-10 max-w-[calc(100%-1.5rem)] rounded-md border border-mod-border bg-mod-surface px-3 py-2 text-xs font-semibold text-mod-text shadow-sm">{hovered?.id === selectedId && selected ? `Đang chỉnh sửa: ${selected.title}` : hovered && selectedPlacement && hovered.id === `${selectedPlacement.wallId}-${selectedPlacement.offset}` ? "Vị trí đang chỉnh sửa" : hovered?.message ?? "Đang chỉnh sửa tranh đã chọn"}</div>}</div>;
}
