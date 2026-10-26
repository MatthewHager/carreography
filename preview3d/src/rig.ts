// One car of the lineup: builds its body (Tesla's mesh or the studio's
// code-built body), collects the parts the show drives, and applies a
// simulation frame to them. The light/closure wiring follows
// tesla-lightshow-studio's CarScene.ts (AGPL-3.0, Nathan Grace), split out so
// several cars can share one scene.

import * as THREE from 'three';
import type { Simulation } from './core/simulate';
import type { BodyStyle, VehicleProfile } from './core/vehicles';
import { CYBERTRUCK_2024, MODEL_Y_2020, MODEL_Y_2025 } from './core/vehicles';
import { buildBody } from './car/bodies';
import type { Builder, BuiltBody, GlowHandle, Materials } from './car/builder';
import { MODEL_Y_FROM_S } from './car/derive';
import { buildTeslaBody } from './car/meshBody';
import type { TeslaAsset } from './car/teslaAssets';
import type { GlowEntry } from './glow';

export type CarKind = 'modely' | 'cybertruck';
/** Which Model Y: 2020-24 (Tesla's Model S mesh reshaped) or 2025+ "Juniper" (code-built, front light bar). */
export type YBody = 'mesh' | 'refresh';

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

interface CabinGlow {
  ids: [string, string, string][];
  entry: GlowEntry;
}

const RGB = (base: string): [string, string, string] => [`${base}Red`, `${base}Green`, `${base}Blue`];

/** Lamp glow sprite gain per lamp emissive gain. */
const GLOW_GAIN = 0.4;
const LED_GLOW_GAIN = 0.7;

export class CarRig {
  readonly group = new THREE.Group();
  readonly profile: VehicleProfile;
  readonly glowEntries: GlowEntry[] = [];
  bounds: BuiltBody = { halfLength: 2.4, height: 1.6, halfWidth: 1 };
  private car = new THREE.Group();
  private readonly m: Materials;
  private lights: LightPart[] = [];
  private bars: LedBar[] = [];
  private closures: { id: string; apply: (p: number, d: boolean, t: number) => void }[] = [];
  private pools: Pool[] = [];
  private freeGlows: { handle: GlowHandle; entry: GlowEntry }[] = [];
  private cabin: CabinGlow[] = [];
  private sim: Simulation | undefined;
  private readonly cabinLight = new THREE.PointLight('#fff', 0, 4, 1.5);
  private frame = 0;

  constructor(
    readonly kind: CarKind,
    readonly name: string,
    private readonly yBody: YBody,
    asset: TeslaAsset | undefined,
    paint: string,
  ) {
    this.profile = kind === 'cybertruck' ? CYBERTRUCK_2024 : yBody === 'mesh' ? MODEL_Y_2020 : MODEL_Y_2025;
    this.m = makeMaterials(paint, kind);
    this.cabinLight.visible = false;
    this.group.add(this.car);
    this.build(asset);
  }

  private build(asset: TeslaAsset | undefined): void {
    const car = this.car;
    const builder: Builder = {
      car,
      m: this.m,
      cabinLight: this.cabinLight,
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

    if (this.kind === 'cybertruck') {
      const style: BodyStyle = CYBERTRUCK_2024.body;
      this.bounds = asset ? buildTeslaBody(builder, asset, style) : buildBody(builder, style);
    } else if (this.yBody === 'mesh' && asset) {
      // Tesla's Model S mesh reshaped to Model Y dimensions (derive.ts).
      this.bounds = buildTeslaBody(builder, asset, { model: 'modelY', fogLamps: true }, MODEL_Y_FROM_S);
    } else {
      this.bounds = buildBody(builder, MODEL_Y_2025.body);
    }
    // The studio's body builders add the cabin light to the car; it stays
    // hidden (no per-pixel light cost) and only marks where the display is.
    this.cabinLight.visible = false;
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
      // LED spacing sets the sprite size, so neighbours stay distinct.
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
          size: THREE.MathUtils.clamp(pitch * 2.6, 0.06, 0.16),
          color: new THREE.Color(0, 0, 0),
        };
        this.glowEntries.push(entry);
        return entry;
      });
    }
  }

  /**
   * Interior RGB (centre display plus five accent strips): soft colored glows
   * inside the greenhouse, visible through the glass, and a tint on the glass.
   */
  private placeCabin(): void {
    const box = new THREE.Box3();
    this.car.traverse((o) => {
      if (o instanceof THREE.Mesh && (o.material === this.m.glass || o.material === this.m.sideGlass)) box.expandByObject(o);
    });
    if (box.isEmpty()) box.set(new THREE.Vector3(-1, 0.9, -0.7), new THREE.Vector3(0.8, 1.4, 0.7));
    const inv = new THREE.Matrix4().copy(this.car.matrixWorld).invert();
    box.applyMatrix4(inv);
    const size = box.getSize(new THREE.Vector3());
    const ct = this.kind === 'cybertruck';
    // Greenhouse: the cabin sits in its lower part, between the pillars.
    const x0 = box.min.x + size.x * (ct ? 0.3 : 0.2);
    const x1 = box.max.x - size.x * (ct ? 0.22 : 0.25);
    const y = box.min.y + size.y * 0.3;
    const zw = Math.min(0.62, size.z * 0.33);
    const spots: [string[], number, number, number][] = [
      [['centerFrontDisplay', 'centerFrontAccent'], x1, y, 0],
      [['leftFrontAccent'], x1 - 0.25, y, -zw],
      [['rightFrontAccent'], x1 - 0.25, y, zw],
      [['leftRearAccent'], x0 + 0.2, y, -zw],
      [['rightRearAccent'], x0 + 0.2, y, zw],
    ];
    for (const [bases, x, yy, z] of spots) {
      const entry: GlowEntry = { object: this.car, local: new THREE.Vector3(x, yy, z), size: 0.9, color: new THREE.Color(0, 0, 0) };
      this.cabin.push({ ids: bases.map(RGB), entry });
      this.glowEntries.push(entry);
    }
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
    let r = 0;
    let g = 0;
    let b = 0;
    for (const c of this.cabin) {
      let cr = 0;
      let cg = 0;
      let cb = 0;
      for (const [ri, gi, bi] of c.ids) {
        cr = Math.max(cr, this.level(ri));
        cg = Math.max(cg, this.level(gi));
        cb = Math.max(cb, this.level(bi));
      }
      c.entry.color.setRGB(cr, cg, cb).multiplyScalar(0.32);
      r = Math.max(r, cr);
      g = Math.max(g, cg);
      b = Math.max(b, cb);
    }
    const dr = this.level('centerFrontDisplayRed');
    const dg = this.level('centerFrontDisplayGreen');
    const db = this.level('centerFrontDisplayBlue');
    this.m.display.emissive.setRGB(dr, dg, db);
    this.m.display.emissiveIntensity = 2.5;
    this.m.glass.emissive.setRGB(r, g, b);
    this.m.glass.emissiveIntensity = 0.015;
    this.m.sideGlass.emissive.setRGB(r, g, b);
    this.m.sideGlass.emissiveIntensity = 0.025;
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

function makeMaterials(paint: string, kind: CarKind): Materials {
  const paintParams: THREE.MeshPhysicalMaterialParameters =
    kind === 'cybertruck'
      ? { color: paint, metalness: 0.3, roughness: 0.55, clearcoat: 0 }
      : { color: paint, metalness: 0.15, roughness: 0.6, clearcoat: 0 };
  return {
    paint: new THREE.MeshPhysicalMaterial(paintParams),
    meshPaint: paintFromBake(new THREE.MeshPhysicalMaterial(paintParams)),
    glass: new THREE.MeshPhysicalMaterial({ color: '#06080b', metalness: 0, roughness: 0.5 }),
    sideGlass: new THREE.MeshPhysicalMaterial({ color: '#06080b', transparent: true, opacity: 0.9, metalness: 0, roughness: 0.5 }),
    smallPaint: new THREE.MeshStandardMaterial({ color: '#d9dadc', roughness: 0.55 }),
    trim: new THREE.MeshStandardMaterial({ color: '#0a0b0d', metalness: 0.05, roughness: 0.7 }),
    cabin: new THREE.MeshStandardMaterial({ color: '#1b1c20', roughness: 0.9 }),
    display: new THREE.MeshStandardMaterial({ color: '#000', emissive: '#000' }),
  };
}

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
        float ledT = clamp( ( vLedZ - ledRange.x ) / ( ledRange.y - ledRange.x ), 0.0, 0.99999 ) * ${levels.length}.0;
        float ledF = fract( ledT );
        float ledSeam = smoothstep( 0.0, 0.16, ledF ) * smoothstep( 1.0, 0.84, ledF );
        totalEmissiveRadiance *= ledLevels[ int( ledT ) ] * mix( 0.12, 1.0, ledSeam );`,
      );
  };
  material.needsUpdate = true;
}

/**
 * Recolors Tesla's paint bake: where the texture is red (paint), its
 * brightness becomes shading under the material color. (From the studio.)
 */
function paintFromBake(material: THREE.MeshPhysicalMaterial): THREE.MeshPhysicalMaterial {
  material.userData.paintScale = 1;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.paintScale = {
      get value() {
        return material.userData.paintScale as number;
      },
    };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float paintScale;')
      .replace(
        '#include <map_fragment>',
        `#ifdef USE_MAP
          vec4 bake = texture2D( map, vMapUv );
          float paintMask = clamp( ( bake.r - max( bake.g, bake.b ) ) / max( bake.r, 1e-3 ) * 1.6, 0.0, 1.0 );
          float shade = clamp( bake.r * paintScale, 0.0, 1.0 );
          diffuseColor.rgb = mix( bake.rgb, diffuseColor.rgb * shade, paintMask );
        #endif`,
      );
  };
  return material;
}

