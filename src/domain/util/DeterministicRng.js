/** Mulberry32: explicit serializable uint32 state, no wall clock or Math.random. */
export class DeterministicRng {
  /** @param {number} seed */
  constructor(seed) { if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('INVALID_SEED'); this.state = seed >>> 0; }
  next() {
    this.state = (this.state + 0x6D2B79F5) >>> 0;
    let t = this.state; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}
