import * as THREE from 'three';
// App shell: show list, audio playback and sync, scrub bar, camera presets,
// and building the lineup (1 to 5 cars) from Tesla's meshes.

import './style.css';
import { readFseq } from './core/fseq';
import { simulate } from './core/simulate';
import { loadTeslaAsset, fetchWithProgress, type TeslaAsset } from './car/teslaAssets';
import { CarRig, type CarKind, type YBody } from './rig';
import { loadAppModel, type AppModelId } from './car/appBody';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CoolerFog } from './coolerFog';
import { CAMERA_PRESETS, Viewer } from './viewer';

interface ShowCar {
  name: string;
  kind: CarKind;
  /** Which body to draw (lightshow/vehicles.py); without it the Model Y menu decides. */
  body?: 'modely2025' | 'modely2020' | 'cybertruck';
  fseq: string;
}
interface ShowEntry {
  audio: string;
  cars: ShowCar[];
}
type ShowList = Record<string, ShowEntry>;

const params = new URLSearchParams(location.search);
/** The project root, relative to this page (dist/index.html -> ../../); a published copy that keeps
 *  everything beside the page says so with <meta name="show-root" content="./">. */
const ROOT = (
  params.get('root') ?? document.querySelector('meta[name="show-root"]')?.getAttribute('content') ?? '../../'
).replace(/\/?$/, '/');
/** The show list: ?manifest=<url of a shows.json> (paths in it are relative to it, e.g. a build
 *  from webapp/ or build.py --out), else the project's preview/shows.json (paths relative to ROOT). */
const MANIFEST = new URL(params.get('manifest') ?? ROOT + 'preview/shows.json', location.href);
const BASE = params.get('manifest') ? MANIFEST : new URL(ROOT, location.href);
const showUrl = (path: string) => new URL(path, BASE).href;
const PAINT: Record<CarKind, string> = { modely: '#e9eaec', cybertruck: '#b9bcc0' };

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const stage = $<HTMLDivElement>('stage');
const showSelect = $<HTMLSelectElement>('show');
const playBtn = $<HTMLButtonElement>('play');
const scrub = $<HTMLInputElement>('scrub');
const timeLabel = $<HTMLSpanElement>('time');
const status = $<HTMLDivElement>('status');
const statusText = $<HTMLDivElement>('statusText');
const bar = $<HTMLDivElement>('progressBar');
const yBodySelect = $<HTMLSelectElement>('ybody');
const camButtons = $<HTMLDivElement>('cams');
const fpsLabel = $<HTMLSpanElement>('fps');

const viewer = new Viewer(stage);
const audio = new Audio();
audio.preload = 'auto';
// iOS: play through the speaker even with the silent switch on? Not
// controllable from the web; it plays like any page audio.

let shows: ShowList = {};
let currentShow = '';
let rigs: CarRig[] = [];
let cooler: CoolerFog | undefined;
let rigKey = '';
let durationS = 0;
let stepMs = 20;
let audioUrl: string | undefined;
let audioReady = false;
let playing = false;
/** Show time while paused, or where wall-clock playback started. */
let pausedAt = 0;
let wallStart = 0;
let lastAudioT = -1;
let lastAudioWall = 0;
let shownT = 0;
let scrubbing = false;
let loadToken = 0;

// --- status overlay -----------------------------------------------------------

function setStatus(text: string | undefined, fraction?: number): void {
  if (text === undefined) {
    status.hidden = true;
    return;
  }
  status.hidden = false;
  statusText.textContent = text;
  bar.style.width = fraction === undefined ? '0' : `${Math.round(fraction * 100)}%`;
  bar.parentElement!.hidden = fraction === undefined;
}

// --- time -----------------------------------------------------------------------

function nowS(): number {
  if (!playing) return pausedAt;
  const wall = performance.now();
  if (audioReady && !audio.paused) {
    const at = audio.currentTime;
    if (at !== lastAudioT) {
      lastAudioT = at;
      lastAudioWall = wall;
    }
    // currentTime advances in coarse steps in some browsers: extrapolate.
    return lastAudioT + Math.min(0.3, (wall - lastAudioWall) / 1000);
  }
  if (audioReady) return audio.currentTime; // waiting to start
  return pausedAt + (wall - wallStart) / 1000;
}

function fmt(t: number): string {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, '0')}`;
}

function showTime(t: number): void {
  for (const r of rigs) r.setFrame(Math.floor((t * 1000) / stepMs), t);
  timeLabel.textContent = `${fmt(t)} / ${fmt(durationS)}`;
  if (!scrubbing) scrub.value = String(t);
}

let lastTick = performance.now();
viewer.onTick = () => {
  const nowMs = performance.now();
  const dt = Math.min(0.1, (nowMs - lastTick) / 1000);
  lastTick = nowMs;
  cooler?.update(dt);
  let t = nowS();
  // Keep time monotonic through small audio-clock jitter; follow real jumps.
  if (playing && t < shownT && shownT - t < 0.12) t = shownT;
  if (playing && t >= durationS && durationS > 0) {
    pause();
    t = durationS;
    pausedAt = durationS;
  }
  if (t !== shownT || playing) {
    shownT = t;
    showTime(t);
  }
  fpsLabel.textContent = viewer.fps ? `${Math.round(viewer.fps)} fps` : '';
};

async function play(): Promise<void> {
  if (!currentShow || !rigs.length) return;
  if (pausedAt >= durationS - 0.05) pausedAt = 0;
  playing = true;
  playBtn.textContent = 'Pause';
  playBtn.classList.add('on');
  viewer.armPerfCheck();
  if (audioReady) {
    audio.currentTime = pausedAt;
    lastAudioT = -1;
    try {
      await audio.play();
    } catch (err) {
      console.warn('Audio would not play', err);
      // Fall back to silent wall-clock playback.
      audioReady = false;
      wallStart = performance.now();
    }
  } else {
    wallStart = performance.now();
  }
}

function pause(): void {
  if (!playing) return;
  pausedAt = nowS();
  playing = false;
  audio.pause();
  playBtn.textContent = 'Play';
  playBtn.classList.remove('on');
}

function seek(t: number): void {
  t = Math.max(0, Math.min(durationS, t));
  pausedAt = t;
  shownT = t;
  if (playing) {
    if (audioReady) {
      audio.currentTime = t;
      lastAudioT = -1;
    } else {
      wallStart = performance.now();
    }
  }
  showTime(t);
}

playBtn.addEventListener('click', () => {
  if (playing) pause();
  else void play();
});
scrub.addEventListener('input', () => {
  scrubbing = true;
  seek(Number(scrub.value));
});
scrub.addEventListener('change', () => {
  scrubbing = false;
  seek(Number(scrub.value));
});
audio.addEventListener('ended', () => {
  if (playing) {
    pause();
    pausedAt = durationS;
  }
});
window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLSelectElement || e.target instanceof HTMLInputElement) {
    if (e.target !== scrub) return;
  }
  if (e.code === 'Space') {
    e.preventDefault();
    if (playing) pause();
    else void play();
  } else if (e.code === 'ArrowLeft') {
    seek(nowS() - (e.shiftKey ? 1 : 5));
  } else if (e.code === 'ArrowRight') {
    seek(nowS() + (e.shiftKey ? 1 : 5));
  }
});

// --- camera and options ---------------------------------------------------------------

for (const p of CAMERA_PRESETS) {
  const b = document.createElement('button');
  b.textContent = p.name;
  b.addEventListener('click', () => viewer.flyTo(p.name));
  camButtons.appendChild(b);
}
// Bloom is always on (it switches itself off only if frames get slow); the dry lot is the look.
viewer.setBloom(true);
const labelsBox = $<HTMLInputElement>('labels');
labelsBox.checked = params.get('labels') === '1';
labelsBox.addEventListener('change', () => viewer.setLabels(labelsBox.checked));
viewer.onAutoBloomOff = () => console.info('Bloom switched off: frames were slow');
// Model Ys whose show doesn't say which they are: 2025+ ("Juniper", front light bar) unless
// ?ybody=mesh asks for a 2020-24 one.
const initialY = params.get('ybody') === 'mesh' ? 'mesh' : 'refresh';
yBodySelect.value = initialY;
yBodySelect.addEventListener('change', async () => {
  rigKey = '';
  await ensureRigs(shows[currentShow]!);
  showTime(shownT);
  void reSimulate();
});

/** A show file's bytes. A published copy (claude.ai pages serve no binary types) keeps each one
 *  gzipped and base64-encoded as `<name>.fseq.gz.b64.txt`. */
async function fetchShowFile(path: string): Promise<Uint8Array> {
  const res = await fetch(showUrl(path), { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  if (!path.endsWith('.gz.b64.txt')) return new Uint8Array(await res.arrayBuffer());
  const packed = Uint8Array.from(atob((await res.text()).trim()), (ch) => ch.charCodeAt(0));
  const stream = new Blob([packed]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

// --- cars ---------------------------------------------------------------------------

let assets: { modelS?: TeslaAsset; cybertruck?: TeslaAsset; app: Partial<Record<AppModelId, GLTF>> } = { app: {} };

function bodyOf(c: ShowCar): YBody {
  if (c.body === 'modely2020') return 'mesh';
  if (c.body === 'modely2025') return 'refresh';
  return yBodySelect.value as YBody;
}

/** Which of Tesla's app models draws a car (appBody.ts); ?models=classic uses the older meshes. */
function appModelFor(c: ShowCar): AppModelId {
  return c.kind === 'cybertruck' ? 'cybertruck' : bodyOf(c) === 'mesh' ? 'y_high' : 'bayberry';
}

async function loadAssets(): Promise<void> {
  const progress = new Map<string, number>();
  const report = (label: string, f: number) => {
    progress.set(label.split(':')[0]!, f);
    const total = [...progress.values()].reduce((a, b) => a + b, 0) / Math.max(1, progress.size);
    setStatus(`Loading ${label}…`, total);
  };
  // Tesla's app models when they've been extracted (python3 -m lightshow.tesla_app_models), else
  // the meshes from Tesla's light-show repo.
  if (params.get('models') !== 'classic') {
    const ids: AppModelId[] = ['bayberry', 'y_high', 'cybertruck'];
    const loaded = await Promise.all(ids.map((id) => loadAppModel(id, (f) => report(`car models: ${id}`, f)).catch(() => undefined)));
    ids.forEach((id, i) => {
      if (loaded[i]) assets.app[id] = loaded[i];
    });
  }
  const need = (id: AppModelId) => !assets.app[id];
  const [modelS, cybertruck] = await Promise.all([
    need('bayberry') || need('y_high') ? loadTeslaAsset('modelS', report) : undefined,
    need('cybertruck') ? loadTeslaAsset('cybertruck', report) : undefined,
  ]);
  assets = { ...assets, modelS, cybertruck };
}

async function ensureRigs(show: ShowEntry): Promise<void> {
  // The Model Y menu only matters for Model Ys whose show doesn't name their body.
  yBodySelect.hidden = !show.cars.some((c) => c.kind === 'modely' && !c.body);
  const key = show.cars.map((c) => `${c.kind}:${bodyOf(c)}`).join(',');
  if (key === rigKey) return;
  setStatus('Building cars…');
  await new Promise((r) => setTimeout(r, 30));
  rigKey = key;
  rigs = show.cars.map(
    (c) => {
      const id = appModelFor(c);
      const gltf = assets.app[id];
      return new CarRig(c.kind, c.name, bodyOf(c), c.kind === 'cybertruck' ? assets.cybertruck : assets.modelS, PAINT[c.kind],
        gltf && { id, gltf });
    },
  );
  const first = !viewer.hasCars;
  const resized = rigs.length !== viewer.carCount;
  viewer.setCars(rigs);
  if (!cooler && params.get('cooler') === '1') {
    // ?cooler=1: a cyber cooler with dry ice and lights in front of the lineup (a candy station),
    // a step to the crowd's left of centre so it does not hide the middle car's nose.
    cooler = new CoolerFog();
    viewer.scene.add(cooler.group);
    cooler.group.position.set(4.6, 0, 1.1);
    cooler.group.rotation.y = 0;   // long side parallel to the lineup, open chest toward the crowd
  }
  if (resized) viewer.flyTo(params.get('cam') ?? '3/4', first);   // a longer or shorter lineup: refit
  (window as unknown as { __rigs: CarRig[] }).__rigs = rigs;
}

let fseqCache = new Map<string, ReturnType<typeof readFseq>>();

async function reSimulate(): Promise<void> {
  const show = shows[currentShow];
  if (!show) return;
  show.cars.forEach((c, i) => {
    const f = fseqCache.get(c.fseq);
    if (f && rigs[i]) rigs[i]!.setSimulation(simulate(f, rigs[i]!.profile));
  });
  showTime(shownT);
}

async function loadShow(name: string): Promise<void> {
  const token = ++loadToken;
  const show = shows[name];
  if (!show) return;
  pause();
  currentShow = name;
  audioReady = false;
  audio.removeAttribute('src');
  audio.load();
  if (audioUrl) URL.revokeObjectURL(audioUrl);
  audioUrl = undefined;
  const url = new URL(location.href);
  url.searchParams.set('show', name);
  history.replaceState(null, '', url);

  await ensureRigs(show);
  setStatus('Loading light show…');
  fseqCache = new Map();
  const files = await Promise.all(
    show.cars.map(async (c) => {
      const f = readFseq(await fetchShowFile(c.fseq));
      fseqCache.set(c.fseq, f);
      return f;
    }),
  );
  if (token !== loadToken) return;
  stepMs = files[0]!.stepTimeMs;
  durationS = Math.max(...files.map((f) => (f.frameCount * f.stepTimeMs) / 1000));
  await reSimulate();
  scrub.max = String(durationS);
  scrub.step = String(stepMs / 1000);
  pausedAt = 0;
  shownT = 0;
  showTime(0);

  // Audio: fetched whole and played from a blob, because python's
  // http.server can't answer range requests and Safari insists on them.
  setStatus('Loading audio…', 0);
  try {
    const bytes = await fetchWithProgress(showUrl(show.audio), (f) => token === loadToken && setStatus('Loading audio…', f));
    if (token !== loadToken) return;
    audioUrl = URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }));
    audio.src = audioUrl;
    audio.load();
    audioReady = true;
    setStatus(undefined);
  } catch (err) {
    console.warn(err);
    setStatus(`Audio unavailable (${(err as Error).message}); playing silently.`);
    setTimeout(() => setStatus(undefined), 4000);
  }
}

showSelect.addEventListener('change', () => {
  void loadShow(showSelect.value).catch(fail);
});

function fail(err: unknown): void {
  console.error(err);
  setStatus(`Error: ${(err as Error).message ?? err}`);
}

async function main(): Promise<void> {
  setStatus('Loading show list…');
  const res = await fetch(MANIFEST.href, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${MANIFEST.pathname}: HTTP ${res.status}`);
  shows = (await res.json()) as ShowList;
  for (const name of Object.keys(shows)) {
    const o = document.createElement('option');
    o.value = name;
    o.textContent = name.replace(/^(\d+)_/, '$1 · ').replace(/_/g, ' ');
    showSelect.appendChild(o);
  }
  const wanted = params.get('show');
  const first = wanted && shows[wanted] ? wanted : Object.keys(shows)[0];
  if (!first) throw new Error('shows.json lists no shows');
  showSelect.value = first;
  await loadAssets();
  await loadShow(first);
  const t = Number(params.get('t'));
  if (t > 0) seek(t);
}

// Frame-accurate recording for review videos (tools/frame_sink.py receives the frames, and
// tools/video_review.py turns them into an MP4 with the song's audio). The stage is pinned to a
// fixed 1280x720 view and a locked front camera, so a resized pane can't change the shot, and
// every frame is rendered at an exact time however slowly it renders.
const recorder = {
  state: { done: 0, total: 0, running: false, err: '' as string },
  pose: undefined as { p: THREE.Vector3; t: THREE.Vector3 } | undefined,
  out: undefined as HTMLCanvasElement | undefined,
  size: { w: 0, h: 0 },
  async setup(zoom = 0.8): Promise<void> {
    const vw = viewer as unknown as {
      container: { clientWidth: number; clientHeight: number };
      resize(): void;
      tween?: unknown;
      camera: THREE.PerspectiveCamera;
      controls: { target: THREE.Vector3; enabled: boolean; update(dt: number): void };
    };
    vw.container = { clientWidth: 1280, clientHeight: 720 };
    vw.resize();
    viewer.flyTo('Front', true);
    vw.tween = undefined;
    const cam = vw.camera;
    const tg = vw.controls.target;
    cam.position.sub(tg).multiplyScalar(zoom).add(tg);
    tg.y += 0.15;
    vw.controls.update(0);
    vw.controls.enabled = false;
    this.pose = { p: cam.position.clone(), t: tg.clone() };
    pause();
    const cv = document.querySelector('canvas')!;
    this.size = { w: cv.width, h: cv.height };
    this.out = document.createElement('canvas');
    this.out.width = 1280;
    this.out.height = 720;
  },
  async grab(path: string, t: number, sink = 'http://127.0.0.1:8767/'): Promise<void> {
    const vw = viewer as unknown as {
      tween?: unknown;
      camera: THREE.PerspectiveCamera;
      controls: { target: THREE.Vector3 };
      frame(): void;
    };
    const cv = document.querySelector('canvas')!;
    if (cv.width !== this.size.w || cv.height !== this.size.h) throw new Error(`canvas resized to ${cv.width}x${cv.height}`);
    vw.tween = undefined;
    vw.camera.position.copy(this.pose!.p);
    vw.controls.target.copy(this.pose!.t);
    vw.camera.lookAt(this.pose!.t);
    seek(t);
    vw.frame();
    this.out!.getContext('2d')!.drawImage(cv, 0, 0, 1280, 720);
    const blob = await new Promise<Blob | null>((res) => this.out!.toBlob(res, 'image/jpeg', 0.82));
    await fetch(sink + path, { method: 'POST', body: blob });
  },
  async shoot(dir: string, times: number[]): Promise<number> {
    for (let i = 0; i < times.length; i++) await this.grab(`${dir}/${String(i).padStart(5, '0')}.jpg`, times[i]!);
    return times.length;
  },
  async record(dir: string, fps: number, start = 0): Promise<void> {
    const n = Math.floor(durationS * fps);
    this.state = { done: start, total: n, running: true, err: '' };
    try {
      for (let i = start; i < n && this.state.running; i++) {
        await this.grab(`${dir}/${String(i).padStart(5, '0')}.jpg`, i / fps);
        this.state.done = i + 1;
      }
    } catch (e) {
      this.state.err = String(e);
    }
    this.state.running = false;
  },
};

// Hooks for automated checks (seek/play from the browser console).
(window as unknown as Record<string, unknown>).__viewer = {
  viewer,
  audio,
  seek,
  play,
  pause,
  recorder,
  time: () => shownT,
  get duration() {
    return durationS;
  },
  get rigs() {
    return rigs;
  },
};

main().catch(fail);
