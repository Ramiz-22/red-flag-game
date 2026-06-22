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
1. **HomePage** → Enter nickname → Create/Join room (Enter key supported)
2. **LobbyPage** → Wait for 3+ players → Host starts (host can kick players)
3. **GamePage** phases:
   - `PERK_SELECTION` (no timer) - Pick 2 perk cards from hand (fan layout)
   - `RED_FLAG_PLAY` (no timer) - Choose a target + play 1 red flag (free choice, not fixed)
   - `REVEAL` (5s auto) - Cards flip on table
   - `JUDGING` (no timer) - Judge picks best date
   - `ROUND_RESULT` (8s auto) - Winner shown
   - Repeat until 7 points → `GAME_OVER`

## Key Architecture Decisions
- **Server-authoritative**: All game logic in `GameInstance.ts`. Client sends intents, server validates.
- **Per-player zone layout**: Each player owns a screen zone with their nameplate at the edge and a date-card slot row pulled toward center. Hand-tuned positions for 3–6 players; arc-based fallback for 7–10. Layout logic in `getZone()` in `GamePage.tsx`.
- **No timers on player actions**: PERK_TIMER, RED_FLAG_TIMER, JUDGING_TIMER all set to 0. Only REVEAL (5s) and ROUND_RESULT (8s) have auto-advance delays.
- **Free red flag targeting**: Players choose who to give red flags to (not the player to the left). Server broadcasts `game:redflag-targets` with available targets.
- **No argument phase**: Removed - game goes directly from REVEAL to JUDGING.
- **Host kick**: Host can kick players from the lobby via `room:kick` event.
- **Cards are bilingual data**: Both `text.en` and `text.fa` in JSON. Client reads based on language setting.
- **Poker-style card UI**: CSS classes `.poker-card`, `.poker-card-white`, `.poker-card-red`, `.poker-card-slot` (empty dashed placeholder) in `index.css`. Fan layout uses Framer Motion spring animations.

## Socket Events
Client → Server: `room:create`, `room:join`, `room:leave`, `room:kick`, `game:start`, `game:select-perks`, `game:play-redflag` (with `targetSocketId`), `game:judge-pick`

Server → Client: `room:created`, `room:joined`, `room:player-joined`, `room:player-left`, `room:kicked`, `game:started`, `game:hand-dealt`, `game:phase-changed`, `game:redflag-targets`, `game:dates-revealed`, `game:round-result`, `game:over`, `game:timer-tick`

## Design
- Theme: Dark red/black (`#0f0808` base, `#dc2626` accent)
- Cards: Poker-style with corners (♥ for perks, 🚩 for red flags)
- Hover: Cards scale 1.22x with spring animation (stiffness: 400, damping: 20)
- Layout: No central table; each player's date cards render in dashed slots near their nameplate
- No golden/yellow accents - pure red/white/black

## Conventions
- Farsi translations in `client/src/i18n/fa.json` - keep casual/informal tone
- Card content: mix of classic Red Flags + Iranian cultural humor
- No player-facing countdown timers; all player-action phases are untimed
