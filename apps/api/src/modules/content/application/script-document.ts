import type { EditorDocument, EditorNode } from "@repo/shared";

function extractNodeText(node: EditorNode): string {
  if (node.type === "text") return node.text;
  if (node.type === "hardBreak") return "\n";

  const content = (node.content ?? []).map(extractNodeText);
  if (node.type === "paragraph" || node.type === "heading") return content.join("");
  return content.filter(Boolean).join("\n");
}

export function extractScriptText(document: EditorDocument): string {
  return (document.content ?? [])
    .map(extractNodeText)
    .filter(Boolean)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function extractCitationSourceIds(document: EditorDocument): string[] {
  const ids = new Set<string>();
  const visit = (node: EditorNode): void => {
    if (node.type === "text") {
      for (const mark of node.marks ?? []) {
        if (mark.type === "sourceCitation") ids.add(mark.attrs.sourceId);
      }
      return;
    }
    if (node.type === "hardBreak") return;
    for (const child of node.content ?? []) visit(child);
  };
  for (const node of document.content ?? []) visit(node);
  return [...ids];
}

