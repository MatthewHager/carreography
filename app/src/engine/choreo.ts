// Coordinated choreography for a line of Teslas (default: Model Y | Cybertruck | Model Y).
//
// The stage is read left to right as "melody slots": the side cars' left and right sides and the
// Cybertruck's 60-LED front bar (continuous). A note's pitch picks its slot, so runs and scales scrub
// across the cars. Every light is an instrument; intensity tiers (from the music, biased to build
// across the piece) gate which instruments play. Closures are planned backward from their travel
// times so they arrive in position on the musical moment, within Tesla's per-show command limits.

import type { Analysis, Events, Phrase } from './analysis';
import { ceilingAt, tierAt } from './arc';
import { Car, makeLineup } from './car';
import * as CAT from './catalog';
import * as C from './channels';
import * as CUE from './cues';
import type { Resolved } from './cues';
import { sectionAt } from './form';
import * as LAMPS from './lamps';
import * as LEGATO from './legato';
import * as LY from './lyrics';
import * as MD from './mood';
import * as motors from './motors';
import * as M from './moves';
import { clip, corrcoef, interp, linspace, mean, median, round, runs, searchsorted, slope } from './np';
import * as PULSE from './pulse';
import { segment } from './phrases';
import * as TEMPO from './tempo';

const PURPLE = [110, 0, 200];
const ORANGE = [255, 70, 0];
const WHITE = [255, 255, 255];

export const WINDOW_DANCE_BUDGET_S = 28.0;   // Tesla advises ~30 s of dance per show (thermal limits)

export type Formation = readonly string[];   // ['unison', move] or ['split', y, ct]
type Cues = [string, Resolved][];

const key = (f: Formation) => f.join('|');
const same = (a: Formation | null | undefined, b: Formation | null | undefined) => !!a && !!b && key(a) === key(b);
const parts = (f: Formation) => f.slice(1);
const anyIn = (f: Formation, s: Set<string>) => parts(f).some((m) => s.has(m));
const allIn = (f: Formation, s: Set<string>) => parts(f).every((m) => s.has(m));

export interface Options {
  layout?: string;
  useLiftgate?: boolean;
  name?: string | null;
  style?: string | null;
  driver?: string | null;
}

/** Phrase-level choreography: one whole-stage move per musical phrase (see moves.ts), shaped by the
 * form map (form.ts) and the song's cue sheet (cues.ts). style "legato" (slow, flowing music with no
 * beat to follow, e.g. Ave Maria) uses legato.ts for the lights instead. driver says what carries the
 * rhythm ("organ", "orchestra", "band", "vocal_band"; see cues.DRIVERS). */
export function choreograph(an: Analysis, opts: Options = {}): Car[] {
  const { layout = 'YCY', useLiftgate = true, name = null, style = null, driver = null } = opts;
  const cars = makeLineup(layout, an.nFrames, an.step);
  const words = an.lyricWords;
  // LRCLIB's lines (a song dropped into the browser) when there are no Whisper words (the Python analyses)
  const sung = !(words && words.length) && an.lyricLines?.length ? an.lyricLines : null;
  const phrases = segment(an.events, words && words.length ? LY.lines(words).map((l) => l[0])
    : sung ? sung.map((l) => l.t) : null);
  an.phrases = phrases;
  const cues: Cues = name ? CUE.resolve(name, an) : [];
  if (words && words.length && name) cues.push(...LY.lyricCues(name, words));
  else if (sung) cues.push(...LY.lineCues(sung, an));
  an.cuePeaks = cues.filter(([a]) => a === 'peak').map(([, c]) => [c.t0, c.build!, c.hold ?? null, c.final ?? false]);
  for (const [a, c] of cues) {                     // ceilings are needed before the plan is chosen
    if (a === 'ceiling' && an.sections && an.sections.length) {
      for (const sec of an.sections) if (sec.t0 < c.t1 && sec.t1 > c.t0) sec.ceiling = Math.trunc(c.value!);
    }
  }
  an.driver = driver || (name ? CUE.driver(name) : 'orchestra');
  // Durations in the moves (a bar, a sixteenth) come from the tempo: make it the tracked beats' own
  // spacing so a bar-long sweep ends on the next downbeat rather than drifting off it.
  an.beatsTracked = an.beats;
  an.beatFollow = TEMPO.apply(an);          // beats moved onto what is played (rubato-aware)
  if (an.beats.length > 8) an.tempo = 60.0 / median(an.beats.slice(1).map((b, i) => b - an.beats[i]));
  MD.assign(an, phrases);
  if (style === 'legato') {
    LEGATO.choreograph(cars, an);
    for (const ph of phrases) ph.move = 'legato';
    applyCues(cars, an, cues);
    applyColorCues(cars, an, cues);
    motors.choreograph(cars, an, useLiftgate);
  } else {
    pedal(cars, an);
    playPhrases(cars, an, phrases);
    darknessGuard(cars, an, phrases);
    if (an.driver === 'band' || an.driver === 'vocal_band') drums(cars, an);
    else if (an.driver === 'orchestra') percussion(cars, an);
    an.pulseStats = PULSE.apply(cars, an, phrases);      // the beat layer owns the headlights
    applyCues(cars, an, cues);
    interior(cars, an);
    applyColorCues(cars, an, cues);
    motors.choreograph(cars, an, useLiftgate);
    finale(cars, an);
  }
  for (const car of cars) {
    tidy(car);
    if (car.juniper) LAMPS.juniperOutput(car);
    for (let f = Math.max(0, car.nFrames - 3); f < car.nFrames; f++) {
      for (let ch = 0; ch < C.L_FALCON; ch++) car.put(f, ch, 0);
      for (let ch = C.FRONT_BAR[0]; ch < C.N_CHANNELS; ch++) car.put(f, ch, 0);
    }
  }
  an.phrases = phrases;
  return cars;
}

// ---- The choreographer -------------------------------------------------------------------------
// A formation says who does what for one phrase: "unison" (one move, every car) or "split" (the two
// Model Ys do one move while the Cybertruck does another). The chooser matches the formation to the
// phrase's gesture and intensity, keeps variety (never the same formation twice running, unison and
// split alternating), and gives repeated material the same formation.

// Single-note passages strobe: every move here flashes per note or per beat. (Flow moves such as
// meter, expand_contract and fill_stage are reserved for chords and crescendos.)
export const UNISON_FIGURATION = ['lr_notes', 'rotation', 'mirror', 'keyboard', 'wave', 'converge', 'call_response',
  'relay', 'pinball', 'syncopate', 'lr_beat', 'march', 'cascade', 'tug_of_war', 'antiphony',
  'checker', 'beam', 'lr_channel'];
// Moves where the cars pass something between them (the ones with the most impact).
export const COLLAB = new Set([
  'wave', 'converge', 'relay', 'pinball', 'syncopate', 'expand_contract', 'fill_stage', 'out_in', 'rotation',
  'lr_notes', 'lr_beat', 'call_response', 'march', 'cascade', 'tug_of_war', 'bounce_build', 'antiphony', 'motif',
  'checker', 'beam', 'lr_channel', 'implode', 'fade_cross',
  ...Object.entries(CAT.UNISON).filter(([, i]) => i.collab).map(([m]) => m),
]);
export const BEAT_MOVES = new Set(['lr_beat', 'wave', 'converge', 'heartbeat', 'y_ripple_in', 'y_ripple_out',
  'ct_scan', 'ct_edge_pulse', 'y_turn_ticks', 'pinball', 'syncopate', 'expand_contract',
  'march', 'cascade', 'tug_of_war', 'bounce_build', 'checker', 'beam', 'lr_channel',
  'curtain', 'breathe_wash', 'marquee', 'crossing', 'shockwave', 'sparkle', 'sunrise', 'scanner', 'accelerando',
  'ping_pong', 'metronome', 'stripes', 'flutter']);
export const SPLIT_FIGURATION: [string, string][] = [['y_keyboard', 'ct_comets'], ['y_ripple_in', 'ct_comets'],
  ['y_keyboard', 'ct_scan'], ['y_turn_ticks', 'ct_comets'], ['y_ripple_out', 'ct_edge_pulse'],
  ['y_bass_fogs', 'ct_comets'], ['y_wink', 'ct_comets']];
export const CALM = new Set(['keyboard', 'mirror', 'meter', 'pulse', 'y_breathe', 'ct_comets', 'ct_swell', 'ct_meter',
  'y_keyboard', 'breathe_wash', 'sunrise', 'sparkle', 'beam', 'relay', 'march', 'fade_cross', 'metronome']);
// How much of the stage a move lights. Full-power sections only use strong moves; calm ones only quiet.
export const QUIET = new Set(['breathe_wash', 'sunrise', 'sparkle', 'y_turn_ticks', 'y_bass_fogs', 'y_breathe',
  'ct_swell', 'ct_edge_pulse', 'pulse', 'meter', 'ct_comets', 'ct_meter', 'y_keyboard', 'shimmer', 'mirror']);
export const STRONG = new Set(['wave', 'converge', 'lr_notes', 'rotation', 'keyboard', 'call_response', 'out_in',
  'heartbeat', 'motif', 'cadence', 'block', 'y_ripple_in', 'y_ripple_out', 'ct_scan', 'y_chords', 'relay',
  'pinball', 'syncopate', 'expand_contract', 'fill_stage', 'rain', 'bar_collide', 'march', 'cascade',
  'tug_of_war', 'bounce_build', 'antiphony', 'checker', 'beam', 'lr_channel', 'implode', 'curtain', 'marquee',
  'crossing', 'shockwave', 'scanner', 'accelerando', 'ping_pong', 'stripes', 'flutter']);

function signature(ev: Events, ph: Phrase): Float64Array | null {
  const p = ev.top.slice(ph.a, ph.b);
  if (p.length < 4) return null;
  const x = interp(linspace(0, p.length - 1, 16), p.map((_, i) => i), p);
  const m = mean(x);
  return x.map((v) => v - m);
}

/** Candidate formations for a phrase, best first: the gesture's candidates, plus every catalogued
 * move that suits the gesture and the phrase's mood, keeping only those whose mood range includes
 * this phrase's (so a calm verse never gets a strobe, a climax never a breath). */
export function formationsFor(ph: Phrase, an: Analysis, ev: Events): Formation[] {
  const base = formationsBase(ph, an, ev);
  const mood = ph.mood;
  if (mood === undefined || mood === null || ph.gesture === 'motif' || ph.gesture === 'cadence') return base;
  if (base.length && BUILDS.includes(base[0][1])) return base;          // a crescendo candidate stays first
  const beatOk = an.beatScore >= 2.0;
  const extra = CAT.candidates(ph.gesture, mood).filter((c) => !base.some((b) => same(b, c))
    && (beatOk || !anyIn(c, BEAT_MOVES)));
  let out = [...base, ...extra].filter((c) => CAT.fits(c, mood));
  if (ceilingAt(an, ph.t0) >= 3) {
    const loud = out.filter((c) => !allIn(c, QUIET));
    out = loud.length ? loud : out;
  }
  return out.length ? out : base;
}

export const BUILDS = ['out_in', 'fill_stage', 'bounce_build', 'implode', 'accelerando'];

/** Does the phrase's loudness rise (the last quarter 35 % louder than the first)? */
function louderAtEnd(an: Analysis, ph: Phrase): boolean {
  const f0 = Math.trunc(ph.t0 / an.step), f1 = Math.max(Math.trunc(ph.t0 / an.step) + 1, Math.trunc(ph.t1 / an.step));
  const e = an.intensity.slice(f0, f1);
  const n = e.length;
  // e[-len(e) // 4:] is the last ceil(n / 4) frames, e[:len(e) // 4] the first floor(n / 4)
  return n > 25 && mean(e, n - Math.ceil(n / 4)) > mean(e, 0, Math.floor(n / 4)) * 1.35;
}

/** Candidate formations for a phrase by gesture, best first. */
export function formationsBase(ph: Phrase, an: Analysis, _ev: Events): Formation[] {
  const g = ph.gesture, tier = tierAt(an, ph.t0);
  const ceiling = ceilingAt(an, ph.t0);
  const beatOk = an.beatScore >= 2.0;
  if (g === 'motif') return [['unison', 'motif']];
  if (g === 'trill') return [['unison', 'shimmer'], ['unison', 'rain']];
  if (g === 'cadence') return [['unison', 'cadence']];
  if (g === 'run') return [['unison', 'relay'], ['unison', 'keyboard'], ['split', 'y_keyboard', beatOk ? 'ct_scan' : 'ct_comets']];
  if (g === 'chords') {
    // Chords are flows and fills, never strobes: holds, swells and growing fills.
    const c: Formation[] = [['unison', 'block'], ['split', 'y_chords', 'bar_collide'], ['split', 'y_chords', 'ct_meter'],
      ['unison', 'meter'], ['unison', 'fade_cross'], ['split', 'y_breathe', 'ct_swell']];
    if (beatOk && ceiling >= 2) c.splice(1, 0, ['unison', 'expand_contract']);
    if (ph.t1 - ph.t0 >= 4 && ceiling >= 2) c.splice(2, 0, ['unison', 'fill_stage']);
    return c;
  }
  if (g === 'recitative') {
    const c: Formation[] = [['unison', 'pulse'], ['split', 'y_wink', 'ct_comets'], ['split', 'y_breathe', 'ct_comets'],
      ['split', 'y_keyboard', 'ct_swell']];
    if ((an.driver === 'band' || an.driver === 'vocal_band') && beatOk && ceiling >= 2) {
      // sparse singing over a band: the beat carries the stage, not the few transcribed notes
      return [['unison', 'march'], ['unison', 'lr_channel'], ['unison', 'lr_beat'], ['unison', 'checker'],
        ['unison', 'beam'], ['unison', 'heartbeat']];
    }
    if (ceiling >= 3) {   // big declamatory notes with rests between (a loud ending): hold them, don't whisper
      return [['unison', 'block'], ['unison', 'heartbeat'], ...(beatOk ? [['unison', 'expand_contract']] : [])];
    }
    if (beatOk && tier <= 1 && ph.t1 - ph.t0 >= 6) c.splice(1, 0, ['unison', 'heartbeat']);
    return c;
  }
  // figuration
  const rising = louderAtEnd(an, ph);
  let cands: Formation[] = [...UNISON_FIGURATION.map((m) => ['unison', m]), ...SPLIT_FIGURATION.map(([y, c]) => ['split', y, c])];
  if (rising && ph.t1 - ph.t0 >= 4) cands = [['unison', 'out_in'], ['unison', 'fill_stage'], ...cands];
  if (!beatOk) cands = cands.filter((c) => !anyIn(c, BEAT_MOVES));
  if (ceiling <= 1) {   // the arc says: not yet. Only the quiet moves.
    const calm = cands.filter((c) => allIn(c, CALM));
    cands = calm.length ? calm : cands.slice(0, 2);
  } else if (ceiling >= 3) {  // full power: nothing that leaves the Ys dark or lights single lamps
    const loud = cands.filter((c) => !allIn(c, QUIET));
    cands = loud.length ? loud : cands;
  }
  if ((an.driver === 'band' || an.driver === 'vocal_band') && beatOk) {
    const beatFirst = ['syncopate', 'pinball', 'lr_beat', 'march', 'cascade', 'tug_of_war', 'checker', 'beam', 'lr_channel'];
    if (ph.density < 3.0) {   // few notes to follow: only the beat-locked moves
      const locked = cands.filter((c) => beatFirst.includes(c[1]));
      cands = locked.length ? locked : cands;
    }
    cands = sortBy(cands, (c) => (beatFirst.includes(c[1]) ? 0 : ['wave', 'converge'].includes(c[1]) ? 1 : 2));
  }
  if (tier <= 1) cands = sortBy(cands, (c) => (allIn(c, CALM) ? 0 : 1));   // calm passages: quieter moves first
  else cands = sortBy(cands, (c) => (['wave', 'converge', 'lr_notes', 'rotation', 'y_ripple_in'].includes(c[1]) ? 0 : 1));
  return cands;
}

/** A stable sort by a numeric key (Python's sorted(key=...)). */
function sortBy<T>(xs: T[], k: (x: T) => number): T[] {
  return xs.map((x, i) => [k(x), i, x] as const).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map((t) => t[2]);
}

// When a section comes back louder, its formations come back bigger.
export const ESCALATE = new Map<string, Formation>([
  [['split', 'y_keyboard', 'ct_meter'], ['unison', 'cascade']],
  [['split', 'y_keyboard', 'ct_comets'], ['unison', 'converge']],
  [['split', 'y_breathe', 'ct_comets'], ['split', 'y_ripple_in', 'ct_comets']],
  [['split', 'y_keyboard', 'ct_scan'], ['unison', 'wave']],
  [['split', 'y_keyboard', 'ct_swell'], ['split', 'y_ripple_out', 'ct_edge_pulse']],
  [['unison', 'meter'], ['unison', 'wave']],
  [['unison', 'mirror'], ['unison', 'lr_notes']],
  [['unison', 'keyboard'], ['unison', 'rotation']],
  [['unison', 'pulse'], ['unison', 'heartbeat']],
  [['unison', 'lr_notes'], ['unison', 'checker']],
  [['unison', 'rotation'], ['unison', 'wave']],
  [['split', 'y_ripple_out', 'ct_edge_pulse'], ['unison', 'tug_of_war']],
  [['split', 'y_bass_fogs', 'ct_comets'], ['unison', 'lr_notes']],
  [['split', 'y_turn_ticks', 'ct_comets'], ['unison', 'rotation']],
  [['split', 'y_chords', 'ct_meter'], ['unison', 'block']],
  [['split', 'y_wink', 'ct_comets'], ['unison', 'pinball']],
  [['split', 'y_keyboard', 'bar_collide'], ['unison', 'relay']],
  [['unison', 'pinball'], ['unison', 'syncopate']],
  [['unison', 'relay'], ['unison', 'wave']],
].map(([a, b]) => [key(a), b]));

function escalate(f: Formation, steps: number, beatOk: boolean): Formation {
  for (let s = 0; s < steps; s++) {
    const g = ESCALATE.get(key(f)) ?? f;
    if (!beatOk && anyIn(g, BEAT_MOVES)) break;
    f = g;
  }
  return f;
}

/** One formation per phrase, chosen with the whole piece in view:
 * - a section that repeats earlier material replays that section's formations (callbacks), one
 *   intensity step higher each time (the form map's ceiling escalation);
 * - each section leans unison or split (alternating per new letter) so contrast happens at section
 *   scale rather than every few seconds;
 * - within that, least-used first, never the same twice running. */
export function choosePlan(an: Analysis, phrases: Phrase[]): Formation[] {
  const ev = an.events;
  const secs = an.sections ?? [];
  const history: Formation[] = [], plan: Formation[] = [];
  const seen: [Float64Array | null, Formation][] = [];
  const sectionPlans = new Map<string, Formation[]>();     // letter -> formations, in phrase order
  const sectionLean = new Map<string, string>();           // letter -> "unison" | "split"
  const leanCycle = ['unison', 'split'];
  const countIf = <T>(xs: T[], p: (x: T) => boolean) => xs.reduce((n, x) => n + (p(x) ? 1 : 0), 0);
  phrases.forEach((ph, phIndex) => {
    const sec = secs.length ? sectionAt(secs, ph.t0) : null;
    const letter = sec ? sec.letter : 'A';
    if (!sectionLean.has(letter)) sectionLean.set(letter, leanCycle[sectionLean.size % 2]);
    let choice: Formation | null = null;
    // A real crescendo is a build, whatever the section did before: it is where the frunk rises.
    // Two kinds: the loudness rises (band recordings), or the music rises - the line climbs by an
    // octave or more and lands on a held chord (organ, where the loudness barely moves).
    if (ph.gesture === 'figuration' && ph.b - ph.a >= 10) {
      const louder = louderAtEnd(an, ph) && ph.t1 - ph.t0 >= 4;
      const tops = ev.top.slice(ph.a, ph.b);
      const climb = slope(tops) * tops.length;
      const lands = ev.dur[ph.b - 1] >= 0.8
        || (ph.b < ev.t.length && ev.kind[ph.b] >= 2 && ev.t[ph.b] - ph.t1 < 0.6);
      const musical = climb >= 12 && lands && ph.t1 - ph.t0 >= 3;
      const buildTimes = phrases.slice(0, history.length).filter((_, i) => BUILDS.includes(history[i][1])).map((q) => q.t0);
      const lastBuild = buildTimes.length ? Math.max(...buildTimes) : -99;
      const cuePeak = (an.cuePeaks ?? []).some(([t]) => ph.t0 < t && t <= ph.t1 + 0.5);
      const spacing = musical ? 12 : 20;
      const calm = ph.mood === 'calm';
      const nSoFar = countIf(history, (h) => BUILDS.includes(h[1]));
      const room = nSoFar < 1 + an.duration / 50.0;       // about one build per 50 s of song at most
      if ((!calm && room && (louder || musical) && ph.t0 - lastBuild >= spacing) || (cuePeak && ph.t1 - ph.t0 >= 3)) {
        const nBuilds = countIf(history, (h) => BUILDS.includes(h[1]));
        const kinds = ['out_in', 'accelerando', 'fill_stage', 'implode', ...(an.beatScore >= 2.0 ? ['bounce_build'] : [])];
        if (an.beatScore < 2.0 || an.driver === 'organ') kinds.splice(kinds.indexOf('accelerando'), 1);   // a club strobe-roll; organ climbs get fills
        choice = ['unison', cuePeak ? 'out_in' : kinds[nBuilds % kinds.length]];
      }
    }
    // Callback: replay the formation this phrase had the first time the section was heard.
    if (choice === null && sec && sec.repeatOf >= 0 && sectionPlans.has(letter)
      && !['motif', 'cadence', 'trill'].includes(ph.gesture)) {
      const earlier = sectionPlans.get(letter)!;
      const k = countIf(phrases.slice(0, phIndex), (q) => secs.length > 0 && sectionAt(secs, q.t0) === sec);
      if (earlier.length) {
        const firstSec = secs[sec.repeatOf];
        choice = escalate(earlier[k % earlier.length], Math.max(0, sec.ceiling - firstSec.ceiling), an.beatScore >= 2.0);
        if (BUILDS.includes(choice[1])) choice = null;          // builds are placed by the crescendo detector, never replayed
        if (choice !== null && sec.ceiling >= 3 && allIn(choice, QUIET)) {   // a climax never replays a quiet move
          choice = escalate(choice, 1, an.beatScore >= 2.0);
          if (allIn(choice, QUIET)) {
            const last = history[history.length - 1];
            choice = ['unison', same(last, ['unison', 'lr_notes']) ? 'rotation' : 'lr_notes'];
          }
        }
        // A callback must still suit this moment's mood; and from the third hearing of a section on,
        // it is varied - a sibling move on the same grid that fits the mood - so the audience
        // recognises the section without seeing the identical picture.
        const hearing = countIf(secs.slice(0, secs.indexOf(sec)), (q) => q.letter === sec.letter);
        const mood = ph.mood ?? 'drive';
        if (choice !== null && (!CAT.fits(choice, mood) || hearing >= 2)) {
          const baseInfo = CAT.info(choice);
          const c0 = choice;
          let sibs = formationsFor(ph, an, ev).filter((c) => !same(c, c0) && CAT.info(c) != null && baseInfo != null
            && CAT.info(c)!.grid === baseInfo.grid);
          sibs = sortBy(sibs, (c) => countIf(history, (h) => same(h, c)));
          if (sibs.length) choice = sibs[0];
          else if (!CAT.fits(choice, mood)) choice = null;
        }
      }
    }
    if (choice !== null && history.length && same(history[history.length - 1], choice) && ph.gesture === 'figuration') {
      const c0 = choice;
      const alt = formationsFor(ph, an, ev).filter((c) => !same(c, c0) && c[0] === 'unison' && COLLAB.has(c[1]));
      if (alt.length) choice = alt[0];
    }
    if (choice === null) {
      const sig = signature(ev, ph);
      if (sig !== null && ph.gesture === 'figuration') {
        for (const [s2, f2] of seen) {
          if (s2 !== null && s2.length === sig.length) {
            const c = corrcoef(sig, s2);
            if (Number.isFinite(c) && c >= 0.9 && CAT.fits(f2, ph.mood ?? 'drive')) {
              choice = f2;
              break;
            }
          }
        }
      }
      if (choice === null) {
        const cands = formationsFor(ph, an, ev);
        const recent = history.slice(-2);
        const used = new Map<string, number>();
        for (const h of history) used.set(key(h), (used.get(key(h)) ?? 0) + 1);
        const lean = sectionLean.get(letter);
        const cap = Math.max(2, Math.trunc(0.07 * phrases.length));      // no move dominates the song
        const u = (c: Formation) => used.get(key(c)) ?? 0;
        const isRecent = (c: Formation) => recent.some((r) => same(r, c));
        let ordered = cands.map((c, i) => [i, c] as const).sort((x, y) => {
          const kx = [+isRecent(x[1]), +(u(x[1]) >= cap), +(x[1][0] !== lean), u(x[1]), x[0]];
          const ky = [+isRecent(y[1]), +(u(y[1]) >= cap), +(y[1][0] !== lean), u(y[1]), y[0]];
          for (let i = 0; i < kx.length; i++) if (kx[i] !== ky[i]) return kx[i] - ky[i];
          return 0;
        });
        // a crescendo build is a big gesture: at most one every 20 s
        const bt = history.map((h, i) => [h, phrases[i].t0] as const).filter(([h]) => BUILDS.includes(h[1])).map(([, t]) => t);
        const lastBuild = bt.length ? Math.max(...bt) : -99;
        const spaced = ordered.filter(([, c]) => !(BUILDS.includes(c[1]) && ph.t0 - lastBuild < 20));
        ordered = spaced.length ? spaced : ordered;
        choice = ordered[0][1];
        // Collaboration quota: in lively sections, at least 60% of phrases must be moves where the
        // cars pass something between them - they carry the show.
        if (ceilingAt(an, ph.t0) >= 2) {
          const recentHist = history.filter((_, i) => ceilingAt(an, phrases[i].t0) >= 2).slice(-9);
          const share = countIf(recentHist, (h) => h[0] === 'unison' && COLLAB.has(h[1])) / Math.max(1, recentHist.length);
          if (share < 0.6 && !(choice[0] === 'unison' && COLLAB.has(choice[1]))) {
            const alt = ordered.map(([, c]) => c).filter((c) => c[0] === 'unison' && COLLAB.has(c[1]) && !isRecent(c));
            if (alt.length) choice = alt[0];
          }
        }
        // A real crescendo always gets the build (it is also where the frunk rises).
        if (same(cands[0], ['unison', 'out_in']) && ph.t0 - lastBuild >= 20) choice = cands[0];
      }
      seen.push([signature(ev, ph), choice]);
    }
    plan.push(choice!);
    history.push(choice!);
    if (sec && sec.repeatOf < 0 && !['motif', 'cadence', 'trill'].includes(ph.gesture)) {
      if (!sectionPlans.has(letter)) sectionPlans.set(letter, []);
      sectionPlans.get(letter)!.push(choice!);
    }
  });
  return plan;
}

/** No lively phrase may play out mostly dark. A note-driven move over a thin transcription (a soft
 * sung tail, a hummed chorus) can leave the stage black for seconds; when fewer than an eighth of a
 * lively phrase's frames light anything (a beat-strobe move like pinball sits near a fifth), a beat
 * march (or a pulse without a beat) is laid over it so the stage keeps moving. */
export function darknessGuard(cars: Car[], an: Analysis, phrases: Phrase[]) {
  // Only the note-following moves can fail this way; the beat strobes (pinball, syncopate,
  // bounce_build, lr_beat...) are sparse on purpose and are left alone.
  const noteDriven = new Set(['wave', 'converge', 'lr_notes', 'keyboard', 'rotation', 'mirror', 'relay', 'meter', 'pulse',
    'block', 'shimmer', 'rain', 'heartbeat', 'expand_contract', 'fade_cross', 'y_keyboard | ct_comets',
    'y_keyboard | ct_scan', 'y_keyboard | ct_meter', 'y_ripple_in | ct_comets', 'y_breathe | ct_comets']);
  for (const ph of phrases.slice(1)) {      // the first phrase is the opening statement: its silences are the point
    if (ceilingAt(an, ph.t0) < 2 || ph.t1 - ph.t0 < 3.0 || !noteDriven.has(ph.move!)) continue;
    const f0 = Math.trunc(ph.t0 / an.step), f1 = Math.trunc(ph.t1 / an.step);
    const shares = cars.map((c) => {
      const end = Math.min(f1, c.nFrames);
      let n = 0;
      for (let f = f0; f < end; f++) {
        for (let ch = 0; ch < 30; ch++) {
          if (c.get(f, ch) > 0) {
            n++;
            break;
          }
        }
      }
      return n / (end - f0);
    });
    const lit = mean(shares);
    if (lit >= 0.12) continue;
    if (ph.mood === 'calm') {
      M.breatheWash(cars, an, ph);
      ph.move += '+breathe_wash';
    } else if (an.beatScore >= 2.0) {
      M.march(cars, an, ph);
      ph.move += '+march';
    } else {
      M.pulse(cars, an, ph);
      ph.move += '+pulse';
    }
  }
}

const BIG = new Set(['wave', 'converge', 'out_in', 'cadence', 'heartbeat', 'call_response', 'lr_beat', 'relay', 'pinball',
  'syncopate', 'expand_contract', 'fill_stage', 'march', 'cascade', 'tug_of_war', 'bounce_build',
  'checker', 'beam', 'lr_channel', 'implode', 'curtain', 'marquee', 'crossing', 'shockwave', 'scanner',
  'accelerando']);
const SOFT: Record<string, [number, number, number]> = { calm: [C.ON_500, C.OFF_1000, 1.0], groove: [C.ON, C.OFF_500, 0.5] };

export function playPhrases(cars: Car[], an: Analysis, phrases: Phrase[]) {
  const beatLen = 60.0 / Math.max(an.tempo, 40);
  const plan = choosePlan(an, phrases);
  const ys = M.sides(cars);
  const ct = M.centreTruck(cars);
  type Play = (ph: Phrase) => void;
  // Unison moves are M.BY_NAME[name](cars, an, ph); the ones that need more are listed here.
  const special: Record<string, Play> = {
    keyboard: (ph) => M.keyboard(cars, an, ph, tierAt(an, ph.t0) >= 2),
    out_in: (ph) => M.outIn(cars, an, ph, ph.index % 2 === 1),
    block: (ph) => M.block(cars, an, ph, beatLen),
  };
  const unison = (name: string): Play => special[name] ?? ((ph) => M.BY_NAME[name](cars, an, ph));
  const sideMoves: Record<string, Play> = {
    y_keyboard: (ph) => M.yKeyboard(ys, an, ph, Math.min(2, Math.max(0, tierAt(an, ph.t0)))),
    y_ripple_in: (ph) => M.yRipple(ys, an, ph, true),
    y_ripple_out: (ph) => M.yRipple(ys, an, ph, false),
    y_breathe: (ph) => M.yBreathe(ys, an, ph),
    y_turn_ticks: (ph) => {
      M.yTurnTicks(ys, an, ph);
      M.yBassFogs(ys, an, ph);
    },
    y_bass_fogs: (ph) => {
      M.yBassFogs(ys, an, ph);
      M.yKeyboard(ys, an, ph);
    },
    y_chords: (ph) => M.yChords(ys, an, ph, beatLen),
    y_wink: (ph) => M.yWink(ys, an, ph),
  };
  const centre: Record<string, Play> = {
    ct_meter: (ph) => M.ctMeter(ct!, an, ph),
    ct_comets: (ph) => M.ctComets(ct!, an, ph),
    ct_scan: (ph) => M.ctScan(ct!, an, ph),
    ct_edge_pulse: (ph) => M.ctEdgePulse(ct!, an, ph),
    ct_swell: (ph) => M.ctSwell(ct!, an, ph),
    bar_collide: (ph) => M.barCollide(ct!, an, ph),
  };
  let nHits = 0;
  let prevPh: Phrase | null = null;
  let prevF: Formation | null = null, prevEnd = -9.0;
  phrases.forEach((ph, k) => {
    const f = plan[k];
    ph.move = f[0] === 'unison' ? f[1] : `${f[1]} | ${f[2]}`;
    // A breath before a big move: everything dark for a quarter second, so it lands.
    if (f[0] === 'unison' && BIG.has(f[1]) && ph.t0 - prevEnd < 0.6 && ph.t0 > 0.5) {
      for (const c of cars) {
        c.set(c.everything(), ph.t0 - 0.25, ph.t0 - 0.02, 0);
        c.set(C.FRONT_BAR, ph.t0 - 0.25, ph.t0 - 0.02, 0);
      }
    }
    // A handoff when the formation kind changes: the truck's bar passes the baton.
    if (prevF !== null && prevF[0] !== f[0] && ct !== null && ceilingAt(an, ph.t0) >= 1) M.barFlash(ct, ph.t0 - 0.02, 0.18, 0.6);
    prevF = f;
    prevEnd = ph.t1;
    let play = ph;
    // Release or drop after a build: when the music falls back, the stage tears down over two bars
    // from the first downbeat and the phrase's own move starts after; when it stays up, a shockwave
    // marks the landing.
    if (prevPh !== null && BUILDS.includes(prevPh.move ?? '')) {
      const downs = an.downbeats.filter((d) => d >= ph.t0 - 0.05 && d < ph.t1);
      const d0 = downs.length ? downs[0] : ph.t0;
      const bar = (4 * 60.0) / Math.max(an.tempo, 40);
      if (ph.energy! < prevPh.energy! - 0.12 || (ph.mood === 'calm' && prevPh.mood !== 'calm')) {
        const span = Math.min(2 * bar, 0.6 * (ph.t1 - d0));
        if (span >= 1.0) {
          M.teardown(cars, an, d0, span);
          ph.move = 'teardown → ' + ph.move;
          play = { ...ph, t0: d0 + span };
          play.a = searchsorted(an.events.t, play.t0);
        }
      } else {
        M.shockwave(cars, an, { t0: d0, t1: d0 + 0.5, mood: 'drive' } as Phrase);
      }
    }
    prevPh = ph;
    const info = CAT.info(f);
    const saved = an.events;
    an.pace = ph.mood === 'calm' || ph.mood === 'groove' ? ph.pace : null;
    if (info != null && info.grid === 'note' && ph.mood === 'calm' && !['run', 'motif'].includes(ph.gesture)
      && play.b - play.a >= 3) {
      [an.events, play] = MD.thinned(an, play);
    }
    for (const c of cars) c.soft = info == null || !['build', 'self'].includes(info.grid) ? SOFT[ph.mood!] ?? null : null;
    try {
      if ((play.t1 - play.t0 >= 0.5 && play.b > play.a) || play === ph) {
        if (f[0] === 'unison' || !ys.length) {
          unison(f[0] === 'unison' ? f[1] : 'keyboard')(play);
        } else {
          sideMoves[f[1]](play);
          if (ct !== null) centre[f[2]](play);        // no Cybertruck: every car plays the side cars' part
        }
      }
    } finally {
      an.events = saved;
      an.pace = null;
      for (const c of cars) c.soft = null;
    }
    const ev = an.events;
    for (let i = ph.a; i < ph.b; i++) {     // arrivals are punctuation whatever the formation
      if (!(ev.arrival[i] && ph.move !== 'cadence')) continue;
      const t = ev.t[i];
      if (ceilingAt(an, t) >= 2 && ph.mood !== 'calm') {
        nHits++;
        if (nHits % 2 === 0 && ev.dur[i] < 0.8) M.lightning(cars, t);
        else M.allOn(cars, t, clip(ev.dur[i], 0.3, 1.2));
      } else if (ph.mood === 'calm') {   // a calm arrival glows rather than hits
        for (const c of cars) {
          c.light(c.inner(), t, t + 0.8, C.ON_500);
          c.light(c.inner(), t + 0.8, t + 1.8, C.OFF_1000);
        }
      } else {   // the arc says stay modest: a headlight hit, not the whole stage
        for (const c of cars) c.flash(c.heads(), t, 0.15);
      }
    }
  });
}

/** A cue's moment moved onto the music's grid: onto the beat when it is within a quarter beat of one
 * (a shout detected from a chord can read a little late), else onto the nearest eighth. */
export function onGrid(an: Analysis, t: number): number {
  const b = an.beats;
  if (b.length < 2) return t;
  const i = clip(searchsorted(b, t), 1, b.length - 1);
  const near = t - b[i - 1] <= b[i] - t ? b[i - 1] : b[i];
  if (Math.abs(near - t) <= 0.25 * M.beatAt(an, t)) return near;
  return M.snap(an, t, 2);
}

export function applyCues(cars: Car[], an: Analysis, cues: Cues) {
  const ct = M.centreTruck(cars);
  const ys = M.sides(cars);
  const bars = [...C.FRONT_BAR, ...C.REAR_BAR];
  for (const [action, c] of cues) {
    let t0 = c.t0, t1 = c.t1;
    if (action === 'hit' || action === 'lightning' || action === 'ping') t0 = t1 = onGrid(an, t0);
    if (action === 'solo') {
      const keep: Car[] = [];
      for (const tag of c.cars ?? []) keep.push(...(tag === 'center' && ct ? [ct] : tag === 'sides' ? ys : []));
      for (const car of cars) {
        if (keep.includes(car)) continue;
        car.set(car.everything(), t0, t1, 0);
        car.set(bars, t0, t1, 0);
      }
    } else if (action === 'hit') {
      M.allOn(cars, t0, c.hold ?? 0.4);
    } else if (action === 'blackout') {
      for (const car of cars) {
        car.set(car.everything(), t0, t1, 0);
        car.set(bars, t0, t1, 0);
      }
    } else if (action === 'lightning') {
      M.lightning(cars, t0);
    } else if (action === 'ping') {
      // one word of a chant: one car's whole front, pinging across the lineup word by word
      const order = [...cars].sort((p, q) => p.x - q.x);
      const car = order[c.car! % order.length];
      car.flash([...car.sig(), ...car.drl(), ...car.heads()], t0, 0.22);
      if (car.isCt) M.barFlash(car, t0, 0.3, 1.0);
    }
  }
}

/** Interior colour from the lyrics (overrides the section colour for the span). */
export function applyColorCues(cars: Car[], _an: Analysis, cues: Cues) {
  for (const [action, c] of cues) {
    if (action !== 'color') continue;
    const a = cars[0].fr(c.t0), b = cars[0].fr(c.t1);
    for (const car of cars) {
      for (const base of C.ALL_RGB) {
        for (let i = 0; i < 3; i++) for (let f = a; f < b; f++) car.put(f, base + i, Math.trunc(c.color![i]));
      }
    }
  }
}

/** Band songs: the kit is the rhythm. Kicks (low onsets of the drums stem) hit every car's headlights,
 * snares (strong high onsets) hit both Ys' accents mirrored, hats (weak high onsets) tick the markers -
 * all gated by the section's ceiling so quiet sections stay quiet. */
export function drums(cars: Car[], an: Analysis) {
  const ys = M.sides(cars);
  for (const [t, strength] of an.bass) {
    const mood = MD.moodAt(an, t);
    if (ceilingAt(an, t) < 1 || strength < 0.25 || mood === 'calm' || (mood === 'groove' && strength < 0.5)) continue;
    for (const c of cars) if (!c.isCt) c.flash(c.fogs(), t, 0.08 + 0.06 * strength);
  }
  for (const [t, strength] of an.highs) {
    const ceiling = ceilingAt(an, t);
    const mood = MD.moodAt(an, t);
    if (ceiling < 1 || mood === 'calm') continue;
    if (mood === 'groove' && strength < 0.6) continue;     // groove: the snare only, no hats
    if (strength >= 0.5) for (const c of ys) c.flash(c.accents(), t, 0.08);
    else if (ceiling >= 2) for (const c of cars) c.flash(c.markers(), t, 0.06);
  }
}

/** Orchestral pieces: timpani and low-brass hits (low onsets) thump the headlights in lively sections;
 * cymbal and string attacks (high onsets) tick the markers at full power. */
export function percussion(cars: Car[], an: Analysis) {
  for (const [t, strength] of an.bass) {
    const mood = MD.moodAt(an, t);
    if (ceilingAt(an, t) >= 2 && strength >= 0.5 && (mood === 'drive' || mood === 'frenzy')) {
      for (const c of cars) c.flash(c.heads(), t, 0.1 + 0.08 * strength);
    }
  }
  for (const [t, strength] of an.highs) {
    if (ceilingAt(an, t) >= 3 && strength >= 0.6) for (const c of cars) c.flash(c.markers(), t, 0.06);
  }
}

/** Long low notes: the centre car's inner beams swell slowly (2 s ramp) and release, so the pedal reads
 * as weight underneath without parking the headlights on. */
export function pedal(cars: Car[], an: Analysis) {
  const ev = an.events;
  const trucks = cars.filter((c) => c.isCt);
  const anchor = trucks.length ? trucks : [cars[Math.floor(cars.length / 2)]];
  for (let i = 0; i < ev.t.length; i++) {
    if (ev.low[i] <= 45 && ev.dur[i] >= 0.8 && ceilingAt(an, ev.t[i]) <= 1) {
      const t = ev.t[i], d = Math.min(ev.dur[i], 2.5);
      for (const c of anchor) {
        c.light(c.inner(), t, t + d, C.ON_2000);
        c.light(c.inner(), t + d, t + d + 2.1, C.OFF_2000);
      }
    }
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
export function tidy(car: Car, minOn = 5, minOff = 3) {
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

export function interior(cars: Car[], an: Analysis) {
  const base: Record<number, [number[], number]> = { 0: [PURPLE, 0.3], 1: [PURPLE, 0.6], 2: [ORANGE, 0.6], 3: [ORANGE, 1.0] };
  const tiers = an.tier;
  let i = 0;
  while (i < an.nFrames) {
    let j = i;
    while (j < an.nFrames && tiers[j] === tiers[i]) j++;
    const [color, scale] = base[Math.trunc(tiers[i])];
    for (const c of cars) c.rgb(i * an.step, j * an.step, color, scale);
    i = j;
  }
  for (const bt of an.beats) {
    if (tierAt(an, bt) >= 2) for (const c of cars) c.rgb(bt, bt + 0.1, tierAt(an, bt) === 3 ? ORANGE : PURPLE, 1.0);
  }
  for (const h of an.hits) if (tierAt(an, h) >= 1) for (const c of cars) c.rgb(h, h + 0.12, WHITE);
  for (const [a, b] of runs(an.build.map((x) => x > 0))) {
    for (let k = 0; k < b - a; k += 5) {
      const p = an.build[a + k];
      const col = [0, 1, 2].map((q) => Math.trunc(PURPLE[q] + (ORANGE[q] - PURPLE[q]) * p));
      for (const c of cars) c.rgb((a + k) * an.step, (a + k + 5) * an.step, col, 0.5 + 0.5 * p);
    }
  }
}

/** The music's last strong beat: the last beat in the final 12 s whose attack is at least 60 % of the
 * strongest there (a song that grooves to the end lands its finale on its final hit, not on the last
 * accent the accent detector happened to catch). */
export function finalBeat(an: Analysis, end: number): number | null {
  const env = an.pulseEnv;
  const b = an.beats.filter((x) => x > end - 12 && x < end - 0.6);
  if (!env || !b.length) return null;
  const hop = an.pulseHop ?? 512 / 22050;
  const strength = b.map((x) => {
    const i = clip(round(x / hop), 1, env.length - 2);
    return Math.max(env[i - 1], env[i], env[i + 1]);
  });
  // a float32 array compared with a float: numpy casts the threshold to float32
  const threshold = Math.fround(0.6 * Math.max(...strength));
  const strong = b.filter((_, k) => strength[k] >= threshold);
  return strong.length ? strong[strong.length - 1] : null;
}

export function finale(cars: Car[], an: Analysis) {
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
    if (c.isCt) {
      const n = c.fr(fadeEnd) - c.fr(t);
      const env = Array.from(linspace(1.15, 0, n), (v) => clip(v, 0, 1));
      c.pixels(C.FRONT_BAR, t, env.map((v) => new Array(C.FRONT_BAR.length).fill(v)));
      c.pixels(C.REAR_BAR, t, env.map((v) => new Array(C.REAR_BAR.length).fill(v)));
    }
  }
}
