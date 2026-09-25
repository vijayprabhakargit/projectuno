# UNO Classic — Retro Edition

A real-time multiplayer UNO card game with retro pixel-art graphics, built with TypeScript, Node.js, Socket.IO, and HTML5 Canvas.

*"Inspired by the classics. Powered by modern tech."*

---

## Features

- **Real-time multiplayer** — Play 2–10 players via WebSocket
- **Retro pixel-art graphics** — Canvas-rendered game board with a nostalgic arcade aesthetic
- **Full UNO rules** — All 108 cards, all standard effects and penalties
- **Room system** — Create/join rooms with easy 4-letter codes
- **Scoring system** — Tracks cumulative scores across multiple rounds (500 points to win)
- **Correct 2-player rules** — Reverse acts as Skip; after Draw Two/Draw Four, same player goes again
- **UNO penalty** — Forgot to call UNO? You'll draw 2 cards!
- **Draw-restriction enforcement** — After drawing, only the drawn card can be played

## Play Live 🎮

The game is deployed and ready to play with friends anywhere in the world!

| Component | Hosted At |
|-----------|-----------|
| **Client** (play the game) | [https://projectunoplay.onrender.com](https://projectunoplay.onrender.com) |
| **Server** (game logic + WebSocket) | [https://projectuno-675b.onrender.com](https://projectuno-675b.onrender.com) |

### How to play with friends

1. All players open **[https://projectunoplay.onrender.com](https://projectunoplay.onrender.com)** in their browser
2. One player enters their name and clicks **Create Room** — a 4-letter room code is generated
3. Other players enter their name + the room code and click **Join Room**
4. Everyone clicks **READY**
5. The room admin (who created the room) clicks **START GAME**
6. Play UNO! Use **D** to draw, **U** to call UNO, and click cards to play them

> **Note:** Render's free tier may take 30–60 seconds to wake up after inactivity (cold start). Just refresh if needed!

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### 1. Install Dependencies
`
cd server
npm install

cd ../client
npm install
`

### 2. Start the Server
`
cd ../server
npm run dev
`
Server runs on http://localhost:3001

### 3. Start the Client (new terminal)
`
cd ../client
npm run dev
`
Client runs on http://localhost:5173

### 4. Play!
1. Open http://localhost:5173 in two browser windows
2. Window 1: Enter name -> Create Room -> Note the 4-letter code
3. Window 2: Enter name -> Enter code -> Join Room
4. Both players click READY
5. Admin clicks START GAME
6. Play UNO!

## Card Reference

### Number Cards (76 total)
Each color (Red, Blue, Green, Yellow) has one 0 and two of each 1-9.

### Action Cards (8 each, 2 per color)
| Card | Effect |
|------|--------|
| Skip | Next player loses their turn |
| Reverse | Reverses direction (Skip in 2-player) |
| Draw Two | Next player draws 2 and loses turn |

### Wild Cards (8 total)
| Card | Count | Effect |
|------|-------|--------|
| Wild | 4 | Choose next color |
| Wild Draw Four | 4 | Choose color + next player draws 4 |

### Scoring
| Card | Points |
|------|--------|
| Number 0-9 | Face value |
| Skip, Reverse, Draw Two | 20 |
| Wild, Wild Draw Four | 50 |

## Rules

### Initial Card Handling
Only a **Number** card may start the game. If the revealed card is an action or
wild card (Skip, Reverse, Draw Two, Wild, Wild Draw Four), it is shuffled back
into the draw pile and another card is revealed, until a Number card appears.

| First Card | Effect |
|------------|--------|
| Number | Normal start, player to dealer's left goes first |
| Skip, Reverse, Draw Two, Wild, Wild Draw Four | Not allowed as the first card — reshuffled and replaced by a Number card |

### UNO Call
- Call UNO (press U) when you play down to 1 card
- If caught failing to call UNO, draw 2 cards
- Catch window closes when next player's turn starts

### Final Card Rules
- Winning with Draw Two/Wild Draw Four: next player still draws before scoring
- Winning with Skip/Reverse: round ends immediately

### 2-Player Mode
- Reverse acts as Skip
- After Skip, Reverse, Draw Two, or Wild Draw Four: same player goes again

## Controls
| Action | Control |
|--------|---------|
| Play card | Click card in hand |
| Draw card | Press D |
| Call UNO | Press U |
| Choose color (Wild) | Click color in modal |
| Deselect card | Escape |

## Architecture
`
projectuno/
  client/           Frontend (Vite + Canvas)
    src/
      main.ts        App entry + UI screens
      styles/        Retro CSS (Press Start 2P font)
      graphics/      Card renderer (Canvas)
      game/          Socket client
      ui/            Game board UI
  server/            Backend (Node.js + Socket.IO)
    src/
      index.ts       Server entry + WebSocket handlers
      game/          Game engine (deck, rules, effects)
      rooms/         Room/lobby management
  shared/            Shared types (Card, GameState, etc.)
`

## Bug Fixes

| Bug | Fix |
|-----|-----|
| Wild Draw Four not drawing | Added applyDrawEffect(4) when color chosen inline |
| Winner not declared (wild last card) | Added winner check in chooseColor() |
| 2-player turn order wrong | Skip advanceTurn for action cards in 2-player |
| Initial discard not handled | Full first-card logic for all types |
| UNO penalty missing | unoPenaltyWindow + catchUno() + socket handler |
| Draw-then-play restriction | drawnCardId tracking enforced in playCard |
| Only wild cards blocked from starting | All non-number cards (Skip, Reverse, Draw Two, Wild, Wild Draw Four) are reshuffled so only a Number card starts the game |

## Tech Stack
- Frontend: TypeScript, Vite, HTML5 Canvas, Socket.IO Client
- Backend: Node.js, Express, Socket.IO, TypeScript
- Graphics: Custom pixel-art on Canvas

## Follow-Up Improvements

### 🎯 Multi-Player Opponent Display
Currently, the game board only shows one opponent's cards at the top. When playing with **3+ players**, the UI should be updated to display multiple opponent hands around the board (top-left, top-right, etc.) with proper positioning and card counts. Each opponent should be clearly labeled and the active player's turn should be highlighted.

### 📱 Mobile Responsive Design
The game should render and play correctly on **mobile devices**. This includes:
- **Responsive canvas sizing** — Auto-scale the game board to fit mobile screens
- **Touch-friendly controls** — Tap-to-play (already works), but need larger hit targets for fingers
- **Chat UX redesign** — The chat overlay needs to be more compact and collapsible on small screens (slide-in drawer or floating bubble style)
- **Color picker modal** — Ensure the color choice buttons are large enough for mobile taps
- **Hand scrolling** — The card hand should support horizontal swipe/touch scrolling on mobile

Contributions and ideas for these improvements are welcome!

## License
MIT
