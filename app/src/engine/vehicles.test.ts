// Every lineup letter makes a show within Tesla's rules: the closure command limits, and on a Model X
// the falcon doors' gesture with the windows still while the doors move. Uses one of the frozen
// analyses in cache/bridge (see bridge.test.ts); without them it's skipped.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fromBridge } from './analysis';
import * as C from './channels';
import { choreograph } from './choreo';
import { FALCON_CLOSE_S, WINDOW_S } from './motors';
import { lineupCars, parseLineup, VEHICLES } from './vehicles';

/** The top of this checkout: the nearest folder up that holds .git. */
const top = (dir: string): string =>
  (existsSync(join(dir, '.git')) || dirname(dir) === dir ? dir : top(dirname(dir)));
const ROOT = join(top(import.meta.dirname), 'cache', 'bridge');
const song = existsSync(ROOT) ? readdirSync(ROOT).filter((d) => existsSync(join(ROOT, d, 'analysis.json'))).sort()[0] : undefined;

const COMMANDS = new Set([C.CLOSURE_OPEN, C.CLOSURE_DANCE, C.CLOSURE_CLOSE]);

/** [start frame, value] of each command (a run of one non-zero value) on a channel. */
function commands(frames: Uint8Array, nFrames: number, ch: number): [number, number][] {
  const out: [number, number][] = [];
  let prev = 0;
  for (let f = 0; f < nFrames; f++) {
    const v = frames[f * C.N_CHANNELS + ch];
    if (v && v !== prev) out.push([f, v]);
    prev = v;
  }
  return out;
}

describe('vehicles', () => {
  it('knows every letter', () => {
    for (const letter of 'SMmXYyBLC') expect(parseLineup(letter)).toBe(letter);
    expect(lineupCars('XL').map(([name]) => name)).toEqual(['Car1_ModelX_Left', 'Car2_ModelYL_Right']);
    expect(() => parseLineup('Q')).toThrow(/unknown car letter/);
    expect(new Set(Object.values(VEHICLES).map((v) => v.body)).size).toBe(Object.keys(VEHICLES).length);
  });
});

describe.skipIf(!song)('every car in a show', () => {
  for (const lineup of ['SMXmB', 'LXC', 'X']) {
    it(lineup, () => {
      const { meta, an } = fromBridge(JSON.parse(readFileSync(join(ROOT, song!, 'analysis.json'), 'utf8')));
      const cars = choreograph(an, { layout: lineup, name: meta.name, style: meta.style, driver: meta.driver });
      for (const car of cars) {
        for (const [ch, limit] of Object.entries(C.CLOSURE_LIMITS)) {
          const n = commands(car.frames, car.nFrames, Number(ch)).filter(([, v]) => COMMANDS.has(v)).length;
          expect(n, `${car.name} channel ${ch}`).toBeLessThanOrEqual(limit);
        }
        const falcon = commands(car.frames, car.nFrames, C.L_FALCON);
        if (!car.falcon) {
          expect(falcon).toEqual([]);
          continue;
        }
        expect(falcon.map(([, v]) => v)).toEqual([C.CLOSURE_OPEN, C.CLOSURE_DANCE, C.CLOSURE_CLOSE]);
        const from = falcon[0][0] * an.step, to = falcon[2][0] * an.step + FALCON_CLOSE_S;
        for (const w of C.WINDOWS) {
          for (const [f] of commands(car.frames, car.nFrames, w)) {
            const t = f * an.step;
            expect(t + WINDOW_S <= from || t >= to, `${car.name} window ${w} moves at ${t.toFixed(1)} s`).toBe(true);
          }
        }
      }
    }, 120_000);
  }
});
