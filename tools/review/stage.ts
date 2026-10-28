// What each car of a show does, as the crowd would see it: the 3D preview's own simulation
// (viewer/core/simulate.ts: Tesla's ramps, which lamps the car really has, closure travel), turned into
// rows of brightness per lamp, crowd's left first.

import { N_CHANNELS, STEP_MS } from '@/engine/channels';
import { VEHICLES } from '@/engine/vehicles';
import { simulate, type Simulation } from '@/viewer/core/simulate';
import type { VehicleProfile } from '@/viewer/core/vehicles';
import type { AppModelId } from '@/viewer/car/appBody';
import { PROFILES } from '@/viewer/rig';
import type { Rgb } from './image';


export interface Row {
  label: string;
  kind: 'lamp' | 'closure' | 'pixels' | 'rgb';
  color: Rgb;
  /** One series (a single lamp), two (crowd's left, then right), or a bar's pixels (crowd's left first). */
  series: Float32Array[];
  dancing?: Uint8Array[];
  rgb?: Uint8Array;           // kind 'rgb': three bytes per frame
}

export interface CarView {
  name: string;
  letter: string;
  rows: Row[];
  /** The lamps that count for flashes and "lit": every lamp series, and a bar as its mean. */
  lamps: Float32Array[];
}

const COLORS: [RegExp, Rgb][] = [
  [/MainBeam/, [235, 240, 255]],
  [/Turn|Repeater|SideMarker/, [255, 165, 30]],
  [/Fog|AuxPark/, [255, 228, 160]],
  [/brake|rearLightBar|Tail|rearFog/, [255, 45, 40]],
  [/Mirror|Window|liftgate|Door|chargePort/, [60, 200, 255]],
];
const colorFor = (id: string, label: string): Rgb =>
  /Reverse|Bed/.test(label) ? [235, 240, 255] : COLORS.find(([re]) => re.test(id))?.[1] ?? [200, 225, 255];

/** "leftOuterMainBeam" -> ["OuterMainBeam", "left"]; "barLeftEnd" -> ["barEnd", "left"]. */
function sideOf(id: string): [string, 'left' | 'right' | null] {
  let m = /^(left|right)(.+)$/.exec(id);
  if (m) return [m[2], m[1] as 'left' | 'right'];
  m = /^(.*)(Left|Right)(.*)$/.exec(id);
  if (m) return [m[1] + m[3], m[2].toLowerCase() as 'left' | 'right'];
  return [id, null];
}

const words = (s: string) => s.replace(/([a-z])([A-Z0-9])/g, '$1 $2').toLowerCase();
const sideless = (label: string) => label.replace(/\b(Left|Right) /, '');

/** Rows for ids in the order given: a lamp's two sides share a row, crowd's left first (the vehicle's
 * right). Lamps several channels drive together (the profile's OR groups) get one row. */
function rowsFor(ids: string[], sim: Simulation, profile: VehicleProfile, kind: 'lamp' | 'closure'): Row[] {
  const groups = new Map<string, { left?: string; right?: string; only?: string }>();
  for (const id of ids) {
    const [base, side] = sideOf(id);
    const g = groups.get(base) ?? {};
    if (side) g[side] = id;
    else g.only = id;
    groups.set(base, g);
  }
  const seen = new Set<Float32Array>();
  const out: Row[] = [];
  const pc = new Map(profile.channels.map((c) => [c.id, c]));
  for (const [base, g] of groups) {
    const ordered = g.only ? [g.only] : [g.right, g.left].filter((x): x is string => !!x);
    const series = ordered.map((id) => (kind === 'lamp' ? sim.levels.get(id) : sim.closures.get(id)?.position))
      .filter((s): s is Float32Array => !!s);
    if (!series.length || series.every((s) => seen.has(s))) continue;
    series.forEach((s) => seen.add(s));
    const named = pc.get(ordered[0])?.label;
    const label = named ? sideless(named).toLowerCase() : words(base);
    const dancing = kind === 'closure' ? ordered.map((id) => sim.closures.get(id)!.dancing) : undefined;
    out.push({ label, kind, color: colorFor(ordered[0], named ?? ''), series, dancing });
  }
  return out;
}

const bar = (sim: Simulation, base: string, n: number) =>
  Array.from({ length: n }, (_, i) => sim.levels.get(`${base}${n - i}`)!);   // numbered from the vehicle's left

/** Mean of a bar's pixels per frame. */
function barMean(pixels: Float32Array[]): Float32Array {
  const out = new Float32Array(pixels[0].length);
  for (const p of pixels) for (let f = 0; f < out.length; f++) out[f] += p[f] / pixels.length;
  return out;
}

/** One car's rows, from its show file's frames. */
export function carView(name: string, letter: string, frames: Uint8Array, nFrames: number): CarView {
  const profile = PROFILES[VEHICLES[letter].body as AppModelId];
  const sim = simulate({ channelCount: N_CHANNELS, frameCount: nFrames, stepTimeMs: STEP_MS, data: frames }, profile);
  const zeroed = new Set(profile.orGroups.filter((g) => !g.inputs.length).flatMap((g) => g.outputs));
  const inProfile = new Set(profile.channels.map((c) => c.id));
  const isPixel = (id: string) => /LightBar\d+$/.test(id);
  const lampIds = (group: string) => profile.channels
    .filter((c) => c.group === group && c.kind !== 'closure' && c.kind !== 'rgb')
    .filter((c) => !isPixel(c.id) && !zeroed.has(c.id))
    .map((c) => c.id);
  // lamps only an OR group names (the 2025+ Model Y's bar sections) light the front
  const extra = profile.orGroups.flatMap((g) => g.inputs.length ? g.outputs : []).filter((id) => !inProfile.has(id));
  const rows: Row[] = [...rowsFor([...lampIds('front'), ...new Set(extra)], sim, profile, 'lamp')];
  const lamps: Float32Array[] = rows.flatMap((r) => r.series);
  if (inProfile.has('frontLightBar1')) {
    const px = bar(sim, 'frontLightBar', 60);
    rows.push({ label: 'front bar (crowd L top)', kind: 'pixels', color: [255, 255, 255], series: px });
    lamps.push(barMean(px));
    if (inProfile.has('offroadLightBar1')) {
      const px6 = bar(sim, 'offroadLightBar', 6);
      rows.push({ label: 'offroad bar', kind: 'pixels', color: [255, 255, 255], series: px6 });
    }
  }
  const rear = rowsFor(lampIds('rear'), sim, profile, 'lamp');
  rows.push(...rear);
  lamps.push(...rear.flatMap((r) => r.series));
  if (inProfile.has('rearLightBar1')) {
    // seen from behind; in 13 groups of 4 LEDs, the vehicle's left on top
    const px = bar(sim, 'rearLightBar', 52).reverse();
    const groups = Array.from({ length: 13 }, (_, i) => {
      const out = new Float32Array(nFrames);
      for (const p of px.slice(i * 4, i * 4 + 4)) {
        for (let f = 0; f < nFrames; f++) out[f] = Math.max(out[f], p[f]);
      }
      return out;
    });
    rows.push({ label: 'rear bar', kind: 'pixels', color: [255, 45, 40], series: groups });
  }
  const closures = profile.channels.filter((c) => c.kind === 'closure').map((c) => c.id);
  rows.push(...rowsFor(closures, sim, profile, 'closure'));
  const rgbIds = profile.channels.filter((c) => c.kind === 'rgb').map((c) => c.id);
  if (rgbIds.length) {
    const rgb = new Uint8Array(nFrames * 3);
    rgbIds.forEach((id) => {
      const k = id.endsWith('Red') ? 0 : id.endsWith('Green') ? 1 : 2, s = sim.levels.get(id)!;
      for (let f = 0; f < nFrames; f++) rgb[f * 3 + k] = Math.max(rgb[f * 3 + k], Math.round(s[f] * 255));
    });
    rows.push({ label: 'interior', kind: 'rgb', color: [255, 255, 255], series: [], rgb });
  }
  return { name, letter, rows, lamps };
}
