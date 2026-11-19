import type { ReactElement } from "react";
import { galleryPalette as palette } from "../data";

const tracks = [
  { x: -3.8, z: 2, length: 16 }, { x: 3.8, z: 2, length: 16 },
  { x: -3.8, z: -16, length: 13 }, { x: 3.8, z: -16, length: 13 },
  { x: -3.8, z: -32, length: 13 }, { x: 3.8, z: -32, length: 13 },
];

export function GalleryCeilingLights(): ReactElement {
  return <group>{tracks.map(track => <group key={`${track.x}-${track.z}`}>
    <mesh position={[track.x, 4.32, track.z]}><boxGeometry args={[0.06, 0.06, track.length]} /><meshStandardMaterial color={palette.frame} /></mesh>
    {[-0.35, 0, 0.35].map(fraction => <group key={fraction} position={[track.x, 4.14, track.z + track.length * fraction]}>
      <mesh><cylinderGeometry args={[0.09, 0.12, 0.25, 12]} /><meshStandardMaterial color={palette.frame} roughness={0.8} /></mesh>
      <mesh position={[0, -0.13, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.085, 12]} /><meshBasicMaterial color={palette.light} /></mesh>
      <pointLight color={palette.light} intensity={8} distance={8} decay={2} />
    </group>)}
  </group>)}</group>;
}
