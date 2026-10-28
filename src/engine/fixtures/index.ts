// The test songs' analyses (songs.ts, fixtures.test.ts), for the tests: a fresh copy each time, since
// choreographing writes into its analysis.

import type { Analysis } from '../analysis';

const files = import.meta.glob<Analysis>('./*.json', { eager: true, import: 'default' });

export const FIXTURES = ['groove', 'chorale', 'build'] as const;

export function fixture(name: (typeof FIXTURES)[number]): Analysis {
  return structuredClone(files[`./${name}.json`]);
}
