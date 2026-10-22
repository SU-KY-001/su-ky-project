import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import type { EditorOptions } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  UnderlineIcon,
  Undo2,
} from "lucide-react";
import {
  EditorDocumentSchema,
  SCRIPT_MAX_CHARACTERS,
  type EditorDocument,
} from "@repo/shared";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";
import { SourceCitation } from "../scriptEditor";
import type { ScriptBlock } from "../aiCheck/blockRefs";
import {
  editorBlocks, focusBlock, insertAfterRange, insertDraft, isEditorEmpty, replaceBlockText, replaceRange, textBlockSpans,
  selectionBlocks, selectionRange, selectRange,
  type DraftInsertItem, type EditResult, type SelectionRange,
} from "../aiCheck/editorBlocks";
import { BlockHighlights, setBlockHighlights, type BlockHighlight } from "../aiCheck/blockHighlights";
import { RewriteFloatingButton } from "../rewrite/RewriteFloatingButton";

export const EMPTY_SCRIPT_PLACEHOLDER =
  "Kịch bản đang trống. Viết trực tiếp, hoặc bấm 'Soạn bản nháp' ở thanh công cụ để AI soạn dàn ý rồi từng đoạn.";

export interface RichScriptEditorHandle {
  insertCitation: (sourceId: string) => void;
  getBlocks: () => ScriptBlock[];
  getSelectionBlocks: () => ScriptBlock[];
  focusBlock: (ref: string | null) => void;
  setBlockHighlights: (highlights: BlockHighlight[]) => void;
  replaceBlockText: (ref: string, expectedHash: string, text: string) => "ok" | "conflict";
  /** Replace a sentence-expanded range (Ctrl+Z undoes it). Never writes when a block changed. */
  replaceRange: (range: SelectionRange, paragraphs: string[]) => EditResult;
  insertAfterRange: (range: SelectionRange, paragraphs: string[]) => EditResult;
  /** AI draft: optional h3 per item, then paragraphs; at the end or after the block holding the caret. */
  insertDraft: (items: DraftInsertItem[], at: "end" | "cursor") => EditResult;
  isEmpty: () => boolean;
}

interface Tool {
  label: string;
  icon: typeof Bold;
  active: () => boolean;
  run: () => void;
}

/** Distance between the selection top and the floating button, px. */
const REWRITE_BUTTON_OFFSET_PX = 44;

const editorExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    code: false,
    codeBlock: false,
    horizontalRule: false,
    strike: false,
  }),
  Placeholder.configure({
    placeholder: EMPTY_SCRIPT_PLACEHOLDER,
  }),
  SourceCitation,
  BlockHighlights,
];

export const RichScriptEditor = forwardRef<
  RichScriptEditorHandle,
  {
    initialDocument: EditorDocument;
    onChange: (document: EditorDocument) => void;
    onPasteLimitReached?: (limit: number) => void;
    /** Set to enable the floating "Viết lại" button: called with the sentence-expanded selection. */
    onRewriteRequest?: (range: SelectionRange) => void;
    /** Right-aligned controls of the toolbar row (AI actions, sources). */
    toolbarActions?: ReactNode;
    /** Called with the block ref (`b{index}`) of the paragraph the moderator clicked. */
    onBlockClick?: (ref: string) => void;
    disabled?: boolean;
  }
>(function RichScriptEditor(
  { initialDocument, onChange, onPasteLimitReached, onRewriteRequest, onBlockClick, toolbarActions, disabled = false },
  ref,
): ReactElement {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<{ top: number; left: number; range: SelectionRange } | null>(null);
  const initialContent = useRef(initialDocument);
  const pasteLimitCallback = useRef(onPasteLimitReached);
  pasteLimitCallback.current = onPasteLimitReached;
  const editorProps = useMemo<EditorOptions["editorProps"]>(
    () => ({
      attributes: {
        class:
          "podcast-rich-editor min-h-80 w-full min-w-0 max-w-full px-5 py-5 text-[15px] leading-7 text-mod-text outline-none [overflow-wrap:anywhere] [word-break:break-word]",
        "aria-label": "Nội dung kịch bản podcast",
      },
      handlePaste: (view, event) => {
        const clipboardText = event.clipboardData?.getData("text/plain");
        if (clipboardText === undefined) return false;

        const normalizedText = clipboardText.replace(/\r\n?/g, "\n");
        const { from, to } = view.state.selection;
        const documentLength = view.state.doc.textBetween(
          0,
          view.state.doc.content.size,
          "\n",
          "\n",
        ).length;
        const selectedLength = view.state.doc.textBetween(from, to, "\n", "\n").length;
        const availableLength = Math.max(
          0,
          SCRIPT_MAX_CHARACTERS - (documentLength - selectedLength),
        );
        const pastedText = normalizedText.slice(0, availableLength);

        event.preventDefault();
        if (pastedText) {
          // Do not mark this transaction with scrollIntoView(). ProseMirror would
          // otherwise scroll every scrollable ancestor, including the dashboard
          // workspace, when a large paste moves the caret far below the viewport.
          view.dispatch(view.state.tr.insertText(pastedText, from, to));
        }
        if (pastedText.length < normalizedText.length) {
          pasteLimitCallback.current?.(SCRIPT_MAX_CHARACTERS);
        }
        return true;
      },
    }),
    [],
  );
  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: editorExtensions,
    content: initialContent.current,
    editorProps,
    onUpdate: ({ editor: current }) => {
      const parsed = EditorDocumentSchema.safeParse(current.getJSON());
      if (parsed.success) onChange(parsed.data);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const clearWhenCollapsed = (): void => { if (editor.state.selection.empty) setAnchor(null); };
    const clearOnEdit = (): void => setAnchor(null);
    editor.on("selectionUpdate", clearWhenCollapsed);
    editor.on("update", clearOnEdit);
    return () => {
      editor.off("selectionUpdate", clearWhenCollapsed);
      editor.off("update", clearOnEdit);
    };
  }, [editor]);

  useImperativeHandle(
    ref,
    () => ({
      insertCitation: (sourceId: string) => {
        editor?.chain().focus().setMark("sourceCitation", { sourceId }).run();
      },
      getBlocks: () => (editor ? editorBlocks(editor) : []),
      getSelectionBlocks: () => (editor ? selectionBlocks(editor) : []),
      focusBlock: (ref) => {
        if (editor) focusBlock(editor, ref);
      },
      setBlockHighlights: (highlights) => {
        if (editor) setBlockHighlights(editor, highlights);
      },
      replaceBlockText: (ref, expectedHash, text) => (editor ? replaceBlockText(editor, ref, expectedHash, text) : "conflict"),
      replaceRange: (range, paragraphs) => (editor ? replaceRange(editor, range, paragraphs) : { ok: false, reason: "CONFLICT" }),
      insertAfterRange: (range, paragraphs) => (editor ? insertAfterRange(editor, range, paragraphs) : { ok: false, reason: "CONFLICT" }),
      insertDraft: (items, at) => (editor ? insertDraft(editor, items, at) : { ok: false, reason: "CONFLICT" }),
      isEmpty: () => (editor ? isEditorEmpty(editor) : true),
    }),
    [editor],
  );

  if (!editor) {
    return <div className="min-h-80 animate-pulse bg-mod-canvas-accent" aria-label="Đang tải trình soạn thảo" />;
  }

  /** After the pointer/keyboard selection settles: expand to whole sentences, show it, and anchor the button above it. */
  const pickRange = (): void => {
    if (!onRewriteRequest || disabled) return;
    window.setTimeout(() => {
      const range = selectionRange(editor);
      const wrapper = wrapperRef.current;
      if (!range || !wrapper) return setAnchor(null);
      selectRange(editor, range);
      const coords = editor.view.coordsAtPos(range.from);
      const box = wrapper.getBoundingClientRect();
      setAnchor({ top: coords.top - box.top - REWRITE_BUTTON_OFFSET_PX, left: Math.max(coords.left - box.left, 0), range });
    }, 0);
  };

  const tools: Tool[] = [
    {
      label: "Tiêu đề 1",
      icon: Heading1,
      active: () => editor.isActive("heading", { level: 1 }),
      run: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      label: "Tiêu đề 2",
      icon: Heading2,
      active: () => editor.isActive("heading", { level: 2 }),
      run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: "Đậm",
      icon: Bold,
      active: () => editor.isActive("bold"),
      run: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: "Nghiêng",
      icon: Italic,
      active: () => editor.isActive("italic"),
      run: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: "Gạch chân",
      icon: UnderlineIcon,
      active: () => editor.isActive("underline"),
      run: () => editor.chain().focus().toggleUnderline().run(),
    },
    {
      label: "Danh sách không thứ tự",
      icon: List,
      active: () => editor.isActive("bulletList"),
      run: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: "Danh sách có thứ tự",
      icon: ListOrdered,
      active: () => editor.isActive("orderedList"),
      run: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      label: "Trích dẫn",
      icon: Quote,
      active: () => editor.isActive("blockquote"),
      run: () => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      label: "Hoàn tác",
      icon: Undo2,
      active: () => false,
      run: () => editor.chain().focus().undo().run(),
    },
    {
      label: "Làm lại",
      icon: Redo2,
      active: () => false,
      run: () => editor.chain().focus().redo().run(),
    },
  ];

  return (
    <div ref={wrapperRef} className="relative min-w-0 max-w-full overflow-visible rounded-xl border border-mod-border bg-mod-surface">
      <div className="flex flex-wrap gap-1 border-b border-mod-border bg-mod-canvas-accent p-2">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Button
              key={tool.label}
              type="button"
              size="icon-sm"
              variant="ghost"
              title={tool.label}
              aria-label={tool.label}
              aria-pressed={tool.active()}
              disabled={disabled}
              className={cn(
                "text-mod-text-secondary hover:bg-mod-surface hover:text-mod-text",
                tool.active() && "bg-mod-surface text-mod-primary",
              )}
              onClick={tool.run}
            >
              <Icon size={17} aria-hidden="true" />
            </Button>
          );
        })}
        {toolbarActions ? <div className="ml-auto flex flex-wrap items-center gap-1.5">{toolbarActions}</div> : null}
      </div>
      <div
        data-script-scroll-region
        className="podcast-editor-viewport"
        onMouseUp={pickRange}
        onKeyUp={pickRange}
        onClick={(event) => {
          if (!editor || !onBlockClick) return;
          // Coordinates, not selection: ProseMirror applies the clicked selection after this event.
          const at = editor.view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
          if (at === undefined) return;
          const index = textBlockSpans(editor.state.doc).findIndex((span) => at >= span.from && at <= span.to);
          if (index >= 0) onBlockClick(`b${index}`);
        }}
      >
        <EditorContent
          editor={editor}
          className="h-full min-w-0 max-w-full overflow-hidden"
        />
      </div>
      {anchor ? <RewriteFloatingButton top={anchor.top} left={anchor.left} onClick={() => onRewriteRequest?.(anchor.range)} /> : null}
    </div>
  );
});

