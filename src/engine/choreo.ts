// The show for a line of Teslas, as layers (crowd's left to right, any lineup of one to five cars):
//
//   level       how big the show is at each moment, from the music's loudness, its top kept for the peak
//               (level.ts); every layer sizes itself by it
//   bed         what is lit steadily: rear lamps, the trucks' bars glowing, the cabins in the harmony's
//               colour (bed.ts)
//   moves       the foreground: one move per figure (a period of a passage), following its melody or its
//               beat or swelling with a held chord, with
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
import { feel, flowsAt, followable, held, kitAt } from './feel';
import * as LAMPS from './lamps';
import * as LEGATO from './legato';
import { DRIVE, GROOVE, levelAt, levelCurve, levelOver, musicSpan, stepOf } from './level';
import * as LY from './lyrics';
import type { Moment } from './lyrics';
import * as motors from './motors';
import * as M from './moves';
import { clip, linspace, median, searchsorted } from './np';
import * as PULSE from './pulse';
import { segment } from './phrases';
import * as TEMPO from './tempo';
import { barLen } from './tempo';

/** The show for a lineup (car letters, crowd-left to right), from the song's analysis (which it leaves as
 * it was heard, so the same analysis can be choreographed again, for another lineup, to the same bytes). */
export function choreograph(heard: Analysis, layout = 'YCY'): Car[] {
  return makeShow(heard, layout).cars;
}

/** The show, and the analysis it was made from: a copy of what was heard, with the beats moved onto what
 * is played, the level, the phrases and their moves, and the headlights the beat owns (the review draws
 * these). */
export function makeShow(heard: Analysis, layout = 'YCY'): { cars: Car[]; an: Analysis } {
  const an = structuredClone(heard);
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
  for (const ph of phrases) ph.level = levelOver(an, ph.t0, ph.t1);
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
  accents(cars, an, phrases, said);
  colours(cars, said);
  motors.choreograph(cars, an);
  finale(cars, an, endsFlowing);
  hush(cars, an);
  for (const car of cars) {
    tidy(car, an);
    if (car.juniper) LAMPS.juniperOutput(car);
    steady(car, an);
    for (let f = Math.max(0, car.nFrames - 3); f < car.nFrames; f++) {
      for (let ch = 0; ch < C.L_FALCON; ch++) car.put(f, ch, 0);
      for (let ch = C.FRONT_BAR[0]; ch < C.N_CHANNELS; ch++) car.put(f, ch, 0);
    }
  }
  return { cars, an };
}

// ---- Passages ----------------------------------------------------------------------------------
// One move per figure of a passage, so the same music reads as the same idea, and a new move where the music
// grows or a period ends (playPassages):
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
type Family = 'note' | 'beat' | 'held';

/** Does a stretch call for a move that follows the melody, one that follows the beat, or the swell of a held
 * chord? With no beat to follow (feel.followable: none, or one the music doesn't strike), the swell where a
 * chord is held (feel.held), else the melody. From drive up, and from a groove where a drum kit plays, the
 * beat: the whole stage moves together on it, with the melody along the trucks' bars. Below that, the melody
 * where there are notes enough to follow, the beat under sparse notes (a singer over a band), and in between
 * the one the previous figure didn't take, for contrast. */
function family(an: Analysis, t0: number, t1: number, step: number, before: Family | null): Family {
  const notes = an.events.t.filter((t) => t >= t0 && t < t1).length / Math.max(t1 - t0, 1);
  const kit = kitAt(an, (t0 + t1) / 2);
  if (!followable(an, t0, t1)) return held(an, t0, t1) ? 'held' : 'note';
  if (step >= 3 || (step >= 2 && kit)) return 'beat';
  if (notes >= DENSE) return 'note';
  if (notes < SPARSE || (kit && notes < SUNG)) return 'beat';
  return before === 'note' ? 'beat' : 'note';
}

const familyOf = (move: string): Family =>
  (CAT.NOTE_MOVES.includes(move) ? 'note' : CAT.BEAT_MOVES.includes(move) ? 'beat' : 'held');

const FIGURE_BARS = 8;     // a figure plays at most this long before the next phrase changes it: a period

/** A run's phrases as figures of at most FIGURE_BARS bars (and at least half that), each cut where a phrase
 * starts: [t0, t1, its phrases]. Bars are counted on the tracked downbeats, so they follow the performer. */
function figures(an: Analysis, t0: number, t1: number, own: Phrase[]): [number, number, Phrase[]][] {
  const bars = (a: number, b: number) => {
    const n = searchsorted(an.downbeats, b - 0.1) - searchsorted(an.downbeats, a - 0.1);
    return n >= 1 ? n : (b - a) / barLen(an);
  };
  const out: [number, number, Phrase[]][] = [[t0, t1, []]];
  for (const ph of own) {
    const last = out[out.length - 1];
    if (last[2].length && bars(last[0], ph.t1) > FIGURE_BARS && bars(last[0], ph.t0) >= FIGURE_BARS / 2) {
      last[1] = ph.t0;
      out.push([ph.t0, t1, [ph]]);
    } else {
      last[2].push(ph);
    }
  }
  return out;
}

/** Every figure's move, and every phrase's: a phrase whose shape asks for its own move (chords, a trill, a
 * cadence, the motif) plays that; the rest play their figure's. A passage's runs at one level are cut into
 * figures at phrase starts (figures), each taking the least used move of its family, so the look changes
 * with the music's periods; material heard again at the same level replays its figures' moves. A beat move
 * or a swell plays across its whole figure, rests included, the beat moves with the melody riding the
 * trucks' bars on top; a note move plays each phrase's notes. */
function playPassages(cars: Car[], an: Analysis, phrases: Phrase[]) {
  const scratch = cars.map((c) => c.blank());
  const used = new Map<string, number>();
  const byKey = new Map<string, string[]>();
  const flowing = feel(an).filter((f) => f.flow);
  let prev: string | null = null, prevFamily: Family | null = null;
  for (const p of passages(an)) {
    const mine = phrases.filter((ph) => ph.t0 >= p.t0 - 0.01 && ph.t0 < p.t1);
    if (!mine.length) continue;
    const runs = bands(mine);
    runs.forEach(([step, own], r) => {
      const t0 = r === 0 ? p.t0 : own[0].t0, t1 = r === runs.length - 1 ? p.t1 : runs[r + 1][1][0].t0;
      const keys = p.letters.map((letter) => `${letter}:${p.piece}:${step}`);  // heard again at this level
      const moves = byKey.get(keys[0]) ?? [];
      // each figure's family; a chord held on into the next figure is one swell
      const figs: [number, number, Phrase[], Family][] = [];
      for (const [g0, g1, group] of figures(an, t0, t1, own)) {
        const last = figs[figs.length - 1];
        const fam = family(an, g0, g1, step, last ? last[3] : prevFamily);
        if (last && fam === 'held' && last[3] === 'held') {
          last[1] = g1;
          last[2].push(...group);
        } else {
          figs.push([g0, g1, group, fam]);
        }
      }
      figs.forEach(([g0, g1, group, fam], j) => {
        let move = moves[j];
        // a replay keeps its move where the music still allows it (a beat to follow for a beat move, a held
        // chord for a swell) and the figure before didn't just play it: material repeated back to back
        // changes its figure rather than playing one move for half a minute
        const fits = (m: string) => (familyOf(m) === 'held') === (fam === 'held') && (m !== prev || m === 'swell')
          && (familyOf(m) !== 'beat' || fam === 'beat' || followable(an, g0, g1));
        if (move === undefined || !fits(move)) {
          const pool = fam === 'note' ? CAT.NOTE_MOVES : fam === 'beat' ? CAT.BEAT_MOVES : CAT.HELD_MOVES;
          const fresh = pool.length > 1 ? pool.filter((m) => m !== prev) : pool;
          move = fresh.reduce((best, m) => ((used.get(m) ?? 0) < (used.get(best) ?? 0) ? m : best), fresh[0]);
          moves[j] ??= move;
        }
        used.set(move, (used.get(move) ?? 0) + 1);
        prev = move;
        prevFamily = familyOf(move);
        for (const ph of group) ph.move = CAT.FOR_GESTURE[ph.gesture] ?? move;
        if (prevFamily !== 'note' && g1 - g0 >= 1.0) {
          // across the figure in one go, so a beat move carries on over the phrases that play their own move
          // and the music that flows, which are cut out of it; a swell holds on under them
          const cut = [...(prevFamily === 'beat' ? group.filter((q) => q.move !== move) : []), ...flowing];
          drawAround(cars, scratch, cut, g0, g1, (on) => {
            M.MOVES[move](on, an, stretch(an, g0, g1));
            if (prevFamily === 'beat') M.barMelody(on, an, stretch(an, g0, g1));
          });
        }
        for (const ph of group) if (ph.move !== move || prevFamily === 'note') M.MOVES[ph.move!](cars, an, ph);
      });
      for (const k of keys) if (!byKey.has(k)) byKey.set(k, moves);
    });
  }
}

const TAIL_S = 3;          // how far past its stretch a move's fades can reach

/** `draw` over [a, b] on the blank `scratch` cars, laid over the cars except within the spans `cut`. */
function drawAround(cars: Car[], scratch: Car[], cut: { t0: number; t1: number }[], a: number, b: number,
  draw: (on: Car[]) => void) {
  if (!cut.some((q) => q.t1 > a && q.t0 < b + TAIL_S)) return draw(cars);
  draw(scratch);
  const c0 = cars[0], f0 = c0.fr(a - 1), f1 = c0.fr(b + TAIL_S), N = C.N_CHANNELS;
  const keep = new Uint8Array(c0.nFrames).fill(1, f0, f1);
  for (const q of cut) keep.fill(0, c0.fr(q.t0), c0.fr(q.t1));
  cars.forEach((c, k) => {
    const from = scratch[k].frames, to = c.frames;
    for (let f = f0; f < f1; f++) {
      if (!keep[f]) continue;
      for (let i = f * N; i < (f + 1) * N; i++) if (from[i] > to[i]) to[i] = from[i];
    }
    from.fill(0, f0 * N, f1 * N);
  });
}

/** A stretch of a passage as a phrase, for a move drawn across it. */
function stretch(an: Analysis, t0: number, t1: number): Phrase {
  const a = searchsorted(an.events.t, t0), b = searchsorted(an.events.t, t1);
  return { a, b, t0, t1, gesture: 'figuration', up: 0.5, lo: an.pitchLo, hi: an.pitchHi,
    level: levelOver(an, t0, t1) };
}

// ---- Accents ----------------------------------------------------------------------------------
// The whole stage at once is the show's exclamation mark, so it is kept for the moments that stand out most.
// Besides the drops (pulse.ts), the cadences' closing chords (the cadence move) and a sung line's lightning
// (lyrics.ts), the strongest of
//   arrivals   a phrase's arrival chord in lively music where the music steps up: its level LIFT over the
//              seconds before, or a jump of BLAST
//   blasts     a strike out of a breath that lands loud (LOUD: within 16 dB of the song's loud end, the show
//              at a groove or more as it rings, RING_S on): BLAST (16 dB) louder than the quietest moment of
//              the BREATH_S before (an orchestra's tutti after a rest, a band's hit after a stop)
// light the whole stage, at most one for every ACCENT_EVERY_S of the song, strongest first: a strike out of
// silence (the breath before it at REST: 30 dB under the loud end) at least STRIKE_GAP_S after another, as
// the Toccata's opening calls are, anything else ACCENT_GAP_S clear of every other, a drop, a cadence or
// lightning. Every other arrival is punctuation on its own: the accents and the bars flash in lively
// music, the inner beams glow in calm.

const BLAST = 0.4, LIFT = 0.08, LOUD = 0.6, REST = 0.25, RING_S = 0.8;
const ACCENT_EVERY_S = 40, ACCENT_GAP_S = 10, STRIKE_GAP_S = 4;
const BREATH_S = 0.4, ATTACK_S = 0.15;     // the breath before a strike, and its attack (the loudest moment)
const LIFT_WEIGHT = 2;     // a step up in the level counts twice a jump in loudness: it lasts
const STRIKE_HOLD_S = 0.3;     // a strike holds the whole stage this long at most, and under a beat

function accents(cars: Car[], an: Analysis, phrases: Phrase[], said: Moment[]) {
  const x = an.loudness, ev = an.events, at = (t: number) => clip(Math.round(t / an.step), 0, an.nFrames - 1);
  /** [the quietest moment of the breath before t (silence before the song), the loudest of its attack] */
  const around = (t: number): [number, number] => {
    let before = Infinity, after = 0;
    for (let f = at(t - BREATH_S); f < at(t - 0.05); f++) before = Math.min(before, x[f]);
    for (let f = at(t); f <= at(t + ATTACK_S); f++) after = Math.max(after, x[f]);
    return [before === Infinity ? 0 : before, after];
  };
  const lift = (t: number) => levelOver(an, t, t + 2) - levelOver(an, t - 4, t - 0.3);
  const strength = (t: number, [before, after]: [number, number]) =>
    after - before + LIFT_WEIGHT * Math.max(0, lift(t));
  const lively = (t: number) => levelAt(an, t) >= DRIVE && !flowsAt(an, t);
  const taken = [...PULSE.drops(an), ...said.filter((m) => m.do === 'lightning').map((m) => onGrid(an, m.t0))];
  for (const ph of phrases) if (ph.move === 'cadence') for (let i = ph.a; i < ph.b; i++) taken.push(ev.t[i]);
  const cands: { t: number; strength: number; hold: number; strike: boolean }[] = [];
  for (const h of an.hits) {
    const [before, after] = around(h);
    if (after < LOUD || after - before < BLAST || levelAt(an, h + RING_S) < GROOVE || flowsAt(an, h)) continue;
    const hold = Math.min(STRIKE_HOLD_S, M.beatAt(an, h) * 0.6);
    cands.push({ t: h, strength: strength(h, [before, after]), hold, strike: before <= REST });
  }
  const arrivals: number[] = [];
  for (const ph of phrases) {
    if (ph.move === 'cadence' || ph.move === 'legato') continue;
    for (let i = ph.a; i < ph.b; i++) {
      const t = ev.t[i];
      if (!ev.arrival[i]) continue;
      arrivals.push(i);
      const [before, after] = around(t);
      if (!lively(t) || (lift(t) < LIFT && after - before < BLAST)) continue;
      cands.push({ t, strength: strength(t, [before, after]), hold: clip(ev.dur[i], 0.3, 1.2), strike: false });
    }
  }
  let most = Math.round(an.duration / ACCENT_EVERY_S);
  const kept: typeof cands = [];
  for (const c of cands.sort((p, q) => q.strength - p.strength)) {
    const near = (u: number, gap: number) => Math.abs(u - c.t) < gap;
    if (most <= 0 || taken.some((u) => near(u, c.strike ? 1 : ACCENT_GAP_S))
      || kept.some((k) => near(k.t, c.strike && k.strike ? STRIKE_GAP_S : ACCENT_GAP_S))) continue;
    most--;
    kept.push(c);
    M.allOn(cars, c.t, c.hold);
  }
  for (const i of arrivals) {
    const t = ev.t[i];
    if (kept.some((k) => k.t === t)) continue;
    if (levelAt(an, t) < GROOVE) {
      for (const c of cars) {
        c.light(c.inner(), t, t + 0.8, C.ON_500);
        c.light(c.inner(), t + 0.8, t + 1.8, C.OFF_1000);
      }
    } else {
      const hold = clip(ev.dur[i], 0.15, 0.4);
      for (const c of cars) {
        c.flash(c.accents(), t, hold);
        if (c.hasBar) M.barFlash(c, t, hold + 0.2, 0.9);
      }
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
    if (ev.low[i] <= 45 && ev.dur[i] >= 0.8 && levelAt(an, t) < DRIVE && !flowsAt(an, t)) {
      const d = Math.min(ev.dur[i], 2.5);
      for (const c of anchor) {
        c.light(c.inner(), t, t + d, C.ON_2000);
        c.light(c.inner(), t + d, t + d + 2.1, C.OFF_2000);
      }
    }
  }
}

// ---- Lyrics ------------------------------------------------------------------------------------

/** A moment moved onto the music's grid: onto the beat within a quarter beat of one, else the nearest
 * eighth. */
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

/** The ending: everything on at the music's last strong hit in its final 12 s (or its last strong beat),
 * then a 2 s fade to dark, the bars with it. Music that ends flowing has faded out already (legato.ts),
 * unless it ends on a loud strike (a band's last hit after a quiet outro). */
function finale(cars: Car[], an: Analysis, flowed: boolean) {
  const end = musicSpan(an)[1];
  const late = an.hits.filter((h) => h > end - 12 && h < end);
  let t = late.length ? late[late.length - 1] : Math.max(end - 1.5, 0);
  const last = finalBeat(an, end);
  if (last !== null && last > t) t = last;
  const ring = an.loudness.subarray(cars[0].fr(t), cars[0].fr(t + 0.2) + 1);
  if (flowed && !(late.includes(t) && Math.max(...ring) >= LOUD)) return;
  const fadeEnd = Math.min(an.duration - 0.1, t + 2.5);
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

const MERGE_S = 0.25;     // below drive, a lamp dark for less than this between two longer lightings flickers
const MIN_ON = 5, MIN_OFF = 3;     // frames: a flash under 100 ms doesn't read, nor a gap under 60 ms

/** On-off lamps, so that rapid notes read as separate flashes and calm music doesn't flicker: flashes shorter
 * than MIN_ON get stretched; below drive a lamp that goes dark for less than MERGE_S, and for less time than
 * it was lit either side, stays lit (a quick figure on one lamp is held light, while a trill's flicker, its
 * gaps as long as its flashes, stays a flicker); from drive up gaps under MIN_OFF get opened up. */
function tidy(car: Car, an: Analysis) {
  const n = car.nFrames, lv = an.level!, merge = Math.round(MERGE_S / an.step);
  for (let ch = C.L_OUTER_MAIN; ch <= C.LICENSE_PLATE; ch++) {
    const col = car.column(ch);
    let [starts, ends] = onRuns(col);
    if (!starts.length) continue;
    starts.forEach((s0, k) => {                // stretch short flashes
      if (ends[k] - s0 < MIN_ON) {
        const v = col[s0];
        for (let f = s0; f < Math.min(n, s0 + MIN_ON); f++) col[f] = Math.max(col[f], v);
      }
    });
    [starts, ends] = onRuns(col);
    for (let k = 0; k < ends.length - 1; k++) {
      const e0 = ends[k], s1 = starts[k + 1], gap = s1 - e0;
      const held = gap < merge && gap < e0 - starts[k] && gap < ends[k + 1] - s1
        && lv[clip(e0, 0, n - 1)] < DRIVE;
      if (held) col.fill(col[e0 - 1], e0, s1);
      else if (gap < MIN_OFF) for (let f = s1; f < Math.min(n, e0 + MIN_OFF); f++) col[f] = 0;
    }
    for (let f = 0; f < n; f++) car.put(f, ch, col[f]);
  }
}

const MAX_RATE = 5;        // lightings a second a car can make before it reads as blinking rather than playing
const ON_GRID_S = 0.06;    // a lighting this close to a beat or a note is on it
const FAST = new Set(['run_up', 'run_down', 'zigzag', 'trill']);     // textures that play faster than that

/** A car lights a lamp at most MAX_RATE times a second: past that, only a lighting on a beat, or on a note
 * of a run, a zigzag or a trill, keeps its flash; any other (a hat, the next note of a busy accompaniment, a
 * ring of a figure between the beats) joins the lighting before it on its lamp, or is left out where there
 * is none within a second, so the car holds light instead of blinking. A truck's bar counts as a lamp lit
 * when over half of it is: past the rate, a flash of it stays under half. */
function steady(car: Car, an: Analysis) {
  const n = car.nFrames, near = Math.round(ON_GRID_S / an.step), second = Math.round(1 / an.step);
  const onGrid = new Uint8Array(n), ev = an.events;
  for (const t of [...an.beats, ...ev.t.filter((_, i) => FAST.has(ev.phrase[i]))]) {
    const f = car.fr(t);
    onGrid.fill(1, Math.max(0, f - near), Math.min(n, f + near + 1));
  }
  const cols: Uint8Array[] = [];
  for (let ch = C.L_OUTER_MAIN; ch <= C.LICENSE_PLATE; ch++) cols.push(car.column(ch));
  const lastLit = new Int32Array(cols.length).fill(-n);
  const kept: number[] = [];
  const N = C.N_CHANNELS, bar = C.FRONT_BAR, F = car.frames;
  const barMean = (f: number) => {
    let m = 0;
    for (const ch of bar) m += F[f * N + ch];
    return car.isCt ? m / bar.length / 255 : 0;
  };
  for (let f = 1, was = barMean(0); f < n; f++) {
    const rising = cols.flatMap((col, k) => (col[f] >= 128 && col[f - 1] < 128 ? [k] : []));
    const mean = barMean(f), barRises = mean >= 0.5 && was < 0.5;
    was = mean;
    if (rising.length || barRises) {
      while (kept.length && kept[0] <= f - second) kept.shift();
      if (kept.length < MAX_RATE || onGrid[f]) {
        kept.push(f);
      } else {
        let top = 0, end = f;
        for (; barRises && end < n && barMean(end) >= 0.5; end++) top = Math.max(top, barMean(end));
        for (let g = f; g < end; g++) {
          for (const ch of bar) F[g * N + ch] = Math.trunc((F[g * N + ch] * 0.45) / top);      // under half
        }
        if (barRises) was = barMean(f);
        for (const k of rising) {
          const col = cols[k], p = lastLit[k];
          if (f - p <= second) col.fill(col[p], p + 1, f);
          else for (let g = f; g < n && col[g] >= 128; g++) col[g] = 0;
        }
      }
    }
    cols.forEach((col, k) => {
      if (col[f] >= 128) lastLit[k] = f;
    });
  }
  cols.forEach((col, k) => {
    for (let f = 0; f < n; f++) car.put(f, C.L_OUTER_MAIN + k, col[f]);
  });
}
