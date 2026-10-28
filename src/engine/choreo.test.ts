// The same song and lineup always give the same show, byte for byte, whatever was made before it.

import { describe, expect, it } from 'vitest';
import { choreograph } from './choreo';
import { FIXTURES, fixture } from './fixtures';

const show = (song: (typeof FIXTURES)[number], lineup: string) =>
  choreograph(fixture(song), { layout: lineup }).map((c) => c.frames);

describe('the same input gives the same show', () => {
  for (const song of FIXTURES) {
    it(song, () => {
      const first = show(song, 'YCY');
      show(FIXTURES[(FIXTURES.indexOf(song) + 1) % FIXTURES.length], 'CYC');   // anything in between
      expect(show(song, 'YCY')).toEqual(first);
    });
  }
});
