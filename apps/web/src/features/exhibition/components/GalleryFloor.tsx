import { useEffect, useMemo, type ReactElement } from "react";
import { Shape, ShapeGeometry } from "three";
import { MeshReflectorMaterial } from "@react-three/drei/core/MeshReflectorMaterial.js";
import { makeConcreteMaps } from "../materials";

export function GalleryFloor(): ReactElement {
  const surface = useMemo(() => {
    const outline = new Shape();
    outline.moveTo(-6, -12); outline.lineTo(6, -12); outline.lineTo(6, 40); outline.lineTo(-6, 40); outline.closePath();
    const geometry = new ShapeGeometry(outline);
    const uv = geometry.getAttribute("uv");
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + 6) / 12, (uv.getY(i) + 12) / 52);
    return { geometry, ...makeConcreteMaps() };
  }, []);
  useEffect(() => () => { surface.geometry.dispose(); surface.color.dispose(); surface.roughness.dispose(); }, [surface]);
  return <mesh rotation={[-Math.PI / 2, 0, 0]} geometry={surface.geometry}>
    <MeshReflectorMaterial map={surface.color} roughnessMap={surface.roughness} roughness={1} metalness={0}
      resolution={512} blur={[140, 60]} mixBlur={1} mixStrength={0.7} mirror={0.17}
      mixContrast={0.65} depthScale={0.25} minDepthThreshold={0.1} maxDepthThreshold={1.6} />
  </mesh>;
}
