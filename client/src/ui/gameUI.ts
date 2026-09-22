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
      private stateErrorMessage: string | null = null;
      private stateErrorTimer: number = 0;
      private messageDismissed: boolean = false;
      // Card horizontal scrolling
      private scrollOffset: number = 0;
      private maxVisibleCards: number = 7;

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

      private showError(message: string): void {
        // Flash error message on the canvas
        this.stateErrorMessage = message;
        this.stateErrorTimer = Date.now();
        setTimeout(() => { this.stateErrorMessage = null; }, 3000);
        this.render();
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
    
      // Calculate how many cards fit on screen
      const cardWithGap = this.cardWidth + 6;
      const availableWidth = this.screenWidth - 40 - 120; // account for scroll arrows + margins
      this.maxVisibleCards = Math.max(4, Math.floor(availableWidth / cardWithGap));
    }

  private registerSocketEvents(): void {
    socketClient.on('game:state_update', (state: any) => {
          this.gameState = state;
          this.myHand = state.yourHand || [];
          this.isMyTurn = state.currentPlayerIndex === this.findMyPlayerIndex();
          this.selectedCardIndex = -1;
          this.messageDismissed = false; // Reset on new state
          this.render();
        });

    socketClient.on('game:game_over', (winnerId: string, finalState: GameState) => {
      this.gameState = finalState;
      this.render();
      this.showGameOver(winnerId);
    });

    socketClient.on('game:error', (message: string) => {
          console.warn('Game error:', message);
          this.showError(message);
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
      const cardY = h - this.cardHeight - 60;
      const gap = 6;
      const cardWithGap = this.cardWidth + gap;

      // Determine if scrolling is needed
      const totalWidth = this.myHand.length * cardWithGap;
      const needsScroll = totalWidth > w - 20;

      // Clamp scroll offset
      if (needsScroll) {
        const maxOffset = Math.max(0, this.myHand.length - this.maxVisibleCards);
        if (this.scrollOffset > maxOffset) this.scrollOffset = maxOffset;
      } else {
        this.scrollOffset = 0;
      }

      // Draw left scroll arrow if needed
      if (needsScroll && this.scrollOffset > 0) {
        const arrowY = cardY + this.cardHeight / 2;
        ctx.fillStyle = 'rgba(255,215,0,0.8)';
        ctx.font = '20px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('◀', 18, arrowY);
      }

      // Draw each card (only visible ones based on scrollOffset)
      const startIdx = this.scrollOffset;
      const endIdx = Math.min(this.myHand.length, startIdx + this.maxVisibleCards + 1);
      const visibleCount = endIdx - startIdx;
      const visibleWidth = visibleCount * cardWithGap;
      const startX = Math.max(10, (w - visibleWidth) / 2);

      for (let i = startIdx; i < endIdx; i++) {
        const card = this.myHand[i];
        const cx = startX + (i - startIdx) * cardWithGap;
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

      // Draw right scroll arrow if needed
      if (needsScroll && this.scrollOffset < this.myHand.length - this.maxVisibleCards) {
        const arrowY = cardY + this.cardHeight / 2;
        ctx.fillStyle = 'rgba(255,215,0,0.8)';
        ctx.font = '20px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('▶', w - 18, arrowY);
      }
    }

  private drawGameInfo(): void {
        const ctx = this.ctx;
        const w = this.screenWidth;
    
        // Error message display (flashing)
        if (this.stateErrorMessage) {
          ctx.fillStyle = 'rgba(231, 76, 60, 0.9)';
          ctx.fillRect(w / 2 - 220, 20, 440, 35);
      
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '7px "Press Start 2P", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(this.stateErrorMessage, w / 2, 37);
        }
    
        // Message display (skip if dismissed by user)
        if (this.gameState?.message && !this.messageDismissed) {
          const msgY = this.stateErrorMessage ? 60 : 20;
          const msgW = 400;
          const msgH = 30;
          const msgX = w / 2 - msgW / 2;
        
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.fillRect(msgX, msgY, msgW, msgH);

          // Close button (×)
          const btnX = msgX + msgW - 24;
          const btnY = msgY + 2;
          const btnSize = 26;
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.fillRect(btnX, btnY, btnSize, btnSize);
          ctx.fillStyle = '#FFD700';
          ctx.font = '14px "Press Start 2P", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('×', btnX + btnSize / 2, btnY + btnSize / 2);
      
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '8px "Press Start 2P", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(this.gameState.message, w / 2, msgY + 15);
        }
      }

  private drawTurnInfo(): void {
        if (!this.gameState) return;
        const ctx = this.ctx;
        const w = this.screenWidth;
        const h = this.screenHeight;

        // Current turn indicator
        const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex];
        if (currentPlayer) {
          const isMe = currentPlayer.id === this.myPlayerId;
          ctx.fillStyle = isMe ? '#2ECC71' : '#E74C3C';
          ctx.font = '10px "Press Start 2P", monospace';
          ctx.textAlign = 'center';
      
          if (this.isMyTurn) {
            ctx.fillText('YOUR TURN!', w / 2, this.screenHeight - 40);
        
            // Draw button hints
            ctx.fillStyle = '#7F8C8D';
            ctx.font = '7px "Press Start 2P", monospace';
            ctx.fillText('[Click card to play] [D=draw] [U=UNO]', w / 2, this.screenHeight - 28);
          }
        }

        // ---- UNO call / catch buttons (always drawn when applicable) ----

        const btnW = 120;
        const btnH = 40;
        // Position buttons higher — at 30% down from top instead of center
        const btnY = h * 0.3;
        const btnX = w - btnW - 15;

        // UNO call button — appears when player has exactly 1 card (anytime, not just in penalty window)
        // Show if player has 1 card AND either penalty window is open for them OR it's their turn
        const shouldShowUno = this.myHand.length === 1 && (
          this.gameState.unoPenaltyWindow === this.myPlayerId || this.isMyTurn
        );
        if (shouldShowUno) {
          // Pulsing glow
          const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7;
          ctx.save();
          ctx.globalAlpha = pulse;
          ctx.fillStyle = '#E74C3C';
          ctx.shadowColor = '#E74C3C';
          ctx.shadowBlur = 15;
          ctx.fillRect(btnX - 4, btnY - 4, btnW + 8, btnH + 8);
          ctx.restore();

          ctx.fillStyle = '#E74C3C';
          ctx.fillRect(btnX, btnY, btnW, btnH);
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.strokeRect(btnX, btnY, btnW, btnH);
      
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '12px "Press Start 2P", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('UNO!', btnX + btnW / 2, btnY + btnH / 2);
        }

        // Catch UNO button — appears when opponent is in the penalty window
        if (this.gameState.unoPenaltyWindow && this.gameState.unoPenaltyWindow !== this.myPlayerId) {
          const catchX = 15;
          const catchY = h * 0.3;
      
          const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7;
          ctx.save();
          ctx.globalAlpha = pulse;
          ctx.fillStyle = '#F1C40F';
          ctx.shadowColor = '#F1C40F';
          ctx.shadowBlur = 15;
          ctx.fillRect(catchX - 4, catchY - 4, btnW + 8, btnH + 8);
          ctx.restore();

          ctx.fillStyle = '#F1C40F';
          ctx.fillRect(catchX, catchY, btnW, btnH);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2;
          ctx.strokeRect(catchX, catchY, btnW, btnH);
      
          ctx.fillStyle = '#000000';
          ctx.font = '9px "Press Start 2P", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('CATCH!', catchX + btnW / 2, catchY + btnH / 2);
        }
      }

  private isCardPlayable(card: Card): boolean {
      if (!this.gameState?.currentCard) return true;
      const currentColor = this.gameState.currentColor;
      const currentCard = this.gameState.currentCard;
    
      // Wild is always playable
      if (card.type === 'Wild') return true;
    
      // Wild Draw Four: only playable when player has no card matching the current color
      if (card.type === 'Wild Draw Four') {
        if (currentColor === 'None') return true;
        return !this.myHand.some(c => c.color === currentColor);
      }
    
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
          if (!this.gameState) return;
    
          const rect = this.canvas.getBoundingClientRect();
          const clickX = event.clientX - rect.left;
          const clickY = event.clientY - rect.top;
          const h = this.screenHeight;
          const w = this.screenWidth;
          const cardY = h - this.cardHeight - 60;
          const gap = 6;
          const cardWithGap = this.cardWidth + gap;

          // Check if click is on the message close button
          if (this.gameState?.message && !this.messageDismissed) {
            const msgY = this.stateErrorMessage ? 60 : 20;
            const msgW = 400;
            const msgX = w / 2 - msgW / 2;
            const btnX = msgX + msgW - 24;
            const btnY = msgY + 2;
            const btnSize = 26;
            if (clickX >= btnX && clickX <= btnX + btnSize &&
                clickY >= btnY && clickY <= btnY + btnSize) {
              this.messageDismissed = true;
              this.render();
              return;
            }
          }

          // Check for scroll arrow clicks
          const totalWidth = this.myHand.length * cardWithGap;
          const needsScroll = totalWidth > w - 20;
          if (needsScroll) {
            // Left scroll arrow
            if (this.scrollOffset > 0 && clickX >= 5 && clickX <= 30 && 
                clickY >= cardY && clickY <= cardY + this.cardHeight) {
              this.scrollOffset = Math.max(0, this.scrollOffset - 1);
              this.render();
              return;
            }
            // Right scroll arrow
            if (this.scrollOffset < this.myHand.length - this.maxVisibleCards &&
                clickX >= w - 30 && clickX <= w - 5 &&
                clickY >= cardY && clickY <= cardY + this.cardHeight) {
              this.scrollOffset = Math.min(this.myHand.length - this.maxVisibleCards, this.scrollOffset + 1);
              this.render();
              return;
            }
          }

          // Check if click is on the UNO button
          const btnW = 120;
          const btnH = 40;
          const btnY = h * 0.3;
          const shouldShowUno = this.myHand.length === 1 && (
            this.gameState.unoPenaltyWindow === this.myPlayerId || this.isMyTurn
          );
          if (shouldShowUno) {
            const btnX = w - btnW - 15;
            if (clickX >= btnX && clickX <= btnX + btnW &&
                clickY >= btnY && clickY <= btnY + btnH) {
              socketClient.callUno();
              return;
            }
          }

          // Check if click is on the Catch button
          if (this.gameState.unoPenaltyWindow && this.gameState.unoPenaltyWindow !== this.myPlayerId) {
            const catchX = 15;
            const catchY = h * 0.3;
            if (clickX >= catchX && clickX <= catchX + btnW &&
                clickY >= catchY && clickY <= catchY + btnH) {
              socketClient.catchUno();
              return;
            }
          }

          if (!this.isMyTurn) return;

        // Check if click is on player's hand (accounting for scrollOffset)
      const startIdx = this.scrollOffset;
      const endIdx = Math.min(this.myHand.length, startIdx + this.maxVisibleCards + 1);
      const visibleCount = endIdx - startIdx;
      const visibleWidth = visibleCount * cardWithGap;
      const startX = Math.max(10, (w - visibleWidth) / 2);
    
          for (let i = startIdx; i < endIdx; i++) {
        const cx = startX + (i - startIdx) * cardWithGap;
        const cy = i === this.selectedCardIndex ? cardY - 15 : cardY;
      
        if (clickX >= cx && clickX <= cx + this.cardWidth &&
            clickY >= cy && clickY <= cy + this.cardHeight) {
        
          // Play the card immediately on click (single-click toggle)
          const card = this.myHand[i];
          if (card.type === 'Wild' || card.type === 'Wild Draw Four') {
            // Show color picker
            this.showColorPicker(card.id);
          } else {
            socketClient.playCard(card.id);
          }
          this.selectedCardIndex = -1;
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
        case 'arrowleft':
          if (this.scrollOffset > 0) {
            this.scrollOffset--;
            this.render();
          }
          break;
        case 'arrowright':
          const maxOffset = Math.max(0, this.myHand.length - this.maxVisibleCards);
          if (this.scrollOffset < maxOffset) {
            this.scrollOffset++;
            this.render();
          }
          break;
      }
    }

  private showColorPicker(cardId: string): void {
      const colors: CardColor[] = ['Red', 'Blue', 'Green', 'Yellow'];
      const modal = document.createElement('div');
      modal.className = 'color-picker-modal';
      modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.8); display: flex; align-items: center;
        justify-content: center; z-index: 1000;
      `;

      const container = document.createElement('div');
      container.style.cssText = `
        background: #1a1a2e; padding: 30px; border: 3px solid #FFD700;
        border-radius: 10px; text-align: center;
      `;

      const title = document.createElement('div');
      title.textContent = 'CHOOSE COLOR';
      title.style.cssText = 'color: #FFD700; font: 12px "Press Start 2P", monospace; margin-bottom: 20px;';
      container.appendChild(title);

      const colorButtons = document.createElement('div');
      colorButtons.style.cssText = 'display: flex; gap: 15px; justify-content: center;';

      for (const color of colors) {
        const btn = document.createElement('button');
        btn.style.cssText = `
          width: 60px; height: 60px; border-radius: 50%; border: 3px solid white;
          cursor: pointer; background: ${this.getColorHex(color)};
        `;
        btn.addEventListener('click', () => {
          document.body.removeChild(modal);
          socketClient.playCard(cardId, color);
        });
        colorButtons.appendChild(btn);
      }

      container.appendChild(colorButtons);
      modal.appendChild(container);
      document.body.appendChild(modal);
    }

    stop(): void {
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
        this.animationFrame = 0;
      }
    }

    private showGameOver(winnerId: string): void {
      const isWinner = winnerId === this.myPlayerId;
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.85); display: flex; align-items: center;
        justify-content: center; z-index: 1000;
      `;

      const container = document.createElement('div');
      container.style.cssText = `
        background: #1a1a2e; padding: 40px; border: 3px solid #FFD700;
        border-radius: 10px; text-align: center;
      `;

      const title = document.createElement('div');
      title.textContent = isWinner ? 'YOU WIN!' : 'GAME OVER';
      title.style.cssText = `
        color: ${isWinner ? '#2ECC71' : '#E74C3C'};
        font: 20px "Press Start 2P", monospace; margin-bottom: 20px;
      `;
      container.appendChild(title);

      const replayBtn = document.createElement('button');
      replayBtn.textContent = 'BACK TO LOBBY';
      replayBtn.style.cssText = `
        padding: 10px 20px; font: 10px "Press Start 2P", monospace;
        background: #FFD700; color: #000; border: none; border-radius: 5px;
        cursor: pointer; margin-top: 10px;
      `;
      replayBtn.addEventListener('click', () => {
              document.body.removeChild(modal);
              this.stop();
              socketClient.returnToLobby();
            });
      container.appendChild(replayBtn);

      modal.appendChild(container);
      document.body.appendChild(modal);
    }
  }