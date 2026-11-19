import { exhibitionTemplate } from "@repo/shared";

export function constrainEditorPosition(position: readonly number[], roomKey: string): [number, number, number] {
  const index = exhibitionTemplate.spawns.findIndex(value => value.roomKey === roomKey);
  const room = exhibitionTemplate.floorAreas[index] ?? exhibitionTemplate.floorAreas[0];
  const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));
  return [clamp(position[0] ?? room.x, room.x - room.width / 2 + 0.5, room.x + room.width / 2 - 0.5), clamp(position[1] ?? 2.15, 0.8, 3.5), clamp(position[2] ?? room.z, room.z - room.depth / 2 + 0.5, room.z + room.depth / 2 - 0.5)];
}

export function editorRoomView(roomKey: string): { position: [number, number, number]; target: [number, number, number] } {
  const index = exhibitionTemplate.spawns.findIndex(value => value.roomKey === roomKey);
  const room = exhibitionTemplate.floorAreas[index] ?? exhibitionTemplate.floorAreas[0];
  return { position: [room.x, 2.15, room.z - 4.5], target: [room.x, 2.15, room.z] };
}

export function artworkFocusId(selectedId: string | null, zoomedId: string | null, dismissedId: string | null, focusSelection = true): string | null {
  if (!selectedId) return null;
  if (zoomedId === selectedId) return selectedId;
  if (!focusSelection) return null;
  return selectedId === dismissedId ? null : selectedId;
}

export function artworkEditorView(roomKey: string, artwork: { position: readonly number[]; rotation: number }): { position: [number, number, number]; target: [number, number, number] } {
  const target: [number, number, number] = [artwork.position[0] ?? 0, 2.15, artwork.position[2] ?? 0];
  return { target, position: constrainEditorPosition([target[0] + Math.sin(artwork.rotation) * 2.6, 2.15, target[2] + Math.cos(artwork.rotation) * 2.6], roomKey) };
}
