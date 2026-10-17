import { GlobalWindow } from "happy-dom";

export const testWindow = new GlobalWindow({ url: "http://localhost/" });
const target = globalThis as unknown as Record<string, unknown>;

for (const key of Object.getOwnPropertyNames(testWindow)) {
  if (key in target) continue;
  const descriptor = Object.getOwnPropertyDescriptor(testWindow, key);
  if (descriptor) Object.defineProperty(globalThis, key, descriptor);
}

Object.defineProperties(globalThis, {
  window: { configurable: true, value: testWindow },
  document: { configurable: true, value: testWindow.document },
  navigator: { configurable: true, value: testWindow.navigator },
  Event: { configurable: true, value: testWindow.Event },
  CustomEvent: { configurable: true, value: testWindow.CustomEvent },
  EventTarget: { configurable: true, value: testWindow.EventTarget },
  FocusEvent: { configurable: true, value: testWindow.FocusEvent },
  InputEvent: { configurable: true, value: testWindow.InputEvent },
  KeyboardEvent: { configurable: true, value: testWindow.KeyboardEvent },
  MouseEvent: { configurable: true, value: testWindow.MouseEvent },
  PointerEvent: { configurable: true, value: testWindow.PointerEvent },
  IS_REACT_ACT_ENVIRONMENT: { configurable: true, value: true },
});
