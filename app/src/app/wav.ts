// The show's audio as Tesla wants it: a 44.1 kHz, 16-bit stereo WAV.

export function encodeWav(channels: Float32Array[], sampleRate = 44100): Blob {
  const left = channels[0], right = channels[1] ?? channels[0];
  const n = left.length;
  const out = new DataView(new ArrayBuffer(44 + n * 4));
  const text = (at: number, s: string) => [...s].forEach((c, i) => out.setUint8(at + i, c.charCodeAt(0)));
  text(0, 'RIFF');
  out.setUint32(4, 36 + n * 4, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  out.setUint32(16, 16, true);
  out.setUint16(20, 1, true);
  out.setUint16(22, 2, true);
  out.setUint32(24, sampleRate, true);
  out.setUint32(28, sampleRate * 4, true);
  out.setUint16(32, 4, true);
  out.setUint16(34, 16, true);
  text(36, 'data');
  out.setUint32(40, n * 4, true);
  const s16 = (x: number) => Math.max(-32768, Math.min(32767, Math.round(x * 32767)));
  for (let i = 0; i < n; i++) {
    out.setInt16(44 + i * 4, s16(left[i]), true);
    out.setInt16(46 + i * 4, s16(right[i]), true);
  }
  return new Blob([out.buffer], { type: 'audio/wav' });
}
