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

/**
 * Performance benchmark test for visual enhancements
 * 
 * Runs a performance test for a specified duration and returns metrics
 */
export class PerformanceBenchmark {
  /**
   * Run a performance benchmark test
   * @param durationSeconds How long to run the test
   * @param renderCallback Function to call for each render
   * @returns Promise with benchmark results
   */
  static async runBenchmark(
    durationSeconds: number,
    renderCallback: () => void
  ): Promise<{
    duration: number
    frameCount: number
    avgFps: number
    minFps: number
    maxFps: number
    avgRenderTime: number
    maxRenderTime: number
    avgFrameTime: number
    maxFrameTime: number
    memoryStart?: number
    memoryEnd?: number
    memoryDelta?: number
    isLagging: boolean
    performance60FpsTarget: boolean
  }> {
    // Reset tracker before starting
    performanceTracker.reset()
    
    // Get initial memory if available
    let memoryStart: number | undefined
    if ('memory' in performance && (performance as any).memory) {
      memoryStart = Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)
    }
    
    const startTime = performance.now()
    const endTime = startTime + (durationSeconds * 1000)
    let frameCount = 0
    
    const renderLoop = (): Promise<void> => {
      return new Promise((resolve) => {
        const frame = () => {
          if (performance.now() >= endTime) {
            resolve()
            return
          }
          
          performanceTracker.startFrame()
          renderCallback()
          performanceTracker.endFrame()
          frameCount++
          
          requestAnimationFrame(frame)
        }
        requestAnimationFrame(frame)
      })
    }
    
    // Run the benchmark
    await renderLoop()
    
    // Get final metrics
    const metrics = performanceTracker.getMetrics()
    const actualDuration = (performance.now() - startTime) / 1000
    
    // Get final memory if available
    let memoryEnd: number | undefined
    let memoryDelta: number | undefined
    if ('memory' in performance && (performance as any).memory) {
      memoryEnd = Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)
      if (memoryStart !== undefined) {
        memoryDelta = memoryEnd - memoryStart
      }
    }
    
    return {
      duration: actualDuration,
      frameCount,
      avgFps: metrics.avgFps,
      minFps: metrics.minFps,
      maxFps: metrics.maxFps,
      avgRenderTime: metrics.avgRenderTime,
      maxRenderTime: Math.max(...performanceTracker['renderTimes']),
      avgFrameTime: metrics.avgFrameTime,
      maxFrameTime: Math.max(...performanceTracker['frameTimes']),
      memoryStart,
      memoryEnd,
      memoryDelta,
      isLagging: metrics.isLagging,
      performance60FpsTarget: metrics.avgFps >= 55 // Close to 60fps target
    }
  }
  
  /**
   * Compare current performance with baseline
   * @param baselineFps Previous average FPS
   * @param currentFps Current average FPS
   * @returns Performance comparison info
   */
  static comparePerformance(baselineFps: number, currentFps: number): {
    deltaFps: number
    deltaPercent: number
    improved: boolean
    maintained: boolean
    regressed: boolean
    acceptable: boolean
  } {
    const deltaFps = currentFps - baselineFps
    const deltaPercent = Math.round(((currentFps / baselineFps) - 1) * 100 * 100) / 100
    
    const improved = deltaFps > 2
    const regressed = deltaFps < -5 // More than 5fps drop is concerning
    const maintained = Math.abs(deltaFps) <= 2
    const acceptable = currentFps >= 45 && deltaFps > -10 // Still playable
    
    return {
      deltaFps: Math.round(deltaFps * 100) / 100,
      deltaPercent,
      improved,
      maintained,
      regressed,
      acceptable
    }
  }
  
  /**
   * Generate a performance report
   */
  static generateReport(results: any): string[] {
    const report = []
    
    report.push(`📊 Performance Benchmark Results:`)
    report.push(`Duration: ${results.duration.toFixed(1)}s`)
    report.push(`Frames: ${results.frameCount} (${results.avgFps} avg fps)`)
    report.push(`FPS Range: ${results.minFps} - ${results.maxFps}`)
    report.push(`Render Time: ${results.avgRenderTime.toFixed(2)}ms avg (max: ${results.maxRenderTime.toFixed(2)}ms)`)
    report.push(`Frame Time: ${results.avgFrameTime.toFixed(2)}ms avg (max: ${results.maxFrameTime.toFixed(2)}ms)`)
    
    if (results.memoryStart !== undefined && results.memoryEnd !== undefined) {
      report.push(`Memory: ${results.memoryStart}MB → ${results.memoryEnd}MB (${results.memoryDelta > 0 ? '+' : ''}${results.memoryDelta}MB)`)
    }
    
    // Performance assessment
    if (results.performance60FpsTarget) {
      report.push(`✅ Performance: Excellent (near 60fps target)`)
    } else if (results.avgFps >= 45) {
      report.push(`👍 Performance: Good (playable)`)
    } else if (results.avgFps >= 30) {
      report.push(`⚠️ Performance: Fair (may feel choppy)`)
    } else {
      report.push(`❌ Performance: Poor (needs optimization)`)
    }
    
    if (results.isLagging) {
      report.push(`⚠️ Lag detected: Frame drops or slow rendering`)
    }
    
    return report
  }
}
