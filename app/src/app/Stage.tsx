// The 3D view: the lineup on Tesla's own models, playing the show in time with the player.

import { useEffect, useRef } from 'react';
import { CarRig } from '@/viewer/rig';
import { simulate } from '@/viewer/core/simulate';
import { Viewer } from '@/viewer/viewer';
import type { AppModelId } from '@/viewer/car/appBody';
import { loadModel } from './models';
import type { Player } from './player';
import { bodyFor, CHANNELS, STEP_S, type Show } from './show';

const PAINT = { modely: '#e9eaec', cybertruck: '#b9bcc0' };

interface Props {
  lineup: string;
  show: Show | null;
  player: Player;
  camera: string;
  /** The models this lineup needs that haven't been added (empty when all are there). */
  onMissing: (ids: AppModelId[]) => void;
}

export function Stage({ lineup, show, player, camera, onMissing }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const viewer = useRef<Viewer | null>(null);
  const rigs = useRef<CarRig[]>([]);
  const showRef = useRef(show);
  showRef.current = show;

  useEffect(() => {
    const v = new Viewer(box.current!);
    v.setBloom(true);
    v.onTick = () => {
      const t = player.now();
      for (const r of rigs.current) r.setFrame(Math.floor(t / STEP_S), t);
    };
    viewer.current = v;
    return () => {
      v.dispose();
      box.current?.replaceChildren();
      viewer.current = null;
    };
  }, [player]);

  useEffect(() => {
    let live = true;
    const letters = [...lineup];
    const ids = [...new Set(letters.map((l) => bodyFor(l).model))];
    void Promise.all(ids.map(loadModel)).then((gltfs) => {
      if (!live || !viewer.current) return;
      const missing = ids.filter((_, i) => !gltfs[i]);
      onMissing(missing);
      if (missing.length) {
        viewer.current.setCars([]);
        rigs.current = [];
        return;
      }
      const byId = new Map(ids.map((id, i) => [id, gltfs[i]!]));
      const resized = letters.length !== viewer.current.carCount;
      const first = !viewer.current.hasCars;
      rigs.current = letters.map((l, i) => {
        const b = bodyFor(l);
        return new CarRig(b.kind, `Car${i + 1}`, b.yBody, PAINT[b.kind], { id: b.model, gltf: byId.get(b.model)! });
      });
      viewer.current.setCars(rigs.current);
      if (resized) viewer.current.flyTo(camera, first);
      applyShow(rigs.current, showRef.current);
    });
    return () => {
      live = false;
    };
    // the camera is applied by its own effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineup, onMissing]);

  useEffect(() => applyShow(rigs.current, show), [show]);

  useEffect(() => {
    viewer.current?.flyTo(camera);
  }, [camera]);

  return <div ref={box} className="absolute inset-0 touch-none [&>canvas]:block [&>canvas]:size-full" />;
}

function applyShow(rigs: CarRig[], show: Show | null) {
  rigs.forEach((rig, i) => {
    const car = show?.cars[i];
    rig.setSimulation(car ? simulate({
      channelCount: CHANNELS, frameCount: show!.nFrames, stepTimeMs: STEP_S * 1000, minorVersion: 0,
      uniqueId: 0n, variableHeaders: [], data: car.frames,
    }, rig.profile) : undefined);
  });
}
