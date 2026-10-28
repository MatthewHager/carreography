// Synced lyrics from LRCLIB (lrclib.net): free, no key, and it allows requests from the browser. Each
// line comes with the time it starts in some release of the song; align.ts finds where those lines
// fall in the recording that was dropped in. LRCLIB is busy at times and answers 503, so every request
// is retried a few times before giving up, and a song with no lyrics simply plays without lyric effects.

import type { LyricLine } from '../analysis';
import type { SongTags } from './tags';

export type { LyricLine };

/** A record as LRCLIB returns it (the fields used here). */
export interface LrcRecord {
  id: number;
  trackName: string;
  artistName: string;
  duration: number;
  instrumental: boolean;
  syncedLyrics: string | null;
}

export const API = 'https://lrclib.net/api';
const MAX_LINE_S = 8.0;           // a line with no following timestamp is taken to last this long at most

/** The lines of an LRC text, in time order. Handles several stamps on one line ("[00:12.00][01:30.00]"),
 * the `[offset:ms]` tag and enhanced LRC's word stamps; an empty stamped line marks where singing stops. */
export function parseLrc(lrc: string): LyricLine[] {
  const stamp = /\[(\d{1,3}):(\d{1,2}(?:[.:]\d{1,3})?)\]/g;
  let offset = 0;
  const marks: { t: number; text: string }[] = [];
  for (const raw of lrc.split(/\r?\n/)) {
    const off = raw.match(/^\s*\[offset:\s*([+-]?\d+)\s*\]/i);
    if (off) {
      offset = parseInt(off[1], 10) / 1000;     // positive: the lyrics come earlier
      continue;
    }
    const times: number[] = [];
    let rest = raw.trim(), m: RegExpExecArray | null;
    stamp.lastIndex = 0;
    while ((m = stamp.exec(rest)) && m.index === 0) {
      times.push(parseInt(m[1], 10) * 60 + parseFloat(m[2].replace(':', '.')));
      rest = rest.slice(m[0].length).trimStart();
      stamp.lastIndex = 0;
    }
    if (!times.length) continue;
    const text = rest.replace(/<\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?>/g, '').replace(/\s+/g, ' ').trim();
    for (const t of times) marks.push({ t, text });
  }
  marks.sort((a, b) => a.t - b.t);
  const lines: LyricLine[] = [];
  for (let i = 0; i < marks.length; i++) {
    if (!marks[i].text) continue;
    const t = Math.max(0, marks[i].t - offset);
    const next = i + 1 < marks.length ? marks[i + 1].t - offset : Infinity;
    lines.push({ t, end: Math.min(next, t + MAX_LINE_S), text: marks[i].text });
  }
  return lines;
}

// ---- Looking a song up -------------------------------------------------------------------------

export interface FetchOptions {
  fetch?: typeof fetch;                    // for the tests
  wait?: (ms: number) => Promise<void>;    // for the tests
  tries?: number;
}

/** LRCLIB's answer to one GET: the parsed JSON, or null for "not found". Retries busy and failed
 * requests (503, 429, the network) with growing pauses; throws once it has run out of tries. */
async function getJson<T>(url: string, opts: FetchOptions): Promise<T | null> {
  const get = opts.fetch ?? fetch, tries = opts.tries ?? 4;
  const wait = opts.wait ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  let last = '';
  for (let i = 0; i < tries; i++) {
    if (i) await wait(1000 * 2 ** (i - 1));
    try {
      const signal = typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal ? AbortSignal.timeout(10_000) : undefined;
      const res = await get(url, { signal });
      if (res.status === 404) return null;
      if (res.ok) return (await res.json()) as T;
      last = `LRCLIB answered ${res.status}`;
      if (res.status !== 429 && res.status < 500) break;     // our request is wrong: asking again won't help
    } catch (err) {
      last = (err as Error).message ?? String(err);
    }
  }
  throw new Error(last || 'LRCLIB did not answer');
}

export type LookupStatus = 'found' | 'instrumental' | 'unsynced' | 'none';

/** A version of the song's lyrics: the lines, and the release length LRCLIB has for them. */
export interface Candidate {
  id: number;
  duration: number;
  lines: LyricLine[];
}

const MAX_LENGTH_GAP_S = 30;       // further from the recording's length than this is another version

/** The synced lyrics LRCLIB has for a song, best guesses first (at most `max`): the exact match on
 * artist, title and length, then search results by how close their length is. */
export async function lookup(tags: SongTags, duration: number, opts: FetchOptions = {}, max = 3)
  : Promise<{ status: LookupStatus; candidates: Candidate[] }> {
  const records: LrcRecord[] = [];
  const q = (p: Record<string, string>) => new URLSearchParams(p).toString();
  const exact = tags.artist ? await getJson<LrcRecord>(`${API}/get?${q({
    artist_name: tags.artist, track_name: tags.title, duration: String(Math.round(duration)),
  })}`, opts) : null;
  if (exact) records.push(exact);
  if (!records.some((r) => r.syncedLyrics)) {
    const query: Record<string, string> = tags.artist
      ? { artist_name: tags.artist, track_name: tags.title } : { q: tags.title };
    records.push(...((await getJson<LrcRecord[]>(`${API}/search?${q(query)}`, opts)) ?? []));
    if (tags.artist && !records.some((r) => r.syncedLyrics)) {
      records.push(...((await getJson<LrcRecord[]>(`${API}/search?${q({ q: `${tags.artist} ${tags.title}` })}`,
        opts)) ?? []));
    }
  }
  if (!records.length) return { status: 'none', candidates: [] };
  const near = records.filter((r) => Math.abs((r.duration ?? duration) - duration) <= MAX_LENGTH_GAP_S);
  if (near.length && near.every((r) => r.instrumental)) return { status: 'instrumental', candidates: [] };
  const seen = new Set<string>();
  const candidates: Candidate[] = [];
  const order = near.map((r, i) => ({ r, i, gap: r === exact ? -1 : Math.abs((r.duration ?? duration) - duration) }));
  order.sort((a, b) => a.gap - b.gap || a.i - b.i);
  for (const { r } of order) {
    if (r.instrumental || !r.syncedLyrics || seen.has(r.syncedLyrics)) continue;
    seen.add(r.syncedLyrics);
    const lines = parseLrc(r.syncedLyrics);
    if (lines.length >= 3) candidates.push({ id: r.id, duration: r.duration, lines });
    if (candidates.length >= max) break;
  }
  return { status: candidates.length ? 'found' : 'unsynced', candidates };
}
