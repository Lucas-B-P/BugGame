import Phaser from 'phaser';
import { SPECIES, type SpeciesId } from '@bug-io/shared';

const TEX = {
  grass: 'grass',
  tree: 'tree',
  rock: 'rock',
  flower: 'flower',
  fruit: 'fruit',
  mushroom: 'mushroom',
  leaf: 'leaf',
  water: 'water',
  larva: 'larva',
  drop: 'drop',
  sting: 'sting',
  web: 'web',
  venom: 'venom',
  frog: 'frog',
  bird: 'bird',
  snake: 'snake',
  giant_spider: 'giant_spider',
} as const;

function circle(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, color: number, alpha = 1) {
  g.fillStyle(color, alpha);
  g.fillCircle(x, y, r);
}

export function generateTextures(scene: Phaser.Scene) {
  // Grass tile
  {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x6a9b4e);
    g.fillRect(0, 0, 64, 64);
    g.fillStyle(0x74a855, 0.55);
    for (let i = 0; i < 18; i++) {
      const x = (i * 17) % 64;
      const y = (i * 29) % 64;
      g.fillRect(x, y, 2, 6);
    }
    g.generateTexture(TEX.grass, 64, 64);
    g.destroy();
  }

  // Tree
  {
    const g = scene.make.graphics({ x: 0, y: 0 });
    circle(g, 40, 44, 34, 0x2d6a4f);
    circle(g, 40, 40, 30, 0x40916c);
    circle(g, 28, 34, 12, 0x52b788, 0.5);
    g.generateTexture(TEX.tree, 80, 80);
    g.destroy();
  }

  // Rock
  {
    const g = scene.make.graphics({ x: 0, y: 0 });
    circle(g, 22, 22, 18, 0x6c757d);
    circle(g, 16, 18, 6, 0xadb5bd, 0.45);
    g.generateTexture(TEX.rock, 44, 44);
    g.destroy();
  }

  // Flower
  {
    const g = scene.make.graphics({ x: 0, y: 0 });
    circle(g, 12, 8, 5, 0xff6b6b);
    circle(g, 18, 12, 5, 0xffd166);
    circle(g, 8, 12, 5, 0xffd166);
    circle(g, 12, 16, 5, 0xff6b6b);
    circle(g, 12, 12, 3, 0xfff3b0);
    g.generateTexture(TEX.flower, 24, 24);
    g.destroy();
  }

  const resourceColors: Record<string, number> = {
    fruit: 0xe63946,
    mushroom: 0x9b5de5,
    leaf: 0x80b918,
    water: 0x4cc9f0,
    larva: 0xffb703,
    drop: 0xf4a261,
    sting: 0xffb703,
    web: 0xedf2f4,
    venom: 0x80ed99,
  };

  for (const [key, color] of Object.entries(resourceColors)) {
    const g = scene.make.graphics({ x: 0, y: 0 });
    circle(g, 10, 10, 8, color);
    if (key === 'mushroom') circle(g, 10, 14, 4, 0xf8f9fa);
    if (key === 'leaf') {
      g.fillStyle(0x558b2f);
      g.fillTriangle(10, 2, 18, 14, 2, 14);
    }
    g.generateTexture(key, 20, 20);
    g.destroy();
  }

  // Bosses (simple shapes)
  {
    const g = scene.make.graphics({ x: 0, y: 0 });
    circle(g, 36, 40, 30, 0x2d6a4f);
    circle(g, 24, 28, 8, 0xffffff);
    circle(g, 48, 28, 8, 0xffffff);
    circle(g, 24, 28, 3, 0x111111);
    circle(g, 48, 28, 3, 0x111111);
    g.generateTexture(TEX.frog, 72, 72);
    g.destroy();
  }
  {
    const g = scene.make.graphics({ x: 0, y: 0 });
    circle(g, 34, 34, 22, 0x457b9d);
    g.fillStyle(0x1d3557);
    g.fillTriangle(50, 20, 70, 10, 58, 34);
    circle(g, 26, 28, 4, 0xffffff);
    g.generateTexture(TEX.bird, 72, 72);
    g.destroy();
  }
  {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x52796f);
    g.fillRoundedRect(8, 24, 56, 18, 9);
    circle(g, 58, 30, 10, 0x84a98c);
    circle(g, 62, 26, 2, 0x111111);
    g.generateTexture(TEX.snake, 72, 72);
    g.destroy();
  }
  {
    const g = scene.make.graphics({ x: 0, y: 0 });
    circle(g, 40, 40, 28, 0x22223b);
    for (const [x, y] of [
      [18, 18],
      [62, 18],
      [18, 62],
      [62, 62],
      [10, 40],
      [70, 40],
    ]) {
      g.lineStyle(3, 0x4a4e69);
      g.lineBetween(40, 40, x, y);
      circle(g, x, y, 4, 0x4a4e69);
    }
    circle(g, 32, 34, 4, 0xff0000);
    circle(g, 48, 34, 4, 0xff0000);
    g.generateTexture(TEX.giant_spider, 80, 80);
    g.destroy();
  }

  // Bug species textures
  for (const id of Object.keys(SPECIES) as SpeciesId[]) {
    drawBugTexture(scene, id);
  }

  // Projetil dos bosses (ataque a distancia)
  {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xff6b2d, 1);
    g.fillEllipse(22, 12, 36, 14);
    g.fillStyle(0xffe066, 0.95);
    g.fillEllipse(26, 12, 18, 8);
    g.fillStyle(0xffffff, 0.7);
    g.fillEllipse(30, 12, 8, 4);
    g.generateTexture('boss_bolt', 40, 24);
    g.destroy();
  }
}

function drawBugTexture(scene: Phaser.Scene, id: SpeciesId) {
  const def = SPECIES[id];
  const size = 48;
  const g = scene.make.graphics({ x: 0, y: 0 });
  const cx = size / 2;
  const cy = size / 2;

  // Body
  circle(g, cx, cy, def.size, def.color);

  // Accent details per species
  switch (id) {
    case 'ant':
      circle(g, cx - 8, cy, 5, 0x3d2b1f);
      circle(g, cx + 8, cy, 5, 0x3d2b1f);
      break;
    case 'ladybug':
      circle(g, cx - 5, cy - 2, 3, 0x111111);
      circle(g, cx + 5, cy + 3, 3, 0x111111);
      circle(g, cx + 2, cy - 5, 2.5, 0x111111);
      break;
    case 'beetle':
      g.fillStyle(0x0d1b2a, 0.5);
      g.fillEllipse(cx, cy, def.size * 1.6, def.size);
      break;
    case 'bee':
    case 'wasp':
      g.fillStyle(0x1d3557);
      g.fillRect(cx - 2, cy - def.size + 2, 4, def.size * 1.5);
      circle(g, cx - 6, cy, 3, 0xffe066);
      circle(g, cx + 6, cy, 3, 0xffe066);
      break;
    case 'spider':
      for (const a of [-0.8, -0.3, 0.3, 0.8]) {
        g.lineStyle(2, 0x22223b);
        g.lineBetween(cx, cy, cx + Math.cos(a) * 18, cy + Math.sin(a) * 10);
        g.lineBetween(cx, cy, cx + Math.cos(Math.PI + a) * 18, cy + Math.sin(Math.PI + a) * 10);
      }
      break;
    case 'scorpion':
      g.lineStyle(3, 0x5c0a1a);
      g.lineBetween(cx, cy, cx + 14, cy - 12);
      circle(g, cx + 14, cy - 12, 4, 0x9a031e);
      break;
  }

  // Eyes facing right (angle 0)
  circle(g, cx + def.size * 0.35, cy - 3, 2.2, 0xffffff);
  circle(g, cx + def.size * 0.35, cy + 3, 2.2, 0xffffff);
  circle(g, cx + def.size * 0.42, cy - 3, 1, 0x111111);
  circle(g, cx + def.size * 0.42, cy + 3, 1, 0x111111);

  g.generateTexture(`bug_${id}`, size, size);
  g.destroy();
}

export { TEX };
