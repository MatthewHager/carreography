import { ChevronDown, Loader2, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { DownloadSheet } from '@/app/DownloadSheet';
import { unsupported } from '@/app/errors';
import { DEFAULT_PAINT, LineupEditor } from '@/app/LineupEditor';
import { LyricsNote } from '@/app/LyricsNote';
import { showFromFile } from '@/app/pipeline';
import { Player } from '@/app/player';
import { PlayerBar } from '@/app/PlayerBar';
import type { Show } from '@/app/show';
import { SongDrop } from '@/app/SongDrop';
import { Stage } from '@/app/Stage';
import { parseLineup } from '@/engine/vehicles';

/** The ?lineup= of the link, or YCY when it names a car we don't know. */
function startLineup(): string {
  try {
    return parseLineup(new URLSearchParams(location.search).get('lineup') ?? 'YCY');
  } catch {
    return 'YCY';
  }
}

export default function App() {
  const player = useMemo(() => new Player(), []);
  const [lineup, setLineup] = useState(startLineup);
  const [paints, setPaints] = useState<string[]>([]);
  const [song, setSong] = useState<File | null>(null);
  const [show, setShow] = useState<Show | null>(null);
  const [busy, setBusy] = useState<{ step: string; fraction?: number } | null>(null);
  const [camera, setCamera] = useState('3/4');
  const [open, setOpen] = useState(true);

  const onMissing = useCallback(() => toast.error("The 3D cars couldn't load. The show files still work."), []);
  const stale = show !== null && show.lineup !== lineup;
  const carPaints = useMemo(() => [...lineup].map((_, i) => paints[i] ?? DEFAULT_PAINT), [lineup, paints]);

  useEffect(() => player.load(show?.audio, show ? show.nFrames * 0.02 : 0), [player, show]);

  useEffect(() => {
    const why = unsupported();
    if (why) toast.error(why, { duration: Infinity });
  }, []);

  const build = async () => {
    if (!song) return;
    setBusy({ step: 'Starting' });
    try {
      setShow(await showFromFile(song, lineup, (step, fraction) => setBusy({ step, fraction })));
      if (window.innerWidth < 640) setOpen(false);     // on a phone, make room for the cars
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-background">
      <Stage lineup={lineup} paints={carPaints} show={stale ? null : show} player={player}
        camera={camera} onMissing={onMissing} />

      <div className="pointer-events-none absolute inset-0 flex flex-col p-3 sm:p-4">
        <div className="pointer-events-auto w-full max-w-sm space-y-3 rounded-2xl border bg-card p-4 shadow-2xl
          backdrop-blur-xl">
          <button className="flex w-full items-start justify-between gap-3 text-left" onClick={() => setOpen((o) => !o)}
            aria-expanded={open}>
            <div>
              <h1 className="text-base font-semibold tracking-tight">Carreography</h1>
              <p className="text-xs text-muted-foreground">
                {open || !show ? 'A light show for your Teslas, choreographed from your song.' : show.title}
              </p>
            </div>
            <ChevronDown className={`mt-1 size-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
          {open && (
            <>
              <SongDrop title={song?.name ?? null} disabled={!!busy}
                onSong={(f) => {
                  setSong(f);
                  setShow(null);
                }} />
              <Separator />
              <LineupEditor lineup={lineup} paints={carPaints} disabled={!!busy} onChange={(l, p) => {
                setLineup(l);
                setPaints(p);
              }} />
            </>
          )}
          {busy ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" /> {busy.step}…
              </div>
              <Progress value={busy.fraction === undefined ? null : busy.fraction * 100} />
            </div>
          ) : (
            open && (
              <Button className="w-full" variant={show && !stale ? 'secondary' : 'default'} disabled={!song}
                onClick={() => void build()}>
                <Sparkles /> {show && !stale ? 'Make it again' : 'Make the show'}
              </Button>
            )
          )}
          {show && !stale && !busy && open && <LyricsNote lyrics={show.lyrics} />}
          {show && !stale && !busy && <DownloadSheet show={show} />}
        </div>

        <div className="pointer-events-auto mx-auto mt-auto w-full max-w-3xl">
          <PlayerBar player={player} camera={camera} onCamera={setCamera} />
        </div>
      </div>
      <Toaster position="top-center" />
    </div>
  );
}
