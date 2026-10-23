import { useEffect, useMemo, useRef, type ReactElement } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferAttribute, BufferGeometry, CanvasTexture, type Points } from "three";
import { artworks, chapterAt } from "../data";
import { artworkLayout } from "../artworkLayout";

export function GalleryAtmosphere(): ReactElement {
  const points = useRef<Points>(null);
  const reducedMotion = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const dust = useMemo(() => {
    const positions = new Float32Array(artworks.length * 18 * 3);
    const base = new Float32Array(positions.length);
    let seed = 1975;
    const random = (): number => { seed = seed * 16807 % 2147483647; return seed / 2147483647; };
    artworks.forEach((art, index) => {
      for (let n = 0; n < 18; n++) {
        const t = 0.15 + random() * 0.75;
        const radius = t * 0.55;
        const offset = (index * 18 + n) * 3;
        base[offset] = art.position[0] + Math.sin(art.rotation) * 3.1 * (1 - t) + (random() - 0.5) * radius;
        base[offset + 1] = 4.04 + (artworkLayout(art.width, art.aspect).centerY - 4.04) * t;
        base[offset + 2] = art.position[2] + Math.cos(art.rotation) * 3.1 * (1 - t) + (random() - 0.5) * radius;
      }
    });
    positions.set(base);
    const geometry = new BufferGeometry(); geometry.setAttribute("position", new BufferAttribute(positions, 3));
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 16;
    const context = canvas.getContext("2d");
    if (context) {
      const gradient = context.createRadialGradient(8, 8, 0, 8, 8, 8);
      gradient.addColorStop(0, "rgba(255,248,230,1)"); gradient.addColorStop(1, "rgba(255,248,230,0)");
      context.fillStyle = gradient; context.fillRect(0, 0, 16, 16);
    }
    return { base, positions, geometry, sprite: new CanvasTexture(canvas) };
  }, []);
  useEffect(() => () => { dust.geometry.dispose(); dust.sprite.dispose(); }, [dust]);
  useFrame(({ clock, camera }) => {
    const chapter = chapterAt(camera.position.x, camera.position.z);
    const time = reducedMotion ? 0 : clock.elapsedTime;
    for (let i = 0; i < dust.positions.length / 3; i++) {
      const j = i * 3;
      const visible = artworks[Math.floor(i / 18)]?.chapter === chapter;
      dust.positions[j] = dust.base[j]! + Math.sin(time * 0.11 + i) * 0.025;
      dust.positions[j + 1] = visible ? dust.base[j + 1]! + Math.sin(time * 0.09 + i * 2) * 0.05 : -10;
      dust.positions[j + 2] = dust.base[j + 2]!;
    }
    dust.geometry.attributes.position!.needsUpdate = true;
  });
  return <points ref={points} geometry={dust.geometry} frustumCulled={false} raycast={() => undefined}>
    <pointsMaterial map={dust.sprite} size={0.014} transparent opacity={0.13} depthWrite={false} color="#d5cdbb" toneMapped={false} />
  </points>;
}
