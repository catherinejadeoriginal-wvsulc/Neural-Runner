/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class SoundEffectsEngine {
  private ctx: AudioContext | null = null;
  private enabled: boolean = false;

  constructor() {
    // Lazy initialisation to comply with browser user-interaction rules
  }

  private init() {
    if (this.ctx) return;
    try {
      const AudioCtxFn = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxFn) {
        this.ctx = new AudioCtxFn();
      }
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  }

  public toggle(force?: boolean): boolean {
    this.init();
    this.enabled = force !== undefined ? force : !this.enabled;
    if (this.enabled && this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public playJump() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle'; // Retro standard pulse/triangle
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.15);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playCrouch() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(120, now + 0.1);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playScoreMilestone() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square'; // Arpeggio standard for retro score chimes
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
    osc.frequency.setValueAtTime(783.99, now + 0.16); // G5

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.setValueAtTime(0.15, now + 0.16);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playCrash() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    // Low rumble square sweep
    const osc = this.ctx.createOscillator();
    const gainOsc = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.linearRampToValueAtTime(30, now + 0.5);

    gainOsc.gain.setValueAtTime(0.3, now);
    gainOsc.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    osc.connect(gainOsc);
    gainOsc.connect(this.ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.5);

    // Procedural noise crackle
    try {
      const bufferSize = this.ctx.sampleRate * 0.4; // 0.4s
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.setValueAtTime(800, now);
      noiseFilter.frequency.exponentialRampToValueAtTime(100, now + 0.4);

      const gainNoise = this.ctx.createGain();
      gainNoise.gain.setValueAtTime(0.2, now);
      gainNoise.gain.linearRampToValueAtTime(0.01, now + 0.4);

      noise.connect(noiseFilter);
      noiseFilter.connect(gainNoise);
      gainNoise.connect(this.ctx.destination);

      noise.start(now);
      noise.stop(now + 0.4);
    } catch (e) {
      // Noise buffer could fail on older browser threads, fails gracefully
    }
  }
}

export const sounds = new SoundEffectsEngine();
