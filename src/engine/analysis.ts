// What the listening side (listen/audio.ts) hands the choreographer: the song's beats, notes, loudness
// and form, with per-frame curves on the show's 20 ms grid.

/** Transcribed note events (a key press or a chord), one entry per onset group (texture.ts). */
export interface Events {
  t: number[];
  dur: number[];
  low: number[];        // midi
  high: number[];
  top: number[];        // melodic pitch
  amp: number[];
  kind: number[];       // 0 single note, 1 dyad, 2 chord, 3 big chord
  trill: number[];      // 1 inside a rapid two-note alternation
  arrival: number[];    // 1 on a strong chord that lands after a run or a rest
  density: number[];    // events in the surrounding second
  phrase: string[];     // the texture of the passage each event is in (texture.labelPhrases)
}

/** A stretch of the form map (form.ts). */
export interface Section {
  t0: number;
  t1: number;
  letter: string;       // sections with the same letter are the same material
  energy: number;
  ceiling: number;      // the most intense tier the section may reach (0..3)
  repeatOf: number;     // index of the first section with this letter, or -1
  index: number;
  nth: number;          // how many times the letter was heard before
  tempo: number;
  beats: number[];
}

/** A phrase: the unit a move is chosen for (phrases.ts), events [a, b). The choreographer adds its
 * mood, energy and pace (mood.ts) and the move it plays. */
export interface Phrase {
  a: number;
  b: number;
  t0: number;
  t1: number;
  gesture: string;
  density: number;      // notes per second
  up: number;           // share of rising steps in the melody
  lo: number;           // the melody's lowest and highest pitch
  hi: number;
  index: number;        // the phrase's number among those with its gesture
  mood?: string;
  move?: string;
  pace?: number;
  energy?: number;
}

/** One sung line of the lyrics, timed by line only (LRCLIB): when it starts and stops, and what it says. */
export interface LyricLine {
  t: number;
  end: number;
  text: string;
}

export interface Analysis {
  duration: number;
  nFrames: number;
  step: number;
  tempo: number;
  beats: number[];
  downbeats: number[];
  bass: number[][];      // rows: time, strength 0..1 (kick, timpani, low brass)
  highs: number[][];     // rows: time, strength 0..1 (cymbals, string attacks)
  hits: number[];        // the strongest accents, at least 0.5 s apart
  intensity: number[];   // per frame 0..1
  build: number[];       // per frame 0..1 progress through a crescendo
  tier: number[];        // per frame 0..3
  loudFast: number[];    // per frame 0..1
  events: Events;
  pitchLo: number;       // the song's melodic range, mapped across the stage
  pitchHi: number;
  beatScore: number;     // the onset curve on the beats over its mean (2 and up: a beat to follow)
  sections: Section[];
  pulseEnv: number[];    // the onset strength curve, one value per pulseHop seconds
  pulseHop: number;
  lyricLines?: LyricLine[] | null;                   // LRCLIB's lines, lined up with this recording
  // set while choreographing
  phrases?: Phrase[];
  pace?: number | null;  // the current phrase's seconds between hits, for the beat moves (mood.ts)
  energy?: Float64Array; // per frame 0..1 (mood.energyCurve)
}
