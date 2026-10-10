export const workflowKeys = {
  all: ["script-workflows"] as const,
  lists: () => [...workflowKeys.all, "list"] as const,
  list: (page: number, limit: number) => [...workflowKeys.lists(), page, limit] as const,
  detail: (id: number) => [...workflowKeys.all, "detail", id] as const,
  tree: (id: number) => [...workflowKeys.all, "tree", id] as const,
  events: (id: number) => [...workflowKeys.all, "events", id] as const,
  publications: (id: number) => [...workflowKeys.all, "publications", id] as const,
  health: () => ["health"] as const,
};
