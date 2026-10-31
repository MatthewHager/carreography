// One car of the lineup: builds its body from Tesla's own model (car/appBody.ts),
// collects the parts the show drives, and applies a simulation frame to them. The light/closure wiring follows
// tesla-lightshow-studio's CarScene.ts (AGPL-3.0, Nathan Grace), split out so
// several cars can share one scene.

import * as THREE from 'three';
import type { Simulation } from './core/simulate';
import type { VehicleProfile } from './core/vehicles';
import {
  CYBERTRUCK_2024, MODEL_3_2020, MODEL_3_2024, MODEL_S_2021, MODEL_X_2021, MODEL_Y_2020, MODEL_Y_2025, MODEL_Y_L,
  MODEL_Y_STANDARD,
} from './core/vehicles';
import type { Builder, BuiltBody, GlowHandle } from './car/builder';
import { buildAppBody, type AppModelId } from './car/appBody';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GlowEntry } from './glow';

/** Which channels each app model's car has, and how it treats them (core/vehicles.ts). */
export const PROFILES: Record<AppModelId, VehicleProfile> = {
  s_palladium: MODEL_S_2021,
  model3_high: MODEL_3_2020,
  poppyseed: MODEL_3_2024,
  x_palladium: MODEL_X_2021,
  y_high: MODEL_Y_2020,
  bayberry: MODEL_Y_2025,
  bayberry_e41: MODEL_Y_STANDARD,
  bayberry_e80: MODEL_Y_L,
  cybertruck: CYBERTRUCK_2024,
};

/** A paint from the Tesla app's paint table (paints.json): its colour as the app stores it. */
export interface Paint {
  name: string;
  albedo: string;
  metallic: number;
  roughness: number;
}

/** The app keeps its paint colours very dark and brightens them with its studio lighting; this is the
 * factor tesla-model-extractor measured for its GLB export (`--paint-brightness`). */
const PAINT_BRIGHTNESS = 8;

/** A paint's colour: the app's colour brightened as the extractor does (in gamma space, keeping the hue). */
export function paintColor(paint: Paint): THREE.Color {
  const { r, g, b } = new THREE.Color(paint.albedo).getRGB({ r: 0, g: 0, b: 0 }, THREE.SRGBColorSpace);
  const k = Math.min(PAINT_BRIGHTNESS, 1 / Math.max(r, g, b, 1e-6));
  return new THREE.Color().setRGB(r * k, g * k, b * k, THREE.SRGBColorSpace);
}
interface LightPart {
  ids: string[];
  material: THREE.MeshStandardMaterial;
  color: THREE.Color;
  gain: number;
  mesh: THREE.Mesh;
  glows: { entry: GlowEntry; gain: number }[];
}

interface LedBar {
  pixels: string[][];
  levels: Float32Array;
  mesh: THREE.Mesh;
  color: THREE.Color;
  /** Glow per LED (undefined where the LED has no lens triangles). */
  glows: (GlowEntry | undefined)[];
}

interface Pool {
  ids: string[];
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  max: number;
}

const RGB = (base: string): [string, string, string] => [`${base}Red`, `${base}Green`, `${base}Blue`];

/** A piece of a cabin's accent strip: its own copy of the material, and the segment that lights it. */
interface Strip {
  material: THREE.MeshStandardMaterial;
  ids: [string, string, string];
}

/** The centre screen in every app model: the 2025+ Model Y's is "Display", the others' "Screen_Front". */
const SCREEN = /^(Screen_Front|Display)\d*$/;
const DISPLAY = RGB('centerFrontDisplay');
/** The accent strip, where an app model has one (the Cybertruck's "LED", the 2024+ Model 3's "LED_Strip"):
 * across the dashboard and along each door card, Tesla's five accent segments. */
const STRIP = /^(LED|LED_Strip)$/;
const SEGMENT: [RegExp, string][] = [[/^Dashboard/, 'centerFront'], [/^Doorcard_LF/, 'leftFront'],
  [/^Doorcard_RF/, 'rightFront'], [/^Doorcard_LR/, 'leftRear'], [/^Doorcard_RR/, 'rightRear']];
/** The cabin's inside surfaces, which the screen's light falls on ("it visibly lights up the entire interior,
 * even when the show is viewed from outside": Tesla's README). Not the trim: some models share its name with
 * exterior cladding. */
const SPILL_ON = /^(Interior|InteriorSeats|Seats|[A-Za-z_]*_Seats|Carpet|Carpet_Black|Upper_Trim)$/;
const SCREEN_GAIN = 3, STRIP_GAIN = 4, SPILL_GAIN = 0.45;

/** Lamp glow sprite gain per lamp emissive gain. */
const GLOW_GAIN = 0.4;
const LED_GLOW_GAIN = 0.7;

export class CarRig {
  readonly group = new THREE.Group();
  readonly profile: VehicleProfile;
  readonly glowEntries: GlowEntry[] = [];
  bounds: BuiltBody = { halfLength: 2.4, height: 1.6, halfWidth: 1 };
  private car = new THREE.Group();
  private lights: LightPart[] = [];
  /** The model's own paint (its colour, metalness, roughness), for setPaint(null). */
  private ownPaint: { color: THREE.Color; metalness: number; roughness: number }[] = [];
  private bars: LedBar[] = [];
  private closures: { id: string; apply: (p: number, d: boolean, t: number) => void }[] = [];
  private pools: Pool[] = [];
  private freeGlows: { handle: GlowHandle; entry: GlowEntry }[] = [];
  private strips: Strip[] = [];
  private spill: THREE.MeshStandardMaterial[] = [];
  private screens: THREE.MeshStandardMaterial[] = [];
  private sim: Simulation | undefined;
  private frame = 0;

  constructor(
    readonly name: string,
    /** Tesla's own model from the Tesla app (appBody.ts). */
    private readonly app: { id: AppModelId; gltf: GLTF },
  ) {
    this.profile = PROFILES[app.id];
    this.group.add(this.car);
    this.build();
  }

  /** Paints the car in one of the app's paints; null keeps the model's own. No-op on the Cybertruck. */
  setPaint(paint: Paint | null): void {
    (this.bounds.paints ?? []).forEach((m, i) => {
      const own = this.ownPaint[i]!;
      if (!paint) {
        m.color.copy(own.color);
        m.metalness = own.metalness;
        m.roughness = own.roughness;
        return;
      }
      m.color.copy(paintColor(paint));
      m.metalness = paint.metallic;
      m.roughness = paint.roughness;
    });
  }

  private build(): void {
    const car = this.car;
    const builder: Builder = {
      car,
      light: (parent, ids, color, lens, size, position, gain = 5) => {
        const material = new THREE.MeshStandardMaterial({ color: lens, roughness: 0.2, metalness: 0.1 });
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
        mesh.position.set(...position);
        parent.add(mesh);
        this.lights.push({ ids, material, color, gain, mesh, glows: [] });
        return mesh;
      },
      lightMesh: (mesh, ids, color, gain = 5) => {
        this.lights.push({ ids, material: mesh.material as THREE.MeshStandardMaterial, color, gain, mesh, glows: [] });
      },
      lightBar: (mesh, pixels, from, to, color, gain = 3) => {
        const levels = new Float32Array(pixels.length);
        ledStrip(mesh.material as THREE.MeshStandardMaterial, levels, from, to, color, gain);
        this.bars.push({ pixels, levels, mesh, color, glows: [] });
        // LED glows are placed once the car's matrices are known (see placeGlows).
        (mesh.userData as { ledRange?: [number, number] }).ledRange = [from, to];
      },
      closure: (id, apply) => this.closures.push({ id, apply }),
      beam: (ids, light, max) => this.addPool(ids, light, max),
      glow: (parent, position, size) => {
        const handle: GlowHandle = { color: new THREE.Color('#fff'), level: 0 };
        const entry: GlowEntry = { object: parent, local: position.clone(), size, color: new THREE.Color(0, 0, 0) };
        this.freeGlows.push({ handle, entry });
        this.glowEntries.push(entry);
        return handle;
      },
    };

    this.bounds = buildAppBody(builder, this.app.gltf, this.app.id);
    this.ownPaint = (this.bounds.paints ?? []).map((m) => ({ color: m.color.clone(), metalness: m.metalness, roughness: m.roughness }));
    car.updateMatrixWorld(true);
    this.placeGlows();
    this.placeCabin();
    this.apply();
  }

  /** Light pools on the ground instead of the studio's spot/point lights. */
  private addPool(ids: string[], light: THREE.Light, max: number): void {
    light.visible = false;
    light.intensity = 0;
    const from = light.position.clone();
    const color = light.color.clone();
    let center: THREE.Vector3;
    let length: number;
    let width: number;
    let angle = 0;
    let strength: number;
    if (light instanceof THREE.SpotLight) {
      light.target.visible = false;
      const to = light.target.position.clone();
      const dir = to.clone().sub(from).setY(0);
      const d = dir.length() || 1;
      dir.divideScalar(d);
      angle = Math.atan2(-dir.z, dir.x);
      if (light.distance > 20) {
        // Main beams.
        length = 6.5;
        width = 3.2;
        strength = 0.3;
      } else if (light.distance > 11) {
        // Fogs.
        length = 4;
        width = 3.4;
        strength = 0.2;
      } else {
        // Reverse lights.
        length = 3.5;
        width = 2.8;
        strength = 0.25;
      }
      center = from.clone().setY(0).addScaledVector(dir, length * 0.5 + 0.1);
    } else {
      // The red glow the tail/brake lights throw on the ground.
      length = 2.6;
      width = 3.0;
      strength = 0.3;
      center = from.clone().setY(0);
    }
    const material = new THREE.MeshBasicMaterial({
      map: poolTexture(),
      color,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
    mesh.rotation.set(-Math.PI / 2, 0, angle);
    mesh.scale.set(length, width, 1);
    mesh.position.set(center.x, 0.015, center.z);
    mesh.renderOrder = 2;
    mesh.visible = false;
    this.car.add(mesh);
    this.pools.push({ ids, mesh, material, max: strength * Math.min(1, max / 40 + 0.5) });
  }

  /**
   * Glow sprites: lamps get one per ~14 cm cluster of lens triangles (so a long
   * tail light glows along its length); light bars one per LED.
   */
  private placeGlows(): void {
    for (const part of this.lights) {
      const scale = part.mesh.matrixWorld.getMaxScaleOnAxis() || 1;
      for (const c of clusters(part.mesh.geometry, 0.14 / scale, 10)) {
        const sizeM = THREE.MathUtils.clamp(Math.sqrt(c.area) * scale * 2.4, 0.14, 0.5);
        const local = c.center.clone();
        if (c.normal) local.addScaledVector(c.normal, 0.03 / scale);
        const entry: GlowEntry = { object: part.mesh, local, normal: c.normal, size: sizeM, color: new THREE.Color(0, 0, 0) };
        part.glows.push({ entry, gain: GLOW_GAIN * Math.min(1.4, Math.sqrt(part.gain / 4)) });
        this.glowEntries.push(entry);
      }
    }
    for (const bar of this.bars) {
      const [from, to] = (bar.mesh.userData as { ledRange: [number, number] }).ledRange;
      const scale = bar.mesh.matrixWorld.getMaxScaleOnAxis() || 1;
      const n = bar.pixels.length;
      const acc = Array.from({ length: n }, () => ({ p: new THREE.Vector3(), nrm: new THREE.Vector3(), w: 0 }));
      eachTriangle(bar.mesh.geometry, (center, normal, area) => {
        const t = THREE.MathUtils.clamp((center.z - from) / (to - from), 0, 0.99999);
        const a = acc[Math.floor(t * n)]!;
        a.p.addScaledVector(center, area);
        a.nrm.addScaledVector(normal, area);
        a.w += area;
      });
      // Wide enough that neighbouring LEDs' glows run together through the diffuser.
      const pitch = (Math.abs(to - from) / n) * scale;
      bar.glows = acc.map((a) => {
        if (a.w <= 0) return undefined;
        const center = a.p.divideScalar(a.w);
        const normal = a.nrm.lengthSq() > 1e-12 ? a.nrm.normalize() : undefined;
        if (normal) center.addScaledVector(normal, 0.02 / scale);
        const entry: GlowEntry = {
          object: bar.mesh,
          local: center,
          normal,
          size: THREE.MathUtils.clamp(pitch * 4, 0.08, 0.22),
          color: new THREE.Color(0, 0, 0),
        };
        this.glowEntries.push(entry);
        return entry;
      });
    }
  }

  /**
   * Interior RGB: the centre screen's face (every car) in its colour, its light falling faintly on the
   * cabin's inside surfaces, and, where the car has an accent strip, each piece of it in its own segment's
   * colour. The screen's back keeps its own finish, like the back of a monitor.
   */
  private placeCabin(): void {
    // the cars face +x, so the screen's face, turned to the driver, points to -x
    const toDriver = new THREE.Vector3(-1, 0, 0).transformDirection(this.car.matrixWorld);
    const own = (m: THREE.Material) => {
      const c = m instanceof THREE.MeshStandardMaterial ? m.clone() : new THREE.MeshStandardMaterial();
      c.emissive.set(0, 0, 0);
      c.emissiveMap = null;
      return c;
    };
    const named = (o: THREE.Object3D, re: RegExp) => {
      for (let p: THREE.Object3D | null = o; p && p !== this.car; p = p.parent) if (re.test(p.name)) return p.name;
      return null;
    };
    this.car.traverse((o) => {
      if (!(o instanceof THREE.Mesh) || !o.visible) return;
      const screen = named(o, SCREEN) !== null;
      const segment = SEGMENT.find(([re]) => named(o, re))?.[1];
      const pick = (m: THREE.Material) => {
        if (screen) {
          const c = own(m);
          c.onBeforeCompile = (sh) => {
            sh.uniforms.toDriver = { value: toDriver };
            sh.vertexShader = sh.vertexShader
              .replace('#include <common>', '#include <common>\nvarying vec3 vFacing;')
              .replace('#include <beginnormal_vertex>',
                '#include <beginnormal_vertex>\nvFacing = mat3(modelMatrix) * objectNormal;');
            sh.fragmentShader = sh.fragmentShader
              .replace('#include <common>', '#include <common>\nvarying vec3 vFacing;\nuniform vec3 toDriver;')
              .replace('#include <emissivemap_fragment>',
                '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= step(0.2, dot(normalize(vFacing), toDriver));');
          };
          this.screens.push(c);
          return c;
        }
        if (segment && STRIP.test(m.name)) {
          const c = own(m);
          this.strips.push({ material: c, ids: RGB(`${segment}Accent`) });
          return c;
        }
        if (SPILL_ON.test(m.name)) {
          const c = own(m);
          this.spill.push(c);
          return c;
        }
        return m;
      };
      o.material = Array.isArray(o.material) ? o.material.map(pick) : pick(o.material);
    });
  }

  setSimulation(sim: Simulation | undefined): void {
    this.sim = sim;
    this.apply();
  }

  /** Shows a frame of the simulation (clamped). */
  setFrame(frame: number, timeS: number): void {
    const max = (this.sim?.frameCount ?? 1) - 1;
    this.frame = Math.max(0, Math.min(max, frame));
    this.apply(timeS);
  }

  private level(id: string): number {
    return this.sim?.levels.get(id)?.[this.frame] ?? 0;
  }

  private maxLevel(ids: string[]): number {
    let l = 0;
    for (const id of ids) {
      const v = this.level(id);
      if (v > l) l = v;
    }
    return l;
  }

  private apply(timeS = 0): void {
    for (const part of this.lights) {
      const level = this.maxLevel(part.ids);
      part.material.emissive.copy(part.color);
      part.material.emissiveIntensity = level * part.gain;
      for (const g of part.glows) g.entry.color.copy(part.color).multiplyScalar(level * g.gain);
    }
    for (const bar of this.bars) {
      bar.pixels.forEach((ids, i) => {
        const level = this.maxLevel(ids);
        bar.levels[i] = level;
        bar.glows[i]?.color.copy(bar.color).multiplyScalar(level * LED_GLOW_GAIN);
      });
    }
    for (const pool of this.pools) {
      const level = this.maxLevel(pool.ids);
      pool.material.opacity = level * pool.max;
      pool.mesh.visible = level > 0.005;
    }
    for (const c of this.closures) {
      const track = this.sim?.closures.get(c.id);
      c.apply(track?.position[this.frame] ?? (c.id.endsWith('Mirror') ? 1 : 0), !!track?.dancing[this.frame], timeS);
    }
    for (const { handle, entry } of this.freeGlows) entry.color.copy(handle.color).multiplyScalar(handle.level);
    // Interior RGB.
    for (const st of this.strips) {
      st.material.emissive.setRGB(...st.ids.map((id) => this.level(id)) as [number, number, number]);
      st.material.emissiveIntensity = STRIP_GAIN;
    }
    const [r, g, b] = DISPLAY.map((id) => this.level(id));
    for (const m of this.screens) {
      m.emissive.setRGB(r, g, b);
      m.emissiveIntensity = SCREEN_GAIN;
    }
    for (const m of this.spill) {
      m.emissive.setRGB(r, g, b);
      m.emissiveIntensity = SPILL_GAIN;
    }
  }

  dispose(): void {
    this.group.removeFromParent();
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        for (const mat of [o.material].flat()) (mat as THREE.Material).dispose();
      }
    });
  }
}

// --- helpers ---------------------------------------------------------------

const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpC = new THREE.Vector3();
const tmpN = new THREE.Vector3();
const tmpCenter = new THREE.Vector3();

/** Visits each triangle: centroid, unit normal (vertex normals when present), area. */
function eachTriangle(g: THREE.BufferGeometry, fn: (center: THREE.Vector3, normal: THREE.Vector3, area: number) => void): void {
  const pos = g.attributes.position as THREE.BufferAttribute;
  const nor = g.attributes.normal as THREE.BufferAttribute | undefined;
  const index = g.index;
  const count = index ? index.count : pos.count;
  const vi = (i: number) => (index ? index.getX(i) : i);
  for (let i = 0; i + 2 < count; i += 3) {
    const a = vi(i);
    const b = vi(i + 1);
    const c = vi(i + 2);
    tmpA.fromBufferAttribute(pos, a);
    tmpB.fromBufferAttribute(pos, b);
    tmpC.fromBufferAttribute(pos, c);
    tmpCenter.copy(tmpA).add(tmpB).add(tmpC).divideScalar(3);
    tmpB.sub(tmpA);
    tmpC.sub(tmpA);
    const cross = tmpB.cross(tmpC);
    const area = cross.length() / 2;
    if (!(area > 0)) continue;
    if (nor) {
      tmpN.fromBufferAttribute(nor, a);
      tmpN.x += nor.getX(b) + nor.getX(c);
      tmpN.y += nor.getY(b) + nor.getY(c);
      tmpN.z += nor.getZ(b) + nor.getZ(c);
      if (tmpN.lengthSq() < 1e-12) tmpN.copy(cross);
      tmpN.normalize();
    } else {
      tmpN.copy(cross).normalize();
    }
    fn(tmpCenter, tmpN, area);
  }
}

interface Cluster {
  center: THREE.Vector3;
  normal?: THREE.Vector3;
  area: number;
}

/**
 * Groups a lamp's triangles into grid cells of `cell` units: one glow per
 * cell. Coarsens the grid until there are at most `maxCount` cells.
 */
function clusters(g: THREE.BufferGeometry, cell: number, maxCount: number): Cluster[] {
  for (let attempt = 0; attempt < 6; attempt++) {
    const cells = new Map<string, { p: THREE.Vector3; n: THREE.Vector3; w: number }>();
    eachTriangle(g, (center, normal, area) => {
      const key = `${Math.floor(center.x / cell)},${Math.floor(center.y / cell)},${Math.floor(center.z / cell)}`;
      let c = cells.get(key);
      if (!c) cells.set(key, (c = { p: new THREE.Vector3(), n: new THREE.Vector3(), w: 0 }));
      c.p.addScaledVector(center, area);
      c.n.addScaledVector(normal, area);
      c.w += area;
    });
    if (cells.size <= maxCount || attempt === 5) {
      // Drop slivers: cells with under 4% of the lamp's biggest cell.
      const list = [...cells.values()];
      const biggest = Math.max(...list.map((c) => c.w));
      return list
        .filter((c) => c.w >= biggest * 0.04)
        .map((c) => {
          // A box lamp's faces cancel out: it shines all around.
          const n = c.n.length() > c.w * 0.35 ? c.n.clone().normalize() : undefined;
          return { center: c.p.divideScalar(c.w), normal: n, area: c.w };
        });
    }
    cell *= 1.6;
  }
  return [];
}

let poolTex: THREE.Texture | undefined;
/** Soft elliptical light pool, brightest a little toward its near end. */
function poolTexture(): THREE.Texture {
  if (poolTex) return poolTex;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  // u runs from the lamp (0) outward (1). Brightest about a third of the way
  // out, fading to nothing well inside the quad's edges.
  const img = ctx.createImageData(128, 64);
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 128; x++) {
      const u = (x + 0.5) / 128;
      const v = (y + 0.5) / 64;
      const du = u < 0.33 ? (u - 0.33) / 0.33 : (u - 0.33) / 0.67;
      const dv = (v - 0.5) / 0.5;
      const d = Math.sqrt(du * du + dv * dv);
      const a = Math.max(0, 1 - d) ** 1.8;
      const i = (y * 128 + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(a * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  poolTex = new THREE.CanvasTexture(canvas);
  poolTex.colorSpace = THREE.SRGBColorSpace;
  return poolTex;
}

/**
 * Lights a mesh as separate LEDs: each fragment finds its LED by position
 * along local z and takes that LED's level, with a dark seam between LEDs.
 * (From the studio's CarScene.ts.)
 */
function ledStrip(material: THREE.MeshStandardMaterial, levels: Float32Array, from: number, to: number, color: THREE.Color, gain: number): void {
  material.emissive.copy(color);
  material.emissiveIntensity = gain;
  material.customProgramCacheKey = () => `led:${levels.length}`;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.ledLevels = { value: levels };
    shader.uniforms.ledRange = { value: new THREE.Vector2(from, to) };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vLedZ;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLedZ = position.z;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying float vLedZ;\nuniform float ledLevels[${levels.length}];\nuniform vec2 ledRange;`)
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        // the LEDs sit behind a diffuser, so the bar reads as one strip of light: each point blends the
        // LEDs either side of it, with no dark seam between them
        float ledT = clamp( ( vLedZ - ledRange.x ) / ( ledRange.y - ledRange.x ), 0.0, 0.99999 ) * ${levels.length}.0 - 0.5;
        int ledA = clamp( int( floor( ledT ) ), 0, ${levels.length - 1} );
        int ledB = clamp( ledA + 1, 0, ${levels.length - 1} );
        totalEmissiveRadiance *= mix( ledLevels[ ledA ], ledLevels[ ledB ], smoothstep( 0.0, 1.0, fract( ledT ) ) );`,
      );
  };
  material.needsUpdate = true;
}
