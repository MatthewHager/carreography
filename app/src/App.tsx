import { ChevronDown, Loader2, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import type { AppModelId } from '@/viewer/car/appBody';
import { DownloadSheet } from '@/app/DownloadSheet';
import { LineupEditor } from '@/app/LineupEditor';
import { LyricsNote } from '@/app/LyricsNote';
import { ModelsCard } from '@/app/ModelsCard';
import { showFromBridge, showFromFile } from '@/app/pipeline';
import { Player } from '@/app/player';
import { PlayerBar } from '@/app/PlayerBar';
import type { Show } from '@/app/show';
import { SongDrop } from '@/app/SongDrop';
import { Stage } from '@/app/Stage';

const params = new URLSearchParams(location.search);

export default function App() {
  const player = useMemo(() => new Player(), []);
  const [lineup, setLineup] = useState(params.get('lineup') ?? 'YCY');
  const [song, setSong] = useState<File | null>(null);
  const [show, setShow] = useState<Show | null>(null);
  const [wav, setWav] = useState<Blob | undefined>();
  const [busy, setBusy] = useState<{ step: string; fraction?: number } | null>(null);
  const [missing, setMissing] = useState<AppModelId[]>([]);
  const [modelsVersion, setModelsVersion] = useState(0);
  const [camera, setCamera] = useState('3/4');
  const [open, setOpen] = useState(true);

  const onMissing = useCallback((ids: AppModelId[]) => setMissing(ids), []);
  const stale = show !== null && show.lineup !== lineup;

  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __show: Show | null }).__show = show;   // for checks
    player.load(show?.audio, show ? show.nFrames * 0.02 : 0);
  }, [player, show]);

  const make = useCallback(async (make: () => Promise<{ show: Show; wav?: Blob }>) => {
    setBusy({ step: 'Starting' });
    try {
      const made = await make();
      setShow(made.show);
      setWav(made.wav ?? made.show.audio);
      if (window.innerWidth < 640) setOpen(false);     // on a phone, make room for the cars
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  }, []);

  const progress = useCallback((step: string, fraction?: number) => setBusy({ step, fraction }), []);
  const bridge = import.meta.env.DEV ? params.get('bridge') : null;

  useEffect(() => {
    const dev = import.meta.env.DEV ? params.get('song') : null;    // a recording in output/, as if dropped in
    if (dev) {
      void fetch(`${import.meta.env.BASE_URL}dev/output/${dev}/${dev}.wav`).then(async (r) => {
        const f = new File([await r.blob()], `${dev}.wav`, { type: 'audio/wav' });
        setSong(f);
        void make(() => showFromFile(f, lineup, progress));
      });
    }
    if (bridge) void make(async () => ({ show: await showFromBridge(bridge, lineup, progress) }));
    // only on load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const build = () => {
    if (bridge) void make(async () => ({ show: await showFromBridge(bridge, lineup, progress) }));
    else if (song) void make(() => showFromFile(song, lineup, progress));
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-background">
      <Stage key={modelsVersion} lineup={lineup} show={stale ? null : show} player={player} camera={camera}
        onMissing={onMissing} />

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
              <SongDrop title={song?.name ?? (bridge ? `${bridge} (Python analysis)` : null)} disabled={!!busy}
                onSong={(f) => {
                  setSong(f);
                  setShow(null);
                }} />
              <Separator />
              <LineupEditor lineup={lineup} onChange={setLineup} disabled={!!busy} />
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
              <Button className="w-full" variant={show && !stale ? 'secondary' : 'default'} disabled={!song && !bridge}
                onClick={build}>
                <Sparkles /> {show && !stale ? 'Make it again' : 'Make the show'}
              </Button>
            )
          )}
          {show?.lyrics && !stale && !busy && open && <LyricsNote lyrics={show.lyrics} />}
          {show && !stale && !busy && <DownloadSheet show={show} wav={wav} />}
        </div>

        {missing.length > 0 && (
          <div className="pointer-events-auto mx-auto mt-auto mb-3 w-full max-w-md rounded-2xl border bg-card p-4
            shadow-2xl backdrop-blur-xl">
            <h2 className="mb-2 text-sm font-semibold">Add the car models</h2>
            <ModelsCard missing={missing} onAdded={() => setModelsVersion((v) => v + 1)} />
          </div>
        )}

        <div className={`pointer-events-auto mx-auto w-full max-w-3xl ${missing.length ? '' : 'mt-auto'}`}>
          <PlayerBar player={player} camera={camera} onCamera={setCamera} />
        </div>
      </div>
      <Toaster position="top-center" />
    </div>
  );
}
