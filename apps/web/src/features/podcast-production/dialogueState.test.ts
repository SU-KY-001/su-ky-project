import { describe, expect, test } from "bun:test";
import { DIALOGUE_TAGS } from "@repo/shared";
import { DIALOGUE_TAG_CUE, dialogueIssues, dialogueSegments, insertTag, moveTurn, newDialogue, newTurn, removeTurn, updateSpeaker, updateTurn } from "./dialogueState";

describe("dialogue editing", () => {
  test("every allowed tag has a stage direction for the recorder", () => {
    for (const tag of DIALOGUE_TAGS) expect(DIALOGUE_TAG_CUE[tag]).toBeTruthy();
  });

  test("turn ids survive reorder and edits; the last turn cannot be removed", () => {
    let dialogue = newDialogue();
    const [first] = dialogue.turns;
    const second = newTurn("B");
    dialogue = { ...dialogue, turns: [first!, second] };
    dialogue = moveTurn(dialogue, first!.id, 1);
    expect(dialogue.turns.map((turn) => turn.id)).toEqual([second.id, first!.id]);
    expect(moveTurn(dialogue, second.id, -1)).toBe(dialogue);
    dialogue = updateTurn(dialogue, first!.id, { text: "Xin chào" });
    expect(dialogue.turns[1]).toMatchObject({ id: first!.id, text: "Xin chào" });
    dialogue = removeTurn(removeTurn(dialogue, second.id), first!.id);
    expect(dialogue.turns.map((turn) => turn.id)).toEqual([first!.id]);
  });

  test("insertTag adds a spaced tag at the caret and clamps the position", () => {
    expect(insertTag("Chào bạn", 4, "laugh")).toEqual({ text: "Chào <laugh>  bạn", caret: 13 });
    expect(insertTag("", 0, "sigh")).toEqual({ text: "<sigh> ", caret: 7 });
    expect(insertTag("Xin", 99, "breath").text).toBe("Xin <breath> ");
  });

  test("issues describe what the server would reject, by turn", () => {
    const dialogue = newDialogue();
    expect(dialogueIssues(dialogue)).toEqual(["Lượt 1: chưa có lời"]);
    const ok = updateTurn(dialogue, dialogue.turns[0]!.id, { text: "<laugh> Xin chào |ừ|" });
    expect(dialogueIssues(ok)).toEqual([]);
    expect(dialogueIssues(updateTurn(ok, ok.turns[0]!.id, { text: "<shout> hi" }))[0]).toStartWith("Lượt 1:");
    expect(dialogueIssues(updateSpeaker(ok, "B", { voice: ok.speakers[0].voice }))).toEqual(["Hai người nói phải khác giọng"]);
  });
});

describe("dialogueSegments", () => {
  test("splits spoken text, stage directions and replies in order", () => {
    expect(dialogueSegments("<chuckle> Ừ, đúng |ừm| rồi <short pause>")).toEqual([
      { kind: "cue", value: "cười khẽ" },
      { kind: "text", value: " Ừ, đúng " },
      { kind: "reply", value: "ừm" },
      { kind: "text", value: " rồi " },
      { kind: "cue", value: "nghỉ ngắn" },
    ]);
    expect(dialogueSegments("Chỉ lời")).toEqual([{ kind: "text", value: "Chỉ lời" }]);
  });
});
