# Red Flags - Online Card Game

## Project Overview
A bilingual (English/Farsi) online multiplayer "Red Flags" card game. Players create dates with perk cards and sabotage each other with red flag cards. Dark red/black theme with poker-style card UI.

## Quick Start
```bash
npm install
npm run dev          # Starts both client (:5173) and server (:3001)
npm run build        # Production build (client + server + card copy)
npm start            # Run production server
```

## Tech Stack
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + Framer Motion
- **Backend**: Node.js + Express + Socket.io + Helmet + Compression
- **i18n**: i18next (EN/FA with RTL support, Vazirmatn font)
- **State**: In-memory (no database)

## Project Structure
```
├── shared/types.ts              # Shared TypeScript types (Card, GamePhase, PendingJoin, etc.)
├── client/
│   ├── public/                  # Static assets (favicon.svg, robots.txt, sitemap.xml, manifest.json)
│   ├── src/
│   │   ├── contexts/            # SocketContext, GameContext, LanguageContext
│   │   ├── pages/               # HomePage, LobbyPage, GamePage (lazy-loaded)
│   │   ├── components/ui/       # Toast, LanguageToggle, ConnectionStatus
│   │   ├── components/layout/   # Header
│   │   ├── components/shared/   # CopyLink, RulesModal, ErrorBoundary
│   │   ├── hooks/               # useWindowSize
│   │   ├── i18n/                # en.json, fa.json
│   │   └── index.css            # Tailwind + poker card styles + responsive breakpoints
│   └── vite.config.ts           # Vite config with vendor chunk splitting
├── server/src/
│   ├── game/GameInstance.ts     # Core game state machine (phases, timers, logic)
│   ├── game/GameManager.ts      # Room creation, room-to-socket mapping, pending tracking
│   ├── game/Deck.ts             # Card deck with shuffle/draw/discard
│   ├── game/Player.ts           # Player model with hand management
│   ├── socket/handlers/         # roomHandlers.ts (join approval, kick), gameHandlers.ts
│   ├── utils/logger.ts          # Structured JSON-line logger
│   ├── utils/rateLimiter.ts     # Per-socket rate limiter (30 events/5s)
│   ├── utils/sanitize.ts        # Nickname sanitization (XSS prevention)
│   ├── cards/perks.json         # 116 bilingual perk cards
│   ├── cards/redflags.json      # 100 bilingual red flag cards
│   └── config.ts                # Timers, limits, constants
```

## Game Flow
1. **HomePage** → Enter nickname (auto-filled from last session) → Create/Join room (Enter key supported, nickname-first hint if missing)
2. **Join approval** → All join requests go through host approval. Joiner sees "waiting for approval" screen. Host sees dimmed player entry with ✓/✕ buttons in lobby player list.
3. **LobbyPage** → Wait for 3+ players → Host starts (host can kick players)
4. **GamePage** phases:
   - `PERK_SELECTION` (no timer) - Pick 2 perk cards from hand (fan layout)
   - `RED_FLAG_PLAY` (no timer) - Choose a target + play 1 red flag (free choice, not fixed)
   - `REVEAL` (5s auto) - Cards flip on table
   - `JUDGING` (no timer) - Judge picks best date
   - `ROUND_RESULT` (3s auto) - Winner shown
   - Repeat until 7 points → `GAME_OVER`

## Key Architecture Decisions
- **Server-authoritative**: All game logic in `GameInstance.ts`. Client sends intents, server validates.
- **Host join approval**: All joins (lobby and mid-game) require host approval via `room:approve-join`/`room:reject-join`. Pending joiners tracked in `GameInstance.pendingJoins` and `GameManager.pendingToRoom`. Nickname uniqueness checked against both active players and pending requests.
- **Mid-game join/leave**: Players can join mid-game (host approval required). Approved mid-game joiners spectate the current round (`spectating` flag + `game:sync` payload), then enter the rotation at `startRound`. Leaving/disconnecting mid-game triggers `handlePlayerRemoved` which adjusts judge index, advances stuck phases, and restarts the round if the judge left. If active players drop below MIN_PLAYERS, game returns to lobby.
- **Red flag deadlock prevention**: `redFlagPhaseComplete()` checks if any remaining giver has feasible targets. If no one can play (e.g. the only valid target left), the phase advances automatically instead of deadlocking.
- **Host force-end round**: Host can call `game:end-round` to abandon a stuck round from any phase. Discards played cards, rotates judge, starts fresh round. Button in scoreboard panel.
- **Host kick (lobby + in-game)**: Host can kick players via `room:kick` from both lobby and during gameplay. Kicked player receives `room:kicked` and is removed. During game, `handlePlayerRemoved` handles all state cleanup.
- **Host transfer**: When the host leaves, the first remaining player becomes the new host automatically (`removePlayer` in `GameInstance.ts`).
- **Mobile layout (<1445px)**: Completely separate layout branch (`isMobile` flag from `useWindowSize` with threshold at 1445px). Instead of absolute-positioned zones, uses a vertical scrollable list of player date-rows. Judge shown as sticky banner at top. Each player row is a rounded card with nameplate + date cards centered below. Hand panel is a bottom-docked horizontal scrollable strip (not a fan) for easy touch interaction. Root uses `height: 100dvh` to prevent browser-chrome overflow. Judge taps a player row to pick winner.
- **Desktop layout (≥1445px)**: Each non-judge player's nameplate is rendered inside their date-row container — above cards for top/bottom positions, beside cards for left/right columns (so stacked rows never overlap). The judge's nameplate is rendered separately at their seat position since they have no cards. Hand-tuned positions for 3–10 players in `OTHER_LAYOUTS` in `GamePage.tsx`; U-shaped perimeter for 7–10 (left column → top row → right column). Date rows auto-scale down via `getDateScale()` at higher counts (7→0.85, 8→0.8, 9→0.72, 10→0.68). Arc-based fallback only for >10. Layout logic in `getZone()` in `GamePage.tsx`.
- **Card selection overlay (desktop)**: Perk fan and red-flag fan are absolute-positioned overlays (`absolute inset-x-0 bottom-0 z-40`), not flex children. This ensures the player zone always gets full viewport height regardless of judge vs matchmaker view.
- **Card selection panel (mobile)**: Bottom-docked panel with horizontal-scroll card strip + full-width Lock In button. Target selection chips also horizontally scrollable. No fan layout (cards are upright, individually tappable).
- **Responsive card fan (desktop)**: Fan spread scales with viewport width via `useWindowSize` hook. `minHeight` uses `min(200px, 35vh)` to fit smaller screens.
- **Nickname persistence**: Nickname is saved to `localStorage` (key: `redflags_nickname`) on create/join and auto-loaded on return to HomePage.
- **No timers on player actions**: PERK_TIMER, RED_FLAG_TIMER, JUDGING_TIMER all set to 0. Only REVEAL (5s) and ROUND_RESULT (3s) have auto-advance delays.
- **Unique red flag targeting**: Players freely choose who to give a red flag to. Each target receives exactly one red flag (first lock-in wins). The server only offers targets that keep a valid perfect matching for the remaining players (`hasPerfectMatching`/`feasibleTargetsFor` in `GameInstance.ts`), so no one is ever stranded. `game:redflag-targets` broadcasts a per-giver feasible-target map (`targetsByGiver`).
- **No argument phase**: Removed - game goes directly from REVEAL to JUDGING.
- **Cards are bilingual data**: Both `text.en` and `text.fa` in JSON. Client reads based on language setting.
- **Poker-style card UI**: CSS classes `.poker-card`, `.poker-card-white`, `.poker-card-red`, `.poker-card-slot` (empty dashed placeholder) in `index.css`. Fan layout uses Framer Motion spring animations. Card corner glyphs (♥/🚩) use `font-family: Inter` to ensure consistent size across Farsi/English.
- **Code splitting**: Pages are lazy-loaded via `React.lazy()` with `Suspense` fallback. Vendor bundles split into react, framer-motion, i18next, socket.io chunks.

## Security & Production
- **Helmet**: Security headers (CSP disabled for SPA, all others active).
- **Compression**: Gzip middleware on all responses.
- **Rate limiting**: Per-socket rate limiter (30 events / 5 seconds). Exceeding triggers disconnect warning.
- **Nickname sanitization**: Strips HTML-dangerous characters (`<>&"'\/\`) and control characters. Length validated 2–15.
- **Input validation**: Runtime type checks on all socket event payloads (cardIds, targetSocketId, winnerSocketId).
- **Health check**: `GET /health` returns `{ status, uptime, timestamp }`.
- **Graceful shutdown**: SIGTERM/SIGINT handlers clean up game state and close connections.
- **Structured logging**: JSON-line logger (`server/src/utils/logger.ts`) with info/warn/error levels.
- **Static caching**: Assets cached 7 days with immutable flag; HTML served with no-cache.
- **Error boundary**: `ErrorBoundary` component catches React render errors with reload fallback.
- **Connection status**: `ConnectionStatus` banner appears when socket disconnects.

## SEO & PWA
- Meta tags: description, theme-color, Open Graph, Twitter Card in `client/index.html`.
- Favicon: SVG red flag icon (`client/public/favicon.svg`).
- `robots.txt`: allows `/`, disallows `/room/`.
- `sitemap.xml`: single root URL entry.
- `manifest.json`: PWA-ready (standalone, dark theme).

## Responsive Breakpoints
- **Layout switch**: `vw < 1445px` → mobile vertical list layout; `vw ≥ 1445px` → desktop absolute-zone layout.
- **Desktop** (>1024px): Full-size cards (132x192), table cards (105x150).
- **Tablet** (641–1024px): Medium cards (112x164), table cards (90x130).
- **Mobile** (<640px): Compact cards (102x150), table cards (80x114).
- **Landscape** (max-height 500px): Extra compact (85x124), table cards (68x100).

## Socket Events
Client → Server: `room:create`, `room:join`, `room:leave`, `room:kick`, `room:approve-join`, `room:reject-join`, `game:start`, `game:select-perks`, `game:play-redflag` (with `targetSocketId`), `game:judge-pick`, `game:end-round`

Server → Client: `room:created`, `room:joined`, `room:join-pending`, `room:join-rejected`, `room:join-requests`, `room:player-joined`, `room:player-left`, `room:kicked`, `game:started`, `game:hand-dealt`, `game:phase-changed`, `game:sync`, `game:redflag-targets`, `game:dates-revealed`, `game:round-result`, `game:over`, `game:ended-early`, `game:timer-tick`

## Build Notes
- **Server tsconfig**: `rootDir: ".."` to include `shared/types.ts`. Output goes to `server/dist/server/src/`. Build script copies `src/cards/` to `dist/server/src/cards/`.
- **Server start**: `node dist/server/src/index.js` (adjusted for rootDir output structure).
- **Client build**: `tsc -b && vite build`. Vendor chunks split via `manualChunks` in `vite.config.ts`.
- **Important**: Always build client BEFORE server to avoid Vite picking up compiled `.js` files from shared directory.

## Design
- Theme: Dark red/black (`#0f0808` base, `#dc2626` accent)
- Cards: Poker-style with corners (♥ in red for perks, 🚩 in white for red flags, with enhanced visibility via text-shadow)
- Hover: Cards scale 1.22x with spring animation (stiffness: 400, damping: 20)
- Layout: Desktop — no central table; each player's date cards render in dashed slots near their nameplate. Mobile — vertical scrollable list of player rows with cards centered
- Nameplates: Green background (`bg-green-500/15`) when player confirms cards, with green checkmark (✓) inside the chip. Judge has yellow background (`bg-yellow-500/15`). No crown emoji on judge.
- No emoji indicators on player nameplates (no 🚩, no 👆, no 👑)
- Scoreboard panel: shows round number, host badge, "you" badge, kick buttons (host), pending join requests (host), and host's "end round" button
- Final results: shows host badge and "you" badge per player
- Scores hidden from nameplates; only shown in scoreboard and final results (white text, not red)
- Header: uniform-height buttons (`h-8`/`h-9`), compact on mobile, exit shows short text on mobile

## Conventions
- Farsi translations in `client/src/i18n/fa.json` - keep casual/informal tone
- Card content: mix of classic Red Flags + Iranian cultural humor
- No player-facing countdown timers; all player-action phases are untimed
- Accessibility: aria-labels on all interactive elements (buttons, inputs)
- RTL support: scoreboard slides from correct edge in Farsi (`lang`-aware animation direction)
