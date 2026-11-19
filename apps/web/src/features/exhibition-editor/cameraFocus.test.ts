import { expect, test } from "bun:test";
import { artworkFocusId, editorRoomView, constrainEditorPosition, artworkEditorView } from "./cameraFocus";

test("explicit artwork focus moves close to the picture rather than orbiting the room centre", () => {
  const view = artworkEditorView("room-1", { position: [0, 2.15, 11.81], rotation: Math.PI });
  expect(view.target).toEqual([0, 2.15, 11.81]);
  expect(view.position[2]).toBeCloseTo(9.21);
  expect(artworkFocusId("new", "new", null, false)).toBe("new");
});

test("orbit camera remains inside the active room instead of passing through walls or ceiling", () => {
  expect(constrainEditorPosition([50, 20, 50], "room-1")).toEqual([5.5, 3.5, 11.5]);
  expect(constrainEditorPosition([-50, -10, -50], "room-1")).toEqual([-5.5, 0.8, -7.5]);
  expect(constrainEditorPosition([0, 2, -16], "room-2")).toEqual([0, 2, -16]);
});

test("a full horizontal orbit around the fixed room axis needs no wall correction", () => {
  for (const roomKey of ["room-1", "room-2", "room-3"]) {
    const { target } = editorRoomView(roomKey);
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 12) {
      const position: [number, number, number] = [target[0] + Math.sin(angle) * 4.8, target[1], target[2] + Math.cos(angle) * 4.8];
      expect(constrainEditorPosition(position, roomKey)).toEqual(position);
    }
  }
});

test("default editor camera stands at the far end and faces away from the chapter wall", () => {
  const view = editorRoomView("room-1");
  expect(view.position).toEqual([0, 2.15, -2.5]);
  expect(view.target).toEqual([0, 2.15, 2]);
  expect(view.position[1]).toBe(view.target[1]);
  expect(view.target[2]).toBeGreaterThan(view.position[2]);
  for (const roomKey of ["room-2", "room-3"]) expect(editorRoomView(roomKey).target[2]).toBeGreaterThan(editorRoomView(roomKey).position[2]);
});

test("selection supersedes the previously zoomed artwork", () => {
  expect(artworkFocusId("new-artwork", "old-artwork", null)).toBe("new-artwork");
  expect(artworkFocusId("new-empty-slot", "old-artwork", null)).toBe("new-empty-slot");
});

test("creating an artwork keeps the room view while explicit selection still focuses", () => {
  expect(artworkFocusId("new", "previous", null, false)).toBeNull();
  expect(artworkFocusId("new", "previous", null, true)).toBe("new");
});

test("room reset releases the selected artwork until another selection or explicit zoom", () => {
  expect(artworkFocusId("one", null, "one")).toBeNull();
  expect(artworkFocusId("two", null, "one")).toBe("two");
  expect(artworkFocusId("one", "one", "one")).toBe("one");
  expect(artworkFocusId(null, "one", null)).toBeNull();
});
