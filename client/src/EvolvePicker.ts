import Phaser from 'phaser';
import { HEROES, type HeroId } from '@bug-io/shared';

type EvolveChoice = {
  heroId: HeroId;
  container: Phaser.GameObjects.Container;
};

/** Anel de evolução ao redor do jogador. */
export class EvolvePicker {
  private root: Phaser.GameObjects.Container;
  private choices: EvolveChoice[] = [];
  private title: Phaser.GameObjects.Text;
  private visible = false;
  private pulse = 0;
  private onPick: (id: HeroId) => void;

  constructor(
    private scene: Phaser.Scene,
    onPick: (id: HeroId) => void,
  ) {
    this.onPick = onPick;
    this.title = scene.add
      .text(0, -78, 'Evoluir', {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '16px',
        color: '#fff8e7',
        stroke: '#1c2416',
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    this.root = scene.add.container(0, 0, [this.title]).setDepth(20).setVisible(false);
  }

  show(options: HeroId[], atX: number, atY: number) {
    const same =
      this.visible &&
      this.choices.length === options.length &&
      this.choices.every((c, i) => c.heroId === options[i]);

    if (!same) {
      this.clearChoices();
      const n = options.length;
      const radius = n === 1 ? 70 : 88;

      options.forEach((heroId, i) => {
        const angle = -Math.PI / 2 + (i * (Math.PI * 2)) / n;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const def = HEROES[heroId];

        const bg = this.scene.add.circle(0, 0, 30, 0x1c2416, 0.82);
        bg.setStrokeStyle(3, 0xc45c26, 1);
        const icon = this.scene.add.image(0, -2, `${heroId}_idle_0`).setScale(0.42);
        const label = this.scene.add
          .text(0, 36, def.name, {
            fontFamily: 'Segoe UI, Arial, sans-serif',
            fontSize: '12px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
          })
          .setOrigin(0.5);

        const hit = this.scene.add.circle(0, 0, 34, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
        hit.on('pointerover', () => {
          bg.setScale(1.12);
          icon.setScale(0.48);
        });
        hit.on('pointerout', () => {
          bg.setScale(1);
          icon.setScale(0.42);
        });
        hit.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
          pointer.event.stopPropagation();
          this.onPick(heroId);
        });

        const container = this.scene.add.container(x, y, [bg, icon, label, hit]);
        this.root.add(container);
        this.choices.push({ heroId, container });
      });
    }

    this.root.setPosition(atX, atY);
    this.root.setVisible(true);
    this.visible = true;
  }

  hide() {
    if (!this.visible) return;
    this.root.setVisible(false);
    this.visible = false;
    this.clearChoices();
  }

  update(atX: number, atY: number, delta: number) {
    if (!this.visible) return;
    this.root.setPosition(atX, atY);
    this.pulse += delta * 0.004;
    this.root.setScale(1 + Math.sin(this.pulse) * 0.03);
  }

  private clearChoices() {
    for (const c of this.choices) c.container.destroy();
    this.choices = [];
    this.root.removeAll(false);
    this.root.add(this.title);
  }

  destroy() {
    this.root.destroy();
  }
}
