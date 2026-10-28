// The move catalogue agrees with the moves, and MOVES.md (at the repository root) is the catalogue as
// it stands. When MOVES.md is stale this fails; `UPDATE_MOVES=1 npx vitest run catalog` rewrites it.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { markdown, SPLIT, UNISON } from './catalog';
import * as M from './moves';

/** The checkout's top folder: the nearest one holding .git. */
function repoRoot(): string {
  let dir = import.meta.dirname;
  while (!existsSync(join(dir, '.git'))) {
    if (dirname(dir) === dir) throw new Error('not inside a git checkout');
    dir = dirname(dir);
  }
  return dir;
}

describe('the move catalogue', () => {
  it('lists exactly the moves there are', () => {
    expect(Object.keys(UNISON).sort()).toEqual(Object.keys(M.UNISON).sort());
    expect([...new Set(SPLIT.map(([y]) => y))].sort()).toEqual(Object.keys(M.SIDE).sort());
    expect([...new Set(SPLIT.map(([, c]) => c))].sort()).toEqual(Object.keys(M.CENTRE).sort());
  });

  it('is what MOVES.md says', () => {
    const file = join(repoRoot(), 'MOVES.md');
    if (process.env.UPDATE_MOVES) writeFileSync(file, markdown());
    const stale = 'MOVES.md is stale: UPDATE_MOVES=1 npx vitest run catalog';
    expect(readFileSync(file, 'utf8'), stale).toBe(markdown());
  });
});
