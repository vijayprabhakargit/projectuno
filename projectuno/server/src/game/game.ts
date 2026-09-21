import { Card, CardColor, CardType, GameState, Player } from '../../../shared/types';
import { 
  createDeck, shuffleDeck, dealCards, drawCard, 
  isCardPlayable, canPlayWildDrawFour, getCardScore 
} from './deck';

export class UnoGame {
  private state: GameState;
  private playerIds: string[];

  constructor(playerNames: { id: string; name: string }[]) {
    this.playerIds = playerNames.map((p: { id: string; name: string }) => p.id);
    
    // Create and shuffle deck
    let deck = shuffleDeck(createDeck());
    
    // Deal 7 cards to each player
    const hands: Card[][] = [];
    for (const _ of playerNames) {
      const hand: Card[] = [];
      for (let i = 0; i < 7; i++) {
        const card = deck.pop();
        if (card) hand.push(card);
      }
      hands.push(hand);
    }

    // Create initial discard pile (first non-action-safe card)
    let firstCard: Card | undefined;
    let attempts = 0;
    do {
      firstCard = deck.pop();
      attempts++;
      if (attempts > 50) break; // Safety
    } while (firstCard && (firstCard.type !== 'Number' || firstCard.color === 'None'));
    
    if (!firstCard) {
      // Fallback: just use any card
      firstCard = deck.pop() || { id: 'fallback', type: 'Number', color: 'Red', value: 0 };
    }

    const discardPile: Card[] = [firstCard];

    this.state = {
      players: playerNames.map((p: { id: string; name: string }, i: number) => ({
        id: p.id,
        name: p.name,
        hand: hands[i],
        isHuman: true,
        isReady: true
      })),
      currentPlayerIndex: Math.floor(Math.random() * playerNames.length),
      direction: 1,
      drawPile: deck,
      discardPile: discardPile,
      currentColor: firstCard.color as CardColor,
      currentCard: firstCard,
      winner: null,
      gameStarted: true,
      unoCalled: false,
      waitingForColorChoice: false,
      pendingDraw: 0,
      message: 'Game started!'
    };
  }

  getState(): GameState {
    return this.state;
  }

  getPlayerState(playerId: string): { publicState: GameState; hand: Card[] } {
    // Return a sanitized state for the player (with their own hand)
    const player = this.state.players.find((p: Player) => p.id === playerId);
    return {
      publicState: this.state,
      hand: player?.hand || []
    };
  }

  isPlayerTurn(playerId: string): boolean {
    const currentPlayer = this.state.players[this.state.currentPlayerIndex];
    return currentPlayer?.id === playerId;
  }

  playCard(playerId: string, cardId: string, chosenColor?: CardColor): { success: boolean; message: string } {
    if (!this.isPlayerTurn(playerId)) {
      return { success: false, message: 'Not your turn!' };
    }

    if (this.state.waitingForColorChoice) {
      return { success: false, message: 'Waiting for color choice!' };
    }

    const player = this.state.players.find((p: Player) => p.id === playerId);
    if (!player) return { success: false, message: 'Player not found!' };

    const cardIndex = player.hand.findIndex((c: Card) => c.id === cardId);
    if (cardIndex === -1) return { success: false, message: 'Card not in hand!' };

    const card = player.hand[cardIndex];
    const currentColor = this.state.currentColor;
    const currentCard = this.state.currentCard;

    // Check if card is playable
    if (card.type === 'Wild Draw Four') {
      if (!canPlayWildDrawFour(player.hand, currentColor)) {
        return { success: false, message: 'You must have no card matching the current color to play Wild Draw Four!' };
      }
    } else if (!isCardPlayable(card, currentColor, currentCard)) {
      return { success: false, message: 'Card is not playable!' };
    }

    // Remove card from hand
    player.hand.splice(cardIndex, 1);

    // Add card to discard pile
    this.state.discardPile.push(card);
    this.state.currentCard = card;

    // Handle wild cards
    if (card.type === 'Wild' || card.type === 'Wild Draw Four') {
      if (chosenColor) {
        this.state.currentColor = chosenColor;
      } else {
        this.state.waitingForColorChoice = true;
        this.state.message = 'Choose a color!';
        return { success: true, message: 'Played wild card, choose color!' };
      }
    } else {
      this.state.currentColor = card.color;
    }

    // Apply card effects
    this.applyCardEffect(card);

    // Check for winner
    if (player.hand.length === 0) {
      this.state.winner = playerId;
      this.state.message = `${player.name} wins!`;
      return { success: true, message: 'You win!' };
    }

    // Move to next turn if not waiting for color
    if (!this.state.waitingForColorChoice) {
      this.advanceTurn();
    }

    return { success: true, message: 'Card played!' };
  }

  drawCardAction(playerId: string): { success: boolean; message: string; drawnCards?: Card[] } {
    if (!this.isPlayerTurn(playerId)) {
      return { success: false, message: 'Not your turn!' };
    }

    if (this.state.waitingForColorChoice) {
      return { success: false, message: 'Waiting for color choice!' };
    }

    const player = this.state.players.find((p: Player) => p.id === playerId);
    if (!player) return { success: false, message: 'Player not found!' };

    const { drawnCards, newDeck, newDiscardPile } = drawCard(
      this.state.drawPile, 
      this.state.discardPile,
      1
    );

    this.state.drawPile = newDeck;
    this.state.discardPile = newDiscardPile;

    if (drawnCards.length > 0) {
      const drawnCard = drawnCards[0];
      player.hand.push(drawnCard);

      // Check if drawn card is playable
      if (isCardPlayable(drawnCard, this.state.currentColor, this.state.currentCard)) {
        this.state.message = 'Drew a card! You can play it if you want.';
        return { success: true, message: 'Drew a playable card!', drawnCards };
      } else {
        this.state.message = 'Drew a card. Turn passes.';
      }
    } else {
      this.state.message = 'No cards to draw!';
    }

    this.advanceTurn();
    return { success: true, message: 'Drew a card. Turn passed.', drawnCards };
  }

  chooseColor(playerId: string, color: CardColor): { success: boolean; message: string } {
    if (!this.isPlayerTurn(playerId)) {
      return { success: false, message: 'Not your turn!' };
    }

    if (!this.state.waitingForColorChoice) {
      return { success: false, message: 'No color choice pending!' };
    }

    this.state.currentColor = color;
    this.state.waitingForColorChoice = false;
    this.state.message = `Color changed to ${color}!`;
    
    // Apply Wild Draw Four effect after color choice
    const lastCard = this.state.currentCard;
    if (lastCard && lastCard.type === 'Wild Draw Four') {
      this.applyDrawEffect(4);
    }

    this.advanceTurn();
    return { success: true, message: `Color changed to ${color}!` };
  }

  callUno(playerId: string): { success: boolean; message: string } {
    const player = this.state.players.find((p: Player) => p.id === playerId);
    if (player && player.hand.length === 1) {
      this.state.unoCalled = true;
      this.state.message = `${player.name} called UNO!`;
      return { success: true, message: 'UNO called!' };
    }
    return { success: false, message: 'Cannot call UNO!' };
  }

  private applyCardEffect(card: Card): void {
    const numPlayers = this.state.players.length;

    switch (card.type) {
      case 'Skip': {
        if (numPlayers === 2) {
          // In 2-player, Skip acts like Skip - opponent loses turn, same player goes again
          this.state.message = 'Skip! Opponent loses turn.';
        } else {
          this.state.message = 'Skip! Next player loses turn.';
          this.state.currentPlayerIndex = this.getNextPlayerIndex();
        }
        break;
      }
      
      case 'Reverse': {
        if (numPlayers === 2) {
          // In 2-player, Reverse acts like Skip
          this.state.message = 'Reverse! (Acts like Skip in 2-player)';
        } else {
          this.state.direction = (this.state.direction === 1 ? -1 : 1) as 1 | -1;
          this.state.message = 'Direction reversed!';
        }
        break;
      }
      
      case 'Draw Two': {
        this.state.message = 'Draw Two! Next player draws 2 and loses turn.';
        this.applyDrawEffect(2);
        break;
      }
      
      case 'Wild': {
        this.state.message = 'Wild! Choose a color.';
        // waitingForColorChoice is set in playCard
        break;
      }
      
      case 'Wild Draw Four': {
        // Effect applied after color choice
        this.state.message = 'Wild Draw Four! Choose a color.';
        break;
      }
    }
  }

  private applyDrawEffect(count: number): void {
    const nextPlayerIndex = this.getNextPlayerIndex();
    const { drawnCards, newDeck, newDiscardPile } = drawCard(
      this.state.drawPile,
      this.state.discardPile,
      count
    );
    
    this.state.drawPile = newDeck;
    this.state.discardPile = newDiscardPile;
    
    if (drawnCards.length > 0) {
      const nextPlayer = this.state.players[nextPlayerIndex];
      if (nextPlayer) {
        nextPlayer.hand.push(...drawnCards);
        this.state.message = `${nextPlayer.name} drew ${drawnCards.length} cards!`;

        // In 2-player mode, after Draw Two/Draw Four, the same player goes again
        if (this.state.players.length === 2) {
          // Don't advance - same player's turn again
          return;
        }
        
        // Skip the next player's turn
        this.state.currentPlayerIndex = this.getNextPlayerIndex();
      }
    }
  }

  private getNextPlayerIndex(): number {
    const numPlayers = this.state.players.length;
    let nextIndex = (this.state.currentPlayerIndex + this.state.direction + numPlayers) % numPlayers;
    return nextIndex;
  }

  private advanceTurn(): void {
    if (this.state.waitingForColorChoice) return;
    
    const numPlayers = this.state.players.length;
    let nextIndex = (this.state.currentPlayerIndex + this.state.direction + numPlayers) % numPlayers;
    
    // In 2-player mode, after Skip/Reverse/DrawTwo effects, the same player goes again
    // This is handled in applyCardEffect already
    
    this.state.currentPlayerIndex = nextIndex;
    this.state.unoCalled = false;
    
    // Check if next player can play
    const nextPlayer = this.state.players[nextIndex];
    if (nextPlayer) {
      this.state.message = `${nextPlayer.name}'s turn!`;
    }
  }

  passTurn(playerId: string): { success: boolean; message: string } {
    if (!this.isPlayerTurn(playerId)) {
      return { success: false, message: 'Not your turn!' };
    }
    this.advanceTurn();
    return { success: true, message: 'Turn passed!' };
  }

  calculateScore(): { winner: string; scores: Record<string, number> } {
    const winner = this.state.players.find((p: Player) => p.id === this.state.winner);
    if (!winner) return { winner: '', scores: {} };

    let totalScore = 0;
    const scores: Record<string, number> = {};

    for (const player of this.state.players) {
      if (player.id !== this.state.winner) {
        const handScore = player.hand.reduce((sum: number, card: Card) => sum + getCardScore(card), 0);
        totalScore += handScore;
        scores[player.id] = handScore;
      }
    }

    scores[winner.id] = totalScore;
    return { winner: winner.id, scores };
  }
}