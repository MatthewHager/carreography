// The arithmetic the choreography decides frames with, done exactly as numpy does it. The shows were
// first made by the Python version (tag python-final), and bridge.test.ts holds this code to them byte
// for byte, so a sum, a median or a rounding here must land on the same float: Python's
// round-half-to-even, numpy's quantile interpolation, its pairwise sums (and float32 ones), interp,
// linspace, arange, its argsort's order for ties. Don't "simplify" the order of operations.
// Arrays are plain number[] or Float64Array.

type Arr = ArrayLike<number>;

/** Python's round() / numpy's rint: halves go to the even neighbour. */
export function round(x: number): number {
  const f = Math.floor(x);
  const d = x - f;
  if (d === 0.5) return f % 2 === 0 ? f : f + 1;
  return Math.round(x);
}

/** numpy's round(x, decimals): rint(x * 10**d) / 10**d. */
export function roundTo(x: number, d: number): number {
  const f = 10 ** d;
  return round(x * f) / f;
}

/** Python's round(x, ndigits): the exact binary value rounded to d decimals, ties to even. A tie is
 * exact only when x * 2^(d + 1) is an odd integer; then numpy's rounding gives the same answer. */
export function pyRound(x: number, d: number): number {
  const tie = Number.isInteger(x * 2 ** (d + 1)) && !Number.isInteger(x * 2 ** d);
  return tie ? roundTo(x, d) : Number(x.toFixed(d));
}

/** a[i], counting from the end for a negative i (Python's indexing). */
export function at<T>(a: ArrayLike<T>, i: number): T {
  return a[i < 0 ? a.length + i : i];
}

/** Python's % (the sign of the divisor), also numpy's float remainder. */
export function pymod(a: number, b: number): number {
  let m = a % b;
  if (m !== 0 && (b < 0) !== (m < 0)) m += b;
  return m;
}

/** numpy's pairwise summation of a[start .. start+n) (used by sum and mean on float arrays). */
function pairwise(a: Arr, start: number, n: number): number {
  if (n < 8) {
    let res = 0;
    for (let i = 0; i < n; i++) res += a[start + i];
    return res;
  }
  if (n <= 128) {
    const r = [a[start], a[start + 1], a[start + 2], a[start + 3], a[start + 4], a[start + 5], a[start + 6], a[start + 7]];
    let i = 8;
    for (; i < n - (n % 8); i += 8) for (let j = 0; j < 8; j++) r[j] += a[start + i + j];
    let res = ((r[0] + r[1]) + (r[2] + r[3])) + ((r[4] + r[5]) + (r[6] + r[7]));
    for (; i < n; i++) res += a[start + i];
    return res;
  }
  let n2 = Math.floor(n / 2);
  n2 -= n2 % 8;
  return pairwise(a, start, n2) + pairwise(a, start + n2, n - n2);
}

// numpy reduces in buffers of 8192 elements, summing each pairwise and the buffers in turn
const BUFSIZE = 8192;

/** np.sum of a float array. */
export function sum(a: Arr, start = 0, end = a.length): number {
  let acc = 0;
  for (let s = start; s < end; s += BUFSIZE) acc += pairwise(a, s, Math.min(end, s + BUFSIZE) - s);
  return acc;
}

export function mean(a: Arr, start = 0, end = a.length): number {
  return sum(a, start, end) / (end - start);
}

/** np.std (population). */
export function std(a: Arr): number {
  const m = mean(a);
  const d = new Float64Array(a.length);
  for (let i = 0; i < a.length; i++) d[i] = (a[i] - m) * (a[i] - m);
  return Math.sqrt(mean(d));
}

export function max(a: Arr, start = 0, end = a.length): number {
  let m = -Infinity;
  for (let i = start; i < end; i++) if (a[i] > m) m = a[i];
  return m;
}

export function min(a: Arr, start = 0, end = a.length): number {
  let m = Infinity;
  for (let i = start; i < end; i++) if (a[i] < m) m = a[i];
  return m;
}

/** Index of the first maximum. */
export function argmax(a: Arr): number {
  let k = 0;
  for (let i = 1; i < a.length; i++) if (a[i] > a[k]) k = i;
  return k;
}

export function argmin(a: Arr): number {
  let k = 0;
  for (let i = 1; i < a.length; i++) if (a[i] < a[k]) k = i;
  return k;
}

function sorted(a: Arr): Float64Array {
  return Float64Array.from(a).sort();
}

/** numpy's linear-method quantile of one q. */
export function quantile(a: Arr, q: number): number {
  return quantileSorted(sorted(a), q);
}

function quantileSorted(s: Arr, q: number): number {
  const n = s.length;
  const v = (n - 1) * q;
  let lo = Math.floor(v);
  let hi = lo + 1;
  if (v >= n - 1) lo = hi = n - 1;
  else if (v < 0) lo = hi = 0;
  const t = v - lo;
  const a = s[lo], b = s[hi];
  const diff = b - a;
  return t >= 0.5 ? b - diff * (1 - t) : a + diff * t;
}

export function quantiles(a: Arr, qs: number[]): number[] {
  const s = sorted(a);
  return qs.map((q) => quantileSorted(s, q));
}

export function percentile(a: Arr, p: number): number {
  return quantile(a, p / 100);
}

export function median(a: Arr): number {
  const s = sorted(a);
  const n = s.length;
  if (n % 2) return s[(n - 1) / 2];
  return (s[n / 2 - 1] + s[n / 2]) / 2;
}

/** np.interp for one x (xp ascending). */
function interp1(x: number, xp: Arr, fp: Arr): number {
  const n = xp.length;
  if (x > xp[n - 1]) return fp[n - 1];
  if (x < xp[0]) return fp[0];
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (xp[mid] <= x) lo = mid;
    else hi = mid;
  }
  let j = x >= xp[hi] ? hi : lo;
  if (j === n - 1 || xp[j] === x) return fp[j];
  const slope = (fp[j + 1] - fp[j]) / (xp[j + 1] - xp[j]);
  let r = slope * (x - xp[j]) + fp[j];
  if (Number.isNaN(r)) {
    r = slope * (x - xp[j + 1]) + fp[j + 1];
    if (Number.isNaN(r) && fp[j] === fp[j + 1]) r = fp[j];
  }
  return r;
}

export function interp(x: Arr, xp: Arr, fp: Arr): Float64Array {
  const out = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = interp1(x[i], xp, fp);
  return out;
}

/** np.linspace(start, stop, num) with the endpoint. */
export function linspace(start: number, stop: number, num: number): Float64Array {
  const out = new Float64Array(Math.max(0, num));
  const div = num - 1;
  const delta = stop - start;
  if (div > 0) {
    const step = delta / div;
    for (let i = 0; i < num; i++) out[i] = (step === 0 ? (i / div) * delta : i * step) + start;
    out[num - 1] = stop;
  } else if (num === 1) {
    out[0] = start;
  }
  return out;
}

/** np.arange(start, stop, step) for floats: numpy fills start + i * ((start + step) - start). */
export function arange(start: number, stop?: number, step = 1): Float64Array {
  if (stop === undefined) [start, stop] = [0, start];
  const n = Math.max(0, Math.ceil((stop - start) / step));
  const out = new Float64Array(n);
  if (n === 0) return out;
  out[0] = start;
  if (n > 1) {
    const delta = (start + step) - start;
    for (let i = 1; i < n; i++) out[i] = start + i * delta;
  }
  return out;
}

/** np.searchsorted (side 'left' or 'right'). */
export function searchsorted(a: Arr, v: number, side: 'left' | 'right' = 'left'): number {
  let lo = 0, hi = a.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (side === 'left' ? a[mid] < v : a[mid] <= v) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function diff(a: Arr): Float64Array {
  const out = new Float64Array(Math.max(0, a.length - 1));
  for (let i = 1; i < a.length; i++) out[i - 1] = a[i] - a[i - 1];
  return out;
}

export function cumsum(a: Arr): Float64Array {
  const out = new Float64Array(a.length);
  let s = 0;
  for (let i = 0; i < a.length; i++) out[i] = s += a[i];
  return out;
}

export function clip(x: number, lo: number, hi: number): number {
  return Math.min(Math.max(x, lo), hi);
}

// np.convolve(a, v, 'same') as numpy 1.26 computes it on Apple silicon:
// numpy turns each output into a BLAS ddot of a window of `a` with the reversed kernel. OpenBLAS's
// ddot (arm64, contiguous) adds the first n & -4 products into two separate accumulators (a product
// and then an add, no fusing), adds the two, and folds the 0-3 leftover products in with fused
// multiply-adds. Reproduced here so tied loudness values stay tied (and rank) as in the Python version.

const bits = new DataView(new ArrayBuffer(8));

/** x = m * 2^e with m an integer (BigInt). */
function decompose(x: number): [bigint, number] {
  if (x === 0) return [0n, 0];
  bits.setFloat64(0, x);
  const hi = bits.getUint32(0), lo = bits.getUint32(4);
  const expBits = (hi >>> 20) & 0x7ff;
  let m = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo);
  let e: number;
  if (expBits === 0) e = -1074;
  else {
    m |= 1n << 52n;
    e = expBits - 1075;
  }
  return [hi >>> 31 ? -m : m, e];
}

/** m * 2^e rounded to the nearest double (ties to even). */
function toDouble(m: bigint, e: number): number {
  if (m === 0n) return 0;
  const neg = m < 0n;
  if (neg) m = -m;
  const len = m.toString(2).length;
  if (len > 53) {
    const sh = BigInt(len - 53);
    const rem = m & ((1n << sh) - 1n);
    m >>= sh;
    const half = 1n << (sh - 1n);
    if (rem > half || (rem === half && (m & 1n) === 1n)) m += 1n;
    e += Number(sh);
  }
  const h = Math.trunc(e / 2);
  const r = Number(m) * 2 ** h * 2 ** (e - h);
  return neg ? -r : r;
}

/** a * b + c with a single rounding (a hardware fused multiply-add). */
function fma(a: number, b: number, c: number): number {
  const [ma, ea] = decompose(a), [mb, eb] = decompose(b), [mc, ec] = decompose(c);
  const mp = ma * mb, ep = ea + eb;
  if (mp === 0n) return a * b + c;
  if (mc === 0n) return toDouble(mp, ep);
  const e = Math.min(ep, ec);
  return toDouble((mp << BigInt(ep - e)) + (mc << BigInt(ec - e)), e);
}

function dotBlas(x: Arr, xo: number, y: Arr, yo: number, n: number): number {
  const n1 = n & -4;
  let a0 = 0, a1 = 0;
  for (let i = 0; i < n1; i += 2) {
    a0 = a0 + x[xo + i] * y[yo + i];
    a1 = a1 + x[xo + i + 1] * y[yo + i + 1];
  }
  let d = a0 + a1;
  for (let i = n1; i < n; i++) d = fma(y[yo + i], x[xo + i], d);
  return d;
}

/** np.convolve(a, v, mode='same'), bit for bit (numpy 1.26 + OpenBLAS on arm64). */
export function convolveSame(a: Arr, v: Arr): Float64Array {
  if (v.length > a.length) [a, v] = [v, a];
  const n1 = a.length, n2 = v.length;
  const r = Float64Array.from({ length: n2 }, (_, i) => v[n2 - 1 - i]);   // v[::-1]
  const nLeft = Math.floor(n2 / 2), nRight = n2 - nLeft - 1;
  const out = new Float64Array(n1);
  let o = 0, n = n2 - nLeft, off = nLeft;
  for (let i = 0; i < nLeft; i++) {
    out[o++] = dotBlas(a, 0, r, off, n);
    n++;
    off--;
  }
  for (let i = 0; i < n1 - n2 + 1; i++) out[o++] = dotBlas(a, i, r, off, n);
  for (let i = 0; i < nRight; i++) {
    n--;
    out[o++] = dotBlas(a, n1 - n2 + 1 + i, r, off, n);
  }
  return out;
}

/** Slope of a least-squares line through (0, y0), (1, y1), ... (np.polyfit(x, y, 1)[0]). */
export function slope(y: Arr): number {
  const n = y.length;
  const mx = (n - 1) / 2;
  const my = mean(y);
  let sxy = 0, sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (i - mx) * (y[i] - my);
    sxx += (i - mx) * (i - mx);
  }
  return sxy / sxx;
}

/** Pearson correlation (np.corrcoef(x, y)[0, 1], in numpy's order of operations). */
export function corrcoef(x: Arr, y: Arr): number {
  const mx = mean(x), my = mean(y);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < x.length; i++) {
    sxy += (x[i] - mx) * (y[i] - my);
    sxx += (x[i] - mx) * (x[i] - mx);
    syy += (y[i] - my) * (y[i] - my);
  }
  const f = 1 / (x.length - 1);
  return clip((sxy * f) / Math.sqrt(sxx * f) / Math.sqrt(syy * f), -1, 1);
}

/** float -> uint8 as numpy's astype does for values already in 0..255: truncation. */
export function u8(x: number): number {
  return x <= 0 ? 0 : x >= 255 ? 255 : Math.trunc(x);
}

/** np.argsort with numpy's default (unstable) introsort, so ties come out in the same order. */
export function argsort(v: Arr): number[] {
  const num = v.length;
  const idx = Array.from({ length: num }, (_, i) => i);
  if (num < 2) return idx;
  const less = (a: number, b: number) => a < b || (b !== b && a === a);   // NaNs sort last
  const swap = (i: number, j: number) => {
    const t = idx[i];
    idx[i] = idx[j];
    idx[j] = t;
  };
  const stack: number[] = [];
  const depths: number[] = [];
  let pl = 0, pr = num - 1;
  let cdepth = 2 * Math.floor(Math.log2(num));
  for (;;) {
    if (cdepth < 0) {
      heapArgsort(v, idx, pl, pr - pl + 1, less);
    } else {
      while (pr - pl > 15) {
        const pm = pl + ((pr - pl) >> 1);
        if (less(v[idx[pm]], v[idx[pl]])) swap(pm, pl);
        if (less(v[idx[pr]], v[idx[pm]])) swap(pr, pm);
        if (less(v[idx[pm]], v[idx[pl]])) swap(pm, pl);
        const vp = v[idx[pm]];
        let pi = pl, pj = pr - 1;
        swap(pm, pj);
        for (;;) {
          do ++pi; while (less(v[idx[pi]], vp));
          do --pj; while (less(vp, v[idx[pj]]));
          if (pi >= pj) break;
          swap(pi, pj);
        }
        swap(pi, pr - 1);
        if (pi - pl < pr - pi) {
          stack.push(pi + 1, pr);
          pr = pi - 1;
        } else {
          stack.push(pl, pi - 1);
          pl = pi + 1;
        }
        depths.push(--cdepth);
      }
      for (let pi = pl + 1; pi <= pr; ++pi) {
        const vi = idx[pi], vp = v[vi];
        let pj = pi;
        while (pj > pl && less(vp, v[idx[pj - 1]])) {
          idx[pj] = idx[pj - 1];
          pj--;
        }
        idx[pj] = vi;
      }
    }
    if (!stack.length) break;
    pr = stack.pop()!;
    pl = stack.pop()!;
    cdepth = depths.pop()!;
  }
  return idx;
}

function heapArgsort(v: Arr, idx: number[], start: number, n: number, less: (a: number, b: number) => boolean) {
  // numpy's aheapsort, on idx[start .. start + n), 1-based internally
  const a = (k: number) => idx[start + k - 1];
  const setA = (k: number, x: number) => (idx[start + k - 1] = x);
  let i: number, j: number, l: number, tmp: number;
  for (l = n >> 1; l > 0; --l) {
    tmp = a(l);
    for (i = l, j = l << 1; j <= n;) {
      if (j < n && less(v[a(j)], v[a(j + 1)])) j += 1;
      if (less(v[tmp], v[a(j)])) {
        setA(i, a(j));
        i = j;
        j += j;
      } else break;
    }
    setA(i, tmp);
  }
  for (; n > 1;) {
    tmp = a(n);
    setA(n, a(1));
    n -= 1;
    for (i = 1, j = 2; j <= n;) {
      if (j < n && less(v[a(j)], v[a(j + 1)])) j++;
      if (less(v[tmp], v[a(j)])) {
        setA(i, a(j));
        i = j;
        j += j;
      } else break;
    }
    setA(i, tmp);
  }
}

// float32 arrays (librosa's onset envelope) stay float32 in numpy: every add rounds to float32.
const f32 = Math.fround;

function pairwise32(a: Arr, start: number, n: number): number {
  if (n < 8) {
    let res = 0;
    for (let i = 0; i < n; i++) res = f32(res + a[start + i]);
    return res;
  }
  if (n <= 128) {
    const r = [a[start], a[start + 1], a[start + 2], a[start + 3], a[start + 4], a[start + 5], a[start + 6], a[start + 7]];
    let i = 8;
    for (; i < n - (n % 8); i += 8) for (let j = 0; j < 8; j++) r[j] = f32(r[j] + a[start + i + j]);
    let res = f32(f32(f32(r[0] + r[1]) + f32(r[2] + r[3])) + f32(f32(r[4] + r[5]) + f32(r[6] + r[7])));
    for (; i < n; i++) res = f32(res + a[start + i]);
    return res;
  }
  let n2 = Math.floor(n / 2);
  n2 -= n2 % 8;
  return f32(pairwise32(a, start, n2) + pairwise32(a, start + n2, n - n2));
}

/** np.sum / np.mean of a float32 array, in float32. */
export function sum32(a: Arr, start = 0, end = a.length): number {
  let acc = 0;
  for (let s = start; s < end; s += BUFSIZE) acc = f32(acc + pairwise32(a, s, Math.min(end, s + BUFSIZE) - s));
  return acc;
}

export function mean32(a: Arr, start = 0, end = a.length): number {
  return f32(sum32(a, start, end) / (end - start));
}

/** np.median of a float32 array (the middle two are averaged in float32). */
export function median32(a: Arr): number {
  const s = Float64Array.from(a).sort();
  const n = s.length;
  if (n % 2) return s[(n - 1) / 2];
  return f32(f32(s[n / 2 - 1] + s[n / 2]) / 2);
}

/** [start, end) for each run of true. */
export function runs(mask: ArrayLike<number | boolean>): [number, number][] {
  const out: [number, number][] = [];
  let i = 0;
  while (i < mask.length) {
    if (mask[i]) {
      let j = i;
      while (j < mask.length && mask[j]) j++;
      out.push([i, j]);
      i = j;
    } else i++;
  }
  return out;
}
