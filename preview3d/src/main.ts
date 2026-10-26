import * as THREE from 'three';
// App shell: show list, audio playback and sync, scrub bar, camera presets,
// and building the three cars from Tesla's meshes.

import './style.css';
import { readFseq } from './core/fseq';
import { simulate } from './core/simulate';
import { loadTeslaAsset, fetchWithProgress, type TeslaAsset } from './car/teslaAssets';
import { CarRig, type CarKind, type YBody } from './rig';
import { CoolerFog } from './coolerFog';
import { CAMERA_PRESETS, Viewer } from './viewer';

interface ShowCar {
  name: string;
  kind: CarKind;
  fseq: string;
}
interface ShowEntry {
  audio: string;
  cars: ShowCar[];
}
type ShowList = Record<string, ShowEntry>;

const params = new URLSearchParams(location.search);
/** The project root, relative to this page (dist/index.html -> ../../). */
const ROOT = (params.get('root') ?? '../../').replace(/\/?$/, '/');
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
const initialY = params.get('ybody') === 'refresh' ? 'refresh' : 'mesh';
yBodySelect.value = initialY;
yBodySelect.addEventListener('change', async () => {
  rigKey = '';
  await ensureRigs(shows[currentShow]!);
  showTime(shownT);
  void reSimulate();
});

// --- cars ---------------------------------------------------------------------------

let assets: { modelS?: TeslaAsset; cybertruck?: TeslaAsset } = {};

async function loadAssets(): Promise<void> {
  const progress = new Map<string, number>();
  const report = (label: string, f: number) => {
    progress.set(label.split(':')[0]!, f);
    const total = [...progress.values()].reduce((a, b) => a + b, 0) / 2;
    setStatus(`Loading ${label}…`, total);
  };
  const [modelS, cybertruck] = await Promise.all([
    loadTeslaAsset('modelS', report),
    loadTeslaAsset('cybertruck', report),
  ]);
  assets = { modelS, cybertruck };
}

async function ensureRigs(show: ShowEntry): Promise<void> {
  const yBody = yBodySelect.value as YBody;
  const key = show.cars.map((c) => c.kind).join(',') + '|' + yBody;
  if (key === rigKey) return;
  setStatus('Building cars…');
  await new Promise((r) => setTimeout(r, 30));
  rigKey = key;
  rigs = show.cars.map(
    (c) => new CarRig(c.kind, c.name, yBody, c.kind === 'cybertruck' ? assets.cybertruck : assets.modelS, PAINT[c.kind]),
  );
  const first = !viewer.hasCars;
  viewer.setCars(rigs);
  if (!cooler) {
    // The candy station: a cyber cooler with dry ice and lights, in front of the lineup,
    // a step to the crowd's left of the truck so it does not hide the truck's nose.
    cooler = new CoolerFog();
    viewer.scene.add(cooler.group);
  }
  cooler.group.position.set(4.6, 0, 1.1);
  cooler.group.rotation.y = 0;   // long side parallel to the lineup, open chest toward the crowd
  if (first) viewer.flyTo(params.get('cam') ?? '3/4', true);
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
      const res = await fetch(ROOT + c.fseq, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`${c.fseq}: HTTP ${res.status}`);
      const f = readFseq(new Uint8Array(await res.arrayBuffer()));
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
    const bytes = await fetchWithProgress(ROOT + show.audio, (f) => token === loadToken && setStatus('Loading audio…', f));
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
  const res = await fetch(ROOT + 'preview/shows.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`preview/shows.json: HTTP ${res.status}`);
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
