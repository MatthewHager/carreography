// What the listening side hands the choreographer: the song's beats, notes, loudness and form on the
// show's 20 ms frame grid. The fields follow the Python Analysis (lightshow/audio.py) one for one, so
// a song exported by tools/export_bridge.py loads straight in.

/** Transcribed note events (a key press or a chord), one entry per onset group (texture.ts). */
export interface Events {
  t: number[];
  dur: number[];
  low: number[];        // midi
  high: number[];
  top: number[];        // melodic pitch
  amp: number[];
  kind: number[];       // 0 single note, 1 dyad, 2 chord, 3 big chord
  trill: number[];
  arrival: number[];
  density: number[];
  phrase: string[];     // texture label per event (texture.PHRASES)
}

/** A stretch of the form map (form.ts). */
export interface Section {
  t0: number;
  t1: number;
  letter: string;
  energy: number;
  ceiling: number;
  repeatOf: number;
  index: number;
  nth: number;
  tempo: number;
  beats: number[];
}

/** A phrase: the unit a move is chosen for (phrases.ts). The choreographer adds mood, move, pace... */
export interface Phrase {
  a: number;
  b: number;
  t0: number;
  t1: number;
  gesture: string;
  density: number;
  up: number;
  lo: number;
  hi: number;
  index: number;
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
  bass: number[][];      // rows: time, strength
  highs: number[][];
  hits: number[];
  intensity: number[];   // per frame 0..1
  build: number[];       // per frame 0..1 progress through a crescendo
  tier: number[];        // per frame 0..3
  loudFast: number[];    // per frame 0..1
  events: Events;
  pitchLo: number;
  pitchHi: number;
  beatScore: number;
  sections: Section[];
  pulseEnv: number[];
  pulseHop: number;
  lyricWords: [number, number, string][] | null;     // Whisper's words (the Python analyses only)
  lyricLines?: LyricLine[] | null;                   // LRCLIB's lines, lined up with this recording
  // set while choreographing
  phrases?: Phrase[];
  cuePeaks?: [number, number, number | null, boolean][];
  driver?: string;
  pace?: number | null;
  energy?: Float64Array;
}

export interface BridgeMeta {
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

/** An analysis.json written by tools/export_bridge.py. */
export function fromBridge(json: { meta: BridgeMeta; analysis: Json }): { meta: BridgeMeta; an: Analysis } {
  const a = camelKeys<Analysis & Json>(json.analysis);
  a.events = camelKeys<Events>(json.analysis.events as Json);
  a.sections = ((json.analysis.sections as Json[]) ?? []).map((s) => camelKeys<Section>(s));
  return { meta: json.meta, an: a };
}
