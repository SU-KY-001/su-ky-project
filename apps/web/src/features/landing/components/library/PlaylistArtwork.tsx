import { useState, type ReactElement } from "react";
import { Image as ImageIcon } from "@phosphor-icons/react/dist/icons/Image";

export function PlaylistArtwork({ sources, title, mosaic = false }: { sources: (string | null | undefined)[]; title: string; mosaic?: boolean }): ReactElement {
  const [failed, setFailed] = useState<string[]>([]);
  const images = sources.filter((url): url is string => Boolean(url && !failed.includes(url))).slice(0, 4);
  // A 640×640 composition, with four equally sized tiles when multiple covers exist.
  const tiles = mosaic && images.length > 1 ? Array.from({ length: 4 }, (_, i) => images[i % images.length]) : images.slice(0, 1);
  return <div className={mosaic ? "playlist-artwork playlist-mosaic" : "playlist-artwork"} role="img" aria-label={title}>
    {tiles.length ? mosaic ? <svg width="640" height="640" viewBox="0 0 640 640" aria-hidden="true">{tiles.map((url, i) => <image key={`${url}-${i}`} href={url} x={tiles.length === 1 ? 0 : i % 2 * 320} y={tiles.length === 1 ? 0 : Math.floor(i / 2) * 320} width={tiles.length === 1 ? 640 : 320} height={tiles.length === 1 ? 640 : 320} preserveAspectRatio="xMidYMid slice" onError={() => setFailed(previous => [...previous, url])} />)}</svg> : <img src={tiles[0]} alt="" loading="lazy" decoding="async" onError={() => setFailed(previous => [...previous, tiles[0]])} /> : <ImageIcon weight="light" size={42} aria-hidden="true" />}
  </div>;
}
