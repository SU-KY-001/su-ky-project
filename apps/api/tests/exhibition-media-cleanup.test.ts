import { expect, it } from "bun:test";
import { exhibitionMediaIds } from "../src/core/jobs/maintenance-jobs";

it("protects images, covers and audio in both draft and published exhibitions", () => {
  const docs = [{ draftDocument: { metadata: { coverAssetId: "cover" }, audioAssetId: "audio", items: [{ imageAssetId: "draft" }] }, publishedDocument: { metadata: { coverAssetId: null }, audioAssetId: null, items: [{ imageAssetId: "published" }] } }];
  expect(exhibitionMediaIds(docs)).toEqual(["cover", "audio", "draft", "published"]);
});
