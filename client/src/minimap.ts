import {
  SHIELDS,
  WORLD,
  type BossState,
  type PlayerState,
  type ShieldPickupState,
  type Snapshot,
} from '@bug-io/shared';
import Phaser from 'phaser';

const SIZE = 192;

type IconCache = Map<string, HTMLImageElement>;

export class Minimap {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private terrain: HTMLCanvasElement | null = null;
  private icons: IconCache = new Map();
  private myId = '';
  private lastSnap: Snapshot | null = null;

  mount(myId: string) {
    this.myId = myId;
    this.canvas = document.getElementById('minimap-canvas') as HTMLCanvasElement | null;
    if (!this.canvas) return;
    this.canvas.width = SIZE;
    this.canvas.height = SIZE;
    this.ctx = this.canvas.getContext('2d');
    this.preloadIcons();
    this.draw();
  }

  setMyId(id: string) {
    this.myId = id;
  }

  /** Captura o jardim real (chao + props) numa textura estatica do minimapa. */
  bakeTerrain(scene: Phaser.Scene) {
    const out = document.createElement('canvas');
    out.width = SIZE;
    out.height = SIZE;
    const ctx = out.getContext('2d');
    if (!ctx) return;

    const sx = SIZE / WORLD.width;
    const sy = SIZE / WORLD.height;

    ctx.fillStyle = '#5f8f45';
    ctx.fillRect(0, 0, SIZE, SIZE);

    type DrawItem = { depth: number; draw: () => void };
    const items: DrawItem[] = [];

    for (const obj of scene.children.list) {
      const vis = (obj as { visible?: boolean }).visible;
      if (vis === false) continue;

      if (obj instanceof Phaser.GameObjects.TileSprite) {
        const key = obj.texture?.key;
        if (!key?.startsWith('garden_')) continue;
        const src = obj.texture.getSourceImage() as CanvasImageSource | null;
        if (!src) continue;
        items.push({
          depth: obj.depth,
          draw: () => {
            const iw = (src as HTMLImageElement).width || 64;
            const ih = (src as HTMLImageElement).height || 64;
            const tw = Math.max(8, iw * sx * obj.scaleX);
            const th = Math.max(8, ih * sy * obj.scaleY);
            ctx.save();
            ctx.globalAlpha = obj.alpha;
            for (let y = 0; y < SIZE; y += th) {
              for (let x = 0; x < SIZE; x += tw) {
                ctx.drawImage(src, x, y, tw + 1, th + 1);
              }
            }
            ctx.restore();
          },
        });
        continue;
      }

      if (obj instanceof Phaser.GameObjects.Rectangle) {
        if (obj.depth > 5) continue;
        items.push({
          depth: obj.depth,
          draw: () => {
            const x = (obj.x - obj.width * obj.originX) * sx;
            const y = (obj.y - obj.height * obj.originY) * sy;
            const w = obj.width * sx;
            const h = obj.height * sy;
            const c = Phaser.Display.Color.IntegerToColor(obj.fillColor);
            ctx.fillStyle = `rgba(${c.red},${c.green},${c.blue},${obj.alpha})`;
            ctx.fillRect(x, y, w, h);
          },
        });
        continue;
      }

      if (obj instanceof Phaser.GameObjects.Image) {
        const key = obj.texture?.key;
        if (!key?.startsWith('garden_')) continue;
        const src = obj.texture.getSourceImage() as CanvasImageSource | null;
        if (!src) continue;
        items.push({
          depth: obj.depth,
          draw: () => {
            const fw = obj.displayWidth * sx;
            const fh = obj.displayHeight * sy;
            const x = obj.x * sx - fw * obj.originX;
            const y = obj.y * sy - fh * obj.originY;
            ctx.save();
            ctx.globalAlpha = obj.alpha;
            ctx.drawImage(src, x, y, Math.max(1, fw), Math.max(1, fh));
            ctx.restore();
          },
        });
      }
    }

    items.sort((a, b) => a.depth - b.depth);
    for (const item of items) item.draw();

    const grad = ctx.createRadialGradient(
      SIZE / 2,
      SIZE / 2,
      SIZE * 0.35,
      SIZE / 2,
      SIZE / 2,
      SIZE * 0.72,
    );
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(12,18,10,0.28)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, SIZE, SIZE);

    this.terrain = out;
    this.draw();
  }

  update(snap: Snapshot) {
    this.lastSnap = snap;
    this.draw();
  }

  private preloadIcons() {
    const paths = [
      ['boss_wraith', 'assets/bosses/wraith/wraith_idle_000.png'],
      ['boss_minotaur', 'assets/bosses/minotaur/minotaur_idle_000.png'],
      ['boss_skeleton', 'assets/bosses/skeleton/skeleton_idle_000.png'],
      ['boss_necromancer', 'assets/bosses/necromancer/necromancer_idle_000.png'],
      ...Array.from({ length: 8 }, (_, i) => [
        `shield_${i + 1}`,
        `assets/shields/shield_${i + 1}.png`,
      ]),
    ] as [string, string][];

    for (const [key, src] of paths) {
      if (this.icons.has(key)) continue;
      const img = new Image();
      img.decoding = 'async';
      img.src = src;
      img.onload = () => {
        this.icons.set(key, img);
        if (this.lastSnap) this.draw();
      };
    }
  }

  private worldToMap(x: number, y: number) {
    return {
      x: (x / WORLD.width) * SIZE,
      y: (y / WORLD.height) * SIZE,
    };
  }

  private draw() {
    const ctx = this.ctx;
    if (!ctx || !this.canvas) return;

    ctx.clearRect(0, 0, SIZE, SIZE);

    if (this.terrain) {
      ctx.drawImage(this.terrain, 0, 0);
    } else {
      ctx.fillStyle = '#5f8f45';
      ctx.fillRect(0, 0, SIZE, SIZE);
    }

    const snap = this.lastSnap;
    if (!snap) return;

    for (const s of snap.shields ?? []) this.drawShield(s);
    for (const b of snap.bosses ?? []) this.drawBoss(b);

    const top = this.topPlayer(snap.players);
    if (top && top.id !== this.myId) this.drawRankMarker(top);

    const me = snap.players.find((p) => p.id === this.myId);
    if (me?.alive) this.drawSelf(me);
  }

  private topPlayer(players: PlayerState[]): PlayerState | null {
    const alive = players.filter((p) => p.alive);
    if (!alive.length) return null;
    return alive.slice().sort((a, b) => b.xp - a.xp || b.level - a.level)[0] ?? null;
  }

  private drawShield(s: ShieldPickupState) {
    const ctx = this.ctx!;
    const { x, y } = this.worldToMap(s.x, s.y);
    const img = this.icons.get(`shield_${s.tier}`);
    const size = 10 + s.tier * 0.35;
    const color = SHIELDS[s.tier]?.auraColor ?? 0xc9a227;
    const css = `#${color.toString(16).padStart(6, '0')}`;
    const ringR = size * 0.72;

    // Contorno estatico da raridade
    ctx.beginPath();
    ctx.strokeStyle = css;
    ctx.lineWidth = 2.2;
    ctx.arc(x, y, ringR, 0, Math.PI * 2);
    ctx.stroke();

    if (img?.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
    } else {
      ctx.fillStyle = css;
      ctx.beginPath();
      ctx.arc(x, y, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawBoss(b: BossState) {
    const ctx = this.ctx!;
    const { x, y } = this.worldToMap(b.x, b.y);
    const img = this.icons.get(`boss_${b.type}`);
    const size =
      b.type === 'necromancer' ? 25 : b.type === 'skeleton' ? 24 : b.type === 'minotaur' ? 26 : 22;

    ctx.beginPath();
    ctx.fillStyle = b.aggro ? 'rgba(230,57,70,0.45)' : 'rgba(20,16,28,0.55)';
    ctx.arc(x, y, size * 0.48, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = b.aggro ? '#e63946' : '#ffe8a3';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (img?.complete && img.naturalWidth > 0) {
      const sw = img.naturalWidth;
      const sh = img.naturalHeight;
      const crop = Math.min(sw, sh) * 0.72;
      const cx = (sw - crop) / 2;
      const cy = (sh - crop) / 2;
      ctx.drawImage(img, cx, cy, crop, crop, x - size / 2, y - size / 2, size, size);
    } else {
      ctx.fillStyle = '#ffe8a3';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    const pct = Math.max(0, b.hp / b.maxHp);
    const barW = size;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x - barW / 2, y + size / 2 + 1, barW, 3);
    ctx.fillStyle = b.aggro ? '#e63946' : '#c77dff';
    ctx.fillRect(x - barW / 2, y + size / 2 + 1, barW * pct, 3);
  }

  private drawRankMarker(p: PlayerState) {
    const ctx = this.ctx!;
    const { x, y } = this.worldToMap(p.x, p.y);

    ctx.beginPath();
    ctx.fillStyle = '#ffd700';
    ctx.arc(x, y, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1a1f2e';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    ctx.fillStyle = '#1a1f2e';
    ctx.font = 'bold 8px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('1', x, y + 0.5);
  }

  private drawSelf(me: PlayerState) {
    const ctx = this.ctx!;
    const { x, y } = this.worldToMap(me.x, me.y);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(me.angle);
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-5.5, 5);
    ctx.lineTo(-5.5, -5);
    ctx.closePath();
    ctx.fillStyle = '#4cc9f0';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.restore();
  }
}
