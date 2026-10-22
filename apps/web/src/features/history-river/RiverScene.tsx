import { Component, useMemo, useRef, type RefObject, type ReactNode, type ReactElement } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Fog, Group, MeshStandardMaterial, Vector3 } from 'three';
import { eras, events, riverX } from './data';
import { useRiverStore } from './riverStore';

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } { return { failed: true }; }
  render(): ReactNode { return this.state.failed ? <div className="river-fallback">Trình duyệt chưa tạo được cảnh WebGL. Bạn vẫn có thể chèo bằng phím, cập bến và dùng bản đồ. Thử bật tăng tốc phần cứng để xem 3D.</div> : this.props.children; }
}

function Ribbon({ from, to, left, right, color }: { from: number; to: number; left: number; right: number; color: string }): ReactElement {
  const material = useRef<MeshStandardMaterial>(null);
  const tint = useMemo(() => new Color(color), [color]);
  useFrame((_, dt) => {
    const s = useRiverStore.getState();
    const nearby = from <= s.distance + 30 && to >= s.distance - 30;
    tint.set(nearby ? (left === -8 ? eras[s.era].water : eras[s.era].bank) : color);
    material.current?.color.lerp(tint, Math.min(dt * 1.5, 1));
  });
  const geometry = useMemo(() => {
    const positions: number[] = [];
    for (let z = from; z < to; z += 2) {
      const next = Math.min(to, z + 2);
      const a = riverX(z), b = riverX(next);
      positions.push(a + left, 0, -z, a + right, 0, -z, b + right, 0, -next, a + left, 0, -z, b + right, 0, -next, b + left, 0, -next);
    }
    const g = new BufferGeometry(); g.setAttribute('position', new Float32BufferAttribute(positions, 3)); g.computeVertexNormals(); return g;
  }, [from, to, left, right]);
  return <mesh geometry={geometry} position={[0, left === -8 ? 0 : .05, 0]}><meshStandardMaterial ref={material} color={color} side={DoubleSide} roughness={.7} /></mesh>;
}

function World({ labels }: { labels: RefObject<Map<string, HTMLDivElement>> }): ReactElement {
  const boat = useRef<Group>(null);
  const water = useRef<MeshStandardMaterial>(null);
  const smooth = useRef(4);
  const x = useRef(0);
  const sky = useMemo(() => new Color(eras[0].sky), []);
  const target = useMemo(() => new Color(), []);
  const cameraTarget = useMemo(() => new Vector3(), []);
  const projected = useMemo(() => new Vector3(), []);
  const era = useRiverStore(s => s.era);
  const distance = useRiverStore(s => s.distance);
  useFrame(({ camera, scene, clock, size }, dt) => {
    const s = useRiverStore.getState();
    const amount = 1 - Math.exp(-Math.min(dt, .1) * 8);
    if (Math.abs(smooth.current - s.distance) > 35) smooth.current = s.distance;
    smooth.current += (s.distance - smooth.current) * amount;
    x.current += (riverX(smooth.current) + s.lateral - x.current) * amount;
    const bob = s.reducedMotion ? 0 : Math.sin(clock.elapsedTime * 1.7) * .07;
    if (boat.current) {
      boat.current.position.set(x.current, .48 + bob, -smooth.current);
      boat.current.rotation.z = s.reducedMotion ? 0 : Math.sin(clock.elapsedTime * 1.3) * .025;
      boat.current.rotation.y = -Math.cos(smooth.current / 34) * .13;
    }
    camera.position.set(x.current * .55 + riverX(smooth.current) * .45, 8, -smooth.current + 15);
    cameraTarget.set(riverX(smooth.current + 18), 1.2, -smooth.current - 18);
    camera.lookAt(cameraTarget);
    camera.updateMatrixWorld();
    for (const event of events) {
      for (const isWitness of [false, true]) {
        const element = labels.current.get(`${event.id}-${isWitness}`);
        if (!element) continue;
        const z = event.distance + (isWitness ? 7 : 0);
        const visible = Math.abs(z - s.distance) < (isWitness ? 15 : 20) && z < s.frontier + 20;
        projected.set(riverX(z) + event.side * 8.1, isWitness ? 3.6 : 5.7, -z).project(camera);
        element.style.display = visible && projected.z < 1 && projected.z > -1 ? 'grid' : 'none';
        element.style.left = `${(projected.x * .5 + .5) * size.width}px`;
        element.style.top = `${(-projected.y * .5 + .5) * size.height}px`;
      }
    }
    sky.lerp(target.set(eras[s.era].sky), Math.min(dt * 1.5, 1));
    scene.background = sky;
    if (scene.fog instanceof Fog) {
      scene.fog.color.copy(sky);
      scene.fog.far = 72 + Math.min(70, Math.max(0, s.frontier - s.distance));
    }
    if (water.current) water.current.color.lerp(target.set(eras[s.era].water), Math.min(dt * 1.5, 1));
  });
  return <>
    <fog attach="fog" args={[eras[era].sky, 22, 72]} />
    <ambientLight intensity={1.5} /><directionalLight position={[15, 30, 10]} intensity={2} />
    {eras.map((e, i) => <group key={e.id}>
      <Ribbon from={i * 100 - (i === 0 ? 35 : 0)} to={(i + 1) * 100} left={-8} right={8} color={e.water} />
      <Ribbon from={i * 100 - (i === 0 ? 35 : 0)} to={(i + 1) * 100} left={-45} right={-8} color={e.bank} />
      <Ribbon from={i * 100 - (i === 0 ? 35 : 0)} to={(i + 1) * 100} left={8} right={45} color={e.bank} />
      {i > 0 && <group position={[riverX(i * 100), 0, -i * 100]}>
        {[-9, 9].map(side => <mesh key={side} position={[side, 5, 0]}><boxGeometry args={[.8, 10, .8]} /><meshStandardMaterial color="#4c4c4c" /></mesh>)}
        <mesh position={[0, 10, 0]}><boxGeometry args={[19, .6, .8]} /><meshStandardMaterial color="#4c4c4c" /></mesh>
      </group>}
    </group>)}
    {Array.from({ length: 120 }, (_, i) => {
      const z = i * 4.5, side = i % 2 ? -1 : 1;
      return <group key={i} position={[riverX(z) + side * (11 + (i % 4) * 3), .15, -z]}>
        <mesh position={[0, 1.4, 0]}><cylinderGeometry args={[.13, .25, 2.8, 5]} /><meshStandardMaterial color="#555957" /></mesh>
        <mesh position={[0, 3, 0]}><coneGeometry args={[1.2 + i % 2 * .4, 3.5, 5]} /><meshStandardMaterial color={i % 3 ? '#737a72' : '#a7aaa0'} flatShading /></mesh>
      </group>;
    })}
    {events.filter(e => Math.abs(e.distance - distance) < 85).map(e => <group key={e.id}>
      <group position={[riverX(e.distance) + e.side * 8.1, .2, -e.distance]}>
        <mesh position={[0, 2, 0]}><cylinderGeometry args={[.15, .3, 4, 6]} /><meshStandardMaterial color="#292929" /></mesh>
        <mesh position={[0, 4.2, 0]} rotation={[0, 0, Math.PI / 4]}><boxGeometry args={[1.2, 1.2, .3]} /><meshStandardMaterial color="#f5f5f5" emissive="#cccccc" emissiveIntensity={.5} /></mesh>
      </group>
      <group position={[riverX(e.distance + 7) + e.side * 8.2, .3, -e.distance - 7]}>
        <mesh position={[0, 1, 0]}><coneGeometry args={[.65, 2, 7]} /><meshStandardMaterial color="#444444" /></mesh>
        <mesh position={[0, 2.35, 0]}><sphereGeometry args={[.38, 10, 10]} /><meshStandardMaterial color="#dddddd" /></mesh>
      </group>
    </group>)}
    <group ref={boat}>
      <mesh scale={[1, .5, 2.4]} rotation={[0, Math.PI / 4, 0]}><cylinderGeometry args={[1, .65, 1, 4]} /><meshStandardMaterial color="#454545" flatShading /></mesh>
      <mesh position={[0, .2, 0]} scale={[.65, .15, 2]}><boxGeometry /><meshStandardMaterial color="#bcbcbc" /></mesh>
      <mesh position={[0, .7, .4]}><coneGeometry args={[.35, 1.2, 8]} /><meshStandardMaterial color="#777777" /></mesh>
      <mesh position={[0, 1.45, .4]}><coneGeometry args={[.65, .35, 12]} /><meshStandardMaterial color="#e6e6e6" /></mesh>
      <mesh position={[1, .5, .6]} rotation={[0, 0, -.6]}><boxGeometry args={[.12, 2.5, .16]} /><meshStandardMaterial color="#303030" /></mesh>
    </group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.15, -220]}><planeGeometry args={[200, 650]} /><meshStandardMaterial ref={water} color={eras[0].water} /></mesh>
  </>;
}

export function RiverScene(): ReactElement {
  const labels = useRef(new Map<string, HTMLDivElement>());
  return <SceneBoundary><Canvas camera={{ position: [0, 8, 19], fov: 52 }} dpr={[1, 1.5]} gl={{ antialias: true }}><World labels={labels} /></Canvas><div className="river-label-layer" aria-hidden="true">{events.flatMap(event => [false, true].map(isWitness => <div key={`${event.id}-${isWitness}`} ref={element => { const id = `${event.id}-${isWitness}`; if (element) labels.current.set(id, element); else labels.current.delete(id); }} className={`river-marker ${isWitness ? 'witness' : ''}`} style={{ display: 'none' }}><b>{isWitness ? 'CHỨNG NHÂN' : `SỰ KIỆN · ${event.year}`}</b><span>{isWitness ? event.witnesses[0].name : event.name}</span>{!isWitness && <small>{event.question}</small>}</div>))}</div></SceneBoundary>;
}
export function ArtifactViewer(): ReactElement {
  return <SceneBoundary><Canvas camera={{ position: [0, 2, 5], fov: 40 }} dpr={[1, 1.5]}><ambientLight intensity={2} /><directionalLight position={[2, 4, 4]} intensity={3} /><mesh><cylinderGeometry args={[1.15, .9, 1.2, 16]} /><meshStandardMaterial color="#a0a0a0" wireframe /></mesh><mesh position={[0, .62, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.3, .9, 12]} /><meshStandardMaterial color="#333333" side={DoubleSide} /></mesh><OrbitControls enableZoom={false} enablePan={false} /></Canvas></SceneBoundary>;
}
