import { Component, memo, useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from "react";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { Edges, OrbitControls } from "@react-three/drei";
import { NoToneMapping, Plane, Vector3 } from "three";
import { exhibitionArtworkLayout, exhibitionTemplate, type ExhibitionDocument, type ResolvedExhibition } from "@repo/shared";
import { GalleryArchitecture, GalleryArtwork, GalleryArtworkLights, GalleryCeilingLights, galleryPalette, placementToPose, resolvedArtworks, type GalleryView } from "@/features/exhibition";

const StableGalleryArchitecture = memo(GalleryArchitecture);
const StableGalleryArtwork = memo(GalleryArtwork);

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } { return { failed: true }; }
  render(): ReactNode { return this.state.failed ? <p className="p-5 text-sm">Không thể bố trí bằng 3D trên thiết bị này. Bạn vẫn có thể chọn điểm và sửa nội dung trong danh sách.</p> : this.props.children; }
}

function FocusArtwork({ artwork, roomKey, initialView, onViewChange }: { artwork: ReturnType<typeof resolvedArtworks>[number] | undefined; roomKey: string; initialView?: GalleryView; onViewChange: (view: GalleryView) => void }): null {
  const { camera } = useThree();
  const first = useRef(true);
  useEffect(() => () => onViewChange({ position: [camera.position.x, camera.position.y, camera.position.z], yaw: camera.rotation.y, revision: (initialView?.revision ?? 0) + 1 }), [camera]);
  useEffect(() => {
    if (first.current && initialView) { first.current = false; camera.position.set(...initialView.position); camera.rotation.set(-0.13, initialView.yaw, 0, "YXZ"); return; }
    first.current = false;
    if (!artwork) {
      const spawn = exhibitionTemplate.spawns.find(value => value.roomKey === roomKey);
      if (spawn) { camera.position.set(spawn.position[0], spawn.position[1], spawn.position[2]); camera.rotation.set(-0.13, spawn.yaw, 0, "YXZ"); }
      return;
    }
    camera.position.set(artwork.position[0] + Math.sin(artwork.rotation) * 3 - Math.cos(artwork.rotation) * 2, 1.8, artwork.position[2] + Math.cos(artwork.rotation) * 3 + Math.sin(artwork.rotation) * 2);
    camera.lookAt(artwork.position[0] + Math.sin(artwork.rotation) * 0.6 + Math.cos(artwork.rotation) * 0.35, 1.75, artwork.position[2] + Math.cos(artwork.rotation) * 0.6 - Math.sin(artwork.rotation) * 0.35);
  }, [camera, artwork?.id, roomKey]);
  return null;
}

export function EditorScene({ exhibition, selectedId, selectedPlacement, roomKey, initialView, onViewChange, onSelect, onMove, onAdd, canDrag }: { exhibition: ResolvedExhibition; selectedId: string | null; selectedPlacement?: ExhibitionDocument["items"][number]["placement"]; roomKey: string; initialView?: GalleryView; onViewChange: (view: GalleryView) => void; onSelect: (id: string) => void; onMove: (id: string, offset: number) => void; onAdd: (wallId: string, offset: number) => void; canDrag: boolean }): ReactElement {
  const [hovered, setHovered] = useState<{ id: string; message: string } | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [offset, setOffset] = useState<number | null>(null);
  const latest = useRef<number | null>(null);
  const artworks = useMemo(() => resolvedArtworks({ ...exhibition, items: exhibition.items.map(item => item.id === dragging && offset !== null ? { ...item, placement: { ...item.placement, offset } } : item) }), [exhibition, dragging, offset]);
  const selected = resolvedArtworks(exhibition).find(item => item.id === selectedId);
  const spawn = exhibitionTemplate.spawns.find(value => value.roomKey === roomKey) ?? exhibitionTemplate.spawns[0];
  const move = (event: ThreeEvent<PointerEvent>, id: string): void => {
    if (dragging !== id) return;
    event.stopPropagation();
    const item = exhibition.items.find(value => value.id === id);
    const wall = exhibitionTemplate.walls.find(value => value.id === item?.placement.wallId);
    if (!wall) return;
    const normal = new Vector3(wall.normal[0], 0, wall.normal[1]);
    const plane = new Plane().setFromNormalAndCoplanarPoint(normal, new Vector3(wall.a[0], 0, wall.a[1]));
    const point = event.ray.intersectPlane(plane, new Vector3());
    if (!point) return;
    const dx = wall.b[0] - wall.a[0]; const dz = wall.b[1] - wall.a[1]; const length = Math.hypot(dx, dz);
    const next = Math.max(0, Math.min(length, ((point.x - wall.a[0]) * dx + (point.z - wall.a[1]) * dz) / length));
    latest.current = next; setOffset(next);
  };
  const selectionColor = getComputedStyle(document.documentElement).getPropertyValue("--modPrimary").trim();
  return <div className="relative h-full min-h-[480px] w-full"><SceneBoundary><Canvas style={{ cursor: dragging ? "grabbing" : hovered ? "pointer" : "grab" }} onPointerLeave={() => setHovered(null)} gl={{ antialias: true, powerPreference: "high-performance", alpha: false, toneMapping: NoToneMapping }} fallback={<p className="p-5 text-sm">Thiết bị không hỗ trợ bố trí 3D; bạn vẫn có thể sửa nội dung theo danh sách.</p>} camera={{ position: [0.6, 1.65, 9.4], fov: 66 }}><color attach="background" args={[galleryPalette.wall]} /><ambientLight intensity={0.55} color={galleryPalette.light} /><hemisphereLight args={[galleryPalette.light, galleryPalette.floor, 0.35]} /><directionalLight position={[-3, 8, 6]} intensity={Math.PI * 0.078} color={galleryPalette.light} /><StableGalleryArchitecture chapterText={exhibition.chapters} artworks={artworks} /><GalleryCeilingLights /><GalleryArtworkLights artworks={artworks} /><FocusArtwork artwork={selected} roomKey={roomKey} initialView={initialView} onViewChange={onViewChange} />
    {artworks.map(artwork => <group key={artwork.id} onPointerOver={event => { event.stopPropagation(); setHovered({ id: artwork.id, message: selectedId === artwork.id ? `Đang chỉnh sửa: ${artwork.title}` : `Nhấn để chỉnh sửa: ${artwork.title}` }); }} onPointerOut={event => { event.stopPropagation(); setHovered(current => current?.id === artwork.id ? null : current); }} onPointerDown={event => { event.stopPropagation(); if (selectedId !== artwork.id) { onSelect(artwork.id); return; } if (!canDrag) return; setDragging(artwork.id); latest.current = null; const target = event.target; if (target && "setPointerCapture" in target && typeof target.setPointerCapture === "function") target.setPointerCapture(event.pointerId); }} onPointerMove={event => move(event, artwork.id)} onPointerUp={event => { event.stopPropagation(); if (latest.current !== null) onMove(artwork.id, latest.current); setDragging(null); setOffset(null); }} onPointerCancel={() => { setDragging(null); setOffset(null); }}>
      <StableGalleryArtwork artwork={artwork} />
      {(selectedId === artwork.id || hovered?.id === artwork.id) && <mesh raycast={() => null} position={[artwork.position[0] + Math.sin(artwork.rotation) * 0.12, exhibitionArtworkLayout(artwork.width, artwork.aspect, artwork.widthMode).centerY, artwork.position[2] + Math.cos(artwork.rotation) * 0.12]} rotation={[0, artwork.rotation, 0]}><planeGeometry args={[exhibitionArtworkLayout(artwork.width, artwork.aspect, artwork.widthMode).width + 0.2, exhibitionArtworkLayout(artwork.width, artwork.aspect, artwork.widthMode).height + 0.2]} /><meshBasicMaterial transparent opacity={selectedId === artwork.id ? 0.12 : 0.08} color={selectionColor} depthWrite={false} /><Edges color={selectionColor} /></mesh>}
    </group>)}
    {exhibitionTemplate.suggestions.filter(suggestion => exhibitionTemplate.walls.find(wall => wall.id === suggestion.wallId)?.roomKey === roomKey && !exhibition.items.some(item => item.placement.wallId === suggestion.wallId && Math.abs(item.placement.offset - suggestion.offset) < 2)).map(suggestion => {
      const pose = placementToPose({ ...suggestion, width: 2 });
      const id = `${suggestion.wallId}-${suggestion.offset}`;
      const selectedSlot = selectedPlacement?.wallId === suggestion.wallId && selectedPlacement.offset === suggestion.offset;
      const highlighted = selectedSlot || hovered?.id === id;
      return <mesh key={id} position={pose.position} rotation={[0, pose.rotation, 0]} onPointerOver={event => { event.stopPropagation(); setHovered({ id, message: selectedSlot ? "Vị trí đang chỉnh sửa" : "Nhấn để thêm tranh tại vị trí này" }); }} onPointerOut={event => { event.stopPropagation(); setHovered(current => current?.id === id ? null : current); }} onClick={event => { event.stopPropagation(); if (!selectedSlot) onAdd(suggestion.wallId, suggestion.offset); }}><planeGeometry args={[1.2, 1.4]} /><meshBasicMaterial color={highlighted ? selectionColor : galleryPalette.light} transparent opacity={highlighted ? 0.4 : 0.22} depthWrite={false} /><Edges color={highlighted ? selectionColor : galleryPalette.light} /></mesh>;
    })}
    <OrbitControls enabled={!dragging} target={selected ? [selected.position[0] + Math.sin(selected.rotation) * 0.6 + Math.cos(selected.rotation) * 0.35, 1.75, selected.position[2] + Math.cos(selected.rotation) * 0.6 - Math.sin(selected.rotation) * 0.35] : initialView ? [initialView.position[0] - Math.sin(initialView.yaw) * 5, 1.65, initialView.position[2] - Math.cos(initialView.yaw) * 5] : [spawn.position[0] - Math.sin(spawn.yaw) * 5, 1.65, spawn.position[2] - Math.cos(spawn.yaw) * 5]} enablePan={false} />
  </Canvas></SceneBoundary>{(hovered || selectedId) && <div role="status" className="pointer-events-none absolute left-3 top-3 z-10 max-w-[calc(100%-1.5rem)] rounded-md border border-mod-border bg-mod-surface px-3 py-2 text-xs font-semibold text-mod-text shadow-sm">{hovered?.id === selectedId && selected ? `Đang chỉnh sửa: ${selected.title}` : hovered && selectedPlacement && hovered.id === `${selectedPlacement.wallId}-${selectedPlacement.offset}` ? "Vị trí đang chỉnh sửa" : hovered?.message ?? "Đang chỉnh sửa tranh đã chọn"}</div>}</div>;
}
