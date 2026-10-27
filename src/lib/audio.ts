// Web Audio API Synthesizer for PSYCH Game
// Zero external network dependencies, instant response, mobile-friendly.

class SoundManager {
  private ctx: AudioContext | null = null;
  private isEnabled: boolean = false;

  constructor() {
    // Read user preference from localStorage (Default is OFF as requested)
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('psych_sound_enabled');
      this.isEnabled = stored === 'true';
    }
  }

  public get enabled(): boolean {
    return this.isEnabled;
  }

  public toggle(): boolean {
    this.isEnabled = !this.isEnabled;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('psych_sound_enabled', String(this.isEnabled));
    }
    if (this.isEnabled) {
      this.initCtx();
      this.playTone(523.25, 0.1, 'sine'); // C5 confirmation beep
    }
    return this.isEnabled;
  }

  public setEnabled(enable: boolean) {
    this.isEnabled = enable;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('psych_sound_enabled', String(enable));
    }
    if (enable) {
      this.initCtx();
    }
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'sine', gainVal = 0.15) {
    if (!this.isEnabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  public playTick() {
    this.playTone(600, 0.05, 'triangle', 0.08);
  }

  public playUrgentTick() {
    this.playTone(1100, 0.08, 'sawtooth', 0.18);
  }

  public playSuccess() {
    if (!this.isEnabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      // Ascending two-tone
      this.playTone(523.25, 0.1, 'sine', 0.15); // C5
      setTimeout(() => this.playTone(659.25, 0.15, 'sine', 0.15), 100); // E5
    } catch {}
  }

  public playVote() {
    this.playTone(784, 0.08, 'triangle', 0.12); // G5
  }

  public playTimeUp() {
    if (!this.isEnabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      this.playTone(330, 0.2, 'sawtooth', 0.2);
      setTimeout(() => this.playTone(220, 0.35, 'sawtooth', 0.25), 200);
    } catch {}
  }

  public playReveal() {
    if (!this.isEnabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      // Dramatic chord
      [261.63, 329.63, 392.00, 523.25].forEach((freq, idx) => {
        setTimeout(() => this.playTone(freq, 0.3, 'sine', 0.15), idx * 80);
      });
    } catch {}
  }

  public playWinnerFanfare() {
    if (!this.isEnabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        setTimeout(() => this.playTone(freq, 0.25, 'triangle', 0.2), i * 110);
      });
    } catch {}
  }
}

export const soundManager = new SoundManager();
