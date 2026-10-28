// Choose the song.

import { Music } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';

export function SongDrop({ title, disabled, onSong }: { title: string | null; disabled?: boolean; onSong: (f: File) => void }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'audio/*': ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg'] },
    multiple: false,
    disabled,
    onDrop: (files) => files[0] && onSong(files[0]),
    onDropRejected: ([r]) => r && toast.error(r.errors[0]?.code === 'too-many-files' ? 'One song at a time, please'
      : `${r.file.name} isn't a song file. Choose an MP3, M4A, WAV or FLAC.`),
  });
  return (
    <div {...getRootProps()}
      className={`flex cursor-pointer items-center gap-3 rounded-xl border border-dashed px-3 py-3 transition-colors
        ${isDragActive ? 'border-ring bg-accent/40' : 'hover:bg-accent/30'} ${disabled ? 'pointer-events-none opacity-60' : ''}`}>
      <input {...getInputProps()} />
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
        <Music className="size-4" />
      </div>
      <div className="min-w-0 text-sm">
        {title ? (
          <>
            <div className="truncate font-medium">{title}</div>
            <div className="text-xs text-muted-foreground">Drop another song to replace it</div>
          </>
        ) : (
          <>
            <div className="font-medium">Choose a song</div>
            <div className="text-xs text-muted-foreground">MP3, WAV, FLAC or M4A. It stays on this device.</div>
          </>
        )}
      </div>
    </div>
  );
}
