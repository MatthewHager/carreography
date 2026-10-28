// Making a show: the work runs in a worker (show.worker.ts); this side sends it the song and reports
// progress.

import { vocalCurve } from '@/engine/listen/align';
import { mixdown } from '@/engine/listen/resample';
import { readTags } from '@/engine/listen/tags';
import type { Reply, Request } from './show.worker';
import { explain, outOfMemory, unsupported } from './errors';
import { fileName, type Show } from './show';
import { encodeWav, readWav } from './wav';

export type Progress = (step: string, fraction?: number) => void;

/** The song files every current browser can open (with the file picker's extensions). */
export const SONG_TYPES = 'MP3, M4A, WAV or FLAC';
export const SONG_EXTENSIONS = ['.mp3', '.m4a', '.wav', '.flac'];

// The worker is ended after each show, unless it used WebGPU: Safari crashes the page a few seconds
// after such a worker is terminated. Then it's kept and makes the next show too, its GPU sessions ready.
let kept: Worker | undefined;

function run(req: Request, onProgress: Progress, transfer: Transferable[]): Promise<Extract<Reply, { kind: 'done' }>> {
  const reused = kept;
  const worker = reused ?? new Worker(new URL('./show.worker.ts', import.meta.url), { type: 'module' });
  kept = undefined;
  let keep = reused !== undefined;
  const end = () => {
    if (keep) kept = worker;
    else worker.terminate();
  };
  return new Promise((resolve, reject) => {
    worker.onmessage = (e: MessageEvent<Reply>) => {
      const r = e.data;
      keep = r.keep;
      if (r.kind === 'progress') return onProgress(r.step, r.fraction);
      end();
      if (r.kind === 'done') resolve(r);
      else reject(new Error(explain(r.message)));
    };
    worker.onerror = (e) => {        // it couldn't start, or failed outside the show's own error handling
      end();
      reject(new Error(explain(e.message)));
    };
    worker.postMessage(req, transfer);
  });
}

/** A song's first two channels at 44.1 kHz: a 44.1 kHz WAV as it is (readWav says why), anything else
 * as the browser decodes it. */
async function decode(file: File, bytes: ArrayBuffer): Promise<{ channels: Float32Array[]; sampleRate: number }> {
  const pcm = readWav(bytes);
  if (pcm?.sampleRate === 44100) return pcm;
  try {
    const audio = await new OfflineAudioContext(2, 1, 44100).decodeAudioData(bytes);
    const channels = Array.from({ length: Math.min(2, audio.numberOfChannels) }, (_, i) => audio.getChannelData(i));
    return { channels, sampleRate: audio.sampleRate };
  } catch (err) {
    if (outOfMemory(String(err))) throw new Error(explain(err));
    throw new Error(`${file.name} couldn't be opened as a song. Try it as an ${SONG_TYPES} file.`);
  }
}

/** A song from this device: decoded at 44.1 kHz (Tesla's rate, and the one the analysis was tuned on),
 * then listened to and choreographed in the worker. */
export async function showFromFile(file: File, lineup: string, onProgress: Progress): Promise<Show> {
  const why = unsupported();
  if (why) throw new Error(why);
  onProgress('Opening the song');
  const bytes = await file.arrayBuffer();
  const tags = readTags(new Uint8Array(bytes), file.name);     // before decoding, which may take the buffer
  const { channels, sampleRate } = await decode(file, bytes);
  const audio = encodeWav(channels, sampleRate);
  const title = file.name.replace(/\.[^.]+$/, '');
  // mixed down here, as the worker would, so only one channel is copied over; the lyrics only need where
  // the voice is in the stereo mix
  const mono = mixdown(channels);
  const vocals = channels.length > 1 ? vocalCurve(channels[0], channels[1], sampleRate) : null;
  const start = performance.now();
  const done = await run({ channels: [mono], sampleRate, name: fileName(title), lineup, tags, vocals },
    onProgress, [mono.buffer]);
  // The one place the listening backend shows: for bug reports, and the README's table of browsers.
  console.info(`Made the show in ${((performance.now() - start) / 1000).toFixed(1)} s, listening on ${done.backend}`);
  return {
    title, lineup, nFrames: done.nFrames, cars: done.cars.map((c, i) => ({ ...c, letter: lineup[i] })), audio,
    lyrics: { ...done.lyrics, tags },
  };
}
