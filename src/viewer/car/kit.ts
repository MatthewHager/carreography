// Shared look: lamp lens colours, and the soft contact shadow under each car.

import * as THREE from 'three';

export const COLORS = {
  white: new THREE.Color('#fff4e0'),
  amber: new THREE.Color('#ffa21a'),
  red: new THREE.Color('#ff1a1a'),
  lensFront: new THREE.Color('#25282d'),
  lensRear: new THREE.Color('#3a0a0a'),
  lensAmber: new THREE.Color('#3a2408'),
};

/** A soft oval shadow texture for under a car. */
export function shadowTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(128, 64, 10, 128, 64, 128);
  gradient.addColorStop(0, 'rgba(0,0,0,0.75)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.setTransform(1, 0, 0, 0.5, 0, 32);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
