/**
 * ZAPRET 2.0 Web Audio Sound Effects
 * Discord-style synthesized audio cues without external audio files
 */
class SoundEffects {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setEnabled(enabled) {
    this.enabled = !!enabled;
  }

  playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.12, startTime = 0) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);

      gain.gain.setValueAtTime(0.001, this.ctx.currentTime + startTime);
      gain.gain.exponentialRampToValueAtTime(gainVal, this.ctx.currentTime + startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + startTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(this.ctx.currentTime + startTime);
      osc.stop(this.ctx.currentTime + startTime + duration + 0.05);
    } catch (e) {
      // Audio autoplay policy or hardware muted
    }
  }

  // Discord "User Join" / Connected chime (Rising Major 3rd / 5th)
  playConnect() {
    if (!this.enabled) return;
    this.playTone(523.25, 'sine', 0.12, 0.12, 0.00); // C5
    this.playTone(659.25, 'sine', 0.16, 0.13, 0.09); // E5
    this.playTone(783.99, 'sine', 0.22, 0.14, 0.18); // G5
  }

  // Discord "User Leave" / Disconnected chime (Falling tones)
  playDisconnect() {
    if (!this.enabled) return;
    this.playTone(783.99, 'sine', 0.12, 0.11, 0.00); // G5
    this.playTone(587.33, 'sine', 0.14, 0.10, 0.09); // D5
    this.playTone(440.00, 'sine', 0.20, 0.09, 0.18); // A4
  }

  // Winner / Optimal Config Found Fanfare
  playWinner() {
    if (!this.enabled) return;
    this.playTone(523.25, 'triangle', 0.10, 0.12, 0.00); // C5
    this.playTone(659.25, 'triangle', 0.10, 0.13, 0.10); // E5
    this.playTone(783.99, 'triangle', 0.12, 0.14, 0.20); // G5
    this.playTone(1046.50, 'sine', 0.35, 0.15, 0.30);   // C6
  }

  // Soft Alert
  playAlert() {
    if (!this.enabled) return;
    this.playTone(440.00, 'sine', 0.15, 0.10, 0.00); // A4
    this.playTone(392.00, 'sine', 0.25, 0.09, 0.12); // G4
  }
}

// Global instance
window.soundFX = new SoundEffects();
