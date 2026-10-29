import { useEffect, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Raycaster, Vector2 } from "three";
import { exhibitionTemplate } from "@repo/shared";
import { benchWalls, chapterAt, galleryReturns, walls, type Artwork, type Point3 } from "../data";
import { movePlayer } from "../movement";

export interface GalleryInput { keys: Set<string> }
export interface GalleryView { position: Point3; yaw: number; revision: number }
export interface ControlsProps {
  active: boolean;
  input: RefObject<GalleryInput>;
  view: GalleryView;
  onPause: () => void;
  onNavigate: () => void;
  onInspect: (id: string) => void;
  onTarget: (id: string | null) => void;
  onChapter: (chapter: number) => void;
  onViewChange?: (view: GalleryView) => void;
  pointerLockOnClick?: boolean;
  items?: Artwork[];
  roomCount?: number;
}

const walkingKeys = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

export function GalleryControls({ active, input, view, onPause, onNavigate, onInspect, onTarget, onChapter, onViewChange, pointerLockOnClick = false, items = [], roomCount = 3 }: ControlsProps): null {
  const { camera, gl, scene, invalidate } = useThree();
  const velocity = useRef({ x: 0, z: 0 });
  const drag = useRef({ active: false, x: 0, y: 0, distance: 0 });
  const ray = useRef(new Raycaster());
  const aim = useRef(new Vector2());
  const elapsed = useRef(0);
  const lastTarget = useRef<string | null>(null);
  const currentChapter = useRef(0);
  const callbacks = useRef({ onPause, onNavigate, onInspect, onTarget, onChapter });
  callbacks.current = { onPause, onNavigate, onInspect, onTarget, onChapter };

  useEffect(() => {
    camera.position.set(...view.position);
    camera.rotation.set(-0.13, view.yaw, 0, "YXZ");
    velocity.current = { x: 0, z: 0 };
    input.current.keys.clear();
    currentChapter.current = chapterAt(view.position[0], view.position[2]);
    callbacks.current.onChapter(currentChapter.current);
    invalidate();
  }, [camera, input, view, invalidate]);

  useEffect(() => {
    if (!active) {
      input.current.keys.clear(); velocity.current = { x: 0, z: 0 }; drag.current.active = false;
      callbacks.current.onTarget(null); lastTarget.current = null;
      return;
    }
    const canvas = gl.domElement;
    const inspect = (clientX?: number, clientY?: number): void => {
      aim.current.set(0, 0);
      if (!document.pointerLockElement && clientX !== undefined && clientY !== undefined) {
        const rect = canvas.getBoundingClientRect();
        aim.current.set((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1);
      }
      ray.current.setFromCamera(aim.current, camera);
      const hit = ray.current.intersectObjects(scene.children, true)[0];
      const id: unknown = hit?.object.userData.artworkId;
      if (hit && hit.distance < 5.5 && typeof id === "string") callbacks.current.onInspect(id);
    };
    const keyDown = (event: KeyboardEvent): void => {
      if (event.target instanceof HTMLElement && event.target.closest("button, input, textarea, select, [contenteditable=true], [role=dialog]")) return;
      if (walkingKeys.has(event.code)) { event.preventDefault(); input.current.keys.add(event.code); }
      if (event.code === "Escape") callbacks.current.onPause();
      if (event.code === "KeyM") { event.preventDefault(); callbacks.current.onNavigate(); }
      if (event.code === "KeyE" && !event.repeat) inspect();
      if (event.code === "KeyQ") camera.rotation.y += 0.12;
      if (event.code === "KeyR") camera.rotation.y -= 0.12;
    };
    const keyUp = (event: KeyboardEvent): void => { input.current.keys.delete(event.code); };
    const clear = (): void => { input.current.keys.clear(); drag.current.active = false; callbacks.current.onPause(); };
    const hidden = (): void => { if (document.hidden) clear(); };
    const pointerDown = (event: PointerEvent): void => {
      drag.current = { active: true, x: event.clientX, y: event.clientY, distance: 0 };
      if (!document.pointerLockElement) canvas.setPointerCapture(event.pointerId);
    };
    const pointerMove = (event: PointerEvent): void => {
      if (!document.pointerLockElement && !drag.current.active) return;
      const dx = document.pointerLockElement ? event.movementX : event.clientX - drag.current.x;
      const dy = document.pointerLockElement ? event.movementY : event.clientY - drag.current.y;
      camera.rotation.y -= dx * 0.002;
      camera.rotation.x = Math.max(-1.05, Math.min(1.05, camera.rotation.x - dy * 0.002));
      drag.current.x = event.clientX; drag.current.y = event.clientY; drag.current.distance += Math.abs(dx) + Math.abs(dy);
    };
    const pointerUp = (event: PointerEvent): void => {
      if (pointerLockOnClick && !document.pointerLockElement && drag.current.active && drag.current.distance < 8 && !window.matchMedia("(pointer: coarse)").matches) {
        drag.current.active = false;
        void canvas.requestPointerLock().catch(() => undefined);
        return;
      }
      if (drag.current.active && (document.pointerLockElement || drag.current.distance < 8)) inspect(event.clientX, event.clientY);
      drag.current.active = false;
    };
    const lockChanged = (): void => { if (pointerLockOnClick && !document.pointerLockElement) { input.current.keys.clear(); callbacks.current.onPause(); } };
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", hidden);
    document.addEventListener("pointerlockchange", lockChanged);
    canvas.addEventListener("pointerdown", pointerDown);
    document.addEventListener("pointermove", pointerMove);
    canvas.addEventListener("pointerup", pointerUp);
    canvas.addEventListener("pointercancel", clear);
    return () => {
      input.current.keys.clear();
      onViewChange?.({ position: [camera.position.x, camera.position.y, camera.position.z], yaw: camera.rotation.y, revision: view.revision + 1 });
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", hidden);
      document.removeEventListener("pointerlockchange", lockChanged);
      canvas.removeEventListener("pointerdown", pointerDown);
      document.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("pointerup", pointerUp);
      canvas.removeEventListener("pointercancel", clear);
    };
  }, [active, camera, gl, input, scene]);

  useFrame((_, delta) => {
    if (!active) return;
    const dt = Math.min(delta, 0.05);
    const keys = input.current.keys;
    const forward = Number(keys.has("KeyW") || keys.has("ArrowUp")) - Number(keys.has("KeyS") || keys.has("ArrowDown"));
    const side = Number(keys.has("KeyD") || keys.has("ArrowRight")) - Number(keys.has("KeyA") || keys.has("ArrowLeft"));
    const scale = 2.15 / Math.max(1, Math.hypot(forward, side));
    const yaw = camera.rotation.y;
    const targetX = (Math.cos(yaw) * side - Math.sin(yaw) * forward) * scale;
    const targetZ = (-Math.sin(yaw) * side - Math.cos(yaw) * forward) * scale;
    const damping = 1 - Math.exp(-12 * dt);
    velocity.current.x += (targetX - velocity.current.x) * damping;
    velocity.current.z += (targetZ - velocity.current.z) * damping;
    if (Math.abs(velocity.current.x) + Math.abs(velocity.current.z) > 0.001) {
      const endWall = roomCount < 3 ? [{ a: [2, roomCount === 1 ? -8 : -24] as const, b: [5, roomCount === 1 ? -8 : -24] as const }] : [];
      const [x, z] = movePlayer([camera.position.x, camera.position.z], [velocity.current.x * dt, velocity.current.z * dt], [...walls, ...benchWalls, ...galleryReturns(items), ...endWall]);
      camera.position.set(x, 1.65, z);
    }
    const chapter = chapterAt(camera.position.x, camera.position.z);
    if (chapter !== currentChapter.current) { currentChapter.current = chapter; callbacks.current.onChapter(chapter); }
    elapsed.current += dt;
    if (elapsed.current > 0.16) {
      elapsed.current = 0;
      aim.current.set(0, 0);
      ray.current.setFromCamera(aim.current, camera);
      const hit = ray.current.intersectObjects(scene.children, true)[0];
      const id: unknown = hit?.object.userData.artworkId;
      const target = hit && hit.distance < 5.5 && typeof id === "string" ? id : null;
      if (target !== lastTarget.current) { lastTarget.current = target; callbacks.current.onTarget(target); }
    }
  });
  return null;
}

export const initialView: GalleryView = { position: [...exhibitionTemplate.spawns[0].position], yaw: exhibitionTemplate.spawns[0].yaw, revision: 0 };
