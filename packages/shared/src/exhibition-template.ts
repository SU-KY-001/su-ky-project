export const exhibitionTemplate = {
  id: "gallery-1975-v1",
  version: 1,
  rooms: ["room-1", "room-2", "room-3"],
  spawns: [
    { roomKey: "room-1", position: [0, 1.65, 8.5], yaw: 0 },
    { roomKey: "room-2", position: [0, 1.65, -10], yaw: 0 },
    { roomKey: "room-3", position: [0, 1.65, -26], yaw: 0 },
  ],
  walls: [
    { id: "room-1-west", roomKey: "room-1", a: [-6, -8], b: [-6, 12], normal: [1, 0], range: [1, 19] },
    { id: "room-1-north", roomKey: "room-1", a: [-6, -8], b: [6, -8], normal: [0, 1], range: [1, 8] },
    { id: "room-1-east", roomKey: "room-1", a: [6, -1], b: [6, 12], normal: [-1, 0], range: [1, 12] },
    { id: "room-2-south", roomKey: "room-2", a: [-6, -24], b: [-6, -8], normal: [1, 0], range: [1, 15] },
    { id: "room-2-east", roomKey: "room-2", a: [6, -20], b: [6, -8], normal: [-1, 0], range: [1, 11] },
    { id: "room-2-north", roomKey: "room-2", a: [-6, -24], b: [2, -24], normal: [0, 1], range: [1, 7] },
    { id: "room-3-west", roomKey: "room-3", a: [-6, -38], b: [-6, -24], normal: [1, 0], range: [1, 13] },
    { id: "room-3-east", roomKey: "room-3", a: [6, -40], b: [6, -24], normal: [-1, 0], range: [1, 15] },
    { id: "room-3-north", roomKey: "room-3", a: [-4, -40], b: [6, -40], normal: [0, 1], range: [1, 9] },
  ],
  suggestions: [
    { wallId: "room-1-west", offset: 14.6 }, { wallId: "room-1-west", offset: 7.5 }, { wallId: "room-1-north", offset: 2.3 }, { wallId: "room-1-east", offset: 8 },
    { wallId: "room-2-east", offset: 5.6 }, { wallId: "room-2-south", offset: 3 }, { wallId: "room-2-south", offset: 13 }, { wallId: "room-2-north", offset: 3.1 },
    { wallId: "room-3-west", offset: 6.4 }, { wallId: "room-3-east", offset: 9 }, { wallId: "room-3-east", offset: 3 }, { wallId: "room-3-north", offset: 4.2 },
  ],
  reservedAreas: [
    { wallId: "room-1-north", start: 8.4, end: 11 },
    { wallId: "room-2-south", start: 6.7, end: 8.3 },
    { wallId: "room-3-west", start: 1.3, end: 3.9 },
  ],
  floorAreas: [{ x: 0, z: 2, width: 12, depth: 20 }, { x: 0, z: -16, width: 12, depth: 16 }, { x: 0, z: -32, width: 12, depth: 16 }],
} as const;

export function getExhibitionTemplate(id: string, version: number): typeof exhibitionTemplate | undefined {
  return id === exhibitionTemplate.id && version === exhibitionTemplate.version ? exhibitionTemplate : undefined;
}
