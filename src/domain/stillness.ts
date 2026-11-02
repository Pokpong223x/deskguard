import type { Vector3 } from './motion';
/** Continuous stable samples only: missing data never counts as stillness. */
export class StillnessDetector {
  private anchor: Vector3 | null = null;
  private since = 0;
  private last = 0;
  reset() { this.anchor = null; this.since = 0; this.last = 0; }
  sample(a: Vector3, r: Vector3 | null, now: number): boolean {
    if (![a.x, a.y, a.z, now, ...(r ? [r.x, r.y, r.z] : [])].every(Number.isFinite)) { this.reset(); return false; }
    const gap = this.anchor === null || now <= this.last || now - this.last > 500;
    this.last = now;
    if (gap || (r && Math.hypot(r.x, r.y, r.z) > 0.08) || (this.anchor && Math.hypot(a.x-this.anchor.x, a.y-this.anchor.y, a.z-this.anchor.z) > 0.025)) {
      this.anchor = { ...a }; this.since = now; return false;
    }
    return now - this.since >= 3000;
  }
}
