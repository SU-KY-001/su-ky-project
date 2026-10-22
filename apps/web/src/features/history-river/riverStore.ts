import { create } from 'zustand';
import { events, type Perspective } from './data';

export type Panel = 'help' | 'gate' | 'event' | 'player' | 'map' | 'settings' | null;
export interface Controls { forward: boolean; fast: boolean; steer: number; brake: boolean }
interface RiverState {
  distance: number; lateral: number; velocity: number; era: number; visited: number[]; frontier: number;
  panel: Panel; selectedEra: number; eventId: string; witnessId: string; perspective: Perspective;
  anchored: boolean; brakeArmed: boolean; cruise: boolean; muted: boolean; reducedMotion: boolean;
  playing: boolean; elapsed: number; heard: number; rate: number; audioEventId: string;
  artifacts: string[]; witnesses: string[]; completed: string[];
  step: (dt: number, controls: Controls) => void; tick: (dt: number) => void;
  open: (panel: Panel) => void; close: () => void; dock: (id: string, witnessId?: string) => void;
  listen: (id: string, perspective: Perspective, witnessId?: string) => void;
  seek: (seconds: number) => void; togglePlay: () => void; brake: () => void;
  travel: (era: number) => void; reset: () => void;
}
const initial = {
  distance: 4, lateral: 0, velocity: 0, era: 0, visited: [0], frontier: 4,
  panel: 'help' as Panel, selectedEra: 0, eventId: events[0].id, witnessId: events[0].witnesses[0].id,
  perspective: 'Người dân' as Perspective, anchored: false, brakeArmed: false, cruise: false,
  muted: true, reducedMotion: false, playing: false, elapsed: 0, heard: 0, rate: 1, audioEventId: '',
  artifacts: [] as string[], witnesses: [] as string[], completed: [] as string[],
};
export const useRiverStore = create<RiverState>((set, get) => ({
  ...initial,
  reset: () => set({ ...initial }),
  open: panel => set({ panel, velocity: 0, cruise: false }),
  close: () => set({ panel: null }),
  step: (dt, controls) => {
    const s = get();
    if (s.panel) return;
    const forward = controls.forward || s.cruise;
    const anchored = forward ? false : s.anchored;
    const target = anchored || controls.brake ? 0 : forward ? (controls.fast ? 26 : 12) : 0;
    const velocity = s.velocity + (target - s.velocity) * (1 - Math.exp(-dt * (controls.brake ? 7 : 2)));
    const distance = Math.min(499, s.distance + velocity * dt);
    const era = Math.min(4, Math.floor(distance / 100));
    const changed = era !== s.era;
    set({ distance, velocity: changed ? 0 : velocity, era, anchored, brakeArmed: forward ? false : s.brakeArmed,
      lateral: Math.max(-5.5, Math.min(5.5, s.lateral + controls.steer * dt * 5)),
      frontier: Math.max(s.frontier, distance), visited: s.visited.includes(era) ? s.visited : [...s.visited, era],
      ...(changed ? { panel: 'gate' as Panel, cruise: false, selectedEra: era } : {}),
    });
  },
  dock: (eventId, witnessId) => set({ eventId, witnessId: witnessId ?? events.find(e => e.id === eventId)!.witnesses[0].id, panel: 'event', velocity: 0, cruise: false }),
  listen: (audioEventId, perspective, witnessId) => {
    const event = events.find(e => e.id === audioEventId);
    if (!event) return;
    set({ audioEventId, eventId: audioEventId, perspective, witnessId: witnessId ?? event.witnesses[0].id, elapsed: 0, heard: 0, playing: true, panel: 'player' });
  },
  tick: dt => {
    const s = get();
    if (!s.playing) return;
    const event = events.find(e => e.id === s.audioEventId);
    if (!event) return;
    const elapsed = Math.min(event.duration, s.elapsed + dt * s.rate);
    const heard = Math.min(event.duration, s.heard + dt * s.rate);
    const finished = elapsed >= event.duration - .001;
    const earned = finished && heard >= event.duration - .1;
    set({ elapsed, heard, playing: !finished,
      ...(earned ? { completed: [...new Set([...s.completed, event.id])], artifacts: [...new Set([...s.artifacts, event.id])], witnesses: [...new Set([...s.witnesses, ...event.witnesses.map(w => w.id)])] } : {}),
    });
  },
  seek: seconds => set(s => ({ elapsed: Math.max(0, Math.min(30, seconds)), heard: 0, playing: seconds >= 30 ? false : s.playing })),
  togglePlay: () => {
    const s = get();
    if (!s.audioEventId) return;
    set(s.elapsed >= 29.999 ? { elapsed: 0, heard: 0, playing: true } : { playing: !s.playing });
  },
  brake: () => set(s => ({ brakeArmed: true, anchored: s.brakeArmed ? !s.anchored : false, cruise: false, velocity: s.brakeArmed ? 0 : s.velocity * .4 })),
  travel: era => {
    const s = get();
    if (!s.visited.includes(era)) return;
    set({ era, distance: era * 100 + 4, lateral: 0, velocity: 0, anchored: false, cruise: false, panel: 'gate', selectedEra: era });
  },
}));

export function nearbyMarker(distance: number, lateral: number): { eventId: string; witnessId?: string } | undefined {
  let nearest: { eventId: string; witnessId?: string } | undefined;
  let best = 13;
  for (const event of events) {
    for (const witness of [false, true]) {
      const dz = event.distance + (witness ? 7 : 0) - distance;
      const dx = event.side * 7 - lateral;
      const d = Math.hypot(dz, dx);
      if (d < best) { best = d; nearest = { eventId: event.id, ...(witness ? { witnessId: event.witnesses[0].id } : {}) }; }
    }
  }
  return nearest;
}
