import { Component, lazy, Suspense, useCallback, useMemo, useState, type ReactElement, type ReactNode } from "react";
import type { ExhibitionDocument } from "@repo/shared";
import { ExhibitionSceneStatus } from "./ExhibitionSceneStatus";

export function preloadExhibitionScene(): Promise<typeof import("./ExhibitionCreateScene")> {
  return import("./ExhibitionCreateScene");
}

class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } { return { failed: true }; }
  componentDidCatch(): void { this.props.onError(); }
  render(): ReactNode { return this.state.failed ? null : this.props.children; }
}

export function ExhibitionScenePreview({ chapters }: { chapters: ExhibitionDocument["chapters"] }): ReactElement {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const Scene = useMemo(() => lazy(preloadExhibitionScene), [attempt]);
  const onReady = useCallback((): void => setStatus(current => current === "error" ? current : "ready"), []);
  const onError = useCallback((): void => setStatus("error"), []);
  const retry = (): void => { setStatus("loading"); setAttempt(value => value + 1); };
  return <div className="relative h-full w-full" aria-busy={status === "loading"}>
    <SceneBoundary key={attempt} onError={onError}><Suspense fallback={null}><Scene chapters={chapters} onReady={onReady} onError={onError} /></Suspense></SceneBoundary>
    <ExhibitionSceneStatus status={status} onRetry={retry} />
  </div>;
}
