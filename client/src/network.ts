import { io, Socket } from 'socket.io-client';
import {
  SERVER_EVENTS,
  WORLD,
  type DeathPayload,
  type InputPayload,
  type JoinPayload,
  type Snapshot,
  type WelcomePayload,
} from '@bug-io/shared';
import { GameWorld } from '../../server/src/GameWorld';

export type NetworkHandlers = {
  onWelcome: (data: WelcomePayload) => void;
  onSnapshot: (snap: Snapshot) => void;
  onMessage: (msg: string) => void;
  onEvolved: () => void;
  onDeath: (payload: DeathPayload) => void;
};

interface Transport {
  connect(payload: JoinPayload): void;
  disconnect(): void;
  sendInput(input: InputPayload): void;
}

class SocketTransport implements Transport {
  private socket: Socket;

  constructor(url: string, handlers: NetworkHandlers) {
    this.socket = io(url, {
      path: '/socket.io',
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });

    this.socket.on(SERVER_EVENTS.welcome, (data: WelcomePayload) => handlers.onWelcome(data));
    this.socket.on(SERVER_EVENTS.snapshot, (snap: Snapshot) => handlers.onSnapshot(snap));
    this.socket.on(SERVER_EVENTS.message, (msg: string) => handlers.onMessage(msg));
    this.socket.on(SERVER_EVENTS.evolved, () => handlers.onEvolved());
    this.socket.on(SERVER_EVENTS.death, (payload: DeathPayload) => handlers.onDeath(payload));
  }

  connect(payload: JoinPayload) {
    if (!this.socket.connected) this.socket.connect();
    this.socket.emit(SERVER_EVENTS.join, payload);
  }

  disconnect() {
    this.socket.removeAllListeners();
    this.socket.disconnect();
  }

  sendInput(input: InputPayload) {
    this.socket.emit(SERVER_EVENTS.input, input);
  }
}

class LocalTransport implements Transport {
  private world = new GameWorld();
  private playerId = crypto.randomUUID();
  private timer: number | null = null;

  constructor(private handlers: NetworkHandlers) {}

  connect(payload: JoinPayload) {
    this.world.addPlayer(this.playerId, payload ?? { name: 'Herói' });
    this.handlers.onWelcome({
      id: this.playerId,
      world: { width: WORLD.width, height: WORLD.height },
    });
    this.handlers.onSnapshot(structuredClone(this.world.snapshot()));

    const tickMs = 1000 / WORLD.tickRate;
    this.timer = window.setInterval(() => this.step(tickMs / 1000), tickMs);
  }

  disconnect() {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    this.world.removePlayer(this.playerId);
  }

  sendInput(input: InputPayload) {
    this.world.setInput(this.playerId, input);
  }

  private step(dt: number) {
    this.world.update(dt);
    this.handlers.onSnapshot(structuredClone(this.world.snapshot()));
    for (const msg of this.world.drainMessages()) {
      this.handlers.onMessage(msg);
    }
    for (const death of this.world.drainDeaths()) {
      if (death.id !== this.playerId) continue;
      const { id: _id, ...payload } = death;
      this.disconnect();
      this.handlers.onDeath(payload);
    }
  }
}

export class NetworkClient {
  private transport: Transport;

  constructor(handlers: NetworkHandlers) {
    const serverUrl = import.meta.env.VITE_SERVER_URL;
    this.transport = serverUrl
      ? new SocketTransport(serverUrl, handlers)
      : new LocalTransport(handlers);
  }

  connect(payload: JoinPayload) {
    this.transport.connect(payload);
  }

  disconnect() {
    this.transport.disconnect();
  }

  sendInput(input: InputPayload) {
    this.transport.sendInput(input);
  }
}
