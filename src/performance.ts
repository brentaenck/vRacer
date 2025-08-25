/**
 * Performance Metrics Module for vRacer
 * 
 * Tracks various performance metrics for development and optimization.
 * All functionality is guarded by the performanceMetrics feature flag.
 */

export interface PerformanceMetrics {
  fps: number
  avgFps: number
  minFps: number
  maxFps: number
  frameTime: number
  avgFrameTime: number
  renderTime: number
  avgRenderTime: number
  memoryUsed?: number
  memoryLimit?: number
  isLagging: boolean
}

export class PerformanceTracker {
  private frameStartTime = 0
  private renderStartTime = 0
  private lastFrameTime = performance.now()
  private frameTimes: number[] = []
  private renderTimes: number[] = []
  private frameCount = 0
  private maxHistory = 60 // Keep 60 frames of history (1 second at 60fps)
  
  // Thresholds for performance warnings
  private readonly TARGET_FPS = 60
  private readonly LAG_THRESHOLD_FPS = 30
  private readonly LAG_THRESHOLD_FRAME_TIME = 33.33 // ms (30fps)

  constructor() {
    this.frameStartTime = performance.now()
  }

  /**
   * Mark the start of a new frame
   */
  startFrame(): void {
    this.frameStartTime = performance.now()
  }

  /**
   * Mark the start of render operations
   */
  startRender(): void {
    this.renderStartTime = performance.now()
  }

  /**
   * Mark the end of render operations
   */
  endRender(): void {
    if (this.renderStartTime > 0) {
      const renderTime = performance.now() - this.renderStartTime
      this.renderTimes.push(renderTime)
      if (this.renderTimes.length > this.maxHistory) {
        this.renderTimes.shift()
      }
    }
  }

  /**
   * Mark the end of a frame and calculate metrics
   */
  endFrame(): void {
    const now = performance.now()
    const frameTime = now - this.lastFrameTime
    
    this.frameTimes.push(frameTime)
    if (this.frameTimes.length > this.maxHistory) {
      this.frameTimes.shift()
    }
    
    this.lastFrameTime = now
    this.frameCount++
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    const recentFrameTimes = this.frameTimes.slice(-30) // Last 30 frames
    const recentRenderTimes = this.renderTimes.slice(-30) // Last 30 renders
    
    // FPS calculations
    const currentFrameTime = this.frameTimes[this.frameTimes.length - 1] || 16.67
    const fps = Math.round(1000 / currentFrameTime)
    const avgFrameTime = recentFrameTimes.length > 0 ? 
      recentFrameTimes.reduce((a, b) => a + b, 0) / recentFrameTimes.length : 16.67
    const avgFps = Math.round(1000 / avgFrameTime)
    const minFps = recentFrameTimes.length > 0 ? 
      Math.round(1000 / Math.max(...recentFrameTimes)) : fps
    const maxFps = recentFrameTimes.length > 0 ? 
      Math.round(1000 / Math.min(...recentFrameTimes)) : fps

    // Render time calculations
    const renderTime = this.renderTimes[this.renderTimes.length - 1] || 0
    const avgRenderTime = recentRenderTimes.length > 0 ? 
      recentRenderTimes.reduce((a, b) => a + b, 0) / recentRenderTimes.length : 0

    // Memory information (if available)
    let memoryUsed: number | undefined
    let memoryLimit: number | undefined
    if ('memory' in performance && (performance as any).memory) {
      const memory = (performance as any).memory
      memoryUsed = Math.round(memory.usedJSHeapSize / 1024 / 1024) // MB
      memoryLimit = Math.round(memory.jsHeapSizeLimit / 1024 / 1024) // MB
    }

    // Performance warnings
    const isLagging = avgFps < this.LAG_THRESHOLD_FPS || 
                     avgFrameTime > this.LAG_THRESHOLD_FRAME_TIME

    return {
      fps,
      avgFps,
      minFps,
      maxFps,
      frameTime: Math.round(currentFrameTime * 100) / 100,
      avgFrameTime: Math.round(avgFrameTime * 100) / 100,
      renderTime: Math.round(renderTime * 100) / 100,
      avgRenderTime: Math.round(avgRenderTime * 100) / 100,
      memoryUsed,
      memoryLimit,
      isLagging
    }
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.frameTimes = []
    this.renderTimes = []
    this.frameCount = 0
    this.frameStartTime = performance.now()
    this.lastFrameTime = this.frameStartTime
  }

  /**
   * Get a text summary of performance metrics
   */
  getSummary(): string[] {
    const metrics = this.getMetrics()
    const lines = []

    lines.push(`FPS: ${metrics.fps} (avg: ${metrics.avgFps}, ${metrics.minFps}-${metrics.maxFps})`)
    lines.push(`Frame: ${metrics.frameTime}ms (avg: ${metrics.avgFrameTime}ms)`)
    lines.push(`Render: ${metrics.renderTime}ms (avg: ${metrics.avgRenderTime}ms)`)
    
    if (metrics.memoryUsed !== undefined && metrics.memoryLimit !== undefined) {
      const memoryPercent = Math.round((metrics.memoryUsed / metrics.memoryLimit) * 100)
      lines.push(`Memory: ${metrics.memoryUsed}MB / ${metrics.memoryLimit}MB (${memoryPercent}%)`)
    }

    if (metrics.isLagging) {
      lines.push(`⚠️  Performance warning: Low FPS detected`)
    }

    return lines
  }
}

// Global performance tracker instance
export const performanceTracker = new PerformanceTracker()
