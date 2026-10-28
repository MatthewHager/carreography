// numpy's default_rng (PCG64 seeded through SeedSequence), bit for bit. The shows don't use it (they use
// seeded.ts); it stays only because listen/align.test.ts builds its test signals from these exact numbers.
// Delete it once that test no longer depends on them.

const M32 = 0xffffffffn;
const M64 = 0xffffffffffffffffn;
const M128 = (1n << 128n) - 1n;
const PCG_MULT = (2549297995355413924n << 64n) | 4865540595714422341n;

const INIT_A = 0x43b0d7e5;
const MULT_A = 0x931e8875;
const INIT_B = 0x8b51f9dd;
const MULT_B = 0x58f38ded;
const MIX_MULT_L = 0xca01f9dd;
const MIX_MULT_R = 0x4973f715;

const mul32 = (a: number, b: number) => Math.imul(a, b) >>> 0;

/** SeedSequence(entropy).generate_state(n32) for a non-negative integer seed. */
function seedState(seed: bigint, n32: number): number[] {
  const entropy: number[] = [];
  if (seed === 0n) entropy.push(0);
  for (let s = seed; s > 0n; s >>= 32n) entropy.push(Number(s & M32));
  const hc = { v: INIT_A };
  const hashmix = (value: number) => {
    value = (value ^ hc.v) >>> 0;
    hc.v = mul32(hc.v, MULT_A);
    value = mul32(value, hc.v);
    return (value ^ (value >>> 16)) >>> 0;
  };
  const mix = (x: number, y: number) => {
    const r = (mul32(MIX_MULT_L, x) - mul32(MIX_MULT_R, y)) >>> 0;
    return (r ^ (r >>> 16)) >>> 0;
  };
  const pool = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) pool[i] = hashmix(i < entropy.length ? entropy[i] : 0);
  for (let s = 0; s < 4; s++) for (let d = 0; d < 4; d++) if (s !== d) pool[d] = mix(pool[d], hashmix(pool[s]));
  for (let s = 4; s < entropy.length; s++) for (let d = 0; d < 4; d++) pool[d] = mix(pool[d], hashmix(entropy[s]));
  let hb = INIT_B;
  const out: number[] = [];
  for (let i = 0; i < n32; i++) {
    let v = (pool[i % 4] ^ hb) >>> 0;
    hb = mul32(hb, MULT_B);
    v = mul32(v, hb);
    out.push((v ^ (v >>> 16)) >>> 0);
  }
  return out;
}

export class Rng {
  private state: bigint;
  private inc: bigint;
  private hasU32 = false;
  private u32 = 0;

  constructor(seed: number | bigint) {
    const w = seedState(BigInt(seed), 8).map(BigInt);
    const u64 = (i: number) => w[2 * i] | (w[2 * i + 1] << 32n);
    const initstate = (u64(0) << 64n) | u64(1);
    const initseq = (u64(2) << 64n) | u64(3);
    this.inc = ((initseq << 1n) | 1n) & M128;
    this.state = 0n;
    this.step();
    this.state = (this.state + initstate) & M128;
    this.step();
  }

  private step() {
    this.state = (this.state * PCG_MULT + this.inc) & M128;
  }

  next64(): bigint {
    this.step();
    const hi = this.state >> 64n;
    const x = (hi ^ (this.state & M64)) & M64;
    const rot = hi >> 58n;
    return ((x >> rot) | (x << ((64n - rot) & 63n))) & M64;
  }

  private next32(): number {
    if (this.hasU32) {
      this.hasU32 = false;
      return this.u32;
    }
    const n = this.next64();
    this.hasU32 = true;
    this.u32 = Number(n >> 32n);
    return Number(n & M32);
  }

  /** One float in [0, 1). */
  random(): number {
    return Number(this.next64() >> 11n) * (1 / 9007199254740992);
  }

  randoms(n: number): Float64Array {
    const out = new Float64Array(n);
    for (let i = 0; i < n; i++) out[i] = this.random();
    return out;
  }

  /** A value in 0..rng inclusive (numpy's random_bounded_uint64, Lemire's method). */
  private bounded(rng: number): number {
    if (rng === 0) return 0;
    if (rng === 0xffffffff) return this.next32();
    if (rng < 0xffffffff) {
      const excl = BigInt(rng + 1);
      let m = BigInt(this.next32()) * excl;
      let left = m & M32;
      if (left < excl) {
        const threshold = (M32 - BigInt(rng)) % excl;
        while (left < threshold) {
          m = BigInt(this.next32()) * excl;
          left = m & M32;
        }
      }
      return Number(m >> 32n);
    }
    throw new Error('ranges above 2**32 are not needed by the shows');
  }

  /** integers(high): 0 <= x < high. */
  integers(high: number): number {
    return this.bounded(high - 1);
  }

  /** choice(n, size, replace=false) with numpy's Floyd's algorithm and final shuffle. */
  choiceNoReplace(n: number, size: number): number[] {
    if (n > 10000) throw new Error('large populations are not needed by the shows');
    const idx = new Array<number>(size);
    let mask = Math.floor(1.2 * size);
    for (const s of [1, 2, 4, 8, 16]) mask |= mask >>> s;
    const set = new Map<number, number>();   // loc -> value (open addressing, as numpy does)
    for (let j = n - size; j < n; j++) {
      const val = this.bounded(j);
      let loc = val & mask;
      while (set.has(loc) && set.get(loc) !== val) loc = (loc + 1) & mask;
      if (!set.has(loc)) {
        set.set(loc, val);
        idx[j - n + size] = val;
      } else {
        loc = j & mask;
        while (set.has(loc)) loc = (loc + 1) & mask;
        set.set(loc, j);
        idx[j - n + size] = j;
      }
    }
    for (let i = size - 1; i >= 1; i--) {
      const j = this.bounded(i);
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    return idx;
  }
}
