// A small seeded generator (mulberry32) for the few "random" twinkles in a show. Seeded from the music
// (a phrase's start time), so one song always gives one show.

export class Seeded {
  private s: number;

  constructor(seed: number) {
    this.s = seed >>> 0;
  }

  /** One float in [0, 1). */
  random(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(this.s ^ (this.s >>> 15), 1 | this.s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  randoms(n: number): Float64Array {
    return Float64Array.from({ length: n }, () => this.random());
  }

  /** 0 <= x < high. */
  integers(high: number): number {
    return Math.floor(this.random() * high);
  }

  /** `size` different numbers from 0..n-1, in random order. */
  choose(n: number, size: number): number[] {
    const pool = Array.from({ length: n }, (_, i) => i);
    for (let i = 0; i < size; i++) {
      const j = i + this.integers(n - i);
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, size);
  }
}
