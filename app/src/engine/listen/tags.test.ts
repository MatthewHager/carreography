import { describe, expect, it } from 'vitest';
import { fromFileName, readTags } from './tags';

const enc = new TextEncoder();
const cat = (...parts: (Uint8Array | number[] | string)[]) => {
  const bs = parts.map((p) => (typeof p === 'string' ? enc.encode(p) : Uint8Array.from(p)));
  const out = new Uint8Array(bs.reduce((n, b) => n + b.length, 0));
  let o = 0;
  for (const b of bs) {
    out.set(b, o);
    o += b.length;
  }
  return out;
};
const be32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const le32 = (n: number) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
const syncsafe = (n: number) => [(n >> 21) & 127, (n >> 14) & 127, (n >> 7) & 127, n & 127];
const audio = new Uint8Array(64).fill(0x55);     // stands in for the frames after the tags

function id3(ver: 2 | 3 | 4, frames: [string, Uint8Array][]) {
  const body = cat(...frames.map(([id, data]) => ver === 2
    ? cat(id, [(data.length >> 16) & 255, (data.length >> 8) & 255, data.length & 255], data)
    : cat(id, ver === 4 ? syncsafe(data.length) : be32(data.length), [0, 0], data)));
  return cat('ID3', [ver, 0, 0], syncsafe(body.length + 10), body, new Uint8Array(10), audio);
}
const latin1 = (s: string) => cat([0], Uint8Array.from([...s].map((c) => c.charCodeAt(0))));
const utf8 = (s: string) => cat([3], s);
const utf16 = (s: string) => {
  const out = [1, 0xff, 0xfe];
  for (const c of s) out.push(c.charCodeAt(0) & 255, c.charCodeAt(0) >> 8);
  return Uint8Array.from(out);
};

function atom(type: string, ...children: Uint8Array[]) {
  const body = cat(...children);
  return cat(be32(body.length + 8), [...type].map((c) => c.charCodeAt(0)), body);   // © is one byte here
}

describe('readTags', () => {
  it('reads ID3v2.3 with UTF-16 text', () => {
    const f = id3(3, [['TPE1', utf16('Nöel Band')], ['TIT2', utf16('Pumpkin Waltz')]]);
    expect(readTags(f, 'x.mp3')).toEqual({ artist: 'Nöel Band', title: 'Pumpkin Waltz' });
  });

  it('reads ID3v2.4 with UTF-8 text and syncsafe sizes', () => {
    const long = 'A'.repeat(200);       // a size above 127 differs between syncsafe and plain
    const f = id3(4, [['TCON', utf8('Rock')], ['TIT2', utf8(`Night ${long}`)], ['TPE1', utf8('The Bats')]]);
    expect(readTags(f, 'x.mp3')).toEqual({ artist: 'The Bats', title: `Night ${long}` });
  });

  it('reads ID3v2.2 and falls back to the album artist', () => {
    const f = id3(2, [['TT2', latin1('Old Song')], ['TP2', latin1('Some Orchestra')]]);
    expect(readTags(f, 'x.mp3')).toEqual({ artist: 'Some Orchestra', title: 'Old Song' });
  });

  it('reads ID3v1 at the end of the file', () => {
    const pad = (s: string, n: number) => cat(s, new Uint8Array(n - s.length));
    const f = cat(audio, 'TAG', pad('Graveyard Shift', 30), pad('The Night Owls', 30), new Uint8Array(65));
    expect(readTags(f, 'x.mp3')).toEqual({ artist: 'The Night Owls', title: 'Graveyard Shift' });
  });

  it('reads FLAC Vorbis comments', () => {
    const comments = ['title=Full Moon', 'ARTIST=Howlers', 'ARTIST=Second Artist'].map((s) => cat(le32(enc.encode(s).length), s));
    const block = cat(le32(6), 'vendor', le32(comments.length), ...comments);
    const streaminfo = cat([0, 0, 0, 34], new Uint8Array(34));
    const f = cat('fLaC', streaminfo, [0x84, (block.length >> 16) & 255, (block.length >> 8) & 255, block.length & 255],
      block, audio);
    expect(readTags(f, 'x.flac')).toEqual({ artist: 'Howlers', title: 'Full Moon' });
  });

  it('reads the iTunes atoms in M4A, after the audio', () => {
    const data = (s: string) => atom('data', Uint8Array.from([0, 0, 0, 1, 0, 0, 0, 0]), enc.encode(s));
    const ilst = atom('ilst', atom('©nam', data('Cauldron')), atom('©ART', data('Three Witches')));
    const meta = atom('meta', Uint8Array.from([0, 0, 0, 0]), atom('hdlr', new Uint8Array(25)), ilst);
    const f = cat(atom('ftyp', enc.encode('M4A '), new Uint8Array(8)), atom('mdat', audio), atom('moov',
      atom('mvhd', new Uint8Array(100)), atom('udta', meta)));
    expect(readTags(f, 'x.m4a')).toEqual({ artist: 'Three Witches', title: 'Cauldron' });
  });

  it('reads RIFF INFO in WAV', () => {
    const info = cat('INFO', 'INAM', le32(6), 'Bones\0', 'IART', le32(9), 'Skeleton\0', [0]);
    const f = cat('RIFF', le32(0), 'WAVE', 'fmt ', le32(16), new Uint8Array(16), 'LIST', le32(info.length), info,
      'data', le32(audio.length), audio);
    expect(readTags(f, 'x.wav')).toEqual({ artist: 'Skeleton', title: 'Bones' });
  });

  it('falls back to the file name without tags, or with damaged ones', () => {
    expect(readTags(audio, 'The Bats - Night Flight.mp3')).toEqual({ artist: 'The Bats', title: 'Night Flight' });
    const broken = cat('ID3', [3, 0, 0], syncsafe(5000), 'TIT2');
    expect(readTags(broken, '04 Night Flight.mp3')).toEqual({ artist: null, title: 'Night Flight' });
  });
});

describe('fromFileName', () => {
  it.each([
    ['The Bats - Night Flight.mp3', 'The Bats', 'Night Flight'],
    ['03 - The Bats - Night Flight (Live).flac', 'The Bats', 'Night Flight (Live)'],
    ['1. Night Flight.m4a', null, 'Night Flight'],
    ['02_night_flight.wav', null, 'night flight'],
    ['99 Balloons.mp3', null, '99 Balloons'],
    ['/music/The Bats – Night Flight.mp3', 'The Bats', 'Night Flight'],
  ])('%s', (name, artist, title) => {
    expect(fromFileName(name)).toEqual({ artist, title });
  });
});
