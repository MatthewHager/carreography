import { describe, expect, it } from 'vitest';
import { Rng } from './rng';

// Reference values from numpy 1.26: r = np.random.default_rng(seed); r.random(), r.integers(17),
// r.integers(100), r.random(), r.choice(60, size=6, replace=False), r.random(3)
const REF: [number, number, number, number, number, number[], number[]][] = [
  [0, 0.6369616873214543, 8, 26, 0.04097352393619469, [4, 0, 9, 38, 54, 47],
    [0.9350724237877682, 0.8158535541215322, 0.002738500170148095]],
  [7, 0.625095466604667, 11, 89, 0.7756856902451935, [17, 16, 3, 12, 45, 52],
    [0.4679349528437208, 0.3030324268193135, 0.2784256121007733]],
  [12345, 0.22733602246716966, 13, 31, 0.7973654573327341, [37, 49, 19, 35, 56, 22],
    [0.9418028652699372, 0.248245714629571, 0.9488811518333182]],
  [4294967295, 0.2519435680449965, 12, 21, 0.28728472043517017, [34, 54, 11, 7, 40, 17],
    [0.7769532736325003, 0.7196577118069766, 0.8698505623556404]],
  [1099511627781, 0.004739459374490829, 7, 37, 0.5872294266977701, [52, 0, 24, 59, 8, 49],
    [0.17601582374235958, 0.41683364416616187, 0.03066470710219804]],
];

describe('Rng matches numpy default_rng', () => {
  for (const [seed, r1, i17, i100, r2, choice, r3] of REF) {
    it(`seed ${seed}`, () => {
      const r = new Rng(seed);
      expect(r.random()).toBe(r1);
      expect(r.integers(17)).toBe(i17);
      expect(r.integers(100)).toBe(i100);
      expect(r.random()).toBe(r2);
      expect(r.choiceNoReplace(60, 6)).toEqual(choice);
      expect(Array.from(r.randoms(3))).toEqual(r3);
    });
  }
});
