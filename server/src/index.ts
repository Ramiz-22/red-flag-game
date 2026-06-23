import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import { CONFIG } from './config.js';
import { GameManager } from './game/GameManager.js';
import { registerRoomHandlers, handleLeave } from './socket/handlers/roomHandlers.js';
import { registerGameHandlers } from './socket/handlers/gameHandlers.js';
import { logger } from './utils/logger.js';
import { SocketRateLimiter } from './utils/rateLimiter.js';
import type { Card } from '../../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());
app.use(cors({ origin: CONFIG.CLIENT_URL, methods: ['GET'], credentials: false }));

const io = new Server(httpServer, {
  cors: {
    origin: CONFIG.CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: false,
  },
});

let perkCards: Card[];
let redFlagCards: Card[];
try {
  perkCards = JSON.parse(readFileSync(join(__dirname, 'cards', 'perks.json'), 'utf-8'));
  redFlagCards = JSON.parse(readFileSync(join(__dirname, 'cards', 'redflags.json'), 'utf-8'));
} catch (err) {
  logger.error('Failed to load card data', { error: String(err) });
  process.exit(1);
}

logger.info('Cards loaded', { perks: perkCards.length, redFlags: redFlagCards.length });

const gm = new GameManager(io, perkCards, redFlagCards);
const rateLimiter = new SocketRateLimiter(30, 5000);

io.on('connection', (socket) => {
  logger.info('Player connected', { socketId: socket.id });

  socket.use((event, next) => {
    if (!rateLimiter.check(socket.id!)) {
      logger.warn('Rate limited', { socketId: socket.id, event: event[0] });
      return next(new Error('Rate limited'));
    }
    next();
  });

  registerRoomHandlers(socket, gm);
  registerGameHandlers(socket, gm);

  socket.on('disconnect', () => {
    logger.info('Player disconnected', { socketId: socket.id });
    rateLimiter.remove(socket.id!);
    handleLeave(socket, gm);
  });
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: Date.now() });
});

// Serve static client build in production
const clientDist = join(__dirname, '../../../../client/dist');
app.use(express.static(clientDist, {
  maxAge: '7d',
  immutable: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  },
}));
app.get('*', (_req, res) => {
  res.sendFile(join(clientDist, 'index.html'));
});

httpServer.listen(CONFIG.PORT, () => {
  logger.info('Server started', { port: CONFIG.PORT });
});

function shutdown(signal: string) {
  logger.info('Shutting down', { signal });
  gm.destroy();
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
