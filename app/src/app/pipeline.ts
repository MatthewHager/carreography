// Making a show: the work runs in a worker (show.worker.ts); this side sends it the song and reports
// progress.

import type { Reply, Request } from './show.worker';
import { fileName } from './DownloadSheet';
import type { Show } from './show';
import { encodeWav } from './wav';

export type Progress = (step: string, fraction?: number) => void;

function run(req: Request, onProgress: Progress, transfer: Transferable[] = []): Promise<Extract<Reply, { kind: 'done' }>> {
  const worker = new Worker(new URL('./show.worker.ts', import.meta.url), { type: 'module' });
  return new Promise((resolve, reject) => {
    worker.onmessage = (e: MessageEvent<Reply>) => {
      const r = e.data;
      if (r.kind === 'progress') onProgress(r.step, r.fraction);
      else {
        worker.terminate();
        if (r.kind === 'done') resolve(r);
        else reject(new Error(r.message));
      }
    };
    worker.onerror = (e) => {
      worker.terminate();
      reject(new Error(e.message));
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

/** A song from this device: decoded at 44.1 kHz (Tesla's rate, and the one the analysis was tuned on),
 * then listened to and choreographed in the worker. */
export async function showFromFile(file: File, lineup: string, onProgress: Progress): Promise<{ show: Show; wav: Blob }> {
  onProgress('Opening the song');
  const ctx = new OfflineAudioContext(2, 1, 44100);
  let audio: AudioBuffer;
  try {
    audio = await ctx.decodeAudioData(await file.arrayBuffer());
  } catch {
    throw new Error(`${file.name} couldn't be read as audio`);
  }
  const channels = Array.from({ length: Math.min(2, audio.numberOfChannels) }, (_, i) => audio.getChannelData(i));
  const wav = encodeWav(channels, audio.sampleRate);
  const title = file.name.replace(/\.[^.]+$/, '');
  const copies = channels.map((c) => c.slice());
  const done = await run({ kind: 'song', channels: copies, sampleRate: audio.sampleRate, name: fileName(title), lineup },
    onProgress, copies.map((c) => c.buffer));
  return {
    show: { title, lineup, nFrames: done.nFrames, cars: done.cars.map((c, i) => ({ ...c, letter: lineup[i] })), audio: wav },
    wav,
  };
}
