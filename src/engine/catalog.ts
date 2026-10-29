// The move catalogue: what every move looks like, and when the choreographer may choose it.
//
// Each entry:
//   what      one line: what the audience sees across the cars
//   fits      the phrase shapes it suits (phrases.ts): motif, run, figuration, trill, chords, cadence,
//             recitative
//   grid      what it locks to:
//               note   the transcribed notes
//               beat   the tracked beats (every 2nd or 4th when calm)
//               bar    the tracked downbeats, a whole bar at a time
//               self   its own timing (a cadence's chords, the Toccata's motif, a trill)
//
// Every move lights the whole lineup and grows with the level (level.ts): at a hush a single lamp a hit,
// from drive up whole halves of cars with their headlights, but for those the beat plays (pulse.ts).
// Written for the classic lineup, Model Y | Cybertruck | Model Y: "the truck" is the Cybertruck nearest the
// middle, "the Ys" every other car.

export interface Move {
  readonly what: string;
  readonly fits: readonly string[];
  readonly grid: 'note' | 'beat' | 'bar' | 'self';
}

const mv = (what: string, fits: readonly string[], grid: Move['grid']): Move => ({ what, fits, grid });

const MELODY = ['figuration', 'run', 'recitative'];

export const MOVES: Record<string, Move> = {
  keyboard: mv("notes play across the stage like a keyboard, low on the crowd's left and high on the right; "
    + "on the truck a comet at the note's pitch", MELODY, 'note'),
  relay: mv('one light runs the stage note by note, through every lamp and along the bar, turning when the '
    + 'melody turns', MELODY, 'note'),
  mirror: mv('pitch is the distance from the middle: low notes light the centre, high notes both ends, so a '
    + 'rising line opens out and a falling one closes in', MELODY, 'note'),
  lr_notes: mv('notes alternate between the left and right halves of the stage', ['figuration', 'trill'], 'note'),
  antiphony: mv('call and response: bar by bar the melody passes between the left and the right half of the stage',
    MELODY, 'note'),
  block: mv('chords as blocks of light from their lowest note to their highest, held with the chord; a big '
    + 'chord fills the stage', ['chords'], 'note'),
  shimmer: mv('a trill flickers between the two halves of a car, and across every car when loud', ['trill'],
    'self'),
  motif: mv('the signature motif: an ornament on the middle car, a sweep across, a hold where it lands',
    ['motif'], 'self'),
  cadence: mv('a big closing chord: a breath of black, then the whole stage', ['cadence'], 'self'),
  march: mv('one light marches car to car on the beat, left, centre, right, centre', ['figuration', 'recitative'],
    'beat'),
  lr_channel: mv('left channel, right channel: the whole left half of the stage on one beat, the right on the '
    + 'next', ['figuration', 'recitative'], 'beat'),
  checker: mv('a checkerboard across the slots and the bar, flipping every beat', ['figuration', 'recitative'],
    'beat'),
  tug_of_war: mv('the light fills the stage slot by slot on the beat, crowd-left to right, then drains back',
    ['figuration', 'recitative'], 'beat'),
  converge: mv('every beat the light runs in from both ends and meets in the middle', ['figuration', 'recitative'],
    'beat'),
  beam: mv('a searchlight two slots wide sweeps the stage over each bar, and back the next', ['figuration',
    'recitative'], 'bar'),
  shockwave: mv('on each downbeat a ring of light leaves the middle and runs out to both ends',
    ['figuration', 'recitative', 'chords'], 'bar'),
};

/** A passage plays one move: one that follows the melody, or one that follows the beat. */
export const NOTE_MOVES = ['keyboard', 'mirror', 'antiphony', 'relay', 'lr_notes'];
export const BEAT_MOVES = ['march', 'lr_channel', 'checker', 'beam', 'converge', 'tug_of_war', 'shockwave'];

/** The move a phrase's shape asks for whatever its passage plays. */
export const FOR_GESTURE: Record<string, string> = { chords: 'block', cadence: 'cadence', trill: 'shimmer',
  motif: 'motif' };

/** MOVES.md at the repository root: the catalogue as a table to read (catalog.test.ts keeps it current). */
export function markdown(): string {
  const rows = [
    '<!-- Written from the move catalogue (catalog.ts); UPDATE_MOVES=1 npx vitest run catalog rewrites it. -->',
    '# Move catalogue',
    '',
    'What each move looks like, the phrase shapes it suits, and what it locks to. Every move lights the whole '
      + 'lineup and grows with the music (see docs/HOW_IT_WORKS.md). Written for the classic Model Y | '
      + 'Cybertruck | Model Y lineup: in any lineup "the truck" is the centre Cybertruck and "the Ys" are the '
      + 'other cars.',
    '',
    '| move | what you see | fits | locks to |',
    '|---|---|---|---|',
  ];
  for (const [name, m] of Object.entries(MOVES)) {
    rows.push(`| ${name} | ${m.what} | ${m.fits.join(', ')} | ${m.grid} |`);
  }
  return rows.join('\n') + '\n';
}
