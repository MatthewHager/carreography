// Runs a listening model over a song's independent pieces (beat chunks, note windows) on the best
// backend the browser has. Times for a 7-minute song on an M1 Max in Chrome, beats + notes:
//   webgpu: one session on the GPU, 8 + 6 s the first time (model download and setup included);
//   pool:   without a GPU, a few workers each with a single-thread WASM session, taking pieces in turn,
//           28 + 6 s (ORT's own threads need cross-origin isolation, which GitHub Pages can't give);
//   wasm:   one single-thread session on this thread, 72 + 15 s: Node, one core, or no nested workers.
// Sessions are kept for the next song; a pool's workers are let go after each run, since each holds
// its own copy of the model.

import { createSession, runSession, type Ep, type ort } from './session';

export type Backend = 'webgpu' | 'pool' | 'wasm';

export interface Model {
  url: string;                    // fetched when no bytes are given
  input: string;
  outputs: readonly string[];
}

export interface Piece {
  data: Float32Array;             // handed over to a pool worker: it must own its buffer
  dims: readonly number[];
}

export type Outputs = Record<string, Float32Array>;

export interface RunOptions {
  backend?: Backend;              // default: bestBackend()
  bytes?: ArrayBuffer;            // the model file, instead of fetching model.url
  onProgress?: (fraction: number) => void;
}

type GpuNavigator = Navigator & { gpu?: { requestAdapter(): Promise<unknown> } };

export const poolSize = () =>
  Math.min(4, Math.max(1, (typeof navigator !== 'undefined' && navigator.hardwareConcurrency || 2) - 1));

let best: Promise<Backend> | undefined;

/** WebGPU when the browser gives an adapter, else a worker pool when there are cores for one. */
export function bestBackend(): Promise<Backend> {
  best ??= (async (): Promise<Backend> => {
    const gpu = typeof navigator !== 'undefined' ? (navigator as GpuNavigator).gpu : undefined;
    if (gpu && (await gpu.requestAdapter().catch(() => null))) return 'webgpu';
    return typeof Worker !== 'undefined' && poolSize() > 1 ? 'pool' : 'wasm';
  })();
  return best;
}

async function fetchModel(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Couldn't load ${url} (${res.status})`);
  return res.arrayBuffer();
}

const sessions = new Map<string, Promise<ort.InferenceSession>>();

function session(model: Model, ep: Ep, bytes?: ArrayBuffer): Promise<ort.InferenceSession> {
  const key = `${ep} ${model.url}`;
  let s = sessions.get(key);
  if (!s) {
    s = (async () => createSession(bytes ?? (await fetchModel(model.url)), ep))();
    s.catch(() => sessions.delete(key));
    sessions.set(key, s);
  }
  return s;
}

/** Outputs for every piece, in order. */
export async function runPieces(model: Model, pieces: Piece[], opts: RunOptions = {}): Promise<Outputs[]> {
  let backend = opts.backend ?? (await bestBackend());
  let done = 0;
  const tick = () => opts.onProgress?.(++done / pieces.length);
  if (backend === 'webgpu') {
    const s = await session(model, 'webgpu', opts.bytes).catch(() => null);
    if (s) return runInOrder(s, model, pieces, tick);
    // no usable GPU after all (a lost device, an unsupported op): don't try it again
    best = Promise.resolve((backend = typeof Worker !== 'undefined' && poolSize() > 1 ? 'pool' : 'wasm'));
  }
  if (backend === 'pool') {
    const out = await runPool(model, pieces, opts.bytes ?? (await fetchModel(model.url)), tick);
    if (out) return out;
    best = Promise.resolve('wasm');   // workers can't start here: one session on this thread instead
  }
  return runInOrder(await session(model, 'wasm', opts.bytes), model, pieces, tick);
}

async function runInOrder(s: ort.InferenceSession, model: Model, pieces: Piece[], tick: () => void) {
  const out: Outputs[] = [];
  for (const p of pieces) {
    out.push(await runSession(s, model.input, p.data, p.dims, model.outputs));
    tick();
  }
  return out;
}

type Reply = { ok: true; outputs?: Outputs } | { ok: false; error: string };

function ask(w: Worker, msg: unknown, transfer: Transferable[]): Promise<Outputs | undefined> {
  return new Promise((resolve, reject) => {
    w.onmessage = (e: MessageEvent<Reply>) =>
      (e.data.ok ? resolve(e.data.outputs) : reject(new Error(e.data.error)));
    w.onerror = (e) => reject(new Error(e.message || 'Model worker failed'));
    w.postMessage(msg, transfer);
  });
}

/** null when the workers couldn't be started (before any piece was handed over). */
async function runPool(model: Model, pieces: Piece[], bytes: ArrayBuffer, tick: () => void) {
  const workers: Worker[] = [];
  try {
    try {
      for (let i = Math.min(poolSize(), pieces.length); i > 0; i--) {
        workers.push(new Worker(new URL('./infer.worker.ts', import.meta.url), { type: 'module' }));
      }
      await Promise.all(workers.map((w) => {
        const copy = bytes.slice(0);
        return ask(w, { kind: 'load', bytes: copy, input: model.input, outputs: model.outputs }, [copy]);
      }));
    } catch {
      return null;
    }
    const out = new Array<Outputs>(pieces.length);
    let next = 0;
    await Promise.all(workers.map(async (w) => {
      while (next < pieces.length) {
        const i = next++, p = pieces[i];
        out[i] = (await ask(w, { kind: 'run', data: p.data, dims: p.dims }, [p.data.buffer]))!;
        tick();
      }
    }));
    return out;
  } finally {
    for (const w of workers) w.terminate();
  }
}
