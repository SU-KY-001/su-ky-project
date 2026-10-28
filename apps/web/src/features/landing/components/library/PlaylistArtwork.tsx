import { useState, type ReactElement } from "react";
import { Image as ImageIcon } from "@phosphor-icons/react/dist/icons/Image";

export function PlaylistArtwork({ sources, title, mosaic = false }: { sources: (string | null | undefined)[]; title: string; mosaic?: boolean }): ReactElement {
  const [failed, setFailed] = useState<string[]>([]);
  const images = sources.filter((url): url is string => Boolean(url && !failed.includes(url))).slice(0, 4);
  // A 640×640 composition, with four equally sized tiles when multiple covers exist.
  const tiles = mosaic && images.length > 1 ? Array.from({ length: 4 }, (_, i) => images[i % images.length]) : images.slice(0, 1);
  return <div className={`playlist-artwork relative grid aspect-square place-items-center overflow-hidden rounded-[10px] bg-paper-deep text-bronze-dark ${mosaic ? "mx-auto w-[min(240px,75vw)] shadow-[0_18px_45px_color-mix(in_srgb,var(--color-ink)_17%,transparent)] min-[541px]:w-full" : ""}`} role="img" aria-label={title}>
    {tiles.length ? mosaic ? <svg className="block size-full" width="640" height="640" viewBox="0 0 640 640" aria-hidden="true">{tiles.map((url, i) => <image key={`${url}-${i}`} href={url} x={tiles.length === 1 ? 0 : i % 2 * 320} y={tiles.length === 1 ? 0 : Math.floor(i / 2) * 320} width={tiles.length === 1 ? 640 : 320} height={tiles.length === 1 ? 640 : 320} preserveAspectRatio="xMidYMid slice" onError={() => setFailed(previous => [...previous, url])} />)}</svg> : <img className="absolute inset-0 block size-full object-cover" src={tiles[0]} alt="" loading="lazy" decoding="async" onError={() => setFailed(previous => [...previous, tiles[0]])} /> : <ImageIcon weight="light" size={42} aria-hidden="true" />}
  </div>;
}
