// The show for a line of Teslas, as layers (crowd's left to right, any lineup of one to five cars):
//
//   level       how big the show is at each moment, from the music's loudness, its top kept for the peak
//               (level.ts); every layer sizes itself by it
//   bed         what is lit steadily: rear lamps, the trucks' bars glowing, the cabins in the harmony's
//               colour (bed.ts)
//   moves       the foreground: one move per passage of the music, following its melody or its beat, with
//               chords, trills, cadences and the Toccata's motif getting their own (moves.ts, catalog.ts)
//   drums       each drum voice on lamps of its own wherever it plays (drums.ts)
//   pulse       the beat on the headlights, and the builds that speed up into a drop (pulse.ts)
//   motors      lids, windows, mirrors, the charge port and a Model X's doors (motors.ts)
//
// Where the music has no beat to follow it flows instead (legato.ts). Silence is dark.

import type { Analysis, Phrase } from './analysis';
import * as BED from './bed';
import { Car, makeLineup } from './car';
import * as CAT from './catalog';
import * as C from './channels';
import * as DRUMS from './drums';
import { clarity, feel, flowsAt, kitAt, steadyAt } from './feel';
import * as LAMPS from './lamps';
import * as LEGATO from './legato';
import { levelAt, levelCurve, levelOver, STEPS, stepOf } from './level';
import * as LY from './lyrics';
import type { Moment } from './lyrics';
import * as MD from './mood';
import * as motors from './motors';
import * as M from './moves';
import { clip, linspace, median, searchsorted } from './np';
import * as PULSE from './pulse';
import { segment } from './phrases';
import * as TEMPO from './tempo';

/** The show for a lineup (car letters, crowd-left to right), from the song's analysis. */
export function choreograph(an: Analysis, layout = 'YCY'): Car[] {
  const cars = makeLineup(layout, an.nFrames, an.step);
  const sung = an.lyricLines?.length ? an.lyricLines : null;     // a sung line starts a phrase
  const phrases = segment(an.events, sung ? sung.map((l) => l.t) : null);
  an.phrases = phrases;
  const flowing = feel(an, phrases).filter((f) => f.flow);       // heard before tempo.ts moves the beats
  TEMPO.apply(an);          // beats moved onto what is played (rubato-aware)
  // Durations in the moves (a bar, a sixteenth) come from the tempo: make it the tracked beats' own
  // spacing so a bar-long sweep ends on the next downbeat rather than drifting off it.
  if (an.beats.length > 8) an.tempo = 60.0 / median(an.beats.slice(1).map((b, i) => b - an.beats[i]));
  an.level = levelCurve(an);
  MD.assign(an, phrases);
  for (const ph of phrases) if (flowsAt(an, ph.t0)) ph.move = 'legato';
  const said = sung ? LY.moments(sung, an) : [];
  const endsFlowing = flowing.length > 0 && LEGATO.choreograph(cars, an, flowing);
  an.beatLamps = PULSE.ownership(an);       // the headlights the beat plays, which the moves leave to it
  BED.apply(cars, an);
  pedal(cars, an);
  playPassages(cars, an, phrases.filter((ph) => ph.move !== 'legato'));
  DRUMS.apply(cars, an);
  PULSE.apply(cars, an);
  PULSE.dropHits(cars, an);
  strikes(cars, an, said);
  colours(cars, said);
  motors.choreograph(cars, an);
  if (!endsFlowing) finale(cars, an);      // (music that ends flowing has already faded out)
  hush(cars, an);
  for (const car of cars) {
    tidy(car);
    if (car.juniper) LAMPS.juniperOutput(car);
    for (let f = Math.max(0, car.nFrames - 3); f < car.nFrames; f++) {
      for (let ch = 0; ch < C.L_FALCON; ch++) car.put(f, ch, 0);
      for (let ch = C.FRONT_BAR[0]; ch < C.N_CHANNELS; ch++) car.put(f, ch, 0);
    }
  }
  return cars;
}

// ---- Passages ----------------------------------------------------------------------------------
// One move per passage, so the same music reads as the same idea, and a new move where the music grows:
// Hall of the Mountain King's theme, played eighteen times and growing, follows its notes while it is quiet,
// then turns into figures that travel the whole stage on the beat as it drives into its climax. A passage
// runs from one change in the music to the next: a section of the form map that brings back earlier
// material (it replays that material's moves at the same level, so a chorus looks like the chorus), or a
// new section where the sound changes (a novelty peak). A passage over LONG_S is split where its sound
// changes most, and wherever the level settles on another step for BAND_S or more (calm, groove, drive, the
// peak), so the look changes as the music builds.

interface Passage {
  t0: number;
  t1: number;
  letters: string[];    // the form map's letters it covers, the first its own
  piece: number;        // which piece of its material it is (a long one is split)
}

const CHANGE = 0.6;     // a novelty peak this strong (0..1) at a section's start makes a new passage
const SPLIT = 0.5;      // ... and this strong inside a long passage splits it (any marked change will do)
const LONG_S = 40, PIECE_S = 12;
const BAND_S = 8;

function passages(an: Analysis): Passage[] {
  const secs = an.sections?.length ? an.sections : [{ t0: 0, t1: an.duration, letter: 'A' }];
  const peaks = an.noveltyPeaks;
  const changes = (t: number) => peaks.some(([p, v]) => v >= CHANGE && Math.abs(p - t) <= 2);
  const out: Passage[] = [];
  const seen = new Set<string>();
  for (const s of secs) {
    const last = out[out.length - 1];
    if (last && !seen.has(s.letter) && !changes(s.t0) && flowsAt(an, s.t0) === flowsAt(an, last.t0)) {
      last.t1 = s.t1;                                       // the same music carries on
      last.letters.push(s.letter);
    } else {
      out.push({ t0: s.t0, t1: s.t1, letters: [s.letter], piece: 0 });
    }
    seen.add(s.letter);
  }
  // long passages split where the sound changes most
  const split = (p: Passage): Passage[] => {
    if (p.t1 - p.t0 <= LONG_S) return [p];
    const inner = peaks.filter(([t, v]) => v >= SPLIT && t > p.t0 + PIECE_S && t < p.t1 - PIECE_S);
    if (!inner.length) return [p];
    const [cut] = inner.reduce((a, b) => (b[1] > a[1] ? b : a));
    return [...split({ ...p, t1: cut }), ...split({ ...p, t0: cut })];
  };
  return out.flatMap((p) => split(p).map((q, k) => ({ ...q, piece: k })));
}

/** The level's step (calm counting as hush) a run of phrases settles on, merged so none is under BAND_S:
 * [step, the phrases]. */
function bands(phrases: Phrase[]): [number, Phrase[]][] {
  const out: [number, Phrase[]][] = [];
  for (const ph of phrases) {
    const step = Math.max(1, stepOf(ph.level ?? 0)), last = out[out.length - 1];
    if (last && last[0] === step) last[1].push(ph);
    else out.push([step, [ph]]);
  }
  const span = (r: Phrase[]) => r[r.length - 1].t1 - r[0].t0;
  for (let i = 0; i < out.length;) {                        // a short run joins the longer neighbour
    if (out.length === 1 || span(out[i][1]) >= BAND_S) {
      i++;
      continue;
    }
    const left = i === out.length - 1 || (i > 0 && span(out[i - 1][1]) >= span(out[i + 1][1]));
    const j = left ? i - 1 : i + 1;
    out[j][1] = j < i ? [...out[j][1], ...out[i][1]] : [...out[i][1], ...out[j][1]];
    out.splice(i, 1);
    i = Math.max(0, Math.min(i, j) - 1);
  }
  return out;
}

const DENSE = 5.5, SPARSE = 2.0, SUNG = 3.5;   // notes a second: enough to follow, too few, a singer's line
const BEATS = 2.0;                             // clarity (feel.ts) of a beat the figures can follow

/** Does a run of phrases call for a move that follows the melody or one that follows the beat? With no
 * beat to follow, or none the music strikes (a held chord), the melody. From drive up, the beat: the whole
 * stage moves together on it, whatever the notes do. Below that, the melody where there are notes enough to
 * follow, the beat under sparse notes (a singer over a band), and in between the one the previous passage
 * didn't take, for contrast. */
function family(an: Analysis, t0: number, t1: number, step: number,
  before: 'note' | 'beat' | null): 'note' | 'beat' {
  const notes = an.events.t.filter((t) => t >= t0 && t < t1).length / Math.max(t1 - t0, 1);
  const mid = (t0 + t1) / 2;
  if (!steadyAt(an, mid) && clarity(an, t0, t1, 0) < BEATS) return 'note';
  if (PULSE.struckShare(an, t0, t1) < 0.5) return 'note';
  if (step >= 3) return 'beat';
  if (notes >= DENSE) return 'note';
  if (notes < SPARSE || (kitAt(an, mid) && notes < SUNG)) return 'beat';
  return before === 'note' ? 'beat' : 'note';
}

/** Every passage's move, and every phrase's: a phrase whose shape asks for its own move (chords, a trill,
 * a cadence, the motif) plays that; the rest play their passage's. A beat move plays across its whole
 * stretch, rests included, with the melody riding the trucks' bars on top; a note move plays each phrase's
 * notes. */
function playPassages(cars: Car[], an: Analysis, phrases: Phrase[]) {
  const used = new Map<string, number>();
  const byKey = new Map<string, string>();
  let prev: string | null = null, prevFamily: 'note' | 'beat' | null = null;
  for (const p of passages(an)) {
    const mine = phrases.filter((ph) => ph.t0 >= p.t0 - 0.01 && ph.t0 < p.t1);
    if (!mine.length) continue;
    const runs = bands(mine);
    runs.forEach(([step, own], r) => {
      const t0 = r === 0 ? p.t0 : own[0].t0, t1 = r === runs.length - 1 ? p.t1 : runs[r + 1][1][0].t0;
      const key = `${p.letters[0]}:${p.piece}:${step}`;      // a letter heard again at this level replays it
      let move = byKey.get(key);
      if (move === undefined) {
        const pool = family(an, t0, t1, step, prevFamily) === 'note' ? CAT.NOTE_MOVES : CAT.BEAT_MOVES;
        const fresh = pool.filter((m) => m !== prev);
        move = fresh.reduce((best, m) => ((used.get(m) ?? 0) < (used.get(best) ?? 0) ? m : best), fresh[0]);
      }
      for (const letter of p.letters) {
        const k = `${letter}:${p.piece}:${step}`;
        if (!byKey.has(k)) byKey.set(k, move);
      }
      used.set(move, (used.get(move) ?? 0) + 1);
      prev = move;
      prevFamily = CAT.NOTE_MOVES.includes(move) ? 'note' : 'beat';
      for (const ph of own) ph.move = CAT.FOR_GESTURE[ph.gesture] ?? move;
      if (prevFamily === 'beat') {
        // the beat move across the stretch, around the phrases that play their own
        let t = t0;
        for (const ph of [...own.filter((q) => q.move !== move), { t0: t1, t1 } as Phrase]) {
          for (const [a, b] of beating(an, t, ph.t0)) {
            if (b - a < 1.0) continue;
            M.MOVES[move](cars, an, stretch(an, a, b));
            M.barMelody(cars, an, stretch(an, a, b));
          }
          t = Math.max(t, ph.t1);
        }
      }
      for (const ph of own) if (ph.move !== move || prevFamily === 'note') M.MOVES[ph.move!](cars, an, ph);
      for (const ph of own) arrivals(cars, an, ph);
    });
  }
}

/** The parts of [t0, t1] where the music beats (feel.ts). */
function beating(an: Analysis, t0: number, t1: number): [number, number][] {
  return feel(an).filter((f) => !f.flow && f.t1 > t0 && f.t0 < t1)
    .map((f) => [Math.max(f.t0, t0), Math.min(f.t1, t1)] as [number, number]);
}

/** A stretch of a passage as a phrase, for a beat move. */
function stretch(an: Analysis, t0: number, t1: number): Phrase {
  const a = searchsorted(an.events.t, t0), b = searchsorted(an.events.t, t1);
  return { a, b, t0, t1, gesture: 'figuration', density: 0, up: 0.5, lo: an.pitchLo, hi: an.pitchHi,
    level: levelOver(an, t0, t1) };
}

/** The phrase's arrival chords, punctuation whatever the move: in lively music the whole stage hits (every
 * other short one a lightning strike), a calm arrival glows, and in between the headlights flash. */
function arrivals(cars: Car[], an: Analysis, ph: Phrase) {
  const ev = an.events;
  let n = 0;
  for (let i = ph.a; i < ph.b; i++) {
    if (!ev.arrival[i] || ph.move === 'cadence') continue;
    const t = ev.t[i], s = levelAt(an, t);
    if (s >= STEPS[2]) {
      if (n++ % 2 === 1 && ev.dur[i] < 0.8) M.lightning(cars, t);
      else M.allOn(cars, t, clip(ev.dur[i], 0.3, 1.2));
    } else if (s < STEPS[1]) {
      for (const c of cars) {
        c.light(c.inner(), t, t + 0.8, C.ON_500);
        c.light(c.inner(), t + 0.8, t + 1.8, C.OFF_1000);
      }
    } else {
      for (const c of cars) c.flash(c.heads(), t, 0.15);
    }
  }
}

/** Long low notes in quiet music: the middle car's inner beams swell slowly and release, so the pedal reads
 * as weight underneath. */
function pedal(cars: Car[], an: Analysis) {
  const ev = an.events;
  const trucks = cars.filter((c) => c.isCt);
  const anchor = trucks.length ? trucks : [cars[Math.floor(cars.length / 2)]];
  for (let i = 0; i < ev.t.length; i++) {
    const t = ev.t[i];
    if (ev.low[i] <= 45 && ev.dur[i] >= 0.8 && levelAt(an, t) < STEPS[2] && !flowsAt(an, t)) {
      const d = Math.min(ev.dur[i], 2.5);
      for (const c of anchor) {
        c.light(c.inner(), t, t + d, C.ON_2000);
        c.light(c.inner(), t + d, t + d + 2.1, C.OFF_2000);
      }
    }
  }
}

// ---- Lyrics ------------------------------------------------------------------------------------

/** A moment moved onto the music's grid: onto the beat within a quarter beat of one, else the nearest eighth. */
function onGrid(an: Analysis, t: number): number {
  const b = an.beats;
  if (b.length < 2) return t;
  const i = clip(searchsorted(b, t), 1, b.length - 1);
  const near = t - b[i - 1] <= b[i] - t ? b[i - 1] : b[i];
  if (Math.abs(near - t) <= 0.25 * M.beatAt(an, t)) return near;
  return M.snap(an, t, 2);
}

/** A line's lightning strike or chant ping, on the music's grid, where the music has a beat. */
function strikes(cars: Car[], an: Analysis, said: Moment[]) {
  for (const m of said) {
    if (m.do === 'color' || flowsAt(an, m.t0)) continue;
    const t = onGrid(an, m.t0);
    if (m.do === 'lightning') {
      M.lightning(cars, t);
    } else {
      // one word of a chant: one car's whole front, pinging across the lineup word by word
      const car = cars[m.car! % cars.length];
      car.flash([...car.sig(), ...car.drl(), ...car.heads()], t, 0.22);
      if (car.isCt) M.barFlash(car, t, 0.3, 1.0);
    }
  }
}

/** The interiors take a line's colour while it is sung. */
function colours(cars: Car[], said: Moment[]) {
  for (const m of said) {
    if (m.do !== 'color') continue;
    const a = cars[0].fr(m.t0), b = cars[0].fr(m.t1);
    for (const car of cars) {
      for (const base of C.ALL_RGB) {
        for (let i = 0; i < 3; i++) for (let f = a; f < b; f++) car.put(f, base + i, Math.trunc(m.color![i]));
      }
    }
  }
}

// ---- The end and the frames --------------------------------------------------------------------

/** The music's last strong beat: the last beat in the final 12 s whose attack is at least 60 % of the
 * strongest there. */
function finalBeat(an: Analysis, end: number): number | null {
  const env = an.pulseEnv;
  const b = an.beats.filter((x) => x > end - 12 && x < end - 0.6);
  if (!env || !b.length) return null;
  const hop = an.pulseHop;
  const strength = b.map((x) => {
    const i = clip(Math.round(x / hop), 1, env.length - 2);
    return Math.max(env[i - 1], env[i], env[i + 1]);
  });
  const threshold = 0.6 * Math.max(...strength);
  const strong = b.filter((_, k) => strength[k] >= threshold);
  return strong.length ? strong[strong.length - 1] : null;
}

/** The ending: everything on at the last strong hit, then a 2 s fade to dark, the bars with it. */
function finale(cars: Car[], an: Analysis) {
  const end = an.duration;
  const late = an.hits.filter((h) => h < end - 1.5);
  let t = late.length && late[late.length - 1] > end - 12 ? late[late.length - 1] : Math.max(end - 3.0, 0);
  const last = finalBeat(an, end);
  if (last !== null && last > t) t = last;
  const fadeEnd = Math.min(end - 0.1, t + 2.5);
  const bars: number[] = [];
  for (let ch = C.FRONT_BAR[0]; ch <= C.REAR_BAR[C.REAR_BAR.length - 1]; ch++) bars.push(ch);
  for (const c of cars) {
    for (const ch of c.everything()) {
      c.set(ch, t, t + 0.3, C.ON);
      c.set(ch, t + 0.3, fadeEnd, C.OFF_2000);
    }
    c.set(bars, t, fadeEnd, 0);
    c.set(bars, fadeEnd, an.duration, 0);
    if (c.isCt) {
      const n = c.fr(fadeEnd) - c.fr(t);
      const env = Array.from(linspace(1.15, 0, n), (v) => clip(v, 0, 1));
      c.pixels(C.FRONT_BAR, t, env.map((v) => new Array(C.FRONT_BAR.length).fill(v)));
      c.pixels(C.REAR_BAR, t, env.map((v) => new Array(C.REAR_BAR.length).fill(v)));
    }
  }
}

const SILENT = 0.06, SILENT_S = 0.4;     // the loudness (an.loudness) of silence, and how long it must last
const LAMP_FADE_S = 0.5, PIXEL_FADE_S = 0.3;

/** Silence is dark: wherever the music stops for SILENT_S or more, every lamp that is still on fades out
 * from the moment the sound stopped (over LAMP_FADE_S, Tesla's shortest ramp), and the bars and cabins go
 * dark with it, a little quicker (PIXEL_FADE_S). Fades already running (a finale, the legato ending) carry
 * on. */
function hush(cars: Car[], an: Analysis) {
  const x = an.loudness, n = an.nFrames, need = Math.round(SILENT_S / an.step);
  const fade = Math.round(LAMP_FADE_S / an.step);
  const lamps: number[] = [];
  for (let ch = 0; ch < C.L_FALCON; ch++) lamps.push(ch);
  const rgb = C.ALL_RGB.flatMap((ch) => [ch, ch + 1, ch + 2]);
  const pixels = [...C.FRONT_BAR, ...C.REAR_BAR, ...C.OFFROAD_BAR, ...rgb];
  for (let a = 0; a < n;) {
    if (x[a] >= SILENT) {
      a++;
      continue;
    }
    let b = a;
    while (b < n && x[b] < SILENT) b++;
    if (b - a >= need) {
      const from = a + 2, to = b - 1;                    // a frame's grace either side: the lights lead by one
      for (const c of cars) {
        for (let f = from; f < to; f++) {
          for (const ch of lamps) {
            const v = c.get(f, ch);
            if (v >= 128) c.put(f, ch, f - from < fade ? C.OFF_500 : 0);
          }
          for (const ch of pixels) {
            const v = c.get(f, ch);
            if (v) c.put(f, ch, Math.trunc(v * clip(1 - (f - from) / (PIXEL_FADE_S / an.step), 0, 1)));
          }
        }
      }
    }
    a = b;
  }
}

function onRuns(col: Uint8Array): [number[], number[]] {
  const starts: number[] = [], ends: number[] = [];
  let prev = false;
  for (let f = 0; f <= col.length; f++) {
    const on = f < col.length && col[f] >= 128;
    if (on && !prev) starts.push(f);
    if (!on && prev) ends.push(f);
    prev = on;
  }
  return [starts, ends];
}

/** Boolean lights: flashes shorter than 100 ms get stretched, gaps under 60 ms get opened up, so rapid
 * notes read as separate flashes instead of a smear. */
function tidy(car: Car) {
  const minOn = 5, minOff = 3;
  const n = car.nFrames;
  for (let ch = C.L_OUTER_MAIN; ch <= C.LICENSE_PLATE; ch++) {
    const col = car.column(ch);
    let [starts, ends] = onRuns(col);
    if (!starts.length) continue;
    starts.forEach((s0, k) => {                // stretch short flashes
      if (ends[k] - s0 < minOn) {
        const v = col[s0];
        for (let f = s0; f < Math.min(n, s0 + minOn); f++) col[f] = Math.max(col[f], v);
      }
    });
    [starts, ends] = onRuns(col);
    for (let k = 0; k < ends.length - 1; k++) {  // open up short gaps
      const e0 = ends[k], s1 = starts[k + 1];
      if (s1 - e0 < minOff) for (let f = s1; f < Math.min(n, e0 + minOff); f++) col[f] = 0;
    }
    for (let f = 0; f < n; f++) car.put(f, ch, col[f]);
  }
}
