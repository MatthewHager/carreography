// Phrase segmentation and classification: the unit a choreographer works in.
//
// A phrase is a run of events between breaths. Boundaries fall at rests (>= 0.3 s with nothing
// sounding), after a held note (>= 0.8 s), at arrivals (a big chord starts a new phrase), where the
// texture changes for good, and at most every MAX_PHRASE seconds (split at the weakest moment).
//
// Each phrase gets one `gesture`:
//   motif        a few quick notes landing on a held note (the Toccata's mordent-and-run)
//   run          a monotonic scale, 5+ notes
//   figuration   a long stretch of fast single notes (broken chords, zigzags)
//   trill        rapid two-note alternation
//   chords       mostly 3+ voice events
//   cadence      a short phrase of big chords (an ending or a punctuation)
//   recitative   slow single notes with space between them

import type { Analysis, Events, Phrase } from './analysis';
import { mean, searchsorted } from './np';

const MAX_PHRASE = 8.0;

/** The frames a phrase covers on the analysis grid: [first, end), never empty. */
export function frameSpan(an: Pick<Analysis, 'step'>, ph: Pick<Phrase, 't0' | 't1'>): [number, number] {
  const f0 = Math.trunc(ph.t0 / an.step);
  return [f0, Math.max(f0 + 1, Math.trunc(ph.t1 / an.step))];
}

/** `cutsAt`: extra phrase boundaries in seconds (sung lines), snapped to the nearest event. */
export function segment(ev: Events, cutsAt?: number[] | null): Phrase[] {
  const n = ev.t.length;
  if (n === 0) return [];
  const t = ev.t, top = ev.top, kind = ev.kind;
  const dur = ev.dur.map((d) => Math.min(d, 4.0));
  const endT = t.map((x, i) => x + dur[i]);
  const forced = new Set<number>();
  for (const ct of cutsAt ?? []) {
    const i = searchsorted(t, ct);
    if (i > 0 && i < n && Math.abs(t[i] - ct) < 0.6) forced.add(i);
  }
  const maxEnd = (a: number, b: number) => {
    let m = -Infinity;
    for (let k = a; k < b; k++) m = Math.max(m, endT[k]);
    return m;
  };
  const cuts = [0];
  for (let i = 1; i < n; i++) {
    const soundingUntil = Math.max(maxEnd(Math.max(0, i - 4), i), t[i - 1] + 0.05);
    const gap = t[i] - soundingUntil;
    const heldBefore = dur[i - 1] >= 0.8 && t[i] - t[i - 1] >= 0.6;
    const ph = ev.phrase;
    const textureChange = (ph[i] !== ph[i - 1] && i + 3 < n
      && [i, i + 1, i + 2, i + 3].every((j) => ph[j] === ph[i])
      && ['chords', 'arrival', 'trill'].includes(ph[i]))
      || (['chords', 'trill'].includes(ph[i - 1]) && !['chords', 'trill'].includes(ph[i]));
    if (gap >= 0.3 || heldBefore || ev.arrival[i] || textureChange || forced.has(i)) {
      if (i - cuts[cuts.length - 1] >= 2) cuts.push(i);
    }
  }
  cuts.push(n);

  // Split anything longer than MAX_PHRASE at its weakest internal moment (largest gap).
  let bounds: [number, number][] = [];
  for (let c = 0; c < cuts.length - 1; c++) {
    const stack: [number, number][] = [[cuts[c], cuts[c + 1]]];
    while (stack.length) {
      const [a2, b2] = stack.pop()!;
      if (t[b2 - 1] - t[a2] <= MAX_PHRASE || b2 - a2 < 8) {
        bounds.push([a2, b2]);
        continue;
      }
      // prefer a split near the middle
      const mid = (t[a2] + t[b2 - 1]) / 2;
      let k = -1, best = -Infinity;
      for (let i = a2 + 4; i < b2 - 4; i++) {
        const score = (t[i] - t[i - 1]) - 0.02 * Math.abs(t[i] - mid);
        if (score > best) [best, k] = [score, i];
      }
      stack.push([k, b2]);
      stack.push([a2, k]);
    }
  }
  bounds.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  // A phrase shorter than a second cannot carry a move of its own: fold it into the phrase
  // before it (or after it, at the very start), so its notes still land inside a longer figure.
  const merged: [number, number][] = [];
  for (const [a, b] of bounds) {
    if (merged.length && t[b - 1] - t[a] < 1.0 && b - a < 6) merged[merged.length - 1] = [merged[merged.length - 1][0], b];
    else merged.push([a, b]);
  }
  if (merged.length > 1 && t[merged[0][1] - 1] - t[merged[0][0]] < 1.0) {
    merged[1] = [merged[0][0], merged[1][1]];
    merged.shift();
  }
  bounds = merged;

  const phrases: Phrase[] = [];
  for (const [a, b] of bounds) {
    const m = b - a;
    const span = Math.max(t[b - 1] - t[a], 0.1);
    let ups = 0, nsteps = 0;
    for (let i = a + 1; i < b; i++) {
      nsteps++;
      if (top[i] - top[i - 1] > 0) ups++;
    }
    if (m <= 1) nsteps = 1;       // np.diff of one element is replaced by zeros(1)
    const up = nsteps ? ups / nsteps : 0.5;
    const chordy = kind.slice(a, b).filter((k) => k >= 2).length / m;
    const dens = m / span;
    const hold = dur[b - 1];
    const trill = mean(ev.trill.slice(a, b));
    let g: string;
    if (chordy >= 0.5 && m <= 6) g = 'cadence';
    else if (chordy >= 0.5) g = 'chords';
    else if (trill >= 0.5) g = 'trill';
    else if (m <= 9 && hold >= 0.8 && dens >= 4) g = 'motif';
    else if (m >= 5 && (up >= 0.8 || up <= 0.2) && dens >= 4) g = 'run';
    else if (dens >= 5.5) g = 'figuration';
    else g = 'recitative';
    let lo = Infinity, hi = -Infinity;
    for (let i = a; i < b; i++) [lo, hi] = [Math.min(lo, top[i]), Math.max(hi, top[i])];
    phrases.push({ a, b, t0: t[a], t1: Math.min(maxEnd(a, b), t[b - 1] + 4), gesture: g, density: dens, up, lo, hi,
      index: 0 });
  }
  const counts = new Map<string, number>();
  for (const p of phrases) {
    p.index = counts.get(p.gesture) ?? 0;
    counts.set(p.gesture, p.index + 1);
  }
  return phrases;
}
