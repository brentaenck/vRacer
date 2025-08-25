/**
 * Animation System for vRacer
 * 
 * Provides smooth animations, transitions, and particle effects.
 * All functionality is guarded by the animations feature flag.
 */

import { Vec } from './geometry'

// Easing functions for smooth animations
export const Easing = {
  linear: (t: number): number => t,
  easeInQuad: (t: number): number => t * t,
  easeOutQuad: (t: number): number => t * (2 - t),
  easeInOutQuad: (t: number): number => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeOutCubic: (t: number): number => (--t) * t * t + 1,
  easeInOutCubic: (t: number): number => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
}

export interface Animation {
  id: string
  startTime: number
  duration: number
  easing: (t: number) => number
  update: (progress: number) => void
  onComplete?: () => void
  isActive: boolean
}

export interface Particle {
  id: string
  position: Vec
  velocity: Vec
  acceleration: Vec
  life: number
  maxLife: number
  size: number
  color: string
  alpha: number
}

export class AnimationManager {
  private animations: Map<string, Animation> = new Map()
  private particles: Map<string, Particle> = new Map()
  private animationFrame: number = 0

  /**
   * Create a smooth interpolation animation
   */
  animate(
    id: string,
    duration: number,
    updateFn: (progress: number) => void,
    easing: (t: number) => number = Easing.easeOutQuad,
    onComplete?: () => void
  ): void {
    const animation: Animation = {
      id,
      startTime: performance.now(),
      duration,
      easing,
      update: updateFn,
      onComplete,
      isActive: true
    }

    this.animations.set(id, animation)
  }

  /**
   * Animate between two positions smoothly
   */
  animatePosition(
    id: string,
    fromPos: Vec,
    toPos: Vec,
    duration: number,
    updateFn: (pos: Vec) => void,
    easing: (t: number) => number = Easing.easeOutCubic,
    onComplete?: () => void
  ): void {
    this.animate(
      id,
      duration,
      (progress: number) => {
        const t = easing(progress)
        const pos: Vec = {
          x: fromPos.x + (toPos.x - fromPos.x) * t,
          y: fromPos.y + (toPos.y - fromPos.y) * t
        }
        updateFn(pos)
      },
      Easing.linear, // We handle easing in the position calculation
      onComplete
    )
  }

  /**
   * Animate a value between two numbers
   */
  animateValue(
    id: string,
    fromValue: number,
    toValue: number,
    duration: number,
    updateFn: (value: number) => void,
    easing: (t: number) => number = Easing.easeOutQuad,
    onComplete?: () => void
  ): void {
    this.animate(
      id,
      duration,
      (progress: number) => {
        const t = easing(progress)
        const value = fromValue + (toValue - fromValue) * t
        updateFn(value)
      },
      Easing.linear,
      onComplete
    )
  }

  /**
   * Stop an animation
   */
  stopAnimation(id: string): void {
    const animation = this.animations.get(id)
    if (animation) {
      animation.isActive = false
      this.animations.delete(id)
    }
  }

  /**
   * Check if an animation is running
   */
  isAnimating(id: string): boolean {
    return this.animations.has(id)
  }

  /**
   * Create a particle effect
   */
  createParticle(
    id: string,
    position: Vec,
    velocity: Vec,
    life: number,
    size: number = 2,
    color: string = '#ff0',
    acceleration: Vec = { x: 0, y: 0 }
  ): void {
    const particle: Particle = {
      id,
      position: { ...position },
      velocity: { ...velocity },
      acceleration: { ...acceleration },
      life,
      maxLife: life,
      size,
      color,
      alpha: 1
    }

    this.particles.set(id, particle)
  }

  /**
   * Create multiple particles for effects
   */
  createParticleBurst(
    baseId: string,
    position: Vec,
    count: number,
    velocityRange: number,
    life: number,
    size: number = 2,
    color: string = '#ff0'
  ): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count
      const speed = Math.random() * velocityRange
      const velocity: Vec = {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed
      }

      this.createParticle(
        `${baseId}_${i}`,
        position,
        velocity,
        life + Math.random() * life * 0.5, // Vary life slightly
        size + Math.random() * 2,
        color
      )
    }
  }

  /**
   * Remove a particle
   */
  removeParticle(id: string): void {
    this.particles.delete(id)
  }

  /**
   * Update all animations and particles
   */
  update(): void {
    const now = performance.now()

    // Update animations
    for (const [id, animation] of this.animations) {
      if (!animation.isActive) continue

      const elapsed = now - animation.startTime
      const progress = Math.min(elapsed / animation.duration, 1)

      animation.update(progress)

      if (progress >= 1) {
        // Animation complete
        animation.isActive = false
        animation.onComplete?.()
        this.animations.delete(id)
      }
    }

    // Update particles
    for (const [id, particle] of this.particles) {
      // Update physics
      particle.velocity.x += particle.acceleration.x
      particle.velocity.y += particle.acceleration.y
      particle.position.x += particle.velocity.x
      particle.position.y += particle.velocity.y

      // Update life
      particle.life -= 16.67 // Assume 60 FPS for now
      particle.alpha = Math.max(0, particle.life / particle.maxLife)

      // Remove dead particles
      if (particle.life <= 0) {
        this.particles.delete(id)
      }
    }
  }

  /**
   * Render all particles
   */
  renderParticles(ctx: CanvasRenderingContext2D, grid: number): void {
    for (const particle of this.particles.values()) {
      ctx.save()
      ctx.globalAlpha = particle.alpha
      ctx.fillStyle = particle.color
      ctx.beginPath()
      ctx.arc(
        particle.position.x * grid,
        particle.position.y * grid,
        particle.size,
        0,
        Math.PI * 2
      )
      ctx.fill()
      ctx.restore()
    }
  }

  /**
   * Clear all animations and particles
   */
  clear(): void {
    this.animations.clear()
    this.particles.clear()
  }

  /**
   * Get performance stats
   */
  getStats(): { animations: number; particles: number } {
    return {
      animations: this.animations.size,
      particles: this.particles.size
    }
  }
}

// Global animation manager instance
export const animationManager = new AnimationManager()

// Utility functions for common animations
export const AnimationUtils = {
  /**
   * Lerp (linear interpolation) between two values
   */
  lerp: (a: number, b: number, t: number): number => a + (b - a) * t,

  /**
   * Lerp between two positions
   */
  lerpPosition: (a: Vec, b: Vec, t: number): Vec => ({
    x: AnimationUtils.lerp(a.x, b.x, t),
    y: AnimationUtils.lerp(a.y, b.y, t)
  }),

  /**
   * Calculate distance between two points
   */
  distance: (a: Vec, b: Vec): number => {
    const dx = b.x - a.x
    const dy = b.y - a.y
    return Math.sqrt(dx * dx + dy * dy)
  },

  /**
   * Create explosion particles
   */
  createExplosion: (
    position: Vec,
    color: string = '#f66',
    particleCount: number = 8
  ): void => {
    animationManager.createParticleBurst(
      `explosion_${Date.now()}`,
      position,
      particleCount,
      0.5, // velocity range
      1000, // life in ms
      3, // size
      color
    )
  },

  /**
   * Create celebration particles
   */
  createCelebration: (
    position: Vec,
    color: string = '#0f0',
    particleCount: number = 12
  ): void => {
    animationManager.createParticleBurst(
      `celebration_${Date.now()}`,
      position,
      particleCount,
      0.8, // velocity range
      2000, // life in ms
      4, // size
      color
    )
  }
}
