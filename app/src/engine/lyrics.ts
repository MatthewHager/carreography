// Lyric-driven cues. For the sung songs the words are the choreographer's script: a line of lyric is
// a phrase, and certain words call specific pictures - "eyes glowing red" turns every interior red,
// "scream" is lightning, "pumpkin" goes orange, a chant of "Halloween, Halloween..." pings across
// the cars.

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
