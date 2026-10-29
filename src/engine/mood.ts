// Mood: the name of a phrase's level step (level.ts), which sets how often the beat moves hit.
//
//   calm    (hush and calm) once a bar, soft fades: a calm passage swoops
//   groove  every other beat
//   drive   every beat
//   frenzy  the peak, and a trill once the music is lively
//
// The note moves follow every note whatever the mood; the level sets how big each one is.

import type { Analysis, Phrase } from './analysis';
import { levelAt, levelOver, STEPS, stepOf } from './level';

const MOODS = ['calm', 'calm', 'groove', 'drive', 'frenzy'];

/** Set ph.level and ph.mood on every phrase. */
export function assign(an: Analysis, phrases: Phrase[]): void {
  for (const ph of phrases) {
    ph.level = levelOver(an, ph.t0, ph.t1);
    ph.mood = MOODS[stepOf(ph.level)];
    if (ph.gesture === 'trill' && ph.level >= STEPS[1]) ph.mood = 'frenzy';
  }
}

/** Beats `every` beats apart at the level there: every one from drive up, every other in a groove, one a
 * bar when calm. */
export function paced(an: Analysis, beats: number[]): number[] {
  const out: number[] = [];
  for (let k = 0; k < beats.length; k++) {
    const b = beats[k], st = stepOf(levelAt(an, b));
    const gap = k + 1 < beats.length ? beats[k + 1] - b : k > 0 ? b - beats[k - 1] : 0.5;
    const every = st >= 3 ? 1 : st === 2 ? 2 : 4;
    if (!out.length || b - out[out.length - 1] >= every * gap * 0.9 - 0.02) out.push(b);
  }
  return out;
}
