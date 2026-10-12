import { io, Socket } from 'socket.io-client';
import {
  SERVER_EVENTS,
  type DeathPayload,
  type InputPayload,
  type JoinPayload,
  type Snapshot,
  type WelcomePayload,
} from '@bug-io/shared';

export type NetworkHandlers = {
  onWelcome: (data: WelcomePayload) => void;
  onSnapshot: (snap: Snapshot) => void;
  onMessage: (msg: string) => void;
  onEvolved: () => void;
  onDeath: (payload: DeathPayload) => void;
};

export class NetworkClient {
  socket: Socket;
  private handlers: NetworkHandlers;

  constructor(handlers: NetworkHandlers) {
    this.handlers = handlers;
    this.socket = io(import.meta.env.VITE_SERVER_URL || window.location.origin, {
      path: '/socket.io',
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });

    this.socket.on(SERVER_EVENTS.welcome, (data: WelcomePayload) => this.handlers.onWelcome(data));
    this.socket.on(SERVER_EVENTS.snapshot, (snap: Snapshot) => this.handlers.onSnapshot(snap));
    this.socket.on(SERVER_EVENTS.message, (msg: string) => this.handlers.onMessage(msg));
    this.socket.on(SERVER_EVENTS.evolved, () => this.handlers.onEvolved());
    this.socket.on(SERVER_EVENTS.death, (payload: DeathPayload) => this.handlers.onDeath(payload));
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
