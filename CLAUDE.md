# Red Flags - Online Card Game

## Project Overview
A bilingual (English/Farsi) online multiplayer "Red Flags" card game. Players create dates with perk cards and sabotage each other with red flag cards. Dark red/black theme with poker-style card UI.

## Quick Start
```bash
npm install
npm run dev          # Starts both client (:5173) and server (:3001)
npm run build        # Production build
npm start            # Run production server
```

## Tech Stack
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + Framer Motion
- **Backend**: Node.js + Express + Socket.io
- **i18n**: i18next (EN/FA with RTL support, Vazirmatn font)
- **State**: In-memory (no database)

## Project Structure
```
├── shared/types.ts              # Shared TypeScript types (Card, GamePhase, etc.)
├── client/src/
│   ├── contexts/                # SocketContext, GameContext, LanguageContext
│   ├── pages/                   # HomePage, LobbyPage, GamePage
│   ├── components/ui/           # Timer, Toast, LanguageToggle
│   ├── components/layout/       # Header
│   ├── components/shared/       # CopyLink, RulesModal
│   ├── components/game/         # (game components are inline in GamePage)
│   ├── i18n/                    # en.json, fa.json
│   └── index.css                # Tailwind + poker card styles
├── server/src/
│   ├── game/GameInstance.ts     # Core game state machine (phases, timers, logic)
│   ├── game/GameManager.ts      # Room creation, room-to-socket mapping
│   ├── game/Deck.ts             # Card deck with shuffle/draw/discard
│   ├── game/Player.ts           # Player model with hand management
│   ├── socket/handlers/         # roomHandlers.ts, gameHandlers.ts
│   ├── cards/perks.json         # 116 bilingual perk cards
│   ├── cards/redflags.json      # 100 bilingual red flag cards
│   └── config.ts                # Timers, limits, constants
```

## Game Flow
1. **HomePage** → Enter nickname → Create/Join room
2. **LobbyPage** → Wait for 3+ players → Host starts
3. **GamePage** phases:
   - `PERK_SELECTION` (60s) - Pick 2 perk cards from hand (fan layout)
   - `RED_FLAG_PLAY` (45s) - Choose a target + play 1 red flag (free choice, not fixed)
   - `REVEAL` (5s) - Cards flip on table
   - `JUDGING` (60s) - Judge picks best date
   - `ROUND_RESULT` (8s) - Winner shown
   - Repeat until 7 points → `GAME_OVER`

## Key Architecture Decisions
- **Server-authoritative**: All game logic in `GameInstance.ts`. Client sends intents, server validates.
- **Free red flag targeting**: Players choose who to give red flags to (not the player to the left). Server broadcasts `game:redflag-targets` with available targets.
- **No argument phase**: Removed - game goes directly from REVEAL to JUDGING.
- **Cards are bilingual data**: Both `text.en` and `text.fa` in JSON. Client reads based on language setting.
- **Poker-style card UI**: CSS classes `.poker-card`, `.poker-card-white`, `.poker-card-red` in `index.css`. Fan layout uses Framer Motion spring animations.

## Socket Events
Client → Server: `room:create`, `room:join`, `room:leave`, `game:start`, `game:select-perks`, `game:play-redflag` (with `targetSocketId`), `game:judge-pick`

Server → Client: `room:created`, `room:joined`, `room:player-joined`, `game:started`, `game:hand-dealt`, `game:phase-changed`, `game:redflag-targets`, `game:dates-revealed`, `game:round-result`, `game:over`, `game:timer-tick`

## Design
- Theme: Dark red/black (`#0f0808` base, `#dc2626` accent)
- Cards: Poker-style with corners (♥ for perks, 🚩 for red flags)
- Hover: Cards scale 1.22x with spring animation (stiffness: 400, damping: 20)
- Table: Dark oval with red border for date display
- No golden/yellow accents - pure red/white/black

## Conventions
- Farsi translations in `client/src/i18n/fa.json` - keep casual/informal tone
- Card content: mix of classic Red Flags + Iranian cultural humor
- All timers are server-authoritative with client-side countdown sync
