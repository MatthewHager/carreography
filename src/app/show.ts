// A finished show: one frame array per car, plus the song it plays to.

import { N_CHANNELS, STEP_MS } from '@/engine/channels';
import type { SchemeId } from '@/engine/schemes';
import { VEHICLES } from '@/engine/vehicles';
import type { AppModelId } from '@/viewer/car/appBody';
import { stringHeader, writeFseq } from '@/viewer/core/fseq';

export interface ShowCar {
  name: string;          // Car2_Cybertruck_Center: the folder its USB drive needs
  letter: string;        // lineup letter (engine/vehicles.ts)
  frames: Uint8Array;    // nFrames x 200 channels, frame-major
}

export interface Show {
  title: string;
  lineup: string;
  scheme: SchemeId;
  nFrames: number;
  cars: ShowCar[];
  audio: Blob;           // the song as a 44.1 kHz WAV: what plays in the preview and goes on the drives
}

export const STEP_S = STEP_MS / 1000;
export const CHANNELS = N_CHANNELS;

/** The Tesla app model the 3D view draws a lineup letter with. */
export function modelFor(letter: string): AppModelId {
  return VEHICLES[letter].body as AppModelId;
}

/** A file name Tesla's USB reader is happy with. */
export const fileName = (title: string) =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'lightshow';

/** One car's show file, naming the song it plays to (`name`.wav next to it). Its id is a hash of the
 * frames: the same show gives the same file. */
export function showFile(frames: Uint8Array, nFrames: number, name: string): Uint8Array<ArrayBuffer> {
  let id = 0xcbf29ce484222325n;                       // FNV-1a
  for (let i = 0; i < frames.length; i += 64) id = ((id ^ BigInt(frames[i])) * 0x100000001b3n) & 0xffffffffffffffffn;
  return writeFseq({
    channelCount: CHANNELS, frameCount: nFrames, stepTimeMs: STEP_MS, minorVersion: 0, uniqueId: id,
    variableHeaders: [stringHeader('mf', `${name}.wav`), stringHeader('sp', 'Carreography')], data: frames,
  });
}
