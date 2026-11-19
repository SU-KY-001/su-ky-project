import { Extension, type Editor } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { textBlockSpans } from "./editorBlocks";

/** `flag` = warning not applied (orange underline), `applied` = green underline, `current` = the block open in the panel. */
export type BlockHighlightKind = "flag" | "applied" | "current";

export interface BlockHighlight {
  ref: string;
  kind: BlockHighlightKind;
}

const CLASS_BY_KIND: Record<BlockHighlightKind, string> = {
  flag: "ai-block-flag",
  applied: "ai-block-applied",
  current: "ai-block-current",
};

const highlightsKey = new PluginKey<BlockHighlight[]>("aiBlockHighlights");

/**
 * Display only: decorations never touch the document, so highlighting cannot change what is saved or hashed.
 * Refs are re-resolved against the live document on every render, so they follow edits made while the check runs.
 */
export const BlockHighlights = Extension.create({
  name: "aiBlockHighlights",
  addProseMirrorPlugins() {
    return [
      new Plugin<BlockHighlight[]>({
        key: highlightsKey,
        state: {
          init: () => [],
          apply: (transaction, previous) => (transaction.getMeta(highlightsKey) as BlockHighlight[] | undefined) ?? previous,
        },
        props: {
          decorations(state) {
            const highlights = highlightsKey.getState(state) ?? [];
            if (!highlights.length) return null;
            const spans = textBlockSpans(state.doc);
            const decorations = highlights.flatMap(({ ref, kind }) => {
              const span = spans[Number(ref.slice(1))];
              return span ? [Decoration.node(span.from - 1, span.to + 1, { class: CLASS_BY_KIND[kind] })] : [];
            });
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});

export function setBlockHighlights(editor: Editor, highlights: BlockHighlight[]): void {
  editor.view.dispatch(editor.state.tr.setMeta(highlightsKey, highlights).setMeta("addToHistory", false));
}
