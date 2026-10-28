// Adapted from Tesla Lightshow Studio (github.com/nathanjgrace/tesla-lightshow-studio, AGPL-3.0-only,
// Nathan Grace); modified for Carreography.
// Writer for FSEQ v2 uncompressed files, the format Tesla cars play.
// Layout (little-endian):
//
//   0  magic "PSEQ"          20 compression type (must be 0)
//   4  u16 channel data offset   21 # compression blocks
//   6  u8  minor version     22 # sparse ranges
//   7  u8  major version (2) 23 reserved
//   8  u16 fixed header length (32)   24 u64 unique id
//  10  u32 channel count     32 variable headers: u16 length, 2-char code, data
//  14  u32 frame count
//  18  u8  step time in ms
//  19  u8  flags
//
// Channel data follows at the data offset, frame by frame, one byte per
// channel. The data offset is padded up to a multiple of 4, as xLights does.

export interface VariableHeader {
  /** Two-character code, e.g. "mf" (media file) or "sp" (sequence producer). */
  code: string;
  data: Uint8Array;
}

export interface FseqFile {
  channelCount: number;
  frameCount: number;
  stepTimeMs: number;
  minorVersion: number;
  /** Stored as a bigint because it is a 64-bit value. */
  uniqueId: bigint;
  variableHeaders: VariableHeader[];
  /** frameCount * channelCount bytes, frame-major. */
  data: Uint8Array;
}

const MAGIC = 'PSEQ';
const FIXED_HEADER_LENGTH = 32;

export function writeFseq(file: FseqFile): Uint8Array<ArrayBuffer> {
  const { channelCount, frameCount, data } = file;
  if (data.length !== channelCount * frameCount) {
    throw new Error(
      `Data length ${data.length} does not match ${frameCount} frames x ${channelCount} channels`,
    );
  }
  const varLength = file.variableHeaders.reduce((sum, h) => sum + 4 + h.data.length, 0);
  const dataOffset = Math.ceil((FIXED_HEADER_LENGTH + varLength) / 4) * 4;
  if (dataOffset > 0xffff) throw new Error('Variable headers are too large');

  const out = new Uint8Array(dataOffset + data.length);
  const view = new DataView(out.buffer);
  for (let i = 0; i < 4; i++) out[i] = MAGIC.charCodeAt(i);
  view.setUint16(4, dataOffset, true);
  view.setUint8(6, file.minorVersion);
  view.setUint8(7, 2);
  view.setUint16(8, FIXED_HEADER_LENGTH, true);
  view.setUint32(10, channelCount, true);
  view.setUint32(14, frameCount, true);
  view.setUint8(18, file.stepTimeMs);
  // Bytes 19-23 (flags, compression, block/range counts, reserved) stay 0.
  view.setBigUint64(24, file.uniqueId, true);

  let offset = FIXED_HEADER_LENGTH;
  for (const h of file.variableHeaders) {
    if (h.code.length !== 2) throw new Error(`Variable header code must be 2 characters: "${h.code}"`);
    view.setUint16(offset, 4 + h.data.length, true);
    out[offset + 2] = h.code.charCodeAt(0);
    out[offset + 3] = h.code.charCodeAt(1);
    out.set(h.data, offset + 4);
    offset += 4 + h.data.length;
  }
  out.set(data, dataOffset);
  return out;
}

/** Builds a variable header holding a null-terminated string, as xLights writes them. */
export function stringHeader(code: string, value: string): VariableHeader {
  const encoded = new TextEncoder().encode(value);
  const data = new Uint8Array(encoded.length + 1);
  data.set(encoded);
  return { code, data };
}
