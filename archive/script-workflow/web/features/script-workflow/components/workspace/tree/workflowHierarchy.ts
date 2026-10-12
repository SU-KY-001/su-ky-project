import type { WorkflowTreeResponse } from "@repo/shared";

export type TreeNodeItem = WorkflowTreeResponse["nodes"][number];
type TreePublicationItem = WorkflowTreeResponse["publications"][number];

export type BuiltTreeItem = {
  item: TreeNodeItem;
  children: BuiltTreeItem[];
  publications: TreePublicationItem[];
};

export function buildWorkflowHierarchy(
  items: readonly TreeNodeItem[],
  publications: readonly TreePublicationItem[],
): { roots: BuiltTreeItem[]; orderedItems: TreeNodeItem[] } {
  const sorted = [...items].sort((left, right) => left.id - right.id || left.version - right.version);
  const byId = new Map<number, BuiltTreeItem>();
  const publicationsByVersion = new Map<number, TreePublicationItem[]>();

  for (const publication of publications) {
    const bucket = publicationsByVersion.get(publication.approvedVersionId);
    if (bucket) {
      bucket.push(publication);
    } else {
      publicationsByVersion.set(publication.approvedVersionId, [publication]);
    }
  }

  for (const item of sorted) {
    byId.set(item.id, {
      item,
      children: [],
      publications: publicationsByVersion.get(item.id) ?? [],
    });
  }

  const roots: BuiltTreeItem[] = [];
  for (const item of sorted) {
    const current = byId.get(item.id);
    if (!current) continue;
    const parent = item.parentVersionId !== null ? byId.get(item.parentVersionId) : undefined;
    if (parent && parent.item.id !== item.id) {
      parent.children.push(current);
    } else {
      roots.push(current);
    }
  }

  const orderedItems: TreeNodeItem[] = [];
  const visited = new Set<number>();
  const walk = (entries: readonly BuiltTreeItem[]) => {
    for (const entry of entries) {
      if (visited.has(entry.item.id)) continue;
      visited.add(entry.item.id);
      orderedItems.push(entry.item);
      walk(entry.children);
    }
  };
  walk(roots);

  return { roots, orderedItems };
}
