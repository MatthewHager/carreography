// The move catalogue: what every move looks like, and when the choreographer may choose it.
//
// Each entry:
//   what      one line - what the audience sees across the cars
//   moods     the moods it suits (see mood.ts): calm, groove, drive, frenzy
//   gestures  the phrase shapes it fits (see phrases.ts): motif, run, figuration, trill, chords,
//             cadence, recitative
//   grid      what it locks to:
//               note   the transcribed notes (thinned to the mood's pace in calm/groove passages)
//               beat   the tracked beats (thinned to every 2nd/4th beat when calm)
//               bar    the tracked downbeats, spanning whole bars
//               build  shapes a whole crescendo by itself (chosen by the build detector, not here)
//               self   paces itself (cadence hits, the Toccata motif, trills)
//   collab    the cars pass something between them (counts toward the whole-lineup quota)
//
// Split formations (the side cars in one move, the centre truck in another) are listed as "y_move | ct_move".
//
// The descriptions are written for the classic lineup, Model Y | Cybertruck | Model Y. In any lineup,
// "the truck" is the centrepiece - the Cybertruck nearest the middle, whose 60-LED bar plays comets and
// sweeps - and "the Ys" are the side cars, every other car (moves.centreTruck and moves.sides). With no
// Cybertruck, every car is a side car and the bar parts of a move fall back to whole-stage versions.

export interface Move {
  readonly what: string;
  readonly moods: readonly string[];
  readonly gestures: readonly string[];
  readonly grid: string;
  readonly collab: boolean;
}

/** A formation is ['unison', move] or ['split', y_move, ct_move]. Arrays compare by reference in JS: use formationKey. */
export type Formation = string[];

export function formationKey(f: readonly string[]): string {
  return f.join('|');
}

function mv(what: string, moods: readonly string[], gestures: readonly string[], grid: string,
  collab = true): Move {
  return { what, moods, gestures, grid, collab };
}

const ALL = ['calm', 'groove', 'drive', 'frenzy'];
const LIVELY = ['groove', 'drive', 'frenzy'];
const FIG = ['figuration'];

// Note-following moves first, then beat-locked, bar-locked and the builds (candidates() keeps this order).
export const UNISON: Record<string, Move> = {
  keyboard: mv("notes play across the stage like a keyboard, low on the crowd's left, high on the right",
    ALL, ["run", "figuration"], "note"),
  relay: mv("one light runs the stage note by note - left Y, along the bar, right Y - with a short trail",
    ["calm", "groove", "drive"], ["run", "figuration"], "note"),
  lr_notes: mv("each note jumps between the left and right halves of the stage",
    LIVELY, ["figuration", "trill"], "note"),
  rotation: mv("notes rotate round the six stage slots, a spinning wheel of light",
    ["drive", "frenzy"], FIG, "note"),
  mirror: mv("each note lights a matching pair of slots mirrored about the truck",
    ["calm", "groove", "drive"], FIG, "note"),
  call_response: mv("the Ys play a figure, the truck answers it",
    ["groove", "drive"], FIG, "note"),
  antiphony: mv("two choirs: left Y and truck against right Y and truck, phrase halves alternating",
    ["groove", "drive"], FIG, "note"),
  pulse: mv("slow notes glow where they sit in pitch, with a soft comet on the bar",
    ["calm", "groove"], ["recitative"], "note", false),
  block: mv("chords as solid blocks of light, held as long as the chord",
    ALL, ["chords", "recitative"], "note"),
  rain: mv("notes fall as drops of light at random across the stage",
    LIVELY, ["trill", "figuration"], "note"),
  motif: mv("the signature motif: ticks on the truck, a sweep across, a hold where it lands",
    ALL, ["motif"], "self"),
  shimmer: mv("trills shimmer between neighbouring lamps",
    ["drive", "frenzy"], ["trill"], "self", false),
  cadence: mv("a big closing hit with a breath of black before it",
    ALL, ["cadence"], "self"),
  meter: mv("a loudness meter: the Ys and the bar fill with the level",
    ["calm", "groove"], ["chords", "figuration"], "self", false),
  wave: mv("a wave rolls across the cars on the beat and back",
    LIVELY, FIG, "beat"),
  converge: mv("both outer cars fire toward the truck on the beat and it answers",
    ["drive", "frenzy"], FIG, "beat"),
  lr_beat: mv("left half, right half, on the beat",
    ["groove", "drive"], ["figuration", "recitative"], "beat"),
  pinball: mv("a hit ricochets car to car on off-beats",
    ["drive", "frenzy"], FIG, "beat"),
  syncopate: mv("hits on the off-beats, cars taking turns",
    ["drive", "frenzy"], FIG, "beat"),
  march: mv("one light marches car to car, left-centre-right-centre; half time when calm",
    ["calm", "groove", "drive"], ["figuration", "recitative"], "beat"),
  tug_of_war: mv("the light is pulled toward one end and yanked back, beat by beat",
    ["drive", "frenzy"], FIG, "beat"),
  checker: mv("a checkerboard across the six slots and the bar flips every beat",
    LIVELY, FIG, "beat"),
  lr_channel: mv("whole left half of the stage on one beat, whole right half on the next",
    ["groove", "drive"], ["figuration", "recitative"], "beat"),
  heartbeat: mv("lub-dub double pulses from the truck outward",
    ["calm", "groove"], ["recitative"], "beat"),
  marquee: mv("theatre chase: every third lamp along all the cars lit, stepping along on each hit",
    ["groove", "drive"], ["figuration", "recitative"], "beat"),
  scanner: mv("an eye sweeps the truck's bar end to end and the Ys bounce it back with a headlight",
    ["groove", "drive"], FIG, "beat"),
  sparkle: mv("single lamps twinkle at random across the stage, soft and sparse when calm, sharp in a frenzy",
    ["calm", "groove", "frenzy"], ["trill", "figuration", "recitative"], "beat"),
  ping_pong: mv("the two Ys trade hits half a beat apart, the lead swapping each bar; the truck answers downbeats",
    ["groove", "drive"], FIG, "beat"),
  metronome: mv("the stage glows softly while one car at a time takes a slow solo pulse, left-centre-right",
    ["calm", "groove"], ["recitative", "figuration", "chords"], "beat"),
  stripes: mv("four stripes scroll along the truck's bar and reverse every two beats; the Ys answer inner then outer",
    ["groove", "drive"], FIG, "beat"),
  flutter: mv("the whole stage shivers on sixteenths, outer pair against the truck, a beat on and a beat off",
    ["frenzy"], ["trill", "figuration"], "beat"),
  cascade: mv("a fast ripple across the lineup on each downbeat, back on the next",
    ["groove", "drive"], FIG, "bar"),
  beam: mv("a searchlight two slots wide sweeps the stage once a bar",
    ["calm", "groove", "drive"], FIG, "bar"),
  expand_contract: mv("the lit region breathes out from the truck to the corners and back, a bar each way",
    ["groove", "drive"], ["chords", "recitative"], "bar"),
  fade_cross: mv("a slow crossfade from one side of the stage to the other every two bars",
    ["calm", "groove"], ["chords"], "bar"),
  curtain: mv("the stage unveils left to right over a bar, holds with headlight punches, closes right to left",
    ["groove", "drive"], ["chords", "recitative", "figuration"], "bar"),
  breathe_wash: mv("a colour-wash breath: each car glows up and fades, a beat apart, rolling across the stage",
    ["calm"], ["chords", "recitative", "figuration"], "bar"),
  sunrise: mv("dawn from the truck outward on 2 s ramps, a hold, then sunset from the outside in",
    ["calm"], ["chords", "recitative"], "bar"),
  crossing: mv("two lights start at opposite ends, cross at the truck with a flare, and run out the far sides",
    ["drive", "frenzy"], ["figuration", "run"], "bar"),
  shockwave: mv("a ring leaves the truck's bar and travels out through the Ys to the fogs",
    ["drive", "frenzy"], ["chords", "figuration"], "bar"),
  out_in: mv("corners to centre: lights grow inward, the bar fills, a beat of black, the truck pops",
    LIVELY, FIG, "build"),
  fill_stage: mv("the stage fills slot by slot with the climb and holds full",
    LIVELY, FIG, "build"),
  bounce_build: mv("a hit bounces between the outer cars faster and faster into the peak",
    LIVELY, FIG, "build"),
  implode: mv("build into the middle, the truck pops, then a slow two-second fade",
    LIVELY, FIG, "build"),
  accelerando: mv("a strobe roll that subdivides (2 beats, 1, eighths, sixteenths) as lamp layers stack, half a beat of black, then everything lands",
    LIVELY, FIG, "build"),
};

export const SPLIT: [string, string, Move][] = [
  ["y_keyboard", "ct_comets", mv("the Ys play the notes as a keyboard while comets glide on the bar",
    ["calm", "groove"], FIG, "note", false)],
  ["y_ripple_in", "ct_comets", mv("ripples run inward on the Ys toward comets on the truck",
    ["groove", "drive"], FIG, "beat", false)],
  ["y_keyboard", "ct_scan", mv("the Ys play the notes, the bar scans",
    ["groove", "drive"], FIG, "note", false)],
  ["y_turn_ticks", "ct_comets", mv("turn signals tick the rhythm, fogs thump the bass, comets on the bar",
    ["groove", "drive"], FIG, "beat", false)],
  ["y_ripple_out", "ct_edge_pulse", mv("ripples run outward from the truck, whose bar pulses at its edges",
    ["drive", "frenzy"], FIG, "beat", false)],
  ["y_bass_fogs", "ct_comets", mv("fogs on the bass notes, keyboard above, comets on the bar",
    ["groove", "drive"], FIG, "note", false)],
  ["y_wink", "ct_comets", mv("the Ys wink one eye at a time while comets glide",
    ["calm", "groove"], FIG, "note", false)],
  ["y_chords", "bar_collide", mv("the Ys hold the chords while two comets collide on the bar",
    ["groove", "drive"], ["chords"], "note", false)],
  ["y_chords", "ct_meter", mv("the Ys hold the chords, the bar meters the level",
    ["calm", "groove", "drive"], ["chords"], "note", false)],
  ["y_breathe", "ct_swell", mv("the Ys breathe slowly, the bar swells",
    ["calm"], ["chords", "recitative"], "note", false)],
  ["y_breathe", "ct_comets", mv("the Ys breathe, comets glide on the bar",
    ["calm"], ["recitative"], "note", false)],
  ["y_keyboard", "ct_swell", mv("the Ys play the notes over a swelling bar",
    ["calm"], ["recitative"], "note", false)],
];


const SPLIT_MAP = new Map<string, Move>(SPLIT.map(([y, c, m]) => [formationKey([y, c]), m]));

/** Catalogue entry for ("unison", move) or ("split", y, ct), or null. */
export function info(formation: readonly string[]): Move | null {
  if (formation[0] === 'unison') return Object.hasOwn(UNISON, formation[1]) ? UNISON[formation[1]] : null;
  return SPLIT_MAP.get(formationKey([formation[1], formation[2]])) ?? null;
}

export function fits(formation: readonly string[], mood: string): boolean {
  const i = info(formation);
  return i === null || i.moods.includes(mood);
}

/** Every catalogued formation (not builds or self-paced moves) that suits this gesture and mood. */
export function candidates(gesture: string, mood: string): string[][] {
  const out: string[][] = [];
  for (const [m, i] of Object.entries(UNISON)) {
    if (i.moods.includes(mood) && i.gestures.includes(gesture) && !['build', 'self'].includes(i.grid)) {
      out.push(['unison', m]);
    }
  }
  for (const [y, c, i] of SPLIT) {
    if (i.moods.includes(mood) && i.gestures.includes(gesture)) out.push(['split', y, c]);
  }
  return out;
}

/** The catalogue as a readable table (the Python also writes it to MOVES.md; that part isn't ported). */
export function markdown(): string {
  const rows = ['| move | what you see | moods | fits | locks to |', '|---|---|---|---|---|'];
  for (const [name, i] of Object.entries(UNISON)) {
    rows.push(`| ${name} | ${i.what} | ${i.moods.join(', ')} | ${i.gestures.join(', ')} | ${i.grid} |`);
  }
  for (const [y, c, i] of SPLIT) {
    rows.push(`| ${y} \\| ${c} | ${i.what} | ${i.moods.join(', ')} | ${i.gestures.join(', ')} | ${i.grid} |`);
  }
  return rows.join('\n') + '\n';
}
