import { describe, expect, test } from "bun:test";
import { DIALOGUE_MAX_SPEAKERS, DIALOGUE_MAX_TURNS, DIALOGUE_TAGS, DIALOGUE_TURN_MAX_CHARS } from "@repo/shared";
import { DIALOGUE_TAG_CUE, addSpeaker, assignTurns, dialogueIssues, dialogueSegments, importTurns, insertTag, moveTurn, newDialogue, newTurn, nextSpeakerKey, nextTurnSpeaker, removeSpeaker, removeTurn, splitScript, unassignedTurns, updateSpeaker, updateTurn } from "./dialogueState";

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
    expect(dialogueIssues(updateSpeaker(ok, "B", { voice: ok.speakers[0].voice }))).toEqual(["Các người nói phải khác giọng"]);
  });
});

describe("speakers", () => {
  test("addSpeaker gives the smallest free key S3.., a free voice and name; capped at 30", () => {
    let dialogue = addSpeaker(newDialogue());
    expect(dialogue.speakers.at(-1)).toMatchObject({ key: "S3", name: "Người nói 3" });
    expect(new Set(dialogue.speakers.map((s) => s.voice)).size).toBe(3);
    while (dialogue.speakers.length < DIALOGUE_MAX_SPEAKERS) dialogue = addSpeaker(dialogue);
    expect(addSpeaker(dialogue)).toBe(dialogue);
    expect(new Set(dialogue.speakers.map((s) => s.key)).size).toBe(DIALOGUE_MAX_SPEAKERS);
  });

  test("a freed key is reused; removal is blocked while turns use the speaker or at 2 speakers", () => {
    let dialogue = addSpeaker(addSpeaker(newDialogue()));
    dialogue = { ...dialogue, turns: [newTurn("S4")] };
    const blocked = removeSpeaker(dialogue, "S4");
    expect(blocked.blockedBy).toBe(1);
    expect(blocked.dialogue).toBe(dialogue);
    const removed = removeSpeaker(dialogue, "S3");
    expect(removed.dialogue.speakers.map((s) => s.key)).toEqual(["A", "B", "S4"]);
    expect(nextSpeakerKey(removed.dialogue)).toBe("S3");
    expect(removeSpeaker(newDialogue(), "B").dialogue.speakers).toHaveLength(2);
  });
});

describe("paste, split and assign", () => {
  test("splitScript splits on blank lines, trims, drops empties and cuts over-long paragraphs", () => {
    expect(splitScript("Một.\r\n\r\n\r\n  Hai.  \n\n\nBa.").paragraphs).toEqual(["Một.", "Hai.", "Ba."]);
    const long = splitScript("Câu một dài. Câu hai dài. Câu ba dài.", 15);
    expect(long.splitLong).toBe(1);
    expect(long.paragraphs.every((p) => p.length <= 15)).toBe(true);
    expect(long.paragraphs.join(" ").replace(/\s+/g, "")).toBe("Câumộtdài.Câuhaidài.Câubadài.");
    expect(splitScript("x".repeat(DIALOGUE_TURN_MAX_CHARS + 1)).paragraphs.map((p) => p.length)).toEqual([DIALOGUE_TURN_MAX_CHARS, 1]);
  });

  test("importTurns replace/append keep an unassigned state; over 300 turns is an error, not a cut", () => {
    const base = newDialogue();
    const replaced = importTurns(base, ["a", "b", "c"], "replace");
    if ("error" in replaced) throw new Error(replaced.error);
    expect(replaced.dialogue.turns.map((t) => t.speaker)).toEqual(["", "", ""]);
    const withText = updateTurn(base, base.turns[0]!.id, { text: "đã có" });
    const appended = importTurns(withText, ["x"], "append");
    if ("error" in appended) throw new Error(appended.error);
    expect(appended.dialogue.turns.map((t) => t.text)).toEqual(["đã có", "x"]);
    const blankStart = importTurns(base, ["x"], "append");
    if ("error" in blankStart) throw new Error(blankStart.error);
    expect(blankStart.dialogue.turns).toHaveLength(2); // the lone starter turn is blank but assigned, so it stays
    expect("error" in importTurns(base, Array(DIALOGUE_MAX_TURNS + 1).fill("a"), "replace")).toBe(true);
  });

  test("unassigned turns are listed by id, block validation, and bulk assign clears them", () => {
    const imported = importTurns(newDialogue(), ["a", "b", "c"], "replace");
    if ("error" in imported) throw new Error(imported.error);
    const { dialogue } = imported;
    expect(unassignedTurns(dialogue)).toEqual(dialogue.turns.map((t) => t.id));
    expect(dialogueIssues(dialogue)).toEqual(["Lượt 1: chưa gán người nói", "Lượt 2: chưa gán người nói", "Lượt 3: chưa gán người nói"]);
    const picked = new Set([dialogue.turns[0]!.id, dialogue.turns[2]!.id]);
    const assigned = assignTurns(dialogue, picked, "B");
    expect(assigned.turns.map((t) => t.speaker)).toEqual(["B", "", "B"]);
    expect(unassignedTurns(assigned)).toEqual([dialogue.turns[1]!.id]);
  });

  test("nextTurnSpeaker rotates through every speaker and wraps", () => {
    const three = addSpeaker(newDialogue());
    expect(nextTurnSpeaker({ ...three, turns: [newTurn("A")] })).toBe("B");
    expect(nextTurnSpeaker({ ...three, turns: [newTurn("S3")] })).toBe("A");
    expect(nextTurnSpeaker({ ...three, turns: [newTurn("")] })).toBe("A");
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
