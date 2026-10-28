// Lyric moments from LRCLIB's timed lines, for any song: a sung line starts a phrase, and what a line
// says can call a picture while it is sung - a colour word tints every interior, a scream strikes
// lightning, a word sung twice in a line pings across the cars.

import type { Analysis, LyricLine } from './analysis';

/** A picture a line calls for: interior colours from t0 to t1, a lightning strike at t0, or a ping of
 * one car's front at t0 (the k-th word of a chant lands on car k, round the lineup). */
export interface Moment {
  do: 'color' | 'lightning' | 'ping';
  t0: number;
  t1: number;
  color?: readonly number[];
  car?: number;
}

const ORANGE = [255, 90, 0];
const RED = [255, 0, 0];
const GREEN = [40, 255, 30];
const PURPLE = [120, 0, 220];
const BLUE = [0, 60, 255];
const GOLD = [255, 170, 0];
const WHITE = [255, 255, 255];
const PINK = [255, 30, 120];

/** The words that make a picture: whole words in any case, a trailing * takes any ending.
 *   color      the interiors take the colour while the line is sung
 *   lightning  three strobes on the line's strongest attack */
const LYRIC_WORDS: { do: 'color' | 'lightning'; color?: number[]; words: string[] }[] = [
  { do: 'color', color: RED, words: ['red', 'blood*', 'crimson', 'scarlet', 'fire', 'flame*', 'burn*', 'devil*'] },
  { do: 'color', color: ORANGE, words: ['orange*', 'pumpkin*', 'amber', 'jack-o-lantern*'] },
  { do: 'color', color: GREEN, words: ['green', 'emerald*', 'slime*', 'goblin*', 'zombie*'] },
  { do: 'color', color: PURPLE, words: ['purple', 'violet', 'midnight', 'dark', 'darkness', 'shadow*', 'witch*'] },
  { do: 'color', color: BLUE, words: ['blue', 'ocean*', 'sapphire*', 'ice', 'icy'] },
  { do: 'color', color: GOLD, words: ['gold', 'golden', 'yellow', 'sunshine', 'sunlight'] },
  { do: 'color', color: WHITE, words: ['white', 'silver', 'snow*', 'ghost*', 'moon', 'moonlight', 'starlight'] },
  { do: 'color', color: PINK, words: ['pink', 'rose', 'roses'] },
  { do: 'lightning', words: ['scream*', 'shriek*', 'terror*', 'horror*', 'thunder*', 'lightning', 'fright*', 'afraid'] },
];

// Little words that repeat in a line without making it a chant.
const NOT_A_CHANT = new Set(['the', 'and', 'you', 'your', 'for', 'but', 'not', 'are', 'was', 'were', 'with', 'that',
  'this', 'his', 'her', 'she', 'him', 'they', 'them', 'what', 'when', 'who', 'its', "it's", 'all', 'can', 'out', 'got',
  'get', 'too', "don't", "i'm", 'our', 'one', 'into', 'from', 'have', 'just', 'like', 'will', 'there', 'then', 'than']);

const MAX_PINGS = 8;

const tokens = (text: string) =>
  text.toLowerCase().split(/[^a-z0-9'-]+/).map((w) => w.replace(/^['-]+|['-]+$/g, '')).filter(Boolean);

const RULES = LYRIC_WORDS.map((r) => ({
  ...r,
  hits: (ws: string[]) => ws.some((w) => r.words.some((p) => (p.endsWith('*') ? w.startsWith(p.slice(0, -1)) : w === p))),
}));

/** How long a line is sung for, roughly: a third of a second a word, never past the next line. */
export function sungFor(line: LyricLine): number {
  return Math.min(line.end - line.t, 0.6 + 0.33 * tokens(line.text).length);
}

/** The moments the timed lines call for, in time order. */
export function moments(lines: LyricLine[], an: Analysis): Moment[] {
  const out: Moment[] = [];
  const ev = an.events;
  for (const line of lines) {
    const ws = tokens(line.text);
    const t0 = line.t, t1 = line.t + sungFor(line);
    const colour = RULES.find((r) => r.do === 'color' && r.hits(ws));
    if (colour) out.push({ do: 'color', t0, t1: Math.min(line.end + 0.5, t1 + 1.0), color: colour.color });
    if (RULES.some((r) => r.do === 'lightning' && r.hits(ws))) {
      // on the loudest attack while the line is sung (its start, if nothing is played)
      let at = t0, amp = -1;
      for (let i = 0; i < ev.t.length; i++) {
        if (ev.t[i] >= t0 && ev.t[i] < t1 && ev.amp[i] > amp) [at, amp] = [ev.t[i], ev.amp[i]];
      }
      out.push({ do: 'lightning', t0: at, t1: at });
    }
    // a word sung twice or more in one line is a chant: it pings across the cars on the line's beats
    const counts = new Map<string, number>();
    for (const w of ws) if (w.length >= 3 && !NOT_A_CHANT.has(w)) counts.set(w, (counts.get(w) ?? 0) + 1);
    if ([...counts.values()].some((n) => n >= 2)) {
      const beats = an.beats.filter((b) => b >= t0 - 0.05 && b < t1).slice(0, MAX_PINGS);
      (beats.length ? beats : [t0]).forEach((b, k) => out.push({ do: 'ping', t0: b, t1: b, car: k }));
    }
  }
  return out.sort((x, y) => x.t0 - y.t0);
}
