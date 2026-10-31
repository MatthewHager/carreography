// The 3D view: renderer, night parking lot, camera presets, bloom, and the
// cars of the lineup with their glow sprites. Renderer and post setup
// follow tesla-lightshow-studio's CarScene.ts (AGPL-3.0), tuned for iPad
// Safari: devicePixelRatio capped at 1.5, no real-time lights from the cars,
// bloom at reduced resolution and switched off automatically when slow.

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { buildLot, lotEnvironment, REAR_CURB, STALL_WIDTH } from './car/lot';
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
/** How far a car's rear stands off the curb it backed up to. */
const CURB_GAP = 0.4;

/** Bloom starts here: only what is brighter glows. */
const BLOOM_FROM = 0.95;

/**
 * A lot lamp's reflection in the paint, the glass or the stainless is as bright as the lamp, and the bloom
 * would make it glow like one of the show's lights. So all the light a surface gets from the lot (its lamps,
 * the moon, the night sky, colour and reflection together) is held just under where the bloom starts: still
 * a crisp white gloss. The cars' own lamps, the scene's point and spot lights, are left out of it, so the
 * show's lights shine and glow as before. Once, for every material.
 */
function reflectionsUnderBloom(): void {
  const chunk = THREE.ShaderChunk as unknown as Record<string, string>;
  if (chunk.lights_fragment_begin!.includes('BLOOM_FROM')) return;
  const cap = (BLOOM_FROM - 0.15).toFixed(2);
  const lamps = '#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )';
  const rest = '#if ( NUM_SUN_LIGHTS > 0 ) && defined( RE_Direct )';
  chunk.lights_fragment_begin = chunk.lights_fragment_begin!
    .replace(lamps, `// BLOOM_FROM: the cars' lamps (point and spot lights) are kept apart (viewer.ts)
      vec3 sLampD = reflectedLight.directDiffuse, sLampS = reflectedLight.directSpecular, sLampC = vec3(0.0);
      #ifdef USE_CLEARCOAT
        sLampC = clearcoatSpecularDirect;
      #endif
      ${lamps}`)
    .replace(rest, `sLampD = reflectedLight.directDiffuse - sLampD;
      sLampS = reflectedLight.directSpecular - sLampS;
      #ifdef USE_CLEARCOAT
        sLampC = clearcoatSpecularDirect - sLampC;
      #endif
      ${rest}`);
  chunk.lights_fragment_end += `
    {
      // the lot's light: everything but the cars' lamps, held under the bloom
      vec3 sLotD = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse - sLampD;
      vec3 sLotS = reflectedLight.directSpecular + reflectedLight.indirectSpecular - sLampS;
      vec3 sLot = sLotD + sLotS;
      #ifdef USE_CLEARCOAT
        sLot += (clearcoatSpecularDirect - sLampC + clearcoatSpecularIndirect) * material.clearcoat;
      #endif
      float sMost = max(sLot.r, max(sLot.g, sLot.b)), sKeep = sMost > ${cap} ? ${cap} / sMost : 1.0;
      reflectedLight.directDiffuse = sLampD + (reflectedLight.directDiffuse - sLampD) * sKeep;
      reflectedLight.directSpecular = sLampS + (reflectedLight.directSpecular - sLampS) * sKeep;
      reflectedLight.indirectDiffuse *= sKeep;
      reflectedLight.indirectSpecular *= sKeep;
      #ifdef USE_CLEARCOAT
        clearcoatSpecularIndirect *= sKeep;
        clearcoatSpecularDirect = sLampC + (clearcoatSpecularDirect - sLampC) * sKeep;
      #endif
    }
  `;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class Viewer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(36, 1, 0.1, 250);
  private readonly controls: OrbitControls;
  private readonly composer: EffectComposer;
  private readonly bloom: UnrealBloomPass;
  private readonly glow = new GlowLayer();
  private readonly lot: ReturnType<typeof buildLot>;
  private readonly lineup = new THREE.Group();
  private cars: CarRig[] = [];
  private bloomOn = true;
  private size = { w: 0, h: 0 };
  private tween: { from: THREE.Vector3; to: THREE.Vector3; tFrom: THREE.Vector3; tTo: THREE.Vector3; start: number } | undefined;
  private raf = 0;
  private dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  /** Called every frame before rendering (the app updates the show time here). */
  onTick: (() => void) | undefined;
  private perf = { frames: 0, time: 0, armed: false, checked: false };
  private preset = CAMERA_PRESETS[0]!.name;
  private clear: Rect | undefined;
  // The car names and sides over each car (?labels=1), to check the crowd's left and right.
  private readonly labelsOn = new URLSearchParams(location.search).get('labels') === '1';

  constructor(private readonly container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    reflectionsUnderBloom();
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color('#05070a');
    this.scene.fog = new THREE.Fog('#05070a', 28, 70);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(lotEnvironment(), 0.02).texture;
    this.scene.environmentIntensity = 0.7;
    pmrem.dispose();

    // Night: a soft sky fill and a high moon under the lot's lamps (lot.ts), enough to read the cars'
    // shapes without competing with their lights.
    this.scene.add(new THREE.HemisphereLight('#8a96ad', '#1e1e1e', 0.8));
    const moon = new THREE.DirectionalLight('#c9d4ff', 0.5);
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
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.38, 0.05, BLOOM_FROM);
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

  get carCount(): number {
    return this.cars.length;
  }

  setCars(cars: CarRig[]): void {
    for (const c of this.cars) c.dispose();
    this.cars = cars;
    // Left to right facing the crowd (crowd at +x, so their left is +z), each car backed into its own
    // stall of the lot's row, square to it, its rear just off the island's curb.
    const n = cars.length;
    const widths = cars.map((c) => c.bounds.halfWidth);
    const zs = cars.map((_, i) => ((n - 1) / 2 - i) * STALL_WIDTH);
    this.lot.stallsFor(n);
    this.halfSpan = Math.max(3, zs[0]! + Math.max(...widths) + 1.35);
    cars.forEach((car, i) => {
      car.group.position.set(REAR_CURB + CURB_GAP + car.bounds.halfLength, 0, zs[i]!);
      car.group.rotation.y = 0;
      this.lineup.add(car.group);
      // Contact shadow.
      const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(car.bounds.halfLength * 2.3, car.bounds.halfWidth * 2.4),
        new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }),
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.006;
      car.group.add(shadow);
      if (this.labelsOn) addLabels(car);
    });
    this.lineup.updateMatrixWorld(true);
    this.glow.setEntries(cars.flatMap((c) => c.glowEntries));
  }

  /**
   * The part of the canvas the page leaves uncovered (CSS pixels from its top left): the cars are
   * centred and fitted in it rather than behind the panels.
   */
  setClear(rect: Rect): void {
    const c = this.clear;
    if (c && Math.abs(c.x - rect.x) + Math.abs(c.y - rect.y) + Math.abs(c.w - rect.w) + Math.abs(c.h - rect.h) < 2) return;
    this.clear = rect;
    if (this.container.clientWidth !== this.size.w || this.container.clientHeight !== this.size.h) this.resize();
    else this.offsetView();
    this.flyTo(this.preset);
  }

  /** Moves the view's centre to the middle of the uncovered part. */
  private offsetView(): void {
    const { w, h } = this.size;
    const c = this.clear;
    if (c && w > 0 && h > 0) this.camera.setViewOffset(w, h, w / 2 - (c.x + c.w / 2), h / 2 - (c.y + c.h / 2), w, h);
    else this.camera.clearViewOffset();
  }

  flyTo(name: string, instant = false): void {
    const p = CAMERA_PRESETS.find((c) => c.name === name);
    if (!p) return;
    this.preset = name;
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

  /** Half the lineup's width (m): about 5.2 for three cars. */
  private halfSpan = 5.2;

  /** A preset's camera position, pulled back on narrow screens (or for a long lineup) so every car fits
   * the uncovered part of the view. */
  private fitted(p: CameraPreset): THREE.Vector3 {
    const pos = new THREE.Vector3(...p.position);
    const target = new THREE.Vector3(...p.target);
    const offset = pos.clone().sub(target);
    const tan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const h = Math.max(1, this.size.h);
    const { w: clearW, h: clearH } = this.clear ?? this.size;
    const halfV = Math.atan((tan * Math.max(1, clearH)) / h);
    const halfH = Math.atan((tan * Math.max(1, clearW)) / h);
    // The lineup is 2 * halfSpan wide and about 7 m deep.
    const need = this.halfSpan / Math.tan(Math.min(halfH, halfV * 1.6)) + 2.5;
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
    this.trackPerf(dt);
    this.onTick?.();
    // a pole nearer the camera than the cars could stand in front of them (a long lineup on a phone)
    const reach = this.camera.position.distanceTo(this.controls.target);
    for (const p of this.lot.poles) p.visible = p.position.distanceTo(this.camera.position) > reach;
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

  /** A device that can't keep up loses the bloom rather than the frame rate. */
  private trackPerf(dt: number): void {
    if (!this.perf.armed || this.perf.checked) return;
    this.perf.frames++;
    // Skip the first second (shader compiles, texture uploads).
    if (this.perf.frames < 60) return;
    this.perf.time += dt;
    if (this.perf.frames >= 240) {
      this.perf.checked = true;
      if (this.perf.time / (this.perf.frames - 60) > 1 / 28) this.bloomOn = false;
    }
  }

  private resize(): void {
    this.size = { w: this.container.clientWidth, h: this.container.clientHeight };
    const w = Math.max(1, this.size.w);
    const h = Math.max(1, this.size.h);
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(this.dpr);
    this.composer.setSize(w, h);
    // Bloom at CSS-pixel resolution (its first mip is half of that).
    this.bloom.setSize(w, h);
    this.camera.aspect = w / h;
    this.offsetView();
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

/** Over a car: its name as the crowd sees it (= which USB drive it gets), and which physical side is the
 * vehicle's left (driver's side), on the crowd's right when they face the front. */
function addLabels(car: CarRig): void {
  const tag = (text: string, color: string, x: number, y: number, z: number, w = 2.2) => {
    const cv = document.createElement('canvas');
    cv.width = 512; cv.height = 128;
    const g = cv.getContext('2d')!;
    g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, 0, 512, 128);
    g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
    let px = 64;
    do g.font = `bold ${px--}px sans-serif`; while (g.measureText(text).width > 490 && px > 24);
    g.fillText(text, 256, 64);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthTest: false, transparent: true }));
    sp.position.set(x, y, z); sp.scale.set(w, w / 4, 1); sp.renderOrder = 20;
    car.group.add(sp);
  };
  const { halfLength, halfWidth, height } = car.bounds;
  tag(carLabel(car.name), '#ffffff', halfLength * 0.2, height + 0.9, 0);
  // Tesla's mesh: x forward, y up, z right; the vehicle's left is -z.
  tag('VEH LEFT', '#ff6a6a', halfLength + 0.3, 0.9, -halfWidth * 0.9, 1.2);
  tag('VEH RIGHT', '#6ab4ff', halfLength + 0.3, 0.9, halfWidth * 0.9, 1.2);
}

/** "Car2_ModelY_CenterLeft" -> "2 · Model Y · center left": the car's USB folder name, for people. */
function carLabel(name: string): string {
  const m = /^Car(\d+)_([A-Za-z]+)_([A-Za-z]+)$/.exec(name);
  if (!m) return name.replace(/_/g, ' ');
  const words = (w: string) => w.replace(/([a-z])([A-Z])/g, '$1 $2');
  return `${m[1]} · ${words(m[2]!)} · ${words(m[3]!).toLowerCase()}`;
}
