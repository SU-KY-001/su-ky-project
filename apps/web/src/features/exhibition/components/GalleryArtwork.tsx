import { useEffect, useMemo, useState, type ReactElement } from "react";
import { SRGBColorSpace, TextureLoader, type Texture } from "three";
import { galleryPalette as palette, type Artwork } from "../data";
import { SurfaceText } from "./SurfaceText";
import { artworkLayout, CANVAS_DEPTH, LABEL_HEIGHT } from "../artworkLayout";
import { makeCanvasShadow } from "../materials";

export function GalleryArtwork({ artwork }: { artwork: Artwork }): ReactElement {
  const [texture, setTexture] = useState<Texture | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    const loaded = new TextureLoader().load(artwork.image, value => {
      value.colorSpace = SRGBColorSpace;
      value.anisotropy = 4;
      if (alive) setTexture(value);
    }, undefined, () => { if (alive) setFailed(true); });
    return () => { alive = false; loaded.dispose(); };
  }, [artwork.image]);
  const { width, height, centerY, labelCenterY, labelWidth } = artworkLayout(artwork.width, artwork.aspect, artwork.widthMode);
  const shadow = useMemo(makeCanvasShadow, []);
  useEffect(() => () => shadow.dispose(), [shadow]);
  const lines = useMemo(() => [
    { text: artwork.title, size: 57, weight: 600, gap: 15 },
    { text: artwork.description, size: 43, gap: 14, color: palette.muted },
    { text: `${artwork.date}  /  Ảnh: ${artwork.credit}`, size: 34, color: palette.muted },
  ], [artwork]);
  return <group position={[artwork.position[0], centerY, artwork.position[2]]} rotation={[0, artwork.rotation, 0]}>
    <mesh position={[0.008, -0.012, -0.045]}>
      <planeGeometry args={[width + 0.1, height + 0.1]} />
      <meshBasicMaterial map={shadow} transparent opacity={0.28} depthWrite={false} toneMapped={false} />
    </mesh>
    <mesh castShadow receiveShadow position={[0, 0, -0.012]} userData={{ artworkId: artwork.id }}>
      <boxGeometry args={[width + 0.1, height + 0.1, 0.04]} /><meshStandardMaterial color={palette.frame} roughness={0.8} />
    </mesh>
    <mesh castShadow receiveShadow position={[0, 0, CANVAS_DEPTH / 2 + 0.012]} userData={{ artworkId: artwork.id }}>
      <boxGeometry args={[width, height, CANVAS_DEPTH]} />
      {[0, 1, 2, 3].map(index => <meshStandardMaterial key={index} attach={`material-${index}`} color={palette.frame} roughness={0.94} />)}
      <meshStandardMaterial key={texture?.uuid ?? "loading"} attach="material-4" map={texture} color={texture ? "white" : palette.trim} roughness={0.92} metalness={0} />
      <meshStandardMaterial attach="material-5" color={palette.mount} roughness={1} />
    </mesh>
    {failed && <SurfaceText position={[0, 0, CANVAS_DEPTH]} width={width * 0.8} height={0.6} lines={[{ text: "Không tải được ảnh. Mở chi tiết để thử lại.", size: 50 }]} />}
    <mesh position={[0, labelCenterY - centerY, -0.01]}><planeGeometry args={[labelWidth, LABEL_HEIGHT]} /><meshStandardMaterial color={palette.mount} roughness={1} /></mesh>
    <SurfaceText position={[0, labelCenterY - centerY, 0.01]} width={labelWidth * 0.92} height={LABEL_HEIGHT * 0.9} lines={lines} />
  </group>;
}
