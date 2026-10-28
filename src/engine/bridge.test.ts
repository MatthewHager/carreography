// The safety net for every change to the choreographer: the shows the Python version made (tag
// python-final) must come out of this code byte for byte.
//
// cache/bridge/ at the repository root holds them, one folder per show (a song, or a song@lineup):
// analysis.json, what the Python listening side heard in the song, with the song's name, lineup, style
// and driver; and each car's frames as the Python choreographer wrote them (<car folder>.bin).
// tools/export_bridge.py wrote them at tag python-final and they never change. They describe
// copyrighted recordings, so they stay on the machine that made them, out of the repository; without
// them this test (and vehicles.test.ts's show) is skipped.
//
// A change that moves a single byte fails here, naming the first frame and channel that differ.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fromBridge } from './analysis';
import * as C from './channels';
import { choreograph } from './choreo';

/** The top of this checkout: the nearest folder up that holds .git. */
const top = (dir: string): string =>
  (existsSync(join(dir, '.git')) || dirname(dir) === dir ? dir : top(dirname(dir)));
const ROOT = join(top(import.meta.dirname), 'cache', 'bridge');
const songs = existsSync(ROOT) ? readdirSync(ROOT).filter((d) => existsSync(join(ROOT, d, 'analysis.json'))).sort() : [];

/** "frame 812 channel 46 (ours 0, Python 255)", or null when identical. */
function firstDiff(ours: Uint8Array, theirs: Uint8Array): string | null {
  if (ours.length !== theirs.length) return `length ${ours.length} vs ${theirs.length}`;
  for (let i = 0; i < ours.length; i++) {
    if (ours[i] !== theirs[i]) {
      let n = 0;
      for (let j = i; j < ours.length; j++) if (ours[j] !== theirs[j]) n++;
      const f = Math.floor(i / C.N_CHANNELS), ch = i % C.N_CHANNELS;
      return `frame ${f} (${(f * 0.02).toFixed(2)} s) channel ${ch}: ours ${ours[i]}, Python ${theirs[i]}; ${n} bytes differ`;
    }
  }
  return null;
}

describe.skipIf(!songs.length)('matches the Python choreographer', () => {
  for (const song of songs) {
    it(song, () => {
      const { meta, an } = fromBridge(JSON.parse(readFileSync(join(ROOT, song, 'analysis.json'), 'utf8')));
      const cars = choreograph(an, { layout: meta.lineup, name: meta.name, style: meta.style, driver: meta.driver });
      const diffs = cars.map((car) => {
        const theirs = new Uint8Array(readFileSync(join(ROOT, song, `${car.name}.bin`)));
        const d = firstDiff(car.frames, theirs);
        return d && `${car.name}: ${d}`;
      }).filter(Boolean);
      expect(diffs).toEqual([]);
    }, 120_000);
  }
});
