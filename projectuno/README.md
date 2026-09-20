# 🎮 UNO Classic - Retro Edition

A two-player (extensible to multiplayer) UNO card game with retro pixel-art graphics, inspired by classic games like Super Mario and Aladdin.

## Architecture

```
projectuno/
├── shared/              # Shared types & constants
│   └── types.ts
├── server/              # Backend (Node.js + Socket.IO)
│   ├── src/
│   │   ├── index.ts     # Main server entry + WebSocket handlers
│   │   ├── game/
│   │   │   ├── deck.ts  # Card creation, shuffling, drawing
│   │   │   └── game.ts  # Full UNO game engine
│   │   └── rooms/
│   │       └── roomManager.ts  # Room/lobby management
│   ├── package.json
│   └── tsconfig.json
├── client/              # Frontend (Vite + Canvas)
│   ├── src/
│   │   ├── main.ts      # App entry point + UI orchestration
│   │   ├── styles/
│   │   │   └── game.css # Retro pixel-art CSS
│   │   ├── graphics/
│   │   │   └── cardRenderer.ts  # Canvas pixel-art card renderer
│   │   ├── game/
│   │   │   └── socketClient.ts  # Socket.IO client wrapper
│   │   └── ui/
│   │       └── gameUI.ts       # Canvas game board renderer
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
└── README.md
```

## Features

- ✅ **Full UNO Rules** - Numbers, Skip, Reverse, Draw Two, Wild, Wild Draw Four
- ✅ **2-Player Support** - With special 2-player rules (Reverse = Skip, etc.)
- ✅ **Room System** - Create rooms, share 4-letter codes, invite friends
- ✅ **Retro Pixel-Art Graphics** - Canvas-based card rendering with retro aesthetic
- ✅ **Real-time** - Socket.IO for instant game updates
- ✅ **Extensible** - Ready for multiplayer (up to 10 players)

## Setup Instructions

### Prerequisites
- Node.js 18+
- npm or yarn

### 1. Install Server Dependencies

```bash
cd projectuno/server
npm install
```

### 2. Install Client Dependencies

```bash
cd ../client
npm install
```

### 3. Start the Server

```bash
cd ../server
npm run dev
```

The server will start on **http://localhost:3001**

### 4. Start the Client (in a new terminal)

```bash
cd ../client
npm run dev
```

The client will start on **http://localhost:5173**

### 5. Play!

1. Open http://localhost:5173 in two browser windows/tabs
2. In the first window: Enter a name → Click **Create Room** → Note the 4-letter code
3. In the second window: Enter a name → Enter the code → Click **Join Room**
4. Both players click **READY**
5. Admin clicks **START GAME**
6. Play UNO!

## Game Controls

| Action | Control |
|--------|---------|
| Select/Play card | Click on card (click again to play) |
| Draw card | Press **D** key |
| Call UNO | Press **U** key |
| Choose color (Wild) | Click color in the modal |
| Deselect card | Press **Escape** |

## UNO Rules Implemented

- 108 card deck (76 Number + 24 Action + 8 Wild)
- Deal 7 cards per player
- Play matching color, number, or action
- Wild cards let you choose the next color
- Wild Draw Four requires no matching color in hand
- Skip: Next player loses turn
- Reverse: Changes direction (Skip in 2-player)
- Draw Two: Next player draws 2 and loses turn
- Wild Draw Four: Choose color, next player draws 4
- UNO call when down to 1 card
- Scoring (500 points to win)

## Extending to Multiplayer

The architecture supports up to 10 players out of the box! The room system already handles it:

- Room capacity is set to 10
- Game logic supports dynamic player counts
- Direction reversal works naturally with 3+ players
- Just add more player slots in the UI for player joining

## Tech Stack

- **Backend**: Node.js, Express, Socket.IO, TypeScript
- **Frontend**: Vite, TypeScript, Canvas API, Socket.IO Client
- **Graphics**: Custom pixel-art rendering on HTML5 Canvas
- **Styling**: Retro pixel-art CSS with Press Start 2P font

## Screenshots

*(Add screenshots here after building)*

## License

MIT