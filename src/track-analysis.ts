/**
 * Track Analysis Module - Single Source of Truth for Racing Lines and Track Data
 * 
 * This module analyzes the track geometry and provides:
 * - Optimal racing line waypoints
 * - Lap validation checkpoints  
 * - Racing direction determination
 * - Track boundary analysis
 * 
 * All other modules (AI, visualization, game logic) should import from here
 * to ensure consistency and eliminate duplication.
 */

import type { Vec, Segment } from './geometry'

// Track analysis results interface
export interface TrackAnalysis {
  // Basic track data
  outer: Vec[]
  inner: Vec[]
  startLine: Segment
  
  // Derived racing data
  racingDirection: 'clockwise' | 'counter-clockwise'
  optimalRacingLine: RacingLinePoint[]
  lapValidationCheckpoints: Segment[]
  safeZones: SafeZone[]
  
  // Helper data
  trackBounds: {
    minX: number
    maxX: number 
    minY: number
    maxY: number
  }
  innerBounds: {
    minX: number
    maxX: number
    minY: number
    maxY: number
  }
}

// Racing line point with full metadata
export interface RacingLinePoint {
  pos: Vec
  targetSpeed: number
  brakeZone: boolean
  cornerType: 'straight' | 'entry' | 'apex' | 'exit'
  safeZone: 'left' | 'right' | 'top' | 'bottom'
}

// Safe racing zones (areas outside inner boundary)
interface SafeZone {
  name: 'left' | 'right' | 'top' | 'bottom'
  bounds: {
    minX: number
    maxX: number
    minY: number  
    maxY: number
  }
  direction: Vec // Primary racing direction in this zone
}

/**
 * Analyze track geometry and generate optimal racing line
 * This is the single source of truth for all racing line data
 */
export function analyzeTrack(
  outer: Vec[], 
  inner: Vec[], 
  startLine: Segment
): TrackAnalysis {
  
  // Calculate track bounds
  const trackBounds = {
    minX: Math.min(...outer.map(p => p.x)),
    maxX: Math.max(...outer.map(p => p.x)),
    minY: Math.min(...outer.map(p => p.y)),
    maxY: Math.max(...outer.map(p => p.y))
  }
  
  const innerBounds = {
    minX: Math.min(...inner.map(p => p.x)),
    maxX: Math.max(...inner.map(p => p.x)),
    minY: Math.min(...inner.map(p => p.y)),
    maxY: Math.max(...inner.map(p => p.y))
  }
  
  // For our rectangular track, determine optimal racing direction
  // Start line is on the left side, cars start below it
  // Most natural flow: COUNTER-CLOCKWISE (start → down → right → up → left → finish)
  const racingDirection = 'counter-clockwise' as const
  
  // Define safe racing zones (areas outside the inner boundary)
  const safeZones: SafeZone[] = [
    {
      name: 'left',
      bounds: { 
        minX: trackBounds.minX + 1, 
        maxX: innerBounds.minX - 1, 
        minY: trackBounds.minY + 1, 
        maxY: trackBounds.maxY - 1 
      },
      direction: { x: 0.3, y: 1 } // Mainly downward for counter-clockwise
    },
    {
      name: 'bottom', 
      bounds: { 
        minX: trackBounds.minX + 1, 
        maxX: trackBounds.maxX - 1, 
        minY: innerBounds.maxY + 1, 
        maxY: trackBounds.maxY - 1 
      },
      direction: { x: 1, y: -0.3 } // Mainly rightward for counter-clockwise
    },
    {
      name: 'right',
      bounds: { 
        minX: innerBounds.maxX + 1, 
        maxX: trackBounds.maxX - 1, 
        minY: trackBounds.minY + 1, 
        maxY: trackBounds.maxY - 1 
      },
      direction: { x: -0.3, y: -1 } // Mainly upward for counter-clockwise
    },
    {
      name: 'top',
      bounds: { 
        minX: trackBounds.minX + 1, 
        maxX: trackBounds.maxX - 1, 
        minY: trackBounds.minY + 1, 
        maxY: innerBounds.minY - 1 
      },
      direction: { x: -1, y: 0.3 } // Mainly leftward for counter-clockwise
    }
  ]
  
  // Generate optimal racing line waypoints for COUNTER-CLOCKWISE racing
  // Track bounds: outer (2,2)-(48,33), inner (12,10)-(38,25)
  // This creates a smooth, wide racing line that maximizes speed and minimizes sharp turns
  const optimalRacingLine: RacingLinePoint[] = [
    // Start/finish area - optimized for maximum track width utilization
    { pos: { x: 5, y: 20 }, targetSpeed: 3, brakeZone: false, cornerType: 'straight', safeZone: 'left' },
    
    // Left side - maximize track width for better Turn 1 entry geometry
    { pos: { x: 5, y: 23 }, targetSpeed: 3, brakeZone: false, cornerType: 'straight', safeZone: 'left' },
    { pos: { x: 5, y: 26 }, targetSpeed: 3, brakeZone: false, cornerType: 'straight', safeZone: 'left' },
    
    // Turn 1: Left to bottom (optimized for maximum corner radius)
    { pos: { x: 8, y: 28 }, targetSpeed: 2, brakeZone: true, cornerType: 'entry', safeZone: 'left' },
    { pos: { x: 11, y: 31 }, targetSpeed: 2, brakeZone: false, cornerType: 'apex', safeZone: 'bottom' },
    { pos: { x: 18, y: 29 }, targetSpeed: 3, brakeZone: false, cornerType: 'exit', safeZone: 'bottom' },
    
    // Bottom straight - maximum speed on longest straight section
    { pos: { x: 25, y: 29 }, targetSpeed: 5, brakeZone: false, cornerType: 'straight', safeZone: 'bottom' },
    { pos: { x: 32, y: 29 }, targetSpeed: 4, brakeZone: false, cornerType: 'straight', safeZone: 'bottom' },
    
    // Turn 2: Bottom to right (optimized entry for better track width utilization)
    { pos: { x: 39, y: 29 }, targetSpeed: 2, brakeZone: true, cornerType: 'entry', safeZone: 'bottom' },
    { pos: { x: 42, y: 25 }, targetSpeed: 2, brakeZone: false, cornerType: 'apex', safeZone: 'right' },
    { pos: { x: 43, y: 20 }, targetSpeed: 3, brakeZone: false, cornerType: 'exit', safeZone: 'right' },
    
    // Right straight - maximize track width for consistent optimization
    { pos: { x: 43, y: 17 }, targetSpeed: 4, brakeZone: false, cornerType: 'straight', safeZone: 'right' },
    { pos: { x: 43, y: 14 }, targetSpeed: 4, brakeZone: false, cornerType: 'straight', safeZone: 'right' },
    
    // Turn 3: Right to top (wide entry, late apex, early exit)
    { pos: { x: 38, y: 8 }, targetSpeed: 2, brakeZone: true, cornerType: 'entry', safeZone: 'right' },
    { pos: { x: 32, y: 5 }, targetSpeed: 2, brakeZone: false, cornerType: 'apex', safeZone: 'top' },
    { pos: { x: 25, y: 6 }, targetSpeed: 3, brakeZone: false, cornerType: 'exit', safeZone: 'top' },
    
    // Top straight - fast section across the top
    { pos: { x: 20, y: 6 }, targetSpeed: 4, brakeZone: false, cornerType: 'straight', safeZone: 'top' },
    { pos: { x: 15, y: 6 }, targetSpeed: 4, brakeZone: false, cornerType: 'straight', safeZone: 'top' },
    
    // Turn 4: Top to left (wide entry, late apex, early exit)
    { pos: { x: 10, y: 8 }, targetSpeed: 2, brakeZone: true, cornerType: 'entry', safeZone: 'top' },
    { pos: { x: 6, y: 12 }, targetSpeed: 2, brakeZone: false, cornerType: 'apex', safeZone: 'left' },
    { pos: { x: 7, y: 16 }, targetSpeed: 3, brakeZone: false, cornerType: 'exit', safeZone: 'left' }
  ]
  
  // Generate lap validation checkpoints for COUNTER-CLOCKWISE racing
  // These should be placed to detect progression around the track
  const lapValidationCheckpoints: Segment[] = [
    // Checkpoint 0: Bottom side (first after start going counter-clockwise)
    { a: { x: 25, y: trackBounds.maxY }, b: { x: 25, y: innerBounds.maxY } },
    
    // Checkpoint 1: Right side (after turning from bottom)
    { a: { x: trackBounds.maxX, y: 17.5 }, b: { x: innerBounds.maxX, y: 17.5 } },
    
    // Checkpoint 2: Top side (after turning from right) 
    { a: { x: 25, y: innerBounds.minY }, b: { x: 25, y: trackBounds.minY } },
    
    // Checkpoint 3: Left side (after turning from top, before finish)
    { a: { x: innerBounds.minX, y: 17.5 }, b: { x: trackBounds.minX, y: 17.5 } }
  ]
  
  return {
    outer,
    inner, 
    startLine,
    racingDirection,
    optimalRacingLine,
    lapValidationCheckpoints,
    safeZones,
    trackBounds,
    innerBounds
  }
}

/**
 * Helper function to determine expected racing direction based on position
 * Uses the track analysis to provide consistent direction guidance
 */
export function getExpectedRacingDirection(pos: Vec, analysis: TrackAnalysis): Vec {
  // Find which safe zone this position is in
  for (const zone of analysis.safeZones) {
    if (pos.x >= zone.bounds.minX && pos.x <= zone.bounds.maxX &&
        pos.y >= zone.bounds.minY && pos.y <= zone.bounds.maxY) {
      return zone.direction
    }
  }
  
  // Fallback: determine by position relative to track center
  const centerX = (analysis.trackBounds.minX + analysis.trackBounds.maxX) / 2
  const centerY = (analysis.trackBounds.minY + analysis.trackBounds.maxY) / 2
  
  if (analysis.racingDirection === 'counter-clockwise') {
    if (pos.x < centerX) {
      return { x: 0.3, y: 1 } // Left side: go down
    } else if (pos.x > centerX) {
      return { x: -0.3, y: -1 } // Right side: go up
    } else if (pos.y < centerY) {
      return { x: -1, y: 0.3 } // Top: go left
    } else {
      return { x: 1, y: -0.3 } // Bottom: go right
    }
  } else {
    // Clockwise directions (if needed)
    if (pos.x < centerX) {
      return { x: 0.3, y: -1 } // Left side: go up
    } else if (pos.x > centerX) {
      return { x: -0.3, y: 1 } // Right side: go down
    } else if (pos.y < centerY) {
      return { x: 1, y: -0.3 } // Top: go right
    } else {
      return { x: -1, y: 0.3 } // Bottom: go left
    }
  }
}

/**
 * Determine crossing direction for lap validation
 * Considers the racing direction from track analysis
 */
export function determineCrossingDirection(
  fromPos: Vec, 
  toPos: Vec, 
  startLine: Segment, 
  analysis: TrackAnalysis
): 'forward' | 'backward' {
  const lineY = startLine.a.y
  const fromSide = fromPos.y < lineY ? 'top' : 'bottom'
  const toSide = toPos.y < lineY ? 'top' : 'bottom'
  
  if (analysis.racingDirection === 'counter-clockwise') {
    // For counter-clockwise: cars should approach from above (top) and cross downward (bottom) 
    if (fromSide === 'top' && toSide === 'bottom') {
      return 'forward'
    } else if (fromSide === 'bottom' && toSide === 'top') {
      return 'backward'
    }
  } else {
    // For clockwise: cars should approach from below (bottom) and cross upward (top)
    if (fromSide === 'bottom' && toSide === 'top') {
      return 'forward'
    } else if (fromSide === 'top' && toSide === 'bottom') {
      return 'backward'
    }
  }
  
  return 'forward' // Default fallback
}

/**
 * Find nearest racing line point with consistent logic
 * This replaces individual implementations in AI and visualization
 */
export function findNearestRacingLinePoint(pos: Vec, analysis: TrackAnalysis): RacingLinePoint {
  const racingLine = analysis.optimalRacingLine
  
  if (racingLine.length === 0) {
    // If no racing line, return a default point
    return {
      pos: { x: 7, y: 23 }, // Default to first waypoint
      targetSpeed: 2,
      brakeZone: false,
      cornerType: 'straight',
      safeZone: 'left'
    }
  }
  
  // Get expected direction to determine which waypoints are "ahead"
  const expectedDirection = getExpectedRacingDirection(pos, analysis)
  
  // Find the best forward-looking target by considering both distance and direction
  let bestIdx = 0
  let bestScore = -Infinity
  
  for (let i = 0; i < racingLine.length; i++) {
    const point = racingLine[i]
    if (!point) continue
    
    const dist = distance(pos, point.pos)
    const dirVector = {
      x: point.pos.x - pos.x,
      y: point.pos.y - pos.y
    }
    
    // Normalize direction vector
    const dirMagnitude = Math.hypot(dirVector.x, dirVector.y)
    if (dirMagnitude < 0.1) continue // Skip points too close
    
    const normalizedDir = {
      x: dirVector.x / dirMagnitude,
      y: dirVector.y / dirMagnitude
    }
    
    // Calculate alignment with expected racing direction
    const alignment = normalizedDir.x * expectedDirection.x + normalizedDir.y * expectedDirection.y
    
    // Score combines forward alignment with reasonable distance
    // Prefer points that are:
    // 1. In the forward direction (alignment > 0)
    // 2. Not too far away (distance < 15)
    // 3. Not too close (distance > 1)
    let score = 0
    
    if (alignment > 0.3) { // Must be reasonably forward
      score = alignment * 100 // Strong bonus for forward direction
      
      // Distance scoring - prefer moderate distances (2-8 units)
      if (dist >= 2 && dist <= 8) {
        score += (8 - Math.abs(dist - 5)) * 10 // Peak at distance 5
      } else if (dist > 8 && dist <= 15) {
        score += (15 - dist) * 2 // Declining for far targets
      } else if (dist > 15) {
        score -= dist // Penalty for very far targets
      }
      
      // Small bonus for closer targets if we need immediate guidance
      if (dist < 3) {
        score += 20
      }
    } else {
      // Heavy penalty for backward-pointing targets
      score = -100 - dist
    }
    
    if (score > bestScore) {
      bestScore = score
      bestIdx = i
    }
  }
  
  const targetPoint = racingLine[bestIdx]
  if (!targetPoint) {
    // Final fallback
    return racingLine[0] || {
      pos: { x: 7, y: 23 },
      targetSpeed: 2,
      brakeZone: false,
      cornerType: 'straight',
      safeZone: 'left'
    }
  }
  
  return targetPoint
}

/**
 * Distance helper function
 */
function distance(a: Vec, b: Vec): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.hypot(dx, dy)
}

/**
 * Create track analysis from game state geometry
 * This is the main entry point for other modules
 */
export function createTrackAnalysis(
  outer: Vec[], 
  inner: Vec[], 
  startLine: Segment
): TrackAnalysis {
  return analyzeTrack(outer, inner, startLine)
}
