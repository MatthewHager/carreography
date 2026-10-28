// A finished show: one frame array per car, plus the song it plays to.

import { N_CHANNELS, STEP_MS } from '@/engine/channels';
import type { LyricsReport } from '@/engine/listen/align';
import type { SongTags } from '@/engine/listen/tags';
import type { AppModelId } from '@/viewer/car/appBody';
import type { CarKind, YBody } from '@/viewer/rig';

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
  audio?: Blob;          // what plays in the preview
  lyrics?: LyricsReport & { tags: SongTags };   // what LRCLIB had for the song, looked up by these tags
}

export const STEP_S = STEP_MS / 1000;
export const CHANNELS = N_CHANNELS;

/** How the 3D view draws a lineup letter. */
export function bodyFor(letter: string): { kind: CarKind; yBody: YBody; model: AppModelId } {
  if (letter === 'C') return { kind: 'cybertruck', yBody: 'refresh', model: 'cybertruck' };
  if (letter === 'y') return { kind: 'modely', yBody: 'mesh', model: 'y_high' };
  return { kind: 'modely', yBody: 'refresh', model: 'bayberry' };
}
