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
import { createTrackAnalysis, getExpectedRacingDirection as getExpectedDirection, findNearestRacingLinePoint, type TrackAnalysis, type RacingLinePoint } from './track-analysis'
import type { Vec } from './geometry'

// Use unified track analysis for consistent racing line
function computeRacingLine(state: GameState): RacingLinePoint[] {
  // Create track analysis - single source of truth
  const trackAnalysis = createTrackAnalysis(state.outer, state.inner, state.start)
  
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
    const trackAnalysis = createTrackAnalysis(state.outer, state.inner, state.start)
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
    const immediateScore = scoreAdvancedMove(state, move.pos, move.vel, target, difficulty);
    
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

// Use the single source of truth from track-analysis.ts
// This wrapper function provides backward compatibility for AI-specific usage
function findNearestRacingLineTarget(pos: Vec, racingLine: RacingLinePoint[]): RacingLinePoint {
  // Create a minimal track analysis object to use the centralized function
  // This is a lightweight approach that reuses the racing line data
  const mockAnalysis: TrackAnalysis = {
    outer: [], // Not used in findNearestRacingLinePoint
    inner: [], // Not used in findNearestRacingLinePoint
    startLine: { a: { x: 0, y: 0 }, b: { x: 0, y: 0 } }, // Not used in findNearestRacingLinePoint
    racingDirection: 'clockwise',
    optimalRacingLine: racingLine,
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
  return findNearestRacingLinePoint(pos, mockAnalysis)
}

// Use the single source of truth from track-analysis.ts
// This wrapper function provides backward compatibility for existing AI code
function getExpectedRacingDirection(pos: Vec): Vec {
  // Create a minimal track analysis object to use the centralized function
  const mockAnalysis: TrackAnalysis = {
    outer: [],
    inner: [],
    startLine: { a: { x: 0, y: 0 }, b: { x: 0, y: 0 } },
    racingDirection: 'clockwise',
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
  // For CLOCKWISE racing on our rectangular track,
  // we want to encourage movement in the right direction
  
  const dx = targetPos.x - currentPos.x
  const dy = targetPos.y - currentPos.y
  
  // SPECIAL HANDLING: If at start position, heavily favor going DOWN (positive dy) for CLOCKWISE
  // and strongly penalize horizontal movement until we've moved down enough
  if (isAtStart) {
    // Strong enforcement to move DOWN first (vertical movement)
    if (dy > 1 && Math.abs(dx) <= dy) return 15 // Very strong bonus for going mostly DOWN from start
    if (dy > 0) return 5 // Good bonus for going down
    if (dy < -1) return -10 // Strong penalty for going UP from start (wrong way for clockwise)
    if (Math.abs(dx) > Math.abs(dy) && currentPos.y < 24) return -8 // Heavy penalty for moving horizontally too early
    if (dx > 0 && currentPos.y >= 24) return 3 // Only allow rightward movement after going down enough
    return 0
  }
  
  // CLOCKWISE track position logic
  // Determine which part of the track we're likely on
  if (currentPos.x < 15) {
    // Left side of track - want to go DOWN (positive y) for clockwise
    if (dy > 0) return 3 // Going down is good for clockwise
    if (dx > 0) return 2 // Going right is okay
  } else if (currentPos.x > 35) {
    // Right side of track - want to go UP (negative y) for clockwise  
    if (dy < 0) return 3 // Going up is good for clockwise
    if (dx < 0) return 2 // Going left is okay
  } else {
    // Top or bottom of track
    if (currentPos.y < 15) {
      // Top of track - want to go RIGHT (positive x) for clockwise (FIXED)
      if (dx > 0) return 3
    } else {
      // Bottom of track - want to go LEFT (negative x) for clockwise (FIXED)
      if (dx < 0) return 3
    }
  }
  
  return 0 // No particular direction bonus
}

// Evaluate how well the velocity aligns with track direction
function evaluateVelocityAlignment(pos: Vec, vel: Vec): number {
  // For CLOCKWISE racing, ideal velocity directions based on track position
  const speed = Math.hypot(vel.x, vel.y)
  if (speed < 0.5) return 0 // Stationary or very slow - no alignment bonus/penalty
  
  // Normalize velocity to get direction
  const velDirection = { x: vel.x / speed, y: vel.y / speed }
  
  let idealDirection = { x: 0, y: 0 }
  let alignmentScore = 0
  
  // Determine ideal direction based on track position for CLOCKWISE racing
  if (pos.x < 15) {
    // Left side of track - should be moving DOWN (positive y) primarily for clockwise
    idealDirection = { x: 0.3, y: 1 }
  } else if (pos.x > 35) {
    // Right side of track - should be moving UP (negative y) primarily for clockwise
    idealDirection = { x: -0.3, y: -1 }
  } else if (pos.y < 15) {
    // Top of track - should be moving RIGHT (positive x) primarily for clockwise (FIXED)
    idealDirection = { x: 1, y: -0.3 }
  } else {
    // Bottom of track - should be moving LEFT (negative x) primarily for clockwise (FIXED)
    idealDirection = { x: -1, y: 0.3 }
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

// Advanced move scoring with racing line awareness
function scoreAdvancedMove(
  state: GameState,
  nextPos: Vec,
  velAfter: Vec,
  targetPoint: RacingLinePoint,
  difficulty: 'easy' | 'medium' | 'hard'
): number {
  const currentCar = getCurrentCar(state)!
  const futureSpeed = Math.hypot(velAfter.x, velAfter.y)
  const currentSpeed = Math.hypot(currentCar.vel.x, currentCar.vel.y)
  
  // ENHANCED CIRCULAR MOTION DETECTION - using reliable move counter
  globalMoveCounter++ // Increment on every AI move
  let circularMotionPenalty = 0
  
  // Update recent positions using move counter instead of unreliable turn tracking
  const needsUpdate = recentPositions.length === 0 || 
                     recentPositions[recentPositions.length - 1]?.moveIndex !== globalMoveCounter - 1
  if (needsUpdate) {
    // Keep only recent positions (last 10 moves)
    recentPositions = recentPositions.filter(r => globalMoveCounter - r.moveIndex <= 10)
    recentPositions.push({ pos: { x: currentCar.pos.x, y: currentCar.pos.y }, moveIndex: globalMoveCounter })
    
    // DETECT CIRCULAR MOTION PATTERNS
    if (recentPositions.length >= 4) {
      // Check for 2-4 position loops by looking for repeated position patterns
      const recent4 = recentPositions.slice(-4).map(r => `${r.pos.x},${r.pos.y}`)
      const recent6 = recentPositions.slice(-6).map(r => `${r.pos.x},${r.pos.y}`)
      
      // Detect 2-position oscillation (A-B-A-B)
      if (recent4.length === 4 && recent4[0] === recent4[2] && recent4[1] === recent4[3] && recent4[0] !== recent4[1]) {
        circularMotionDetected = true
        circularMotionCounter++
        console.log(`🔄 CIRCULAR MOTION DETECTED: 2-position loop ${recent4[0]} ↔ ${recent4[1]} (counter: ${circularMotionCounter})`)
      }
      // Detect 3-position loops (A-B-C-A-B-C)
      else if (recent6.length >= 6 && recent6[0] === recent6[3] && recent6[1] === recent6[4] && recent6[2] === recent6[5]) {
        circularMotionDetected = true
        circularMotionCounter++
        console.log(`🔄 CIRCULAR MOTION DETECTED: 3-position loop [${recent6.slice(0,3).join(',')}] (counter: ${circularMotionCounter})`)
      }
      // Detect 4-position loops (A-B-C-D-A-B-C-D)
      else if (recentPositions.length >= 8) {
        const recent8 = recentPositions.slice(-8).map(r => `${r.pos.x},${r.pos.y}`)
        if (recent8[0] === recent8[4] && recent8[1] === recent8[5] && recent8[2] === recent8[6] && recent8[3] === recent8[7]) {
          circularMotionDetected = true
          circularMotionCounter++
          console.log(`🔄 CIRCULAR MOTION DETECTED: 4-position loop [${recent8.slice(0,4).join(',')}] (counter: ${circularMotionCounter})`)
        }
      }
      
      // Reset detection if we break the pattern
      if (!circularMotionDetected || circularMotionCounter > 3) {
        if (circularMotionCounter > 3) {
          console.log(`🔄 CIRCULAR MOTION COUNTER RESET: ${circularMotionCounter} loops detected`)
        }
        circularMotionDetected = false
        circularMotionCounter = 0
      }
    }
  }
  
  // Apply enhanced circular motion penalties and escape mechanism
  if (circularMotionDetected && circularMotionCounter > 0) {
    // Check if the NEXT position would continue the circular pattern
    for (const recent of recentPositions.slice(-6)) { // Check last 6 positions
      if (globalMoveCounter - recent.moveIndex <= 6 && globalMoveCounter - recent.moveIndex > 0) {
        const distToRecent = distance(nextPos, recent.pos)
        if (distToRecent < 3) { // Larger detection radius
          // MASSIVE penalty for continuing circular motion, increasing with counter
          const basePenalty = (3 - distToRecent) * 50 * Math.min(circularMotionCounter, 5)
          circularMotionPenalty += basePenalty
          if (isFeatureEnabled('debugMode')) {
            console.log(`🔄 CIRCULAR MOTION PENALTY: ${basePenalty.toFixed(1)} for revisiting (${recent.pos.x},${recent.pos.y}), counter: ${circularMotionCounter}`)
          }
        }
      }
    }
    
    // ESCAPE MECHANISM: When in circular motion, reward moves that break the pattern
    if (circularMotionCounter > 1) {
      // Calculate average position of recent loop
      const loopPositions = recentPositions.slice(-4).map(r => r.pos)
      const avgX = loopPositions.reduce((sum, p) => sum + p.x, 0) / loopPositions.length
      const avgY = loopPositions.reduce((sum, p) => sum + p.y, 0) / loopPositions.length
      const loopCenter = { x: avgX, y: avgY }
      
      // Calculate distance from loop center
      const distFromLoopCenter = distance(nextPos, loopCenter)
      
      // ESCAPE BONUS: Reward moves that take us further from the loop center
      const escapeBonus = Math.max(0, distFromLoopCenter - 2) * 30 * circularMotionCounter
      // Note: escapeBonus will be applied after the main score calculation
      
      if (isFeatureEnabled('debugMode') && escapeBonus > 0) {
        console.log(`🎆 ESCAPE BONUS: ${escapeBonus.toFixed(1)} for moving away from loop center (${loopCenter.x.toFixed(1)},${loopCenter.y.toFixed(1)}), distance: ${distFromLoopCenter.toFixed(1)}`)
      }
    }
  } else {
    // Standard circular motion detection for close positions
    for (const recent of recentPositions) {
      if (globalMoveCounter - recent.moveIndex <= 5 && globalMoveCounter - recent.moveIndex > 0) {
        const distToRecent = distance(nextPos, recent.pos)
        if (distToRecent < 2) {
          circularMotionPenalty += (2 - distToRecent) * 25
        }
      }
    }
  }
  
  // CRITICAL: Prevent backward movement by checking velocity direction against racing direction
  const expectedDirection = getExpectedRacingDirection(currentCar.pos)
  const velocityAlignment = velAfter.x * expectedDirection.x + velAfter.y * expectedDirection.y
  
  // Heavy penalty for moves that would result in backward velocity
  if (velocityAlignment < -0.5 && futureSpeed > 1) {
    // This move would take us significantly backward - heavily penalize it
    return -1000 - futureSpeed * 50 // Severe penalty that increases with backward speed
  }
  
  // Distance to racing line (closer is better) - STRONGER penalty for being far off
  const lineDistance = distance(nextPos, targetPoint.pos)
  let score = -lineDistance * 15 // INCREASED penalty for being off the racing line
  
  // MUCH STRONGER progressive penalty for being very far from racing line (prevents drift)
  if (lineDistance > 6) {
    score -= Math.pow(lineDistance - 6, 2) * 10 // Much stronger exponential penalty for extreme distances
  }
  
  // TRACK BOUNDARY SAFETY: Ensure AI stays well within safe track bounds
  // Track boundaries: outer (2,2)-(48,33), inner (12,10)-(38,25)
  // Create safe buffer zones to prevent crashes
  const OUTER_BUFFER = 1.5
  const INNER_BUFFER = 1.0
  
  // Check if position is too close to outer boundaries
  const tooCloseToOuterWalls = 
    nextPos.x <= (2 + OUTER_BUFFER) ||  // Left wall
    nextPos.x >= (48 - OUTER_BUFFER) || // Right wall  
    nextPos.y <= (2 + OUTER_BUFFER) ||  // Top wall
    nextPos.y >= (33 - OUTER_BUFFER)    // Bottom wall
  
  // Check if position is too close to inner walls
  const tooCloseToInnerWalls =
    nextPos.x >= (12 - INNER_BUFFER) && nextPos.x <= (38 + INNER_BUFFER) &&
    nextPos.y >= (10 - INNER_BUFFER) && nextPos.y <= (25 + INNER_BUFFER)
  
  // Apply boundary penalties
  if (tooCloseToOuterWalls) {
    score -= 200 // Very heavy penalty for approaching outer walls
  }
  
  if (tooCloseToInnerWalls) {
    score -= 150 // Heavy penalty for approaching inner walls
  }
  
  // Speed matching to target speed with lap-based strategy - REDUCED penalty
  const lapBasedTargetSpeed = adjustSpeedForLapStrategy(targetPoint.targetSpeed, currentCar.currentLap, state)
  const speedDiff = Math.abs(futureSpeed - lapBasedTargetSpeed)
  score -= speedDiff * 4 // Reduced penalty for speed mismatch
  
  // Momentum and physics awareness
  const speedChange = futureSpeed - currentSpeed
  
  // Penalize sudden speed changes that don't make sense
  if (targetPoint.brakeZone && speedChange > 0.5) {
    score -= 10 // penalty for accelerating in brake zones
  }
  
  if (targetPoint.cornerType === 'straight' && speedChange < -1) {
    score -= 5 // penalty for braking too hard on straights
  }
  
  // Reward smooth acceleration patterns
  if (targetPoint.cornerType === 'exit' && speedChange > 0 && speedChange < 2) {
    score += 3 // bonus for smooth acceleration on corner exit
  }
  
  // Velocity direction awareness (reward moves that align with track direction)
  const velocityAlignmentScore = evaluateVelocityAlignment(currentCar.pos, velAfter)
  score += velocityAlignmentScore
  
  // START POSITION SPECIAL HANDLING: Ensure AI goes DOWN first from start positions
  // Match the expanded detection from findNearestRacingLinePoint function
  const isAtStartPosition = currentCar.pos.x >= 4 && currentCar.pos.x <= 10 && currentCar.pos.y >= 19 && currentCar.pos.y <= 24
  if (isAtStartPosition) {
    const verticalMovement = velAfter.y // positive y is DOWN for clockwise
    const horizontalMovement = Math.abs(velAfter.x)
    
    // Strong bonus for vertical (downward) movement at start
    if (verticalMovement > 0) {
      score += verticalMovement * 20 // Heavy bonus for downward movement
    }
    
    // Heavy penalty for horizontal movement until we've moved down enough
    if (currentCar.pos.y < 24 && horizontalMovement > verticalMovement) {
      score -= horizontalMovement * 25 // Severe penalty for premature horizontal movement
    }
    
    // Additional penalty for moving UP (wrong direction) at start
    if (verticalMovement < 0) {
      score -= Math.abs(verticalMovement) * 30 // Very heavy penalty for going UP at start
    }
  }
  
  // CORNER ANTICIPATION: Start turning early for upcoming corners
  const racingLine = computeRacingLine(state) // Fix: Define racingLine variable
  const nextCornerDistance = getDistanceToNextCorner(currentCar.pos, racingLine)
  if (nextCornerDistance < 6 && futureSpeed > 2) {
    const nextCorner = getNextCorner(currentCar.pos, racingLine)
    if (nextCorner) {
      // ENHANCED SPEED PENALTIES NEAR CORNERS: Prevent dangerous entry speeds
      if (nextCornerDistance < 4 && futureSpeed > 3) {
        const cornerSpeedPenalty = Math.pow(futureSpeed - 3, 2) * 8 * (4 - nextCornerDistance)
        score -= cornerSpeedPenalty
        if (isFeatureEnabled('debugMode') && cornerSpeedPenalty > 5) {
          console.log(`⚠️ Corner speed penalty: ${cornerSpeedPenalty.toFixed(1)} (speed: ${futureSpeed.toFixed(1)}, distance: ${nextCornerDistance.toFixed(1)})`)
        }
      }
      
      // Calculate ideal approach direction for the corner
      const approachDirection = {
        x: nextCorner.pos.x - currentCar.pos.x,
        y: nextCorner.pos.y - currentCar.pos.y
      }
      const approachMagnitude = Math.hypot(approachDirection.x, approachDirection.y)
      
      if (approachMagnitude > 0) {
        const normalizedApproach = {
          x: approachDirection.x / approachMagnitude,
          y: approachDirection.y / approachMagnitude
        }
        
        // Bonus for moves that align with corner approach
        const velMagnitude = Math.hypot(velAfter.x, velAfter.y)
        if (velMagnitude > 0) {
          const normalizedVel = {
            x: velAfter.x / velMagnitude,
            y: velAfter.y / velMagnitude
          }
          
          const alignment = normalizedVel.x * normalizedApproach.x + normalizedVel.y * normalizedApproach.y
          
          // CRITICAL: Only apply corner bonus if it doesn't conflict with forward racing direction
          const racingDirection = getExpectedRacingDirection(currentCar.pos)
          const velocityRacingAlignment = normalizedVel.x * racingDirection.x + normalizedVel.y * racingDirection.y
          
          // Only give corner bonus if we're still generally moving in the racing direction
          if (velocityRacingAlignment > -0.1 && alignment > 0) {
            const cornerAlignmentBonus = alignment * 6 * (6 - nextCornerDistance) // FURTHER REDUCED bonus and stricter conditions
            score += cornerAlignmentBonus
            
            if (isFeatureEnabled('debugMode') && cornerAlignmentBonus > 5) {
              console.log(`🏁 Corner anticipation bonus: ${cornerAlignmentBonus.toFixed(1)} (distance: ${nextCornerDistance.toFixed(1)}, alignment: ${alignment.toFixed(2)})`)
            }
          } else if (velocityRacingAlignment < -0.3) {
            // Only penalize moves that are clearly going backwards
            score -= 15 // Reduced penalty for backward movement near corners
            if (isFeatureEnabled('debugMode')) {
              console.log(`❌ Rejected corner move due to poor racing alignment: ${velocityRacingAlignment.toFixed(2)}`)
            }
          }
        }
      }
    }
  }
  
  // Brake zone awareness
  if (targetPoint.brakeZone && futureSpeed > lapBasedTargetSpeed) {
    score -= (futureSpeed - lapBasedTargetSpeed) * 12 // heavy penalty for not braking
  }
  
  // Collision avoidance - enhanced version
  if (isMultiCarGame(state)) {
    const multiCarState = state as any
    score += evaluateCollisionRisk(nextPos, velAfter, multiCarState, difficulty)
    
    // Add defensive/aggressive positioning based on race position
    score += evaluateRacePosition(nextPos, velAfter, multiCarState, difficulty)
  }
  
  // ENHANCED SPEED LIMITING: Prevent dangerous high speeds that cause crashes - INCREASED penalties
  const safeMaxSpeed = getSafeMaxSpeed(targetPoint, difficulty, lineDistance)
  if (futureSpeed > safeMaxSpeed) {
    const overspeedPenalty = Math.pow(futureSpeed - safeMaxSpeed, 2) * 15 // Increased multiplier for safety
    score -= overspeedPenalty
    if (isFeatureEnabled('debugMode') && overspeedPenalty > 10) {
      console.log(`⚠️ AI Speed Warning: ${futureSpeed.toFixed(1)} > safe max ${safeMaxSpeed.toFixed(1)}, penalty: ${overspeedPenalty.toFixed(1)}`)
    }
  }
  
  // REDUCED: Progressive speed penalties - less conservative to allow better racing
  if (futureSpeed > 4) { // Raised threshold from 3 to 4
    const conservativeSpeedPenalty = Math.pow(futureSpeed - 4, 2) * 2 // Reduced multiplier from 3 to 2
    score -= conservativeSpeedPenalty
  }
  
  // ADD BONUS for forward progress to encourage movement, but not if far off-line
  const forwardProgressBonus = Math.max(0, futureSpeed - currentSpeed) * 2
  if (lineDistance < 6) { // Only give speed bonus if reasonably close to racing line
    score += forwardProgressBonus
  } else {
    // Penalize speed when far from racing line
    score -= forwardProgressBonus
  }
  
  // CRITICAL: MASSIVE penalty for staying still (zero velocity after move)
  if (futureSpeed === 0) {
    const zeroVelocityPenalty = 500 // MASSIVE penalty for not moving at all - this should never be selected
    score -= zeroVelocityPenalty
    if (isFeatureEnabled('debugMode')) {
      console.log(`🛑 ZERO VELOCITY PENALTY: ${zeroVelocityPenalty} (futureSpeed: ${futureSpeed}, currentSpeed: ${currentSpeed})`)
    }
  }
  
  // CRITICAL: Penalty for zero acceleration when steering is needed
  const moveVector = { x: velAfter.x - currentCar.vel.x, y: velAfter.y - currentCar.vel.y }
  const isZeroAcceleration = moveVector.x === 0 && moveVector.y === 0
  let zeroAccelPenalty = 0
  
  if (isZeroAcceleration) {
    // Check if we need to steer (distance from racing line or approaching corner)
    const nextCornerDistance = getDistanceToNextCorner(currentCar.pos, racingLine)
    
    if (lineDistance > 3) {
      // Far from racing line - penalize coasting heavily
      const offLinePenalty = 30 + (lineDistance - 3) * 10  // Increased from 15 + 5
      zeroAccelPenalty += offLinePenalty
      score -= offLinePenalty
    }
    
    if (nextCornerDistance < 8 && futureSpeed > 1.5) {
      // Approaching corner with speed - need to steer, not coast
      const cornerPenalty = 40 * (8 - nextCornerDistance) / 8  // Increased from 20
      zeroAccelPenalty += cornerPenalty
      score -= cornerPenalty
    }
    
    // General penalty for being passive when speed > 1 - MUCH HIGHER
    if (futureSpeed > 1) {
      const passivePenalty = 25 // Increased from 5
      zeroAccelPenalty += passivePenalty
      score -= passivePenalty
    }
    
    // Base penalty for zero acceleration - always apply
    const basePenalty = 20
    zeroAccelPenalty += basePenalty
    score -= basePenalty
    
    if (isFeatureEnabled('debugMode') && zeroAccelPenalty > 0) {
      console.log(`⚠️ Zero acceleration penalty: ${zeroAccelPenalty.toFixed(1)} (lineDistance: ${lineDistance.toFixed(1)}, cornerDistance: ${nextCornerDistance.toFixed(1)}, speed: ${futureSpeed.toFixed(1)})`)
    }
  }
  
  // CRITICAL: Bonus for making any forward progress at all
  if (futureSpeed > 0 && futureSpeed > currentSpeed) {
    score += 15 // Bonus for accelerating from stationary or slow speeds
  }
  
  // BACKUP ESCAPE MECHANISM: Immediate position-based detection for tight loops
  // This works even if pattern detection fails, by checking if we're revisiting the same small area repeatedly
  let stuckInSmallAreaPenalty = 0
  let stuckInSmallAreaBonus = 0
  
  if (recentPositions.length >= 4) {
    // Check if we've been in a very small area for several moves
    const recentArea = recentPositions.slice(-4) // Last 4 positions including current
    const minX = Math.min(...recentArea.map(r => r.pos.x))
    const maxX = Math.max(...recentArea.map(r => r.pos.x))
    const minY = Math.min(...recentArea.map(r => r.pos.y))
    const maxY = Math.max(...recentArea.map(r => r.pos.y))
    const areaWidth = maxX - minX
    const areaHeight = maxY - minY
    const areaSize = areaWidth * areaHeight
    
    // If we're stuck in a very small area (2x2 or smaller), this is likely a tight loop
    if (areaSize <= 4 && recentArea.length >= 4) {
      const stuckCounter = Math.min(recentArea.length, 6)
      
      // Check if the next position would keep us in the same small area
      if (nextPos.x >= minX && nextPos.x <= maxX && nextPos.y >= minY && nextPos.y <= maxY) {
        // MASSIVE penalty for staying in the stuck area
        stuckInSmallAreaPenalty = 100 * stuckCounter
        console.log(`🚨 STUCK IN SMALL AREA: Area size ${areaSize.toFixed(1)}, penalty: ${stuckInSmallAreaPenalty.toFixed(1)}`)
      } else {
        // BIG bonus for escaping the stuck area
        const escapeDistance = Math.min(
          Math.abs(nextPos.x - minX), Math.abs(nextPos.x - maxX),
          Math.abs(nextPos.y - minY), Math.abs(nextPos.y - maxY)
        )
        stuckInSmallAreaBonus = 50 * stuckCounter + escapeDistance * 10
        console.log(`🎆 ESCAPING SMALL AREA: Escape distance ${escapeDistance.toFixed(1)}, bonus: ${stuckInSmallAreaBonus.toFixed(1)}`)
      }
    }
  }
  
  // Apply circular motion penalty and escape bonus
  score -= circularMotionPenalty
  score -= stuckInSmallAreaPenalty
  score += stuckInSmallAreaBonus
  
  // Apply escape bonus for breaking circular motion patterns
  if (circularMotionDetected && circularMotionCounter > 1) {
    const loopPositions = recentPositions.slice(-4).map(r => r.pos)
    const avgX = loopPositions.reduce((sum, p) => sum + p.x, 0) / loopPositions.length
    const avgY = loopPositions.reduce((sum, p) => sum + p.y, 0) / loopPositions.length
    const loopCenter = { x: avgX, y: avgY }
    const distFromLoopCenter = distance(nextPos, loopCenter)
    const escapeBonus = Math.max(0, distFromLoopCenter - 2) * 30 * circularMotionCounter
    score += escapeBonus
  }
  
  // Difficulty-specific adjustments
  switch (difficulty) {
    case 'easy':
      // Add randomness and prefer safer moves
      score += (Math.random() - 0.5) * 5
      if (futureSpeed > 3) score -= 12 // very strong penalty for high speed
      // Extra caution in corners
      if (targetPoint.cornerType !== 'straight') score -= 4
      // Prefer gentle accelerations
      if (Math.abs(speedChange) > 1.5) score -= 8
      break
      
    case 'medium':
      // Balanced approach with slight randomness
      score += (Math.random() - 0.5) * 2
      if (futureSpeed > 6) score -= 3 // Reduced penalty for speed
      
      // RACING LINE ADHERENCE: Strong penalty for medium AI being off-line
      if (lineDistance > 6) {
        score -= (lineDistance - 6) * 8 // Progressive penalty for being off racing line
      }
      
      // Reasonable corner speed management - REDUCED penalty
      if (targetPoint.cornerType === 'apex' && futureSpeed > lapBasedTargetSpeed + 1) {
        score -= 3
      }
      // Avoid sudden speed changes - REDUCED penalty
      if (Math.abs(speedChange) > 3) score -= 2
      break
      
    case 'hard':
      // Optimal racing with minimal randomness but still safety-conscious
      if (futureSpeed > 5) score -= 3 // some penalty even for hard AI
      if (futureSpeed < 2 && lineDistance > 5) score -= 10 // penalty for being slow and off-line
      if (targetPoint.cornerType === 'straight' && futureSpeed < 4) {
        score -= 3 // should be reasonably fast on straights
      }
      // Aggressive corner exit strategy but not reckless
      if (targetPoint.cornerType === 'exit' && futureSpeed < lapBasedTargetSpeed + 0.5) {
        score -= 2 // should be accelerating on exit
      }
      break
  }
  
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

// Emergency move handling when no legal moves are available
function handleEmergencyMove(state: GameState, car: any, difficulty: 'easy' | 'medium' | 'hard'): Vec | null {
  // When in emergency mode, we need to make the least bad choice
  // This usually means the car is moving too fast or is heading toward a wall
  
  const allMoves = stepOptions(state)
  if (allMoves.length === 0) {
    if (isFeatureEnabled('debugMode')) {
      console.error(`🚨 AI Emergency: No moves possible at all! Car at: ${JSON.stringify(car.pos)}, velocity: ${JSON.stringify(car.vel)}`)
    }
    return null // Absolutely no moves possible
  }
  
  if (isFeatureEnabled('debugMode')) {
    console.log(`🚨 AI Emergency Mode: Evaluating ${allMoves.length} crash moves for least damage`)
  }
  
  // Strategy: Find the move that gets us closest to stopping or slowing down
  // and causes the least catastrophic crash
  let bestEmergencyMove = allMoves[0]!
  let bestScore = -Infinity
  
  const currentSpeed = Math.hypot(car.vel.x, car.vel.y)
  
  for (const { acc, nextPos } of allMoves) {
    const velAfter = { x: car.vel.x + acc.x, y: car.vel.y + acc.y }
    const futureSpeed = Math.hypot(velAfter.x, velAfter.y)
    
    let emergencyScore = 0
    
    // Primary goal: reduce speed as much as possible
    const speedReduction = currentSpeed - futureSpeed
    emergencyScore += speedReduction * 20 // Heavy bonus for slowing down
    
    // Secondary goal: avoid acceleration if possible
    if (futureSpeed < currentSpeed) {
      emergencyScore += 15 // Bonus for decelerating
    } else {
      emergencyScore -= (futureSpeed - currentSpeed) * 10 // Penalty for accelerating further
    }
    
    // Prefer moves that get us to zero velocity fastest
    if (futureSpeed === 0) {
      emergencyScore += 50 // Big bonus for complete stop
    } else if (futureSpeed < 2) {
      emergencyScore += 25 // Good bonus for very slow speed
    }
    
    // Try to steer away from walls if we can figure out a safe direction
    const racingLine = computeRacingLine(state)
    const nearestTarget = findNearestRacingLineTarget(nextPos, racingLine)
    const distanceToSafety = distance(nextPos, nearestTarget.pos)
    emergencyScore -= distanceToSafety * 2 // Prefer moves closer to safe racing line
    
    // Avoid extreme accelerations in emergency
    const accMagnitude = Math.hypot(acc.x, acc.y)
    if (accMagnitude > 1) {
      emergencyScore -= accMagnitude * 3 // Penalty for extreme acceleration changes
    }
    
    if (emergencyScore > bestScore) {
      bestScore = emergencyScore
      bestEmergencyMove = { acc, nextPos }
    }
  }
  
  if (isFeatureEnabled('debugMode')) {
    const velAfter = { x: car.vel.x + bestEmergencyMove.acc.x, y: car.vel.y + bestEmergencyMove.acc.y }
    const futureSpeed = Math.hypot(velAfter.x, velAfter.y)
    console.log(`🚨 AI Emergency: Selected move ${JSON.stringify(bestEmergencyMove.acc)}, ` +
      `current speed: ${currentSpeed.toFixed(1)}, future speed: ${futureSpeed.toFixed(1)}, ` +
      `score: ${bestScore.toFixed(1)}`)
  }
  
  return bestEmergencyMove.acc
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
        
        // Run path planning
        plannedPath = planPath(state, car.pos, car.vel, racingLine, 0, 3, difficulty);
        
        const endTime = performance.now();
        console.log(`⏱️ Path planning took ${(endTime - startTime).toFixed(2)}ms`);
        
        if (plannedPath) {
          console.log(`✅ Path planning succeeded! Move: ${JSON.stringify(plannedPath.acc)}, Score: ${plannedPath.totalScore.toFixed(2)}`);
          // Enhanced debugging for path planning
          if (isFeatureEnabled('debugMode')) {
            console.log(`🤖 AI ${player.name} (${difficulty}) using path planning:`, JSON.stringify({
              position: car.pos,
              velocity: car.vel,
              plannedMove: plannedPath.acc,
              totalScore: plannedPath.totalScore.toFixed(2),
              depth: plannedPath.depth
            }, null, 2));
          }
          return plannedPath.acc;
        } else {
          console.log(`❌ Path planning failed, falling back to single-move evaluation`);
        }
      } catch (error) {
        console.warn(`🚫 Error in path planning:`, error);
        console.log(`❌ Path planning failed with error, falling back to single-move evaluation`);
      }
    } else {
      console.log(`📝 Using single-move evaluation for ${difficulty} AI`);
    }
    
    // Fallback to enhanced single-move evaluation
    let best = legal[0]!
    let bestScore = -Infinity
    
    console.log(`🔢 EVALUATING ${legal.length} POSSIBLE MOVES:`)
    
    // Add detailed analysis for each move
    const moveAnalysis: Array<{acc: Vec, nextPos: Vec, velAfter: Vec, score: number, analysis: string}> = []
    
    for (const { acc, nextPos } of legal) {
      const velAfter = { x: car.vel.x + acc.x, y: car.vel.y + acc.y }
      const targetPoint = findNearestRacingLineTarget(nextPos, racingLine)
      
      // Log detailed scoring breakdown for zero moves
      const isZeroAcceleration = acc.x === 0 && acc.y === 0
      if (isZeroAcceleration && isFeatureEnabled('debugMode')) {
        console.log(`🔍 ZERO ACCELERATION MOVE DETAILED ANALYSIS:`, {
          currentPos: car.pos,
          currentVel: car.vel,
          nextPos,
          velAfter,
          lineDistance: distance(nextPos, targetPoint.pos).toFixed(1),
          cornerDistance: getDistanceToNextCorner(car.pos, racingLine).toFixed(1),
          targetPoint: targetPoint.pos
        })
      }
      
      const score = scoreAdvancedMove(state, nextPos, velAfter, targetPoint, difficulty)
      
      // Check if this is a backward move
      const expectedDirection = getExpectedRacingDirection(car.pos)
      const velocityAlignment = velAfter.x * expectedDirection.x + velAfter.y * expectedDirection.y
      const isBackward = velocityAlignment < -0.5
      const futureSpeed = Math.hypot(velAfter.x, velAfter.y)
      
      const analysis = `align=${velocityAlignment.toFixed(2)}, ${isBackward ? 'BACKWARD' : 'FORWARD'}, speed=${futureSpeed.toFixed(1)}${isZeroAcceleration ? ' [ZERO-ACCEL]' : ''}`
      
      console.log(`  Move ${JSON.stringify(acc)}: pos=${JSON.stringify(nextPos)}, vel=${JSON.stringify(velAfter)}, score=${score.toFixed(1)}, ${analysis}`) 
      
      moveAnalysis.push({ acc, nextPos, velAfter, score, analysis })
      
      if (score > bestScore) {
        bestScore = score
        best = { acc, nextPos }
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

