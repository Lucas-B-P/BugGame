import {
  BOSS_INTERVAL_MS,
  BOSSES,
  BOSS_TYPES,
  bossMoveSpeed,
  bossXpShare,
  EVENT_DURATION_MS,
  EVENT_FIRST_DELAY_MS,
  EVENT_INTERVAL_MS,
  HEROES,
  PLAYER,
  POWERS,
  RESOURCES,
  RESOURCE_SPAWN,
  SERVER_EVENTS,
  SHIELD_SPAWN,
  SHIELDS,
  WORLD,
  heroFromXp,
  heroStats,
  isShieldTier,
  pickWeightedResource,
  pickWeightedShieldTier,
  powerAttackDamage,
  shieldDamageMul,
  staffAttackDamage,
  type BossAnim,
  type BossState,
  type BossType,
  type DeathPayload,
  type DropState,
  type HeroId,
  type InputPayload,
  type JoinPayload,
  type PlayerAnim,
  type PlayerState,
  type PowerFxState,
  type PowerId,
  type ProjectileState,
  type ResourceState,
  type ShieldPickupState,
  type ShieldTier,
  type Snapshot,
  type WorldEventState,
  type WorldEventType,
} from '@bug-io/shared';

interface InternalPlayer {
  id: string;
  name: string;
  x: number;
  y: number;
  angle: number;
  heroId: HeroId;
  powerId: PowerId;
  anim: PlayerAnim;
  facing: number;
  hp: number;
  maxHp: number;
  xp: number;
  food: number;
  level: number;
  alive: boolean;
  input: InputPayload;
  dashUntil: number;
  dashReadyAt: number;
  attackReadyAt: number;
  abilityReadyAt: number;
  attackUntil: number;
  castUntil: number;
  hurtUntil: number;
  shieldUntil: number;
  slowUntil: number;
  poisonUntil: number;
  poisonDps: number;
  dyingUntil: number;
  shieldTier: ShieldTier | null;
}

interface InternalProjectile {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  kind: 'staff' | 'sting' | 'web' | 'venom' | 'boss';
  damage: number;
  ttl: number;
  radius: number;
  staffTier: number;
  bossType?: BossType;
}

interface InternalPowerFx {
  id: string;
  powerId: PowerId;
  ownerId: string;
  x: number;
  y: number;
  tx: number;
  ty: number;
  vx: number;
  vy: number;
  damage: number;
  radius: number;
  ttl: number;
  phase: 'travel' | 'impact';
  arrived: boolean;
}

interface InternalBoss {
  id: string;
  type: BossType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  angle: number;
  facing: number;
  anim: BossAnim;
  speed: number;
  wanderSpeed: number;
  damage: number;
  radius: number;
  aggroRange: number;
  attackReadyAt: number;
  attackUntil: number;
  targetId: string | null;
  wanderAngle: number;
  wanderChangeAt: number;
  dyingUntil: number;
  contributors: Map<string, number>;
}

interface DeathQueueEntry {
  id: string;
  payload: DeathPayload;
}

const ATTACK_ANIM_MS = 380;
const CAST_ANIM_MS = 520;
const HURT_ANIM_MS = 220;
const POWER_IMPACT_TTL = 0.7;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function dist(ax: number, ay: number, bx: number, by: number) {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.hypot(dx, dy);
}

function randInWorld() {
  return {
    x: 80 + Math.random() * (WORLD.width - 160),
    y: 80 + Math.random() * (WORLD.height - 160),
  };
}

function facingFromAngle(angle: number) {
  return Math.cos(angle) >= 0 ? 1 : -1;
}

export class GameWorld {
  tick = 0;
  players = new Map<string, InternalPlayer>();
  resources = new Map<string, ResourceState>();
  shields = new Map<string, ShieldPickupState>();
  projectiles = new Map<string, InternalProjectile>();
  powerFx = new Map<string, InternalPowerFx>();
  drops = new Map<string, DropState>();
  bosses = new Map<string, InternalBoss>();
  event: WorldEventState | null = null;
  private nextEventAt = Date.now() + EVENT_FIRST_DELAY_MS;
  private bossNextAt = new Map<BossType, number>(
    BOSS_TYPES.map((t) => [t, Date.now() + BOSSES[t].firstSpawnDelayMs]),
  );
  private spawnAcc = 0;
  private shieldSpawnAcc = -SHIELD_SPAWN.firstDelayMs;
  private messages: string[] = [];
  private deathQueue: DeathQueueEntry[] = [];

  addPlayer(id: string, payload: JoinPayload): PlayerState {
    const pos = randInWorld();
    const name = (payload.name ?? 'Herói').slice(0, 16) || 'Herói';
    const xp = Math.max(0, payload.xp ?? 0);
    const food = Math.max(0, payload.food ?? 0);
    const heroId = heroFromXp(xp);
    const powerId = HEROES[heroId].powerId;
    const stats = heroStats(heroId);
    const hero = HEROES[heroId];
    const shieldTier = isShieldTier(payload.shieldTier) ? payload.shieldTier : null;

    const player: InternalPlayer = {
      id,
      name,
      x: pos.x,
      y: pos.y,
      angle: Math.random() * Math.PI * 2,
      heroId,
      powerId,
      anim: 'idle',
      facing: 1,
      hp: stats.maxHp,
      maxHp: stats.maxHp,
      xp,
      food: Math.min(this.foodCap(), food),
      level: hero.stage,
      alive: true,
      input: {
        up: false,
        down: false,
        left: false,
        right: false,
        angle: 0,
        aimX: pos.x,
        aimY: pos.y,
        attack: false,
        ability: false,
        dash: false,
      },
      dashUntil: 0,
      dashReadyAt: 0,
      attackReadyAt: 0,
      abilityReadyAt: 0,
      attackUntil: 0,
      castUntil: 0,
      hurtUntil: 0,
      shieldUntil: 0,
      slowUntil: 0,
      poisonUntil: 0,
      poisonDps: 0,
      dyingUntil: 0,
      shieldTier,
    };
    this.players.set(id, player);
    this.seedResources();
    this.seedShields();
    return this.toPlayerState(player);
  }

  removePlayer(id: string) {
    this.players.delete(id);
  }

  setInput(id: string, input: InputPayload) {
    const p = this.players.get(id);
    if (!p || !p.alive) return;
    p.input = input;
    p.angle = input.angle;
  }

  private seedResources() {
    if (this.resources.size > 0) return;
    for (let i = 0; i < 80; i++) this.spawnResource();
  }

  private seedShields() {
    if (this.shields.size > 0) return;
    for (let i = 0; i < 8; i++) this.spawnShield();
  }

  private spawnShield() {
    if (this.shields.size >= SHIELD_SPAWN.maxCount) return;
    const pos = randInWorld();
    const id = crypto.randomUUID();
    this.shields.set(id, {
      id,
      tier: pickWeightedShieldTier(),
      x: pos.x,
      y: pos.y,
    });
  }

  private spawnResource() {
    if (this.resources.size >= RESOURCE_SPAWN.maxCount) return;
    const pos = randInWorld();
    const id = crypto.randomUUID();
    this.resources.set(id, {
      id,
      type: pickWeightedResource(),
      x: pos.x,
      y: pos.y,
    });
  }

  update(dt: number) {
    this.tick += 1;
    const now = Date.now();
    this.spawnAcc += dt * 1000;
    while (this.spawnAcc >= RESOURCE_SPAWN.spawnIntervalMs) {
      this.spawnAcc -= RESOURCE_SPAWN.spawnIntervalMs;
      this.spawnResource();
    }

    this.shieldSpawnAcc += dt * 1000;
    while (this.shieldSpawnAcc >= SHIELD_SPAWN.spawnIntervalMs) {
      this.shieldSpawnAcc -= SHIELD_SPAWN.spawnIntervalMs;
      this.spawnShield();
    }

    this.updateEvent(now);
    this.updateBossSpawn(now);
    this.updatePowerFx(dt, now);

    for (const player of this.players.values()) {
      this.updatePlayer(player, dt, now);
    }

    this.finalizeDeaths(now);
    this.updateProjectiles(dt, now);
    this.updateBosses(dt, now);
    this.pickupResources();
    this.pickupShields();
    this.pickupDrops();
  }

  private updatePowerFx(dt: number, now: number) {
    for (const [id, fx] of this.powerFx) {
      if (fx.phase === 'travel') {
        fx.x += fx.vx * dt;
        fx.y += fx.vy * dt;
        const dx = fx.tx - fx.x;
        const dy = fx.ty - fx.y;
        const remaining = Math.hypot(dx, dy);
        const step = Math.hypot(fx.vx, fx.vy) * dt;
        if (remaining <= step + 4 || fx.ttl <= 0) {
          fx.x = fx.tx;
          fx.y = fx.ty;
          fx.vx = 0;
          fx.vy = 0;
          fx.phase = 'impact';
          fx.ttl = POWER_IMPACT_TTL;
          if (!fx.arrived) {
            fx.arrived = true;
            this.applyPowerImpact(fx, now);
          }
        } else {
          fx.ttl -= dt;
        }
        continue;
      }

      fx.ttl -= dt;
      if (fx.ttl <= 0) this.powerFx.delete(id);
    }
  }

  private applyPowerImpact(fx: InternalPowerFx, now: number) {
    for (const other of this.players.values()) {
      if (other.id === fx.ownerId || !other.alive) continue;
      const otherSize = heroStats(other.heroId).size;
      if (dist(fx.x, fx.y, other.x, other.y) > fx.radius + otherSize) continue;
      this.damagePlayer(other, fx.damage, now, fx.ownerId);
    }

    for (const boss of this.bosses.values()) {
      if (boss.dyingUntil > 0) continue;
      if (dist(fx.x, fx.y, boss.x, boss.y) > fx.radius + boss.radius) continue;
      this.damageBoss(boss, fx.damage, fx.ownerId);
    }
  }

  private updateEvent(now: number) {
    if (this.event && now >= this.event.endsAt) {
      this.event = null;
      this.messages.push('O jardim volta ao normal.');
    }
    if (!this.event && now >= this.nextEventAt) {
      const types: WorldEventType[] = ['rain', 'night', 'fire'];
      const type = types[Math.floor(Math.random() * types.length)];
      this.event = { type, endsAt: now + EVENT_DURATION_MS };
      this.nextEventAt = now + EVENT_INTERVAL_MS;
      const labels: Record<WorldEventType, string> = {
        rain: 'Chuva no jardim!',
        night: 'A noite cai...',
        fire: 'Incêndio! Cuidado!',
      };
      this.messages.push(labels[type]);
    }
  }

  private updateBossSpawn(now: number) {
    for (const type of BOSS_TYPES) {
      const alive = [...this.bosses.values()].some((b) => b.type === type && b.dyingUntil === 0);
      if (alive) continue;
      const due = this.bossNextAt.get(type) ?? 0;
      if (now < due) continue;
      // Se ainda esta na animacao de morte, espera
      const dying = [...this.bosses.values()].some((b) => b.type === type && b.dyingUntil > 0);
      if (dying) continue;
      this.spawnBoss(type, now);
    }
  }

  private spawnBoss(type: BossType, now: number) {
    const def = BOSSES[type];
    const pos = randInWorld();
    const id = crypto.randomUUID();
    const wanderAngle = Math.random() * Math.PI * 2;
    this.bosses.set(id, {
      id,
      type,
      x: pos.x,
      y: pos.y,
      hp: def.hp,
      maxHp: def.hp,
      angle: wanderAngle,
      facing: Math.cos(wanderAngle) >= 0 ? 1 : -1,
      anim: 'walk',
      speed: bossMoveSpeed(def),
      wanderSpeed: def.wanderSpeed,
      damage: def.damage,
      radius: def.radius,
      aggroRange: def.aggroRange,
      attackReadyAt: 0,
      attackUntil: 0,
      targetId: null,
      wanderAngle,
      wanderChangeAt: now + 1500 + Math.random() * 2000,
      dyingUntil: 0,
      contributors: new Map(),
    });
    this.messages.push(`Um ${def.name} surgiu no jardim!`);
  }

  private updatePlayer(p: InternalPlayer, dt: number, now: number) {
    if (!p.alive) {
      p.anim = 'die';
      return;
    }

    if (p.poisonUntil > now) {
      p.hp -= p.poisonDps * dt;
    }

    if (this.event?.type === 'fire') {
      p.hp -= 2.5 * dt;
    }

    const stats = heroStats(p.heroId);
    let speed = PLAYER.baseSpeed * stats.speedMul;
    if (this.event?.type === 'rain') speed *= 0.85;
    if (this.event?.type === 'night') speed *= 1.05;
    if (p.slowUntil > now) speed *= 0.45;
    if (now < p.dashUntil) speed = PLAYER.dashSpeed;

    const inp = p.input;
    let mx = 0;
    let my = 0;
    if (inp.up) my -= 1;
    if (inp.down) my += 1;
    if (inp.left) mx -= 1;
    if (inp.right) mx += 1;

    const moving = mx !== 0 || my !== 0;
    if (moving) {
      const len = Math.hypot(mx, my) || 1;
      p.x += (mx / len) * speed * dt;
      p.y += (my / len) * speed * dt;
      p.facing = mx >= 0 ? 1 : -1;
    } else {
      p.facing = facingFromAngle(p.angle);
    }

    p.x = clamp(p.x, 20, WORLD.width - 20);
    p.y = clamp(p.y, 20, WORLD.height - 20);

    if (inp.dash && now >= p.dashReadyAt) {
      p.dashUntil = now + PLAYER.dashDurationMs;
      p.dashReadyAt = now + PLAYER.dashCooldownMs;
    }

    if (inp.attack && now >= p.attackReadyAt) {
      this.staffAttack(p, now);
      p.attackReadyAt = now + PLAYER.attackCooldownMs;
      p.attackUntil = now + ATTACK_ANIM_MS;
    }

    if (inp.ability && now >= p.abilityReadyAt) {
      this.usePower(p, now);
    }

    this.updatePlayerAnim(p, now, moving);

    if (p.hp <= 0) this.startPlayerDeath(p, now);
  }

  private updatePlayerAnim(p: InternalPlayer, now: number, moving: boolean) {
    if (!p.alive || now < p.dyingUntil) {
      p.anim = 'die';
      return;
    }
    if (now < p.attackUntil) {
      p.anim = 'attack';
      return;
    }
    if (now < p.castUntil) {
      p.anim = 'cast';
      return;
    }
    if (now < p.hurtUntil) {
      p.anim = 'hurt';
      return;
    }
    p.anim = moving ? 'walk' : 'idle';
  }

  private staffAttack(p: InternalPlayer, now: number) {
    const stats = heroStats(p.heroId);
    const damage = staffAttackDamage(p.heroId, PLAYER.attackDamage);
    const id = crypto.randomUUID();
    this.projectiles.set(id, {
      id,
      ownerId: p.id,
      x: p.x,
      y: p.y,
      vx: Math.cos(p.angle) * PLAYER.staffSpeed,
      vy: Math.sin(p.angle) * PLAYER.staffSpeed,
      angle: p.angle,
      kind: 'staff',
      damage,
      ttl: PLAYER.staffTtl,
      radius: PLAYER.staffRadius + Math.floor(stats.staffTier / 3),
      staffTier: stats.staffTier,
    });
  }

  private usePower(p: InternalPlayer, now: number) {
    const power = POWERS[p.powerId];
    p.abilityReadyAt = now + power.cooldownMs;
    p.castUntil = now + CAST_ANIM_MS;

    const aimX = Number.isFinite(p.input.aimX) ? p.input.aimX : p.x + Math.cos(p.angle) * power.range;
    const aimY = Number.isFinite(p.input.aimY) ? p.input.aimY : p.y + Math.sin(p.angle) * power.range;
    let dx = aimX - p.x;
    let dy = aimY - p.y;
    let distAim = Math.hypot(dx, dy);
    if (distAim < 16) {
      dx = Math.cos(p.angle);
      dy = Math.sin(p.angle);
      distAim = 1;
    }
    const travel = Math.min(power.range, Math.max(48, distAim));
    const nx = dx / distAim;
    const ny = dy / distAim;
    const tx = clamp(p.x + nx * travel, 20, WORLD.width - 20);
    const ty = clamp(p.y + ny * travel, 20, WORLD.height - 20);
    const damage = powerAttackDamage(p.heroId);
    const flightDist = Math.max(1, Math.hypot(tx - p.x, ty - p.y));
    const flightTime = Math.max(0.18, flightDist / power.speed);

    const fxId = crypto.randomUUID();
    this.powerFx.set(fxId, {
      id: fxId,
      powerId: p.powerId,
      ownerId: p.id,
      x: p.x,
      y: p.y,
      tx,
      ty,
      vx: ((tx - p.x) / flightDist) * power.speed,
      vy: ((ty - p.y) / flightDist) * power.speed,
      damage,
      radius: power.radius,
      ttl: flightTime + 0.05,
      phase: 'travel',
      arrived: false,
    });
  }

  private updateProjectiles(dt: number, now: number) {
    for (const [id, proj] of this.projectiles) {
      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;
      proj.ttl -= dt;
      if (proj.ttl <= 0) {
        this.projectiles.delete(id);
        continue;
      }

      let hit = false;
      for (const other of this.players.values()) {
        if (!other.alive) continue;
        if (proj.kind !== 'boss' && other.id === proj.ownerId) continue;
        const otherSize = heroStats(other.heroId).size;
        if (dist(proj.x, proj.y, other.x, other.y) > proj.radius + otherSize) continue;
        this.damagePlayer(other, proj.damage, now, proj.kind === 'boss' ? undefined : proj.ownerId);
        if (proj.kind === 'web') other.slowUntil = now + 2200;
        if (proj.kind === 'venom') {
          other.poisonUntil = now + 2800;
          other.poisonDps = 5;
        }
        hit = true;
        break;
      }

      if (!hit && proj.kind !== 'boss') {
        for (const boss of this.bosses.values()) {
          if (boss.dyingUntil > 0) continue;
          if (dist(proj.x, proj.y, boss.x, boss.y) > proj.radius + boss.radius) continue;
          this.damageBoss(boss, proj.damage, proj.ownerId);
          hit = true;
          break;
        }
      }

      if (hit) this.projectiles.delete(id);
    }
  }

  private updateBosses(dt: number, now: number) {
    for (const [id, boss] of this.bosses) {
      if (boss.dyingUntil > 0) {
        boss.anim = 'die';
        if (now >= boss.dyingUntil) {
          this.rewardBossKill(boss);
          this.bosses.delete(id);
          this.bossNextAt.set(boss.type, now + BOSS_INTERVAL_MS);
        }
        continue;
      }

      if (boss.hp <= 0) {
        const def = BOSSES[boss.type];
        boss.dyingUntil = now + def.deathAnimMs;
        boss.anim = 'die';
        boss.targetId = null;
        continue;
      }

      const def = BOSSES[boss.type];
      let focus: InternalPlayer | null = null;
      let focusDist = Infinity;

      if (boss.targetId) {
        const current = this.players.get(boss.targetId);
        if (current?.alive) {
          const d = dist(boss.x, boss.y, current.x, current.y);
          if (d <= boss.aggroRange) {
            focus = current;
            focusDist = d;
          } else {
            boss.targetId = null;
          }
        } else {
          boss.targetId = null;
        }
      }

      if (!focus) {
        for (const p of this.players.values()) {
          if (!p.alive) continue;
          const d = dist(boss.x, boss.y, p.x, p.y);
          if (d <= boss.aggroRange && d < focusDist) {
            focus = p;
            focusDist = d;
          }
        }
        if (focus) boss.targetId = focus.id;
      }

      if (focus) {
        boss.angle = Math.atan2(focus.y - boss.y, focus.x - boss.x);
        boss.facing = Math.cos(boss.angle) >= 0 ? 1 : -1;

        if (def.combat === 'melee') {
          // Persegue e so bate corpo a corpo
          if (focusDist > def.attackRange * 0.85) {
            boss.x += Math.cos(boss.angle) * boss.speed * dt;
            boss.y += Math.sin(boss.angle) * boss.speed * dt;
          }

          if (focusDist <= def.attackRange && now >= boss.attackReadyAt) {
            this.damagePlayer(focus, boss.damage, now);
            boss.attackReadyAt = now + def.attackCooldownMs;
            boss.attackUntil = now + 450;
            boss.anim = 'attack';
          } else if (now < boss.attackUntil) {
            boss.anim = 'attack';
          } else {
            boss.anim = 'walk';
          }
        } else {
          // Ranged: nunca para — aproxima, recua ou orbita enquanto atira
          const preferred = def.attackRange * 0.62;
          const cos = Math.cos(boss.angle);
          const sin = Math.sin(boss.angle);

          if (focusDist > preferred + 36) {
            boss.x += cos * boss.speed * dt;
            boss.y += sin * boss.speed * dt;
          } else if (focusDist < preferred - 48) {
            boss.x -= cos * boss.speed * 0.9 * dt;
            boss.y -= sin * boss.speed * 0.9 * dt;
          } else {
            const dir = Math.floor(now / 1600 + boss.id.charCodeAt(0)) % 2 === 0 ? 1 : -1;
            const ox = Math.cos(boss.angle + Math.PI / 2) * dir;
            const oy = Math.sin(boss.angle + Math.PI / 2) * dir;
            boss.x += ox * boss.speed * 0.95 * dt;
            boss.y += oy * boss.speed * 0.95 * dt;
          }

          if (focusDist <= def.attackRange && now >= boss.attackReadyAt) {
            this.fireBossProjectile(boss, focus, def);
            boss.attackReadyAt = now + def.attackCooldownMs;
            boss.attackUntil = now + 380;
          }

          if (now < boss.attackUntil) boss.anim = 'attack';
          else boss.anim = 'walk';
        }
      } else {
        if (now >= boss.wanderChangeAt) {
          boss.wanderAngle = Math.random() * Math.PI * 2;
          boss.wanderChangeAt = now + 1200 + Math.random() * 2200;
        }
        boss.angle = boss.wanderAngle;
        boss.facing = Math.cos(boss.angle) >= 0 ? 1 : -1;
        boss.x += Math.cos(boss.angle) * boss.wanderSpeed * dt;
        boss.y += Math.sin(boss.angle) * boss.wanderSpeed * dt;
        boss.anim = 'walk';

        if (boss.x < 40 || boss.x > WORLD.width - 40) {
          boss.wanderAngle = Math.PI - boss.wanderAngle;
          boss.wanderChangeAt = now + 800;
        }
        if (boss.y < 40 || boss.y > WORLD.height - 40) {
          boss.wanderAngle = -boss.wanderAngle;
          boss.wanderChangeAt = now + 800;
        }
      }

      boss.x = clamp(boss.x, 30, WORLD.width - 30);
      boss.y = clamp(boss.y, 30, WORLD.height - 30);
    }
  }

  private fireBossProjectile(
    boss: InternalBoss,
    target: InternalPlayer,
    def: (typeof BOSSES)[BossType],
  ) {
    const speed = def.projectileSpeed ?? 280;
    const ttl = def.projectileTtl ?? 1.4;
    const angle = Math.atan2(target.y - boss.y, target.x - boss.x);
    const id = crypto.randomUUID();
    this.projectiles.set(id, {
      id,
      ownerId: boss.id,
      x: boss.x + Math.cos(angle) * (boss.radius * 0.6),
      y: boss.y + Math.sin(angle) * (boss.radius * 0.6),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      angle,
      kind: 'boss',
      damage: boss.damage,
      ttl,
      radius: def.projectileRadius ?? 18,
      staffTier: 0,
      bossType: boss.type,
    });
  }

  private rewardBossKill(boss: InternalBoss) {
    const def = BOSSES[boss.type];
    this.messages.push(`${def.name} derrotado!`);
    for (const [pid, dmg] of boss.contributors) {
      const p = this.players.get(pid);
      if (!p || !p.alive) continue;
      const share = bossXpShare(def, dmg);
      p.xp += share;
      p.food = Math.min(this.foodCap(), p.food + def.foodReward);
      this.tryAutoEvolve(p);
    }
  }

  private damageBoss(boss: InternalBoss, amount: number, attackerId: string) {
    boss.hp -= amount;
    boss.contributors.set(attackerId, (boss.contributors.get(attackerId) ?? 0) + amount);
  }

  private damagePlayer(p: InternalPlayer, amount: number, now: number, attackerId?: string) {
    if (!p.alive) return;
    if (now < p.shieldUntil) amount *= 0.25;
    amount *= shieldDamageMul(p.shieldTier);
    p.hp -= amount;
    if (p.hp > 0 && now >= p.hurtUntil && now >= p.attackUntil && now >= p.castUntil) {
      p.hurtUntil = now + HURT_ANIM_MS;
    }
    if (p.hp <= 0) this.startPlayerDeath(p, now, attackerId);
  }

  private startPlayerDeath(p: InternalPlayer, now: number, attackerId?: string) {
    if (!p.alive && p.dyingUntil > 0) return;
    p.alive = false;
    p.hp = 0;
    p.anim = 'die';
    p.dyingUntil = now + PLAYER.deathAnimMs;

    if (attackerId && attackerId !== p.id) {
      const killer = this.players.get(attackerId);
      if (killer?.alive) {
        const reward = PLAYER.killXpBase + p.level * PLAYER.killXpPerLevel;
        killer.xp += reward;
        this.tryAutoEvolve(killer);
        this.messages.push(`${killer.name} derrotou ${p.name} (+${reward} XP)`);
      }
    }

    const dropFood = Math.floor(p.food * PLAYER.foodDropRatio);
    const dropXp = Math.floor(p.xp * PLAYER.xpDropRatio);
    p.food -= dropFood;
    if (dropFood > 0 || dropXp > 0) {
      const id = crypto.randomUUID();
      this.drops.set(id, { id, x: p.x, y: p.y, food: dropFood, xp: dropXp });
    }
    if (p.shieldTier) {
      const sid = crypto.randomUUID();
      this.shields.set(sid, { id: sid, tier: p.shieldTier, x: p.x + 18, y: p.y + 12 });
      p.shieldTier = null;
    }
  }

  private finalizeDeaths(now: number) {
    for (const p of [...this.players.values()]) {
      if (p.alive || p.dyingUntil <= 0 || now < p.dyingUntil) continue;

      const remainingXp = Math.floor(p.xp * 0.5);
      const demotedHero = heroFromXp(remainingXp);

      this.deathQueue.push({
        id: p.id,
        payload: {
          xp: remainingXp,
          food: p.food,
          heroId: demotedHero,
          powerId: HEROES[demotedHero].powerId,
          name: p.name,
          level: HEROES[demotedHero].stage,
          shieldTier: null,
        },
      });
      this.players.delete(p.id);
    }
  }

  private foodCap() {
    return PLAYER.foodCapacity;
  }

  private pickupResources() {
    for (const p of this.players.values()) {
      if (!p.alive) continue;
      for (const [rid, res] of this.resources) {
        if (dist(p.x, p.y, res.x, res.y) > RESOURCE_SPAWN.pickupRadius) continue;
        const def = RESOURCES[res.type];
        p.food = Math.min(this.foodCap(), p.food + def.food);
        p.xp += def.xp;
        this.resources.delete(rid);
        this.tryAutoEvolve(p);
      }
    }
  }

  private pickupShields() {
    for (const p of this.players.values()) {
      if (!p.alive) continue;
      for (const [sid, shield] of this.shields) {
        if (dist(p.x, p.y, shield.x, shield.y) > SHIELD_SPAWN.pickupRadius) continue;
        const current = p.shieldTier ?? 0;
        if (shield.tier < current) continue;
        p.shieldTier = shield.tier;
        this.messages.push(`${p.name} equipou ${SHIELDS[shield.tier].name}!`);
        this.shields.delete(sid);
      }
    }
  }

  private pickupDrops() {
    for (const p of this.players.values()) {
      if (!p.alive) continue;
      for (const [did, drop] of this.drops) {
        if (dist(p.x, p.y, drop.x, drop.y) > 30) continue;
        p.food = Math.min(this.foodCap(), p.food + drop.food);
        p.xp += drop.xp;
        this.drops.delete(did);
        this.tryAutoEvolve(p);
      }
    }
  }

  /** Evolução automática conforme XP — sem escolha do jogador. */
  private tryAutoEvolve(p: InternalPlayer) {
    let guard = 0;
    while (guard++ < 8) {
      const hero = HEROES[p.heroId];
      if (!hero.next || p.xp < hero.xpToEvolve) break;
      const next = hero.next;
      p.heroId = next;
      p.powerId = HEROES[next].powerId;
      const stats = heroStats(next);
      p.maxHp = stats.maxHp;
      p.hp = Math.min(p.maxHp, p.hp + 25);
      p.level = HEROES[next].stage;
      this.messages.push(`${p.name} evoluiu para ${HEROES[next].name}! (${POWERS[p.powerId].name})`);
    }
  }

  /** Mantido por compat com socket; preferir auto-evolução. */
  evolve(id: string, next: HeroId): boolean {
    const p = this.players.get(id);
    if (!p || !p.alive) return false;
    const hero = HEROES[p.heroId];
    if (!hero.next || hero.next !== next) return false;
    if (p.xp < hero.xpToEvolve) return false;
    p.heroId = next;
    p.powerId = HEROES[next].powerId;
    const stats = heroStats(next);
    p.maxHp = stats.maxHp;
    p.hp = Math.min(p.maxHp, p.hp + 25);
    p.level = HEROES[next].stage;
    this.messages.push(`${p.name} evoluiu para ${HEROES[next].name}!`);
    return true;
  }

  drainMessages(): string[] {
    const m = this.messages;
    this.messages = [];
    return m;
  }

  drainDeaths(): ({ id: string } & DeathPayload)[] {
    const out = this.deathQueue.map(({ id, payload }) => ({ id, ...payload }));
    this.deathQueue = [];
    return out;
  }

  toPlayerState(p: InternalPlayer): PlayerState {
    const stats = heroStats(p.heroId);
    return {
      id: p.id,
      name: p.name,
      x: p.x,
      y: p.y,
      angle: p.angle,
      heroId: p.heroId,
      powerId: p.powerId,
      anim: p.anim,
      facing: p.facing,
      hp: Math.max(0, p.hp),
      maxHp: p.maxHp,
      xp: p.xp,
      food: p.food,
      level: p.level,
      alive: p.alive,
      shielding: Date.now() < p.shieldUntil,
      speedMul: stats.speedMul,
      size: stats.size,
      shieldTier: p.shieldTier,
    };
  }

  snapshot(): Snapshot {
    return {
      tick: this.tick,
      players: [...this.players.values()].map((p) => this.toPlayerState(p)),
      resources: [...this.resources.values()],
      shields: [...this.shields.values()],
      projectiles: [...this.projectiles.values()].map(
        (pr): ProjectileState => ({
          id: pr.id,
          ownerId: pr.ownerId,
          x: pr.x,
          y: pr.y,
          angle: pr.angle,
          kind: pr.kind,
          staffTier: pr.staffTier,
          bossType: pr.bossType,
        }),
      ),
      powerFx: [...this.powerFx.values()].map(
        (fx): PowerFxState => ({
          id: fx.id,
          powerId: fx.powerId,
          x: fx.x,
          y: fx.y,
          ttl: fx.ttl,
          phase: fx.phase,
        }),
      ),
      drops: [...this.drops.values()],
      bosses: [...this.bosses.values()].map(
        (b): BossState => ({
          id: b.id,
          type: b.type,
          x: b.x,
          y: b.y,
          hp: b.hp,
          maxHp: b.maxHp,
          angle: b.angle,
          facing: b.facing,
          anim: b.anim,
          aggro: b.targetId !== null && b.dyingUntil === 0,
        }),
      ),
      event: this.event,
    };
  }
}

export { SERVER_EVENTS };
