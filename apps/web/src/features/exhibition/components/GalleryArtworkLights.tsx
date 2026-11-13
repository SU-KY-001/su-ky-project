import { useEffect, useMemo, useRef, type ReactElement } from "react";
import { useFrame } from "@react-three/fiber";
import { Object3D, Vector3, type SpotLight } from "three";
import { galleryPalette, type Artwork } from "../data";

export function GalleryArtworkLights({ artworks }: { artworks: Artwork[] }): ReactElement {
  const lights = useRef<(SpotLight | null)[]>([]);
  const fixtures = useMemo(() => artworks.map(artwork => {
    const normal = new Vector3(Math.sin(artwork.rotation), 0, Math.cos(artwork.rotation));
    const target = new Object3D();
    target.position.set(artwork.position[0], 1.75, artwork.position[2]);
    const position = new Vector3(artwork.position[0], 4.05, artwork.position[2]).addScaledVector(normal, 1.65);
    return { id: artwork.id, position, target };
  }), [artworks]);
  useEffect(() => () => fixtures.forEach(fixture => fixture.target.removeFromParent()), [fixtures]);
  const elapsed = useRef(1);
  useFrame(({ camera }, delta) => {
    elapsed.current += delta;
    if (elapsed.current < 0.4) return;
    elapsed.current = 0;
    const nearest = new Set(fixtures.map((fixture, index) => ({ index, distance: fixture.position.distanceToSquared(camera.position) })).sort((a, b) => a.distance - b.distance).slice(0, 8).map(value => value.index));
    lights.current.forEach((light, index) => { if (light) light.visible = nearest.has(index); });
  });
  return <group>{fixtures.map((fixture, index) => <group key={fixture.id}>
    <primitive object={fixture.target} />
    <spotLight ref={light => { lights.current[index] = light; }} position={fixture.position} target={fixture.target} color={galleryPalette.light} intensity={35} distance={9} angle={0.42} penumbra={0.85} decay={2} visible={index < 8} />
  </group>)}</group>;
}
