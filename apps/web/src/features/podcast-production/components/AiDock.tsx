import { useState, type ReactElement, type RefObject } from "react";
import { PanelRightClose, Sparkles } from "lucide-react";
import type { StudioSeriesDetailDto } from "@repo/shared";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";
import type { SelectionRange } from "../aiCheck/editorBlocks";
import { RewritePanel } from "../rewrite/RewritePanel";
import { AiAssistantPanel, type DockState } from "./AiAssistantPanel";
import { DraftWizardPanel } from "./draft/DraftWizardPanel";
import type { RichScriptEditorHandle } from "./RichScriptEditor";

export type AiTab = "check" | "draft";

const TABS: ReadonlyArray<{ id: AiTab; label: string }> = [
  { id: "check", label: "Rà soát" },
  { id: "draft", label: "Soạn nháp" },
];

/**
 * Step footers (`div.border-t`) stay at the bottom edge of the scrolling pane, so a long outline never pushes the
 * action buttons out of reach. The wizards render header/body/footer as siblings, which is why this is a selector.
 */
const PANE_CLASS = "flex h-full flex-col overflow-y-auto [&>div.border-t]:sticky [&>div.border-t]:bottom-0 [&>div.border-t]:mt-auto [&>div.border-t]:bg-mod-surface";

interface Props {
  dock: DockState;
  onDockChange: (dock: DockState) => void;
  tab: AiTab;
  onTabChange: (tab: AiTab) => void;
  /** Set while a sentence is being rewritten; shows the rewrite pane instead of the tabs' pane. */
  rewriteRange: SelectionRange | null;
  onRewriteClose: () => void;
  editorRef: RefObject<RichScriptEditorHandle | null>;
  episodeId: string | null;
  ensureEpisode: () => Promise<string>;
  sources: StudioSeriesDetailDto["sources"];
  hasScript: boolean;
  scriptChars: number;
  wordsPerMinute: number | undefined;
  clickedBlock: { ref: string; seq: number } | null;
  onOpenSource: () => void;
  onOpenCountChange: (count: number | null) => void;
}

/** The one place every AI action lives: header, two tabs (review, draft) and the transient rewrite pane. */
export function AiDock({ dock, onDockChange, tab, onTabChange, rewriteRange, onRewriteClose, editorRef, episodeId, ensureEpisode, sources, hasScript, scriptChars, wordsPerMinute, clickedBlock, onOpenSource, onOpenCountChange }: Props): ReactElement {
  // Draft state (topic, outline, tone) must survive a tab switch; it is thrown away only when the draft ends.
  const [draftKey, setDraftKey] = useState(0);
  const [draftVisited, setDraftVisited] = useState(tab === "draft");
  const active = rewriteRange ? "rewrite" : tab;
  const pick = (next: AiTab): void => {
    if (next === "draft") setDraftVisited(true);
    onTabChange(next);
  };
  const endDraft = (): void => {
    setDraftKey((key) => key + 1);
    onTabChange("check");
  };

  return (
    <div className="flex h-full min-w-[340px] flex-col">
      <header className="flex items-center justify-between border-b border-mod-border px-3.5 py-2.5">
        <h3 className="flex items-center gap-2 text-sm font-bold text-mod-text"><Sparkles size={16} className="text-mod-primary" aria-hidden="true" /> Trợ lý AI</h3>
        <Button type="button" variant="ghost" size="sm" title="Ẩn trợ lý AI để mở rộng vùng soạn thảo" onClick={() => onDockChange("closed")}><PanelRightClose size={15} aria-hidden="true" /> Thu gọn</Button>
      </header>
      <div role="tablist" aria-label="Việc AI có thể làm" className="flex border-b border-mod-border px-2">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active === id}
            className={cn("border-b-2 px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-mod-primary", active === id ? "border-mod-primary text-mod-primary" : "border-transparent text-mod-text-secondary hover:text-mod-text")}
            onClick={() => pick(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1">
        <div className="h-full" hidden={active !== "check"}>
          <AiAssistantPanel editorRef={editorRef} episodeId={episodeId} ensureEpisode={ensureEpisode} sources={sources} hasScript={hasScript} dock={dock} onDockChange={onDockChange} clickedBlock={clickedBlock} onOpenSource={onOpenSource} onOpenCountChange={onOpenCountChange} />
        </div>
        {draftVisited ? (
          <div className={cn(PANE_CLASS, active !== "draft" && "hidden")}>
            {wordsPerMinute === undefined ? (
              <p className="p-4 text-sm text-mod-text-secondary">Đang tải tốc độ đọc để quy đổi thời lượng…</p>
            ) : (
              <DraftWizardPanel key={draftKey} onClose={endDraft} editorRef={editorRef} episodeId={episodeId} ensureEpisode={ensureEpisode} wordsPerMinute={wordsPerMinute} scriptChars={scriptChars} />
            )}
          </div>
        ) : null}
        {rewriteRange ? (
          <div className={PANE_CLASS}>
            <RewritePanel range={rewriteRange} onClose={onRewriteClose} editorRef={editorRef} episodeId={episodeId} ensureEpisode={ensureEpisode} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
