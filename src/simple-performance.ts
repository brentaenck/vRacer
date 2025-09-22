/**
 * Simple Performance Tracker for vRacer
 * 
 * Minimal replacement for the complex performance monitoring system.
 * Only tracks basic render timing for debug mode - no overhead in production.
 */

import { isFeatureEnabled } from './features'

export class SimplePerformanceTracker {
  private renderStart = 0
  private frameStart = 0
  
  startFrame() {
    if (isFeatureEnabled('debugMode')) {
      this.frameStart = performance.now()
    }
  }
  
  startRender() {
    if (isFeatureEnabled('debugMode')) {
      this.renderStart = performance.now()
    }
  }
  
  endRender() {
    if (isFeatureEnabled('debugMode') && this.renderStart > 0) {
      const renderTime = performance.now() - this.renderStart
      if (renderTime > 5) { // Only log if render takes more than 5ms
        console.log(`🎨 Render time: ${renderTime.toFixed(2)}ms`)
      }
    }
  }
  
  endFrame() {
    if (isFeatureEnabled('debugMode') && this.frameStart > 0) {
      const frameTime = performance.now() - this.frameStart
      if (frameTime > 16.67) { // Only log if frame takes more than 60 FPS (16.67ms)
        console.log(`⏱️ Frame time: ${frameTime.toFixed(2)}ms`)
      }
    }
  }
  
  /**
   * Get simple debug summary - only used when debug mode is enabled
   */
  getSummary(): string[] {
    if (!isFeatureEnabled('debugMode')) {
      return []
    }
    
    return [
      'Event-driven rendering active',
      'Performance: Optimized for turn-based gameplay'
    ]
  }
}

// Global simple performance tracker instance
export const simplePerformanceTracker = new SimplePerformanceTracker()