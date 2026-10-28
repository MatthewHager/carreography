// Off the page's thread: turning a song into a show (listening, then choreography).

import type { Analysis } from '@/engine/analysis';
import { STEP_MS } from '@/engine/channels';
import { choreograph } from '@/engine/choreo';
import { place, type LyricsReport } from '@/engine/listen/align';
import { analyze } from '@/engine/listen/audio';
import { trackBeats } from '@/engine/listen/beats';
import { lookup, type Candidate, type LookupStatus } from '@/engine/listen/lrclib';
import { lastBackend } from '@/engine/listen/infer';
import { transcribe } from '@/engine/listen/notes';
import { monoAt22050 } from '@/engine/listen/resample';
import type { SongTags } from '@/engine/listen/tags';

export interface Request {
  channels: Float32Array[];
  sampleRate: number;
  name: string;
  lineup: string;
  tags: SongTags | null;
  vocals: Float64Array | null;     // align.ts's vocalCurve, from the stereo the page had
}

export type Reply =
  | { kind: 'progress'; step: string; fraction?: number }
  | { kind: 'done'; nFrames: number; cars: { name: string; frames: Uint8Array }[]; lyrics: LyricsReport; backend?: string }
  | { kind: 'error'; message: string };

const post = (r: Reply, transfer: Transferable[] = []) => (self as unknown as Worker).postMessage(r, transfer);
const progress = (step: string, fraction?: number) => post({ kind: 'progress', step, fraction });

const LYRICS_GRACE_MS = 15_000;     // how long the show waits for LRCLIB once the listening is done

async function listen(req: Request): Promise<Analysis> {
  progress('Listening');
  const y = monoAt22050(req.channels, req.sampleRate);
  progress('Finding the beat', 0);
  const beats = await trackBeats(y, { onProgress: (f) => progress('Finding the beat', f) });
  progress('Hearing the notes', 0);
  const notes = await transcribe(y, { onProgress: (f) => progress('Hearing the notes', f) });
  progress('Reading the music');
  return analyze(y, { stepMs: STEP_MS, notes, neuralBeats: beats });
}

type Found = { status: LookupStatus; candidates: Candidate[] } | 'failed';

/** The lyrics, placed in the recording. Never throws: a song without them plays without lyric effects. */
async function lyrics(req: Request, found: Promise<Found>, an: Analysis)
  : Promise<{ lines: Analysis['lyricLines']; report: LyricsReport }> {
  const none = (status: LyricsReport['status']) => ({ lines: null, report: { status, lines: 0, offset: null, by: null } });
  try {
    const late = new Promise<'failed'>((r) => setTimeout(() => r('failed'), LYRICS_GRACE_MS));
    const f = await Promise.race([found, late]);
    if (f === 'failed') return none('failed');
    if (f.status !== 'found') return none(f.status);
    return place(f.candidates, req.vocals, an.duration);
  } catch {
    return none('failed');
  }
}

self.onmessage = async (e: MessageEvent<Request>) => {
  try {
    const req = e.data;
    // asked for at once, so LRCLIB answers while the song is listened to
    const duration = req.channels[0].length / req.sampleRate;
    const found: Promise<Found> = req.tags
      ? lookup(req.tags, duration).catch(() => 'failed' as const)
      : Promise.resolve({ status: 'none', candidates: [] });
    const an = await listen(req);
    progress('Reading the lyrics');
    const placed = await lyrics(req, found, an);
    an.lyricLines = placed.lines;
    progress('Choreographing');
    const cars = choreograph(an, { layout: req.lineup, name: req.name });
    post({
      kind: 'done', nFrames: an.nFrames, cars: cars.map((c) => ({ name: c.name, frames: c.frames })),
      lyrics: placed.report, backend: lastBackend(),
    }, cars.map((c) => c.frames.buffer));
  } catch (err) {
    post({ kind: 'error', message: String(err) });
  }
};
