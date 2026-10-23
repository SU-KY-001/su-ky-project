import { useEffect, useMemo, useRef, type ReactElement } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { AdditiveBlending, CanvasTexture, Object3D, Quaternion, Vector3, type SpotLight } from "three";
import { artworks, chapterAt, galleryPalette as palette } from "../data";
import { artworkLayout } from "../artworkLayout";

export function GalleryLighting(): ReactElement {
  const lights = useRef<(SpotLight | null)[]>([]);
  const { gl } = useThree();
  const previousLights = useRef("");
  useEffect(() => {
    const previous = gl.shadowMap.autoUpdate;
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
    return () => { gl.shadowMap.autoUpdate = previous; };
  }, [gl]);
  const bakedWash = useMemo(() => {
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 128;
    const context = canvas.getContext("2d");
    if (context) {
      const gradient = context.createRadialGradient(64, 62, 5, 64, 62, 64);
      gradient.addColorStop(0, "rgba(220,208,184,0.34)"); gradient.addColorStop(0.45, "rgba(220,208,184,0.19)"); gradient.addColorStop(1, "rgba(220,208,184,0)");
      context.fillStyle = gradient; context.fillRect(0, 0, 128, 128);
    }
    return new CanvasTexture(canvas);
  }, []);
  useEffect(() => () => bakedWash.dispose(), [bakedWash]);
  const fixtures = useMemo(() => artworks.map(art => {
    const center = artworkLayout(art.width, art.aspect).centerY;
    const normal = new Vector3(Math.sin(art.rotation), 0, Math.cos(art.rotation));
    const position = new Vector3(art.position[0], 4.04, art.position[2]).addScaledVector(normal, 3.1);
    const target = new Object3D();
    target.position.set(art.position[0], center - 0.15, art.position[2]);
    const direction = target.position.clone().sub(position).normalize();
    return { art, position, target, rotation: new Quaternion().setFromUnitVectors(new Vector3(0, -1, 0), direction) };
  }), []);
  const elapsed = useRef(1);
  useFrame(({ camera }, dt) => {
    elapsed.current += dt;
    if (elapsed.current < 0.35) return;
    elapsed.current = 0;
    const chapter = chapterAt(camera.position.x, camera.position.z);
    const nearest = fixtures.map((fixture, i) => ({ i, distance: fixture.position.distanceToSquared(camera.position) + (fixture.art.chapter === chapter ? 0 : 1000) })).sort((a, b) => a.distance - b.distance).slice(0, 4).map(item => item.i);
    lights.current.forEach((light, i) => {
      if (!light) return;
      light.visible = nearest.includes(i);
    });
    const signature = nearest.join(",");
    if (signature !== previousLights.current) { previousLights.current = signature; gl.shadowMap.needsUpdate = true; }
  });
  useEffect(() => () => fixtures.forEach(fixture => fixture.target.removeFromParent()), [fixtures]);
  return <group>
    <hemisphereLight args={[palette.light, palette.frame, 0.3]} />
    <ambientLight intensity={0.2} />
    {fixtures.map(({ art, position, target, rotation }, index) => <group key={art.id}>
      <primitive object={target} />
      <spotLight ref={value => { lights.current[index] = value; }} position={position} target={target} color={palette.light}
        intensity={90} distance={12} decay={2} angle={Math.PI / 9} penumbra={0.6}
        castShadow shadow-mapSize={[512, 512]} shadow-bias={-0.00015} shadow-normalBias={0.015} shadow-radius={3}
        shadow-camera-near={0.15} shadow-camera-far={12} />
      <mesh position={[art.position[0] - Math.sin(art.rotation) * 0.04, artworkLayout(art.width, art.aspect).centerY - 0.1, art.position[2] - Math.cos(art.rotation) * 0.04]} rotation={[0, art.rotation, 0]}>
        <planeGeometry args={[art.width + 2, 4]} /><meshBasicMaterial map={bakedWash} transparent blending={AdditiveBlending} depthWrite={false} opacity={0.4} />
      </mesh>
      <mesh position={[position.x, 4.32, position.z]}>
        <boxGeometry args={[0.045, 0.07, 0.8]} /><meshStandardMaterial color={palette.rail} roughness={0.85} />
      </mesh>
      <mesh position={[position.x, 4.18, position.z]}>
        <cylinderGeometry args={[0.025, 0.025, 0.28, 8]} /><meshStandardMaterial color={palette.rail} roughness={0.85} />
      </mesh>
      <group position={position} quaternion={rotation}>
        <mesh><cylinderGeometry args={[0.085, 0.105, 0.26, 16]} /><meshStandardMaterial color={palette.rail} roughness={0.75} /></mesh>
        <mesh position={[0, -0.135, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.08, 16]} /><meshBasicMaterial color={palette.light} />
        </mesh>
      </group>
    </group>)}
  </group>;
}
