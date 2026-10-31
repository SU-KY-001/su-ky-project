import { useState, type ReactElement } from "react";
import { Image as ImageIcon } from "@phosphor-icons/react/dist/icons/Image";

export function ImageThumbnail({ src, alt }: { src?: string | null; alt: string }): ReactElement {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const available = Boolean(src && src !== failedSrc);
  return <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-mod-border bg-mod-canvas-accent" role="img" aria-label={available ? alt : src ? "Không tải được poster" : "Chưa có poster"}>
    {src && available ? <img src={src} alt="" width={40} height={40} loading="lazy" decoding="async" className="size-full object-cover" onLoad={() => setFailedSrc(null)} onError={() => setFailedSrc(src)} /> : <ImageIcon size={21} className="text-mod-text-low" aria-hidden="true" />}
  </span>;
}
