// The page video.ts films: the app's own 3D stage (viewer/), stepped to one moment of the show at a time.

import { loadModel } from '@/app/models';
import { modelFor } from '@/app/show';
import { N_CHANNELS, STEP_MS } from '@/engine/channels';
import { simulate } from '@/viewer/core/simulate';
import { CarRig } from '@/viewer/rig';
import { Viewer } from '@/viewer/viewer';

let rigs: CarRig[] = [];
let time = 0;
const viewer = new Viewer(document.getElementById('stage')!);
viewer.onTick = () => {
  for (const r of rigs) r.setFrame(Math.floor(time / (STEP_MS / 1000)), time);
};
const painted = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

const film = {
  /** The lineup on Tesla's models, each car playing its show bytes (fetched from /__film/<i>). */
  async load(lineup: string, nFrames: number, camera: string): Promise<void> {
    const letters = [...lineup];
    const gltfs = await Promise.all(letters.map((l) => loadModel(modelFor(l))));
    if (gltfs.some((g) => !g)) throw new Error("Tesla's car models are missing: see public/models/tesla-app");
    rigs = letters.map((l, i) => new CarRig(`Car${i + 1}`, { id: modelFor(l), gltf: gltfs[i]! }));
    viewer.setCars(rigs);
    viewer.flyTo(camera, true);
    await Promise.all(rigs.map(async (rig, i) => {
      const data = new Uint8Array(await (await fetch(`/__film/${i}`)).arrayBuffer());
      const show = { channelCount: N_CHANNELS, frameCount: nFrames, stepTimeMs: STEP_MS, data };
      rig.setSimulation(simulate(show, rig.profile));
    }));
    await painted();
  },
  /** Shows the moment t seconds into the song, once it has been drawn. */
  async seek(t: number): Promise<void> {
    time = t;
    await painted();
  },
};

(window as unknown as { film: typeof film }).film = film;
