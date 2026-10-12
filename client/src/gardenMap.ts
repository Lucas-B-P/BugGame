import type Phaser from 'phaser';
import { WORLD } from '@bug-io/shared';
import manifest from './data/gardenManifest.json';
import {
  MAP_ZONES,
  ZONE_RULES,
  clampToWorld,
  zoneCenter,
  type MapZone,
  type ZoneType,
} from './mapLayout';

export type GardenSprite = {
  id: string;
  kind: string;
  file: string;
  w: number;
  h: number;
};

export const GARDEN_SPRITES = manifest.sprites as GardenSprite[];
export const GARDEN_BY_KIND = manifest.byKind as Record<string, string[]>;

function rng(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function pick(kind: string, i: number): string | null {
  const list = GARDEN_BY_KIND[kind];
  if (!list?.length) return null;
  return list[Math.floor(rng(i * 19.7 + kind.length * 3.1) * list.length)];
}

function tex(id: string) {
  return `garden_${id}`;
}

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by);
}

/** Ponto dentro da zona, com bias de centro ou s na borda. */
function pointInZone(
  zone: MapZone,
  i: number,
  opts: { centerBias?: number; edgeOnly?: boolean },
): { x: number; y: number } {
  const pad = 36;
  const x0 = zone.x + pad;
  const y0 = zone.y + pad;
  const x1 = zone.x + zone.w - pad;
  const y1 = zone.y + zone.h - pad;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;

  if (opts.edgeOnly) {
    // Escolhe um dos 4 lados e caminha ao longo da margem
    const side = Math.floor(rng(i + 2.2) * 4);
    const t = rng(i + 5.5);
    const inset = 28 + rng(i + 8.1) * 70;
    if (side === 0) return { x: x0 + t * (x1 - x0), y: y0 + inset };
    if (side === 1) return { x: x0 + t * (x1 - x0), y: y1 - inset };
    if (side === 2) return { x: x0 + inset, y: y0 + t * (y1 - y0) };
    return { x: x1 - inset, y: y0 + t * (y1 - y0) };
  }

  let x = x0 + rng(i + 1.1) * (x1 - x0);
  let y = y0 + rng(i + 2.3) * (y1 - y0);

  const bias = opts.centerBias ?? 0;
  if (bias > 0) {
    x = x + (cx - x) * bias;
    y = y + (cy - y) * bias;
  }

  return clampToWorld(x, y);
}

function placeWithSpacing(
  scene: Phaser.Scene,
  zone: MapZone,
  kind: string,
  count: number,
  scaleRange: [number, number],
  minDist: number,
  seed: number,
  opts: { centerBias?: number; edgeOnly?: boolean; originY?: number } = {},
) {
  const placed: { x: number; y: number }[] = [];
  let attempts = 0;
  let made = 0;

  while (made < count && attempts < count * 14) {
    attempts += 1;
    const id = pick(kind, seed * 1000 + attempts);
    if (!id || !scene.textures.exists(tex(id))) continue;

    const p = pointInZone(zone, seed * 50 + attempts, opts);
    if (placed.some((q) => dist(p.x, p.y, q.x, q.y) < minDist)) continue;

    const scale = scaleRange[0] + rng(seed + attempts) * (scaleRange[1] - scaleRange[0]);
    // Y-sort: objetos mais abaixo na tela ficam na frente
    const img = scene.add.image(p.x, p.y, tex(id)).setDepth(p.y).setScale(scale);
    if (opts.originY !== undefined) img.setOrigin(0.5, opts.originY);

    placed.push(p);
    made += 1;
  }
}

function paintZoneFloor(scene: Phaser.Scene, zone: MapZone, type: ZoneType, seed: number) {
  const rule = ZONE_RULES[type];

  if (rule.tint) {
    scene.add
      .rectangle(zone.x + zone.w / 2, zone.y + zone.h / 2, zone.w, zone.h, rule.tint.color, rule.tint.alpha)
      .setDepth(1);
  }

  // Borda sutil da zona (ajuda a ler o mapa)
  const border = scene.add.graphics().setDepth(1);
  border.lineStyle(2, 0xffffff, 0.06);
  border.strokeRect(zone.x + 4, zone.y + 4, zone.w - 8, zone.h - 8);

  if (!rule.floor) return;
  const { kinds, count, scale, alpha } = rule.floor;
  for (let i = 0; i < count; i++) {
    const kind = kinds[i % kinds.length];
    const id = pick(kind, seed + i * 3);
    if (!id || !scene.textures.exists(tex(id))) continue;
    const p = pointInZone(zone, seed + i * 7, {});
    const s = scale[0] + rng(seed + i) * (scale[1] - scale[0]);
    // Chão/patches ficam sempre atrás dos personagens
    scene.add.image(p.x, p.y, tex(id)).setDepth(2).setAlpha(alpha).setScale(s);
  }
}

function placeLandmark(scene: Phaser.Scene, zone: MapZone, type: ZoneType) {
  const rule = ZONE_RULES[type];
  if (!rule.landmark) return;
  const { kind, scale, originY } = rule.landmark;
  const id = pick(kind, zone.x + zone.y);
  if (!id || !scene.textures.exists(tex(id))) return;
  const c = zoneCenter(zone);
  const img = scene.add.image(c.x, c.y, tex(id)).setDepth(c.y).setScale(scale);
  if (originY !== undefined) img.setOrigin(0.5, originY);
}

function fillZone(scene: Phaser.Scene, zone: MapZone, seedBase: number) {
  const rule = ZONE_RULES[zone.type];
  paintZoneFloor(scene, zone, zone.type, seedBase);
  placeLandmark(scene, zone, zone.type);

  rule.props.forEach((prop, idx) => {
    placeWithSpacing(
      scene,
      zone,
      prop.kind,
      prop.count,
      prop.scale,
      prop.minDist,
      seedBase + (idx + 1) * 97,
      {
        centerBias: prop.centerBias,
        edgeOnly: prop.edgeOnly,
        originY: prop.originY,
      },
    );
  });
}

/** Mapa coerente por zonas (mesmo layout para todos). */
export function createGardenMap(scene: Phaser.Scene) {
  const grassId = GARDEN_BY_KIND.grass?.[0] ?? GARDEN_BY_KIND.path?.[0];
  if (grassId && scene.textures.exists(tex(grassId))) {
    scene.add
      .tileSprite(WORLD.width / 2, WORLD.height / 2, WORLD.width, WORLD.height, tex(grassId))
      .setDepth(0);
  } else {
    scene.cameras.main.setBackgroundColor('#6a9b4e');
  }

  // Zonas de path primeiro (cho), depois o resto por cima
  const ordered = [
    ...MAP_ZONES.filter((z) => z.type === 'path'),
    ...MAP_ZONES.filter((z) => z.type !== 'path'),
  ];

  ordered.forEach((zone, i) => fillZone(scene, zone, 1000 + i * 1000));
}

export function preloadGardenAssets(scene: Phaser.Scene) {
  for (const s of GARDEN_SPRITES) {
    scene.load.image(`garden_${s.id}`, `assets/garden/${s.file}`);
  }
}

/** Zonas do jardim (também usadas no minimapa). */
export function getMapZones(): MapZone[] {
  return MAP_ZONES;
}
