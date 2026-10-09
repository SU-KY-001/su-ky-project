import { create } from "zustand";
import type { StepType } from "@repo/shared";

export type StreamConnection = "idle" | "connecting" | "open" | "degraded";

type WorkflowUiState = {
  workflowId: number | null;
  viewedStep: StepType | null;
  viewedVersions: Partial<Record<StepType, number>>;
  /** Unsaved user input (feedback, edits) keyed by an owner-chosen string, kept across 409/400. */
  drafts: Record<string, string>;
  streamConnection: StreamConnection;
  enterWorkflow: (id: number) => void;
  viewStep: (step: StepType) => void;
  viewVersion: (step: StepType, version: number | null) => void;
  setDraft: (key: string, value: string) => void;
  clearDraft: (key: string) => void;
  setStreamConnection: (connection: StreamConnection) => void;
};

export const useWorkflowUiStore = create<WorkflowUiState>((set) => ({
  workflowId: null,
  viewedStep: null,
  viewedVersions: {},
  drafts: {},
  streamConnection: "idle",
  enterWorkflow: (id) =>
    set((state) =>
      state.workflowId === id
        ? state
        : { workflowId: id, viewedStep: null, viewedVersions: {}, drafts: {}, streamConnection: "idle" },
    ),
  viewStep: (step) => set({ viewedStep: step }),
  viewVersion: (step, version) =>
    set((state) => {
      const next = { ...state.viewedVersions };
      if (version === null) delete next[step];
      else next[step] = version;
      return { viewedVersions: next };
    }),
  setDraft: (key, value) => set((state) => ({ drafts: { ...state.drafts, [key]: value } })),
  clearDraft: (key) =>
    set((state) => {
      const { [key]: _removed, ...rest } = state.drafts;
      return { drafts: rest };
    }),
  setStreamConnection: (connection) => set({ streamConnection: connection }),
}));
