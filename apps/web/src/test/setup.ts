import { Window } from "happy-dom";

export const testWindow = new Window({
  url: "http://localhost:3000",
  settings: { disableComputedStyleRendering: true, enableImageFileLoading: false, enableCSSFileLoading: false },
});

// Use Motion's JavaScript fallback: Happy DOM rejects canceled native animations during route unmounts.
Reflect.deleteProperty(testWindow.Element.prototype, "animate");

for (const key of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "HTMLFormElement", "HTMLOptionElement", "HTMLSelectElement", "HTMLTextAreaElement", "HTMLCollection", "NodeList", "NodeFilter", "Element", "Node", "DocumentFragment", "Event", "CustomEvent", "KeyboardEvent", "MouseEvent", "PointerEvent", "MutationObserver", "ResizeObserver", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame", "IS_REACT_ACT_ENVIRONMENT"]) {
  const value = key === "window" ? testWindow : key === "IS_REACT_ACT_ENVIRONMENT" ? true : Reflect.get(testWindow, key);
  Object.defineProperty(globalThis, key, {
    configurable: true,
    writable: true,
    value: typeof value === "function" && ["getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"].includes(key) ? value.bind(testWindow) : value,
  });
}

const matchMedia = testWindow.matchMedia.bind(testWindow);
testWindow.matchMedia = (query: string) => {
  const result = matchMedia(query);
  if (query.includes("prefers-reduced-motion")) Object.defineProperty(result, "matches", { value: true });
  return result;
};

