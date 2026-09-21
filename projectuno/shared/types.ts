// ============================================================
// SHARED TYPES - Used by both Server and Client
// ============================================================

export type CardColor = 'Red' | 'Blue' | 'Green' | 'Yellow' | 'None';
export type CardType = 'Number' | 'Skip' | 'Reverse' | 'Draw Two' | 'Wild' | 'Wild Draw Four';

export interface Card {
  id: string;
  type: CardType;
  color: CardColor;
  value: number | null;
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  isHuman: boolean;
  isReady: boolean;
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  direction: 1 | -1;
  drawPile: Card[];
  discardPile: Card[];
  currentColor: CardColor;
  currentCard: Card | null;
  winner: string | null;
  gameStarted: boolean;
  unoCalled: boolean;
  waitingForColorChoice: boolean;
  pendingDraw: number;
  message: string;
}

export interface Room {
  id: string;
  adminId: string;
  players: PlayerRoomInfo[];
  gameState: GameState | null;
  phase: 'lobby' | 'game';
  scores: Record<string, number>;
}

export interface PlayerRoomInfo {
  id: string;
  name: string;
  isAdmin: boolean;
  isReady: boolean;
}

// Socket Events
export interface ServerToClientEvents {
  // Room events
  'room:joined': (roomId: string, players: PlayerRoomInfo[]) => void;
  'room:player_joined': (player: PlayerRoomInfo) => void;
  'room:player_left': (playerId: string) => void;
  'room:player_ready': (playerId: string, ready: boolean) => void;
  'room:error': (message: string) => void;
  
  // Game events
  'game:started': (gameState: GameState) => void;
  'game:state_update': (gameState: GameState) => void;
  'game:card_played': (playerId: string, card: Card, gameState: GameState) => void;
  'game:card_drawn': (playerId: string, card: Card | null, gameState: GameState) => void;
  'game:color_chosen': (color: CardColor, gameState: GameState) => void;
  'game:uno_called': (playerId: string) => void;
  'game:turn_change': (currentPlayerIndex: number) => void;
  'game:game_over': (winnerId: string, finalState: GameState) => void;
  'game:error': (message: string) => void;
}

export interface ClientToServerEvents {
  // Room events
  'room:create': (playerName: string) => void;
  'room:join': (roomId: string, playerName: string) => void;
  'room:leave': () => void;
  'room:ready': (ready: boolean) => void;
  'room:start_game': () => void;
  
  // Game events
  'game:play_card': (cardId: string, chosenColor?: CardColor) => void;
  'game:draw_card': () => void;
  'game:choose_color': (color: CardColor) => void;
  'game:call_uno': () => void;
  'game:pass_turn': () => void;
}

// Card values for scoring
export const CARD_SCORES: Record<CardType, number | 'Face value'> = {
  'Number': 'Face value',
  'Skip': 20,
  'Reverse': 20,
  'Draw Two': 20,
  'Wild': 50,
  'Wild Draw Four': 50
};