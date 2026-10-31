import { useEffect, useMemo, type ReactElement } from "react";
import { benches, floorAreas, galleryPalette as palette, galleryReturns, walls, type Artwork } from "../data";
import { makePlasterMaps } from "../materials";
import { SurfaceText } from "./SurfaceText";
import { GalleryFloor } from "./GalleryFloor";
import { exhibitionArtworkLayout } from "@repo/shared";

export function GalleryArchitecture({ chapterText, artworks = [] }: { chapterText: { title: string; period: string; description: string }[]; artworks?: Artwork[] }): ReactElement {
  const plaster = useMemo(makePlasterMaps, []);
  const frontChapterAvailable = !artworks.some(artwork => Math.abs(artwork.position[2] + 8) < 0.5 && Math.abs(artwork.rotation) < 0.1 && Math.abs(artwork.position[0] + 0.5) < 1.4 + exhibitionArtworkLayout(artwork.width, artwork.aspect, artwork.widthMode).width / 2 + 0.12);
  useEffect(() => () => { plaster.color.dispose(); plaster.normal.dispose(); plaster.roughness.dispose(); }, [plaster]);
  return <group>
    <GalleryFloor />
    {chapterText.length < 3 && <mesh position={[3.5, 2.2, chapterText.length === 1 ? -8 : -24]}><boxGeometry args={[3, 4.4, 0.28]} /><meshStandardMaterial color={palette.wall} map={plaster.color} normalMap={plaster.normal} roughnessMap={plaster.roughness} roughness={1} /></mesh>}
    {floorAreas.map(area => <group key={area.z}>
      <mesh position={[area.x, 4.4, area.z]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[area.width, area.depth]} /><meshBasicMaterial color={palette.ceiling} toneMapped={false} />
      </mesh>
    </group>)}
    {walls.map((wall, index) => {
      const length = Math.hypot(wall.b[0] - wall.a[0], wall.b[1] - wall.a[1]);
      const angle = -Math.atan2(wall.b[1] - wall.a[1], wall.b[0] - wall.a[0]);
      return <group key={index} position={[(wall.a[0] + wall.b[0]) / 2, 0, (wall.a[1] + wall.b[1]) / 2]} rotation={[0, angle, 0]}>
        <mesh position={[0, 2.2, 0]}><boxGeometry args={[length + 0.1, 4.4, 0.24]} /><meshStandardMaterial color={palette.wall} map={plaster.color} normalMap={plaster.normal} roughnessMap={plaster.roughness} roughness={1} /></mesh>
        <mesh position={[0, 0.04, 0]}><boxGeometry args={[length, 0.08, 0.255]} /><meshStandardMaterial color={palette.trim} roughness={0.8} /></mesh>
      </group>;
    })}
    {galleryReturns(artworks).map(wall => <group key={`${wall.a[0]}-${wall.a[1]}`}>
      <mesh position={[(wall.a[0] + wall.b[0]) / 2, 2.2, wall.a[1]]}><boxGeometry args={[0.8, 4.4, 0.28]} /><meshStandardMaterial color={palette.wall} map={plaster.color} normalMap={plaster.normal} roughnessMap={plaster.roughness} roughness={1} /></mesh>
      <mesh position={[(wall.a[0] + wall.b[0]) / 2, 0.05, wall.a[1]]}><boxGeometry args={[0.8, 0.1, 0.3]} /><meshStandardMaterial color={palette.trim} roughness={1} /></mesh>
    </group>)}
    {benches.map(z => <group key={`bench-${z}`} position={[0, 0, z]}>
      <mesh position={[0, 0.3, 0]}><boxGeometry args={[2.8, 0.6, 0.9]} /><meshStandardMaterial color={palette.frame} roughness={0.9} /></mesh>
      <mesh position={[0, 0.08, 0]}><boxGeometry args={[2.55, 0.16, 0.72]} /><meshStandardMaterial color={palette.trim} roughness={0.9} /></mesh>
    </group>)}
    {[-8, -24].map(z => <group key={z}>
      <mesh position={[3.5, 3.97, z - 0.7]}><boxGeometry args={[3.4, 0.86, 1.4]} /><meshStandardMaterial color={palette.wall} map={plaster.color} roughness={0.95} /></mesh>
      {[1.85, 5.15].map(x => <mesh key={x} position={[x, 1.77, z - 0.7]}><boxGeometry args={[0.3, 3.54, 1.4]} /><meshStandardMaterial color={palette.wall} map={plaster.color} roughness={0.95} /></mesh>)}
      <mesh position={[3.5, 3.54, z - 0.7]}><boxGeometry args={[3, 0.04, 1.4]} /><meshStandardMaterial color={palette.frame} roughness={0.95} /></mesh>
    </group>)}
    {[7, 1, -5, -12, -18, -22, -28, -34, -38].map(z => <group key={z} position={[0, 4.29, z]}>
      <mesh><boxGeometry args={[12, 0.12, 0.16]} /><meshStandardMaterial color={palette.ceiling} roughness={0.9} /></mesh>
      {[-5.8, 5.8].map(x => <mesh key={x} position={[x, -0.07, 0]}><boxGeometry args={[0.38, 0.26, 0.42]} /><meshStandardMaterial color={palette.trim} roughness={0.9} /></mesh>)}
    </group>)}
    {frontChapterAvailable ? <mesh position={[-0.5, 2.2, -7.86]}><boxGeometry args={[2.8, 4.4, 0.1]} /><meshStandardMaterial color={palette.frame} roughness={1} /></mesh> : <mesh position={[5.85, 2.25, -5.5]}><boxGeometry args={[0.1, 4.25, 2.6]} /><meshStandardMaterial color={palette.frame} roughness={1} /></mesh>}
    <mesh position={[-5.85, 2.25, -16.5]}><boxGeometry args={[0.1, 4.25, 1.5]} /><meshStandardMaterial color={palette.frame} roughness={1} /></mesh>
    <mesh position={[-5.85, 2.25, -35.4]}><boxGeometry args={[0.1, 4.25, 2.6]} /><meshStandardMaterial color={palette.frame} roughness={1} /></mesh>
    <SurfaceText position={frontChapterAvailable ? [-0.5, 2.3, -7.79] : [5.78, 2.3, -5.5]} rotation={frontChapterAvailable ? 0 : -Math.PI / 2} width={2.35} height={2.2} lines={[
      { text: `01 / ${chapterText[0]?.period ?? ""}`, size: 36, gap: 38, color: palette.mount },
      { text: chapterText[0]?.title ?? "", size: 138, serif: true, gap: 40, color: palette.light },
      { text: chapterText[0]?.description ?? "", size: 39, color: palette.mount },
    ]} />
    <SurfaceText position={[-5.78, 2.35, -16.5]} rotation={Math.PI / 2} width={1.3} height={1.9} lines={[
      { text: chapterText[1]?.period ?? "", size: 100, serif: true, gap: 55, color: palette.mount },
      { text: chapterText[1]?.title ?? "", size: 80, serif: true, color: palette.light },
    ]} />
    <SurfaceText position={[-5.78, 2.3, -35.4]} rotation={Math.PI / 2} width={2.35} height={2.1} lines={[
      { text: `03 / ${chapterText[2]?.period ?? ""}`, size: 34, color: palette.mount, gap: 36 },
      { text: chapterText[2]?.title ?? "", size: 128, serif: true, gap: 35, color: palette.light },
      { text: chapterText[2]?.description ?? "", size: 38, color: palette.mount },
    ]} />
  </group>;
}
