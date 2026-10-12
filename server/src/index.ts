import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import cors from 'cors';
import {
  SERVER_EVENTS,
  WORLD,
  type InputPayload,
  type JoinPayload,
  type WelcomePayload,
} from '@bug-io/shared';
import { GameWorld } from './GameWorld.js';

const PORT = Number(process.env.PORT ?? 3001);
const app = express();
app.use(cors());
app.get('/health', (_req, res) => res.json({ ok: true }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

const world = new GameWorld();
const tickMs = 1000 / WORLD.tickRate;

io.on('connection', (socket) => {
  socket.on(SERVER_EVENTS.join, (payload: JoinPayload) => {
    world.addPlayer(socket.id, payload ?? { name: 'Herói' });
    const welcome: WelcomePayload = {
      id: socket.id,
      world: { width: WORLD.width, height: WORLD.height },
    };
    socket.emit(SERVER_EVENTS.welcome, welcome);
    socket.emit(SERVER_EVENTS.snapshot, world.snapshot());
  });

  socket.on(SERVER_EVENTS.input, (input: InputPayload) => {
    world.setInput(socket.id, input);
  });

  socket.on('disconnect', () => {
    world.removePlayer(socket.id);
  });
});

setInterval(() => {
  world.update(tickMs / 1000);
  const snap = world.snapshot();
  io.emit(SERVER_EVENTS.snapshot, snap);
  for (const msg of world.drainMessages()) {
    io.emit(SERVER_EVENTS.message, msg);
  }
  for (const death of world.drainDeaths()) {
    const { id, ...payload } = death;
    const sock = io.sockets.sockets.get(id);
    if (sock) {
      sock.emit(SERVER_EVENTS.death, payload);
      sock.disconnect(true);
    }
  }
}, tickMs);

httpServer.listen(PORT, () => {
  console.log(`Bug.io server on http://localhost:${PORT}`);
});
