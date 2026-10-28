// Who sang it and what it's called, read from the dropped file, so the lyrics can be looked up. A small
// reader for the tags songs usually carry: ID3 in MP3 (v2.2 to v2.4, then v1), Vorbis comments in FLAC,
// the iTunes atoms in M4A, and RIFF INFO in WAV. Anything else, or a file without tags, falls back to
// its name ("Artist - Title.mp3").

export interface SongTags {
  artist: string | null;
  title: string;
}

const latin1 = new TextDecoder('latin1');
const utf8 = new TextDecoder('utf-8');

const ascii = (b: Uint8Array, at: number, n: number) => latin1.decode(b.subarray(at, at + n));
const u32be = (b: Uint8Array, at: number) => ((b[at] << 24) >>> 0) + (b[at + 1] << 16) + (b[at + 2] << 8) + b[at + 3];
const u32le = (b: Uint8Array, at: number) => b[at] + (b[at + 1] << 8) + (b[at + 2] << 16) + ((b[at + 3] << 24) >>> 0);
const syncsafe = (b: Uint8Array, at: number) => (b[at] << 21) | (b[at + 1] << 14) | (b[at + 2] << 7) | b[at + 3];
const clean = (s: string | null | undefined) => (s ?? '').replace(/\0+$/g, '').split('\0')[0].trim() || null;

/** The artist and title of a song file: from its tags, else from its name. */
export function readTags(bytes: Uint8Array, fileName: string): SongTags {
  let found: Partial<Record<'artist' | 'title', string | null>> = {};
  try {
    if (ascii(bytes, 0, 3) === 'ID3') found = id3v2(bytes);
    else if (ascii(bytes, 0, 4) === 'fLaC') found = flac(bytes);
    else if (ascii(bytes, 4, 4) === 'ftyp') found = mp4(bytes);
    else if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WAVE') found = riff(bytes);
    if (!found.title) found = { ...id3v1(bytes), ...dropEmpty(found) };
  } catch {
    found = {};     // a damaged tag is no reason not to make the show
  }
  const named = fromFileName(fileName);
  const title = clean(found.title);
  return title ? { artist: clean(found.artist), title } : named;
}

function dropEmpty<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v)) as Partial<T>;
}

/** "03 Artist - Title (Remastered).mp3" -> artist and title. */
export function fromFileName(fileName: string): SongTags {
  const base = fileName.replace(/^.*[\\/]/, '').replace(/\.[a-z0-9]{1,5}$/i, '').replace(/_/g, ' ');
  // a track number goes ("01 - ", "1. ", "07 "), but not the number that starts "99 Luftballons"
  const stripped = base.replace(/^\s*(\d{1,3}\s*[-.)]\s*|0\d\s+)/, '').trim() || base.trim();
  const dash = stripped.split(/\s+[-–—]\s+/);
  if (dash.length >= 2) return { artist: dash[0].trim(), title: dash.slice(1).join(' - ').trim() };
  return { artist: null, title: stripped };
}

// ---- ID3 ---------------------------------------------------------------------------------------

function id3Text(b: Uint8Array): string {
  const enc = b[0], body = b.subarray(1);
  if (enc === 0) return latin1.decode(body);
  if (enc === 3) return utf8.decode(body);
  // UTF-16: with a byte-order mark (1), or big-endian without one (2)
  let le = false, start = 0;
  if (enc === 1 && body.length >= 2) {
    if (body[0] === 0xff && body[1] === 0xfe) [le, start] = [true, 2];
    else if (body[0] === 0xfe && body[1] === 0xff) start = 2;
  }
  return new TextDecoder(le ? 'utf-16le' : 'utf-16be').decode(body.subarray(start, body.length - ((body.length - start) % 2)));
}

/** ID3v2.2 / 2.3 / 2.4: the title (TIT2/TT2) and artist (TPE1/TP1, else the album artist TPE2/TP2). */
function id3v2(bytes: Uint8Array) {
  const ver = bytes[3], flags = bytes[5];
  let tag = bytes.subarray(10, 10 + syncsafe(bytes, 6));
  if (flags & 0x80 && ver < 4) tag = unsync(tag);      // v2.4 unsynchronises frame by frame instead
  let p = 0;
  if (flags & 0x40) p = ver === 4 ? syncsafe(tag, 0) : 4 + u32be(tag, 0);   // extended header
  const idLen = ver === 2 ? 3 : 4, headLen = ver === 2 ? 6 : 10;
  const frames: Record<string, string> = {};
  while (p + headLen <= tag.length && tag[p] !== 0) {
    const id = ascii(tag, p, idLen);
    const size = ver === 2 ? (tag[p + 3] << 16) | (tag[p + 4] << 8) | tag[p + 5]
      : ver === 4 ? syncsafe(tag, p + 4) : u32be(tag, p + 4);
    if (size <= 0 || p + headLen + size > tag.length) break;
    let body = tag.subarray(p + headLen, p + headLen + size);
    if (ver === 4 && tag[p + 9] & 0x02) body = unsync(body);
    if (id[0] === 'T' && !(id in frames)) frames[id] = id3Text(body);
    p += headLen + size;
  }
  return {
    title: clean(frames.TIT2 ?? frames.TT2),
    artist: clean(frames.TPE1 ?? frames.TP1) ?? clean(frames.TPE2 ?? frames.TP2),
  };
}

/** Undo ID3 unsynchronisation: every 0xFF 0x00 was written for a plain 0xFF. */
function unsync(b: Uint8Array): Uint8Array {
  const out = new Uint8Array(b.length);
  let n = 0;
  for (let i = 0; i < b.length; i++) {
    out[n++] = b[i];
    if (b[i] === 0xff && b[i + 1] === 0x00) i++;
  }
  return out.subarray(0, n);
}

/** ID3v1: 128 bytes at the very end. */
function id3v1(bytes: Uint8Array) {
  const at = bytes.length - 128;
  if (at < 0 || ascii(bytes, at, 3) !== 'TAG') return {};
  return { title: clean(ascii(bytes, at + 3, 30)), artist: clean(ascii(bytes, at + 33, 30)) };
}

// ---- FLAC, MP4, WAV ----------------------------------------------------------------------------

/** FLAC: the VORBIS_COMMENT metadata block (type 4). */
function flac(bytes: Uint8Array) {
  let p = 4;
  while (p + 4 <= bytes.length) {
    const head = bytes[p], len = (bytes[p + 1] << 16) | (bytes[p + 2] << 8) | bytes[p + 3];
    if ((head & 0x7f) === 4) return vorbisComments(bytes.subarray(p + 4, p + 4 + len));
    if (head & 0x80) break;          // the last metadata block
    p += 4 + len;
  }
  return {};
}

/** A Vorbis comment block: vendor string, then KEY=value pairs (keys in any case). */
export function vorbisComments(b: Uint8Array) {
  let p = 4 + u32le(b, 0);
  const n = u32le(b, p);
  p += 4;
  const tags: Record<string, string> = {};
  for (let i = 0; i < n && p + 4 <= b.length; i++) {
    const len = u32le(b, p);
    const s = utf8.decode(b.subarray(p + 4, p + 4 + len));
    p += 4 + len;
    const eq = s.indexOf('=');
    const k = s.slice(0, eq).toUpperCase();
    if (eq > 0 && !(k in tags)) tags[k] = s.slice(eq + 1);
  }
  return { title: clean(tags.TITLE), artist: clean(tags.ARTIST) ?? clean(tags.ALBUMARTIST) };
}

/** MP4 / M4A: moov > udta > meta > ilst > ©nam / ©ART (or aART), each holding a `data` atom. */
function mp4(bytes: Uint8Array) {
  const ilst = path(bytes, 0, bytes.length, ['moov', 'udta', 'meta', 'ilst']);
  if (!ilst) return {};
  const text = (name: string) => {
    const box = child(bytes, ilst[0], ilst[1], name);
    const data = box && child(bytes, box[0], box[1], 'data');
    return data ? utf8.decode(bytes.subarray(data[0] + 8, data[1])) : null;   // after type and locale
  };
  return { title: clean(text('©nam')), artist: clean(text('©ART')) ?? clean(text('aART')) };
}

/** The atom `name` directly inside [from, to): its body as [start, end]. */
function child(b: Uint8Array, from: number, to: number, name: string): [number, number] | null {
  let p = from;
  while (p + 8 <= to) {
    let size = u32be(b, p), head = 8;
    if (size === 1) [size, head] = [u32be(b, p + 8) * 2 ** 32 + u32be(b, p + 12), 16];   // 64-bit size
    else if (size === 0) size = to - p;                                                   // to the end
    if (size < head || p + size > to) return null;
    const type = ascii(b, p + 4, 4);
    // `meta` is a full box: version and flags before its children
    if (type === name) return [p + head + (name === 'meta' ? 4 : 0), p + size];
    p += size;
  }
  return null;
}

function path(b: Uint8Array, from: number, to: number, names: string[]): [number, number] | null {
  let span: [number, number] | null = [from, to];
  for (const n of names) if (!(span = child(b, span[0], span[1], n))) return null;
  return span;
}

/** WAV: a LIST chunk of type INFO, with INAM (title) and IART (artist). */
function riff(bytes: Uint8Array) {
  let p = 12;
  while (p + 8 <= bytes.length) {
    const id = ascii(bytes, p, 4), size = u32le(bytes, p + 4);
    if (id === 'LIST' && ascii(bytes, p + 8, 4) === 'INFO') {
      const info: Record<string, string> = {};
      for (let q = p + 12; q + 8 <= p + 8 + size;) {
        const k = ascii(bytes, q, 4), n = u32le(bytes, q + 4);
        info[k] = utf8.decode(bytes.subarray(q + 8, q + 8 + n));
        q += 8 + n + (n & 1);
      }
      return { title: clean(info.INAM), artist: clean(info.IART) };
    }
    p += 8 + size + (size & 1);
  }
  return {};
}
