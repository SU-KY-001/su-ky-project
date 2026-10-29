import { expect, test } from "bun:test";
import { exhibitionArtworkLayout, exhibitionTemplate, ExhibitionDocumentSchema, ExhibitionListQuerySchema, ExhibitionWorkspaceSchema, validateExhibitionPlacements } from "@repo/shared";

const chapters = ["room-1", "room-2", "room-3"].map((roomKey, index) => ({
  id: `00000000-0000-4000-8000-00000000000${index + 1}`, roomKey,
  title: `Chương ${index + 1}`, period: "", description: "",
}));
const document = {
  schemaVersion: 1, templateId: "gallery-1975-v1", templateVersion: 1,
  metadata: { title: "Triển lãm", subtitle: "", description: "", coverAssetId: null }, chapters, items: [],
};

test("a gallery supports one to three ordered rooms and an optional shared audio asset", () => {
  for (const count of [1, 2, 3]) expect(ExhibitionDocumentSchema.safeParse({ ...document, chapters: chapters.slice(0, count), audioAssetId: chapters[0]!.id }).success).toBe(true);
  expect(ExhibitionDocumentSchema.safeParse({ ...document, chapters: [] }).success).toBe(false);
  expect(ExhibitionDocumentSchema.safeParse({ ...document, audioAssetId: "bad" }).success).toBe(false);
  expect(ExhibitionDocumentSchema.parse(document).audioAssetId).toBeUndefined();
});

test("exhibition document validates room keys, references and source URLs", () => {
  expect(ExhibitionDocumentSchema.safeParse(document).success).toBe(true);
  expect(ExhibitionDocumentSchema.safeParse({ ...document, chapters: [chapters[0], chapters[0], chapters[2]] }).success).toBe(false);
  const item = { id: "00000000-0000-4000-8000-000000000004", chapterId: chapters[0]!.id, imageAssetId: "00000000-0000-4000-8000-000000000005", title: "Ảnh", description: "", displayDate: "", credit: "", sourceUrl: "", rights: "", narrationId: null, placement: { wallId: "room-1-west", offset: 5, width: 2 } };
  expect(ExhibitionDocumentSchema.safeParse({ ...document, items: [item] }).success).toBe(true);
  expect(ExhibitionDocumentSchema.safeParse({ ...document, items: [{ ...item, sourceUrl: "javascript:alert(1)" }] }).success).toBe(false);
  expect(ExhibitionDocumentSchema.safeParse({ ...document, items: [{ ...item, chapterId: chapters[1]!.id }] }).success).toBe(false);
  expect(ExhibitionDocumentSchema.safeParse({ ...document, items: [item, item] }).success).toBe(false);
});

test("exhibition layout fits portrait and landscape artwork with its caption", () => {
  for (const [width, aspect] of [[3.6, 850 / 595], [1.3, 378 / 614], [8, 0.5]] as const) {
    const layout = exhibitionArtworkLayout(width, aspect);
    expect(layout.width / layout.height).toBeCloseTo(aspect);
    expect(layout.labelCenterY - 0.48 / 2).toBeGreaterThan(0.1);
    expect(layout.width).toBeCloseTo(Math.min(width * 0.68, 1.45 * aspect));
  }
});

test("new actual-width placement can display large artwork while legacy widths retain their scale", () => {
  expect(exhibitionArtworkLayout(3, 1.5).width).toBeCloseTo(2.04);
  expect(exhibitionArtworkLayout(3, 1.5, "actual").width).toBeCloseTo(3);
  const portrait = exhibitionArtworkLayout(3, 0.5, "actual");
  expect(portrait.height).toBeLessThanOrEqual(2.8);
  expect(portrait.labelCenterY - 0.48 / 2).toBeGreaterThan(0.1);
});

test("placement validation uses verified image dimensions and prevents overlap and wall overflow", () => {
  const makeItem = (id: string, offset: number) => ({ id, chapterId: chapters[0]!.id, imageAssetId: id, title: "Ảnh", description: "", displayDate: "", credit: "", sourceUrl: "", rights: "", narrationId: null, placement: { wallId: "room-1-west", offset, width: 3 } });
  const a = makeItem("00000000-0000-4000-8000-000000000004", 5);
  const b = makeItem("00000000-0000-4000-8000-000000000005", 6);
  const sizes = { [a.id]: { width: 800, height: 600 }, [b.id]: { width: 800, height: 600 } };
  const parsed = ExhibitionDocumentSchema.parse({ ...document, items: [a, b] });
  expect(validateExhibitionPlacements(parsed, sizes).length).toBeGreaterThan(0);
  expect(validateExhibitionPlacements(ExhibitionDocumentSchema.parse({ ...document, items: [{ ...a, placement: { ...a.placement, offset: 1 } }] }), sizes).length).toBeGreaterThan(0);
  expect(validateExhibitionPlacements(ExhibitionDocumentSchema.parse({ ...document, items: [a] }), sizes)).toEqual([]);
  expect(validateExhibitionPlacements(ExhibitionDocumentSchema.parse({ ...document, items: [a] }), {} ).length).toBeGreaterThan(0);
});

test("workspace contract validates saved document and list pagination", () => {
  expect(ExhibitionListQuerySchema.parse({})).toMatchObject({ page: 1, limit: 10 });
  expect(ExhibitionListQuerySchema.safeParse({ limit: 51 }).success).toBe(false);
  const workspace = { id: chapters[0]!.id, slug: "trien-lam", revision: 1, updatedAt: "2026-10-28T00:00:00.000Z", publicationStatus: "UNPUBLISHED", publishedRevision: null, document, resolved: { metadata: document.metadata, chapters, items: [] }, allowedActions: ["edit", "publish"] };
  expect(ExhibitionWorkspaceSchema.safeParse(workspace).success).toBe(true);
  expect(ExhibitionWorkspaceSchema.safeParse({ ...workspace, revision: 0 }).success).toBe(false);
});

test("the twelve legacy artwork positions remain inside their suggested wall areas", () => {
  const widths = [3.25, 2.65, 3.6, 2.6, 3.6, 2.8, 3.1, 1.3, 2.8, 2.7, 2.8, 3.7];
  const aspects = [850 / 558, 877 / 614, 926 / 614, 709 / 500, 850 / 595, 1072 / 781, 850 / 535, 378 / 614, 850 / 570, 850 / 564, 850 / 562, 850 / 550];
  const images: Record<string, { width: number; height: number }> = {};
  const legacySuggestions = [
    { wallId: "room-1-west", offset: 14.6 }, { wallId: "room-1-west", offset: 7.5 }, { wallId: "room-1-north", offset: 4.6 }, { wallId: "room-1-east", offset: 6.2 },
    { wallId: "room-2-east", offset: 5.6 }, { wallId: "room-2-south", offset: 4.7 }, { wallId: "room-2-south", offset: 11.7 }, { wallId: "room-2-north", offset: 3.1 },
    { wallId: "room-3-west", offset: 8.4 }, { wallId: "room-3-east", offset: 11.5 }, { wallId: "room-3-east", offset: 5 }, { wallId: "room-3-north", offset: 4.2 },
  ];
  const items = legacySuggestions.map((suggestion, index) => {
    const id = `00000000-0000-4000-8000-${String(index + 10).padStart(12, "0")}`;
    const wall = exhibitionTemplate.walls.find(value => value.id === suggestion.wallId)!;
    const chapter = chapters.find(value => value.roomKey === wall.roomKey)!;
    images[id] = { width: aspects[index]!, height: 1 };
    return { id, chapterId: chapter.id, imageAssetId: id, title: `Ảnh ${index + 1}`, description: "", displayDate: "", credit: "", sourceUrl: "", rights: "", narrationId: null, placement: { ...suggestion, width: widths[index]! } };
  });
  expect(validateExhibitionPlacements(ExhibitionDocumentSchema.parse({ ...document, items }), images)).toEqual([]);
});

test("placement cannot cover a chapter label on the wall", () => {
  const imageId = "00000000-0000-4000-8000-000000000020";
  const item = { id: imageId, chapterId: chapters[1]!.id, imageAssetId: imageId, title: "Ảnh", description: "", displayDate: "", credit: "", sourceUrl: "", rights: "", narrationId: null, placement: { wallId: "room-2-south", offset: 7.5, width: 2 } };
  expect(validateExhibitionPlacements(ExhibitionDocumentSchema.parse({ ...document, items: [item] }), { [imageId]: { width: 800, height: 600 } })).not.toEqual([]);
});

test("saved offsets remain valid after the gallery rooms are aligned", () => {
  for (const wall of exhibitionTemplate.walls) {
    const length = Math.hypot(wall.b[0] - wall.a[0], wall.b[1] - wall.a[1]);
    expect(wall.range[1]).toBeLessThanOrEqual(length);
    expect(wall.range[0]).toBeGreaterThanOrEqual(0);
  }
  expect(exhibitionTemplate.spawns.map(spawn => spawn.position[2])).toEqual([8.5, -10, -26]);
});

test("suggested slots leave room for artwork beside wall columns", () => {
  const columnZ = [5, -3, -13, -19, -29, -35];
  for (const suggestion of exhibitionTemplate.suggestions) {
    const wall = exhibitionTemplate.walls.find(value => value.id === suggestion.wallId)!;
    if (wall.a[0] !== wall.b[0] || Math.abs(wall.a[0]) !== 6) continue;
    const z = wall.a[1] + Math.sign(wall.b[1] - wall.a[1]) * suggestion.offset;
    for (const column of columnZ) expect(Math.abs(z - column)).toBeGreaterThanOrEqual(1);
  }
});

test("the first room front-wall suggestion stays clear of the chapter panel", () => {
  const slot = exhibitionTemplate.suggestions.find(value => value.wallId === "room-1-north")!;
  const wall = exhibitionTemplate.walls.find(value => value.id === slot.wallId)!;
  const rightEdge = wall.a[0] + slot.offset + 1.5 / 2;
  expect(rightEdge).toBeLessThan(-1.9);
});
