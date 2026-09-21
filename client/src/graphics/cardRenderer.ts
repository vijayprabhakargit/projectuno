import { Card, CardColor } from '../../../shared/types';

// ============================================================
// AUTHENTIC UNO CARD RENDERER
// Clean UNO card look with white oval center
// ============================================================

export interface CardRenderConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  selected?: boolean;
}

const COLORS: Record<string, { fill: string; dark: string; light: string; border: string }> = {
  Red:     { fill: '#E74C3C', dark: '#C0392B', light: '#FF6B6B', border: '#A93226' },
  Blue:    { fill: '#3498DB', dark: '#2980B9', light: '#5DADE2', border: '#1A5276' },
  Green:   { fill: '#2ECC71', dark: '#27AE60', light: '#58D68D', border: '#1E8449' },
  Yellow:  { fill: '#F1C40F', dark: '#F39C12', light: '#F7DC6F', border: '#D4AC0D' },
  None:    { fill: '#2C3E50', dark: '#1A252F', light: '#5D6D7E', border: '#17202A' }
};

export class CardRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  drawCardBackground(card: Card, config: CardRenderConfig): void {
    const { x, y, width, height, selected } = config;
    const ctx = this.ctx;
    const isWild = card.type === 'Wild' || card.type === 'Wild Draw Four';
    const r = Math.min(width, height) * 0.12;

    // Shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;
    this.roundRect(x + 2, y + 2, width, height, r);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fill();
    ctx.restore();

    if (isWild) {
      this.drawRainbowPattern(x, y, width, height, r);
    } else {
      const color = COLORS[card.color];
      this.roundRect(x, y, width, height, r);
      ctx.fillStyle = color.fill;
      ctx.fill();
    }

    const borderColor = isWild ? '#1A252F' : COLORS[card.color].border;
    this.roundRect(x, y, width, height, r);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    this.roundRect(x + 3, y + 3, width - 6, height - 6, r - 2);
    ctx.strokeStyle = isWild ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (selected) {
      this.roundRect(x - 2, y - 2, width + 4, height + 4, r + 2);
      ctx.save();
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 16;
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }
  }

  drawCardContent(card: Card, config: CardRenderConfig): void {
    const { x, y, width, height } = config;
    const ctx = this.ctx;
    const cx = x + width / 2;
    const cy = y + height / 2;
    const isWild = card.type === 'Wild' || card.type === 'Wild Draw Four';
    const color = isWild ? COLORS['None'] : COLORS[card.color];

    // White oval center
    const ovalW = width * 0.58;
    const ovalH = height * 0.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, ovalW / 2, ovalH / 2, 0, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = isWild ? '#2C3E50' : color.border;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Center symbol
    const fontSize = Math.floor(ovalH * 0.5);
    ctx.fillStyle = isWild ? '#2C3E50' : color.dark;

    if (card.type === 'Number' && card.value !== null) {
      ctx.font = 'bold ' + fontSize + "px 'Press Start 2P', monospace";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(card.value), cx, cy + 2);
    } else {
      ctx.font = 'bold ' + (fontSize * 0.6) + "px 'Press Start 2P', monospace";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const symbols: Record<string, string> = {
        'Skip': String.fromCharCode(8856),
        'Reverse': String.fromCharCode(10227),
        'Draw Two': '+2',
        'Wild': 'W',
        'Wild Draw Four': '+4'
      };
      ctx.fillText(symbols[card.type] || '?', cx, cy + 2);
    }

    // Top-left corner indicator
    const smallFont = Math.floor(width * 0.15);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold ' + smallFont + "px 'Press Start 2P', monospace";
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const shortText = this.getShortText(card);
    ctx.fillText(shortText, x + 8, y + 6);

    // Bottom-right corner (inverted)
    ctx.save();
    ctx.translate(x + width - 8, y + height - 6);
    ctx.rotate(Math.PI);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(shortText, 0, 0);
    ctx.restore();

    // Type label at bottom
    if (card.type !== 'Number') {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = 'bold ' + Math.floor(width * 0.1) + "px 'Press Start 2P', monospace";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      const label = card.type === 'Wild Draw Four' ? 'WILD +4' : 
                    card.type === 'Draw Two' ? 'DRAW 2' : card.type.toUpperCase();
      ctx.fillText(label, cx, y + height - 8);
    }
  }

  private drawRainbowPattern(x: number, y: number, width: number, height: number, r: number): void {
    const ctx = this.ctx;
    const colors = [COLORS.Red.fill, COLORS.Blue.fill, COLORS.Green.fill, COLORS.Yellow.fill];
    const stripeH = height / 4;

    ctx.save();
    this.roundRect(x, y, width, height, r);
    ctx.clip();

    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = colors[i];
      ctx.globalAlpha = 0.5;
      ctx.fillRect(x, y + i * stripeH, width, stripeH);
    }
    ctx.globalAlpha = 1.0;
    ctx.restore();
  }

  drawBackOfCard(x: number, y: number, width: number, height: number): void {
    const ctx = this.ctx;
    const r = Math.min(width, height) * 0.12;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
    this.roundRect(x + 2, y + 2, width, height, r);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fill();
    ctx.restore();

    this.roundRect(x, y, width, height, r);
    ctx.fillStyle = '#1A5276';
    ctx.fill();
    this.roundRect(x, y, width, height, r);
    ctx.strokeStyle = '#2980B9';
    ctx.lineWidth = 2;
    ctx.stroke();

    this.roundRect(x + 3, y + 3, width - 6, height - 6, r - 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#3498DB';
    ctx.beginPath();
    ctx.moveTo(x + width / 2, y + 8);
    ctx.lineTo(x + width - 8, y + height / 2);
    ctx.lineTo(x + width / 2, y + height - 8);
    ctx.lineTo(x + 8, y + height / 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold ' + Math.floor(width * 0.22) + "px 'Press Start 2P', monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('UNO', x + width / 2, y + height / 2);
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

  drawDiscardPile(x: number, y: number, card: Card | null, cardWidth: number, cardHeight: number): void {
    const ctx = this.ctx;
    const r = cardWidth * 0.12;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 15;
    this.roundRect(x - cardWidth / 2, y - cardHeight / 2, cardWidth, cardHeight, r);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fill();
    ctx.restore();

    if (card) {
      this.drawCardBackground(card, { x: x - cardWidth/2 - 2, y: y - cardHeight/2 - 2, width: cardWidth, height: cardHeight });
      this.drawCardBackground(card, { x: x - cardWidth/2, y: y - cardHeight/2, width: cardWidth, height: cardHeight });
      this.drawCardContent(card, { x: x - cardWidth/2, y: y - cardHeight/2, width: cardWidth, height: cardHeight });
    }
  }

  drawDrawPile(x: number, y: number, count: number, cardWidth: number, cardHeight: number): void {
    const ctx = this.ctx;

    for (let i = 0; i < Math.min(count, 3); i++) {
      const ox = x - cardWidth / 2 - i * 2;
      const oy = y - cardHeight / 2 - i * 2;
      this.drawBackOfCard(ox, oy, cardWidth, cardHeight);
    }

    ctx.fillStyle = '#FFD700';
    ctx.font = '9px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('' + count, x, y + cardHeight / 2 + 10);
  }
}
