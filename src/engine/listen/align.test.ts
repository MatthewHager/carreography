import { describe, expect, it } from 'vitest';
import type { LyricLine } from '../analysis';
import { sungFor } from '../lyrics';
import { align, place, shiftLines, STEP, vocalCurve } from './align';

/** Numbers in [0, 1) from a fixed seed (mulberry32): any will do, the same every run. */
function numbers(seed: number) {
  let s = seed >>> 0;
  const random = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
  };
  return { random, integers: (n: number) => Math.floor(random() * n),
    randoms: (n: number) => Float64Array.from({ length: n }, random) };
}

/** Lines at irregular times, as a verse-chorus song has them: a few words each, with breaks between groups. */
function someLines(n: number, seed = 1, start = 8): LyricLine[] {
  const r = numbers(seed), out: LyricLine[] = [];
  let t = start;
  for (let i = 0; i < n; i++) {
    const words = 3 + r.integers(6);
    const text = Array.from({ length: words }, (_, k) => `word${k}`).join(' ');
    const next = t + 1.2 + 0.35 * words + r.random() * 1.5 + (i % 6 === 5 ? 6 + r.random() * 6 : 0);
    out.push({ t: Math.round(t * 100) / 100, end: Math.round(next * 100) / 100, text });
    t = next;
  }
  return out;
}

/** A vocalCurve-like signal: noise, lifted while each line (moved by `shift` seconds) is sung. */
function curveFor(lines: LyricLine[], duration: number, shift: number, lift = 1.5, seed = 7): Float64Array {
  const r = numbers(seed), c = Float64Array.from(r.randoms(Math.round(duration / STEP)), (v) => v * 2 - 1);
  for (const l of lines) {
    for (let f = Math.round((l.t + shift) / STEP); f < Math.round((l.t + shift + sungFor(l)) / STEP); f++) {
      if (f >= 0 && f < c.length) c[f] += lift;
    }
  }
  return c;
}

describe('align', () => {
  const lines = someLines(30);
  const duration = lines[lines.length - 1].end + 20;

  it.each([3.4, -7.2, 0.3, 12.0])('finds lines moved by %s s', (shift) => {
    const a = align(lines, curveFor(lines, duration, shift), duration, duration - shift);
    expect(a?.by).toBe('voice');
    expect(a!.agree).toBeGreaterThanOrEqual(2);
    expect(Math.abs(a!.offset - shift)).toBeLessThanOrEqual(0.06);
  });

  it("keeps LRCLIB's times for a same-length release when the voice can't tell", () => {
    const flat = new Float64Array(Math.round(duration / STEP));
    expect(align(lines, flat, duration, duration + 1)).toMatchObject({ offset: 0, by: 'length' });
    expect(align(lines, null, duration, duration - 2)).toMatchObject({ offset: 0, by: 'length' });
  });

  it('gives up when neither the voice nor the length says where the lines go', () => {
    expect(align(lines, new Float64Array(Math.round(duration / STEP)), duration, duration + 20)).toBeNull();
    expect(align(lines, null, duration, duration + 20)).toBeNull();
  });

  it("won't keep LRCLIB's times when the voice clearly puts them elsewhere", () => {
    // only the middle third is sung where the lyrics say, 9 s late: no agreement, and 0 s fits badly
    const curve = curveFor(lines.slice(10, 20), duration, 9, 3);
    expect(align(lines, curve, duration, duration)).toBeNull();
  });
});

describe('vocalCurve', () => {
  const sr = 22050, seconds = 60;
  const sung: [number, number][] = [[3, 5.5], [7, 10], [12.5, 14], [17, 21], [23, 24.5], [28, 31], [34, 36.5],
    [39, 43], [46, 47.5], [50, 54]];

  /** Wide, uncorrelated noise left and right, plus a centred voice-like tone while `sung`. */
  function stereo(seed = 3): [Float32Array, Float32Array] {
    const r = numbers(seed), n = sr * seconds;
    const noise = r.randoms(2 * n);
    const left = new Float32Array(n), right = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const voice = sung.some(([a, b]) => t >= a && t < b)
        ? 0.3 * (Math.sin(2 * Math.PI * 330 * t) + 0.5 * Math.sin(2 * Math.PI * 660 * t) + 0.3 * Math.sin(2 * Math.PI * 990 * t))
        : 0;
      left[i] = 0.2 * (noise[2 * i] - 0.5) + voice;
      right[i] = 0.2 * (noise[2 * i + 1] - 0.5) + voice;
    }
    return [left, right];
  }

  it('rises while the centred voice sounds', () => {
    const [l, r] = stereo();
    const c = vocalCurve(l, r, sr)!;
    expect(c.length).toBe(Math.floor((sr * seconds) / Math.round(sr * STEP)) + 1);
    const mean = (a: number, b: number) => {
      let s = 0;
      for (let f = Math.round(a / STEP); f < Math.round(b / STEP); f++) s += c[f] / Math.round((b - a) / STEP);
      return s;
    };
    for (const [a, b] of sung) expect(mean(a + 0.2, b - 0.2)).toBeGreaterThan(mean(14.5, 16.5) + 0.15);
  });

  it('is null for a mono recording', () => {
    const [l] = stereo();
    expect(vocalCurve(l, l, sr)).toBeNull();
  });

  it('places lines in the audio', () => {
    // lines LRCLIB timed 2.5 s later than this recording has them, each as many words as fill its time
    const words = (a: number, b: number) => Array.from({ length: Math.round((b - a - 0.6) / 0.33) }, (_, k) => `w${k}`);
    const ls: LyricLine[] = sung.map(([a, b]) => ({ t: a + 2.5, end: b + 3, text: words(a, b).join(' ') }));
    const [l, r] = stereo();
    const a = align(ls, vocalCurve(l, r, sr), seconds, seconds + 10);
    expect(a?.by).toBe('voice');
    expect(Math.abs(a!.offset + 2.5)).toBeLessThanOrEqual(0.2);
  });
});

describe('place', () => {
  it('takes the first version that lines up, moved into place', () => {
    const good = someLines(24, 2, 3), bad = someLines(4, 9, 3);       // too few lines to place
    const duration = good[good.length - 1].end + 10;
    const curve = curveFor(good, duration, -2);
    const placed = place([{ id: 1, duration: duration + 40, lines: bad }, { id: 2, duration: duration + 2, lines: good }],
      curve, duration);
    expect(placed.report).toMatchObject({ status: 'found', by: 'voice', offset: -2 });
    expect(placed.lines!.map((l) => l.t)).toEqual(good.map((l) => Math.round((l.t - 2) * 100) / 100));
    expect(placed.report.lines).toBe(good.length);
  });

  it('reports lyrics that fit nowhere', () => {
    const lines = someLines(12);
    expect(place([{ id: 1, duration: 500, lines }], null, 100).report.status).toBe('unplaced');
  });
});

describe('shiftLines', () => {
  it('keeps the lines that start inside the song', () => {
    const lines = [{ t: 1, end: 3, text: 'a' }, { t: 5, end: 9, text: 'b' }, { t: 58, end: 66, text: 'c' }];
    expect(shiftLines(lines, -2, 60)).toEqual([{ t: 3, end: 7, text: 'b' }, { t: 56, end: 60, text: 'c' }]);
    expect(shiftLines(lines, 2, 60)).toEqual([{ t: 3, end: 5, text: 'a' }, { t: 7, end: 11, text: 'b' }]);
    expect(shiftLines(lines, 1, 70)).toEqual([
      { t: 2, end: 4, text: 'a' }, { t: 6, end: 10, text: 'b' }, { t: 59, end: 67, text: 'c' }]);
  });
});
