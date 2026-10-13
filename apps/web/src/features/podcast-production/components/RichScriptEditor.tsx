import {
  forwardRef,
  useImperativeHandle,
  useRef,
  type ReactElement,
} from "react";
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
import { EditorDocumentSchema, type EditorDocument } from "@repo/shared";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";
import { SourceCitation } from "../scriptEditor";

export interface RichScriptEditorHandle {
  insertCitation: (sourceId: string) => void;
}

interface Tool {
  label: string;
  icon: typeof Bold;
  active: () => boolean;
  run: () => void;
}

const editorExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    code: false,
    codeBlock: false,
    horizontalRule: false,
    strike: false,
  }),
  Placeholder.configure({
    placeholder: "Soạn kịch bản podcast tại đây…",
  }),
  SourceCitation,
];

const editorProps = {
  attributes: {
    class:
      "podcast-rich-editor min-h-80 px-5 py-5 text-[15px] leading-7 text-mod-text outline-none",
    "aria-label": "Nội dung kịch bản podcast",
  },
};

export const RichScriptEditor = forwardRef<
  RichScriptEditorHandle,
  {
    initialDocument: EditorDocument;
    onChange: (document: EditorDocument) => void;
    disabled?: boolean;
  }
>(function RichScriptEditor(
  { initialDocument, onChange, disabled = false },
  ref,
): ReactElement {
  const initialContent = useRef(initialDocument);
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

  useImperativeHandle(
    ref,
    () => ({
      insertCitation: (sourceId: string) => {
        editor?.chain().focus().setMark("sourceCitation", { sourceId }).run();
      },
    }),
    [editor],
  );

  if (!editor) {
    return <div className="min-h-80 animate-pulse bg-mod-canvas-accent" aria-label="Đang tải trình soạn thảo" />;
  }

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
    <div className="overflow-hidden rounded-xl border border-mod-border bg-mod-surface">
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
      </div>
      <EditorContent editor={editor} />
    </div>
  );
});

