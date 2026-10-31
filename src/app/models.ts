// Tesla's 3D car models and paint table, from the Tesla app. The site serves them from
// models/tesla-app/ (the Pages build downloads them from the repository's "car-models" release, so
// they never enter the git history); the browser's cache keeps them between visits.

import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FILES, parseAppModel, type AppModelId } from '@/viewer/car/appBody';
import type { Paint } from '@/viewer/paints';

const parsed = new Map<AppModelId, Promise<GLTF | undefined>>();
let paints: Promise<Paint[]> | undefined;

async function fetchModelFile(name: string): Promise<ArrayBuffer | undefined> {
  const res = await fetch(`${import.meta.env.BASE_URL}models/tesla-app/${name}`).catch(() => undefined);
  return res?.ok ? res.arrayBuffer() : undefined;
}

/** The model, or undefined when it couldn't be loaded. */
export function loadModel(id: AppModelId): Promise<GLTF | undefined> {
  if (!parsed.has(id)) {
    parsed.set(id, fetchModelFile(FILES[id]).then((b) => (b ? parseAppModel(b) : undefined)).catch(() => undefined));
  }
  return parsed.get(id)!;
}

/** The paints in the app's table (paints.json), with the duplicate names it keeps for older option
 * codes folded into the first; [] when the table couldn't be loaded. */
export function loadPaints(): Promise<Paint[]> {
  paints ??= fetchModelFile('paints.json').then((b) => (b ? parsePaints(b) : [])).catch(() => []);
  return paints;
}

/** The paints a car can wear: the app's table, except the Cybertruck, which only comes in stainless. */
export async function paintsFor(id: AppModelId): Promise<Paint[]> {
  return id === 'cybertruck' ? [] : loadPaints();
}

/** "MidnightCherryRed" -> "Midnight Cherry Red". */
export const paintLabel = (name: string) => name.replace(/([a-z])([A-Z])/g, '$1 $2');

function parsePaints(bytes: ArrayBuffer): Paint[] {
  const table = JSON.parse(new TextDecoder().decode(bytes)) as {
    colors?: Record<string, { albedo?: string; metallic?: number; roughness?: number }>;
  };
  const out: Paint[] = [];
  const seen = new Set<string>();
  for (const [name, c] of Object.entries(table.colors ?? {})) {
    if (typeof c.albedo !== 'string' || !/^#[0-9a-f]{6}$/i.test(c.albedo)) continue;
    const paint = { name, albedo: c.albedo, metallic: Number(c.metallic ?? 0.3), roughness: Number(c.roughness ?? 0.04) };
    const look = `${paint.albedo}/${paint.metallic}/${paint.roughness}`;
    if (seen.has(look)) continue;
    seen.add(look);
    out.push(paint);
  }
  return out;
}
