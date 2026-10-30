import { expect, it } from "bun:test";
import { QuizDraftDataSchema } from "@repo/shared";
import { app } from "../src/app";

it("keeps an optional quiz poster in the saved draft while supporting old drafts", () => {
  const draft = { title: "Ôn tập", description: "Lịch sử", passScorePercent: 80, questions: [{ id: "q", text: "", options: ["", "", "", ""], correctIndex: null, explanation: "", evidence: null, timeLimit: 20 }] };
  const assetId = "7c1dfbb7-6e58-4be5-9c17-c9d9a3106a2c";
  expect(QuizDraftDataSchema.parse({ ...draft, posterAssetId: assetId })).toHaveProperty("posterAssetId", assetId);
  expect(QuizDraftDataSchema.parse(draft).posterAssetId).toBeUndefined();
});

it("requires a session before serving quiz questions", async () => {
  const response = await app.request("/api/episodes/example/quiz");
  expect(response.status).toBe(401);
});
