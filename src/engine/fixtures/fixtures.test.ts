// The test songs' analyses (songs.ts), kept as fixtures so the choreography tests don't need the listening
// models. `UPDATE_FIXTURES=1 npx vitest run fixtures` makes the songs again, listens to them as the app does
// (beat-this and basic-pitch on ONNX Runtime's WASM backend, then analyze()) and rewrites the JSON; it
// needs the models in public/models (CONTRIBUTING.md says how to get them).

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'vitest';
import { STEP_MS } from '../channels';
import { analyze } from '../listen/audio';
import { trackBeats } from '../listen/beats';
import { transcribe } from '../listen/notes';
import { SONGS } from './songs';

const MODELS = join(import.meta.dirname, '..', '..', '..', 'public', 'models');

function model(file: string): ArrayBuffer {
  const b = readFileSync(join(MODELS, file));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}

/** Times to the millisecond and levels to a thousandth keep the files small (the onset curve's hop stays
 * exact: it scales every index into that curve). */
const rounded = (key: string, v: unknown) =>
  (typeof v === 'number' && !Number.isInteger(v) && key !== 'pulseHop' ? Math.round(v * 1000) / 1000 : v);

describe.skipIf(!process.env.UPDATE_FIXTURES)('the test songs, listened to', () => {
  for (const [name, make] of Object.entries(SONGS)) {
    it(name, async () => {
      const y = make();
      const beats = await trackBeats(y, { backend: 'wasm', model: model('beat_this-final0-fp16w.onnx') });
      const notes = await transcribe(y, { backend: 'wasm', model: model('basic_pitch-nmp.onnx') });
      const an = analyze(y, { stepMs: STEP_MS, notes, neuralBeats: beats });
      writeFileSync(join(import.meta.dirname, `${name}.json`), JSON.stringify(an, rounded) + '\n');
    }, 300_000);
  }
});
