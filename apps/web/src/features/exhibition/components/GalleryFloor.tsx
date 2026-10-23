import { useEffect, useMemo, type ReactElement } from "react";
import { Shape, ShapeGeometry } from "three";
import { MeshReflectorMaterial } from "@react-three/drei/core/MeshReflectorMaterial.js";
import { makeConcreteMaps } from "../materials";

export function GalleryFloor(): ReactElement {
  const surface = useMemo(() => {
    // Same footprint as the three existing rooms; one reflector avoids seams and extra renders.
    const outline = new Shape();
    outline.moveTo(-6, -12); outline.lineTo(6, -12); outline.lineTo(6, -4);
    outline.lineTo(22, -4); outline.lineTo(22, 24); outline.lineTo(10, 24);
    outline.lineTo(10, 8); outline.lineTo(-6, 8); outline.closePath();
    const geometry = new ShapeGeometry(outline);
    const uv = geometry.getAttribute("uv");
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + 6) / 28, (uv.getY(i) + 12) / 36);
    return { geometry, ...makeConcreteMaps() };
  }, []);
  useEffect(() => () => { surface.geometry.dispose(); surface.color.dispose(); surface.roughness.dispose(); }, [surface]);
  return <mesh rotation={[-Math.PI / 2, 0, 0]} geometry={surface.geometry}>
    <MeshReflectorMaterial map={surface.color} roughnessMap={surface.roughness} roughness={1} metalness={0}
      resolution={512} blur={[140, 60]} mixBlur={1} mixStrength={0.7} mirror={0.17}
      mixContrast={0.65} depthScale={0.25} minDepthThreshold={0.1} maxDepthThreshold={1.6} />
  </mesh>;
}
