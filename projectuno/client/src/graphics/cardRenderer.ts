import { Card, CardColor } from '../../../shared/types';

// ============================================================
// RETRO PIXEL-ART CARD RENDERER
// Inspired by retro games like Super Mario & Aladdin
// ============================================================

export interface CardRenderConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  selected?: boolean;
}

const COLORS: Record<string, { fill: string; dark: string; light: string; pixel: string }> = {
  Red: { fill: '#E74C3C', dark: '#C0392B', light: '#FF6B6B', pixel: '#A93226' },
  Blue: { fill: '#3498DB', dark: '#2980B9', light: '#5DADE2', pixel: '#1A5276' },
  Green: { fill: '#2ECC71', dark: '#27AE60', light: '#58D68D', pixel: '#1E8449' },
  Yellow: { fill: '#F1C40F', dark: '#F39C12', light: '#F7DC6F', pixel: '#D4AC0D' },
  None: { fill: '#2C3E50', dark: '#1A252F', light: '#5D6D7E', pixel: '#17202A' }
};

export class CardRenderer {
  private ctx: CanvasRenderingContext2D;
  private pixelSize: number;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.pixelSize = 2;
  }

  drawCardBackground(card: Card, config: CardRenderConfig): void {
    const { x, y, width, height, selected } = config;
    const ctx = this.ctx;
    const color = card.color === 'None' ? COLORS['None'] : COLORS[card.color];
    const isWild = card.type === 'Wild' || card.type === 'Wild Draw Four';

    // Card shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(x + 4, y + 4, width, height);

    // Card background
    const bgColor = isWild ? '#2C3E50' : color.fill;
    ctx.fillStyle = bgColor;
    ctx.fillRect(x, y, width, height);
    
    // Card border (pixel effect)
    ctx.strokeStyle = isWild ? '#1A252F' : color.dark;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);

    // Inner border highlight
    ctx.strokeStyle = isWild ? '#5D6D7E' : color.light;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 3, y + 3, width - 6, height - 6);

    // Selection glow
    if (selected) {
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 15;
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, width, height);
      ctx.shadowBlur = 0;
    }
  }

  drawCardContent(card: Card, config: CardRenderConfig): void {
    const { x, y, width, height } = config;
    const ctx = this.ctx;
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const isWild = card.type === 'Wild' || card.type === 'Wild Draw Four';
    const color = isWild ? COLORS['None'] : COLORS[card.color];

    // If wild card, draw rainbow pattern
    if (isWild) {
      this.drawRainbowPattern(x, y, width, height);
    }

    // Draw card type icon/symbol
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${Math.floor(width * 0.35)}px 'Press Start 2P', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (card.type === 'Number' && card.value !== null) {
      this.drawPixelNumber(centerX, centerY, card.value, width, color);
    } else {
      this.drawActionSymbol(centerX, centerY, card.type, width, color);
    }

    // Top-left small indicator
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${Math.floor(width * 0.15)}px 'Press Start 2P', monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    const shortText = this.getShortText(card);
    ctx.fillText(shortText, x + 8, y + 8);
  }

  private drawPixelNumber(cx: number, cy: number, value: number, cardWidth: number, color: { fill: string; light: string }): void {
    const ctx = this.ctx;
    const size = Math.floor(cardWidth * 0.4);
    const px = this.pixelSize;
    
    // Draw number as pixel art
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${size}px 'Press Start 2P', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(value), cx, cy);

    // Add colored circle behind number for number cards
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fill();
  }

  private drawActionSymbol(cx: number, cy: number, type: string, cardWidth: number, color: { fill: string; light: string }): void {
    const ctx = this.ctx;
    const size = Math.floor(cardWidth * 0.35);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;

    switch (type) {
      case 'Skip': {
        // Draw a circle with a line through it (pixel-style)
        ctx.beginPath();
        ctx.arc(cx, cy, size * 0.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.font = `${size}px 'Press Start 2P', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('X', cx, cy);
        break;
      }
      case 'Reverse': {
        // Draw two arrows in a circle
        ctx.beginPath();
        ctx.arc(cx, cy, size * 0.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.font = `${size * 0.7}px 'Press Start 2P', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('<>', cx, cy);
        break;
      }
      case 'Draw Two': {
        ctx.font = `${size * 0.7}px 'Press Start 2P', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+2', cx, cy);
        break;
      }
      case 'Wild': {
        ctx.font = `${size * 0.6}px 'Press Start 2P', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('W', cx, cy);
        break;
      }
      case 'Wild Draw Four': {
        ctx.font = `${size * 0.6}px 'Press Start 2P', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+4', cx, cy);
        break;
      }
    }
  }

  private drawRainbowPattern(x: number, y: number, width: number, height: number): void {
    const ctx = this.ctx;
    const colors = [COLORS.Red, COLORS.Blue, COLORS.Green, COLORS.Yellow];
    const stripeHeight = height / 4;

    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = colors[i].fill;
      ctx.globalAlpha = 0.3;
      ctx.fillRect(x + 5, y + 5 + i * stripeHeight, width - 10, stripeHeight);
    }
    ctx.globalAlpha = 1.0;
  }

  drawBackOfCard(x: number, y: number, width: number, height: number): void {
    const ctx = this.ctx;
    
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(x + 3, y + 3, width, height);

    // Card back pattern - retro style
    ctx.fillStyle = '#1A5276';
    ctx.fillRect(x, y, width, height);
    
    // Border
    ctx.strokeStyle = '#2980B9';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
    
    // Diamond pattern
    ctx.fillStyle = '#3498DB';
    ctx.beginPath();
    ctx.moveTo(x + width / 2, y + 5);
    ctx.lineTo(x + width - 5, y + height / 2);
    ctx.lineTo(x + width / 2, y + height - 5);
    ctx.lineTo(x + 5, y + height / 2);
    ctx.closePath();
    ctx.fill();

    // UNO text on back
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${Math.floor(width * 0.2)}px 'Press Start 2P', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('UNO', x + width / 2, y + height / 2);

    // Corner decorations
    const dotSize = 3;
    for (let dx = 8; dx < width - 6; dx += 12) {
      for (let dy = 8; dy < height - 6; dy += 12) {
        if (dx < 20 || dx > width - 20 || dy < 20 || dy > height - 20) {
          ctx.fillStyle = '#2980B9';
          ctx.fillRect(x + dx, y + dy, dotSize, dotSize);
        }
      }
    }
  }

  private getShortText(card: Card): string {
    if (card.type === 'Number' && card.value !== null) return String(card.value);
    switch (card.type) {
      case 'Skip': return 'S';
      case 'Reverse': return 'R';
      case 'Draw Two': return '+2';
      case 'Wild': return 'W';
      case 'Wild Draw Four': return '+4';
      default: return '';
    }
  }

  drawTurnIndicator(x: number, y: number, playerName: string, isCurrentPlayer: boolean): void {
    const ctx = this.ctx;
    ctx.fillStyle = isCurrentPlayer ? '#FFD700' : '#7F8C8D';
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Background
    ctx.fillStyle = isCurrentPlayer ? 'rgba(255,215,0,0.2)' : 'rgba(127,140,141,0.2)';
    ctx.fillRect(x - 80, y - 10, 160, 20);
    
    ctx.fillStyle = isCurrentPlayer ? '#FFD700' : '#BDC3C7';
    ctx.fillText(playerName, x, y);
  }

  drawDiscardPile(x: number, y: number, card: Card | null, cardWidth: number, cardHeight: number): void {
    const ctx = this.ctx;
    
    // Discard pile base
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(x, y, cardWidth * 0.7, 0, Math.PI * 2);
    ctx.fill();

    if (card) {
      // Draw the top card slightly offset for depth
      this.drawCardBackground(card, { x: x - cardWidth/2, y: y - cardHeight/2, width: cardWidth, height: cardHeight });
      this.drawCardContent(card, { x: x - cardWidth/2, y: y - cardHeight/2, width: cardWidth, height: cardHeight });
    }
  }

  drawDrawPile(x: number, y: number, count: number, cardWidth: number, cardHeight: number): void {
    const ctx = this.ctx;
    
    // Stack of cards (show multiple layers)
    for (let i = 0; i < Math.min(count, 5); i++) {
      const offsetX = x - cardWidth/2 - i;
      const offsetY = y - cardHeight/2 - i;
      this.drawBackOfCard(offsetX, offsetY, cardWidth, cardHeight);
    }
    
    // Card count
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${count}`, x, y + cardHeight);
  }
}