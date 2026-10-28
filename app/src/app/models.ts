// Tesla's 3D car models. They're Tesla's, so the site can't host them: people extract them from the
// Tesla app themselves (tesla-model-extractor) and add the .glb files here once; the browser keeps
// them. While developing, the copies in preview3d/public/models/ are served too (vite.config.ts).

import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FILES, parseAppModel, type AppModelId } from '@/viewer/car/appBody';
import { getFile, putFile } from './store';

export const MODEL_IDS = Object.keys(FILES) as AppModelId[];

export const MODEL_LABELS: Record<AppModelId, string> = {
  bayberry: 'Model Y (2025+)',
  y_high: 'Model Y (2020–24)',
  cybertruck: 'Cybertruck',
};

const key = (id: AppModelId) => `model:${id}`;
const parsed = new Map<AppModelId, Promise<GLTF | undefined>>();

async function bytesFor(id: AppModelId): Promise<ArrayBuffer | undefined> {
  const kept = await getFile(key(id)).catch(() => undefined);
  if (kept) return kept;
  if (import.meta.env.DEV) {
    const res = await fetch(`${import.meta.env.BASE_URL}dev/models/${id}/${FILES[id]}`).catch(() => undefined);
    if (res?.ok) return res.arrayBuffer();
  }
  return undefined;
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

/** Keep a dropped .glb if its name is one of Tesla's models; returns which one, or null. */
export async function addModelFile(file: File): Promise<AppModelId | null> {
  const id = MODEL_IDS.find((m) => FILES[m].toLowerCase() === file.name.toLowerCase());
  if (!id) return null;
  const bytes = await file.arrayBuffer();
  await parseAppModel(bytes);                 // refuse anything that isn't a model
  await putFile(key(id), bytes);
  parsed.delete(id);
  return id;
}
