// Making a show: the work runs in a worker (show.worker.ts); this side sends it the song and reports
// progress.

import { mixdown } from '@/engine/listen/resample';
import type { Reply, Request } from './show.worker';
import { fileName } from './DownloadSheet';
import { explain, outOfMemory, unsupported } from './errors';
import type { Show } from './show';
import { encodeWav, readWav } from './wav';

export type Progress = (step: string, fraction?: number) => void;

// The worker is ended after each show, unless it used WebGPU: Safari crashes the page a few seconds
// after such a worker is terminated. Then it's kept and makes the next show too, its GPU sessions ready.
let kept: Worker | undefined;

function run(req: Request, onProgress: Progress, transfer: Transferable[] = []): Promise<Extract<Reply, { kind: 'done' }>> {
  const worker = kept ?? new Worker(new URL('./show.worker.ts', import.meta.url), { type: 'module' });
  kept = undefined;
  return new Promise((resolve, reject) => {
    worker.onmessage = (e: MessageEvent<Reply>) => {
      const r = e.data;
      if (r.kind === 'progress') return onProgress(r.step, r.fraction);
      if (r.keep) kept = worker;
      else worker.terminate();
      if (r.kind === 'done') resolve(r);
      else reject(new Error(explain(r.message)));
    };
    worker.onerror = (e) => {        // it couldn't start, or died
      worker.terminate();
      reject(new Error(explain(e.message)));
    };
    worker.postMessage(req, transfer);
  });
}

/** Development: a song already analysed by the Python version (cache/bridge, served by vite.config.ts),
 * choreographed here, with its recording from output/. */
export async function showFromBridge(song: string, lineup: string, onProgress: Progress): Promise<Show> {
  const base = `${import.meta.env.BASE_URL}dev/`;
  onProgress('Loading the analysis');
  const res = await fetch(`${base}bridge/${song}/analysis.json`);
  if (!res.ok) throw new Error(`no analysis for ${song} in cache/bridge`);
  const json = await res.text();
  const done = await run({ kind: 'bridge', json, lineup }, onProgress);
  const name = song.split('@')[0];
  const audio = await fetch(`${base}output/${name}/${name}.wav`).then((r) => (r.ok ? r.blob() : undefined));
  return {
    title: name.replace(/^\d+_/, '').replace(/_/g, ' '),
    lineup,
    nFrames: done.nFrames,
    cars: done.cars.map((c, i) => ({ ...c, letter: lineup[i] })),
    audio,
  };
}

/** A song's first two channels at 44.1 kHz: a 44.1 kHz WAV as it is (readWav says why), anything else
 * as the browser decodes it. */
async function decode(file: File): Promise<{ channels: Float32Array[]; sampleRate: number }> {
  const bytes = await file.arrayBuffer();
  const pcm = readWav(bytes);
  if (pcm?.sampleRate === 44100) return pcm;
  try {
    const audio = await new OfflineAudioContext(2, 1, 44100).decodeAudioData(bytes);
    const channels = Array.from({ length: Math.min(2, audio.numberOfChannels) }, (_, i) => audio.getChannelData(i));
    return { channels, sampleRate: audio.sampleRate };
  } catch (err) {
    if (outOfMemory(String(err))) throw new Error(explain(err));
    throw new Error(`${file.name} couldn't be opened as a song. This browser reads MP3, M4A and WAV files; `
      + 'try one of those.');
  }
}

/** A song from this device: decoded at 44.1 kHz (Tesla's rate, and the one the analysis was tuned on),
 * then listened to and choreographed in the worker. */
export async function showFromFile(file: File, lineup: string, onProgress: Progress): Promise<{ show: Show; wav: Blob }> {
  const why = unsupported();
  if (why) throw new Error(why);
  onProgress('Opening the song');
  const { channels, sampleRate } = await decode(file);
  const wav = encodeWav(channels, sampleRate);
  const title = file.name.replace(/\.[^.]+$/, '');
  // mixed down here, as the worker would, so only one channel is copied over
  const mono = mixdown(channels);
  const start = performance.now();
  const done = await run({ kind: 'song', channels: [mono], sampleRate, name: fileName(title), lineup },
    onProgress, [mono.buffer]);
  console.info(`Made the show in ${((performance.now() - start) / 1000).toFixed(1)} s, listening on ${done.backend}`);
  return {
    show: { title, lineup, nFrames: done.nFrames, cars: done.cars.map((c, i) => ({ ...c, letter: lineup[i] })), audio: wav },
    wav,
  };
}
