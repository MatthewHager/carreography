// What the listening side (listen/audio.ts) hands the choreographer: the song's beats, notes, loudness
// and form, with per-frame curves on the show's 20 ms grid. fromBridge reads the same thing from the
// analyses the Python version exported for bridge.test.ts.

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

/** The energy in four bands, per frame 0..1: a level meter's, rising at once and falling over about 0.1 s. */
export interface Bands {
  low: Float32Array;      // below 150 Hz: kick and bass, the thump
  lowMid: Float32Array;   // 150-600 Hz: the body of chords, voices and drums
  highMid: Float32Array;  // 600 Hz-4 kHz: the voice, leads, the snare's crack
  high: Float32Array;     // above 4 kHz: cymbals, hats, breath and sparkle
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
  // What a music visualizer shows (listen/visual.ts). Curves have one value per frame (nFrames), 0..1 over
  // the song, except kit and beatConfidence, which mean the same in every song (a song without drums stays
  // low); hit lists are rows of time, strength 0..1, in time order.
  bands: Bands;
  kick: number[][];             // kick hits: the low end jumping (a bass drum, timpani, a bass note's attack)
  snare: number[][];            // snare hits: a body and noise up to 7 kHz at once (snare, claps, a crash)
  hats: number[][];             // hi-hat and cymbal ticks: noise above 8 kHz
  brightness: Float32Array;     // dull to bright (the spectral centroid): a colour temperature
  chroma: Float32Array;         // nFrames x 12, frame-major from C: each pitch class's share, the loudest 1
  pitchClass: Uint8Array;       // the harmony's strongest pitch class over each beat (0 C .. 11 B): a colour
                                // that changes on the beat
  pitchClassStrength: Float32Array;   // how clearly it leads (0 in noise, drums or silence)
  novelty: Float32Array;        // how much the sound changes from the second before to the second after
  noveltyPeaks: number[][];     // the moments it changes most (an entry, a drop, a new texture), 1 s apart
  kit: Float32Array;            // how much a drum kit is playing: the drum-kit layer vs. gentle percussion
  beatConfidence: Float32Array; // how clearly the beats land on accents: beat lights vs. flowing (0: no beat)
  lyricLines?: LyricLine[] | null;                   // LRCLIB's lines, lined up with this recording
  lyricWords?: [number, number, string][] | null;    // only in the frozen Python analyses (see lyrics.ts)
  // set while choreographing
  phrases?: Phrase[];
  cuePeaks?: [number, number, number | null, boolean][];   // the cue sheet's peaks: time, build, hold, final
  driver?: string;
  pace?: number | null;  // the current phrase's seconds between hits, for the beat moves (mood.ts)
  energy?: Float64Array; // per frame 0..1 (mood.energyCurve)
}

interface BridgeMeta {
  name: string;
  lineup: string;
  style: string | null;
  driver: string;
  cars: string[];
}

type Json = Record<string, unknown>;

const camel = (s: string) => s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

function camelKeys<T>(o: Json): T {
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [camel(k), v])) as T;
}

/** An analysis.json from cache/bridge (written by the Python version, tag python-final): its fields are
 * the Analysis's in snake_case, with the song's name, lineup, style and driver alongside. */
export function fromBridge(json: { meta: BridgeMeta; analysis: Json }): { meta: BridgeMeta; an: Analysis } {
  const a = camelKeys<Analysis & Json>(json.analysis);
  a.events = camelKeys<Events>(json.analysis.events as Json);
  a.sections = ((json.analysis.sections as Json[]) ?? []).map((s) => camelKeys<Section>(s));
  return { meta: json.meta, an: a };
}
