import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import { CONFIG } from './config.js';
import { GameManager } from './game/GameManager.js';
import { registerRoomHandlers, handleLeave } from './socket/handlers/roomHandlers.js';
import { registerGameHandlers } from './socket/handlers/gameHandlers.js';
import type { Card } from '../../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);

app.use(cors({ origin: CONFIG.CLIENT_URL }));

const io = new Server(httpServer, {
  cors: {
    origin: CONFIG.CLIENT_URL,
    methods: ['GET', 'POST'],
  },
});

const perkCards: Card[] = JSON.parse(
  readFileSync(join(__dirname, 'cards', 'perks.json'), 'utf-8')
);
const redFlagCards: Card[] = JSON.parse(
  readFileSync(join(__dirname, 'cards', 'redflags.json'), 'utf-8')
);

console.log(`Loaded ${perkCards.length} perk cards and ${redFlagCards.length} red flag cards`);

const gm = new GameManager(io, perkCards, redFlagCards);

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  registerRoomHandlers(socket, gm);
  registerGameHandlers(socket, gm);

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    handleLeave(socket, gm);
  });
});

// Serve static client build in production
const clientDist = join(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(join(clientDist, 'index.html'));
});

httpServer.listen(CONFIG.PORT, () => {
  console.log(`Server running on port ${CONFIG.PORT}`);
});
