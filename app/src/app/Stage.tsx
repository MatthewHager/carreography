// The 3D view: the lineup on Tesla's own models, playing the show in time with the player.

import { useEffect, useRef, useState } from 'react';
import { CarRig } from '@/viewer/rig';
import { simulate } from '@/viewer/core/simulate';
import { Viewer } from '@/viewer/viewer';
import { loadModel, paintsFor } from './models';
import type { Player } from './player';
import { CHANNELS, modelFor, STEP_S, type Show } from './show';

interface Props {
  lineup: string;
  /** The app's paint name per car (paints.json); a car keeps its model's own paint without one. */
  paints: string[];
  show: Show | null;
  player: Player;
  camera: string;
  /** Called when a model this lineup needs couldn't be loaded. */
  onMissing: () => void;
}

export function Stage({ lineup, paints, show, player, camera, onMissing }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const viewer = useRef<Viewer | null>(null);
  const rigs = useRef<CarRig[]>([]);
  const showRef = useRef(show);
  showRef.current = show;
  const paintsRef = useRef(paints);
  paintsRef.current = paints;
  const [noGl, setNoGl] = useState(false);

  useEffect(() => {
    const el = box.current!;
    let v: Viewer;
    try {
      v = new Viewer(el);
    } catch (err) {
      console.warn('No 3D view:', err);
      setNoGl(true);
      return;
    }
    v.onTick = () => {
      const t = player.now();
      for (const r of rigs.current) r.setFrame(Math.floor(t / STEP_S), t);
    };
    // once the show plays, a device that can't keep up loses the bloom rather than the frame rate
    const unsubscribe = player.subscribe(() => player.playing && v.armPerfCheck());
    viewer.current = v;
    return () => {
      unsubscribe();
      v.dispose();
      el.replaceChildren();
      viewer.current = null;
    };
  }, [player]);

  useEffect(() => {
    let live = true;
    const letters = [...lineup];
    const ids = [...new Set(letters.map(modelFor))];
    void Promise.all(ids.map(loadModel)).then((gltfs) => {
      if (!live || !viewer.current) return;
      if (gltfs.some((g) => !g)) {
        onMissing();
        viewer.current.setCars([]);
        rigs.current = [];
        return;
      }
      const byId = new Map(ids.map((id, i) => [id, gltfs[i]!]));
      const resized = letters.length !== viewer.current.carCount;
      const first = !viewer.current.hasCars;
      rigs.current = letters.map((l, i) => new CarRig(`Car${i + 1}`, { id: modelFor(l), gltf: byId.get(modelFor(l))! }));
      viewer.current.setCars(rigs.current);
      if (resized) viewer.current.flyTo(camera, first);
      applyShow(rigs.current, showRef.current);
      applyPaints(rigs.current, letters, paintsRef.current);
    });
    return () => {
      live = false;
    };
    // the camera is applied by its own effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineup, onMissing]);

  useEffect(() => applyShow(rigs.current, show), [show]);

  useEffect(() => {
    if (rigs.current.length === lineup.length) applyPaints(rigs.current, [...lineup], paints);
  }, [lineup, paints]);

  useEffect(() => {
    viewer.current?.flyTo(camera);
  }, [camera]);

  if (noGl) {
    return (
      <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted-foreground">
        <p className="max-w-xs">This browser can't show the 3D preview: WebGL is turned off or unavailable. The light
          show files still work.</p>
      </div>
    );
  }
  return <div ref={box} className="absolute inset-0 touch-none [&>canvas]:block [&>canvas]:size-full" />;
}

function applyShow(rigs: CarRig[], show: Show | null) {
  rigs.forEach((rig, i) => {
    const car = show?.cars[i];
    rig.setSimulation(car ? simulate({
      channelCount: CHANNELS, frameCount: show!.nFrames, stepTimeMs: STEP_S * 1000, data: car.frames,
    }, rig.profile) : undefined);
  });
}

function applyPaints(rigs: CarRig[], letters: string[], paints: string[]) {
  rigs.forEach((rig, i) => {
    void paintsFor(modelFor(letters[i]!)).then((table) => rig.setPaint(table.find((p) => p.name === paints[i]) ?? null));
  });
}
