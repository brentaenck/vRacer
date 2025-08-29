/**
 * AI Players for vRacer
 *
 * Enhanced AI system with difficulty-based strategies:
 * - Easy: Basic checkpoint following with some mistakes
 * - Medium: Balanced racing with speed considerations
 * - Hard: Advanced path planning with collision avoidance
 */

import { isFeatureEnabled } from './features'
import { applyMove, getCurrentCar, getCurrentPlayer, isMultiCarGame, legalStepOptions, type GameState, stepOptions } from './game'
import type { Vec } from './geometry'

// Track checkpoints for navigation (counter-clockwise order)
function computeDefaultCheckpoints(state: GameState): Vec[] {
  const outer = state.outer
  const minX = Math.min(...outer.map(p => p.x))
  const maxX = Math.max(...outer.map(p => p.x))
  const minY = Math.min(...outer.map(p => p.y))
  const maxY = Math.max(...outer.map(p => p.y))
  const midX = (minX + maxX) / 2
  const midY = (minY + maxY) / 2

  return [
    { x: midX, y: maxY - 3 },      // bottom middle (start area)
    { x: maxX - 3, y: maxY - 3 },  // bottom right corner
    { x: maxX - 3, y: midY },      // right middle
    { x: maxX - 3, y: minY + 3 },  // top right corner
    { x: midX, y: minY + 3 },      // top middle
    { x: minX + 3, y: minY + 3 },  // top left corner
    { x: minX + 3, y: midY },      // left middle
    { x: minX + 3, y: maxY - 3 },  // bottom left corner
  ]
}

function distance(a: Vec, b: Vec): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.hypot(dx, dy)
}

// Enhanced move scoring with difficulty-based strategies
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

export function chooseAIMove(state: GameState): Vec | null {
  if (!isMultiCarGame(state)) return null
  if (!isFeatureEnabled('aiPlayers')) return null

  const player = getCurrentPlayer(state)
  const car = getCurrentCar(state)
  if (!player || !player.isAI || !car) return null

  const legal = legalStepOptions(state)
  if (legal.length === 0) return null

  // Get AI difficulty (default to medium)
  const difficulty = player.aiDifficulty || 'medium'
  
  // Determine target checkpoint using enhanced logic
  const checkpoints = computeDefaultCheckpoints(state)
  const target = selectTargetCheckpoint(car.pos, checkpoints, car.currentLap)

  // Score all legal moves using difficulty-appropriate strategy
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

  // Add some debugging if debug mode is enabled
  if (isFeatureEnabled('debugMode')) {
    console.log(`🤖 AI ${player.name} (${difficulty}) choosing move:`, {
      position: car.pos,
      velocity: car.vel,
      target: target,
      chosenMove: best.acc,
      score: bestScore.toFixed(2)
    })
  }

  return best.acc
}

