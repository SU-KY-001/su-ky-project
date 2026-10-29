import { useEffect, useRef, type ReactElement } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Edges } from "@react-three/drei";
import { NoToneMapping } from "three";
import { exhibitionTemplate, type ExhibitionDocument } from "@repo/shared";
import { GalleryArchitecture, GalleryCeilingLights, galleryPalette, placementToPose } from "@/features/exhibition";

function FirstFrame({ onReady, onError }: { onReady: () => void; onError: () => void }): null {
  const frame = useRef<number | null>(null);
  const canvas = useThree(state => state.gl.domElement);
  useFrame(() => { if (frame.current === null) frame.current = requestAnimationFrame(onReady); });
  useEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current); frame.current = null; }, []);
  useEffect(() => {
    canvas.addEventListener("webglcontextlost", onError);
    return () => canvas.removeEventListener("webglcontextlost", onError);
  }, [canvas, onError]);
  return null;
}
function Unsupported({ onError }: { onError: () => void }): null {
  useEffect(() => { onError(); }, [onError]);
  return null;
}
export default function ExhibitionCreateScene({ chapters, onReady, onError }: { chapters: ExhibitionDocument["chapters"]; onReady: () => void; onError: () => void }): ReactElement {
  return <Canvas fallback={<Unsupported onError={onError} />} gl={{ antialias: true, powerPreference: "high-performance", alpha: false, toneMapping: NoToneMapping }} camera={{ position: [...exhibitionTemplate.spawns[0].position], rotation: [-0.13, 0, 0], fov: 66 }}><color attach="background" args={[galleryPalette.wall]} /><ambientLight intensity={0.55} color={galleryPalette.light} /><hemisphereLight args={[galleryPalette.light, galleryPalette.floor, 0.35]} /><directionalLight position={[-3, 8, 6]} intensity={Math.PI * 0.078} color={galleryPalette.light} /><GalleryArchitecture chapterText={chapters} /><GalleryCeilingLights />{exhibitionTemplate.suggestions.map(point => { const pose = placementToPose({ ...point, width: 2 }); return <mesh key={`${point.wallId}-${point.offset}`} position={pose.position} rotation={[0, pose.rotation, 0]}><planeGeometry args={[1.3, 1]} /><meshBasicMaterial color={galleryPalette.trim} transparent opacity={0.18} /><Edges color={galleryPalette.frame} /></mesh>; })}<FirstFrame onReady={onReady} onError={onError} /></Canvas>;
}
