// The same song and lineup always give the same show, byte for byte, whatever was made before it; and the
// show hears from the music alone where to flow and where a rhythm section plays.

import { describe, expect, it } from 'vitest';
import { FLOW_MOVES } from './catalog';
import { choreograph, makeShow } from './choreo';
import { feel } from './feel';
import { FIXTURES, fixture } from './fixtures';

const show = (song: (typeof FIXTURES)[number], lineup: string) =>
  choreograph(fixture(song), lineup).map((c) => c.frames);

describe('the same input gives the same show', () => {
  for (const song of FIXTURES) {
    it(song, () => {
      const first = show(song, 'YCY');
      show(FIXTURES[(FIXTURES.indexOf(song) + 1) % FIXTURES.length], 'CYC');   // anything in between
      expect(show(song, 'YCY')).toEqual(first);
    });
  }

  it('choreographing one analysis again, for another lineup and back, gives the same bytes', () => {
    const an = fixture('groove'), first = choreograph(an, 'YCY').map((c) => c.frames);
    choreograph(an, 'SXC');
    expect(choreograph(an, 'YCY').map((c) => c.frames)).toEqual(first);
  });
});

describe('the music says where to flow and where the drums play', () => {
  it('a chorale with no beat flows from start to end', () => {
    expect(feel(fixture('chorale')).every((f) => f.flow && !f.kit)).toBe(true);
  });

  it('a drum-kit groove has the beat and the kit all the way', () => {
    expect(feel(fixture('groove')).every((f) => !f.flow && f.kit)).toBe(true);
  });

  it('an orchestral build flows over its roll, then marches on the beat without a kit', () => {
    const an = fixture('build'), sections = feel(an);
    expect(sections.some((f) => f.kit)).toBe(false);
    expect(sections.find((f) => f.t0 <= 10 && 10 < f.t1)?.flow).toBe(true);        // the roll
    expect(sections.find((f) => f.t0 <= 50 && 50 < f.t1)?.flow).toBe(false);       // the march
  });

  it('every phrase of a flowing song plays a flowing move, and none of a groove', () => {
    const chorale = makeShow(fixture('chorale'), 'YCY').an, groove = makeShow(fixture('groove'), 'YCY').an;
    expect(chorale.phrases!.every((ph) => FLOW_MOVES.includes(ph.move!))).toBe(true);
    expect(groove.phrases!.some((ph) => FLOW_MOVES.includes(ph.move!))).toBe(false);
  });
});
