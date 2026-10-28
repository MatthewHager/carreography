// Off the page's thread: turning a song into a show (listening, then choreography).

import { fromBridge, type Analysis } from '@/engine/analysis';
import { STEP_MS } from '@/engine/channels';
import { choreograph } from '@/engine/choreo';
import { analyze } from '@/engine/listen/audio';
import { trackBeats } from '@/engine/listen/beats';
import { transcribe } from '@/engine/listen/notes';
import { monoAt22050 } from '@/engine/listen/resample';

export type Request =
  | { kind: 'song'; channels: Float32Array[]; sampleRate: number; name: string; lineup: string }
  | { kind: 'bridge'; json: string; lineup: string };   // a Python analysis (development)

export type Reply =
  | { kind: 'progress'; step: string; fraction?: number }
  | { kind: 'done'; nFrames: number; cars: { name: string; frames: Uint8Array }[] }
  | { kind: 'error'; message: string };

const post = (r: Reply, transfer: Transferable[] = []) => (self as unknown as Worker).postMessage(r, transfer);
const progress = (step: string, fraction?: number) => post({ kind: 'progress', step, fraction });

async function listen(req: Extract<Request, { kind: 'song' }>): Promise<Analysis> {
  progress('Listening');
  const y = monoAt22050(req.channels, req.sampleRate);
  progress('Finding the beat', 0);
  const beats = await trackBeats(y, { onProgress: (f) => progress('Finding the beat', f) });
  progress('Hearing the notes', 0);
  const notes = await transcribe(y, { onProgress: (f) => progress('Hearing the notes', f) });
  progress('Reading the music');
  return analyze(y, { stepMs: STEP_MS, notes, neuralBeats: beats });
}

self.onmessage = async (e: MessageEvent<Request>) => {
  try {
    const req = e.data;
    let an: Analysis, name: string | null, style: string | null = null, driver: string | null = null;
    if (req.kind === 'song') {
      an = await listen(req);
      name = req.name;
    } else {
      const b = fromBridge(JSON.parse(req.json));
      [an, name, style, driver] = [b.an, b.meta.name, b.meta.style, b.meta.driver];
    }
    progress('Choreographing');
    const cars = choreograph(an, { layout: req.lineup, name, style, driver });
    post({ kind: 'done', nFrames: an.nFrames, cars: cars.map((c) => ({ name: c.name, frames: c.frames })) },
      cars.map((c) => c.frames.buffer));
  } catch (err) {
    post({ kind: 'error', message: (err as Error).message ?? String(err) });
  }
};
