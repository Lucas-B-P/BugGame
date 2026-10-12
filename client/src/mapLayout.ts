import { WORLD } from '@bug-io/shared';

/** Tipos de bioma do jardim (estilo Mope: layout fixo). */
export type ZoneType = 'forest' | 'lake' | 'plaza' | 'garden' | 'meadow' | 'path';

export interface MapZone {
  id: string;
  type: ZoneType;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Layout autorado do mundo 3000×3000 (tamanho médio).
 * Mesmo mapa para todos os jogadores  não é scatter global.
 */
export const MAP_ZONES: MapZone[] = [
  // --- Bosques (densos) ---
  { id: 'forest_nw', type: 'forest', x: 60, y: 60, w: 820, h: 940 },
  { id: 'forest_ne', type: 'forest', x: 2140, y: 60, w: 800, h: 790 },
  { id: 'forest_sw', type: 'forest', x: 60, y: 2060, w: 940, h: 880 },

  // --- Lago oeste ---
  { id: 'lake_west', type: 'lake', x: 150, y: 1110, w: 740, h: 740 },

  // --- Praça central ---
  { id: 'plaza', type: 'plaza', x: 1160, y: 1160, w: 680, h: 680 },

  // --- Horta leste ---
  { id: 'garden_east', type: 'garden', x: 2060, y: 1010, w: 840, h: 940 },

  // --- Prados abertos ---
  { id: 'meadow_n', type: 'meadow', x: 960, y: 90, w: 1090, h: 820 },
  { id: 'meadow_se', type: 'meadow', x: 1160, y: 2060, w: 1280, h: 840 },

  // --- Trilhas em cruz (conectam as zonas) ---
  { id: 'path_h', type: 'path', x: 260, y: 1410, w: 2480, h: 180 },
  { id: 'path_v', type: 'path', x: 1410, y: 260, w: 180, h: 2480 },
];

export interface ZoneFillRule {
  /** Overlays de chão (kind do atlas). */
  floor?: { kinds: string[]; count: number; scale: [number, number]; alpha: number };
  /** Props principais da zona. */
  props: {
    kind: string;
    count: number;
    scale: [number, number];
    minDist: number;
    depth: number;
    /** 01: quão perto do centro (1 = só centro). */
    centerBias?: number;
    /** Evita o miolo (ex.: margem do lago). */
    edgeOnly?: boolean;
    originY?: number;
  }[];
  /** Landmark fixo no centro da zona (opcional). */
  landmark?: { kind: string; scale: number; depth: number; originY?: number };
  /** Tint sutil sobre a zona (cor hex Phaser). */
  tint?: { color: number; alpha: number };
}

/** Contagens ~75% do mapa 4k  densidade semelhante num mundo médio. */
export const ZONE_RULES: Record<ZoneType, ZoneFillRule> = {
  forest: {
    tint: { color: 0x2d6a4f, alpha: 0.08 },
    floor: { kinds: ['grass'], count: 14, scale: [0.7, 1.0], alpha: 0.55 },
    props: [
      { kind: 'tree', count: 32, scale: [0.55, 0.95], minDist: 80, depth: 2, originY: 0.85 },
      { kind: 'bush', count: 12, scale: [0.7, 1.05], minDist: 50, depth: 1 },
      { kind: 'rock', count: 8, scale: [0.6, 1.0], minDist: 65, depth: 1 },
      { kind: 'flower', count: 10, scale: [0.7, 1.1], minDist: 36, depth: 1, edgeOnly: true },
    ],
  },
  lake: {
    tint: { color: 0x4cc9f0, alpha: 0.12 },
    floor: { kinds: ['grass'], count: 6, scale: [0.8, 1.1], alpha: 0.35 },
    landmark: { kind: 'water', scale: 1.1, depth: 1 },
    props: [
      { kind: 'water', count: 5, scale: [0.65, 1.0], minDist: 95, depth: 1, centerBias: 0.75 },
      { kind: 'rock', count: 11, scale: [0.55, 0.95], minDist: 45, depth: 1, edgeOnly: true },
      { kind: 'flower', count: 8, scale: [0.7, 1.1], minDist: 40, depth: 1, edgeOnly: true },
      { kind: 'bush', count: 5, scale: [0.7, 1.0], minDist: 55, depth: 1, edgeOnly: true },
    ],
  },
  plaza: {
    tint: { color: 0xf4a261, alpha: 0.06 },
    floor: { kinds: ['path', 'grass'], count: 22, scale: [0.75, 1.05], alpha: 0.7 },
    landmark: { kind: 'structure', scale: 0.8, depth: 3, originY: 0.85 },
    props: [
      { kind: 'structure', count: 2, scale: [0.55, 0.8], minDist: 140, depth: 3, originY: 0.85, centerBias: 0.4 },
      { kind: 'furniture', count: 8, scale: [0.75, 1.1], minDist: 65, depth: 2 },
      { kind: 'hedge', count: 6, scale: [0.8, 1.1], minDist: 70, depth: 1, edgeOnly: true },
      { kind: 'flower', count: 12, scale: [0.7, 1.15], minDist: 36, depth: 1 },
      { kind: 'decor', count: 5, scale: [0.7, 1.0], minDist: 50, depth: 1 },
    ],
  },
  garden: {
    tint: { color: 0x80b918, alpha: 0.07 },
    floor: { kinds: ['crop', 'grass'], count: 28, scale: [0.7, 1.0], alpha: 0.75 },
    props: [
      { kind: 'crop', count: 22, scale: [0.65, 1.0], minDist: 50, depth: 1 },
      { kind: 'hedge', count: 10, scale: [0.75, 1.1], minDist: 65, depth: 1, edgeOnly: true },
      { kind: 'furniture', count: 3, scale: [0.7, 1.0], minDist: 90, depth: 2 },
      { kind: 'flower', count: 11, scale: [0.7, 1.1], minDist: 36, depth: 1 },
      { kind: 'path', count: 6, scale: [0.7, 1.0], minDist: 55, depth: 0 },
    ],
  },
  meadow: {
    tint: { color: 0xa7c957, alpha: 0.05 },
    floor: { kinds: ['grass'], count: 11, scale: [0.75, 1.05], alpha: 0.5 },
    props: [
      { kind: 'flower', count: 42, scale: [0.65, 1.2], minDist: 32, depth: 1 },
      { kind: 'rock', count: 6, scale: [0.55, 0.95], minDist: 80, depth: 1 },
      { kind: 'bush', count: 5, scale: [0.7, 1.0], minDist: 90, depth: 1 },
      { kind: 'tree', count: 3, scale: [0.5, 0.75], minDist: 140, depth: 2, originY: 0.85, edgeOnly: true },
    ],
  },
  path: {
    floor: { kinds: ['path', 'grass'], count: 30, scale: [0.7, 1.05], alpha: 0.85 },
    props: [
      { kind: 'path', count: 16, scale: [0.75, 1.1], minDist: 40, depth: 0 },
      { kind: 'furniture', count: 6, scale: [0.7, 1.05], minDist: 120, depth: 2 },
      { kind: 'flower', count: 14, scale: [0.65, 1.1], minDist: 36, depth: 1, edgeOnly: true },
      { kind: 'rock', count: 3, scale: [0.55, 0.85], minDist: 110, depth: 1, edgeOnly: true },
    ],
  },
};

export function zoneCenter(z: MapZone) {
  return { x: z.x + z.w / 2, y: z.y + z.h / 2 };
}

export function clampToWorld(x: number, y: number, pad = 40) {
  return {
    x: Math.max(pad, Math.min(WORLD.width - pad, x)),
    y: Math.max(pad, Math.min(WORLD.height - pad, y)),
  };
}
