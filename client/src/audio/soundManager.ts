// ============================================================
// Sound Manager — 8-bit retro sound effects via Web Audio API
// No external files needed — all sounds generated procedurally
// ============================================================

export class SoundManager {
  private ctx: AudioContext | null = null;
  private masterVolume: number = 0.5;
  private initialized: boolean = false;

  constructor() {
    // AudioContext is created on first user interaction to comply with autoplay policies
  }

  /** Call this on the very first user click to guarantee the AudioContext starts */
  init(): void {
    if (this.initialized) return;
    this.initialized = true;
    this.ensureContext();
  }

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // ---- Helper: play a tone with given parameters ----
  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = 'square',
    volume: number = 1,
    slide: number = 0
  ): void {
    const ctx = this.ensureContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    if (slide) {
      osc.frequency.linearRampToValueAtTime(frequency + slide, ctx.currentTime + duration);
    }

    gain.gain.setValueAtTime(volume * this.masterVolume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  // ---- Helper: play a chord (multiple tones) ----
  private playChord(
    frequencies: number[],
    duration: number,
    type: OscillatorType = 'square',
    volume: number = 1
  ): void {
    for (const freq of frequencies) {
      this.playTone(freq, duration, type, volume / frequencies.length);
    }
  }

  // ---- Helper: play a quick sequence of notes ----
  private playSequence(
    notes: { freq: number; time: number; dur: number; type?: OscillatorType }[],
    volume: number = 1
  ): void {
    const ctx = this.ensureContext();
    for (const note of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = note.type || 'square';
      osc.frequency.setValueAtTime(note.freq, ctx.currentTime + note.time);

      gain.gain.setValueAtTime(volume * this.masterVolume, ctx.currentTime + note.time);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + note.time + note.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + note.time);
      osc.stop(ctx.currentTime + note.time + note.dur);
    }
  }

  // ---- Individual sound effects ----

  /** Game started — quick ascending arpeggio */
  playGameStart(): void {
    this.playSequence([
      { freq: 392, time: 0, dur: 0.1 },
      { freq: 523, time: 0.1, dur: 0.1 },
      { freq: 659, time: 0.2, dur: 0.1 },
      { freq: 784, time: 0.3, dur: 0.2 },
    ], 0.7);
  }

  /** Card played — short satisfying blip */
  playCardPlay(): void {
    this.playTone(523, 0.08, 'square', 0.8);
    setTimeout(() => this.playTone(659, 0.06, 'square', 0.6), 40);
  }

  /** Card drawn — descending slide */
  playCardDraw(): void {
    this.playTone(440, 0.15, 'triangle', 0.7, -200);
  }

  /** UNO called — alert chime */
  playUnoCall(): void {
    this.playChord([523, 659, 784], 0.3, 'square', 0.8);
  }

  /** Catch UNO — buzzer / wrong sound */
  playCatchUno(): void {
    this.playTone(200, 0.2, 'sawtooth', 0.6);
    setTimeout(() => this.playTone(150, 0.3, 'sawtooth', 0.5), 100);
  }

  /** Your turn notification — pleasant ding */
  playYourTurn(): void {
    this.playSequence([
      { freq: 523, time: 0, dur: 0.1 },
      { freq: 659, time: 0.1, dur: 0.1 },
      { freq: 784, time: 0.2, dur: 0.2 },
    ], 0.7);
  }

  /** Wild card played — magical sparkle */
  playWildCard(): void {
    this.playSequence([
      { freq: 523, time: 0, dur: 0.08 },
      { freq: 659, time: 0.08, dur: 0.08 },
      { freq: 784, time: 0.16, dur: 0.08 },
      { freq: 1047, time: 0.24, dur: 0.15 },
    ], 0.6);
  }

  /** Skip — whoosh */
  playSkip(): void {
    this.playTone(300, 0.2, 'sawtooth', 0.5, 200);
  }

  /** Reverse — reverse whoosh */
  playReverse(): void {
    this.playTone(500, 0.2, 'sawtooth', 0.5, -300);
  }

  /** Draw Two — double blip */
  playDrawTwo(): void {
    this.playTone(440, 0.08, 'square', 0.7);
    setTimeout(() => this.playTone(523, 0.08, 'square', 0.7), 80);
  }

  /** Draw Four — quadruple blip */
  playDrawFour(): void {
    this.playSequence([
      { freq: 330, time: 0, dur: 0.06 },
      { freq: 392, time: 0.06, dur: 0.06 },
      { freq: 440, time: 0.12, dur: 0.06 },
      { freq: 523, time: 0.18, dur: 0.12 },
    ], 0.7);
  }

  /** You win! — triumphant fanfare */
  playWin(): void {
    this.playSequence([
      { freq: 523, time: 0, dur: 0.15 },
      { freq: 659, time: 0.15, dur: 0.15 },
      { freq: 784, time: 0.3, dur: 0.15 },
      { freq: 1047, time: 0.45, dur: 0.4 },
    ], 0.8);
  }

  /** You lose — sad trombone */
  playLose(): void {
    this.playSequence([
      { freq: 400, time: 0, dur: 0.2 },
      { freq: 350, time: 0.2, dur: 0.2 },
      { freq: 300, time: 0.4, dur: 0.3 },
      { freq: 200, time: 0.7, dur: 0.5 },
    ], 0.6);
  }

  /** Button click — short tick */
  playButtonClick(): void {
    this.playTone(800, 0.04, 'square', 0.5);
  }

  /** Chat message received — soft notification */
  playChatMessage(): void {
    this.playTone(880, 0.06, 'sine', 0.3);
    setTimeout(() => this.playTone(1100, 0.06, 'sine', 0.2), 60);
  }

  /** Error / invalid action — buzz */
  playError(): void {
    this.playTone(180, 0.15, 'sawtooth', 0.5);
    setTimeout(() => this.playTone(120, 0.2, 'sawtooth', 0.4), 120);
  }
}

// Singleton instance
export const soundManager = new SoundManager();