// The set the cars stand on (adapted from tesla-lightshow-studio, AGPL-3.0): an empty parking lot at
// night, after rain, the lineup in a driving aisle with the stall rows and planted islands ahead of
// and behind it. The four poles round the lineup light it, as a lot's lamps do: enough to see the cars'
// shapes and finishes, not so much that their own lights stop standing out. Farther lamps' pools, the
// puddles and the stall lines are painted into the asphalt shader (real lights there would cost an iPad
// too much).
//
// Layout (meters, x = forward, z = right): the car is backed into a stall,
// facing +x toward the driving aisle, with a planted island just behind it.
// The lot repeats every MODULE meters along x: island, a row of stalls, a
// driving aisle, and a row backing onto the next island. Our row starts at
// the island edge x = -HEAD_X.

import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';

const HEAD_X = -11.3;
const ISLAND = 2;
const STALL_LENGTH = 5.8;
const STALL_WIDTH = 2.7;
const AISLE = 7;
const MODULE = ISLAND + 2 * STALL_LENGTH + AISLE;
const CURB_HEIGHT = 0.15;
// Poles stand in the islands, clear of the side and front camera views.
const POLE_Z = [-13.5, 13.5, -40.5, 40.5];
const LAMP_HEIGHT = 8;
const LAMP_COLOR = new THREE.Color('#ffefd9');     // a lot's LED lamps: warm white
const f = (n: number) => n.toFixed(3);
/** The islands' lamps either side of the lineup's aisle, which light it for real (x, z). */
const NEAR: [number, number][] = [0, 1].flatMap((k) => POLE_Z.slice(0, 2).map((z): [number, number] => [-(HEAD_X + ISLAND / 2 + k * MODULE), z]));
/** Ground positions (x, z) under the next lamps out, lit in the asphalt shader. */
const POOLS: [number, number][] = [-1, 2].flatMap((k) => POLE_Z.slice(0, 2).map((z): [number, number] => [-(HEAD_X + ISLAND / 2 + k * MODULE), z]));
// Each near lamp's head, an LED panel: its glow (three.js nits) and size. A panel, not a point, so its
// reflection on paint and glass is a soft square, as a real lot lamp's is, never a pinpoint like a lit lamp.
const LAMP_NITS = 200;
const LAMP_PANEL = 1.4;

// Value noise and fbm for the asphalt's grain and puddles.
const NOISE_GLSL = /* glsl */ `
  float st_hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float st_noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(st_hash(i), st_hash(i + vec2(1.0, 0.0)), u.x),
               mix(st_hash(i + vec2(0.0, 1.0)), st_hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float st_fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * st_noise(p);
      p = p * 2.03 + 17.1;
      a *= 0.5;
    }
    return v;
  }
  /** 1 in standing water, 0 on merely damp asphalt. */
  float st_puddle(vec2 p) {
    return smoothstep(0.5, 0.62, st_fbm(p * 0.32 + vec2(3.7, 1.3)));
  }
  /** Stall lines: 1 on a line. They run along x, between stalls, in both rows of each module. */
  vec3 st_paint(vec2 p) {
    float u = mod(-p.x - (${f(HEAD_X)}), ${f(MODULE)});
    float inRow = step(${f(ISLAND)}, u) * step(u, ${f(ISLAND + STALL_LENGTH)}) + step(${f(ISLAND + STALL_LENGTH + AISLE)}, u);
    float w = (p.y - ${f(STALL_WIDTH / 2)}) / ${f(STALL_WIDTH)};
    float d = abs(w - floor(w + 0.5)) * ${f(STALL_WIDTH)};
    float line = (1.0 - smoothstep(0.05, 0.07, d)) * inRow;
    // Worn paint: break it up a little.
    float wear = 0.55 + 0.45 * smoothstep(0.2, 0.6, st_noise(p * 7.0));
    return vec3(line, 0.0, 0.0) * wear;
  }
`;

/** Builds the lot into the scene: its lamp poles (each placed at its foot) and a function that takes it
 * down again. */
export function buildLot(scene: THREE.Scene): { poles: THREE.Object3D[]; dispose: () => void } {
  const group = new THREE.Group();
  group.name = 'lot';
  scene.add(group);
  const owned: { dispose(): void }[] = [];
  const own = <T extends { dispose(): void }>(x: T) => (owned.push(x), x);

  // Lit asphalt, with the sky map off and its highlights kept low: broad glare from the fill lights
  // washed the whole lot out.
  const asphalt = own(
    new THREE.MeshPhysicalMaterial({ color: '#25282d', roughness: 0.6, metalness: 0, envMapIntensity: 0, specularIntensity: 0.12 }),
  );
  asphalt.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vStreetWorld;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvStreetWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vStreetWorld;\n${NOISE_GLSL}`)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec2 sp = vStreetWorld.xz;
        float sPuddle = st_puddle(sp);
        vec3 sPaint = st_paint(sp);
        float sGrain = st_noise(sp * 38.0) * 0.6 + st_noise(sp * 4.0) * 0.4;
        diffuseColor.rgb *= mix(0.55, 1.25, sGrain);
        // Water darkens asphalt.
        diffuseColor.rgb *= mix(1.0, 0.45, sPuddle);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.55), sPaint.r * 0.85);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.62, 0.45, 0.08), sPaint.g * 0.85);`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.08, sPuddle);`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float sPool = 0.0;
        for (int i = 0; i < ${POOLS.length}; i++) {
          vec2 dp = sp - uPools[i];
          sPool += exp(-dot(dp, dp) / 70.0);
        }
        totalEmissiveRadiance += vec3(1.0, 0.86, 0.66) * diffuseColor.rgb * sPool * 0.9;`,
      )
      .replace('#include <common>', `#include <common>\nuniform vec2 uPools[${POOLS.length}];`);
    shader.uniforms.uPools = { value: POOLS.map(([x, z]) => new THREE.Vector2(x, z)) };
  };
  const ground = new THREE.Mesh(own(new THREE.PlaneGeometry(120, 120)), asphalt);
  ground.rotation.x = -Math.PI / 2;
  ground.name = 'ground';
  group.add(ground);

  // Planted islands at the head of each pair of rows: a concrete curb
  // around dark mulch, with the lot's light poles.
  const curb = own(new THREE.MeshStandardMaterial({ color: '#3a3c40', roughness: 0.6 }));
  const mulch = own(new THREE.MeshStandardMaterial({ color: '#121410', roughness: 0.95, envMapIntensity: 0.2 }));
  const curbGeometry = own(new THREE.BoxGeometry(ISLAND, CURB_HEIGHT, 120));
  const mulchGeometry = own(new THREE.BoxGeometry(ISLAND - 0.3, 0.01, 120));
  const pole = own(new THREE.MeshStandardMaterial({ color: '#2a2c30', roughness: 0.5, metalness: 0.4 }));
  const head = own(new THREE.MeshStandardMaterial({ color: '#000', emissive: LAMP_COLOR, emissiveIntensity: 2.2 }));
  const poleGeometry = own(new THREE.CylinderGeometry(0.07, 0.1, LAMP_HEIGHT, 10));
  const headGeometry = own(new THREE.BoxGeometry(0.7, 0.12, 0.7));
  const baseGeometry = own(new THREE.CylinderGeometry(0.25, 0.25, 0.5, 12));
  const poles: THREE.Object3D[] = [];
  for (let k = -2; k <= 2; k++) {
    const x = -(HEAD_X + ISLAND / 2 + k * MODULE);
    const island = new THREE.Mesh(curbGeometry, curb);
    island.position.set(x, CURB_HEIGHT / 2, 0);
    const bed = new THREE.Mesh(mulchGeometry, mulch);
    bed.position.set(x, CURB_HEIGHT + 0.005, 0);
    group.add(island, bed);
    for (const z of POLE_Z) {
      const base = new THREE.Mesh(baseGeometry, curb);
      base.position.set(0, CURB_HEIGHT + 0.25, 0);
      const post = new THREE.Mesh(poleGeometry, pole);
      post.position.set(0, CURB_HEIGHT + LAMP_HEIGHT / 2, 0);
      const glow = new THREE.Mesh(headGeometry, head);
      glow.position.set(0, CURB_HEIGHT + LAMP_HEIGHT, 0);
      const lamp = new THREE.Group().add(base, post, glow);
      lamp.position.set(x, 0, z);
      poles.push(lamp);
      group.add(lamp);
    }
  }

  RectAreaLightUniformsLib.init();
  for (const [x, z] of NEAR) {
    const lamp = new THREE.RectAreaLight(LAMP_COLOR, LAMP_NITS, LAMP_PANEL, LAMP_PANEL);
    lamp.position.set(x, CURB_HEIGHT + LAMP_HEIGHT - 0.1, z);
    // tilted in toward the lineup, so each lamp's pool reaches the cars as well as its own island
    lamp.lookAt(x * 0.35, 0, z * 0.35);
    group.add(lamp);
  }

  return {
    poles,
    dispose: () => {
      for (const o of owned) o.dispose();
      scene.remove(group);
    },
  };
}

/**
 * What the cars' finishes reflect: a night sky over a lit lot, the lamp heads overhead bright and warm, and
 * the asphalt round them catching their light. Stainless and chrome mirror it, paint shows it through its
 * clear coat, as the app's studio does in daylight.
 */
export function lotEnvironment(): THREE.Scene {
  const env = new THREE.Scene();
  const sky = new THREE.SphereGeometry(50, 48, 24);
  const colors: number[] = [];
  const pos = sky.attributes.position as THREE.BufferAttribute;
  const zenith = new THREE.Color('#121722');
  const horizon = new THREE.Color('#68717e');
  const ground = new THREE.Color('#3a3733');
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 50;
    if (y >= 0) c.lerpColors(horizon, zenith, Math.pow(y, 0.5));
    else c.lerpColors(horizon, ground, Math.min(1, -y * 6));
    colors.push(c.r, c.g, c.b);
  }
  sky.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  env.add(new THREE.Mesh(sky, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  // The lamp heads: the four round the lineup, and a ring of farther ones
  const lamp = new THREE.MeshBasicMaterial({ color: LAMP_COLOR.clone().multiplyScalar(2) });
  const heads: [number, number, number][] = [...NEAR.map(([x, z]): [number, number, number] => [x, z, 1]),
    ...POOLS.map(([x, z]): [number, number, number] => [x, z, 0.6]), [-30, 35, 0.5], [35, -30, 0.5]];
  for (const [x, z, s] of heads) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.4 * s, 0.25 * s, 1.4 * s), lamp);
    m.position.set(x, LAMP_HEIGHT + CURB_HEIGHT, z);
    env.add(m);
  }
  // The pools of light the lamps throw on the wet asphalt, which the lower body and glass reflect
  const pool = new THREE.MeshBasicMaterial({ color: LAMP_COLOR.clone().multiplyScalar(0.35) });
  for (const [x, z] of NEAR) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(7, 24), pool);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x * 0.6, 0.01, z * 0.6);
    env.add(m);
  }
  return env;
}
