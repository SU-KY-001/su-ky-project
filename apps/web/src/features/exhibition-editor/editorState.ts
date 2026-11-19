export interface EditorState<T> { document: T; history: T[] }
export function mergeArtworkBuffers<T extends { id: string }>(saved: readonly T[], pending: readonly T[], current: T | null): T[] {
  return [...new Map([...saved, ...pending, ...(current ? [current] : [])].map(item => [item.id, item])).values()];
}
export function editDocument<T>(state: EditorState<T>, document: T): EditorState<T> {
  return { document, history: [...state.history, state.document].slice(-50) };
}
export function undoDocument<T>(state: EditorState<T>): EditorState<T> {
  const previous = state.history.at(-1);
  return previous === undefined ? state : { document: previous, history: state.history.slice(0, -1) };
}
