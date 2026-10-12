import { BOSSES, BOSS_TYPES } from '@bug-io/shared';
import heroManifest from '../data/heroManifest.json';
import { preloadGardenAssets } from '../gardenMap';
import Phaser from 'phaser';

type HeroMeta = {
  id: string;
  anims: Record<string, string[]>;
};

type PowerMeta = {
  id: string;
  name: string;
  frames: string[];
};

type WeaponTier = {
  tier: number;
  staff: string;
  bolt: string;
};

const heroes = heroManifest.heroes as HeroMeta[];
const powers = heroManifest.powers as PowerMeta[];
const trailFrames = (heroManifest as { trail?: string[] }).trail ?? [];
const weaponTiers = ((heroManifest as { weapons?: { tiers?: WeaponTier[] } }).weapons?.tiers ??
  []) as WeaponTier[];

export const UI_FONT = 'Segoe UI, Arial, sans-serif';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  init(data: Record<string, unknown>) {
    this.registry.set('join', data);
  }

  preload() {
    const barBg = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, 300, 14, 0x1c2416, 0.7);
    const bar = this.add
      .rectangle(this.scale.width / 2 - 148, this.scale.height / 2, 4, 10, 0xc45c26)
      .setOrigin(0, 0.5);
    this.add
      .text(this.scale.width / 2, this.scale.height / 2 - 28, 'Carregando herois...', {
        fontFamily: UI_FONT,
        fontSize: '16px',
        color: '#fff8e7',
      })
      .setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      bar.width = 4 + 292 * value;
    });

    preloadGardenAssets(this);

    for (const boss of BOSS_TYPES) {
      const frames = BOSSES[boss].frames;
      for (const [anim, n] of Object.entries(frames)) {
        for (let i = 0; i < n; i++) {
          const pad = String(i).padStart(3, '0');
          this.load.image(`${boss}_${anim}_${i}`, `assets/bosses/${boss}/${boss}_${anim}_${pad}.png`);
        }
      }
    }

    for (const hero of heroes) {
      for (const [anim, files] of Object.entries(hero.anims)) {
        files.forEach((file, i) => {
          this.load.image(`${hero.id}_${anim}_${i}`, `assets/heroes/${hero.id}/${file}`);
        });
      }
    }

    for (const power of powers) {
      power.frames.forEach((file, i) => {
        this.load.image(`${power.id}_${i}`, `assets/powers/${file}`);
      });
    }

    trailFrames.forEach((file, i) => {
      this.load.image(`trail_${i}`, `assets/powers/${file}`);
    });

    for (const tier of weaponTiers) {
      this.load.image(`staff_${tier.tier}`, `assets/weapons/${tier.staff}`);
      this.load.image(`bolt_${tier.tier}`, `assets/weapons/${tier.bolt}`);
    }
    this.load.image('staff_bolt', 'assets/weapons/bolt.png');
    this.load.image('staff_weapon', 'assets/weapons/staff.png');

    for (let n = 1; n <= 8; n++) {
      this.load.image(`shield_${n}`, `assets/shields/shield_${n}.png`);
    }
  }

  create() {
    for (const hero of heroes) {
      for (const [anim, files] of Object.entries(hero.anims)) {
        const key = `${hero.id}_${anim}`;
        if (this.anims.exists(key)) continue;
        this.anims.create({
          key,
          frames: files.map((_, i) => ({ key: `${hero.id}_${anim}_${i}` })),
          frameRate: anim === 'walk' ? 12 : anim === 'attack' || anim === 'cast' ? 14 : 10,
          repeat: anim === 'idle' || anim === 'walk' ? -1 : 0,
        });
      }
    }

    for (const power of powers) {
      const key = `${power.id}_fx`;
      if (this.anims.exists(key)) continue;
      this.anims.create({
        key,
        frames: power.frames.map((_, i) => ({ key: `${power.id}_${i}` })),
        frameRate: 16,
        repeat: 0,
      });
    }

    if (trailFrames.length > 0 && !this.anims.exists('power_trail')) {
      this.anims.create({
        key: 'power_trail',
        frames: trailFrames.map((_, i) => ({ key: `trail_${i}` })),
        frameRate: 18,
        repeat: -1,
      });
    }

    for (const boss of BOSS_TYPES) {
      const frames = BOSSES[boss].frames;
      const specs: { key: string; prefix: keyof typeof frames; n: number; rep: number; fps: number }[] = [
        { key: `${boss}_idle`, prefix: 'idle', n: frames.idle, rep: -1, fps: 10 },
        { key: `${boss}_walk`, prefix: 'walk', n: frames.walk, rep: -1, fps: 12 },
        { key: `${boss}_attack`, prefix: 'attack', n: frames.attack, rep: 0, fps: 14 },
        { key: `${boss}_hurt`, prefix: 'hurt', n: frames.hurt, rep: 0, fps: 14 },
        { key: `${boss}_die`, prefix: 'die', n: frames.die, rep: 0, fps: 12 },
      ];
      for (const anim of specs) {
        if (this.anims.exists(anim.key)) continue;
        this.anims.create({
          key: anim.key,
          frames: Array.from({ length: anim.n }, (_, i) => ({ key: `${boss}_${anim.prefix}_${i}` })),
          frameRate: anim.fps,
          repeat: anim.rep,
        });
      }
    }

    this.scene.start('GameScene', this.registry.get('join'));
  }
}

export function bossAnimKey(type: string, anim: string): string {
  switch (anim) {
    case 'walk':
      return `${type}_walk`;
    case 'attack':
      return `${type}_attack`;
    case 'hurt':
      return `${type}_hurt`;
    case 'die':
      return `${type}_die`;
    default:
      return `${type}_idle`;
  }
}

/** @deprecated use bossAnimKey */
export function wraithAnimKey(anim: string): string {
  return bossAnimKey('wraith', anim);
}

export function heroAnimKey(heroId: string, anim: string): string {
  return `${heroId}_${anim}`;
}
