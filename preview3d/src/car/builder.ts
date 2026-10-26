// What a body builder (meshBody.ts for Tesla's meshes, bodies.ts for the
// code-built bodies) uses to add the parts a show drives. Adapted from
// tesla-lightshow-studio's CarScene.ts (AGPL-3.0, Nathan Grace); in this
// viewer each car in the lineup has its own Builder (see rig.ts).

import type * as THREE from 'three';

export interface Materials {
  paint: THREE.MeshPhysicalMaterial;
  /** Paint for Tesla's own meshes: their texture is a red paint bake, read as shading. */
  meshPaint: THREE.MeshPhysicalMaterial;
  glass: THREE.MeshPhysicalMaterial;
  sideGlass: THREE.MeshPhysicalMaterial;
  smallPaint: THREE.MeshStandardMaterial;
  trim: THREE.MeshStandardMaterial;
  cabin: THREE.MeshStandardMaterial;
  display: THREE.MeshStandardMaterial;
}

/** A glow sprite the builder places by hand (the charge port LED). */
export interface GlowHandle {
  color: THREE.Color;
  level: number;
}

export interface Builder {
  car: THREE.Group;
  m: Materials;
  cabinLight: THREE.PointLight;
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
  closure(id: string, apply: (position: number, dancing: boolean, timeS: number) => void, object?: THREE.Object3D): void;
  /** A real light in the studio; here it becomes a light pool on the ground. */
  beam(ids: string[], light: THREE.Light, max: number): void;
  /** A free glow sprite at a point in `parent`'s space (meters after parent scale). */
  glow(parent: THREE.Object3D, position: THREE.Vector3, size: number): GlowHandle;
}

export interface BuiltBody {
  halfLength: number;
  height: number;
  halfWidth: number;
  paint?: string;
  cabinGain?: number;
}
