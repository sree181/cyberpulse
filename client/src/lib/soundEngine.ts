/**
 * SoundEngine — Web Audio API synthesizer for threat intelligence audio cues
 * 
 * All sounds are procedurally generated (no external audio files needed).
 * Uses oscillators, noise, and envelopes to create subtle sci-fi/command-center audio.
 * 
 * Sound palette:
 *   - criticalAlert: Deep bass pulse + high-freq sweep (urgent, attention-grabbing)
 *   - highAlert: Short mid-tone ping (noticeable but not alarming)
 *   - newThreat: Soft blip (ambient, constant background texture)
 *   - modeTransition: Smooth frequency sweep (passive↔interactive)
 *   - arcImpact: Quick percussive hit (when arc reaches target)
 *   - timelineScrub: Soft tick (scrubber position feedback)
 * 
 * Haptic feedback:
 *   - Uses navigator.vibrate() where available (mobile/tablet)
 *   - Patterns match sound intensity
 */

type SoundType = 'criticalAlert' | 'highAlert' | 'newThreat' | 'modeTransition' | 'arcImpact' | 'timelineScrub';

interface SoundEngineState {
  audioCtx: AudioContext | null;
  masterGain: GainNode | null;
  enabled: boolean;
  volume: number; // 0-1
  initialized: boolean;
}

class CyberSoundEngine {
  private state: SoundEngineState = {
    audioCtx: null,
    masterGain: null,
    enabled: true,
    volume: 0.3, // Subtle by default for museum environment
    initialized: false,
  };

  // Throttle to prevent sound spam
  private lastPlayTime: Record<string, number> = {};
  private throttleMs: Record<SoundType, number> = {
    criticalAlert: 3000,
    highAlert: 1500,
    newThreat: 300,
    modeTransition: 500,
    arcImpact: 200,
    timelineScrub: 50,
  };

  /**
   * Initialize AudioContext on first user interaction (browser policy).
   * Call this from a click/touch handler.
   */
  init(): boolean {
    if (this.state.initialized) return true;
    
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return false;
      
      this.state.audioCtx = new AudioCtx();
      this.state.masterGain = this.state.audioCtx.createGain();
      this.state.masterGain.gain.value = this.state.volume;
      this.state.masterGain.connect(this.state.audioCtx.destination);
      this.state.initialized = true;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Resume AudioContext if suspended (browser auto-suspends after inactivity)
   */
  private async ensureRunning(): Promise<boolean> {
    if (!this.state.audioCtx || !this.state.enabled) return false;
    if (this.state.audioCtx.state === 'suspended') {
      try {
        await this.state.audioCtx.resume();
      } catch {
        return false;
      }
    }
    return this.state.audioCtx.state === 'running';
  }

  /**
   * Play a sound effect with throttling
   */
  async play(type: SoundType): Promise<void> {
    if (!this.state.enabled || !this.state.initialized) return;
    
    // Throttle check
    const now = Date.now();
    const lastTime = this.lastPlayTime[type] || 0;
    if (now - lastTime < this.throttleMs[type]) return;
    this.lastPlayTime[type] = now;

    const running = await this.ensureRunning();
    if (!running) return;

    switch (type) {
      case 'criticalAlert': this.playCriticalAlert(); break;
      case 'highAlert': this.playHighAlert(); break;
      case 'newThreat': this.playNewThreat(); break;
      case 'modeTransition': this.playModeTransition(); break;
      case 'arcImpact': this.playArcImpact(); break;
      case 'timelineScrub': this.playTimelineScrub(); break;
    }

    // Haptic feedback
    this.triggerHaptic(type);
  }

  // ═══════════════════════════════════════════════════════════════════
  // SOUND GENERATORS
  // ═══════════════════════════════════════════════════════════════════

  private playCriticalAlert(): void {
    const ctx = this.state.audioCtx!;
    const master = this.state.masterGain!;
    const now = ctx.currentTime;

    // Deep bass pulse
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(60, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    osc.connect(gain).connect(master);
    osc.start(now);
    osc.stop(now + 0.5);

    // High-freq sweep overlay
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(2000, now);
    osc2.frequency.exponentialRampToValueAtTime(800, now + 0.2);
    gain2.gain.setValueAtTime(0.15, now);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc2.connect(gain2).connect(master);
    osc2.start(now);
    osc2.stop(now + 0.3);
  }

  private playHighAlert(): void {
    const ctx = this.state.audioCtx!;
    const master = this.state.masterGain!;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.15);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc.connect(gain).connect(master);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  private playNewThreat(): void {
    const ctx = this.state.audioCtx!;
    const master = this.state.masterGain!;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    // Randomize pitch slightly for organic feel
    const freq = 1200 + Math.random() * 400;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.7, now + 0.08);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain).connect(master);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  private playModeTransition(): void {
    const ctx = this.state.audioCtx!;
    const master = this.state.masterGain!;
    const now = ctx.currentTime;

    // Smooth ascending sweep
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.4);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.1);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    osc.connect(gain).connect(master);
    osc.start(now);
    osc.stop(now + 0.5);

    // Subtle harmonic
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(400, now);
    osc2.frequency.exponentialRampToValueAtTime(1200, now + 0.4);
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(0.08, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    osc2.connect(gain2).connect(master);
    osc2.start(now);
    osc2.stop(now + 0.5);
  }

  private playArcImpact(): void {
    const ctx = this.state.audioCtx!;
    const master = this.state.masterGain!;
    const now = ctx.currentTime;

    // Quick percussive noise burst
    const bufferSize = ctx.sampleRate * 0.05; // 50ms
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 3000;
    filter.Q.value = 2;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    noise.connect(filter).connect(gain).connect(master);
    noise.start(now);
  }

  private playTimelineScrub(): void {
    const ctx = this.state.audioCtx!;
    const master = this.state.masterGain!;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(4000, now);
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
    osc.connect(gain).connect(master);
    osc.start(now);
    osc.stop(now + 0.02);
  }

  // ═══════════════════════════════════════════════════════════════════
  // HAPTIC FEEDBACK
  // ═══════════════════════════════════════════════════════════════════

  private triggerHaptic(type: SoundType): void {
    if (!navigator.vibrate) return;

    switch (type) {
      case 'criticalAlert':
        navigator.vibrate([100, 50, 100, 50, 200]); // Strong pattern
        break;
      case 'highAlert':
        navigator.vibrate([80, 30, 80]); // Medium double-tap
        break;
      case 'newThreat':
        navigator.vibrate(15); // Subtle tick
        break;
      case 'modeTransition':
        navigator.vibrate([50, 30, 50, 30, 50]); // Gentle cascade
        break;
      case 'arcImpact':
        navigator.vibrate(25); // Quick tap
        break;
      case 'timelineScrub':
        navigator.vibrate(5); // Micro-tick
        break;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // CONTROLS
  // ═══════════════════════════════════════════════════════════════════

  setEnabled(enabled: boolean): void {
    this.state.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.state.enabled;
  }

  setVolume(volume: number): void {
    this.state.volume = Math.max(0, Math.min(1, volume));
    if (this.state.masterGain) {
      this.state.masterGain.gain.value = this.state.volume;
    }
  }

  getVolume(): number {
    return this.state.volume;
  }

  isInitialized(): boolean {
    return this.state.initialized;
  }
}

// Singleton instance
export const soundEngine = new CyberSoundEngine();
export type { SoundType };
