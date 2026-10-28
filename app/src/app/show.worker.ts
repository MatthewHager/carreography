// Off the page's thread: turning a song into a show (analysis, then choreography).

import { fromBridge } from '@/engine/analysis';
import { choreograph } from '@/engine/choreo';

export type Request =
  | { kind: 'bridge'; json: string; lineup: string };   // a Python analysis (development)

export type Reply =
  | { kind: 'progress'; step: string; fraction?: number }
  | { kind: 'done'; nFrames: number; cars: { name: string; frames: Uint8Array }[] }
  | { kind: 'error'; message: string };

const post = (r: Reply, transfer: Transferable[] = []) => (self as unknown as Worker).postMessage(r, transfer);

self.onmessage = (e: MessageEvent<Request>) => {
  try {
    const req = e.data;
    post({ kind: 'progress', step: 'Choreographing' });
    const { meta, an } = fromBridge(JSON.parse(req.json));
    const cars = choreograph(an, { layout: req.lineup, name: meta.name, style: meta.style, driver: meta.driver });
    post({ kind: 'done', nFrames: an.nFrames, cars: cars.map((c) => ({ name: c.name, frames: c.frames })) },
      cars.map((c) => c.frames.buffer));
  } catch (err) {
    post({ kind: 'error', message: (err as Error).message ?? String(err) });
  }
};
