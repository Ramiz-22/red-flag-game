# Red Flags Game

An online multiplayer party card game inspired by the real-life card game "Red Flags". Players create the best (or least terrible) date profiles while sabotaging others with red flags.

**Live demo:** [red-flag-game.ir](https://red-flag-game.ir) (if deployed)

## Gameplay

- **3-10 players** join a room
- Each round, one player is the **Judge** (Single) and the rest are **Matchmakers**
- Matchmakers pick 2 **Perk cards** (positive traits) to build a date
- Then play 1 **Red Flag card** on another matchmaker's date
- The Judge picks the best overall date
- First to **7 points** wins

## Features

- **Real-time multiplayer** via Socket.io with server-authoritative game logic
- **Bilingual** - Full English and Farsi (Persian) support with RTL layout
- **Deadlock prevention** - Kuhn-Munkres perfect matching algorithm ensures every player has a valid target
- **Host controls** - Kick players, approve join requests, force-end stuck rounds
- **Graceful disconnection** - Handles mid-game drops with spectator mode for rejoiners
- **Responsive dual layout** - Separate desktop (absolute-positioned player zones) and mobile (vertical scroll) UIs
- **116 Perk cards & 100 Red Flag cards** - Mix of universal and Iranian cultural humor
- **No database** - Pure in-memory state management

## Tech Stack

### Client
- **React 18** with TypeScript
- **Framer Motion** - Card animations
- **Tailwind CSS 3** - Styling
- **i18next** - Internationalization
- **Socket.io Client** - WebSocket communication
- **Vite** - Build tool

### Server
- **Node.js** with TypeScript
- **Express** - HTTP server
- **Socket.io** - WebSocket server
- **Helmet** - Security headers
- **In-memory state** - No database required

## Quick Start

```bash
# Install dependencies
npm install

# Run both client and server in development mode
npm run dev

# Or run separately
cd server && npm run dev
cd client && npm run dev
```

## Project Structure

```
├── shared/              (Shared TypeScript types)
├── server/
│   └── src/
│       ├── index.ts     (Server entry)
│       ├── config.ts    (Game constants)
│       ├── cards/       (Perk & Red Flag card data)
│       ├── game/        (Game engine: Deck, Player, GameInstance, GameManager)
│       ├── socket/      (Socket event handlers)
│       └── utils/       (Logger, rate limiter, sanitizer)
├── client/
│   └── src/
│       ├── App.tsx      (Routing)
│       ├── contexts/    (Game, Socket, Language providers)
│       ├── pages/       (Home, Lobby, Game)
│       ├── components/  (UI components)
│       └── i18n/        (Translation files)
```
