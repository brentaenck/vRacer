/**
 * AI Players for vRacer - Phase 1 Enhanced Strategic AI
 *
 * Advanced AI system with:
 * - Dynamic racing line calculation
 * - Multi-turn path planning (3-5 moves ahead)
 * - Enhanced collision avoidance and overtaking
 * - Difficulty-based strategies with realistic racing behaviors
 * 
 * Difficulty Levels:
 * - Easy: Conservative racing with occasional mistakes
 * - Medium: Balanced racing with good racecraft
 * - Hard: Aggressive optimal racing with advanced strategies
 */

import { isFeatureEnabled } from './features'
import { getCurrentCar, getCurrentPlayer, isMultiCarGame, legalStepOptions, pathLegal, stepOptions, pointInPoly, type GameState } from './game'
import { createTrackAnalysisWithCustomLine, getExpectedRacingDirection as getExpectedDirection, findNearestRacingLinePoint, type TrackAnalysis, type RacingLinePoint } from './track-analysis'
import type { Vec } from './geometry'

// Use unified track analysis for consistent racing line
function computeRacingLine(state: GameState): RacingLinePoint[] {
  // Create track analysis - single source of truth
  const trackAnalysis = createTrackAnalysisWithCustomLine(state.outer, state.inner, state.start)
  
  // Convert unified racing line format to AI format for backward compatibility
  return trackAnalysis.optimalRacingLine.map(point => ({
    pos: point.pos,
    targetSpeed: point.targetSpeed,
    brakeZone: point.brakeZone,
    cornerType: point.cornerType,
    safeZone: point.safeZone
  }))
}

// Calculate curvature at a point to detect corners
function calculateCurvature(p1: Vec, p2: Vec, p3: Vec): number {
  const v1x = p2.x - p1.x
  const v1y = p2.y - p1.y
  const v2x = p3.x - p2.x
  const v2y = p3.y - p2.y
  
  const crossProduct = v1x * v2y - v1y * v2x
  const magnitude1 = Math.hypot(v1x, v1y)
  const magnitude2 = Math.hypot(v2x, v2y)
  
  if (magnitude1 === 0 || magnitude2 === 0) return 0
  
  return crossProduct / (magnitude1 * magnitude2)
}

// Analyze what phase of corner we're in
function analyzeCornerPhase(index: number, trackLength: number, outer: Vec[]): 'entry' | 'apex' | 'exit' {
  const windowSize = Math.max(2, Math.floor(trackLength / 12)) // adaptive window
  let maxCurvature = 0
  let maxIndex = index
  
  // Find the point of maximum curvature in local area
  for (let i = -windowSize; i <= windowSize; i++) {
    const idx = (index + i + trackLength) % trackLength
    const prev = outer[(idx - 1 + trackLength) % trackLength]!
    const curr = outer[idx]!
    const next = outer[(idx + 1) % trackLength]!
    
    const curvature = Math.abs(calculateCurvature(prev, curr, next))
    if (curvature > maxCurvature) {
      maxCurvature = curvature
      maxIndex = idx
    }
  }
  
  // Determine phase based on position relative to apex
  const relativePosition = (index - maxIndex + trackLength) % trackLength
  const halfWindow = windowSize / 2
  
  if (relativePosition < halfWindow || relativePosition > trackLength - halfWindow) {
    return 'apex'
  } else if (relativePosition < windowSize) {
    return 'exit'
  } else {
    return 'entry'
  }
}

// Use distance function from track-analysis (imported as findNearestPoint helper)
function distance(a: Vec, b: Vec): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.hypot(dx, dy)
}

// Helper function to find distance to the next corner
function getDistanceToNextCorner(pos: Vec, racingLine: RacingLinePoint[]): number {
  let minDistance = Infinity
  
  for (const point of racingLine) {
    if (point.cornerType === 'entry' || point.cornerType === 'apex') {
      const dist = distance(pos, point.pos)
      if (dist < minDistance) {
        minDistance = dist
      }
    }
  }
  
  return minDistance
}

// Helper function to get the next corner point
function getNextCorner(pos: Vec, racingLine: RacingLinePoint[]): RacingLinePoint | null {
  let nextCorner: RacingLinePoint | null = null
  let minDistance = Infinity
  
  for (const point of racingLine) {
    if (point.cornerType === 'entry' || point.cornerType === 'apex') {
      const dist = distance(pos, point.pos)
      if (dist < minDistance) {
        minDistance = dist
        nextCorner = point
      }
    }
  }
  
  return nextCorner
}

// Multi-turn path planning - simulate moves ahead
interface PathNode {
  pos: Vec
  vel: Vec
  acc: Vec
  totalScore: number
  depth: number
  parent?: PathNode
}

// Helper function for quick track boundary checking
function insideTrack(p: Vec, state: GameState): boolean {
  // Inside outer and outside inner
  const inOuter = pointInPoly(p, state.outer)
  const inInner = pointInPoly(p, state.inner)
  return inOuter && !inInner
}

// Plan multiple moves ahead using recursive path evaluation
// Lightweight path legality check for AI planning - much faster than full pathLegal
function quickPathLegalCheck(startPos: Vec, newPos: Vec, state: GameState): boolean {
  // Only check the endpoints and midpoint instead of many samples
  if (!insideTrack(startPos, state) || !insideTrack(newPos, state)) {
    return false;
  }
  
  // Check midpoint as well
  const midpoint = { 
    x: (startPos.x + newPos.x) / 2, 
    y: (startPos.y + newPos.y) / 2 
  };
  return insideTrack(midpoint, state);
}

function planPath(
  state: GameState,
  startPos: Vec,
  startVel: Vec,
  racingLine: RacingLinePoint[],
  depth: number,
  maxDepth: number,
  difficulty: 'easy' | 'medium' | 'hard'
): PathNode | null {
  // Add safety guards
  if (depth >= maxDepth) return null;
  
  // Limit the search depth based on difficulty
  const lookAheadDepth = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3;
  if (depth >= lookAheadDepth) return null;
  
  // Get legal moves from current position/velocity
  const possibleMoves = [];
  for (let ax = -1; ax <= 1; ax++) {
    for (let ay = -1; ay <= 1; ay++) {
      const newVel = { x: startVel.x + ax, y: startVel.y + ay };
      const newPos = { x: startPos.x + newVel.x, y: startPos.y + newVel.y };
      
      // Use optimized legality check for planning
      if (quickPathLegalCheck(startPos, newPos, state)) {
        possibleMoves.push({
          pos: newPos,
          vel: newVel,
          acc: { x: ax, y: ay },
          totalScore: 0,
          depth
        });
      }
    }
  }
  
  if (possibleMoves.length === 0) {
    if (isFeatureEnabled('debugMode')) {
      console.log(`🔍 No legal moves found at depth ${depth}`);
    }
    return null;
  }
  
  let bestNode: PathNode | null = null;
  let bestScore = -Infinity;
  
  // Safety counter to prevent excessive iterations
  const maxMoves = Math.min(possibleMoves.length, 9);
  
  for (let i = 0; i < maxMoves; i++) {
    const move = possibleMoves[i]!;
    
    // CRITICAL: Apply same backward movement check as scoreAdvancedMove
    const currentCar = getCurrentCar(state)!
    
    // Create track analysis for consistent direction checking
    const trackAnalysis = createTrackAnalysisWithCustomLine(state.outer, state.inner, state.start)
    const expectedDirection = getExpectedDirection(currentCar.pos, trackAnalysis)
    const velocityAlignment = move.vel.x * expectedDirection.x + move.vel.y * expectedDirection.y
    const futureSpeed = Math.hypot(move.vel.x, move.vel.y)
    
    // Skip backward moves entirely in path planning
    if (velocityAlignment < -0.5 && futureSpeed > 1) {
      continue; // Skip this move completely rather than score it
    }
    
    // CRITICAL: Skip zero velocity moves in path planning
    if (futureSpeed === 0) {
      if (isFeatureEnabled('debugMode')) {
        console.log(`🛑 Path planning: Skipping zero velocity move {x:${move.acc.x}, y:${move.acc.y}} (would result in speed=0)`)
      }
      continue; // Skip zero velocity moves entirely
    }
    
    // Score this immediate move
    const target = findNearestRacingLineTarget(move.pos, racingLine);
    const immediateScore = scoreSimplifiedMove(state, move.pos, move.vel, target, difficulty);
    
    // Recursively plan ahead if we're not at max depth
    let futureScore = 0;
    if (depth < lookAheadDepth - 1) {
      try {
        const futureNode = planPath(state, move.pos, move.vel, racingLine, depth + 1, maxDepth, difficulty);
        if (futureNode) {
          futureScore = futureNode.totalScore * 0.7; // discount future rewards
        }
      } catch (error) {
        if (isFeatureEnabled('debugMode')) {
          console.warn(`⚠️ Error in path planning at depth ${depth}:`, error);
        }
        // Continue with just the immediate score
      }
    }
    
    const totalScore = immediateScore + futureScore;
    
    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestNode = {
        ...move,
        totalScore,
        parent: undefined
      };
    }
  }
  
  return bestNode
}

// CRITICAL FIX: Find the next waypoint ahead in racing direction, not just the nearest one
function findNearestRacingLineTarget(pos: Vec, racingLine: RacingLinePoint[]): RacingLinePoint {
  if (racingLine.length === 0) {
    throw new Error('Racing line is empty')
  }
  
  // First, find the closest waypoint to establish our current position on the racing line
  let closestIdx = 0
  let closestDistance = Infinity
  
  for (let i = 0; i < racingLine.length; i++) {
    const dist = distance(pos, racingLine[i]!.pos)
    if (dist < closestDistance) {
      closestDistance = dist
      closestIdx = i
    }
  }
  
  // Now find the next waypoint ahead that we should be targeting
  // Look ahead 2-4 waypoints from our current closest position
  const lookAheadMin = Math.min(2, Math.floor(racingLine.length * 0.05)) // At least 2 waypoints or 5% of track
  const lookAheadMax = Math.min(6, Math.floor(racingLine.length * 0.15)) // At most 6 waypoints or 15% of track
  
  // Choose look-ahead distance based on current speed and distance to closest waypoint
  let lookAhead = lookAheadMin
  if (closestDistance < 3) {
    // We're very close to the current waypoint, look further ahead
    lookAhead = lookAheadMax
  } else if (closestDistance < 6) {
    // We're reasonably close, moderate look-ahead
    lookAhead = Math.floor((lookAheadMin + lookAheadMax) / 2)
  }
  
  // Calculate target index (wrap around for circular track)
  const targetIdx = (closestIdx + lookAhead) % racingLine.length
  const targetWaypoint = racingLine[targetIdx]!
  
  if (isFeatureEnabled('debugMode')) {
    console.log(`🎯 Waypoint selection: closest=${closestIdx} (dist=${closestDistance.toFixed(1)}), target=${targetIdx} (lookahead=${lookAhead})`)
  }
  
  return targetWaypoint
}

// Use the single source of truth from track-analysis.ts
// This wrapper function provides backward compatibility for existing AI code
function getExpectedRacingDirection(pos: Vec): Vec {
  // Create a minimal track analysis object to use the centralized function
  const mockAnalysis: TrackAnalysis = {
    outer: [],
    inner: [],
    startLine: { a: { x: 0, y: 0 }, b: { x: 0, y: 0 } },
    racingDirection: 'counter-clockwise',
    optimalRacingLine: [],
    lapValidationCheckpoints: [],
    safeZones: [
      {
        name: 'left',
        bounds: { minX: 3, maxX: 11, minY: 3, maxY: 32 },
        direction: { x: 0.3, y: 1 }
      },
      {
        name: 'bottom', 
        bounds: { minX: 3, maxX: 47, minY: 26, maxY: 32 },
        direction: { x: 1, y: -0.3 }
      },
      {
        name: 'right',
        bounds: { minX: 39, maxX: 47, minY: 3, maxY: 32 },
        direction: { x: -0.3, y: -1 }
      },
      {
        name: 'top',
        bounds: { minX: 3, maxX: 47, minY: 3, maxY: 9 },
        direction: { x: -1, y: 0.3 }
      }
    ],
    trackBounds: { minX: 2, maxX: 48, minY: 2, maxY: 33 },
    innerBounds: { minX: 12, maxX: 38, minY: 10, maxY: 25 }
  }
  
  // Use the centralized function from track-analysis.ts
  return getExpectedDirection(pos, mockAnalysis)
}

// Calculate bonus for targets that are in the racing direction
function calculateDirectionBonus(currentPos: Vec, targetPos: Vec, isAtStart = false): number {
  // For COUNTER-CLOCKWISE racing on our rectangular track,
  // we want to encourage movement in the right direction
  
  const dx = targetPos.x - currentPos.x
  const dy = targetPos.y - currentPos.y
  
  // SPECIAL HANDLING: If at start position, heavily favor going DOWN (positive dy) for COUNTER-CLOCKWISE
  // and strongly penalize horizontal movement until we've moved down enough
  if (isAtStart) {
    // Strong enforcement to move DOWN first (vertical movement)
    if (dy > 1 && Math.abs(dx) <= dy) return 15 // Very strong bonus for going mostly DOWN from start
    if (dy > 0) return 5 // Good bonus for going down
    if (dy < -1) return -10 // Strong penalty for going UP from start (wrong way for counter-clockwise)
    if (Math.abs(dx) > Math.abs(dy) && currentPos.y < 24) return -8 // Heavy penalty for moving horizontally too early
    if (dx > 0 && currentPos.y >= 24) return 3 // Only allow rightward movement after going down enough
    return 0
  }
  
  // COUNTER-CLOCKWISE track position logic
  // Determine which part of the track we're likely on
  if (currentPos.x < 15) {
    // Left side of track - want to go DOWN (positive y) for counter-clockwise
    if (dy > 0) return 3 // Going down is good for counter-clockwise
    if (dx > 0) return 2 // Going right is okay
  } else if (currentPos.x > 35) {
    // Right side of track - want to go UP (negative y) for counter-clockwise  
    if (dy < 0) return 3 // Going up is good for counter-clockwise
    if (dx < 0) return 2 // Going left is okay
  } else {
    // Top or bottom of track
    if (currentPos.y < 15) {
      // Top of track - want to go LEFT (negative x) for counter-clockwise (FIXED)
      if (dx < 0) return 3
    } else {
      // Bottom of track - want to go RIGHT (positive x) for counter-clockwise (FIXED)
      if (dx > 0) return 3
    }
  }
  
  return 0 // No particular direction bonus
}

// Evaluate how well the velocity aligns with track direction
function evaluateVelocityAlignment(pos: Vec, vel: Vec): number {
  // For COUNTER-CLOCKWISE racing, ideal velocity directions based on track position
  const speed = Math.hypot(vel.x, vel.y)
  if (speed < 0.5) return 0 // Stationary or very slow - no alignment bonus/penalty
  
  // Normalize velocity to get direction
  const velDirection = { x: vel.x / speed, y: vel.y / speed }
  
  let idealDirection = { x: 0, y: 0 }
  let alignmentScore = 0
  
  // Determine ideal direction based on track position for COUNTER-CLOCKWISE racing
  if (pos.x < 15) {
    // Left side of track - should be moving DOWN (positive y) primarily for counter-clockwise
    idealDirection = { x: 0.3, y: 1 }
  } else if (pos.x > 35) {
    // Right side of track - should be moving UP (negative y) primarily for counter-clockwise
    idealDirection = { x: -0.3, y: -1 }
  } else if (pos.y < 15) {
    // Top of track - should be moving LEFT (negative x) primarily for counter-clockwise (FIXED)
    idealDirection = { x: -1, y: 0.3 }
  } else {
    // Bottom of track - should be moving RIGHT (positive x) primarily for counter-clockwise (FIXED)
    idealDirection = { x: 1, y: -0.3 }
  }
  
  // Normalize ideal direction
  const idealMagnitude = Math.hypot(idealDirection.x, idealDirection.y)
  if (idealMagnitude > 0) {
    idealDirection.x /= idealMagnitude
    idealDirection.y /= idealMagnitude
    
    // Calculate dot product to measure alignment
    const dotProduct = velDirection.x * idealDirection.x + velDirection.y * idealDirection.y
    
    // Dot product ranges from -1 (opposite direction) to 1 (perfect alignment)
    // Convert to scoring bonus/penalty
    alignmentScore = dotProduct * 5 // Scale the effect
    
    // Extra penalty for going significantly wrong direction
    if (dotProduct < -0.5) {
      alignmentScore -= 10 // Strong penalty for going backwards
    }
  }
  
  return alignmentScore
}

// Calculate safe maximum speed based on context
function getSafeMaxSpeed(
  targetPoint: RacingLinePoint,
  difficulty: 'easy' | 'medium' | 'hard',
  lineDistance: number
): number {
  // Base safe speeds by difficulty - INCREASED for better racing
  let baseMax: number
  switch (difficulty) {
    case 'easy':
      baseMax = 4 // Less conservative
      break
    case 'medium':
      baseMax = 6 // More reasonable for racing
      break
    case 'hard':
      baseMax = 8 // Allow proper racing speeds
      break
  }
  
  // Adjust based on corner type - LESS restrictive
  let cornerMultiplier = 1.0
  switch (targetPoint.cornerType) {
    case 'apex':
      cornerMultiplier = 0.75 // Less restrictive in apex
      break
    case 'entry':
      cornerMultiplier = 0.85 // Less restrictive for corner entry
      break
    case 'exit':
      cornerMultiplier = 1.0 // Full speed allowed on exit
      break
    case 'straight':
      cornerMultiplier = 1.3 // Allow higher speeds on straights
      break
  }
  
  // Adjust for distance from racing line (further = slower) - LESS restrictive
  let lineMultiplier = 1.0
  if (lineDistance > 5) { // Only penalize when far off line
    lineMultiplier = Math.max(0.8, 1.0 - (lineDistance - 5) * 0.05)
  }
  
  // Brake zone restrictions - LESS restrictive
  if (targetPoint.brakeZone) {
    cornerMultiplier *= 0.9 // Less reduction in brake zones
  }
  
  const safeSpeed = baseMax * cornerMultiplier * lineMultiplier
  
  // Allow higher maximum speeds
  return Math.min(safeSpeed, 10)
}

// Track recent positions to detect circular motion - using move counter instead of unreliable turn tracking
let recentPositions: { pos: Vec, moveIndex: number }[] = []
let circularMotionDetected = false
let circularMotionCounter = 0
let globalMoveCounter = 0 // Global counter to track AI moves across all calls

// PHASE 1 COMPLETE: Optimized AI scoring system
// Focus on 6 CORE factors only: Progress, Speed, Safety, Racing Line, Direction, Start Handling
// This eliminates the 15+ factor complexity that caused conflicting priorities
function scoreSimplifiedMove(
  state: GameState,
  nextPos: Vec,
  velAfter: Vec,
  targetPoint: RacingLinePoint,
  difficulty: 'easy' | 'medium' | 'hard'
): number {
  const currentCar = getCurrentCar(state)!
  const futureSpeed = Math.hypot(velAfter.x, velAfter.y)
  const currentSpeed = Math.hypot(currentCar.vel.x, currentCar.vel.y)
  let score = 0
  
  // 1. PROGRESS FACTOR: Encourage movement in the racing direction
  const trackAnalysis = createTrackAnalysisWithCustomLine(state.outer, state.inner, state.start)
  const expectedDirection = getExpectedDirection(currentCar.pos, trackAnalysis)
  const velocityAlignment = velAfter.x * expectedDirection.x + velAfter.y * expectedDirection.y
  
  // CRITICAL FIX: Much more aggressive backward movement prevention
  // Strong bonus for forward movement, absolutely devastating penalty for backward
  if (velocityAlignment > 0.1) {
    score += velocityAlignment * 60 // Strong bonus for good direction
  } else if (futureSpeed > 0.5) {
    // CRITICAL: Make backward movement essentially impossible to select
    score -= 500 // Devastating penalty for backward movement
    
    // Additional penalty scaling with speed - faster backward is worse
    score -= futureSpeed * 100
    
    // Debug logging for backward move detection
    if (isFeatureEnabled('debugMode')) {
      console.warn(`🚫 AI backward movement detected: velocity=(${velAfter.x.toFixed(1)}, ${velAfter.y.toFixed(1)}), alignment=${velocityAlignment.toFixed(3)}, speed=${futureSpeed.toFixed(1)}`)
    }
  }
  
  // 2. SPEED FACTOR: Much more conservative speed management
  let targetSpeedRange: [number, number]
  switch (difficulty) {
    case 'easy':
      targetSpeedRange = [1, 2.5] // Very conservative to ensure safety
      break
    case 'medium':
      targetSpeedRange = [1, 3] // Conservative but functional
      break
    case 'hard':
      targetSpeedRange = [2, 3.5] // Still conservative until we prove safety
      break
  }
  
  // CRITICAL SAFETY: Much more aggressive speed control
  const CRASH_PREVENTION_SPEED = 3.0 // Reduced from 4.5 to 3.0
  if (futureSpeed > CRASH_PREVENTION_SPEED) {
    // MASSIVE penalty for dangerous speeds
    const overspeed = futureSpeed - CRASH_PREVENTION_SPEED
    score -= overspeed * overspeed * 200 // Increased from 80 to 200
    
    if (isFeatureEnabled('debugMode')) {
      console.warn(`⚠️ AI crash prevention: speed ${futureSpeed.toFixed(1)} > ${CRASH_PREVENTION_SPEED}, penalty: ${(overspeed * overspeed * 200).toFixed(0)}`)
    }
  }
  
  // CORNER APPROACH SAFETY: Extra penalties for high speeds near corners
  if (targetPoint.cornerType === 'entry' || targetPoint.brakeZone) {
    const CORNER_SAFE_SPEED = 3.5
    if (futureSpeed > CORNER_SAFE_SPEED) {
      const cornerOverspeed = futureSpeed - CORNER_SAFE_SPEED
      score -= cornerOverspeed * cornerOverspeed * 60 // Heavy penalty for fast corner approach
      
      if (isFeatureEnabled('debugMode')) {
        console.warn(`⚠️ AI corner safety: speed ${futureSpeed.toFixed(1)} > ${CORNER_SAFE_SPEED} at ${targetPoint.cornerType}, penalty: ${(cornerOverspeed * cornerOverspeed * 60).toFixed(0)}`)
      }
    }
  }
  
  const [minSpeed, maxSpeed] = targetSpeedRange
  if (futureSpeed >= minSpeed && futureSpeed <= maxSpeed) {
    score += 30 // Bonus for ideal speed range
  } else if (futureSpeed < minSpeed) {
    score -= (minSpeed - futureSpeed) * 15 // Penalty for being too slow
  } else if (futureSpeed > maxSpeed) {
    score -= (futureSpeed - maxSpeed) * 10 // Penalty for being too fast (but less severe)
  }
  
  // Special speed bonus for acceleration from low speeds
  if (futureSpeed > currentSpeed && currentSpeed < 2) {
    score += 25 // Strong bonus for getting moving
  }
  
  // 3. SAFETY FACTOR: Avoid crashes and dangerous positions
  // CRITICAL: Check if this move leads to an illegal position next turn
  const futurePos = { x: nextPos.x + velAfter.x, y: nextPos.y + velAfter.y }
  
  // Calculate racing line distance early for penalty reductions
  const distanceToRacingLine = distance(nextPos, targetPoint.pos)
  const nearRacingLine = distanceToRacingLine < 10
  const boundaryReduction = nearRacingLine ? 0.6 : 1.0 // 40% penalty reduction near racing line
  
  // Check if future position would be outside track boundaries
  const futureOutsideTrack = (
    futurePos.x <= 2 || futurePos.x >= 48 || 
    futurePos.y <= 2 || futurePos.y >= 33 ||
    (futurePos.x >= 12 && futurePos.x <= 38 && futurePos.y >= 10 && futurePos.y <= 25) // Inside inner boundary
  )
  
  // ENHANCED: More aggressive predictive crash prevention - but reduced near racing line
  if (futureOutsideTrack) {
    // Reduce crash penalty when near racing line to allow more aggressive racing
    const crashPenalty = nearRacingLine ? 1500 : 2000
    score -= crashPenalty
    
    if (isFeatureEnabled('debugMode')) {
      console.warn(`⚠️ AI PREDICTIVE CRASH: move ${JSON.stringify({x: velAfter.x, y: velAfter.y})} -> future pos (${futurePos.x.toFixed(1)}, ${futurePos.y.toFixed(1)}) is ILLEGAL! Penalty: -${crashPenalty}${nearRacingLine ? ' (racing line bonus)' : ''}`)
    }
  }
  
  // ENHANCED BOUNDARY AWARENESS: Progressive warnings based on proximity
  const OUTER_MARGIN_1 = 6.0  // First warning zone
  const OUTER_MARGIN_2 = 4.0  // Second warning zone  
  const OUTER_MARGIN_3 = 2.5  // Critical danger zone
  
  // Calculate distance to each boundary
  const leftDist = nextPos.x - 2
  const rightDist = 48 - nextPos.x
  const topDist = nextPos.y - 2
  const bottomDist = 33 - nextPos.y
  const minBoundaryDist = Math.min(leftDist, rightDist, topDist, bottomDist)
  
  // Use previously calculated racing line variables for boundary penalties
  // PROGRESSIVE BOUNDARY PENALTIES based on distance and speed - REDUCED for better racing
  if (minBoundaryDist < OUTER_MARGIN_3) {
    // CRITICAL: Very close to boundary - severe penalties
    const baseProximityPenalty = (OUTER_MARGIN_3 - minBoundaryDist) * 250 // Reduced from 300
    const baseSpeedPenalty = futureSpeed * 150 // Reduced from 200
    const proximityPenalty = baseProximityPenalty * boundaryReduction
    const speedPenalty = baseSpeedPenalty * boundaryReduction
    score -= proximityPenalty + speedPenalty
    
    if (isFeatureEnabled('debugMode')) {
      console.warn(`🚨 AI CRITICAL boundary proximity: dist=${minBoundaryDist.toFixed(1)}, speed=${futureSpeed.toFixed(1)}, penalty: ${(proximityPenalty + speedPenalty).toFixed(0)}${nearRacingLine ? ' (racing line bonus)' : ''}`)
    }
  } else if (minBoundaryDist < OUTER_MARGIN_2) {
    // WARNING: Close to boundary - moderate penalties  
    const baseProximityPenalty = (OUTER_MARGIN_2 - minBoundaryDist) * 80 // Reduced from 100
    const baseSpeedPenalty = futureSpeed > 2.0 ? (futureSpeed - 2.0) * 120 : 0 // Reduced from 150
    const proximityPenalty = baseProximityPenalty * boundaryReduction
    const speedPenalty = baseSpeedPenalty * boundaryReduction
    score -= proximityPenalty + speedPenalty
    
    if (isFeatureEnabled('debugMode') && speedPenalty > 0) {
      console.warn(`⚠️ AI boundary warning: dist=${minBoundaryDist.toFixed(1)}, speed=${futureSpeed.toFixed(1)}, penalty: ${(proximityPenalty + speedPenalty).toFixed(0)}${nearRacingLine ? ' (racing line bonus)' : ''}`)
    }
  } else if (minBoundaryDist < OUTER_MARGIN_1) {
    // CAUTION: Approaching boundary - light penalties for high speed
    const baseSpeedPenalty = futureSpeed > 3.5 ? (futureSpeed - 3.5) * 40 : 0 // Reduced from 50
    const speedPenalty = baseSpeedPenalty * boundaryReduction
    score -= speedPenalty
  }
  
  // PREDICTIVE SAFETY: Check if we're heading toward boundaries - REDUCED penalties
  const predictivePos = { x: nextPos.x + velAfter.x, y: nextPos.y + velAfter.y }
  const futureBoundaryDist = Math.min(
    predictivePos.x - 2, 48 - predictivePos.x, predictivePos.y - 2, 33 - predictivePos.y
  )
  
  if (futureBoundaryDist < 1.0) {
    // Next move after this one would be very close to boundary
    const basePenalty = (1.0 - futureBoundaryDist) * 350 // Reduced from 400
    const penalty = basePenalty * boundaryReduction
    score -= penalty
    
    if (isFeatureEnabled('debugMode')) {
      console.warn(`🚨 AI predictive boundary danger: future dist=${futureBoundaryDist.toFixed(1)}, penalty: ${penalty.toFixed(0)}${nearRacingLine ? ' (racing line bonus)' : ''}`)
    }
  }
  
  // Track boundaries with safety margins for current position
  const OUTER_MARGIN = 2.0
  const INNER_MARGIN = 1.5
  
  // Check distance to outer walls
  const distToWalls = Math.min(
    nextPos.x - 2,        // Left wall
    48 - nextPos.x,       // Right wall  
    nextPos.y - 2,        // Top wall
    33 - nextPos.y        // Bottom wall
  )
  
  if (distToWalls < OUTER_MARGIN) {
    score -= (OUTER_MARGIN - distToWalls) * 100 // Heavy penalty for approaching walls
  }
  
  // Check distance to inner walls
  if (nextPos.x >= 12 && nextPos.x <= 38 && nextPos.y >= 10 && nextPos.y <= 25) {
    const distToInner = Math.min(
      nextPos.x - 12,
      38 - nextPos.x,
      nextPos.y - 10, 
      25 - nextPos.y
    )
    
    if (distToInner < INNER_MARGIN) {
      score -= (INNER_MARGIN - distToInner) * 80 // Penalty for approaching inner walls
    }
  }
  
  // 4. RACING LINE FACTOR: Stay reasonably close to optimal path - ENHANCED
  // Note: distanceToRacingLine already calculated above for boundary reduction
  score -= distanceToRacingLine * 6 // Reduced from 8 to allow more flexibility
  
  // Progressive penalty for being very far off line - less aggressive
  if (distanceToRacingLine > 10) { // Increased threshold from 8
    score -= Math.pow(distanceToRacingLine - 10, 1.3) * 4 // Reduced from 1.5 * 5
  }
  
  // Extra acceleration bonus on corner exits when following racing line
  if (targetPoint.cornerType === 'exit' && distanceToRacingLine < 8 && futureSpeed > currentSpeed) {
    score += (futureSpeed - currentSpeed) * 15 // Bonus for accelerating out of corners
  }
  
  // ENHANCED: Strong bonus for being close to racing line
  if (distanceToRacingLine <= 5) {
    const proximityBonus = (5 - distanceToRacingLine) * 25 // Strong bonus for being close
    score += proximityBonus
    
    if (isFeatureEnabled('debugMode') && proximityBonus > 20) {
      console.log(`🎯 AI racing line proximity bonus: dist=${distanceToRacingLine.toFixed(1)}, bonus=+${proximityBonus.toFixed(0)}`)
    }
  }
  
  // ENHANCED: Racing line attraction - start earlier and be more aggressive
  // This helps the AI get back on track when safety measures push it off course
  const currentLineDistance = distance(currentCar.pos, targetPoint.pos)
  if (currentLineDistance > 5) { // Reduced threshold from 6 to 5
    // We're far from racing line - add strong attraction toward it
    const currentToTarget = {
      x: targetPoint.pos.x - currentCar.pos.x,
      y: targetPoint.pos.y - currentCar.pos.y
    }
    const currentToTargetMagnitude = Math.hypot(currentToTarget.x, currentToTarget.y)
    
    if (currentToTargetMagnitude > 0) {
      // Normalize direction toward racing line
      const raceLineDirection = {
        x: currentToTarget.x / currentToTargetMagnitude,
        y: currentToTarget.y / currentToTargetMagnitude
      }
      
      // Calculate how much this move aligns with getting back to racing line
      const moveDirection = {
        x: nextPos.x - currentCar.pos.x,
        y: nextPos.y - currentCar.pos.y
      }
      const moveMagnitude = Math.hypot(moveDirection.x, moveDirection.y)
      
      if (moveMagnitude > 0) {
        const raceLineAlignment = (
          (moveDirection.x / moveMagnitude) * raceLineDirection.x +
          (moveDirection.y / moveMagnitude) * raceLineDirection.y
        )
        
        // Much stronger bonus for moves that take us toward racing line
        const attractionBonus = raceLineAlignment * (currentLineDistance - 5) * 40 // Increased from 25 to 40
        score += attractionBonus
        
        if (isFeatureEnabled('debugMode') && attractionBonus > 30) {
          console.log(`🧲 AI racing line attraction: far from line (${currentLineDistance.toFixed(1)}), alignment=${raceLineAlignment.toFixed(2)}, bonus=+${attractionBonus.toFixed(0)}`)
        }
      }
    }
  }
  
  // 5. DIRECTION FACTOR: Ensure consistent forward progress
  // Prevent getting stuck by heavily penalizing zero movement
  if (futureSpeed === 0) {
    score -= 300 // Very heavy penalty for not moving
  }
  
  // Simple loop detection: penalize revisiting recent positions
  globalMoveCounter++
  recentPositions = recentPositions.filter(r => globalMoveCounter - r.moveIndex <= 8)
  recentPositions.push({ pos: { x: currentCar.pos.x, y: currentCar.pos.y }, moveIndex: globalMoveCounter })
  
  for (const recent of recentPositions.slice(-6)) {
    if (globalMoveCounter - recent.moveIndex > 1 && globalMoveCounter - recent.moveIndex <= 4) {
      const distToRecent = distance(nextPos, recent.pos)
      if (distToRecent < 2) {
        score -= (2 - distToRecent) * 50 // Penalty for revisiting recent positions
      }
    }
  }
  
  // ENHANCED START HANDLING: Much better logic for leaving starting area
  const isAtStart = currentCar.pos.x >= 4 && currentCar.pos.x <= 10 && currentCar.pos.y >= 19 && currentCar.pos.y <= 26
  const isNearStart = currentCar.pos.x >= 3 && currentCar.pos.x <= 12 && currentCar.pos.y >= 18 && currentCar.pos.y <= 28
  
  if (isAtStart || isNearStart) {
    // CRITICAL: For counter-clockwise racing from start, we must go DOWN (positive Y) first
    // This is the fundamental direction requirement for leaving the starting area properly
    
    const distanceFromStartCenter = distance(currentCar.pos, { x: 7, y: 22 })
    const isVeryCloseToStart = distanceFromStartCenter < 3
    
    if (isVeryCloseToStart) {
      // VERY CLOSE TO START: Absolutely must move down first
      if (velAfter.y > 0) {
        // MASSIVE bonus for downward movement from start - this is critical
        score += velAfter.y * 100 // Much stronger bonus than before
        
        // Extra bonus for pure downward movement (no horizontal component)
        if (Math.abs(velAfter.x) <= Math.abs(velAfter.y)) {
          score += 50 // Bonus for staying mostly vertical
        }
      } else if (velAfter.y < 0) {
        // DEVASTATING penalty for upward movement from start
        score -= 300 // Make upward movement from start nearly impossible
      } else {
        // velAfter.y === 0, purely horizontal movement
        score -= 150 // Heavy penalty for not moving down at all
      }
      
      // Discourage excessive horizontal movement until we've gone down enough
      if (Math.abs(velAfter.x) > 2) {
        score -= Math.abs(velAfter.x) * 50 // Heavy penalty for fast horizontal movement
      }
    } else {
      // NEAR START but not at start: More flexible but still encourage good direction
      if (velAfter.y > 0) {
        score += velAfter.y * 60 // Good bonus for continuing downward
      } else if (velAfter.y < 0) {
        score -= Math.abs(velAfter.y) * 80 // Strong penalty for going backwards
      }
      
      // Allow more horizontal movement once we've moved away from start
      if (currentCar.pos.y > 24) {
        // We've moved down enough, allow rightward movement toward racing line
        if (velAfter.x > 0) {
          score += velAfter.x * 20 // Bonus for moving right after going down
        }
      }
    }
    
    // Prevent getting stuck by heavily penalizing very slow speeds at start
    if (futureSpeed < 1.5 && isAtStart) {
      score -= 100 // Push AI to move with decent speed from start
    }
    
    // Special bonus for acceleration from start (getting moving)
    if (currentSpeed < 1 && futureSpeed > 1) {
      score += 75 // Strong bonus for getting moving from start
    }
  }
  
  // COLLISION AVOIDANCE: Basic multi-car safety
  if (isMultiCarGame(state)) {
    const multiCarState = state as any
    const otherCars = multiCarState.cars.filter((car: any, idx: number) => 
      idx !== multiCarState.currentPlayerIndex && !car.crashed && !car.finished
    )
    
    for (const otherCar of otherCars) {
      const distToOther = distance(nextPos, otherCar.pos)
      if (distToOther < 3) {
        score -= (3 - distToOther) * 40 // Penalty for getting too close to other cars
      }
    }
  }
  
  // Add slight randomness based on difficulty
  const randomFactor = difficulty === 'easy' ? 8 : difficulty === 'medium' ? 4 : 2
  score += (Math.random() - 0.5) * randomFactor
  
  return score
}

// Track conditions simulation
interface TrackConditions {
  grip: number // 0.8 to 1.2 - affects cornering and braking
  weather: 'dry' | 'wet' | 'mixed'
  temperature: number // affects tire performance
}

// Generate simulated track conditions based on game state
function getTrackConditions(state: GameState): TrackConditions {
  if (!isMultiCarGame(state)) return { grip: 1.0, weather: 'dry', temperature: 20 }
  
  const multiCarState = state as any
  const totalCars = multiCarState.cars.length
  
  // Use a pseudo-random seed based on number of cars and game progression
  const seed = totalCars * 17 + (multiCarState.currentPlayerIndex % 7)
  const weatherRandom = (seed * 23 + 42) % 100
  
  let weather: 'dry' | 'wet' | 'mixed'
  let grip = 1.0
  let temperature = 20
  
  // Simulate weather conditions
  if (weatherRandom < 70) {
    weather = 'dry'
    grip = 0.95 + (weatherRandom % 10) * 0.005 // 0.95 to 1.0
    temperature = 15 + (weatherRandom % 20)
  } else if (weatherRandom < 90) {
    weather = 'mixed'
    grip = 0.85 + (weatherRandom % 15) * 0.005 // 0.85 to 0.925
    temperature = 10 + (weatherRandom % 15)
  } else {
    weather = 'wet'
    grip = 0.75 + (weatherRandom % 10) * 0.005 // 0.75 to 0.8
    temperature = 5 + (weatherRandom % 15)
  }
  
  return { grip, weather, temperature }
}

// Adjust target speed based on lap strategy with tire, fuel, and track conditions
function adjustSpeedForLapStrategy(baseSpeed: number, currentLap: number, state: GameState): number {
  if (!isMultiCarGame(state)) return baseSpeed
  
  const multiCarState = state as any
  const targetLaps = multiCarState.targetLaps || 3
  const currentCar = multiCarState.cars[multiCarState.currentPlayerIndex]
  const conditions = getTrackConditions(state)
  
  let speedMultiplier = 1.0
  
  // Lap-based strategy
  // First lap: more conservative (10% slower)
  if (currentLap === 0) {
    speedMultiplier *= 0.9
  }
  
  // Final lap: more aggressive (15% faster)
  if (currentLap >= targetLaps - 1) {
    speedMultiplier *= 1.15
  }
  
  // Simulated tire wear - cars get slightly slower over time
  if (currentCar && currentCar.trail && currentCar.trail.length > 0) {
    const totalDistance = currentCar.trail.length
    const tireWearFactor = Math.max(0.85, 1.0 - (totalDistance * 0.001)) // gradual slowdown
    speedMultiplier *= tireWearFactor
  }
  
  // Simulated fuel effect - slight performance drop when "low on fuel" (later in race)
  const raceProgress = (currentLap + 1) / targetLaps
  if (raceProgress > 0.7) { // Later 30% of race
    const fuelEffect = Math.max(0.92, 1.0 - ((raceProgress - 0.7) * 0.25))
    speedMultiplier *= fuelEffect
  }
  
  // Track conditions effects
  speedMultiplier *= conditions.grip
  
  // Weather-specific adjustments
  switch (conditions.weather) {
    case 'wet':
      speedMultiplier *= 0.8 // significant speed reduction in wet
      break
    case 'mixed':
      speedMultiplier *= 0.9 // moderate speed reduction in mixed conditions
      break
    case 'dry':
      // No additional penalty
      break
  }
  
  // Temperature effects (optimal around 15-25°C)
  const tempOptimal = Math.abs(conditions.temperature - 20)
  if (tempOptimal > 10) {
    speedMultiplier *= Math.max(0.92, 1.0 - (tempOptimal - 10) * 0.01)
  }
  
  return Math.min(baseSpeed * speedMultiplier, 8) // cap at reasonable max speed
}

// Evaluate race position for strategic decisions
function evaluateRacePosition(
  nextPos: Vec,
  velAfter: Vec,
  multiCarState: any,
  difficulty: 'easy' | 'medium' | 'hard'
): number {
  if (difficulty === 'easy') return 0 // Easy AI doesn't use race position strategy
  
  const currentCar = multiCarState.cars[multiCarState.currentPlayerIndex]
  const otherCars = multiCarState.cars.filter((car: any, idx: number) => 
    idx !== multiCarState.currentPlayerIndex && !car.crashed && !car.finished
  )
  
  if (otherCars.length === 0) return 0
  
  let positionScore = 0
  const futureSpeed = Math.hypot(velAfter.x, velAfter.y)
  
  // Count cars ahead and behind
  let carsAhead = 0
  let carsBehind = 0
  
  for (const otherCar of otherCars) {
    if (otherCar.currentLap > currentCar.currentLap) {
      carsAhead++
    } else if (otherCar.currentLap < currentCar.currentLap) {
      carsBehind++
    } else {
      // Same lap - use trail length as rough position indicator
      if (otherCar.trail.length > currentCar.trail.length) {
        carsAhead++
      } else {
        carsBehind++
      }
    }
  }
  
  const totalCars = otherCars.length + 1
  const currentPosition = carsAhead + 1
  
  // Defensive driving when leading (medium/hard)
  if (currentPosition === 1 && difficulty === 'hard') {
    // Block potential overtaking lines
    for (const otherCar of otherCars) {
      const distToOther = distance(nextPos, otherCar.pos)
      if (distToOther < 5 && distToOther > 2) {
        positionScore += 2 // slight bonus for defensive positioning
      }
    }
  }
  
  // Aggressive driving when behind (hard only)
  if (currentPosition > 2 && difficulty === 'hard') {
    // Look for overtaking opportunities
    positionScore += Math.min(futureSpeed - 4, 3) // bonus for speed when behind
    
    // Extra aggression on final lap
    if (currentCar.currentLap >= (multiCarState.targetLaps || 3) - 1) {
      positionScore += 3 // final lap desperation bonus
    }
  }
  
  return positionScore
}

// Enhanced collision avoidance with overtaking logic
function evaluateCollisionRisk(
  nextPos: Vec,
  velAfter: Vec,
  multiCarState: any,
  difficulty: 'easy' | 'medium' | 'hard'
): number {
  let collisionScore = 0
  const futureSpeed = Math.hypot(velAfter.x, velAfter.y)
  
  const otherCars = multiCarState.cars.filter((car: any, idx: number) => 
    idx !== multiCarState.currentPlayerIndex && !car.crashed && !car.finished
  )
  
  for (const otherCar of otherCars) {
    const distToOther = distance(nextPos, otherCar.pos)
    const otherSpeed = Math.hypot(otherCar.vel.x, otherCar.vel.y)
    
    // Predict other car's next position
    const predictedOtherPos = {
      x: otherCar.pos.x + otherCar.vel.x,
      y: otherCar.pos.y + otherCar.vel.y
    }
    
    const predictedDistance = distance(nextPos, predictedOtherPos)
    
    // Collision avoidance
    if (distToOther < 3) {
      collisionScore -= (3 - distToOther) * 15 // avoid immediate collision
    }
    
    // Predicted collision avoidance
    if (predictedDistance < 2.5) {
      collisionScore -= (2.5 - predictedDistance) * 10
    }
    
    // Overtaking opportunities (hard AI only)
    if (difficulty === 'hard') {
      if (distToOther < 6 && distToOther > 2) {
        // Check if we're faster and in position to overtake
        if (futureSpeed > otherSpeed + 1) {
          collisionScore += 5 // bonus for overtaking opportunity
        }
        // Defensive positioning if slower
        else if (futureSpeed < otherSpeed - 1) {
          collisionScore -= 3 // penalty for being in vulnerable position
        }
      }
    }
  }
  
  return collisionScore
}

// Legacy function for backward compatibility
function computeDefaultCheckpoints(state: GameState): Vec[] {
  const racingLine = computeRacingLine(state)
  return racingLine.map(point => point.pos)
}

// Enhanced move scoring with difficulty-based strategies (legacy version)
function scoreMove(
  state: GameState, 
  nextPos: Vec, 
  velAfter: Vec, 
  target: Vec, 
  difficulty: 'easy' | 'medium' | 'hard'
): number {
  const currentCar = getCurrentCar(state)!
  const currentSpeed = Math.hypot(currentCar.vel.x, currentCar.vel.y)
  const futureSpeed = Math.hypot(velAfter.x, velAfter.y)
  
  // Base score: distance to target (lower is better)
  const targetDistance = distance(nextPos, target)
  let score = -targetDistance * 10
  
  // Speed considerations based on difficulty
  switch (difficulty) {
    case 'easy':
      // Easy AI: prefers moderate speeds, avoids going too fast
      score += Math.min(futureSpeed, 3) * 2
      if (futureSpeed > 4) score -= 5 // penalty for high speed
      // Add some randomness for mistakes
      score += (Math.random() - 0.5) * 3
      break
      
    case 'medium':
      // Medium AI: balanced approach
      score += futureSpeed * 1.5
      // Slight penalty for very high speeds to maintain control
      if (futureSpeed > 5) score -= 2
      // Prefer maintaining good racing line
      if (currentSpeed > 2 && futureSpeed < currentSpeed * 0.5) {
        score -= 3 // penalty for sudden braking
      }
      break
      
    case 'hard':
      // Hard AI: aggressive and optimized
      score += futureSpeed * 2
      // Encourage consistent high speeds
      if (futureSpeed > 3) score += 2
      // Advanced racing line consideration
      if (targetDistance > 8 && futureSpeed < 3) {
        score -= 5 // penalty for being too slow when far from target
      }
      // Collision avoidance bonus (basic check)
      if (isMultiCarGame(state)) {
        const multiCarState = state as any
        const otherCars = multiCarState.cars.filter((car: any, idx: number) => 
          idx !== multiCarState.currentPlayerIndex && !car.crashed && !car.finished
        )
        for (const otherCar of otherCars) {
          const distToOther = distance(nextPos, otherCar.pos)
          if (distToOther < 3) {
            score -= (3 - distToOther) * 3 // avoid close proximity
          }
        }
      }
      break
  }
  
  return score
}

// Determine target checkpoint based on current position and progress
function selectTargetCheckpoint(currentPos: Vec, checkpoints: Vec[], currentLap: number): Vec {
  // Find the checkpoint that's ahead in the racing direction
  let bestIdx = 0
  let bestScore = -Infinity
  
  for (let i = 0; i < checkpoints.length; i++) {
    const checkpoint = checkpoints[i]!
    const dist = distance(currentPos, checkpoint)
    
    // Prefer checkpoints that are reasonably close but not too close
    // This helps the AI follow the track properly
    let score = 0
    if (dist < 5) score = -10 // too close, look further ahead
    else if (dist > 20) score = -dist * 0.5 // very far, less attractive
    else score = 10 - dist * 0.3 // sweet spot for target selection
    
    // Add some forward-looking bias based on lap progress
    const progressBonus = (i * 0.5) % checkpoints.length
    score += progressBonus
    
    if (score > bestScore) {
      bestScore = score
      bestIdx = i
    }
  }
  
  return checkpoints[bestIdx]!
}

// Enhanced emergency move handling - CRITICAL for preventing "no legal moves" failures
function handleEmergencyMove(state: GameState, car: any, difficulty: 'easy' | 'medium' | 'hard'): Vec | null {
  if (isFeatureEnabled('debugMode')) {
    console.error(`🚨 AI Emergency Mode Activated! Car at: (${car.pos.x.toFixed(1)}, ${car.pos.y.toFixed(1)}), velocity: (${car.vel.x}, ${car.vel.y})`)
  }
  
  // Emergency strategy: Try EVERY possible acceleration combination and find ANY legal move
  const emergencyMoves = []
  
  for (let ax = -1; ax <= 1; ax++) {
    for (let ay = -1; ay <= 1; ay++) {
      const acc = { x: ax, y: ay }
      const velAfter = { x: car.vel.x + ax, y: car.vel.y + ay }
      const nextPos = { x: car.pos.x + velAfter.x, y: car.pos.y + velAfter.y }
      
      // Check if this move would be legal using actual game logic
      const isLegal = pathLegal(car.pos, nextPos, state)
      
      if (isLegal) {
        const futureSpeed = Math.hypot(velAfter.x, velAfter.y)
        
        let emergencyScore = 1000 // Base bonus for being a legal move
        
        // PRIMARY: Massive bonus for stopping or slowing down
        const speedReduction = Math.hypot(car.vel.x, car.vel.y) - futureSpeed
        emergencyScore += speedReduction * 100
        
        // SECONDARY: Prefer moves that head toward track center
        const trackCenterX = 25
        const trackCenterY = 17.5  
        const distanceToCenter = distance(nextPos, { x: trackCenterX, y: trackCenterY })
        emergencyScore -= distanceToCenter * 5
        
        // TERTIARY: Slight preference for staying on racing line if possible
        try {
          const racingLine = computeRacingLine(state)
          const nearestTarget = findNearestRacingLineTarget(nextPos, racingLine)
          const distanceToLine = distance(nextPos, nearestTarget.pos)
          emergencyScore -= distanceToLine * 2
        } catch (error) {
          // If racing line computation fails, ignore this factor
        }
        
        emergencyMoves.push({
          acc,
          nextPos,
          velAfter,
          score: emergencyScore,
          speed: futureSpeed
        })
      }
    }
  }
  
  if (emergencyMoves.length === 0) {
    if (isFeatureEnabled('debugMode')) {
      console.error(`💀 AI CRITICAL FAILURE: No legal emergency moves available! Car will crash.`)
    }
    return null // Truly no moves possible - this should be very rare now
  }
  
  // Sort by emergency score and pick the best legal move
  emergencyMoves.sort((a, b) => b.score - a.score)
  const bestMove = emergencyMoves[0]!
  
  if (isFeatureEnabled('debugMode')) {
    console.log(`🛟 AI Emergency: Found ${emergencyMoves.length} legal moves, selected acc=(${bestMove.acc.x}, ${bestMove.acc.y}), ` +
      `speed: ${Math.hypot(car.vel.x, car.vel.y).toFixed(1)} → ${bestMove.speed.toFixed(1)}, ` +
      `score: ${bestMove.score.toFixed(0)}`)
  }
  
  return bestMove.acc
}

// Export functions for visualization
export { computeRacingLine, findNearestRacingLineTarget }

export function chooseAIMove(state: GameState): Vec | null {
  if (!isMultiCarGame(state)) return null
  if (!isFeatureEnabled('aiPlayers')) return null

  const player = getCurrentPlayer(state)
  const car = getCurrentCar(state)
  if (!player || !player.isAI || !car) return null

  // ALWAYS log basic info for AI diagnosis
  console.log(`\n🤖 AI ${player.name} TURN DEBUG:`, JSON.stringify({
    position: car.pos,
    velocity: car.vel,
    currentLap: car.currentLap,
    difficulty: player.aiDifficulty || 'medium'
  }, null, 2))

  let legal = legalStepOptions(state)
  console.log(`📋 Legal moves available: ${legal.length}`)
  
  // ENHANCED EMERGENCY HANDLING: If no legal moves, use emergency strategy
  if (legal.length === 0) {
    console.warn(`⚠️ AI ${player.name}: No legal moves available - entering emergency mode`)
    return handleEmergencyMove(state, car, player.aiDifficulty || 'medium')
  }

  // Get AI difficulty (default to medium)
  const difficulty = player.aiDifficulty || 'medium'
  
  try {
    // Use enhanced AI with racing line and multi-turn planning
    const racingLine = computeRacingLine(state)
    
    // Debug: Show which waypoint the AI is currently targeting
    const currentTarget = findNearestRacingLineTarget(car.pos, racingLine)
    console.log(`🎯 AI ${player.name} targeting waypoint: pos=(${currentTarget.pos.x},${currentTarget.pos.y}), type=${currentTarget.cornerType}, distance=${distance(car.pos, currentTarget.pos).toFixed(1)}`)
    
    // Use multi-turn path planning for medium and hard AI
    if (difficulty === 'medium' || difficulty === 'hard') {
      console.log(`🎯 Attempting path planning for ${difficulty} AI...`)
      
      try {
        // Wrap in try-catch to handle any potential errors
        const startTime = performance.now();
        const timeoutMs = 100; // Set a reasonable timeout (100ms)
        let plannedPath = null;
        
        // Add timeout protection
        const timeoutPromise = new Promise<null>((resolve) => {
          setTimeout(() => {
            console.log(`⏱️ Path planning timed out after ${timeoutMs}ms`);
            resolve(null);
          }, timeoutMs);
        });
        
        // PHASE 1: Disable complex path planning for now - focus on fixing basic move selection
        console.log(`📝 Phase 1: Using simplified scoring system for ${difficulty} AI`);
        plannedPath = null; // Temporarily disable path planning
        
        const endTime = performance.now();
        console.log(`⏱️ Path planning skipped (Phase 1 implementation)`);
        
        if (plannedPath) {
          // This code is disabled in Phase 1 implementation
          // console.log(`✅ Path planning succeeded! Move: ${JSON.stringify(plannedPath.acc)}, Score: ${plannedPath.totalScore.toFixed(2)}`);
          // return plannedPath.acc;
        } else {
          console.log(`📝 Using simplified single-move evaluation (Phase 1)`);
        }
      } catch (error) {
        console.warn(`🚫 Error in path planning:`, error);
        console.log(`❌ Path planning failed with error, falling back to simplified evaluation`);
      }
    } else {
      console.log(`📝 Using simplified single-move evaluation for ${difficulty} AI`);
    }
    
    // CRITICAL: Pre-filter moves to ensure they're actually legal using pathLegal
    const actuallyLegalMoves = []
    for (const move of legal) {
      const velAfter = { x: car.vel.x + move.acc.x, y: car.vel.y + move.acc.y }
      const nextPos = { x: car.pos.x + velAfter.x, y: car.pos.y + velAfter.y }
      
      if (pathLegal(car.pos, nextPos, state)) {
        actuallyLegalMoves.push({ ...move, nextPos, velAfter })
      }
    }
    
    if (actuallyLegalMoves.length === 0) {
      console.warn(`⚠️ AI ${player.name}: All moves filtered out by pathLegal - entering emergency mode`)
      return handleEmergencyMove(state, car, player.aiDifficulty || 'medium')
    }
    
    console.log(`🔢 EVALUATING ${actuallyLegalMoves.length} ACTUALLY LEGAL MOVES (from ${legal.length} candidates):`)    
    
    // Phase 1: Use simplified single-move evaluation for all difficulties
    let best = actuallyLegalMoves[0]!
    let bestScore = -Infinity
    
    // Add detailed analysis for each move
    const moveAnalysis: Array<{acc: Vec, nextPos: Vec, velAfter: Vec, score: number, analysis: string}> = []
    
    for (const move of actuallyLegalMoves) {
      const { acc, nextPos, velAfter } = move
      const targetPoint = findNearestRacingLineTarget(nextPos, racingLine)
      
      // Use the new simplified scoring system
      const score = scoreSimplifiedMove(state, nextPos, velAfter, targetPoint, difficulty)
      
      // Check if this is a backward move for analysis
      const expectedDirection = getExpectedRacingDirection(car.pos)
      const velocityAlignment = velAfter.x * expectedDirection.x + velAfter.y * expectedDirection.y
      const isBackward = velocityAlignment < -0.5
      const futureSpeed = Math.hypot(velAfter.x, velAfter.y)
      const isZeroAcceleration = acc.x === 0 && acc.y === 0
      
      const analysis = `align=${velocityAlignment.toFixed(2)}, ${isBackward ? 'BACKWARD' : 'FORWARD'}, speed=${futureSpeed.toFixed(1)}${isZeroAcceleration ? ' [ZERO-ACCEL]' : ''}`
      
      console.log(`  Move ${JSON.stringify(acc)}: score=${score.toFixed(1)}, ${analysis}`) 
      
      moveAnalysis.push({ acc, nextPos, velAfter, score, analysis })
      
      if (score > bestScore) {
        bestScore = score
        best = move // Use the full move object instead of reconstructing
      }
    }
    
    // Log the move selection decision
    const bestMove = moveAnalysis.find(m => m.acc.x === best.acc.x && m.acc.y === best.acc.y)
    console.log(`🏆 SELECTED: ${JSON.stringify(best.acc)} with score ${bestScore.toFixed(1)} (${bestMove?.analysis})`)
    
    // Log any concerning backward move selections
    if (bestMove && bestMove.analysis.includes('BACKWARD')) {
      console.warn(`⚠️ WARNING: Selected backward move! Details:`, bestMove)
      console.log(`📊 All move scores for analysis:`, moveAnalysis.map(m => ({ move: m.acc, score: m.score.toFixed(1), analysis: m.analysis })))
    }
    
    console.log(`🏆 BEST MOVE SELECTED: ${JSON.stringify(best.acc)} with score ${bestScore.toFixed(1)}`)

    // Enhanced debugging
    if (isFeatureEnabled('debugMode')) {
      const targetPoint = findNearestRacingLineTarget(best.nextPos, racingLine)
      console.log(`🤖 AI ${player.name} (${difficulty}) enhanced move:`, JSON.stringify({
        position: car.pos,
        velocity: car.vel,
        chosenMove: best.acc,
        score: bestScore.toFixed(2),
        racingLineDistance: distance(best.nextPos, targetPoint.pos).toFixed(1),
        cornerType: targetPoint.cornerType,
        targetSpeed: targetPoint.targetSpeed
      }, null, 2))
    }

    return best.acc
    
  } catch (error) {
    // Fallback to simple AI if enhanced version fails
    if (isFeatureEnabled('debugMode')) {
      console.warn('Enhanced AI failed, falling back to simple AI:', error)
    }
    
    const checkpoints = computeDefaultCheckpoints(state)
    const target = selectTargetCheckpoint(car.pos, checkpoints, car.currentLap)
    
    let best = legal[0]!
    let bestScore = -Infinity
    
    for (const { acc, nextPos } of legal) {
      const velAfter = { x: car.vel.x + acc.x, y: car.vel.y + acc.y }
      const score = scoreMove(state, nextPos, velAfter, target, difficulty)
      
      if (score > bestScore) {
        bestScore = score
        best = { acc, nextPos }
      }
    }
    
    return best.acc
  }
}

