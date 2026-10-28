// The arc: how big the show may get at each moment. The form map gives every section a ceiling
// (form.ts); the music's own intensity tier is held inside it.

import type { Analysis } from './analysis';
import { sectionAt } from './form';

/** Python's a[i] for an index that may be negative. */
const at = <T>(a: ArrayLike<T>, i: number): T => a[i < 0 ? a.length + i : i];

/** Intensity tier at t, capped by the form map's ceiling for that section (the arc). */
export function tierAt(an: Analysis, t: number): number {
  const f = Math.min(Math.trunc(t / an.step), an.tier.length - 1);
  let tier = Math.trunc(at(an.tier, f));
  const secs = an.sections;
  if (secs && secs.length) {
    const ceiling = sectionAt(secs, t).ceiling;
    // The arc rules: never above the section's ceiling, and a section the form map ranks high plays
    // at least one step below it even if the recording is too flat to show it.
    tier = Math.min(Math.max(tier, ceiling - 1), ceiling);
  }
  return tier;
}

export function ceilingAt(an: Analysis, t: number): number {
  const secs = an.sections;
  if (!secs || !secs.length) return 3;
  return sectionAt(secs, t).ceiling;
}
