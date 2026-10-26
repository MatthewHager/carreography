// Tesla's own 3D models of the Model S and Cybertruck, from its xLights
// project (teslamotors/light-show, xlights/tesla_xlights_show_folder). Copied
// into public/models/ and loaded from there. Adapted from
// tesla-lightshow-studio's teslaAssets.ts (AGPL-3.0), which downloads the zip
// at runtime instead.

import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { parseXlightsLayout, type LayoutMesh, type XlightsLayout } from '../core/xlightsLayout';

export type TeslaMeshModel = 'modelS' | 'cybertruck';

/** What each material in Tesla's OBJ files is, from its .mtl (which texture it uses). */
export type MaterialRole = 'paint' | 'trim' | 'black' | 'glass' | 'lens' | 'redLens' | 'wheel' | 'tire';

interface Source {
  folder: string;
  obj: string;
  roles: Record<string, MaterialRole>;
  maps: Record<string, string>;
}

const SOURCES: Record<TeslaMeshModel, Source> = {
  modelS: {
    folder: 'Model_S',
    obj: 'ModelS.obj',
    roles: {
      BodySG: 'paint',
      BodySG1: 'paint',
      BodySG2: 'trim',
      BodySG3: 'black',
      BodySG4: 'redLens',
      LightsSG: 'lens',
      Windows_TopSG: 'glass',
      Arachnid21_Wheel_LFSG: 'wheel',
      Arachnid21_Wheel_LFSG1: 'tire',
    },
    maps: {
      BodySG: 'Exterior_AO.png',
      BodySG1: 'Exterior_AO.png',
      BodySG2: 'Exterior_AO_Dark.png',
      BodySG4: 'Lights_Red_AO.png',
      LightsSG: 'Lights_AO.png',
      Arachnid21_Wheel_LFSG: 'Arachnid_Wheel_AO.png',
    },
  },
  cybertruck: {
    folder: 'Cybertruck',
    obj: 'Cybertruck.obj',
    roles: {
      blinn3SG: 'paint',
      lambert2SG: 'trim',
      lambert3SG: 'black',
      blinn5SG: 'lens',
      blinn6SG: 'redLens',
      phong1SG: 'glass',
      blinn4SG: 'wheel',
      lambert4SG: 'wheel',
    },
    maps: {
      blinn3SG: 'Paint_Red_AO.png',
      lambert2SG: 'Exterior_AO_Dark.png',
      blinn5SG: 'Lights_AO.png',
      blinn6SG: 'Lights_AO_Red.png',
      blinn4SG: 'Cybertruck_Premium_Wheel_AO_Dark.png',
      lambert4SG: 'Cybertruck_Premium_Wheel_AO_Dark.png',
    },
  },
};

export interface TeslaAsset {
  model: TeslaMeshModel;
  meshes: THREE.Mesh[];
  roles: Record<string, MaterialRole>;
  textures: Map<string, THREE.Texture>;
  paintScale: number;
  layout: XlightsLayout;
  layoutMesh: LayoutMesh;
}

export type Progress = (label: string, fraction: number) => void;

const BASE = './models/';

/** Fetches a file, reporting download progress when the size is known. */
export async function fetchWithProgress(url: string, onProgress?: (f: number) => void): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const total = Number(res.headers.get('content-length')) || 0;
  if (!res.body || !total || !onProgress) return res.arrayBuffer();
  const reader = res.body.getReader();
  const out = new Uint8Array(total);
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (got + value.length > out.length) {
      // Server lied about the length; fall back to concatenation.
      const bigger = new Uint8Array(Math.max(out.length * 2, got + value.length));
      bigger.set(out.subarray(0, got));
      return finishGrow(bigger, got, value, reader);
    }
    out.set(value, got);
    got += value.length;
    onProgress(got / total);
  }
  return out.buffer.slice(0, got) as ArrayBuffer;
}

async function finishGrow(
  buf: Uint8Array,
  got: number,
  first: Uint8Array,
  reader: ReadableStreamDefaultReader<Uint8Array>,
): Promise<ArrayBuffer> {
  let out = buf;
  const push = (v: Uint8Array) => {
    if (got + v.length > out.length) {
      const b = new Uint8Array((got + v.length) * 2);
      b.set(out.subarray(0, got));
      out = b;
    }
    out.set(v, got);
    got += v.length;
  };
  push(first);
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    push(value);
  }
  return out.buffer.slice(0, got) as ArrayBuffer;
}

let layoutPromise: Promise<XlightsLayout> | undefined;
function loadLayout(): Promise<XlightsLayout> {
  layoutPromise ??= fetch(`${BASE}xlights_rgbeffects.xml`)
    .then((r) => {
      if (!r.ok) throw new Error(`xlights_rgbeffects.xml: HTTP ${r.status}`);
      return r.text();
    })
    .then(parseXlightsLayout);
  return layoutPromise;
}

const loaded = new Map<TeslaMeshModel, Promise<TeslaAsset>>();

export function loadTeslaAsset(model: TeslaMeshModel, onProgress?: Progress): Promise<TeslaAsset> {
  let p = loaded.get(model);
  if (!p) {
    p = build(model, onProgress);
    loaded.set(model, p);
    p.catch(() => loaded.delete(model));
  }
  return p;
}

async function build(model: TeslaMeshModel, onProgress?: Progress): Promise<TeslaAsset> {
  const src = SOURCES[model];
  const dir = `${BASE}${src.folder}/`;
  const label = model === 'cybertruck' ? 'Cybertruck model' : 'Model S/Y model';
  const [layout, objBytes] = await Promise.all([
    loadLayout(),
    fetchWithProgress(dir + src.obj, (f) => onProgress?.(label, f * 0.85)),
  ]);
  const layoutMesh = layout.meshes.find((m) => m.objFile === src.obj);
  if (!layoutMesh) throw new Error(`Tesla's layout doesn't place ${src.obj}`);

  onProgress?.(`${label}: parsing`, 0.88);
  // Let the progress text paint before the (blocking) parse.
  await new Promise((r) => setTimeout(r, 30));
  const group = new OBJLoader().parse(new TextDecoder().decode(objBytes));
  const meshes = group.children.filter((c): c is THREE.Mesh => c instanceof THREE.Mesh);

  const textures = new Map<string, THREE.Texture>();
  let paintScale = 1;
  const paintMap = src.maps[Object.keys(src.roles).find((k) => src.roles[k] === 'paint')!];
  const loader = new THREE.TextureLoader();
  await Promise.all(
    [...new Set(Object.values(src.maps))].map(async (name) => {
      const texture = await loader.loadAsync(dir + name);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      // Tesla's UVs use whole-tile offsets (some run -1..0 or 1..2).
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.needsUpdate = true;
      textures.set(name, texture);
      if (name === paintMap) paintScale = 1 / brightestPaint(texture.image as HTMLImageElement);
    }),
  );
  onProgress?.(label, 1);
  return { model, meshes, roles: src.roles, textures, paintScale, layout, layoutMesh };
}

/**
 * Tesla baked the body texture as red paint with ambient occlusion. Well-lit
 * paint (90th percentile red, linear) becomes the full paint color.
 */
function brightestPaint(image: HTMLImageElement): number {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return 1;
  ctx.drawImage(image, 0, 0, size, size);
  const data = ctx.getImageData(0, 0, size, size).data;
  const reds: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!;
    if (r > 40 && r > Math.max(data[i + 1]!, data[i + 2]!) * 1.5) reds.push(r);
  }
  if (!reds.length) return 1;
  reds.sort((a, b) => a - b);
  const srgb = reds[Math.floor(reds.length * 0.9)]! / 255;
  return Math.max(0.05, new THREE.Color().setRGB(srgb, 0, 0, THREE.SRGBColorSpace).r);
}
