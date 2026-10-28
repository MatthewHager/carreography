// What the show found of the song's lyrics: one quiet line under the panel.

import { MicVocal } from 'lucide-react';
import type { Show } from './show';

const SAID: Record<NonNullable<Show['lyrics']>['status'], string> = {
  found: 'found',
  none: 'not found',
  instrumental: 'none, it is instrumental',
  unsynced: 'found, but not timed',
  unplaced: "found, but they don't line up with this recording",
  failed: "couldn't reach LRCLIB",
};

export function LyricsNote({ lyrics }: { lyrics: NonNullable<Show['lyrics']> }) {
  const { status, lines, offset, tags } = lyrics;
  const asked = tags.artist ? `“${tags.title}” by ${tags.artist}` : `“${tags.title}”`;
  let said = SAID[status];
  if (status === 'found') {
    said += `, ${lines} lines`;
    if (offset !== null && Math.abs(offset) >= 0.5) said += `, moved ${offset > 0 ? '+' : ''}${offset.toFixed(1)} s to fit`;
  }
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground" title={`Looked up on lrclib.net as ${asked}`}>
      <MicVocal className="size-3.5 shrink-0" />
      <span className="truncate">Lyrics: {said}</span>
    </div>
  );
}
