// The 3D view: renderer, night parking lot, camera presets, bloom, and the
// three cars of the lineup with their glow sprites. Renderer and post setup
// follow tesla-lightshow-studio's CarScene.ts (AGPL-3.0), tuned for iPad
// Safari: devicePixelRatio capped at 1.5, no real-time lights from the cars,
// bloom at reduced resolution and switched off automatically when slow.

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { buildLot, lotEnvironment, type Lot } from './car/lot';
import { shadowTexture } from './car/kit';
import { GlowLayer } from './glow';
import type { CarRig } from './rig';

export interface CameraPreset {
  name: string;
  position: [number, number, number];
  target: [number, number, number];
}

// The crowd stands at +x, looking back toward -x at the cars' fronts.
export const CAMERA_PRESETS: CameraPreset[] = [
  { name: '3/4', position: [10.5, 4.2, 9.5], target: [0, 0.8, 0] },
  { name: 'Front', position: [15.5, 2.1, 0], target: [0, 0.9, 0] },
  { name: 'Rear', position: [-14.5, 3.4, 0], target: [0, 0.9, 0] },
  { name: 'Top', position: [0.01, 21, 0], target: [0, 0, 0] },
];

const MAX_DPR = 1.5;

export class Viewer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(36, 1, 0.1, 250);
  readonly controls: OrbitControls;
  private readonly composer: EffectComposer;
  private readonly bloom: UnrealBloomPass;
  private readonly glow = new GlowLayer();
  private readonly lot: Lot;
  private readonly lineup = new THREE.Group();
  private cars: CarRig[] = [];
  private bloomOn = true;
  private size = { w: 0, h: 0 };
  private tween: { from: THREE.Vector3; to: THREE.Vector3; tFrom: THREE.Vector3; tTo: THREE.Vector3; start: number } | undefined;
  private raf = 0;
  private dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  /** Called every frame before rendering (the app updates the show time here). */
  onTick: (() => void) | undefined;
  /** Called when the viewer turns bloom off by itself because frames are slow. */
  onAutoBloomOff: (() => void) | undefined;
  private perf = { frames: 0, time: 0, armed: false, checked: false };
  fps = 0;
  private fpsAcc = { frames: 0, since: performance.now() };

  constructor(private readonly container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    container.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color('#05070a');
    this.scene.fog = new THREE.Fog('#05070a', 28, 70);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(lotEnvironment(), 0.02).texture;
    this.scene.environmentIntensity = 0.25;
    pmrem.dispose();

    // Night: a soft sky fill and a high moon, enough to read the cars' shapes
    // without competing with their lights.
    this.scene.add(new THREE.HemisphereLight('#9aa6bd', '#262626', 1.1));
    const moon = new THREE.DirectionalLight('#c9d4ff', 0.9);
    moon.position.set(-4, 8, 5);
    this.scene.add(moon);

    this.lot = buildLot(this.scene);
    this.scene.add(this.lineup);
    this.scene.add(this.glow.points);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.minDistance = 2.5;
    this.controls.maxDistance = 45;
    this.controls.maxPolarAngle = Math.PI * 0.495;
    this.controls.addEventListener('start', () => (this.tween = undefined));
    const p0 = CAMERA_PRESETS[0]!;
    this.camera.position.set(...p0.position);
    this.controls.target.set(...p0.target);

    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(this.renderer, target);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    // Tight and gentle, so neighbouring LEDs of a light bar stay distinct.
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.38, 0.05, 0.95);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.resize();
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      this.frame();
    };
    loop();
  }

  get hasCars(): boolean {
    return this.cars.length > 0;
  }

  setCars(cars: CarRig[]): void {
    for (const c of this.cars) c.dispose();
    this.cars = cars;
    // Left to right facing the crowd (crowd at +x, so their left is +z):
    // a shallow V with the centre car about 1 m forward, the outer cars
    // toed in a little toward the crowd's centre.
    const n = cars.length;
    const frontX = 1.9;
    const gap = 0.85;
    const widths = cars.map((c) => c.bounds.halfWidth);
    let z = 0;
    const zs: number[] = [];
    for (let i = 0; i < n; i++) {
      if (i > 0) z -= widths[i - 1]! + widths[i]! + gap;
      zs.push(z);
    }
    const mid = (zs[0]! + zs[n - 1]!) / 2;
    cars.forEach((car, i) => {
      const offset = (i - (n - 1) / 2) / Math.max(1, (n - 1) / 2); // -1 .. 1
      const forward = 1 - Math.abs(offset); // 1 at the centre
      car.group.position.set(frontX + forward * 1.0 - car.bounds.halfLength, 0, zs[i]! - mid);
      car.group.rotation.y = -offset * THREE.MathUtils.degToRad(6);
      this.lineup.add(car.group);
      // Contact shadow.
      const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(car.bounds.halfLength * 2.3, car.bounds.halfWidth * 2.4),
        new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }),
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.006;
      car.group.add(shadow);
    });
    this.lineup.updateMatrixWorld(true);
    this.glow.setEntries(cars.flatMap((c) => c.glowEntries));
    // Labels (the "Labels" checkbox, or ?labels=1): the car's name as the crowd sees it (= which
    // USB stick it gets) and which physical side is the vehicle's LEFT (driver's side) - on the
    // crowd's right when facing the front.
    this.labels = [];
    {
      cars.forEach((car) => {
        const tag = (text: string, color: string, x: number, y: number, z: number, w = 2.2) => {
          const cv = document.createElement('canvas');
          cv.width = 512; cv.height = 128;
          const g = cv.getContext('2d')!;
          g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, 0, 512, 128);
          g.fillStyle = color; g.font = 'bold 64px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillText(text, 256, 64);
          const tex = new THREE.CanvasTexture(cv);
          const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
          sp.position.set(x, y, z); sp.scale.set(w, w / 4, 1); sp.renderOrder = 20;
          sp.visible = this.labelsOn;
          car.group.add(sp);
          this.labels.push(sp);
        };
        tag(car.name.replace(/_/g, ' '), '#ffffff', car.bounds.halfLength * 0.2, car.bounds.height + 0.9, 0);
        // Tesla's mesh: x forward, y up, z right; the vehicle's left (driver's side) is -z,
        // which is on the crowd's right when they face the front.
        tag('VEH LEFT', '#ff6a6a', car.bounds.halfLength + 0.3, 0.9, -car.bounds.halfWidth * 0.9, 1.2);
        tag('VEH RIGHT', '#6ab4ff', car.bounds.halfLength + 0.3, 0.9, car.bounds.halfWidth * 0.9, 1.2);
      });
    }
  }

  setBloom(on: boolean): void {
    this.bloomOn = on;
  }

  private labels: THREE.Sprite[] = [];
  private labelsOn = new URLSearchParams(location.search).get('labels') === '1';

  setLabels(on: boolean): void {
    this.labelsOn = on;
    for (const sp of this.labels) sp.visible = on;
  }

  get bloomEnabled(): boolean {
    return this.bloomOn;
  }

  setReflections(on: boolean): void {
    this.lot.setReflections(on);
  }

  flyTo(name: string, instant = false): void {
    const p = CAMERA_PRESETS.find((c) => c.name === name);
    if (!p) return;
    const to = this.fitted(p);
    const tTo = new THREE.Vector3(...p.target);
    if (instant) {
      this.tween = undefined;
      this.camera.position.copy(to);
      this.controls.target.copy(tTo);
      return;
    }
    this.tween = { from: this.camera.position.clone(), to, tFrom: this.controls.target.clone(), tTo, start: performance.now() };
  }

  /** A preset's camera position, pulled back on narrow screens so all three cars fit. */
  private fitted(p: CameraPreset): THREE.Vector3 {
    const pos = new THREE.Vector3(...p.position);
    const target = new THREE.Vector3(...p.target);
    const offset = pos.clone().sub(target);
    const halfV = THREE.MathUtils.degToRad(this.camera.fov / 2);
    const halfH = Math.atan(Math.tan(halfV) * this.camera.aspect);
    // The lineup is about 10 m wide and 7 m deep.
    const need = 5.2 / Math.tan(Math.min(halfH, halfV * 1.6)) + 2.5;
    if (offset.length() < need) offset.setLength(need);
    return target.add(offset);
  }

  /** Arms the automatic bloom-off check (after the show starts playing). */
  armPerfCheck(): void {
    if (this.perf.checked) return;
    this.perf = { frames: 0, time: 0, armed: true, checked: false };
  }

  private last = performance.now();

  private frame(): void {
    if (this.container.clientWidth !== this.size.w || this.container.clientHeight !== this.size.h) this.resize();
    const now = performance.now();
    const dt = Math.min(0.25, (now - this.last) / 1000);
    this.last = now;
    this.trackPerf(dt, now);
    this.onTick?.();
    if (this.tween) {
      const t = Math.min(1, (now - this.tween.start) / 800);
      const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      this.camera.position.lerpVectors(this.tween.from, this.tween.to, e);
      this.controls.target.lerpVectors(this.tween.tFrom, this.tween.tTo, e);
      if (t === 1) this.tween = undefined;
    }
    this.controls.update(dt);
    this.scene.updateMatrixWorld();
    this.glow.update();
    if (this.bloomOn) this.composer.render(dt);
    else this.renderer.render(this.scene, this.camera);
  }

  private trackPerf(dt: number, now: number): void {
    this.fpsAcc.frames++;
    if (now - this.fpsAcc.since > 1000) {
      this.fps = (this.fpsAcc.frames * 1000) / (now - this.fpsAcc.since);
      this.fpsAcc = { frames: 0, since: now };
    }
    if (!this.perf.armed || this.perf.checked) return;
    this.perf.frames++;
    // Skip the first second (shader compiles, texture uploads).
    if (this.perf.frames < 60) return;
    this.perf.time += dt;
    if (this.perf.frames >= 240) {
      this.perf.checked = true;
      const avg = this.perf.time / (this.perf.frames - 60);
      if (avg > 1 / 28 && this.bloomOn) {
        this.bloomOn = false;
        this.onAutoBloomOff?.();
      }
    }
  }

  resize(): void {
    this.size = { w: this.container.clientWidth, h: this.container.clientHeight };
    const w = Math.max(1, this.size.w);
    const h = Math.max(1, this.size.h);
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(this.dpr);
    this.composer.setSize(w, h);
    // Bloom at CSS-pixel resolution (its first mip is half of that).
    this.bloom.setSize(w, h);
    this.lot.setSize(w * this.dpr, h * this.dpr);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const gl = this.renderer.getContext();
    const range = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) as Float32Array | number[] | null;
    const maxPoint = range ? Math.min(256, Number(range[1])) : 64;
    this.glow.setView(h * this.dpr, this.camera, maxPoint);
  }

  dispose(): void {
    cancelAnimationFrame(this.raf);
    for (const c of this.cars) c.dispose();
    this.lot.dispose();
    this.controls.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
