import { Card, CardColor, GameState, Player } from '../../../shared/types';
import { CardRenderer } from '../graphics/cardRenderer';
import { socketClient } from '../game/socketClient';

// ============================================================
// GAME UI - Canvas-based retro game board
// ============================================================

export class GameUI {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private renderer: CardRenderer;
  private gameState: GameState | null = null;
  private myHand: Card[] = [];
  private myPlayerId: string = '';
  private selectedCardIndex: number = -1;
  private isMyTurn: boolean = false;
  private screenWidth: number = 800;
  private screenHeight: number = 600;
  private cardWidth: number = 70;
  private cardHeight: number = 100;
  private animationFrame: number = 0;

  constructor(canvasId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.renderer = new CardRenderer(this.ctx);
    
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    
    // Setup click handler
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    
    // Setup keyboard handler
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    
    // Register socket events
    this.registerSocketEvents();
  }

  private resizeCanvas(): void {
    const container = this.canvas.parentElement!;
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;
    this.screenWidth = this.canvas.width;
    this.screenHeight = this.canvas.height;
    
    // Scale card sizes based on screen
    this.cardWidth = Math.min(80, this.screenWidth / 10);
    this.cardHeight = this.cardWidth * 1.4;
  }

  private registerSocketEvents(): void {
    socketClient.on('game:state_update', (state: any) => {
      this.gameState = state;
      this.myHand = state.yourHand || [];
      this.isMyTurn = state.currentPlayerIndex === this.findMyPlayerIndex();
      this.selectedCardIndex = -1;
      this.render();
    });

    socketClient.on('game:game_over', (winnerId: string, finalState: GameState) => {
      this.gameState = finalState;
      this.render();
      this.showGameOver(winnerId);
    });

    socketClient.on('game:error', (message: string) => {
      console.warn('Game error:', message);
    });
  }

  private findMyPlayerIndex(): number {
    if (!this.gameState) return -1;
    return this.gameState.players.findIndex(p => p.id === this.myPlayerId);
  }

  setPlayerId(id: string): void {
    this.myPlayerId = id;
  }

  updateGameState(state: GameState, hand: Card[]): void {
    this.gameState = state;
    this.myHand = hand;
    this.isMyTurn = state.currentPlayerIndex === this.findMyPlayerIndex();
    this.render();
  }

  start(): void {
    this.render();
    this.gameLoop();
  }

  private gameLoop(): void {
    this.render();
    this.animationFrame = requestAnimationFrame(() => this.gameLoop());
  }

  render(): void {
    const ctx = this.ctx;
    const w = this.screenWidth;
    const h = this.screenHeight;

    // Clear canvas
    ctx.clearRect(0, 0, w, h);

    // Background - retro gradient
    this.drawBackground();

    if (!this.gameState) return;

    // Draw center area (discard + draw piles)
    this.drawCenterArea();

    // Draw opponent info (top area)
    this.drawOpponentArea();

    // Draw player hand (bottom area)
    this.drawPlayerHand();

    // Draw game info
    this.drawGameInfo();

    // Draw turn indicator
    this.drawTurnInfo();
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    const w = this.screenWidth;
    const h = this.screenHeight;

    // Dark retro background with gradient
    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
    grad.addColorStop(0, '#1a3a5c');
    grad.addColorStop(0.5, '#0f2341');
    grad.addColorStop(1, '#0a1628');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Decorative pixel grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Retro border decorations
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, w - 20, h - 20);

    // Corner accents
    const cornerSize = 20;
    const corners = [
      [10, 10], [w - 10, 10], [10, h - 10], [w - 10, h - 10]
    ];
    for (const [cx, cy] of corners) {
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, cornerSize, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private drawCenterArea(): void {
    if (!this.gameState) return;
    const ctx = this.ctx;
    const centerX = this.screenWidth / 2;
    const centerY = this.screenHeight / 2;

    // Discard pile (right side of center)
    const discardX = centerX + 60;
    const discardY = centerY;
    
    // Glow effect around discard
    const grad = ctx.createRadialGradient(discardX, discardY, 0, discardX, discardY, 80);
    const currentColor = this.gameState.currentColor;
    const glowColor = currentColor === 'None' ? '#FFFFFF' : 
      currentColor === 'Red' ? 'rgba(231,76,60,0.3)' :
      currentColor === 'Blue' ? 'rgba(52,152,219,0.3)' :
      currentColor === 'Green' ? 'rgba(46,204,113,0.3)' :
      'rgba(241,196,15,0.3)';
    grad.addColorStop(0, glowColor);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(discardX - 80, discardY - 80, 160, 160);
    
    this.renderer.drawDiscardPile(
      discardX, discardY,
      this.gameState.currentCard,
      this.cardWidth, this.cardHeight
    );

    // Draw pile (left side of center)
    const drawX = centerX - 60;
    this.renderer.drawDrawPile(
      drawX, centerY,
      this.gameState.drawPile.length,
      this.cardWidth, this.cardHeight
    );

    // Current color indicator
    if (this.gameState.currentColor && this.gameState.currentColor !== 'None') {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('COLOR', discardX, discardY + this.cardHeight * 0.8 + 30);
      
      const colorDotX = discardX;
      const colorDotY = discardY + this.cardHeight * 0.8 + 48;
      ctx.beginPath();
      ctx.arc(colorDotX, colorDotY, 8, 0, Math.PI * 2);
      ctx.fillStyle = this.getColorHex(this.gameState.currentColor);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Direction indicator
    ctx.fillStyle = '#FFD700';
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    const dirSymbol = this.gameState.direction === 1 ? '→' : '←';
    ctx.fillText(dirSymbol, centerX, centerY + 60);
  }

  private drawOpponentArea(): void {
    if (!this.gameState) return;
    const ctx = this.ctx;
    const w = this.screenWidth;
    const currentPlayerIndex = this.gameState.currentPlayerIndex;

    // Find opponent
    const opponent = this.gameState.players.find(p => p.id !== this.myPlayerId);
    if (!opponent) return;

    const oppIndex = this.gameState.players.findIndex(p => p.id === opponent.id);
    const isOpponentTurn = oppIndex === currentPlayerIndex;

    // Opponent card count display (top)
    const oppCardWidth = 35;
    const oppCardHeight = 50;
    const startX = w / 2 - (opponent.hand.length * (oppCardWidth + 4)) / 2;
    
    for (let i = 0; i < opponent.hand.length; i++) {
      const ox = startX + i * (oppCardWidth + 4);
      const oy = 60;
      this.renderer.drawBackOfCard(ox, oy, oppCardWidth, oppCardHeight);
    }

    // Opponent name
    ctx.fillStyle = isOpponentTurn ? '#FFD700' : '#BDC3C7';
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(opponent.name.toUpperCase(), w / 2, 45);
    
    ctx.fillStyle = '#7F8C8D';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillText(`Cards: ${opponent.hand.length}`, w / 2, 55);
    
    if (isOpponentTurn) {
      ctx.fillStyle = '#FFD700';
      ctx.font = '7px "Press Start 2P", monospace';
      ctx.fillText('▼ TURN ▼', w / 2, 130 + oppCardHeight + 10);
    }
  }

  private drawPlayerHand(): void {
    if (!this.gameState) return;
    const ctx = this.ctx;
    const h = this.screenHeight;
    const w = this.screenWidth;

    // Calculate card layout
    const totalCardsWidth = this.myHand.length * (this.cardWidth + 6);
    const startX = Math.max(10, (w - totalCardsWidth) / 2);
    const cardY = h - this.cardHeight - 60;

    // Draw each card
    for (let i = 0; i < this.myHand.length; i++) {
      const card = this.myHand[i];
      const cx = startX + i * (this.cardWidth + 6);
      const isSelected = i === this.selectedCardIndex;
      
      // Check if card is playable
      const isPlayable = this.isCardPlayable(card);
      
      if (isPlayable && this.isMyTurn) {
        // Highlight playable cards with subtle glow
        ctx.shadowColor = this.getColorHex(card.color === 'None' ? 'Yellow' : card.color);
        ctx.shadowBlur = 8;
      }

      this.renderer.drawCardBackground(card, {
        x: cx,
        y: isSelected ? cardY - 15 : cardY,
        width: this.cardWidth,
        height: this.cardHeight,
        selected: isSelected
      });
      
      this.renderer.drawCardContent(card, {
        x: cx,
        y: isSelected ? cardY - 15 : cardY,
        width: this.cardWidth,
        height: this.cardHeight,
        selected: isSelected
      });

      ctx.shadowBlur = 0;
      
      // Show playable indicator
      if (isPlayable && this.isMyTurn) {
        ctx.fillStyle = '#2ECC71';
        ctx.font = '6px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('✓', cx + this.cardWidth / 2, cardY - 5);
      }
    }
  }

  private drawGameInfo(): void {
    const ctx = this.ctx;
    const w = this.screenWidth;
    
    // Message display
    if (this.gameState?.message) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(w / 2 - 200, 20, 400, 30);
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.gameState.message, w / 2, 35);
    }
  }

  private drawTurnInfo(): void {
    if (!this.gameState) return;
    const ctx = this.ctx;
    const w = this.screenWidth;

    // Current turn indicator
    const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex];
    if (currentPlayer) {
      const isMe = currentPlayer.id === this.myPlayerId;
      ctx.fillStyle = isMe ? '#2ECC71' : '#E74C3C';
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      
      if (this.isMyTurn) {
        ctx.fillText('YOUR TURN!', w / 2, this.screenHeight - 20);
        
        // Draw button hints
        ctx.fillStyle = '#7F8C8D';
        ctx.font = '7px "Press Start 2P", monospace';
        ctx.fillText('[Click card to play] [Press D to draw]', w / 2, this.screenHeight - 8);
      }
    }
  }

  private isCardPlayable(card: Card): boolean {
    if (!this.gameState?.currentCard) return true;
    const currentColor = this.gameState.currentColor;
    const currentCard = this.gameState.currentCard;
    
    // Wild cards are always playable (but Wild Draw Four has restrictions)
    if (card.type === 'Wild') return true;
    if (card.type === 'Wild Draw Four') return true; // Allow, server validates
    
    // Same color
    if (card.color === currentColor) return true;
    
    // Same number
    if (card.type === 'Number' && currentCard.type === 'Number' && card.value === currentCard.value) return true;
    
    // Same action
    if (card.type !== 'Number' && card.type === currentCard.type) return true;
    
    return false;
  }

  private getColorHex(color: CardColor): string {
    switch (color) {
      case 'Red': return '#E74C3C';
      case 'Blue': return '#3498DB';
      case 'Green': return '#2ECC71';
      case 'Yellow': return '#F1C40F';
      default: return '#FFFFFF';
    }
  }

  handleClick(event: MouseEvent): void {
    if (!this.gameState || !this.isMyTurn) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    const h = this.screenHeight;
    const w = this.screenWidth;

    // Check if click is on player's hand
    const totalCardsWidth = this.myHand.length * (this.cardWidth + 6);
    const startX = Math.max(10, (w - totalCardsWidth) / 2);
    const cardY = h - this.cardHeight - 60;
    
    for (let i = 0; i < this.myHand.length; i++) {
      const cx = startX + i * (this.cardWidth + 6);
      const cy = i === this.selectedCardIndex ? cardY - 15 : cardY;
      
      if (clickX >= cx && clickX <= cx + this.cardWidth &&
          clickY >= cy && clickY <= cy + this.cardHeight) {
        
        if (this.selectedCardIndex === i) {
          // Play the card
          const card = this.myHand[i];
          if (card.type === 'Wild' || card.type === 'Wild Draw Four') {
            // Show color picker
            this.showColorPicker(card.id);
          } else {
            socketClient.playCard(card.id);
          }
          this.selectedCardIndex = -1;
        } else {
          this.selectedCardIndex = i;
        }
        this.render();
        break;
      }
    }
  }

  handleKeyDown(event: KeyboardEvent): void {
    if (!this.gameState) return;
    
    switch (event.key.toLowerCase()) {
      case 'd':
        if (this.isMyTurn) {
          socketClient.drawCard();
        }
        break;
      case 'u':
        socketClient.callUno();
        break;
      case 'escape':
        this.selectedCardIndex = -1;
        this.render();
        break;
    }
  }

  private showColorPicker(cardId: string): void {
    const modal = documen