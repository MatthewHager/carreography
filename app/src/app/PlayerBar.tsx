// Play, pause and scrub the show; pick a camera.

import { Pause, Play } from 'lucide-react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { CAMERA_PRESETS } from '@/viewer/viewer';
import type { Player } from './player';

function fmt(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.floor(t - m * 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** The player's position, refreshed a few times a second while it plays. */
function usePosition(player: Player): number {
  const [t, setT] = useState(0);
  const playing = useSyncExternalStore((fn) => player.subscribe(fn), () => player.playing);
  useEffect(() => {
    setT(player.now());
    if (!playing) return player.subscribe(() => setT(player.now()));
    const id = setInterval(() => setT(player.now()), 100);
    return () => clearInterval(id);
  }, [player, playing]);
  return t;
}

export function PlayerBar({ player, camera, onCamera }: { player: Player; camera: string; onCamera: (c: string) => void }) {
  const playing = useSyncExternalStore((fn) => player.subscribe(fn), () => player.playing);
  const duration = useSyncExternalStore((fn) => player.subscribe(fn), () => player.duration);
  const t = usePosition(player);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        player.toggle();
      } else if (e.code === 'ArrowLeft') player.seek(player.now() - (e.shiftKey ? 1 : 5));
      else if (e.code === 'ArrowRight') player.seek(player.now() + (e.shiftKey ? 1 : 5));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [player]);

  return (
    <div className="flex w-full items-center gap-3 rounded-2xl border bg-card px-3 py-2 shadow-2xl backdrop-blur-xl">
      <Button size="icon" variant="secondary" disabled={!duration} onClick={() => player.toggle()}
        aria-label={playing ? 'Pause' : 'Play'}>
        {playing ? <Pause /> : <Play />}
      </Button>
      <span className="w-24 shrink-0 text-xs tabular-nums text-muted-foreground">
        {fmt(t)} / {fmt(duration)}
      </span>
      <Slider className="min-w-24 flex-1" min={0} max={duration || 1} step={0.02} value={[Math.min(t, duration)]}
        disabled={!duration} onValueChange={([v]) => player.seek(v)} aria-label="Position" />
      <ToggleGroup type="single" size="sm" value={camera} onValueChange={(v) => v && onCamera(v)}
        className="hidden sm:flex" aria-label="Camera">
        {CAMERA_PRESETS.map((p) => (
          <ToggleGroupItem key={p.name} value={p.name} className="px-2.5 text-xs">{p.name}</ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
