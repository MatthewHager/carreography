// The show for a line of Teslas (crowd's left to right, any lineup of one to five cars), drawn in layers,
// each sized by the level and each lighting lamps of its own (docs/HOW_IT_WORKS.md has the table):
//
//   bed       what is lit steadily, and where the music flows the front lamps breathing with it (bed.ts)
//   moves     the foreground: the song in passages, each cut into figures that play one move (moves.ts)
//   drums     each drum voice on lamps of its own wherever it keeps time (drums.ts)
//   pulse     the beat on the headlights, and the builds that speed up into a drop (pulse.ts)
//   accents   the whole stage at once for what stands out most; what the lyrics say (lyrics.ts)
//   motors    lids, windows, mirrors, the charge port and a Model X's doors (motors.ts)
//   the end   everything on at the music's last strong hit, then a fade
//
// Silence is dark (Car.light).

import type { Analysis, Phrase } from './analysis';
import * as BED from './bed';
import { Car, makeLineup } from './car';
import * as CAT from './catalog';
import * as C from './channels';
import * as DRUMS from './drums';
import { feel, flowsAt, followable, held, kitAt } from './feel';
import * as LAMPS from './lamps';
import { DRIVE, GROOVE, levelAt, levelCurve, levelOver, musicSpan, silence, stepOf } from './level';
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
  const sung = an.lyricLines?.length ? an.lyricLines : null;     // a sung line starts a phrase
  an.phrases = segment(an.events, sung ? sung.map((l) => l.t) : null);
  feel(an, an.phrases);     // heard before tempo.ts moves the beats
  TEMPO.apply(an);          // beats moved onto what is played (rubato-aware)
  // Durations in the moves (a bar, a sixteenth) come from the tempo: make it the tracked beats' own
  // spacing so a bar-long sweep ends on the next downbeat rather than drifting off it.
  if (an.beats.length > 8) an.tempo = 60.0 / median(an.beats.slice(1).map((b, i) => b - an.beats[i]));
  an.level = levelCurve(an);
  for (const ph of an.phrases) ph.level = levelOver(an, ph.t0, ph.t1);
  const cars = makeLineup(layout, an.nFrames, an.step, silence(an));
  const said = sung ? LY.moments(sung, an) : [];
  an.beatLamps = PULSE.ownership(an);       // the headlights the beat plays, which the moves leave to it
  BED.apply(cars, an);
  playPassages(cars, an);
  DRUMS.apply(cars, an);
  PULSE.apply(cars, an);
  LY.apply(cars, an, said);
  accents(cars, an, said);
  motors.choreograph(cars, an);
  finale(cars, an);
  for (const car of cars) {
    if (car.juniper) LAMPS.juniperOutput(car);
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
// material (it replays that material's moves at the same level, so a chorus looks like the chorus), a
// new section where the sound changes (a novelty peak), or where the music starts or stops flowing. A
// passage over LONG_S is split where its sound changes most, and wherever the level settles on another step
// for BAND_S or more (calm, groove, drive, the peak), so the look changes as the music builds.

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
  const peaks = an.noveltyPeaks;
  const changes = (t: number) => peaks.some(([p, v]) => v >= CHANGE && Math.abs(p - t) <= 2);
  const out: (Passage & { flow: boolean })[] = [];
  const seen = new Set<string>();
  for (const s of feel(an)) {
    const last = out[out.length - 1];
    if (last && !seen.has(s.letter) && !changes(s.t0) && s.flow === last.flow) {
      last.t1 = s.t1;                                       // the same music carries on
      last.letters.push(s.letter);
    } else {
      out.push({ t0: s.t0, t1: s.t1, letters: [s.letter], piece: 0, flow: s.flow });
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
type Family = 'note' | 'beat' | 'held' | 'flow';

/** Does a stretch call for a move that follows the melody, one that follows the beat, the swell of a held
 * chord, or one that flows? Where the music flows (feel.ts), a flowing move. With no beat to follow
 * otherwise (feel.followable: none, or one the music doesn't strike), the swell where a chord is held
 * (feel.held), else the melody. From drive up, and from a groove where a drum kit plays, the beat: the whole
 * stage moves together on it, with the melody along the trucks' bars. Below that, the melody where there are
 * notes enough to follow, the beat under sparse notes (a singer over a band), and in between the one the
 * previous figure didn't take, for contrast. */
function family(an: Analysis, t0: number, t1: number, step: number, before: Family | null): Family {
  if (flowsAt(an, t0)) return 'flow';
  const notes = an.events.t.filter((t) => t >= t0 && t < t1).length / Math.max(t1 - t0, 1);
  const kit = kitAt(an, (t0 + t1) / 2);
  if (!followable(an, t0, t1)) return held(an, t0, t1) ? 'held' : 'note';
  if (step >= 3 || (step >= 2 && kit)) return 'beat';
  if (notes >= DENSE) return 'note';
  if (notes < SPARSE || (kit && notes < SUNG)) return 'beat';
  return before === 'note' ? 'beat' : 'note';
}

const POOLS: Record<Family, string[]> = { note: CAT.NOTE_MOVES, beat: CAT.BEAT_MOVES, held: CAT.HELD_MOVES,
  flow: CAT.FLOW_MOVES };
const familyOf = (move: string) => (Object.keys(POOLS) as Family[]).find((f) => POOLS[f].includes(move))!;

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
 * cadence, the motif) plays that, but where the music flows; the rest play their figure's. A passage's runs
 * at one level are cut into figures at phrase starts (figures), each taking the least used move of its
 * family, so the look changes with the music's periods; material heard again at the same level replays its
 * figures' moves. A note move plays each phrase's notes; any other plays across its whole figure, rests
 * included, a beat move around the phrases that play their own and with the melody riding the trucks' bars
 * on top. */
function playPassages(cars: Car[], an: Analysis) {
  const used = new Map<string, number>();
  const byKey = new Map<string, string[]>();
  let prev: string | null = null, prevFamily: Family | null = null;
  for (const p of passages(an)) {
    const mine = an.phrases!.filter((ph) => ph.t0 >= p.t0 - 0.01 && ph.t0 < p.t1);
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
        const peak = stepOf(levelOver(an, g0, g1)) === 4;      // no sparse move at the peak
        // a replay keeps its move where the music still allows it (a beat to follow for a beat move, a held
        // chord for a swell, flowing music for a flowing move) and the figure before didn't just play it:
        // material repeated back to back changes its figure rather than playing one move for half a minute
        const fits = (m: string) => {
          const f = familyOf(m);
          return (f === 'held') === (fam === 'held') && (f === 'flow') === (fam === 'flow')
            && (m !== prev || m === 'swell') && (f !== 'beat' || fam === 'beat' || followable(an, g0, g1))
            && !(peak && CAT.SPARSE_MOVES.includes(m));
        };
        if (move === undefined || !fits(move)) {
          // the least used of the family, and of those the one the figure's register points to, so songs and
          // figures don't all walk the catalogue in the same order
          const pool = POOLS[fam].filter((m) => !peak || !CAT.SPARSE_MOVES.includes(m));
          const fresh = pool.length > 1 ? pool.filter((m) => m !== prev) : pool;
          const least = Math.min(...fresh.map((m) => used.get(m) ?? 0));
          const ties = fresh.filter((m) => (used.get(m) ?? 0) === least);
          move = ties[Math.min(ties.length - 1, Math.floor(register(an, g0, g1) * ties.length))];
          moves[j] ??= move;
        }
        used.set(move, (used.get(move) ?? 0) + 1);
        prev = move;
        prevFamily = familyOf(move);
        for (const ph of group) ph.move = (prevFamily !== 'flow' && CAT.FOR_GESTURE[ph.gesture]) || move;
        const own = group.filter((q) => q.move !== move || prevFamily === 'note');
        if (prevFamily !== 'note') {
          // across the figure, so a beat move carries on over the phrases' rests and around those that play
          // their own; a swell or a flowing move holds on under them
          const around = prevFamily === 'beat' ? own : [];
          let a = g0;
          for (const q of [...around, { t0: g1, t1: g1 }]) {
            if (q.t0 - a >= 1.0) {
              M.MOVES[move](cars, an, stretch(an, a, q.t0));
              if (prevFamily === 'beat') M.barMelody(cars, an, stretch(an, a, q.t0));
            }
            a = Math.max(a, q.t1);
          }
        }
        for (const ph of own) M.MOVES[ph.move!](cars, an, ph);
      });
      for (const k of keys) if (!byKey.has(k)) byKey.set(k, moves);
    });
  }
}

/** Where the melody of [t0, t1) sits in the song's range, 0 (low) to 1 (high); the middle with no notes. */
function register(an: Analysis, t0: number, t1: number): number {
  const ev = an.events, a = searchsorted(ev.t, t0), b = searchsorted(ev.t, t1);
  if (b <= a) return 0.5;
  let sum = 0;
  const span = Math.max(an.pitchHi - an.pitchLo, 1);
  for (let i = a; i < b; i++) sum += clip((ev.top[i] - an.pitchLo) / span, 0, 0.999);
  return sum / (b - a);
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
// lightning.

const BLAST = 0.4, LIFT = 0.08, LOUD = 0.6, REST = 0.25, RING_S = 0.8;
const ACCENT_EVERY_S = 40, ACCENT_GAP_S = 10, STRIKE_GAP_S = 4;
const BREATH_S = 0.4, ATTACK_S = 0.15;     // the breath before a strike, and its attack (the loudest moment)
const LIFT_WEIGHT = 2;     // a step up in the level counts twice a jump in loudness: it lasts
const STRIKE_HOLD_S = 0.3;     // a strike holds the whole stage this long at most, and under a beat

function accents(cars: Car[], an: Analysis, said: Moment[]) {
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
  const taken = [...PULSE.drops(an), ...said.filter((m) => m.do === 'lightning').map((m) => LY.onGrid(an, m.t0))];
  const phrases = an.phrases!.filter((ph) => !flowsAt(an, ph.t0));
  for (const ph of phrases) if (ph.move === 'cadence') for (let i = ph.a; i < ph.b; i++) taken.push(ev.t[i]);
  const cands: { t: number; strength: number; hold: number; strike: boolean }[] = [];
  for (const h of an.hits) {
    const [before, after] = around(h);
    if (after < LOUD || after - before < BLAST || levelAt(an, h + RING_S) < GROOVE || flowsAt(an, h)) continue;
    const hold = Math.min(STRIKE_HOLD_S, M.beatAt(an, h) * 0.6);
    cands.push({ t: h, strength: strength(h, [before, after]), hold, strike: before <= REST });
  }
  for (const ph of phrases) {
    for (let i = ph.a; i < ph.b; i++) {
      const t = ev.t[i], [before, after] = around(t);
      if (!ev.arrival[i] || ph.move === 'cadence' || levelAt(an, t) < DRIVE
        || (lift(t) < LIFT && after - before < BLAST)) continue;
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
}

// ---- The end ------------------------------------------------------------------------------------

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
 * then a 2 s fade to dark, the bars with it. Music that ends flowing fades slowly instead, whatever is lit
 * as it ends going out over 2 s, unless it ends on a loud strike (a band's last hit after a quiet outro). */
function finale(cars: Car[], an: Analysis) {
  const end = musicSpan(an)[1];
  const late = an.hits.filter((h) => h > end - 12 && h < end);
  let t = late.length ? late[late.length - 1] : Math.max(end - 1.5, 0);
  const last = finalBeat(an, end);
  if (last !== null && last > t) t = last;
  const ring = an.loudness.subarray(cars[0].fr(t), cars[0].fr(t + 0.2) + 1);
  if (flowsAt(an, end - 0.25) && !(late.includes(t) && Math.max(...ring) >= LOUD)) {
    for (const c of cars) {
      const row = clip(c.fr(end) - 1, 0, c.nFrames - 1), lit = c.everything().filter((ch) => c.get(row, ch) > 0);
      c.set(c.everything(), end, an.duration, 0);
      c.light(lit, end, Math.min(an.duration, end + 2.0), C.OFF_2000);
    }
    return;
  }
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
