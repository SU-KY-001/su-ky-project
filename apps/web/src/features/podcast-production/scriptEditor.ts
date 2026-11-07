import { Mark, mergeAttributes } from "@tiptap/core";
import type { EditorDocument, EditorMark, EditorNode } from "@repo/shared";

export function emptyScriptDocument(): EditorDocument {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

function nodeText(node: EditorNode): string {
  if (node.type === "text") return node.text;
  if (node.type === "hardBreak") return "\n";
  const children = (node.content ?? []).map(nodeText);
  if (node.type === "paragraph" || node.type === "heading") return children.join("");
  return children.filter(Boolean).join("\n");
}

export function scriptDocumentText(document: EditorDocument): string {
  return (document.content ?? [])
    .map(nodeText)
    .filter(Boolean)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function scriptCharacterCount(document: EditorDocument): number {
  return scriptDocumentText(document).length;
}

export function isScriptDocumentEmpty(document: EditorDocument): boolean {
  return !scriptDocumentText(document).trim();
}

export function citationMark(sourceId: string): EditorMark {
  return { type: "sourceCitation", attrs: { sourceId } };
}

export function legacyScriptToDocument(script: string): EditorDocument {
  const paragraphs = script
    .trim()
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map((paragraph) => {
      const lines = paragraph.split("\n");
      const content: EditorNode[] = [];
      lines.forEach((line, index) => {
        if (index > 0) content.push({ type: "hardBreak" });
        if (line) content.push({ type: "text", text: line });
      });
      return { type: "paragraph" as const, content };
    });
  return paragraphs.length ? { type: "doc", content: paragraphs } : emptyScriptDocument();
}

export const SourceCitation = Mark.create({
  name: "sourceCitation",
  inclusive: false,
  addAttributes() {
    return {
      sourceId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-source-id"),
        renderHTML: (attributes) => ({ "data-source-id": attributes.sourceId }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-source-id]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        class: "podcast-source-citation",
        title: "Nội dung có nguồn tham khảo",
      }),
      0,
    ];
  },
});
