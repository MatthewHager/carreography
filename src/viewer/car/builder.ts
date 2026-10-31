// What the body builder (appBody.ts, Tesla's app models) uses to add the parts a show drives. Adapted from
// tesla-lightshow-studio's CarScene.ts (AGPL-3.0, Nathan Grace); in this
// viewer each car in the lineup has its own Builder (see rig.ts).

import type * as THREE from 'three';

/** What a lamp throws on the ground: the main beams, the reverse lights, the tails' red glow. */
export type PoolKind = 'head' | 'reverse' | 'tail';

/** A glow sprite the builder places by hand (the charge port LED). */
export interface GlowHandle {
  color: THREE.Color;
  level: number;
}

export interface Builder {
  car: THREE.Group;
  light(
    parent: THREE.Object3D,
    ids: string[],
    color: THREE.Color,
    lens: THREE.Color,
    size: [number, number, number],
    position: [number, number, number],
    gain?: number,
  ): THREE.Mesh;
  /** Registers an existing mesh (with its own material) as a lamp. */
  lightMesh(mesh: THREE.Mesh, ids: string[], color: THREE.Color, gain?: number): void;
  /**
   * Registers a mesh as a strip of LEDs along its local z axis, `from` to
   * `to`; `pixels[i]` lists the channels that light LED i.
   */
  lightBar(mesh: THREE.Mesh, pixels: string[][], from: number, to: number, color: THREE.Color, gain?: number): void;
  closure(id: string, apply: (position: number, dancing: boolean, timeS: number) => void): void;
  /** A pool of light on the ground from a lamp at `from` (car frame), aimed toward `to` where it has an aim. */
  pool(ids: string[], kind: PoolKind, from: THREE.Vector3, to?: THREE.Vector3): void;
  /** A free glow sprite at a point in `parent`'s space (meters after parent scale). */
  glow(parent: THREE.Object3D, position: THREE.Vector3, size: number): GlowHandle;
}

export interface BuiltBody {
  halfLength: number;
  height: number;
  halfWidth: number;
  /** This car's copies of the model's paint materials (none on the Cybertruck: stainless). */
  paints?: THREE.MeshStandardMaterial[];
}
