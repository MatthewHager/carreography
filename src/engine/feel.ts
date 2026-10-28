// How the music moves, section by section, heard from the music alone: no labels, no settings. Two
// decisions, each from two measures, all in one place:
//
//   flow   No steady beat to follow, so the lights flow (legato.ts: layers that swell with the music
//          and the melody gliding across the stage) instead of hitting. Both signs of a beat must be
//          missing: the tracked beats don't keep time (fewer than STEADY of their gaps within STEADY_TOL
//          of the usual gap) and the music doesn't hit on them (clarity below FLOW_CLARITY). Either one
//          keeps the beat: a band's groove can be syncopated (little on the beat itself), and an
//          orchestra following its conductor (beats that stretch) still hits hard on them.
//   kit    A rhythm section, so the drum-kit layer runs (kicks thump the fogs, snares the side cars,
//          hats tick the markers); elsewhere the gentler percussion layer. A low hit (kick, bass,
//          timpani) right on at least KICK of the beats, and at least HATS high hits (snare, hats,
//          cymbals) a beat. An orchestra passage that pounds like that counts too.
//
// Measured on the beats as the listening tracked them, before tempo.ts moves them onto what is played.

import type { Analysis, Phrase } from './analysis';
import { clip, mean, median } from './np';

const FLOW_CLARITY = 2.5;
const STEADY = 0.75, STEADY_TOL = 0.05;
const KICK = 0.3, HATS = 1.0, KICK_NEAR_S = 0.05;

/** One section of the song and how it moves. */
export interface Feel {
  t0: number;
  t1: number;
  flow: boolean;
  kit: boolean;
}

/**
 * How clearly the music beats here: the onset curve's strength on the beats over its mean (1 = no beat
 * to speak of; a steady band groove is 3 and up). Measured over [t0, t1] plus `reach` seconds either
 * side, so a two-beat phrase isn't judged on two samples.
 */
export function clarity(an: Analysis, t0: number, t1: number, reach = 4.0): number {
  t0 = Math.max(0.0, t0 - reach);
  t1 = t1 + reach;
  const env = an.pulseEnv, hop = an.pulseHop;
  const b = an.beats.filter((x) => x >= t0 && x < t1);
  if (!env?.length || b.length < 3) return 1.0;
  const i0 = Math.min(Math.trunc(t0 / hop), env.length);
  const i1 = Math.min(Math.max(i0 + 1, Math.trunc(t1 / hop)), env.length);
  const w = Math.max(1, Math.round(0.03 / hop));
  const peaks = b.map((x) => {
    const i = clip(Math.round(x / hop), 0, env.length - 1);
    let m = -Infinity;
    for (let k = Math.max(0, i - w); k < Math.min(env.length, i + w + 1); k++) m = Math.max(m, env[k]);
    return m;
  });
  return mean(peaks) / (mean(env, i0, i1) + 1e-9);
}

/** The share of the beats' gaps within `tol` of their median. */
function steadiness(beats: number[], tol: number): number {
  const gaps = beats.slice(1).map((b, i) => b - beats[i]);
  if (gaps.length < 4) return 0;
  const usual = median(gaps);
  return gaps.filter((g) => Math.abs(g / usual - 1) < tol).length / gaps.length;
}

const near = (sorted: number[], t: number, reach: number) => {
  let lo = 0, hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] < t - reach) lo = mid + 1;
    else hi = mid;
  }
  return lo < sorted.length && sorted[lo] <= t + reach;
};

function hasKit(an: Analysis, t0: number, t1: number, beats: number[]): boolean {
  if (beats.length < 4) return false;
  const lows = an.bass.filter((r) => r[0] >= t0 && r[0] < t1).map((r) => r[0]).sort((a, b) => a - b);
  const highs = an.highs.filter((r) => r[0] >= t0 && r[0] < t1).length;
  const kicks = beats.filter((b) => near(lows, b, KICK_NEAR_S)).length;
  return kicks >= KICK * beats.length && highs >= HATS * beats.length;
}

const read = new WeakMap<Analysis, Feel[]>();

/** Every section's feel, measured once per analysis (choreograph asks first, before tempo.ts moves the
 * beats). Given the phrases, each change of feel moves to the nearest phrase start, so the lights never
 * change style in the middle of a phrase. */
export function feel(an: Analysis, phrases?: Phrase[]): Feel[] {
  let out = read.get(an);
  if (out && !phrases) return out;
  const spans = an.sections?.length ? an.sections.map((s) => [s.t0, s.t1]) : [[0, an.duration]];
  out = spans.map(([t0, t1]) => {
    const beats = an.beats.filter((b) => b >= t0 && b < t1);
    const flow = clarity(an, t0, t1, 0) < FLOW_CLARITY && steadiness(beats, STEADY_TOL) < STEADY;
    return { t0, t1, flow, kit: !flow && hasKit(an, t0, t1, beats) };
  });
  if (phrases?.length) {
    const starts = phrases.map((ph) => ph.t0);
    for (let i = 1; i < out.length; i++) {
      const b = out[i].t0;
      const s = starts.reduce((best, t) => (Math.abs(t - b) < Math.abs(best - b) ? t : best));
      out[i - 1].t1 = out[i].t0 = Math.max(s, out[i - 1].t0);
    }
    out = out.filter((f) => f.t1 > f.t0);
  }
  read.set(an, out);
  return out;
}

function at(an: Analysis, t: number): Feel {
  const all = feel(an);
  return all.find((f) => f.t0 <= t && t < f.t1) ?? all[all.length - 1];
}

/** Whether the music at t has no steady beat to follow, so the lights flow. */
export const flowsAt = (an: Analysis, t: number) => at(an, t).flow;

/** Whether a rhythm section plays at t. */
export const kitAt = (an: Analysis, t: number) => at(an, t).kit;
