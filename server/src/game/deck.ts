import { Card, CardColor, CardType } from '../../../shared/types';

const COLORS: CardColor[] = ['Red', 'Blue', 'Green', 'Yellow'];
const NUMBER_VALUES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

let cardIdCounter = 0;

function generateId(): string {
  return `card_${Date.now()}_${cardIdCounter++}`;
}

export function createDeck(): Card[] {
  const deck: Card[] = [];

  // Number cards: 76 total (1 zero per color, 2 of each 1-9 per color)
  for (const color of COLORS) {
    // One Zero per color
    deck.push({
      id: generateId(),
      type: 'Number',
      color,
      value: 0
    });
    // Two of each 1-9 per color
    for (let v = 1; v <= 9; v++) {
      deck.push({ id: generateId(), type: 'Number', color, value: v });
      deck.push({ id: generateId(), type: 'Number', color, value: v });
    }
  }

  // Action cards: 2 per color
  const actionTypes: CardType[] = ['Skip', 'Reverse', 'Draw Two'];
  for (const color of COLORS) {
    for (const actionType of actionTypes) {
      deck.push({ id: generateId(), type: actionType, color, value: null });
      deck.push({ id: generateId(), type: actionType, color, value: null });
    }
  }

  // Wild cards: 4 Wild, 4 Wild Draw Four
  for (let i = 0; i < 4; i++) {
    deck.push({ id: generateId(), type: 'Wild', color: 'None', value: null });
  }
  for (let i = 0; i < 4; i++) {
    deck.push({ id: generateId(), type: 'Wild Draw Four', color: 'None', value: null });
  }

  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function dealCards(deck: Card[], count: number): { hands: Card[][]; remainingDeck: Card[] } {
  const hands: Card[][] = [];
  const remainingDeck = [...deck];
  
  for (let p = 0; p < count; p++) {
    const hand: Card[] = [];
    for (let i = 0; i < 7; i++) {
      const card = remainingDeck.pop();
      if (card) hand.push(card);
    }
    hands.push(hand);
  }
  
  return { hands, remainingDeck };
}

export function drawCard(deck: Card[], discardPile: Card[], count: number = 1): { drawnCards: Card[]; newDeck: Card[]; newDiscardPile: Card[] } {
  let sourceDeck = [...deck];
  let sourceDiscard = [...discardPile];
  const drawnCards: Card[] = [];

  for (let i = 0; i < count; i++) {
    if (sourceDeck.length === 0) {
      // Reshuffle discard pile (keep top card)
      if (sourceDiscard.length < 2) break; // Not enough cards
      
      const topCard = sourceDiscard.pop()!;
      const reshuffled = shuffleDeck(sourceDiscard);
      sourceDeck = reshuffled;
      sourceDiscard = [topCard];
    }
    
    const card = sourceDeck.pop();
    if (card) drawnCards.push(card);
  }

  return { drawnCards, newDeck: sourceDeck, newDiscardPile: sourceDiscard };
}

export function isCardPlayable(card: Card, currentColor: CardColor, currentCard: Card | null): boolean {
  if (!currentCard) return true;
  
  // Wild cards are always playable
  if (card.type === 'Wild' || card.type === 'Wild Draw Four') {
    // Wild Draw Four has extra condition: must not have current color
    if (card.type === 'Wild Draw Four') {
      // The condition check happens in the game logic
      return true; // Allow, game logic handles the condition
    }
    return true;
  }
  
  // Same color
  if (card.color === currentColor) return true;
  
  // Same number
  if (card.type === 'Number' && currentCard.type === 'Number' && card.value === currentCard.value) return true;
  
  // Same action type
  if (card.type === currentCard.type && card.type !== 'Number') return true;
  
  return false;
}

export function getPlayableCards(hand: Card[], currentColor: CardColor, currentCard: Card | null): Card[] {
  return hand.filter(card => isCardPlayable(card, currentColor, currentCard));
}

export function canPlayWildDrawFour(hand: Card[], currentColor: CardColor): boolean {
  // Player must have no card matching the current color
  if (currentColor === 'None') return true;
  return !hand.some(card => card.color === currentColor);
}

// Card score for final scoring
export function getCardScore(card: Card): number {
  if (card.type === 'Number' && card.value !== null) {
    return card.value;
  }
  const scores: Record<string, number> = {
    'Skip': 20,
    'Reverse': 20,
    'Draw Two': 20,
    'Wild': 50,
    'Wild Draw Four': 50
  };
  return scores[card.type] || 0;
}