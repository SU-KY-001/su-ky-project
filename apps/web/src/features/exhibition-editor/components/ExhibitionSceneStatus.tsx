import type { ReactElement } from "react";
import { Button } from "@/shared/components/ui/button";
import preview from "./exhibition-scene-preview.png";

export function ExhibitionSceneStatus({ status, onRetry }: { status: "loading" | "ready" | "error"; onRetry: () => void }): ReactElement | null {
  return <div aria-hidden={status === "ready"} className={`absolute inset-0 z-10 grid place-items-center overflow-hidden bg-mod-canvas-accent transition-opacity duration-300 motion-reduce:transition-none ${status === "ready" ? "pointer-events-none opacity-0" : "opacity-100"}`}>
    <img src={preview} alt="" className="absolute inset-0 h-full w-full object-cover" />
    {status !== "ready" && <div role={status === "error" ? "alert" : "status"} className="relative rounded-md bg-mod-surface px-4 py-3 text-center text-sm text-mod-text shadow-sm">
      {status === "loading" ? "Đang chuẩn bị không gian 3D…" : <><p>Không thể tải không gian 3D.</p><Button type="button" variant="outline" className="mt-2" onClick={onRetry}>Thử lại</Button></>}
    </div>}
  </div>;
}
