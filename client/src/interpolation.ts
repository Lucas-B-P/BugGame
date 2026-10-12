/** Suaviza movimento entre snapshots do servidor (~20 Hz → 60 fps). */

export interface InterpSample {
  x: number;
  y: number;
  angle?: number;
}

export class InterpolatedEntity {
  renderX = 0;
  renderY = 0;
  renderAngle = 0;

  private from: InterpSample = { x: 0, y: 0, angle: 0 };
  private to: InterpSample = { x: 0, y: 0, angle: 0 };
  private startedAt = 0;
  private durationMs = 50;
  private initialized = false;

  /** Novo estado autoritativo do servidor. */
  push(sample: InterpSample, now: number, expectedIntervalMs = 50) {
    if (!this.initialized) {
      this.from = { ...sample };
      this.to = { ...sample };
      this.renderX = sample.x;
      this.renderY = sample.y;
      this.renderAngle = sample.angle ?? 0;
      this.initialized = true;
      this.startedAt = now;
      return;
    }

    this.from = {
      x: this.renderX,
      y: this.renderY,
      angle: this.renderAngle,
    };
    this.to = { ...sample };
    this.startedAt = now;
    // Um pouco maior que o intervalo do tick para evitar “parar” entre pacotes
    this.durationMs = Math.max(40, expectedIntervalMs * 1.15);
  }

  /** Atualiza posição visual; retorna true se ainda interpolando. */
  update(now: number): boolean {
    if (!this.initialized) return false;
    const t = Math.min(1, (now - this.startedAt) / this.durationMs);
    // ease-out suave
    const e = 1 - (1 - t) * (1 - t);
    this.renderX = this.from.x + (this.to.x - this.from.x) * e;
    this.renderY = this.from.y + (this.to.y - this.from.y) * e;
    if (this.from.angle !== undefined && this.to.angle !== undefined) {
      this.renderAngle = lerpAngle(this.from.angle, this.to.angle, e);
    }
    return t < 1;
  }

  snap(sample: InterpSample) {
    this.from = { ...sample };
    this.to = { ...sample };
    this.renderX = sample.x;
    this.renderY = sample.y;
    this.renderAngle = sample.angle ?? 0;
    this.initialized = true;
  }
}

function lerpAngle(a: number, b: number, t: number) {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}
