import Phaser from 'phaser';
import {
  BOSSES,
  HEROES,
  PLAYER,
  POWERS,
  SHIELDS,
  WORLD,
  xpProgress,
  type BossState,
  type HeroId,
  type JoinPayload,
  type PlayerState,
  type PowerId,
  type ShieldPickupState,
  type Snapshot,
} from '@bug-io/shared';
import { createGardenMap } from '../gardenMap';
import { InterpolatedEntity } from '../interpolation';
import { Minimap } from '../minimap';
import { NetworkClient } from '../network';
import { TEX, generateTextures } from '../textures';
import { UI_FONT, bossAnimKey, heroAnimKey } from './BootScene';

type Visual = Phaser.GameObjects.Container | Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;

interface Tracked {
  visual: Visual;
  interp: InterpolatedEntity;
  kind: 'player' | 'projectile' | 'boss' | 'resource' | 'drop' | 'powerfx' | 'shield';
  meta?: PlayerState;
  boss?: BossState;
  hpBar?: Phaser.GameObjects.Graphics;
  label?: Phaser.GameObjects.Text;
  powerPhase?: 'travel' | 'impact';
  aura?: Phaser.GameObjects.Graphics;
  /** Aura de raridade do ícone acima da cabeça. */
  headAura?: Phaser.GameObjects.Graphics;
  shieldIcon?: Phaser.GameObjects.Image;
  shieldTier?: number;
}

const TICK_MS = 1000 / WORLD.tickRate;

export class GameScene extends Phaser.Scene {
  private net!: NetworkClient;
  private myId = '';
  private snapshot: Snapshot | null = null;
  private tracked = new Map<string, Tracked>();
  private nameTags = new Map<string, Phaser.GameObjects.Text>();
  private keys!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    space: Phaser.Input.Keyboard.Key;
    shift: Phaser.Input.Keyboard.Key;
  };
  private attackPressed = false;
  private abilityPressed = false;
  private dashPressed = false;
  private worldShade!: Phaser.GameObjects.Rectangle;
  private nightFog!: Phaser.GameObjects.RenderTexture;
  private nightBrush!: Phaser.GameObjects.Image;
  private nightActive = false;
  private rainActive = false;
  private rainParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  /** Alcance visual = distância maxima do projétil do cajado (clique). */
  private readonly nightVisionRadius = Math.round(PLAYER.staffSpeed * PLAYER.staffTtl);
  private join!: JoinPayload;
  private inputAcc = 0;
  private ended = false;
  private minimap = new Minimap();

  constructor() {
    super('GameScene');
  }

  init(data: JoinPayload) {
    this.join = data;
  }

  create() {
    generateTextures(this);
    createGardenMap(this);
    this.minimap.bakeTerrain(this);

    this.worldShade = this.add
      .rectangle(WORLD.width / 2, WORLD.height / 2, WORLD.width, WORLD.height, 0x0b1320, 0)
      .setDepth(WORLD.height + 500);

    this.createNightVisionBrush();
    this.createRainEffect();
    this.nightFog = this.add
      .renderTexture(0, 0, this.scale.width, this.scale.height)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(WORLD.height + 510)
      .setVisible(false);
    this.nightBrush = this.add
      .image(0, 0, 'night_vision')
      .setVisible(false)
      .setActive(false);

    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.nightFog.resize(gameSize.width, gameSize.height);
      this.resizeRainEmitter(gameSize.width, gameSize.height);
    });

    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
    this.cameras.main.setBackgroundColor('#5f8f45');
    this.cameras.main.setRoundPixels(true);

    const kb = this.input.keyboard!;
    this.keys = {
      up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      space: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      shift: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
    };

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (!pointer.leftButtonDown()) return;
      if (over.length > 0) return;
      this.attackPressed = true;
    });

    this.net = new NetworkClient({
      onWelcome: (data) => {
        this.myId = data.id;
        this.minimap.setMyId(data.id);
      },
      onSnapshot: (snap) => this.applySnapshot(snap),
      onMessage: (msg) => showToast(msg),
      onEvolved: () => {},
      onDeath: (payload) => this.handleDeath(payload),
    });
    this.net.connect(this.join);

    this.minimap.mount(this.myId);
    document.getElementById('hud')?.classList.add('visible');
  }

  private handleDeath(payload: {
    xp: number;
    food: number;
    heroId: HeroId;
    powerId: PowerId;
    name: string;
    level: number;
    shieldTier?: number | null;
  }) {
    if (this.ended) return;
    this.ended = true;
    localStorage.setItem(
      'bugio-progress',
      JSON.stringify({
        name: payload.name,
        xp: payload.xp,
        food: payload.food,
        heroId: payload.heroId,
        powerId: payload.powerId,
        level: payload.level,
        shieldTier: payload.shieldTier ?? null,
      }),
    );
    showToast(`Você morreu - XP restante ${payload.xp} - ${HEROES[payload.heroId].name}`);
    window.setTimeout(() => {
      this.net.disconnect();
      this.game.destroy(true);
      document.getElementById('hud')?.classList.remove('visible');
      document.getElementById('boot')?.classList.remove('hidden');
      window.dispatchEvent(new CustomEvent('bugio-return-menu'));
    }, 900);
  }

  update(_time: number, delta: number) {
    if (this.ended) return;
    const now = performance.now();

    this.inputAcc += delta;
    if (this.inputAcc >= 50) {
      this.inputAcc = 0;
      this.sendInput();
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.space)) this.abilityPressed = true;
    if (Phaser.Input.Keyboard.JustDown(this.keys.shift)) this.dashPressed = true;

    this.updateNightFog();

    for (const [id, t] of this.tracked) {
      t.interp.update(now);
      t.visual.setPosition(t.interp.renderX, t.interp.renderY);
      // Y-sort: quem está mais abaixo na tela desenha na frente
      t.visual.setDepth(t.interp.renderY);

      if (t.kind === 'player') {
        const sprite = t.visual as Phaser.GameObjects.Sprite;
        if (t.meta) {
          sprite.setFlipX(t.meta.facing < 0);
          const tag = this.nameTags.get(id);
          const tagY = t.interp.renderY - (t.meta.size + 28);
          if (tag) {
            tag.setPosition(t.interp.renderX, tagY);
            tag.setDepth(t.interp.renderY + 2);
          }
          if (t.shieldIcon) {
            const iconY = tagY - 18;
            t.shieldIcon.setPosition(t.interp.renderX, iconY);
            t.shieldIcon.setDepth(t.interp.renderY + 3);
            if (t.headAura) {
              const pulse = 0.55 + Math.sin(now / 200) * 0.25;
              t.headAura.setPosition(t.interp.renderX, iconY);
              t.headAura.setAlpha(pulse);
              t.headAura.setDepth(t.interp.renderY + 2);
            }
          }
        }
      } else if (t.kind === 'projectile') {
        t.visual.setRotation(t.interp.renderAngle);
        t.visual.setDepth(t.interp.renderY + 1);
      } else if (t.kind === 'boss') {
        const sprite = t.visual as Phaser.GameObjects.Sprite;
        if (t.boss) sprite.setFlipX(t.boss.facing < 0);
        t.hpBar?.setPosition(t.interp.renderX, t.interp.renderY - 58);
        t.hpBar?.setDepth(t.interp.renderY + 3);
        t.label?.setPosition(t.interp.renderX, t.interp.renderY - 70);
        t.label?.setDepth(t.interp.renderY + 3);
      } else if (t.kind === 'powerfx') {
        t.visual.setDepth(t.interp.renderY + 4);
      } else if (t.kind === 'shield') {
        t.visual.setDepth(t.interp.renderY + 1);
        if (t.aura) {
          const pulse = 0.55 + Math.sin(now / 200) * 0.25;
          t.aura.setPosition(t.interp.renderX, t.interp.renderY);
          t.aura.setAlpha(pulse);
          t.aura.setDepth(t.interp.renderY);
        }
      }
    }
  }

  private sendInput() {
    if (!this.myId || this.ended) return;
    const pointer = this.input.activePointer;
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const meTrack = this.tracked.get(this.myId);
    const ox = meTrack?.interp.renderX ?? 0;
    const oy = meTrack?.interp.renderY ?? 0;
    const angle = Math.atan2(worldPoint.y - oy, worldPoint.x - ox);

    this.net.sendInput({
      up: this.keys.up.isDown,
      down: this.keys.down.isDown,
      left: this.keys.left.isDown,
      right: this.keys.right.isDown,
      angle,
      aimX: worldPoint.x,
      aimY: worldPoint.y,
      attack: this.attackPressed,
      ability: this.abilityPressed,
      dash: this.dashPressed,
    });
    this.attackPressed = false;
    this.abilityPressed = false;
    this.dashPressed = false;
  }

  private applySnapshot(snap: Snapshot) {
    this.snapshot = snap;
    const now = performance.now();
    const seen = new Set<string>();

    for (const p of snap.players) {
      seen.add(p.id);
      let t = this.tracked.get(p.id);
      if (!t) {
        const sprite = this.add
          .sprite(p.x, p.y, `${p.heroId}_idle_0`)
          .setDepth(p.y)
          .setScale(0.55)
          .setOrigin(0.5, 0.85);
        sprite.play(heroAnimKey(p.heroId, p.anim));
        const interp = new InterpolatedEntity();
        interp.snap({ x: p.x, y: p.y, angle: p.angle });
        t = { visual: sprite, interp, kind: 'player', meta: p };
        this.tracked.set(p.id, t);
        const tag = this.add
          .text(p.x, p.y - 40, p.name, {
            fontFamily: UI_FONT,
            fontSize: '12px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2,
          })
          .setOrigin(0.5)
          .setDepth(p.y + 2);
        this.nameTags.set(p.id, tag);
        if (p.id === this.myId) this.cameras.main.startFollow(sprite, true, 0.18, 0.18);
      }

      t.meta = p;
      t.interp.push({ x: p.x, y: p.y, angle: p.angle }, now, TICK_MS);
      const sprite = t.visual as Phaser.GameObjects.Sprite;
      sprite.setAlpha(p.alive || p.anim === 'die' ? 1 : 0.3);
      sprite.setFlipX(p.facing < 0);
      const key = heroAnimKey(p.heroId, p.anim);
      if (sprite.anims.currentAnim?.key !== key) sprite.play(key, true);

      const tag = this.nameTags.get(p.id);
      if (tag) {
        tag.setText(p.name);
        tag.setAlpha(p.alive ? 1 : 0.35);
      }
      this.syncPlayerShieldIcon(t, p);
    }

    this.syncMoving(snap.resources, seen, now, 'resource', (r) =>
      this.add.image(r.x, r.y, r.type).setDepth(r.y),
    );
    this.syncShieldPickups(snap.shields ?? [], seen, now);
    this.syncMoving(snap.drops, seen, now, 'drop', (d) =>
      this.add.image(d.x, d.y, TEX.drop).setDepth(d.y).setScale(1.2),
    );
    this.syncMoving(snap.projectiles, seen, now, 'projectile', (p) => {
      if (p.kind === 'staff') {
        const tier = Math.max(1, Math.min(8, p.staffTier ?? 1));
        const key = this.textures.exists(`bolt_${tier}`) ? `bolt_${tier}` : 'staff_bolt';
        return this.add.image(p.x, p.y, key).setDepth(p.y + 1).setRotation(p.angle).setScale(1.25);
      }
      if (p.kind === 'boss') {
        const key = this.textures.exists('boss_bolt') ? 'boss_bolt' : TEX.sting;
        return this.add
          .image(p.x, p.y, key)
          .setDepth(p.y + 2)
          .setRotation(p.angle)
          .setScale(
            p.bossType === 'necromancer'
              ? 1.8
              : p.bossType === 'skeleton'
                ? 1.7
                : p.bossType === 'minotaur'
                  ? 1.55
                  : 1.25,
          );
      }
      const key = p.kind === 'web' ? TEX.web : p.kind === 'venom' ? TEX.venom : TEX.sting;
      return this.add.image(p.x, p.y, key).setDepth(p.y + 1).setRotation(p.angle);
    });
    this.syncBosses(snap.bosses, seen, now);
    this.syncPowerFx(snap.powerFx ?? [], seen, now);

    for (const [id, t] of this.tracked) {
      if (seen.has(id)) continue;
      t.visual.destroy();
      t.hpBar?.destroy();
      t.label?.destroy();
      t.aura?.destroy();
      t.headAura?.destroy();
      t.shieldIcon?.destroy();
      this.tracked.delete(id);
      this.nameTags.get(id)?.destroy();
      this.nameTags.delete(id);
    }

    this.updateHud(snap);
    this.updateEventVisual(snap);
  }

  private syncPowerFx(
    list: { id: string; powerId: PowerId; x: number; y: number; phase?: 'travel' | 'impact' }[],
    seen: Set<string>,
    now: number,
  ) {
    for (const fx of list) {
      seen.add(fx.id);
      const phase = fx.phase ?? 'impact';
      let t = this.tracked.get(fx.id);
      if (!t) {
        const startKey =
          phase === 'travel' && this.textures.exists('trail_0') ? 'trail_0' : `${fx.powerId}_0`;
        const sprite = this.add.sprite(fx.x, fx.y, startKey).setDepth(fx.y + 4).setScale(phase === 'travel' ? 1.1 : 1.5);
        if (phase === 'travel' && this.anims.exists('power_trail')) sprite.play('power_trail');
        else sprite.play(`${fx.powerId}_fx`);
        const interp = new InterpolatedEntity();
        interp.snap({ x: fx.x, y: fx.y });
        t = { visual: sprite, interp, kind: 'powerfx', powerPhase: phase };
        this.tracked.set(fx.id, t);
      }

      if (t.powerPhase !== phase) {
        const sprite = t.visual as Phaser.GameObjects.Sprite;
        if (phase === 'impact') {
          sprite.setTexture(`${fx.powerId}_0`);
          sprite.setScale(1.5);
          sprite.play(`${fx.powerId}_fx`);
        } else if (this.anims.exists('power_trail')) {
          sprite.play('power_trail');
          sprite.setScale(1.1);
        }
        t.powerPhase = phase;
      }
      t.interp.push({ x: fx.x, y: fx.y }, now, TICK_MS);
    }
  }

  private syncBosses(list: BossState[], seen: Set<string>, now: number) {
    for (const b of list) {
      seen.add(b.id);
      let t = this.tracked.get(b.id);
      const def = BOSSES[b.type];
      if (!t) {
        const sprite = this.add
          .sprite(b.x, b.y, `${b.type}_idle_0`)
          .setDepth(b.y)
          .setScale(def?.scale ?? 0.4)
          .setOrigin(0.5, 0.85);
        const hpBar = this.add.graphics().setDepth(b.y + 3);
        const label = this.add
          .text(b.x, b.y - 70, def?.name ?? b.type, {
            fontFamily: UI_FONT,
            fontSize: '13px',
            color: '#ffe8a3',
            stroke: '#1c2416',
            strokeThickness: 4,
          })
          .setOrigin(0.5)
          .setDepth(b.y + 3);
        const interp = new InterpolatedEntity();
        interp.snap({ x: b.x, y: b.y, angle: b.angle });
        t = { visual: sprite, interp, kind: 'boss', boss: b, hpBar, label };
        this.tracked.set(b.id, t);
        sprite.play(bossAnimKey(b.type, b.anim));
      }
      t.boss = b;
      t.interp.push({ x: b.x, y: b.y, angle: b.angle }, now, TICK_MS);
      const sprite = t.visual as Phaser.GameObjects.Sprite;
      sprite.setFlipX(b.facing < 0);
      const key = bossAnimKey(b.type, b.anim);
      if (sprite.anims.currentAnim?.key !== key) sprite.play(key, true);
      if (t.hpBar) {
        const pct = Math.max(0, b.hp / b.maxHp);
        const barW =
          b.type === 'necromancer' ? 88 : b.type === 'skeleton' ? 80 : b.type === 'minotaur' ? 72 : 56;
        t.hpBar.clear();
        t.hpBar.fillStyle(0x1c2416, 0.75);
        t.hpBar.fillRoundedRect(-barW / 2, -4, barW, 8, 3);
        t.hpBar.fillStyle(b.aggro ? 0xe63946 : 0x9b5de5, 1);
        t.hpBar.fillRoundedRect(-barW / 2 + 1, -3, (barW - 2) * pct, 6, 2);
      }
      if (t.label) t.label.setText(def?.name ?? b.type);
    }
  }

  private syncPlayerShieldIcon(t: Tracked, p: PlayerState) {
    const tier = p.shieldTier;
    if (!tier || !p.alive) {
      t.shieldIcon?.destroy();
      t.headAura?.destroy();
      t.shieldIcon = undefined;
      t.headAura = undefined;
      t.shieldTier = undefined;
      return;
    }
    const key = `shield_${tier}`;
    if (!this.textures.exists(key)) return;
    const def = SHIELDS[tier];
    if (!t.shieldIcon) {
      t.headAura = this.add.graphics().setDepth(p.y + 2);
      drawShieldAura(t.headAura, def.auraColor, 16);
      t.shieldIcon = this.add.image(p.x, p.y - 50, key).setScale(0.32).setDepth(p.y + 3);
    } else if (t.shieldTier !== tier) {
      t.shieldIcon.setTexture(key);
      if (!t.headAura) t.headAura = this.add.graphics().setDepth(p.y + 2);
      t.headAura.clear();
      drawShieldAura(t.headAura, def.auraColor, 16);
    }
    t.shieldTier = tier;
    t.shieldIcon.setVisible(true);
    t.shieldIcon.setAlpha(1);
  }

  private syncShieldPickups(list: ShieldPickupState[], seen: Set<string>, now: number) {
    for (const s of list) {
      seen.add(s.id);
      let t = this.tracked.get(s.id);
      if (!t) {
        const def = SHIELDS[s.tier];
        const aura = this.add.graphics().setDepth(s.y);
        drawShieldAura(aura, def.auraColor, 34);
        aura.setPosition(s.x, s.y);

        const img = this.add
          .image(s.x, s.y, def.texture)
          .setDepth(s.y + 1)
          .setScale(0.55);
        const interp = new InterpolatedEntity();
        interp.snap({ x: s.x, y: s.y });
        t = { visual: img, interp, kind: 'shield', aura, shieldTier: s.tier };
        this.tracked.set(s.id, t);
      }
      t.interp.push({ x: s.x, y: s.y }, now, TICK_MS);
    }
  }

  private syncMoving<T extends { id: string; x: number; y: number; angle?: number }>(
    list: T[],
    seen: Set<string>,
    now: number,
    kind: Tracked['kind'],
    create: (item: T) => Phaser.GameObjects.Image,
  ) {
    for (const item of list) {
      seen.add(item.id);
      let t = this.tracked.get(item.id);
      if (!t) {
        const visual = create(item);
        const interp = new InterpolatedEntity();
        interp.snap({ x: item.x, y: item.y, angle: item.angle ?? 0 });
        t = { visual, interp, kind };
        this.tracked.set(item.id, t);
      }
      t.interp.push({ x: item.x, y: item.y, angle: item.angle ?? 0 }, now, TICK_MS);
    }
  }

  private updateHud(snap: Snapshot) {
    this.minimap.update(snap);
    const me = snap.players.find((p) => p.id === this.myId);
    if (!me) return;
    const def = HEROES[me.heroId];
    const progress = xpProgress(me.xp);
    setWidth('hp-fill', (me.hp / me.maxHp) * 100);
    setWidth('xp-fill', progress.pct);
    setText('species-label', `${def.name} - ${POWERS[me.powerId].name}`);
    setText('food-label', `Comida ${me.food}`);
    setText('level-label', `Nv. ${me.level}`);
    if (progress.isMax) {
      setText('xp-label', `XP ${me.xp} - forma máxima`);
    } else {
      setText(
        'xp-label',
        `XP ${Math.floor(progress.current)} / ${progress.need} - falta ${Math.ceil(progress.remaining)} para ${HEROES[def.next!].name}`,
      );
    }
    this.updateEquipHud(me);
  }

  private updateEquipHud(me: PlayerState) {
    const staffTier = Math.max(1, Math.min(8, HEROES[me.heroId].staffTier));
    const weaponImg = document.getElementById('weapon-img') as HTMLImageElement | null;
    const weaponName = document.getElementById('weapon-name');
    const weaponIcon = document.getElementById('weapon-icon');
    if (weaponImg) weaponImg.src = `assets/weapons/staff_${staffTier}.png`;
    if (weaponName) weaponName.textContent = `Cajado T${staffTier}`;
    if (weaponIcon) weaponIcon.classList.remove('empty');

    const shieldImg = document.getElementById('shield-img') as HTMLImageElement | null;
    const shieldName = document.getElementById('shield-name');
    const shieldIcon = document.getElementById('shield-icon');
    if (me.shieldTier) {
      const def = SHIELDS[me.shieldTier];
      const css = `#${def.auraColor.toString(16).padStart(6, '0')}`;
      if (shieldImg) {
        shieldImg.src = `assets/shields/shield_${me.shieldTier}.png`;
        shieldImg.style.display = 'block';
      }
      if (shieldName) shieldName.textContent = def.name;
      if (shieldIcon) {
        shieldIcon.classList.remove('empty');
        shieldIcon.style.boxShadow = `0 0 0 2px ${css}, 0 0 18px 4px ${css}`;
        shieldIcon.style.borderColor = css;
        shieldIcon.style.background = `${css}33`;
      }
    } else {
      if (shieldImg) shieldImg.style.display = 'none';
      if (shieldName) shieldName.textContent = 'Sem escudo';
      if (shieldIcon) {
        shieldIcon.classList.add('empty');
        shieldIcon.style.boxShadow = 'none';
        shieldIcon.style.borderColor = 'rgba(255,255,255,0.18)';
        shieldIcon.style.background = 'rgba(0,0,0,0.4)';
      }
    }
  }

  private createNightVisionBrush() {
    if (this.textures.exists('night_vision')) return;
    const size = 512;
    const canvas = this.textures.createCanvas('night_vision', size, size);
    if (!canvas) return;
    const ctx = canvas.getContext();
    const half = size / 2;
    const grad = ctx.createRadialGradient(half, half, half * 0.42, half, half, half);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(0.55, 'rgba(0,0,0,1)');
    grad.addColorStop(0.82, 'rgba(0,0,0,0.45)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    canvas.refresh();
  }

  private updateNightFog() {
    if (!this.nightActive || !this.nightFog) return;

    const me = this.myId ? this.tracked.get(this.myId) : undefined;
    const cam = this.cameras.main;
    const w = this.scale.width;
    const h = this.scale.height;

    if (this.nightFog.width !== w || this.nightFog.height !== h) {
      this.nightFog.resize(w, h);
    }

    this.nightFog.clear();
    this.nightFog.fill(0x02060f, 1);

    if (!me) return;

    const sx = me.interp.renderX - cam.worldView.x;
    const sy = me.interp.renderY - cam.worldView.y;
    const diameter = this.nightVisionRadius * 2;
    const scale = diameter / 512;

    this.nightBrush.setPosition(sx, sy).setScale(scale).setVisible(true);
    this.nightFog.erase(this.nightBrush);
    this.nightBrush.setVisible(false);
  }

  private updateEventVisual(snap: Snapshot) {
    const banner = document.getElementById('event-banner');
    if (!banner) return;
    if (!snap.event) {
      banner.classList.remove('show');
      this.worldShade.setFillStyle(0x0b1320, 0);
      this.nightActive = false;
      this.nightFog?.setVisible(false);
      this.setRainActive(false);
      return;
    }
    const labels: Record<string, string> = {
      rain: 'Chuva',
      night: 'Noite',
      fire: 'Incêndio',
    };
    banner.textContent = labels[snap.event.type] ?? snap.event.type;
    banner.classList.add('show');

    if (snap.event.type === 'night') {
      this.worldShade.setFillStyle(0x0b1320, 0);
      this.nightActive = true;
      this.nightFog.setVisible(true);
      this.setRainActive(false);
    } else if (snap.event.type === 'rain') {
      this.nightActive = false;
      this.nightFog.setVisible(false);
      this.worldShade.setFillStyle(0x1d3557, 0.22);
      this.setRainActive(true);
    } else {
      this.nightActive = false;
      this.nightFog.setVisible(false);
      this.setRainActive(false);
      if (snap.event.type === 'fire') this.worldShade.setFillStyle(0xc1121f, 0.18);
      else this.worldShade.setFillStyle(0x1d3557, 0.2);
    }
  }

  private createRainEffect() {
    if (!this.textures.exists('rain_drop')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0xb8d4ef, 0.9);
      g.fillRect(1, 0, 2, 14);
      g.fillStyle(0xe8f4ff, 0.55);
      g.fillRect(1, 0, 1, 14);
      g.generateTexture('rain_drop', 4, 16);
      g.destroy();
    }

    const w = this.scale.width;
    const h = this.scale.height;
    this.rainParticles = this.add.particles(0, 0, 'rain_drop', {
      x: { min: 0, max: w },
      y: -24,
      lifespan: { min: 700, max: 1100 },
      speedY: { min: 520, max: 820 },
      speedX: { min: -90, max: -30 },
      scaleX: { min: 0.45, max: 0.85 },
      scaleY: { min: 0.9, max: 1.6 },
      alpha: { start: 0.55, end: 0.05 },
      quantity: 6,
      frequency: 28,
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
    this.rainParticles.setScrollFactor(0).setDepth(WORLD.height + 520);
    // Limita o tempo de vida visual à altura da tela
    this.rainParticles.setParticleLifespan(Math.max(700, (h + 40) / 0.65));
  }

  private resizeRainEmitter(w: number, h: number) {
    if (!this.rainParticles) return;
    this.rainParticles.setConfig({
      x: { min: 0, max: w },
      y: -24,
    });
    this.rainParticles.setParticleLifespan(Math.max(700, (h + 40) / 0.65));
  }

  private setRainActive(active: boolean) {
    if (this.rainActive === active) return;
    this.rainActive = active;
    if (!this.rainParticles) return;
    if (active) this.rainParticles.start();
    else this.rainParticles.stop();
  }
}

function setWidth(id: string, pct: number) {
  const el = document.getElementById(id);
  if (el) el.style.width = `${pct}%`;
}

function setText(id: string, text: string) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function drawShieldAura(g: Phaser.GameObjects.Graphics, color: number, radius: number) {
  g.fillStyle(color, 0.22);
  g.fillCircle(0, 0, radius + 6);
  g.fillStyle(color, 0.4);
  g.fillCircle(0, 0, radius);
  g.lineStyle(3, color, 1);
  g.strokeCircle(0, 0, radius + 2);
  g.lineStyle(1.5, 0xffffff, 0.35);
  g.strokeCircle(0, 0, radius - 4);
}

let toastTimer = 0;
function showToast(msg: string) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove('show'), 2800);
}
