// The form map: the shape of the whole piece, read before any phrase is choreographed.
//
//   sections   boundaries from beat-synchronous chroma + timbre (agglomerative clustering)
//   letters    repeated material gets the same letter (A, B, A', ...) by chroma/timbre similarity
//   energy     mean loudness per section; the climax section is the loudest in the second half
//   ceiling    the intensity each section is allowed (0..3): an arc that saves the top for the climax,
//              with every repeat of a letter allowed one step more than the last ("escalation")
//   repeatOf   index of the first section with the same letter, for callbacks

import type { Section } from './analysis';

export function sectionAt(sections: Section[], t: number): Section {
  for (const s of sections) if (s.t0 <= t && t < s.t1) return s;
  return sections[sections.length - 1];
}
