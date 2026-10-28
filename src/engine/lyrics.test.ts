import { describe, expect, it } from 'vitest';
import type { Analysis, LyricLine } from './analysis';
import { lineCues, sungFor } from './lyrics';

// Made-up lines: no real song's words belong in the repository.
const an = {
  beats: Array.from({ length: 120 }, (_, i) => i * 0.5),
  events: { t: [10.2, 10.9, 11.4, 30.1], amp: [0.3, 0.9, 0.5, 1.0] },
} as unknown as Analysis;

const line = (t: number, text: string, end = t + 6): LyricLine => ({ t, end, text });

describe('lineCues', () => {
  it('colours the interiors while a colour word is sung', () => {
    const cues = lineCues([line(4, 'Paint the town in GOLDEN light')], an);
    expect(cues).toHaveLength(1);
    const [action, c] = cues[0];
    expect(action).toBe('color');
    expect(c.color).toEqual([255, 170, 0]);
    expect(c.t0).toBe(4);
    expect(c.t1).toBeCloseTo(4 + sungFor(line(4, 'Paint the town in GOLDEN light')) + 1.0, 6);
  });

  it('takes word endings only where the table says so', () => {
    expect(lineCues([line(4, 'Pumpkins on the porch')], an).map(([a, c]) => [a, c.color])).toEqual([['color', [255, 90, 0]]]);
    expect(lineCues([line(4, 'Reddish sky tonight')], an)).toEqual([]);   // "red" is a whole word only
  });

  it('strikes lightning on the loudest attack of a scream line', () => {
    const cues = lineCues([line(10, 'and then they all screamed', 14)], an);
    expect(cues.map(([a, c]) => [a, c.t0])).toEqual([['lightning', 10.9]]);
    // nothing played while the line is sung: on its start
    expect(lineCues([line(50, 'Thunder')], an).map(([a, c]) => [a, c.t0])).toEqual([['lightning', 50]]);
  });

  it('pings a chant across the cars on the beats of the line', () => {
    const cues = lineCues([line(20, 'Hey, monsters, monsters, monsters on parade', 30)], an);
    const pings = cues.filter(([a]) => a === 'ping').map(([, c]) => [c.t0, c.car]);
    expect(pings[0]).toEqual([20, 0]);
    expect(pings.length).toBe(Math.min(8, Math.floor(sungFor(line(20, 'Hey, monsters, monsters, monsters on parade', 30)) / 0.5) + 1));
    expect(pings.every(([t, k], i) => t === 20 + 0.5 * i && k === i)).toBe(true);
  });

  it("doesn't take repeated little words for a chant", () => {
    expect(lineCues([line(20, 'and you and you and the night')], an)).toEqual([]);
  });

  it('gives several moments for one line, in time order', () => {
    const cues = lineCues([line(30, 'red red red, a scream', 33), line(2, 'blue')], an);
    expect(cues.map(([a, c]) => [a, c.t0])).toEqual([['color', 2], ['color', 30], ['ping', 30], ['lightning', 30.1],
      ['ping', 30.5], ['ping', 31], ['ping', 31.5], ['ping', 32]]);
    expect(cues.map(([, c]) => c.color).filter(Boolean)).toEqual([[0, 60, 255], [255, 0, 0]]);
  });
});
