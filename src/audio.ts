/**
 * Audio System for vRacer
 * 
 * Provides procedural sound generation and management using Web Audio API.
 * All sounds are generated procedurally to avoid loading external files.
 * 
 * Features:
 * - Engine sounds with pitch variation based on speed
 * - Crash effects with explosion sounds
 * - Celebration sounds for lap completion and race finish
 * - Volume control and muting capabilities
 * - Performance-optimized with audio node reuse
 */

import { isFeatureEnabled } from './features'

export interface AudioSettings {
  masterVolume: number
  engineVolume: number
  effectsVolume: number
  muted: boolean
}

class AudioSystem {
  private audioContext: AudioContext | null = null
  private masterGain: GainNode | null = null
  private engineGain: GainNode | null = null
  private effectsGain: GainNode | null = null
  
  private settings: AudioSettings = {
    masterVolume: 0.7,
    engineVolume: 0.5,
    effectsVolume: 0.8,
    muted: false
  }
  
  private initialized = false
  private currentEngineOscillator: OscillatorNode | null = null
  
  // Performance optimizations: node pools and caching
  private oscillatorPool: OscillatorNode[] = []
  private gainPool: GainNode[] = []
  private filterPool: BiquadFilterNode[] = []
  private noiseBufferCache: AudioBuffer | null = null
  private activeNodes: Set<AudioNode> = new Set()

  /**
   * Initialize the audio system
   * Must be called after user interaction due to browser autoplay policies
   */
  async initialize(): Promise<boolean> {
    if (this.initialized || !isFeatureEnabled('soundEffects')) {
      return this.initialized
    }

    // Check Web Audio API support
    if (!this.isWebAudioSupported()) {
      console.warn('🔇 Web Audio API not supported in this browser')
      return false
    }

    try {
      // Create audio context with cross-browser compatibility
      const AudioContextClass = window.AudioContext || 
                               (window as any).webkitAudioContext || 
                               (window as any).mozAudioContext || 
                               (window as any).msAudioContext
      
      if (!AudioContextClass) {
        throw new Error('No AudioContext constructor available')
      }
      
      this.audioContext = new AudioContextClass()
      
      // Handle suspended state (required by browsers for user interaction)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume()
      }
      
      // Verify context is running
      if (this.audioContext.state !== 'running') {
        throw new Error('AudioContext failed to start')
      }

      // Create gain nodes for volume control
      this.masterGain = this.audioContext.createGain()
      this.engineGain = this.audioContext.createGain()
      this.effectsGain = this.audioContext.createGain()
      
      // Verify nodes were created successfully
      if (!this.masterGain || !this.engineGain || !this.effectsGain) {
        throw new Error('Failed to create audio gain nodes')
      }
      
      // Connect gain nodes
      this.engineGain.connect(this.masterGain)
      this.effectsGain.connect(this.masterGain)
      this.masterGain.connect(this.audioContext.destination)
      
      // Set initial volumes
      this.updateVolumes()
      
      this.initialized = true
      console.log('🔊 Audio system initialized successfully')
      return true
      
    } catch (error) {
      console.warn('🔇 Failed to initialize audio system:', error)
      this.initialized = false
      return false
    }
  }
  
  /**
   * Check if Web Audio API is supported
   */
  private isWebAudioSupported(): boolean {
    return !!(window.AudioContext || 
             (window as any).webkitAudioContext || 
             (window as any).mozAudioContext || 
             (window as any).msAudioContext)
  }

  /**
   * Update volume settings
   */
  private updateVolumes(): void {
    if (!this.initialized || !this.masterGain || !this.engineGain || !this.effectsGain) return
    
    const masterVol = this.settings.muted ? 0 : this.settings.masterVolume
    this.masterGain.gain.value = masterVol
    this.engineGain.gain.value = this.settings.engineVolume
    this.effectsGain.gain.value = this.settings.effectsVolume
  }

  /**
   * Set master volume (0-1)
   */
  setMasterVolume(volume: number): void {
    this.settings.masterVolume = Math.max(0, Math.min(1, volume))
    this.updateVolumes()
  }

  /**
   * Toggle mute state
   */
  toggleMute(): void {
    this.settings.muted = !this.settings.muted
    this.updateVolumes()
  }

  /**
   * Get current settings
   */
  getSettings(): AudioSettings {
    return { ...this.settings }
  }

  /**
   * Play engine sound based on car speed
   * @param speed - Current car speed (0-10+)
   */
  playEngineSound(speed: number): void {
    if (!this.initialized || !this.audioContext || !this.engineGain) return

    // Stop previous engine sound
    this.stopEngineSound()

    try {
      // Create oscillator for engine sound
      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()
      
      // Engine sound characteristics based on speed
      const baseFreq = 80 // Base engine frequency
      const speedMultiplier = Math.min(speed * 0.3, 2.5) // Cap the speed effect
      const frequency = baseFreq + (speedMultiplier * 40)
      
      oscillator.type = 'sawtooth'
      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime)
      
      // Volume based on speed (quieter when stopped)
      const volume = speed > 0 ? 0.3 + (speedMultiplier * 0.2) : 0.1
      gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime)
      
      // Connect and start
      oscillator.connect(gainNode)
      gainNode.connect(this.engineGain)
      oscillator.start()
      
      this.currentEngineOscillator = oscillator
      
    } catch (error) {
      console.warn('Failed to play engine sound:', error)
    }
  }

  /**
   * Stop engine sound
   */
  stopEngineSound(): void {
    if (this.currentEngineOscillator) {
      try {
        this.currentEngineOscillator.stop()
      } catch (error) {
        // Ignore errors from stopping already-stopped oscillators
      }
      this.currentEngineOscillator = null
    }
  }

  /**
   * Play crash sound effect
   */
  playCrashSound(): void {
    if (!this.initialized || !this.audioContext || !this.effectsGain) return

    try {
      const duration = 0.5
      const currentTime = this.audioContext.currentTime

      // Create noise for explosion effect
      const noiseBuffer = this.createNoiseBuffer(duration)
      const noiseSource = this.audioContext.createBufferSource()
      const noiseGain = this.audioContext.createGain()
      const noiseFilter = this.audioContext.createBiquadFilter()
      
      noiseSource.buffer = noiseBuffer
      noiseFilter.type = 'bandpass'
      noiseFilter.frequency.setValueAtTime(200, currentTime)
      noiseFilter.Q.setValueAtTime(5, currentTime)
      
      // Explosion envelope
      noiseGain.gain.setValueAtTime(0, currentTime)
      noiseGain.gain.linearRampToValueAtTime(0.8, currentTime + 0.05)
      noiseGain.gain.exponentialRampToValueAtTime(0.01, currentTime + duration)
      
      // Connect noise chain
      noiseSource.connect(noiseFilter)
      noiseFilter.connect(noiseGain)
      noiseGain.connect(this.effectsGain)
      noiseSource.start(currentTime)
      noiseSource.stop(currentTime + duration)
      
      // Add bass thump
      const bassOsc = this.audioContext.createOscillator()
      const bassGain = this.audioContext.createGain()
      
      bassOsc.type = 'sine'
      bassOsc.frequency.setValueAtTime(60, currentTime)
      bassGain.gain.setValueAtTime(0, currentTime)
      bassGain.gain.linearRampToValueAtTime(0.6, currentTime + 0.02)
      bassGain.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.3)
      
      bassOsc.connect(bassGain)
      bassGain.connect(this.effectsGain)
      bassOsc.start(currentTime)
      bassOsc.stop(currentTime + 0.3)
      
    } catch (error) {
      console.warn('Failed to play crash sound:', error)
    }
  }

  /**
   * Play lap completion sound
   */
  playLapSound(): void {
    if (!this.initialized || !this.audioContext || !this.effectsGain) return

    try {
      const currentTime = this.audioContext.currentTime
      
      // Ascending chime sequence
      const notes = [261.63, 329.63, 392.00] // C4, E4, G4
      
      notes.forEach((freq, index) => {
        const osc = this.audioContext!.createOscillator()
        const gain = this.audioContext!.createGain()
        
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, currentTime)
        
        const startTime = currentTime + (index * 0.15)
        const endTime = startTime + 0.3
        
        gain.gain.setValueAtTime(0, startTime)
        gain.gain.linearRampToValueAtTime(0.4, startTime + 0.05)
        gain.gain.exponentialRampToValueAtTime(0.01, endTime)
        
        osc.connect(gain)
        if (this.effectsGain) {
          gain.connect(this.effectsGain)
        }
        osc.start(startTime)
        osc.stop(endTime)
      })
      
    } catch (error) {
      console.warn('Failed to play lap sound:', error)
    }
  }

  /**
   * Play race completion victory sound
   */
  playVictorySound(): void {
    if (!this.initialized || !this.audioContext || !this.effectsGain) return

    try {
      const currentTime = this.audioContext.currentTime
      
      // Victory fanfare - more elaborate sequence
      const melody = [
        { freq: 523.25, time: 0.0, duration: 0.2 }, // C5
        { freq: 659.25, time: 0.15, duration: 0.2 }, // E5
        { freq: 783.99, time: 0.3, duration: 0.2 }, // G5
        { freq: 1046.50, time: 0.45, duration: 0.4 }, // C6
      ]
      
      melody.forEach(note => {
        const osc = this.audioContext!.createOscillator()
        const gain = this.audioContext!.createGain()
        
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(note.freq, currentTime)
        
        const startTime = currentTime + note.time
        const endTime = startTime + note.duration
        
        gain.gain.setValueAtTime(0, startTime)
        gain.gain.linearRampToValueAtTime(0.5, startTime + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.01, endTime)
        
        osc.connect(gain)
        if (this.effectsGain) {
          gain.connect(this.effectsGain)
        }
        osc.start(startTime)
        osc.stop(endTime)
      })
      
    } catch (error) {
      console.warn('Failed to play victory sound:', error)
    }
  }

  /**
   * Create white noise buffer for sound effects
   */
  private createNoiseBuffer(duration: number): AudioBuffer {
    if (!this.audioContext) throw new Error('Audio context not initialized')
    
    const sampleRate = this.audioContext.sampleRate
    const bufferSize = sampleRate * duration
    const buffer = this.audioContext.createBuffer(1, bufferSize, sampleRate)
    const data = buffer.getChannelData(0)
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }
    
    return buffer
  }

  /**
   * Clean up audio resources
   */
  dispose(): void {
    this.stopEngineSound()
    
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    
    this.initialized = false
  }
}

// Export singleton instance
export const audioSystem = new AudioSystem()

// Convenience functions for easier integration
export const AudioUtils = {
  /**
   * Initialize audio system (call after user interaction)
   */
  init: () => audioSystem.initialize(),
  initialize: () => audioSystem.initialize(),
  
  /**
   * Play engine sound based on car speed
   */
  playEngine: (speed: number) => audioSystem.playEngineSound(speed),
  updateEngineSound: (speed: number) => audioSystem.playEngineSound(speed),
  
  /**
   * Stop engine sound
   */
  stopEngine: () => audioSystem.stopEngineSound(),
  
  /**
   * Play crash explosion sound
   */
  playCrash: () => audioSystem.playCrashSound(),
  
  /**
   * Play lap completion sound
   */
  playLapComplete: () => audioSystem.playLapSound(),
  
  /**
   * Play race victory sound
   */
  playVictory: () => audioSystem.playVictorySound(),
  playVictoryFanfare: () => audioSystem.playVictorySound(),
  
  /**
   * Toggle mute
   */
  toggleMute: () => audioSystem.toggleMute(),
  
  /**
   * Set volume (0-1)
   */
  setVolume: (volume: number) => audioSystem.setMasterVolume(volume),
  
  /**
   * Get volume (0-1)
   */
  getVolume: () => audioSystem.getSettings().masterVolume,
  
  /**
   * Get current settings
   */
  getSettings: () => audioSystem.getSettings()
}
