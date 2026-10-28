// Lyric-driven cues. For the sung songs the words are the choreographer's script: a line of lyric is
// a phrase, and certain words call specific pictures - "eyes glowing red" turns every interior red,
// "scream" is lightning, "pumpkin" goes orange, a chant of "Halloween, Halloween..." pings across
// the cars.

import type { Analysis, LyricLine } from './analysis';
import type { Resolved } from './cues';

export type Word = [number, number, string];

const ORANGE = [255, 90, 0];
const RED = [255, 0, 0];
const GREEN = [40, 255, 30];
const PURPLE = [120, 0, 220];

const words = (s: string) => s.split(/\s+/).filter(Boolean);

/** Group words into sung lines at pauses of `gap` seconds or more: [start, end, text]. */
export function lines(ws: Word[], gap = 0.8): [number, number, string][] {
  const out: [number, number, string][] = [];
  let cur: Word[] = [];
  const close = () => out.push([cur[0][0], cur[cur.length - 1][1], cur.map((x) => x[2]).join(' ')]);
  for (const w of ws) {
    if (cur.length && w[0] - cur[cur.length - 1][1] >= gap) {
      close();
      cur = [];
    }
    cur.push(w);
  }
  if (cur.length) close();
  return out;
}

interface Rule {
  match: string;
  do: 'color' | 'hit' | 'lightning' | 'chant' | 'solo';
  color?: number[];
  hold?: number;
  span?: 'line';
  cars?: string[];
}

// Per-song lyric rules: a regex over the running text of each line, and the picture to make.
//   color   interior colour for the matched words' span (plus `hold` seconds)
//   hit     a stage hit on each matched word
//   lightning  three strobes on each matched word
//   chant   consecutive repeats of the word ping across the cars, one car per word
//   solo    only the named cars for the span of the line
export const LYRIC_RULES: Record<string, Rule[]> = {
  '02_this_is_halloween': [
    { match: 'eyes glowing red|glowing red', do: 'color', color: RED, hold: 2.5, span: 'line' },
    { match: '\\bred\\b', do: 'color', color: RED, hold: 1.5 },
    { match: '\\bscream\\b', do: 'lightning' },
    { match: 'pumpkin', do: 'color', color: ORANGE, hold: 3.0 },
    { match: 'halloween', do: 'chant' },
    { match: 'trick or treat', do: 'hit', hold: 0.3 },
    { match: 'slightly green', do: 'color', color: GREEN, hold: 2.0 },
    { match: 'dead of night|shadow on the moon', do: 'color', color: PURPLE, hold: 2.0 },
    { match: 'boys and girls', do: 'solo', cars: ['center'], span: 'line' },
  ],
  '07_thriller': [
    { match: 'thriller', do: 'chant' },
    { match: '\\bscream\\b|terror', do: 'lightning' },
    { match: 'darkness|midnight', do: 'color', color: PURPLE, hold: 2.0 },
    { match: 'killer', do: 'hit', hold: 0.3 },
  ],
  '06_ghostbusters': [
    { match: 'who you gonna call|who ya gonna call', do: 'hit', hold: 0.3 },
    { match: 'ghostbusters', do: 'chant' },
    { match: 'afraid', do: 'lightning' },
  ],
  '04_monster_mash': [
    { match: 'monster mash', do: 'chant' },
    { match: 'mash', do: 'hit', hold: 0.2 },
    { match: 'graveyard|zombies|ghouls', do: 'color', color: GREEN, hold: 2.0 },
    { match: 'dracula|vampire', do: 'color', color: RED, hold: 2.0 },
  ],
  '08_she_blinded_me_with_science': [
    { match: 'science', do: 'chant' },
    { match: 'blinded', do: 'lightning' },
  ],
};

/** Resolve the song's lyric rules against the timed words -> [action, params]. */
export function lyricCues(name: string, ws: Word[] | null): [string, Resolved][] {
  const rules = LYRIC_RULES[name] ?? [];
  if (!rules.length || !ws || !ws.length) return [];
  let out: [string, Resolved][] = [];
  const cue = (t0: number, t1: number, extra: Partial<Resolved> = {}): Resolved => ({ at: '', do: '', t0, t1, ...extra });
  for (const [lstart, lend, text] of lines(ws)) {
    const lw = ws.filter((w) => lstart <= w[0] && w[0] <= lend);
    for (const rule of rules) {
      for (const m of text.matchAll(new RegExp(rule.match, 'g'))) {
        // map the match back to word times by counting words before it
        const nBefore = words(text.slice(0, m.index)).length;
        const nMatch = words(m[0]).length;
        const span = lw.slice(nBefore, nBefore + nMatch);
        if (!span.length) continue;
        let t0 = span[0][0], t1 = span[span.length - 1][1];
        if (rule.span === 'line') {   // the sung line around the words, within 6 s
          [t0, t1] = [Math.max(lstart, t0 - 2.0), Math.min(lend, t1 + 4.0)];
        }
        const a = rule.do;
        if (a === 'color') out.push(['color', cue(t0, t1 + (rule.hold ?? 1.0), { color: rule.color })]);
        else if (a === 'hit') out.push(['hit', cue(t0, t0, { hold: rule.hold ?? 0.3 })]);
        else if (a === 'lightning') out.push(['lightning', cue(t0, t0)]);
        else if (a === 'solo') out.push(['solo', cue(t0, t1, { cars: rule.cars })]);
        else if (a === 'chant') out.push(['chant_word', cue(t0, t1)]);
      }
    }
  }
  // Chants: runs of the chant word within 1.2 s of each other -> one ping per word across the cars.
  const chant = out.filter(([a]) => a === 'chant_word').map(([, c]) => c).sort((x, y) => x.t0 - y.t0);
  out = out.filter(([a]) => a !== 'chant_word');
  let i = 0;
  while (i < chant.length) {
    let j = i;
    while (j + 1 < chant.length && chant[j + 1].t0 - chant[j].t0 <= 1.6) j++;
    const run = chant.slice(i, j + 1);
    if (run.length >= 2) run.forEach((c, k) => out.push(['ping', cue(c.t0, c.t0, { car: k })]));
    else out.push(['hit', cue(run[0].t0, run[0].t0, { hold: 0.25 })]);
    i = j + 1;
  }
  return out.sort((x, y) => x[1].t0 - y[1].t0);
}

// ---- Any song: lyric moments from timed lines ----------------------------------------------------
// The per-song rules above need Whisper's word times, which only the Python analyses have. A song
// dropped into the browser gets LRCLIB's lines, timed by line only, and the general moments below: the
// show reacts to what a line says, from the line's start to its end.

const BLUE = [0, 60, 255];
const GOLD = [255, 170, 0];
const WHITE = [255, 255, 255];
const PINK = [255, 30, 120];

/** The words that make a picture: whole words in any case, a trailing * takes any ending.
 *   color      the interiors take the colour while the line is sung
 *   lightning  three strobes on the line's strongest attack */
export const LYRIC_WORDS: { do: 'color' | 'lightning'; color?: number[]; words: string[] }[] = [
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

/** The general lyric moments of timed lines -> [action, params], as lyricCues gives them. */
export function lineCues(lines: LyricLine[], an: Analysis): [string, Resolved][] {
  const out: [string, Resolved][] = [];
  const cue = (t0: number, t1: number, extra: Partial<Resolved> = {}): Resolved => ({ at: '', do: '', t0, t1, ...extra });
  const ev = an.events;
  for (const line of lines) {
    const ws = tokens(line.text);
    const t0 = line.t, t1 = line.t + sungFor(line);
    const colour = RULES.find((r) => r.do === 'color' && r.hits(ws));
    if (colour) out.push(['color', cue(t0, Math.min(line.end + 0.5, t1 + 1.0), { color: colour.color })]);
    if (RULES.some((r) => r.do === 'lightning' && r.hits(ws))) {
      // on the loudest attack while the line is sung (its start, if nothing is played)
      let at = t0, amp = -1;
      for (let i = 0; i < ev.t.length; i++) {
        if (ev.t[i] >= t0 && ev.t[i] < t1 && ev.amp[i] > amp) [at, amp] = [ev.t[i], ev.amp[i]];
      }
      out.push(['lightning', cue(at, at)]);
    }
    // a word sung twice or more in one line is a chant: it pings across the cars on the line's beats
    const counts = new Map<string, number>();
    for (const w of ws) if (w.length >= 3 && !NOT_A_CHANT.has(w)) counts.set(w, (counts.get(w) ?? 0) + 1);
    if ([...counts.values()].some((n) => n >= 2)) {
      const beats = an.beats.filter((b) => b >= t0 - 0.05 && b < t1).slice(0, MAX_PINGS);
      (beats.length ? beats : [t0]).forEach((b, k) => out.push(['ping', cue(b, b, { car: k })]));
    }
  }
  return out.sort((x, y) => x[1].t0 - y[1].t0);
}
