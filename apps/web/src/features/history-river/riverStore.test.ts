import { describe, expect, test, beforeEach } from 'bun:test';
import { useRiverStore } from './riverStore';

describe('history river journey', () => {
  beforeEach(() => useRiverStore.getState().reset());
  test('each new era interrupts movement with a gate, reachable without a mouse', () => {
    const s = useRiverStore.getState;
    s().close();
    for (let era = 1; era < 5; era++) {
      for (let i = 0; i < 2000 && s().era < era; i++) s().step(.05, { forward: true, fast: true, steer: 0, brake: false });
      expect(s().era).toBe(era);
      expect(s().panel).toBe('gate');
      const z = s().distance;
      s().step(1, { forward: true, fast: true, steer: 0, brake: false });
      expect(s().distance).toBe(z);
      s().close();
    }
    expect(s().visited).toEqual([0, 1, 2, 3, 4]);
  });
  test('map cannot teleport into fog; visited era can be revisited', () => {
    useRiverStore.getState().travel(4);
    expect(useRiverStore.getState().era).toBe(0);
    useRiverStore.setState({ visited: [0, 1], era: 1, distance: 120 });
    useRiverStore.getState().travel(0);
    expect(useRiverStore.getState().distance).toBe(4);
  });
  test('seeking to the end does not grant rewards; actual listening does, once', () => {
    const s = useRiverStore.getState;
    s().listen('era-1-event-1', 'Người dân');
    s().seek(30);
    expect(s().artifacts).toHaveLength(0);
    s().listen('era-1-event-1', 'Người dân');
    for (let i = 0; i < 300; i++) s().tick(.1);
    expect(s().artifacts).toHaveLength(1);
    expect(s().witnesses).toHaveLength(2);
    s().listen('era-1-event-1', 'Người lính');
    for (let i = 0; i < 300; i++) s().tick(.1);
    expect(s().artifacts).toHaveLength(1);
  });
});
