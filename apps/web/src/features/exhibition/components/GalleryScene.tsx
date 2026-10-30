import { Canvas } from "@react-three/fiber";
import { useEffect, useRef, type ReactElement } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { galleryPalette, type Artwork } from "../data";
import { GalleryArchitecture } from "./GalleryArchitecture";
import { GalleryCeilingLights } from "./GalleryCeilingLights";
import { GalleryArtwork } from "./GalleryArtwork";
import { GalleryArtworkLights } from "./GalleryArtworkLights";
import { GalleryControls, initialView, type ControlsProps } from "./GalleryControls";
import { NoToneMapping } from "three";

function ContextEvents({ onUnavailable, onReady }: { onUnavailable: () => void; onReady?: () => void }): null {
  const { gl } = useThree();
  const reported = useRef(false);
  useFrame(() => {
    if (!reported.current) { reported.current = true; onReady?.(); }
  });
  useEffect(() => {
    const lost = (event: Event): void => { event.preventDefault(); onUnavailable(); };
    gl.domElement.addEventListener("webglcontextlost", lost);
    return () => gl.domElement.removeEventListener("webglcontextlost", lost);
  }, [gl, onUnavailable]);
  return null;
}

export function GalleryScene(props: ControlsProps & { onUnavailable: () => void; onReady?: () => void; items: Artwork[]; chapterText: { title: string; period: string; description: string }[] }): ReactElement {
  return <Canvas
    camera={{ position: initialView.position, fov: 66, near: 0.08, far: 90 }}
    dpr={[1, 1.5]} frameloop={props.active ? "always" : "demand"}
    gl={{ antialias: true, powerPreference: "high-performance", alpha: false, toneMapping: NoToneMapping }}
    fallback={<div className="exhibition-canvas-fallback">Không gian 3D cần WebGL. Bạn vẫn có thể đọc toàn bộ ảnh trong mục lục triển lãm.</div>}
    onCreated={({ gl }) => { gl.domElement.tabIndex = 0; gl.domElement.setAttribute("aria-label", props.keyboardRequiresFocus ? "Không gian triển lãm 3D. WASD hoặc mũi tên để đi, kéo để nhìn, Q và R để xoay, Tab để rời khung." : "Không gian triển lãm 3D. WASD để đi, chuột để nhìn, E xem ảnh, M mở mục lục, Esc tạm dừng."); }}
  >
    <color attach="background" args={[galleryPalette.wall]} />
    <ambientLight intensity={0.55} color={galleryPalette.light} />
    <hemisphereLight args={[galleryPalette.light, galleryPalette.floor, 0.35]} />
    <directionalLight position={[-3, 8, 6]} intensity={Math.PI * 0.078} color={galleryPalette.light} />
    <GalleryArchitecture chapterText={props.chapterText} artworks={props.items} />
    <GalleryCeilingLights />
    <GalleryArtworkLights artworks={props.items} />
    {props.items.map(artwork => <GalleryArtwork key={artwork.id} artwork={artwork} />)}
    <GalleryControls {...props} roomCount={props.chapterText.length} />
    <ContextEvents onUnavailable={props.onUnavailable} onReady={props.onReady} />
  </Canvas>;
}
