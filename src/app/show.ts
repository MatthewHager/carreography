// A finished show: one frame array per car, plus the song it plays to.

import { N_CHANNELS, STEP_MS } from '@/engine/channels';
import type { LyricsReport } from '@/engine/listen/align';
import type { SongTags } from '@/engine/listen/tags';
import { VEHICLES } from '@/engine/vehicles';
import type { AppModelId } from '@/viewer/car/appBody';

export interface ShowCar {
  name: string;          // Car2_Cybertruck_Center: the folder its USB drive needs
  letter: string;        // lineup letter (engine/vehicles.ts)
  frames: Uint8Array;    // nFrames x 200 channels, frame-major
}

export interface Show {
  title: string;
  lineup: string;
  nFrames: number;
  cars: ShowCar[];
  audio: Blob;           // the song as a 44.1 kHz WAV: what plays in the preview and goes on the drives
  lyrics: LyricsReport & { tags: SongTags };   // what LRCLIB had for the song, looked up by these tags
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
