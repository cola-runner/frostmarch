/** Pointer gestures are measured in screen pixels, independent of camera zoom. */
export type ScreenPoint = { x: number; y: number };
type Pointer = ScreenPoint & { start: ScreenPoint; type: string };
export class BattleGestures {
  pointers = new Map<number, Pointer>();
  private dragged = false;
  private multi = false;
  begin(id: number, p: ScreenPoint, type = 'mouse') {
    if (!this.pointers.size) {
      this.dragged = false;
      this.multi = false;
    }
    this.pointers.set(id, { ...p, start: p, type });
    if (this.pointers.size > 1) this.multi = true;
  }
  move(
    id: number,
    p: ScreenPoint,
  ):
    | { kind: 'pan'; from: ScreenPoint; to: ScreenPoint }
    | { kind: 'pinch'; ratio: number; from: ScreenPoint; to: ScreenPoint }
    | null {
    const previous = this.pointers.get(id);
    if (!previous) return null;
    const before = [...this.pointers.values()];
    this.pointers.set(id, { ...previous, ...p });
    if (this.pointers.size > 1) {
      const after = [...this.pointers.values()];
      const oldDistance = Math.hypot(
        before[0].x - before[1].x,
        before[0].y - before[1].y,
      );
      const newDistance = Math.hypot(
        after[0].x - after[1].x,
        after[0].y - after[1].y,
      );
      if (newDistance < 8 || oldDistance < 8) return null;
      return {
        kind: 'pinch',
        ratio: oldDistance / newDistance,
        from: {
          x: (before[0].x + before[1].x) / 2,
          y: (before[0].y + before[1].y) / 2,
        },
        to: {
          x: (after[0].x + after[1].x) / 2,
          y: (after[0].y + after[1].y) / 2,
        },
      };
    }
    const threshold = previous.type === 'touch' ? 12 : 6;
    if (Math.hypot(p.x - previous.start.x, p.y - previous.start.y) > threshold)
      this.dragged = true;
    return this.dragged ? { kind: 'pan', from: previous, to: p } : null;
  }
  end(id: number, p: ScreenPoint, cancelled = false) {
    const pointer = this.pointers.get(id);
    const drift = pointer
      ? Math.hypot(p.x - pointer.start.x, p.y - pointer.start.y)
      : Infinity;
    const tap =
      !!pointer &&
      !cancelled &&
      !this.dragged &&
      !this.multi &&
      drift <= (pointer.type === 'touch' ? 12 : 6);
    this.pointers.delete(id);
    if (!this.pointers.size) {
      this.dragged = false;
      this.multi = false;
    }
    return tap ? { ...p, type: pointer!.type } : null;
  }
  cancel() {
    this.pointers.clear();
    this.dragged = false;
    this.multi = false;
  }
}
export function closestScreenUnit<T extends ScreenPoint>(
  units: T[],
  p: ScreenPoint,
  radius: number,
): T | undefined {
  let best: T | undefined,
    range = radius;
  for (const u of units) {
    const d = Math.hypot(u.x - p.x, u.y - p.y);
    if (d < range) {
      best = u;
      range = d;
    }
  }
  return best;
}
