import type { ToolDefinition } from "@earendil-works/pi-coding-agent";

/** One script block as sent by the web client (see CreateAiCheckSchema in @repo/shared). */
export interface CheckBlock {
  ref: string;
  text: string;
  hash: string;
  prev: string;
  dup: number;
}

export type SourceKind = "PDF" | "URL";

/** A usable (VERIFIED, verifiedVersion = version) source of the episode's series, labelled S1..Sn by sortOrder. */
export interface ReviewSource {
  sourceId: string;
  version: number;
  label: string;
  title: string;
  kind: SourceKind;
  url: string | null;
}

export interface EvidenceItem {
  sourceId: string;
  /** PDF: real page number. URL: 1 (whole document). */
  page: number;
  quote: string;
}

/** Output of validators/items.ts: ready to insert as AiCheckItem (minus id/checkId/seq/status). */
export interface ValidatedItem {
  blockRef: string;
  blockHash: string;
  blockPrevHash: string;
  blockDup: number;
  kind: "FACT_DOUBT";
  severity: "LOW" | "MEDIUM" | "HIGH";
  basis: "CONTRADICTED" | "NOT_FOUND";
  message: string;
  suggestion: string | null;
  evidence: EvidenceItem[];
}

/** Raw tool result delivered by the engine hook `onToolResult` (before redaction; never log `text`). */
export interface ToolResultEvent {
  toolName: string;
  toolCallId: string;
  args: unknown;
  text: string;
  isError: boolean;
}

export interface PageHit {
  sourceId: string;
  page: number;
  excerpt: string;
}

/** Postgres-backed page store (table `source_pages`). Every query is filtered by (sourceId, version). */
export interface SourcePageStore {
  hasPages(sourceId: string, version: number): Promise<boolean>;
  search(sources: { sourceId: string; version: number }[], query: string, limit: number): Promise<PageHit[]>;
  readPages(sourceId: string, version: number, from: number, to: number): Promise<{ page: number; text: string }[]>;
}

/** Per-session tool kit: backend-owned read-only tools + record of what the agent actually opened. */
export interface SourceToolkit {
  /** `search_source` and `read_pages` (PDF sources only). */
  customTools: ToolDefinition[];
  /** Pass to runStructuredAgent({ onToolResult }); records fetched URL content for quote verification. */
  onToolResult: (event: ToolResultEvent) => void;
  /** Text the agent really opened: PDF = that page; URL source = all captured fetch text of its registered URL (page ignored). */
  openedText: (sourceId: string, page: number) => string | undefined;
  stats: () => { toolCalls: number };
}
