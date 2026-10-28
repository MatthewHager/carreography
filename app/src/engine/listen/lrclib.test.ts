import { describe, expect, it } from 'vitest';
import { lookup, parseLrc, type LrcRecord } from './lrclib';

// Made-up lyrics: no real song's words belong in the repository.
const LRC = `[ar:The Bats]
[ti:Night Flight]
[00:12.50] Out across the orchard wall
[00:16.20]Lanterns in the hall
[00:21.00][01:05.40] Fly, fly away
[00:25.10]
[00:40.00]<00:40.00> Under <00:40.60> the <00:40.90> moon
[01:20]Last line, no fraction`;

describe('parseLrc', () => {
  it('reads stamps, repeats, word stamps and the gaps', () => {
    const lines = parseLrc(LRC);
    expect(lines.map((l) => [l.t, l.text])).toEqual([
      [12.5, 'Out across the orchard wall'],
      [16.2, 'Lanterns in the hall'],
      [21.0, 'Fly, fly away'],
      [40.0, 'Under the moon'],
      [65.4, 'Fly, fly away'],
      [80.0, 'Last line, no fraction'],
    ]);
    expect(lines[1].end).toBe(21.0);
    expect(lines[2].end).toBe(25.1);     // the empty stamp ends the line
    expect(lines[3].end).toBe(48.0);     // at most 8 s when the next line is far off
    expect(lines[5].end).toBe(88.0);
  });

  it('applies the offset tag', () => {
    expect(parseLrc('[offset:+500]\n[00:10.00]Early').map((l) => l.t)).toEqual([9.5]);
    expect(parseLrc('[offset:-250]\n[00:10.00]Late').map((l) => l.t)).toEqual([10.25]);
  });

  it('ignores text without stamps', () => {
    expect(parseLrc('Plain lyrics\nwith no times')).toEqual([]);
  });
});

const record = (id: number, duration: number, synced: string | null, instrumental = false): LrcRecord => ({
  id, trackName: 'Night Flight', artistName: 'The Bats', duration, instrumental, syncedLyrics: synced,
});

/** A pretend LRCLIB: answers by path, after `busy` 503s; records each URL asked for. */
function fakeFetch(routes: Record<string, unknown>, busy = 0) {
  const asked: string[] = [];
  const fn = (async (input: RequestInfo | URL) => {
    const url = String(input);
    asked.push(url);
    if (busy-- > 0) return new Response('busy', { status: 503 });
    const path = new URL(url).pathname.replace('/api/', '');
    const body = routes[path];
    return body === undefined ? new Response('{}', { status: 404 }) : Response.json(body);
  }) as typeof fetch;
  return { fn, asked };
}
const noWait = async () => {};

describe('lookup', () => {
  it('takes the exact match on artist, title and length', async () => {
    const { fn, asked } = fakeFetch({ get: record(1, 200, LRC) });
    const r = await lookup({ artist: 'The Bats', title: 'Night Flight' }, 199.6, { fetch: fn, wait: noWait });
    expect(r.status).toBe('found');
    expect(r.candidates.map((c) => c.id)).toEqual([1]);
    expect(asked).toHaveLength(1);
    const q = new URL(asked[0]).searchParams;
    expect([q.get('artist_name'), q.get('track_name'), q.get('duration')]).toEqual(['The Bats', 'Night Flight', '200']);
  });

  it('retries while LRCLIB is busy', async () => {
    const { fn, asked } = fakeFetch({ get: record(1, 200, LRC) }, 2);
    const waits: number[] = [];
    const r = await lookup({ artist: 'The Bats', title: 'Night Flight' }, 200,
      { fetch: fn, wait: async (ms) => void waits.push(ms) });
    expect(r.status).toBe('found');
    expect(asked).toHaveLength(3);
    expect(waits).toEqual([1000, 2000]);
  });

  it('gives up after its tries', async () => {
    const { fn, asked } = fakeFetch({}, 99);
    await expect(lookup({ artist: 'The Bats', title: 'Night Flight' }, 200, { fetch: fn, wait: noWait, tries: 3 }))
      .rejects.toThrow('503');
    expect(asked).toHaveLength(3);
  });

  it('searches when there is no exact match, closest length first, without repeats', async () => {
    const other = LRC.replace('Last line', 'Final line');
    const { fn } = fakeFetch({
      search: [record(5, 260, other), record(6, 203, other), record(7, 201, null), record(8, 199, LRC), record(9, 201, LRC)],
    });
    const r = await lookup({ artist: 'The Bats', title: 'Night Flight' }, 200, { fetch: fn, wait: noWait });
    expect(r.status).toBe('found');
    expect(r.candidates.map((c) => c.id)).toEqual([8, 6]);    // 9 repeats 8; 5 is another version (60 s longer)
  });

  it('searches by title alone without an artist', async () => {
    const { fn, asked } = fakeFetch({ search: [record(3, 200, LRC)] });
    const r = await lookup({ artist: null, title: 'Night Flight' }, 200, { fetch: fn, wait: noWait });
    expect(r.candidates.map((c) => c.id)).toEqual([3]);
    expect(asked.map((u) => new URL(u).searchParams.get('q'))).toEqual(['Night Flight']);
  });

  it('says why there are no lines', async () => {
    const tags = { artist: 'The Bats', title: 'Night Flight' };
    const opts = (routes: Record<string, unknown>) => ({ fetch: fakeFetch(routes).fn, wait: noWait });
    expect((await lookup(tags, 200, opts({ search: [] }))).status).toBe('none');
    expect((await lookup(tags, 200, opts({ get: record(1, 200, null, true) }))).status).toBe('instrumental');
    expect((await lookup(tags, 200, opts({ get: record(1, 200, null) }))).status).toBe('unsynced');
  });
});
