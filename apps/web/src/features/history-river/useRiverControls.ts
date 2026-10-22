import { useEffect } from 'react';
import { nearbyMarker, useRiverStore } from './riverStore';

export function useRiverControls(): void {
  useEffect(() => {
    const keys = new Set<string>();
    const clear = (): void => { keys.clear(); };
    const unsubscribe = useRiverStore.subscribe((state, previous) => { if (state.panel !== previous.panel) clear(); });
    const down = (event: KeyboardEvent): void => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const key = event.key.toLowerCase();
      const target = event.target;
      if (target instanceof HTMLElement && (target.matches('input, select, textarea') || target.isContentEditable)) return;
      const s = useRiverStore.getState();
      const nativeButton = target instanceof HTMLElement && !!target.closest('button');
      if (nativeButton && (key === 'enter' || key === ' ')) return;
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'm', 'e', 'enter', 'escape'].includes(key)) event.preventDefault();
      keys.add(key);
      if (event.repeat) return;
      if (key === 'escape') s.close();
      if (key === 'm') { useRiverStore.setState({ selectedEra: s.era }); s.open(s.panel === 'map' ? null : 'map'); }
      if (key === ' ' || key === 'enter') {
        if (s.panel === 'help') s.open('gate');
        else if (s.panel === 'gate') s.close();
        else if (key === 'enter' && s.panel === 'event') s.listen(s.eventId, s.perspective, s.witnessId);
        else if (key === 'enter' && s.panel === 'map') s.travel(s.selectedEra);
        else if (key === ' ') s.togglePlay();
      }
      if (s.panel === 'map' && ['arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(key)) {
        useRiverStore.setState({ selectedEra: Math.max(0, Math.min(4, s.selectedEra + (key === 'arrowleft' || key === 'arrowup' ? -1 : 1))) });
      }
      if (!s.panel) {
        if (key === 's' || key === 'arrowdown') s.brake();
        if (key === 'e') { const nearby = nearbyMarker(s.distance, s.lateral); if (nearby) s.dock(nearby.eventId, nearby.witnessId); }
      }
    };
    const up = (event: KeyboardEvent): void => { keys.delete(event.key.toLowerCase()); };
    let frame = 0;
    let last = performance.now();
    const animate = (now: number): void => {
      const elapsed = (now - last) / 1000;
      if (elapsed >= .04) {
        last = now;
        const dt = Math.min(elapsed, .1);
        if (!document.hidden) {
          const s = useRiverStore.getState();
          s.step(dt, { forward: keys.has('w') || keys.has('arrowup'), fast: keys.has('shift'), steer: Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft')), brake: keys.has('s') || keys.has('arrowdown') });
          s.tick(dt);
        }
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', clear);
    return () => {
      cancelAnimationFrame(frame); unsubscribe();
      window.removeEventListener('keydown', down); window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear); document.removeEventListener('visibilitychange', clear);
    };
  }, []);
}
