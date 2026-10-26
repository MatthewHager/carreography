// A stainless "cyber cooler" in front of the lineup, lid open, with dry-ice fog pouring out of it
// and candy-coloured lights inside tinting the fog. Scene dressing: not driven by the show file.
//
// The fog is a few hundred soft, normally-blended sprites (so they occlude each other and read as a
// volume), born inside the cooler, spilling over the rim, sinking to the ground and spreading out
// as they thin, with a little turbulence. Near the cooler they take the colour of the lights.
import * as THREE from 'three';

const PALETTE = ['#ff2bd6', '#2bd7ff', '#7cff2b', '#ff8a1f', '#b14dff'].map((c) => new THREE.Color(c));

function puffTexture(seed: number): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  let s = seed;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  // A wispy puff: a handful of overlapping soft discs.
  for (let i = 0; i < 7; i++) {
    const x = 64 + (rnd() - 0.5) * 60;
    const y = 64 + (rnd() - 0.5) * 60;
    const r = 26 + rnd() * 30;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, 'rgba(255,255,255,0.55)');
    grd.addColorStop(0.5, 'rgba(255,255,255,0.18)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function glowTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.3, 'rgba(255,255,255,0.4)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

interface Puff {
  sprite: THREE.Sprite;
  x: number; y: number; z: number;
  dirX: number; dirZ: number;   // spill direction on the ground
  speed: number;
  age: number; life: number;
  size: number; alpha: number;
  phase: number;
}

export class CoolerFog {
  readonly group = new THREE.Group();
  private readonly puffs: Puff[] = [];
  private readonly lamps: THREE.Sprite[] = [];
  private readonly lampColor = new THREE.Color();
  private readonly textures: THREE.Texture[];
  private t = 0;
  // Cooler dimensions (metres): W is the long side, which runs parallel to the lineup (z);
  // D is the short side, toward the crowd (x); H the rim height. The lid hinges along the
  // back long edge (the vehicles' side) and opens away from the crowd.
  private readonly W = 0.62;
  private readonly D = 0.42;
  private readonly H = 0.40;

  constructor(count = 260) {
    this.textures = [puffTexture(1), puffTexture(2), puffTexture(3)];
    this.buildCooler();
    for (let i = 0; i < count; i++) {
      const p = this.spawn(Math.random() * 6);
      this.puffs.push(p);
      this.group.add(p.sprite);
    }
    const glow = glowTexture();
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9,
      }));
      s.position.set(0, this.H * 0.45, (i - 1) * 0.18);
      s.scale.setScalar(0.5);
      this.lamps.push(s);
      this.group.add(s);
    }
    this.update(0);
  }

  private buildCooler(): void {
    const steel = new THREE.MeshStandardMaterial({ color: '#b9bcc0', metalness: 0.85, roughness: 0.32 });
    const dark = new THREE.MeshStandardMaterial({ color: '#0d0e12', roughness: 0.9 });
    const { W, D, H } = this;
    // Body with a slight Cybertruck taper: wider at the top.
    const body = new THREE.Mesh(new THREE.BoxGeometry(D, H, W), steel);
    body.position.y = H / 2;
    const inner = new THREE.Mesh(new THREE.BoxGeometry(D - 0.06, H - 0.03, W - 0.06), dark);
    inner.position.y = H / 2 + 0.02;
    // Lid: hinged along the back long edge (-x, toward the vehicles), swung open 105 degrees
    // away from the crowd, so the open chest faces the kids.
    const lidPivot = new THREE.Group();
    lidPivot.position.set(-D / 2, H, 0);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(D, 0.05, W + 0.02), steel);
    lid.position.set(D / 2, 0.025, 0);
    lidPivot.add(lid);
    lidPivot.rotation.z = THREE.MathUtils.degToRad(105);
    const feet = new THREE.Mesh(new THREE.BoxGeometry(D - 0.08, 0.02, W - 0.08), dark);
    feet.position.y = 0.01;
    this.group.add(body, inner, lidPivot, feet);
  }

  private spawn(age = 0): Puff {
    const { W, D, H } = this;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.textures[Math.floor(Math.random() * this.textures.length)],
      transparent: true, depthWrite: false, opacity: 0, color: 0xffffff,
    }));
    // Spill mostly toward the crowd (+x) and the sides, little toward the back.
    const ang = (Math.random() - 0.5) * Math.PI * 1.4;
    const dirX = Math.cos(ang);
    const dirZ = Math.sin(ang);
    const p: Puff = {
      sprite,
      x: (Math.random() - 0.5) * D * 0.6,
      y: H * 0.55 + Math.random() * 0.2,
      z: (Math.random() - 0.5) * W * 0.6,
      dirX, dirZ,
      speed: 0.18 + Math.random() * 0.22,
      age,
      life: 4.5 + Math.random() * 3.5,
      size: 0.22 + Math.random() * 0.18,
      alpha: 0.16 + Math.random() * 0.14,
      phase: Math.random() * Math.PI * 2,
    };
    sprite.position.set(p.x, p.y, p.z);
    return p;
  }

  update(dt: number): void {
    this.t += dt;
    const { W, D, H } = this;
    // The lights inside: slow colour cycling, one colour leading.
    const k = (this.t * 0.25) % PALETTE.length;
    const i0 = Math.floor(k);
    this.lampColor.copy(PALETTE[i0]!).lerp(PALETTE[(i0 + 1) % PALETTE.length]!, k - i0);
    this.lamps.forEach((s, i) => {
      const c = s.material.color.copy(PALETTE[(i0 + i * 2) % PALETTE.length]!).lerp(PALETTE[(i0 + i * 2 + 1) % PALETTE.length]!, k - i0);
      c.multiplyScalar(0.8 + 0.2 * Math.sin(this.t * 2 + i));
      s.scale.setScalar(0.7 + 0.1 * Math.sin(this.t * 3 + i * 2));
    });
    const tint = new THREE.Color();
    for (const p of this.puffs) {
      p.age += dt;
      if (p.age >= p.life) {
        const fresh = this.spawn();
        this.group.remove(p.sprite);
        p.sprite.material.dispose();
        Object.assign(p, fresh);
        this.group.add(p.sprite);
      }
      const u = p.age / p.life;
      // Phase 1: well up to the rim; phase 2: over the edge and down; phase 3: creep along the ground.
      const rimY = H + 0.05;
      const outside = Math.abs(p.x) > D / 2 - 0.05 || Math.abs(p.z) > W / 2 - 0.05;
      if (!outside) {
        p.y += 0.12 * dt;
        if (p.y >= rimY) {
          p.x += p.dirX * p.speed * dt * 1.6;
          p.z += p.dirZ * p.speed * dt * 1.6;
        } else {
          p.x += p.dirX * p.speed * dt * 0.4;
          p.z += p.dirZ * p.speed * dt * 0.4;
        }
      } else {
        const floor = 0.06 + 0.05 * Math.sin(p.phase + this.t * 0.8);
        p.y += (floor - p.y) * Math.min(1, 1.6 * dt);          // heavy gas: falls and hugs the ground
        const drift = p.speed * (0.9 + 0.5 * u);
        p.x += (p.dirX * drift + 0.04 * Math.sin(this.t * 0.9 + p.phase)) * dt;
        p.z += (p.dirZ * drift + 0.04 * Math.cos(this.t * 0.7 + p.phase)) * dt;
      }
      const grow = 1 + 3.2 * u;                                   // thins as it spreads
      const a = p.alpha * Math.sin(Math.PI * Math.min(1, u * 1.15)) * (outside ? 1 : 0.8);
      const dist = Math.hypot(p.x, p.z);
      const colourK = Math.exp(-dist / 1.0) * 0.95;              // lit by the lights near the source
      tint.setRGB(0.86, 0.88, 0.92).lerp(this.lampColor, colourK);
      p.sprite.position.set(p.x, p.y, p.z);
      p.sprite.scale.setScalar(p.size * grow);
      p.sprite.material.opacity = a;
      p.sprite.material.color.copy(tint);
      p.sprite.material.rotation = p.phase + this.t * 0.1;
    }
  }
}
