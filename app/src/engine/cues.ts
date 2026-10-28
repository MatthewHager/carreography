// Cue sheets: the signature moments of each piece, located in the recording by detectors and
// applied as overrides on top of the choreography.
//
// Actions:
//   solo      only the named cars play for a window (everything else dark)
//   hit       a stage-wide hit: blackout, everything on, release
//   blackout  dark for a window
//   peak      a crescendo peak the frunk/liftgates must rise into (build length in seconds; `hold`
//             seconds open afterwards, or `final: true` to stay open to the end)
//   ceiling   force the intensity ceiling for a window (0..3)
//   dark_end  everything fades and stays dark from a time to the end
//
// Detectors (`at`):
//   first_phrase              the opening phrase
//   last_arrival              the last arrival chord / cadence before the end
//   loudest_last_quarter      the loudest instant in the closing quarter
//   shouts:N                  the N strongest chordal hits, >= 1.5 s apart
//   big_chord_last_fifth      the biggest chord in the closing fifth (voices, then length, then loudness)
//   final_section             the last section of the form map
//   t=SECONDS                 an explicit time in this recording

import type { Analysis } from './analysis';
import { argmax, argsort } from './np';

// What drives the rhythm in each piece, and so what the beat layer listens to and which moves it
// prefers. "organ": the notes are the rhythm (nothing else). "orchestra": timpani, low brass and
// the string pulse (percussive onsets), beat moves only where the beat is steady. "band": the drum
// kit from the drums stem (kick -> headlights, snare -> the Ys, hats -> markers), bass guitar under,
// beat-locked moves preferred. "vocal_band": a band with the singers carrying the melody, lyric cues.
export const DRIVERS: Record<string, string> = {
  '01_toccata_and_fugue': 'organ',
  '02_this_is_halloween': 'vocal_band',
  '03_danse_macabre': 'orchestra',
  '04_monster_mash': 'vocal_band',
  '05_hall_of_the_mountain_king': 'orchestra',
  '06_ghostbusters': 'vocal_band',
  '07_thriller': 'vocal_band',
  '08_she_blinded_me_with_science': 'vocal_band',
  '09_sorcerers_apprentice': 'orchestra',
  '10_addams_family': 'band',
  '11_night_on_bald_mountain': 'orchestra',
  '12_ave_maria': 'organ',
};

/** What drives the rhythm: the song's entry above, else a guess - a recording separated into stems
 * is a band (its drum kit drives the beat), anything else is treated like an orchestra. */
export function driver(name: string, stems = false): string {
  return DRIVERS[name] || (stems ? 'band' : 'orchestra');
}

export interface Cue {
  at: string;
  do: string;
  cars?: string[];
  hold?: number;
  build?: number;
  final?: boolean;
  value?: number;
}

export interface Resolved extends Cue {
  t0: number;
  t1: number;
  color?: readonly number[];
  car?: number;
}

export const CUES: Record<string, Cue[]> = {
  // Bach. The opening mordent is the most recognisable second in organ music: the truck alone.
  // The cadenza chord before the ending is the pinnacle; the frunk rises into it.
  '01_toccata_and_fugue': [
    { at: 'first_phrase', do: 'solo', cars: ['center'] },
    { at: 't=123.7', do: 'hit', hold: 2.0 },     // the Toccata's cadenza chord (this recording)
    { at: 't=123.7', do: 'peak', build: 8.0, hold: 8.0 },
    { at: 'loudest_last_quarter', do: 'peak', build: 12.0, final: true },   // the Fugue's ending
  ],
  // Elfman. The "This is Halloween!" shouts hit the whole stage every time; the last chorus is
  // the climax and the frunk rises into its loudest moment; the verses stay modest.
  '02_this_is_halloween': [
    { at: 'shouts:10', do: 'hit', hold: 0.25 },
    { at: 'final_section', do: 'ceiling', value: 3 },
    { at: 'loudest_last_quarter', do: 'peak', build: 8.0 },
  ],
  '03_danse_macabre': [     // midnight harp chimes open it: stay dark but for the truck
    { at: 'first_phrase', do: 'solo', cars: ['center'] },
    { at: 'loudest_last_quarter', do: 'peak', build: 10.0 },
    { at: 'last_arrival', do: 'hit', hold: 1.5 },
  ],
  '05_hall_of_the_mountain_king': [   // one long accelerando: the end is everything
    { at: 'final_section', do: 'ceiling', value: 3 },
    { at: 'loudest_last_quarter', do: 'peak', build: 14.0 },
    { at: 'last_arrival', do: 'hit', hold: 2.0 },
  ],
  '07_thriller': [
    { at: 'shouts:6', do: 'hit', hold: 0.3 },
    { at: 'loudest_last_quarter', do: 'peak', build: 12.0 },
  ],
  '11_night_on_bald_mountain': [      // the church bell and the dawn: fade to dark at the end
    { at: 'loudest_last_quarter', do: 'peak', build: 12.0 },
  ],
};

export const DEFAULT: Cue[] = [
  { at: 'final_section', do: 'ceiling', value: 3 },
  { at: 'loudest_last_quarter', do: 'peak', build: 8.0 },
];

/** Turn a song's cue list into concrete [action, params] with times, using the analysis. */
export function resolve(name: string, an: Analysis): [string, Resolved][] {
  const sheet = CUES[name] ?? DEFAULT;
  const ev = an.events, phrases = an.phrases ?? [], secs = an.sections ?? [];
  const out: [string, Resolved][] = [];
  for (const cue of sheet) {
    const at = cue.at;
    let times: [number, number][] = [];
    if (at === 'first_phrase' && phrases.length) {
      times = [[phrases[0].t0, phrases[0].t1]];
    } else if (at === 'last_arrival') {
      const cands = ev.t.filter((t, i) => ev.arrival[i] === 1 && t < an.duration - 4);
      for (const ph of phrases) if (ph.gesture === 'cadence' && ph.t0 < an.duration - 4) cands.push(ph.t0);
      if (cands.length) {
        const t = Math.max(...cands);
        times = [[t, t]];
      }
    } else if (at === 'loudest_last_quarter') {
      const n = an.loudFast.length;
      const f0 = Math.trunc(0.75 * n);
      const f1 = n - Math.trunc(3 / an.step);
      if (f1 > f0) {                          // (a very short song has no last quarter to search)
        const f = f0 + argmax(an.loudFast.slice(f0, f1));
        times = [[f * an.step, f * an.step]];
      }
    } else if (at === 'big_chord_last_fifth') {
      // The biggest chord in the closing fifth: the most voices, then the loudest, then the longest.
      const f0 = 0.8 * an.duration;
      let best = -1;
      const key = (i: number): [number, number] => [ev.n[i] + Math.min(ev.dur[i], 1.5) * 2, ev.amp[i]];
      for (let i = 0; i < ev.t.length; i++) {
        if (!(ev.t[i] >= f0 && ev.t[i] < an.duration - 4 && ev.kind[i] >= 1)) continue;
        if (best < 0) best = i;
        else {
          const [a0, a1] = key(i), [b0, b1] = key(best);
          if (a0 > b0 || (a0 === b0 && a1 > b1)) best = i;
        }
      }
      if (best >= 0) times = [[ev.t[best], ev.t[best]]];
    } else if (at.startsWith('shouts:')) {
      const n = parseInt(at.split(':')[1], 10);
      const idx = ev.kind.flatMap((k, i) => (k >= 1 ? [i] : []));
      const order = argsort(idx.map((i) => -ev.amp[i])).map((k) => idx[k]);
      const picked: number[] = [];
      for (const i of order) {
        const t = ev.t[i];
        if (picked.every((q) => Math.abs(t - q) >= 1.5)) picked.push(t);
        if (picked.length >= n) break;
      }
      times = [...picked].sort((a, b) => a - b).map((t) => [t, t]);
    } else if (at === 'final_section' && secs.length) {
      times = [[secs[secs.length - 1].t0, secs[secs.length - 1].t1]];
    } else if (at.startsWith('t=')) {
      const t = parseFloat(at.slice(2));
      times = [[t, t]];
    }
    for (const [t0, t1] of times) out.push([cue.do, { ...cue, t0, t1 }]);
  }
  return out;
}
