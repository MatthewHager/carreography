// Tesla's 3D car models and paint table. They're Tesla's, so the site can't host them: people extract
// them from the Tesla app themselves (tesla-model-extractor) and add the .glb files, and the paint table
// (paints.json, the same next to every model), here once; the browser keeps them. While developing, the
// copies in preview3d/public/models/ are served too (vite.config.ts).

import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FILES, parseAppModel, type AppModelId } from '@/viewer/car/appBody';
import type { Paint } from '@/viewer/rig';
import { getFile, putFile } from './store';

export const MODEL_IDS = Object.keys(FILES) as AppModelId[];

export const MODEL_LABELS: Record<AppModelId, string> = {
  s_palladium: 'Model S (2021+)',
  model3_high: 'Model 3 (2017–23)',
  poppyseed: 'Model 3 (2024+)',
  x_palladium: 'Model X (2021+)',
  y_high: 'Model Y (2020–24)',
  bayberry: 'Model Y (2025+)',
  bayberry_e41: 'Model Y Standard (2025+)',
  bayberry_e80: 'Model Y L',
  cybertruck: 'Cybertruck',
};

export const PAINT_FILE = 'paints.json';

const key = (id: AppModelId) => `model:${id}`;
const PAINTS_KEY = 'paints';
const parsed = new Map<AppModelId, Promise<GLTF | undefined>>();
let paints: Promise<Paint[]> | undefined;

/** A file the dev server serves from the extracted copies, or undefined. */
async function devFile(path: string): Promise<ArrayBuffer | undefined> {
  if (!import.meta.env.DEV) return undefined;
  const res = await fetch(`${import.meta.env.BASE_URL}dev/models/${path}`).catch(() => undefined);
  return res?.ok ? res.arrayBuffer() : undefined;
}

async function bytesFor(id: AppModelId): Promise<ArrayBuffer | undefined> {
  const kept = await getFile(key(id)).catch(() => undefined);
  return kept ?? devFile(`${id}/${FILES[id]}`);
}

/** The model, or undefined when it hasn't been added. */
export function loadModel(id: AppModelId): Promise<GLTF | undefined> {
  if (!parsed.has(id)) {
    parsed.set(id, bytesFor(id).then((b) => (b ? parseAppModel(b) : undefined)).catch(() => undefined));
  }
  return parsed.get(id)!;
}

export async function hasModel(id: AppModelId): Promise<boolean> {
  return (await bytesFor(id)) !== undefined;
}

/** The paints in the app's table (paints.json), with the duplicate names it keeps for older option
 * codes folded into the first; [] until the table has been added. */
export function loadPaints(): Promise<Paint[]> {
  paints ??= (async () => {
    const bytes = (await getFile(PAINTS_KEY).catch(() => undefined)) ?? (await devFile(`bayberry/${PAINT_FILE}`));
    return bytes ? parsePaints(bytes) : [];
  })().catch(() => []);
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

/** Keep a dropped file if it's one of Tesla's models or the paint table; returns which, or null. */
export async function addModelFile(file: File): Promise<AppModelId | 'paints' | null> {
  const bytes = await file.arrayBuffer();
  if (file.name.toLowerCase() === PAINT_FILE) {
    if (!parsePaints(bytes).length) return null;
    await putFile(PAINTS_KEY, bytes);
    paints = undefined;
    return 'paints';
  }
  const id = MODEL_IDS.find((m) => FILES[m].toLowerCase() === file.name.toLowerCase());
  if (!id) return null;
  await parseAppModel(bytes);                 // refuse anything that isn't a model
  await putFile(key(id), bytes);
  parsed.delete(id);
  return id;
}
