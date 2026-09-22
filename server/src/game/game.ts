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

    // Create initial discard pile (reveal top card of draw pile)
            let firstCard: Card | undefined;
            let wildRetries = 0;
    
            // If we draw a Wild or Wild Draw Four as first card, return it to deck and retry
            // (per official UNO rules, wild cards cannot start the game)
            do {
              firstCard = deck.pop();
              if (firstCard && (firstCard.type === 'Wild' || firstCard.type === 'Wild Draw Four')) {
                // Wild/Wild Draw Four cannot be the initial discard; shuffle it back
                deck = shuffleDeck([...deck, firstCard]);
                wildRetries++;
                firstCard = undefined;
                if (wildRetries > 5) break; // Safety
              }
            } while (!firstCard);
    
        if (!firstCard) {
          firstCard = deck.pop() || { id: 'fallback', type: 'Number', color: 'Red', value: 0 };
        }

        const discardPile: Card[] = [firstCard];
        let initialColor: CardColor = firstCard.color as CardColor;
        let startingPlayerIndex = 0; // Player to the left of dealer (index 0)
        let initialDirection: 1 | -1 = 1;
        let initialMessage = 'Game started!';

        // Apply first card effects
        switch (firstCard.type) {
          case 'Skip': {
            // Skip the first player (player to left of dealer)
            startingPlayerIndex = 1 % playerNames.length;
            initialMessage = 'First card is Skip! First player skipped.';
            break;
          }
          case 'Reverse': {
            // Reverse direction, dealer starts
            initialDirection = -1;
            startingPlayerIndex = 0; // Dealer (index 0) starts
            initialMessage = 'First card is Reverse! Direction reversed, dealer starts.';
            break;
          }
          case 'Draw Two': {
                  // First player draws 2 and loses turn
                  const firstPlayerHand = hands[0];
                  for (let i = 0; i < 2; i++) {
                    const drawn = deck.pop();
                    if (drawn) firstPlayerHand.push(drawn);
                  }
                  // Next player (index 1) starts
                  startingPlayerIndex = 1 % playerNames.length;
                  initialMessage = 'First card is Draw Two! First player drew 2 and is skipped.';
                  break;
                }
          case 'Wild': {
            // Player to left of dealer chooses starting color
            initialColor = 'None' as CardColor;
            initialMessage = 'First card is Wild! Choose a starting color.';
            // We need to prompt for color choice. Set waitingForColorChoice.
            // Since constructor can't wait for input, set initial color to None
            // and the first player will need to choose via the UI
            break;
          }
          case 'Wild Draw Four': {
            // Should not happen due to the retry loop above, but handle as fallback
            initialMessage = 'First card is Wild Draw Four! (Should have been reshuffled)';
            break;
          }
        }

    this.state = {
          players: playerNames.map((p: { id: string; name: string }, i: number) => ({
            id: p.id,
            name: p.name,
            hand: hands[i],
            isHuman: true,
            isReady: true
          })),
          currentPlayerIndex: startingPlayerIndex,
          direction: initialDirection,
          drawPile: deck,
          discardPile: discardPile,
          currentColor: initialColor,
          currentCard: firstCard,
          winner: null,
          gameStarted: true,
          unoCalled: false,
                unoPenaltyWindow: null,
                drawnCardId: null,
                waitingForColorChoice: firstCard.type === 'Wild',
          pendingDraw: 0,
          message: initialMessage
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

      // If a different player is acting and there's a stale penalty window, close it
      // (they chose not to catch, so the offender got away with it)
      if (this.state.unoPenaltyWindow && this.state.unoPenaltyWindow !== playerId) {
        this.state.unoPenaltyWindow = null;
      }

      const cardIndex = player.hand.findIndex((c: Card) => c.id === cardId);
    if (cardIndex === -1) return { success: false, message: 'Card not in hand!' };

    const card = player.hand[cardIndex];
        const currentColor = this.state.currentColor;
        const currentCard = this.state.currentCard;

        // After drawing this turn, the player can only play the drawn card
        if (this.state.drawnCardId && card.id !== this.state.drawnCardId) {
          return { success: false, message: 'You can only play the card you just drew!' };
        }

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
            // Clear drawn card restriction since the wild card was played
            this.state.drawnCardId = null;
            return { success: true, message: 'Played wild card, choose color!' };
          }
        } else {
          this.state.currentColor = card.color;
        }

        // Clear drawn card restriction since the card was successfully played
        this.state.drawnCardId = null;

    // Apply card effects
        this.applyCardEffect(card);

        // Check for winner
        if (player.hand.length === 0) {
          this.state.winner = playerId;
          this.state.unoPenaltyWindow = null;
          this.state.message = `${player.name} wins!`;
          return { success: true, message: 'You win!' };
        }

        // Track UNO: if player has 1 card, they should call UNO
        // Set penalty window if they haven't called it yet
        if (player.hand.length === 1 && !this.state.unoCalled) {
          this.state.unoPenaltyWindow = playerId;
        } else if (player.hand.length === 1 && this.state.unoCalled) {
          // Already called UNO, all good
          this.state.unoPenaltyWindow = null;
        } else {
          // Player has more than 1 card, no UNO concern
          this.state.unoPenaltyWindow = null;
        }

    // Action cards in 2-player: the same player goes again
        const ACTION_CARDS_TWO_PLAYER: CardType[] = ['Skip', 'Reverse', 'Draw Two', 'Wild Draw Four'];
        const isTwoPlayerActionCard = this.state.players.length === 2 && ACTION_CARDS_TWO_PLAYER.includes(card.type);
        const skipAdvance = isTwoPlayerActionCard && !this.state.waitingForColorChoice;

        // Move to next turn if not waiting for color and not a 2-player action card effect
        if (!this.state.waitingForColorChoice && !skipAdvance) {
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

      // If a different player is acting and there's a stale penalty window, close it
      if (this.state.unoPenaltyWindow && this.state.unoPenaltyWindow !== playerId) {
        this.state.unoPenaltyWindow = null;
      }

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
          this.state.drawnCardId = drawnCard.id;

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

        this.state.drawnCardId = null;
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
      const playedWildDrawFour = lastCard && lastCard.type === 'Wild Draw Four';
      if (playedWildDrawFour) {
        this.applyDrawEffect(4);
      }

      // Check for winner: the player who played the wild card (still their turn)
            // may have emptied their hand
            const player = this.state.players.find((p: Player) => p.id === playerId);
            if (player && player.hand.length === 0) {
              this.state.winner = playerId;
              this.state.message = `${player.name} wins!`;
              return { success: true, message: 'You win!' };
            }

            // In 2-player mode with Wild Draw Four, the same player goes again
            // (next player drew 4 and lost their turn)
            const isTwoPlayerWildDrawFour = this.state.players.length === 2 && playedWildDrawFour;
            if (!isTwoPlayerWildDrawFour) {
              this.advanceTurn();
            }
            return { success: true, message: `Color changed to ${color}!` };
    }

  callUno(playerId: string): { success: boolean; message: string } {
      const player = this.state.players.find((p: Player) => p.id === playerId);
      if (!player) return { success: false, message: 'Player not found!' };
    
      if (player.hand.length === 1) {
        this.state.unoCalled = true;
        this.state.unoPenaltyWindow = null; // Closed safely
        this.state.message = `${player.name} called UNO!`;
        return { success: true, message: 'UNO called!' };
      }
    
      if (player.hand.length === 0) {
        return { success: false, message: 'You already won!' };
      }
    
      return { success: false, message: 'You can only call UNO with 1 card!' };
    }

    catchUno(catcherId: string): { success: boolean; message: string } {
      // Only the player who hasn't called UNO (in the penalty window) can be caught
      if (!this.state.unoPenaltyWindow) {
        return { success: false, message: 'No one to catch!' };
      }

      const offenderId = this.state.unoPenaltyWindow;
      const offender = this.state.players.find((p: Player) => p.id === offenderId);
      if (!offender) return { success: false, message: 'Offender not found!' };

      // Draw 2 cards as penalty
      const { drawnCards, newDeck, newDiscardPile } = drawCard(
        this.state.drawPile,
        this.state.discardPile,
        2
      );
      this.state.drawPile = newDeck;
      this.state.discardPile = newDiscardPile;

      if (drawnCards.length > 0) {
        offender.hand.push(...drawnCards);
      }

      const catcher = this.state.players.find((p: Player) => p.id === catcherId);
      this.state.unoPenaltyWindow = null;
      this.state.unoCalled = false;
      this.state.message = `${offender.name} forgot to call UNO and drew ${drawnCards.length} cards!`;
    
      return { success: true, message: `Caught! ${offender.name} draws 2 cards.` };
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
        // Apply draw effect when color was chosen inline (via playCard with chosenColor).
        // When the player chooses color later via chooseColor(), the draw effect is handled there
        // and `waitingForColorChoice` remains true here, so we skip it to avoid double-drawing.
        if (!this.state.waitingForColorChoice) {
          this.applyDrawEffect(4);
        }
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
          // NOTE: unoPenaltyWindow is NOT cleared here intentionally.
          // The penalty window persists so the NEXT player can CATCH the offender.
          // It gets cleared in playCard/drawCardAction when the next player acts
          // (meaning they chose not to catch / missed the window).
          this.state.drawnCardId = null; // Clear drawn-card restriction
    
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