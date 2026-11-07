import { describe, expect, it } from "bun:test";
import {
  narrativeSelectionFromNodeInput,
  type NarrativeSelectionPayload,
} from "../src/modules/script-workflow/domain/agent-job-queue";

const SELECTION: NarrativeSelectionPayload = {
  selectedFocusType: "DIEN_BIEN",
  seriesTitle: "Series",
  episodeTitles: ["Tập 1", "Tập 2", "Tập 3"],
  editorialNotes: "ghi chú",
};

describe("narrativeSelectionFromNodeInput", () => {
  it("recovers the Gate 0 selection stored in a node input so later gates keep it", () => {
    expect(narrativeSelectionFromNodeInput({ guidance: null, narrativeSelection: SELECTION })).toEqual(SELECTION);
  });

  it("returns undefined when the node was produced without a selection", () => {
    expect(narrativeSelectionFromNodeInput({ directEdit: true, narrativeSelection: null })).toBeUndefined();
    expect(narrativeSelectionFromNodeInput(null)).toBeUndefined();
  });

  it("rejects a selection that does not have exactly three episode titles", () => {
    const broken = { narrativeSelection: { ...SELECTION, episodeTitles: ["Tập 1", "Tập 2"] } };
    expect(narrativeSelectionFromNodeInput(broken)).toBeUndefined();
  });
});
