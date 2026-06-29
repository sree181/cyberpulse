/**
 * DataSonification — Ambient soundscape from attack events
 * 
 * Maps attack events to subtle audio tones:
 *   - Each attack produces a soft ping
 *   - Pitch is shifted by severity (critical = deep resonant, low = high chirp)
 *   - Volume auto-adjusts based on time of day (quieter at night)
 *   - Creates an ambient soundscape for hallway displays
 * 
 * Uses Web Audio API for procedural synthesis (no audio files needed).
 */

type Severity = 'critical' | 'high' | 'medium' | 'low';

// Frequency mapping: lower = more serious
const SEVERITY_FREQUENCIES: Record<Severity, number> = {
  critical: 110,  // Deep resonant A2
  high: 220,      // A3
  medium: 440,    // A4
  low: 660,       // E5 (higher chirp)
};

// Duration mapping: critical lingers longer
const SEVERITY_DURATIONS: Record<Severity, number> = {
  critical: 1.8,
  high: 1.2,
  medium: 0.6,
  low: 0.3,
};

// Gain mapping: critical is louder
const SEVERITY_GAINS: Record<Severity, number> = {
  critical: 0.12,
  high: 0.08,
  medium: 0.05,
  low: 0.03,
};

class DataSonificationEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private enabled = false;
  private lastPingTime = 0;
  private minInterval = 150; // ms between pings to avoid cacophony

  constructor() {
    // Lazy init on first user interaction
  }

  private init() {
    if (this.ctx) return;
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.updateVolumeForTimeOfDay();
    } catch {
      console.warn('[Sonification] Web Audio API not available');
    }
  }

  /**
   * Auto-adjust volume based on time of day.
   * Quieter during night hours (10pm-7am), normal during day.
   */
  private updateVolumeForTimeOfDay() {
    if (!this.masterGain) return;
    const hour = new Date().getHours();
    let volumeMultiplier: number;

    if (hour >= 22 || hour < 7) {
      // Night: very quiet
      volumeMultiplier = 0.2;
    } else if (hour >= 7 && hour < 9) {
      // Early morning: ramp up
      volumeMultiplier = 0.5;
    } else if (hour >= 18 && hour < 22) {
      // Evening: slightly reduced
      volumeMultiplier = 0.7;
    } else {
      // Daytime: full volume
      volumeMultiplier = 1.0;
    }

    this.masterGain.gain.setValueAtTime(volumeMultiplier, this.ctx!.currentTime);
  }

  enable() {
    this.init();
    this.enabled = true;
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
  }

  disable() {
    this.enabled = false;
  }

  isEnabled() {
    return this.enabled;
  }

  /**
   * Play a sonified ping for an attack event.
   * Severity determines pitch, duration, and volume.
   */
  ping(severity: Severity) {
    if (!this.enabled || !this.ctx || !this.masterGain) return;

    // Throttle to prevent audio spam
    const now = Date.now();
    if (now - this.lastPingTime < this.minInterval) return;
    this.lastPingTime = now;

    // Update time-of-day volume periodically
    if (Math.random() < 0.05) {
      this.updateVolumeForTimeOfDay();
    }

    const freq = SEVERITY_FREQUENCIES[severity] || 440;
    const duration = SEVERITY_DURATIONS[severity] || 0.5;
    const gain = SEVERITY_GAINS[severity] || 0.05;

    const currentTime = this.ctx.currentTime;

    // Create oscillator
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    // Use sine wave for soft, ambient tone
    osc.type = severity === 'critical' ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(freq, currentTime);

    // For critical: add slight frequency sweep down for resonant feel
    if (severity === 'critical') {
      osc.frequency.exponentialRampToValueAtTime(freq * 0.7, currentTime + duration);
    }

    // Envelope: quick attack, long decay
    gainNode.gain.setValueAtTime(0, currentTime);
    gainNode.gain.linearRampToValueAtTime(gain, currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + duration);

    // Connect
    osc.connect(gainNode);
    gainNode.connect(this.masterGain);

    // Play
    osc.start(currentTime);
    osc.stop(currentTime + duration + 0.05);

    // Add a subtle harmonic for critical attacks (octave above, quieter)
    if (severity === 'critical' || severity === 'high') {
      const harmonic = this.ctx.createOscillator();
      const harmonicGain = this.ctx.createGain();
      harmonic.type = 'sine';
      harmonic.frequency.setValueAtTime(freq * 2, currentTime);
      harmonicGain.gain.setValueAtTime(0, currentTime);
      harmonicGain.gain.linearRampToValueAtTime(gain * 0.3, currentTime + 0.03);
      harmonicGain.gain.exponentialRampToValueAtTime(0.001, currentTime + duration * 0.6);
      harmonic.connect(harmonicGain);
      harmonicGain.connect(this.masterGain);
      harmonic.start(currentTime);
      harmonic.stop(currentTime + duration * 0.6 + 0.05);
    }
  }

  /**
   * Play an ambient drone that shifts with overall threat level.
   * Called periodically to maintain the soundscape.
   */
  ambientDrone(threatLevel: number) {
    if (!this.enabled || !this.ctx || !this.masterGain) return;

    const currentTime = this.ctx.currentTime;
    const freq = 55 + threatLevel * 30; // 55-85 Hz sub-bass
    const duration = 4;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, currentTime);

    // Very quiet ambient layer
    gainNode.gain.setValueAtTime(0, currentTime);
    gainNode.gain.linearRampToValueAtTime(0.015, currentTime + 1);
    gainNode.gain.linearRampToValueAtTime(0.015, currentTime + duration - 1);
    gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + duration);

    osc.connect(gainNode);
    gainNode.connect(this.masterGain);
    osc.start(currentTime);
    osc.stop(currentTime + duration + 0.1);
  }

  destroy() {
    this.enabled = false;
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

// Singleton instance
export const dataSonification = new DataSonificationEngine();
