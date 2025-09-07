import { add, clamp, Segment, segmentInsidePolygon, segmentsIntersect, Vec } from './geometry'
import { isFeatureEnabled } from './features'
import { performanceTracker } from './performance'
import { animationManager, AnimationUtils } from './animations'
import { hudManager, HUDData } from './hud'
import { createTrackAnalysisWithCustomLine, getExpectedRacingDirection, findNearestRacingLinePoint, determineCrossingDirection, type TrackAnalysis, type RacingLinePoint } from './track-analysis'
import { isRacingLineVisible } from './racing-line-ui'

// Individual car state
export interface Car {
  id: string
  playerId: string
  name: string
  pos: Vec
  vel: Vec
  trail: Vec[]
  crashed: boolean
  finished: boolean
  // Lap tracking
  currentLap: number
  lastCrossDirection?: 'forward' | 'backward'
  finishTime?: number
  // Checkpoint validation for proper lap completion
  checkpointsPassed: boolean[] // Track which checkpoints have been passed in order
  lastValidCheckpoint: number // Last checkpoint passed in sequence (-1 if none)
  lapStartPosition?: Vec // Position where current lap attempt started
  // Car appearance
  color: string
  // Undo history (only for current player's car)
  previousStates?: Car[]
}

// Player information
export interface Player {
  id: string
  name: string
  color: string
  isLocal: boolean // Whether this player is controlled locally
  // AI fields (optional)
  isAI?: boolean
  aiDifficulty?: 'easy' | 'medium' | 'hard'
}

// Multi-car game state
type MultiCarGameState = {
  // Track definition (shared)
  grid: number
  outer: Vec[]
  inner: Vec[]
  walls: Segment[]
  start: Segment
  targetLaps: number
  
  // Multi-car state
  cars: Car[]
  players: Player[]
  currentPlayerIndex: number // Whose turn it is
  
  // Game session state
  gameStarted: boolean
  gameFinished: boolean
  raceStartTime: number
  
  // UI state
  showGrid: boolean
  showCandidates: boolean
  showHelp: boolean
  hoveredPosition?: Vec // For current player only
  
  // Undo/redo system for the entire game state
  previousGameStates?: MultiCarGameState[]
  
  // Animation state
  animatedPos?: Vec
  isAnimating?: boolean
}

// Legacy single-car state for backwards compatibility
type LegacyGameState = {
  grid: number
  outer: Vec[]
  inner: Vec[]
  walls: Segment[]
  start: Segment
  pos: Vec
  vel: Vec
  trail: Vec[]
  crashed: boolean
  finished: boolean
  showGrid: boolean
  showCandidates: boolean
  showHelp: boolean
  currentLap: number
  targetLaps: number
  lastCrossDirection?: 'forward' | 'backward'
  hoveredPosition?: Vec
  previousStates?: LegacyGameState[]
  animatedPos?: Vec
  isAnimating?: boolean
}

// Union type for GameState to handle both modes
type GameState = LegacyGameState | MultiCarGameState

// Type guard functions
export function isMultiCarGame(state: GameState): state is MultiCarGameState {
  return 'cars' in state && Array.isArray((state as MultiCarGameState).cars)
}

export function isLegacyGame(state: GameState): state is LegacyGameState {
  return 'pos' in state && 'vel' in state && 'crashed' in state
}

// Car colors for multiplayer
const CAR_COLORS = [
  '#ff4444', // Red
  '#44ff44', // Green  
  '#4444ff', // Blue
  '#ffff44', // Yellow
  '#ff44ff', // Magenta
  '#44ffff', // Cyan
  '#ff8844', // Orange
  '#8844ff', // Purple
]

// Create a new car instance
export function createCar(id: string, playerId: string, name: string, startPos: Vec, color: string): Car {
  // Initialize checkpoint tracking for lap validation
  // We'll use 4 checkpoints for the rectangular track (one per side)
  const numCheckpoints = 4
  const checkpointsPassed = new Array(numCheckpoints).fill(false)
  
  return {
    id,
    playerId,
    name,
    pos: { ...startPos },
    vel: { x: 0, y: 0 },
    trail: [{ ...startPos }],
    crashed: false,
    finished: false,
    currentLap: 0,
    lastCrossDirection: undefined,
    finishTime: undefined,
    // Checkpoint validation for proper lap completion
    checkpointsPassed,
    lastValidCheckpoint: -1, // No checkpoints passed yet
    lapStartPosition: { ...startPos }, // Track where this lap attempt started
    color,
    previousStates: []
  }
}

// Create a new player
export function createPlayer(id: string, name: string, color: string, isLocal = true): Player {
  return {
    id,
    name,
    color,
    isLocal
  }
}

// Create multi-car game state
export function createMultiCarGame(numPlayers = 2): GameState {
  if (!isFeatureEnabled('multiCarSupport')) {
    // Fall back to single-player mode
    return createLegacyGame()
  }
  
  const grid = 20 // pixels per grid unit
  // Simple rounded rectangle track
  const outer: Vec[] = [
    { x: 2, y: 2 }, { x: 48, y: 2 }, { x: 48, y: 33 }, { x: 2, y: 33 }
  ]
  const inner: Vec[] = [
    { x: 12, y: 10 }, { x: 38, y: 10 }, { x: 38, y: 25 }, { x: 12, y: 25 }
  ]
  // Walls: edges of inner and outer polygons
  const wallSegments = (poly: Vec[]) => poly.map((p, i) => ({ a: p, b: poly[(i + 1) % poly.length] || poly[0]! }))
  const walls = [...wallSegments(outer), ...wallSegments(inner)]

  // Start/finish line spans across the track width at the left side
  const start: Segment = { a: { x: 2, y: 18 }, b: { x: 12, y: 18 } }

  // Starting positions for multiple cars (staggered)
  const startPositions: Vec[] = [
    { x: 7, y: 20 },   // Player 1: center
    { x: 5, y: 21 },   // Player 2: left & back
    { x: 9, y: 21 },   // Player 3: right & back  
    { x: 6, y: 22 },   // Player 4: left & further back
    { x: 8, y: 22 },   // Player 5: right & further back
    { x: 7, y: 23 },   // Player 6: center & way back
    { x: 5, y: 23 },   // Player 7: left & way back
    { x: 9, y: 23 },   // Player 8: right & way back
  ]

  // Create players and cars
  const players: Player[] = []
  const cars: Car[] = []
  
  const clampedNumPlayers = Math.max(1, Math.min(numPlayers, 8)) // Support 1-8 players
  
  for (let i = 0; i < clampedNumPlayers; i++) {
    const playerId = `player-${i + 1}`
    const playerName = `Player ${i + 1}`
    const color = CAR_COLORS[i % CAR_COLORS.length] || '#ff4444'
    const startPos = startPositions[i] || { x: 7, y: 20 + i } // Fallback positioning
    
    // Default to local human players
    const player = createPlayer(playerId, playerName, color, true)
    // If AI feature is enabled, convert players after the first to AI by default (MVP behavior)
    if (isFeatureEnabled('aiPlayers') && i > 0) {
      (player as Player).isLocal = false
      ;(player as Player).isAI = true
      ;(player as Player).aiDifficulty = 'medium'
    }
    const car = createCar(`car-${i + 1}`, playerId, `${playerName}'s Car`, startPos, color)
    
    players.push(player)
    cars.push(car)
  }

  return {
    // Track definition
    grid,
    outer,
    inner,
    walls,
    start,
    targetLaps: 3,
    
    // Multi-car state
    cars,
    players,
    currentPlayerIndex: 0, // Start with first player
    
    // Game session
    gameStarted: true,
    gameFinished: false,
    raceStartTime: Date.now(),
    
    // UI state
    showGrid: true,
    showCandidates: true,
    showHelp: true,
    hoveredPosition: undefined,
    
    // Undo system
    previousGameStates: [],
    
    // Animation state
    animatedPos: undefined,
    isAnimating: false
  }
}

// Create multi-car game from explicit player configuration
export function createMultiCarGameFromConfig(config: { players: Array<{ name: string; isLocal: boolean; isAI?: boolean; aiDifficulty?: 'easy'|'medium'|'hard'; color?: string }>; targetLaps?: number }): GameState {
  const base = createMultiCarGame(Math.max(1, Math.min(config.players.length, 8))) as any
  // Override players according to config
  const assignedPlayers: Player[] = []
  for (let i = 0; i < config.players.length; i++) {
    const pCfg = config.players[i]
    const color = pCfg?.color || CAR_COLORS[i % CAR_COLORS.length] || '#ff4444'
    assignedPlayers.push({
      id: `player-${i + 1}`,
      name: pCfg?.name || `Player ${i + 1}`,
      color,
      isLocal: pCfg?.isLocal ?? true,
      isAI: pCfg?.isAI ?? false,
      aiDifficulty: pCfg?.aiDifficulty || (pCfg?.isAI ? 'medium' : undefined)
    })
  }
  base.players = assignedPlayers
  
  // Set target laps if provided in config
  if (config.targetLaps !== undefined) {
    base.targetLaps = config.targetLaps
  }
  
  // Sync car colors and names to player configs
  for (let i = 0; i < Math.min(base.cars.length, assignedPlayers.length); i++) {
    const player = assignedPlayers[i]
    if (!player) continue
    base.cars[i].name = `${player.name}'s Car`
    base.cars[i].playerId = player.id
    base.cars[i].color = player.color
    // Reset dynamic car state for a clean game
    const startPos = base.cars[i].trail[0] || { x: 7, y: 20 + i }
    base.cars[i].pos = { ...startPos }
    base.cars[i].vel = { x: 0, y: 0 }
    base.cars[i].trail = [ { ...startPos } ]
    base.cars[i].crashed = false
    base.cars[i].finished = false
    base.cars[i].currentLap = 0
    base.cars[i].lastCrossDirection = undefined
    base.cars[i].finishTime = undefined
    // Reset checkpoint tracking
    base.cars[i].checkpointsPassed = new Array(4).fill(false)
    base.cars[i].lastValidCheckpoint = -1
    base.cars[i].lapStartPosition = { ...startPos }
  }
  base.currentPlayerIndex = 0
  base.gameFinished = false
  base.raceStartTime = Date.now()
  return base
}

// Legacy single-car game creation for backwards compatibility
export function createLegacyGame(): LegacyGameState {
  const grid = 20 // pixels per grid unit
  // Simple rounded rectangle track
  const outer: Vec[] = [
    { x: 2, y: 2 }, { x: 48, y: 2 }, { x: 48, y: 33 }, { x: 2, y: 33 }
  ]
  const inner: Vec[] = [
    { x: 12, y: 10 }, { x: 38, y: 10 }, { x: 38, y: 25 }, { x: 12, y: 25 }
  ]
  // Walls: edges of inner and outer polygons
  const wallSegments = (poly: Vec[]) => poly.map((p, i) => ({ a: p, b: poly[(i + 1) % poly.length] || poly[0]! }))
  const walls = [...wallSegments(outer), ...wallSegments(inner)]

  // Start/finish line spans across the track width at the left side
  const start: Segment = { a: { x: 2, y: 18 }, b: { x: 12, y: 18 } }

  // Start the car below the finish line (higher y value = lower on screen)
  const startCell = { x: 7, y: 20 }

  return {
    grid,
    outer,
    inner,
    walls,
    start,
    pos: { ...startCell },
    vel: { x: 0, y: 0 },
    trail: [{ ...startCell }],
    crashed: false,
    finished: false,
    showGrid: true,
    showCandidates: true,
    showHelp: true,
    // Initialize lap tracking
    currentLap: 0,
    targetLaps: 3,
    lastCrossDirection: undefined,
  }
}

// Main game creation function - chooses between multi-car and legacy based on feature flag
export function createDefaultGame(): GameState {
  if (isFeatureEnabled('multiCarSupport')) {
    return createMultiCarGame(2) // Default to 2 players
  } else {
    return createLegacyGame() as any // Type cast for backwards compatibility
  }
}

// Multi-car aware step options - for the current player's car
export function stepOptions(state: GameState): { acc: Vec; nextPos: Vec }[] {
  if (isFeatureEnabled('multiCarSupport') && 'cars' in state) {
    const currentCar = state.cars[state.currentPlayerIndex]
    if (!currentCar) return []
    
    const opts: { acc: Vec; nextPos: Vec }[] = []
    for (let ax = -1; ax <= 1; ax++) {
      for (let ay = -1; ay <= 1; ay++) {
        const acc = { x: ax, y: ay }
        const vel = { x: currentCar.vel.x + ax, y: currentCar.vel.y + ay }
        const nextPos = { x: currentCar.pos.x + vel.x, y: currentCar.pos.y + vel.y }
        opts.push({ acc, nextPos })
      }
    }
    return opts
  } else {
    // Legacy single-car mode
    const legacyState = state as any
    const opts: { acc: Vec; nextPos: Vec }[] = []
    for (let ax = -1; ax <= 1; ax++) {
      for (let ay = -1; ay <= 1; ay++) {
        const acc = { x: ax, y: ay }
        const vel = { x: legacyState.vel.x + ax, y: legacyState.vel.y + ay }
        const nextPos = { x: legacyState.pos.x + vel.x, y: legacyState.pos.y + vel.y }
        opts.push({ acc, nextPos })
      }
    }
    return opts
  }
}

export function polyToSegments(poly: Vec[]): Segment[] {
return poly.map((p, i) => ({ a: p, b: poly[(i + 1) % poly.length] || poly[0]! }))
}

function insideTrack(p: Vec, state: GameState): boolean {
  // Inside outer and outside inner
  const inOuter = pointInPoly(p, state.outer)
  const inInner = pointInPoly(p, state.inner)
  return inOuter && !inInner
}

export function pointInPoly(p: Vec, poly: Vec[]): boolean {
  // ray casting
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const pi = poly[i]
    const pj = poly[j]
    if (!pi || !pj) continue
    const intersect = (pi.y > p.y) !== (pj.y > p.y) &&
      p.x < ((pj.x - pi.x) * (p.y - pi.y)) / (pj.y - pi.y + 1e-12) + pi.x
    if (intersect) inside = !inside
  }
  return inside
}

export function pathLegal(a: Vec, b: Vec, state: GameState): boolean {
  // stays within track band and does not cross walls
  // Sample along the path, ensure insideTrack
  const dx = b.x - a.x
  const dy = b.y - a.y
  const steps = Math.max(Math.abs(dx), Math.abs(dy)) * 2
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const p = { x: a.x + dx * t, y: a.y + dy * t }
    if (!insideTrack(p, state)) return false
  }
  // Also ensure we don't cross the start line from the wrong side (optional)
  return true
}

// Define track checkpoints for lap validation
// For our rectangular counter-clockwise track, we define 4 checkpoints:
// Track boundaries: outer (2,2)-(48,33), inner (12,10)-(38,25)
// Cars start at (7,20) and race counter-clockwise: down → right → up → left → back to start
// Natural racing order: Bottom → Right → Top → Left → Finish
const TRACK_CHECKPOINTS: Segment[] = [
  // Checkpoint 0: Bottom side (first checkpoint after start) - spans vertically across track
  { a: { x: 25, y: 33 }, b: { x: 25, y: 25 } },
  
  // Checkpoint 1: Right side (after turning up) - spans horizontally across track  
  { a: { x: 48, y: 17.5 }, b: { x: 38, y: 17.5 } },
  
  // Checkpoint 2: Top side (after turning right) - spans vertically across track
  { a: { x: 25, y: 10 }, b: { x: 25, y: 2 } },
  
  // Checkpoint 3: Left side (after turning down, before returning to start) - spans horizontally across track
  { a: { x: 12, y: 17.5 }, b: { x: 2, y: 17.5 } }
]

// Determine if crossing the start line is in the correct direction (forward/backward)
function determineCrossDirection(fromPos: Vec, toPos: Vec, startLine: Segment): 'forward' | 'backward' {
  // Track layout analysis:
  // - Start line: horizontal at y=18 (from x=2 to x=12)
  // - Cars start at: y=20+ (below the start line)
  // - Counter-clockwise racing: down → right → up → left → back to start
  // - To complete a lap: cars must approach from above (y < 18) and cross downward (y > 18)
  
  const lineY = startLine.a.y // Start line is horizontal, so both points have same y
  const fromSide = fromPos.y < lineY ? 'top' : 'bottom'
  const toSide = toPos.y < lineY ? 'top' : 'bottom'
  
  // For counter-clockwise racing on this track:
  // FORWARD crossing: from TOP side to BOTTOM side (from y < 18 to y > 18)
  // This means the car has completed the counter-clockwise lap and is returning to start area
  if (fromSide === 'top' && toSide === 'bottom') {
    return 'forward'
  }
  
  // BACKWARD crossing: from BOTTOM side to TOP side (from y > 18 to y < 18)
  // This means the car is going the wrong way (clockwise)
  else if (fromSide === 'bottom' && toSide === 'top') {
    return 'backward'
  }
  
  // If both positions are on the same side, this shouldn't count as a crossing
  // But if we reach here, default to forward to avoid breaking the game
  return 'forward'
}

// Check if a car passes through any checkpoints during a move
function updateCheckpointProgress(car: Car, fromPos: Vec, toPos: Vec): {
  updatedCheckpointsPassed: boolean[]
  updatedLastValidCheckpoint: number
  resetLap: boolean
} {
  const movePath: Segment = { a: fromPos, b: toPos }
  
  // Ensure we have valid checkpoint data - handle legacy cars
  let updatedCheckpointsPassed = car.checkpointsPassed || new Array(TRACK_CHECKPOINTS.length).fill(false)
  let updatedLastValidCheckpoint = car.lastValidCheckpoint ?? -1
  let resetLap = false
  
  // Create a copy to avoid mutating the original
  updatedCheckpointsPassed = [...updatedCheckpointsPassed]
  
  // Check each checkpoint for crossing
  for (let i = 0; i < TRACK_CHECKPOINTS.length; i++) {
    const checkpoint = TRACK_CHECKPOINTS[i]!
    
    if (segmentsIntersect(movePath, checkpoint)) {
      // Determine if this is the next expected checkpoint in sequence
      const expectedNextCheckpoint = (car.lastValidCheckpoint + 1) % TRACK_CHECKPOINTS.length
      
      if (i === expectedNextCheckpoint && !updatedCheckpointsPassed[i]) {
        // Valid checkpoint progression AND not already passed
        updatedCheckpointsPassed[i] = true
        updatedLastValidCheckpoint = i
        
        if (isFeatureEnabled('debugMode')) {
          const passedCheckpoints = updatedCheckpointsPassed.map((passed, idx) => passed ? idx : null).filter(cp => cp !== null)
          console.log(`✓ ${car.name} passed checkpoint ${i} (valid progression)`, {
            checkpoint: i,
            lastValid: car.lastValidCheckpoint,
            expected: expectedNextCheckpoint,
            checkpointsPassed: updatedCheckpointsPassed,
            passedCheckpoints: passedCheckpoints,
            progress: `${passedCheckpoints.length}/${TRACK_CHECKPOINTS.length}`,
            from: fromPos,
            to: toPos
          })
        }
      } else if (i !== expectedNextCheckpoint && !updatedCheckpointsPassed[i]) {
        // Invalid checkpoint sequence - car went backwards or skipped checkpoints
        // Only process if not already handled for this checkpoint
        if (isFeatureEnabled('debugMode')) {
          console.log(`⚠️ ${car.name} passed checkpoint ${i} out of sequence`, {
            checkpoint: i,
            lastValid: car.lastValidCheckpoint,
            expected: expectedNextCheckpoint,
            from: fromPos,
            to: toPos
          })
        }
        
        // Reset checkpoint progress - car must start lap validation over
        updatedCheckpointsPassed.fill(false)
        updatedLastValidCheckpoint = -1
        resetLap = true
        
        // If the crossed checkpoint is checkpoint 0, start fresh from there
        if (i === 0) {
          updatedCheckpointsPassed[0] = true
          updatedLastValidCheckpoint = 0
          resetLap = false
        }
      }
      // If checkpoint is already passed (updatedCheckpointsPassed[i] is true), ignore this crossing
    }
  }
  
  return {
    updatedCheckpointsPassed,
    updatedLastValidCheckpoint,
    resetLap
  }
}

// Check if a car has completed a valid lap (all checkpoints passed in sequence)
function hasCompletedValidLap(checkpointsPassed: boolean[], lastValidCheckpoint: number): boolean {
  // A valid lap requires:
  // 1. All checkpoints have been passed (all true)
  // 2. The last valid checkpoint is the final one (checkpoint 3)
  const allCheckpointsPassed = checkpointsPassed.every(passed => passed)
  const completedFullSequence = lastValidCheckpoint === TRACK_CHECKPOINTS.length - 1
  
  return allCheckpointsPassed && completedFullSequence
}

// Reset checkpoint progress for a new lap
function resetCheckpointProgress(): {
  checkpointsPassed: boolean[]
  lastValidCheckpoint: number
} {
  return {
    checkpointsPassed: new Array(TRACK_CHECKPOINTS.length).fill(false),
    lastValidCheckpoint: -1
  }
}

// Car collision detection functions (carCollisions feature)
function checkCarCollision(movingCar: Car, fromPos: Vec, toPos: Vec, otherCars: Car[]): Car | null {
  if (!isFeatureEnabled('carCollisions')) {
    return null // Collisions disabled
  }
  
  const movingCarId = movingCar.id
  const movePath: Segment = { a: fromPos, b: toPos }
  
  for (const otherCar of otherCars) {
    // Don't check collision with self
    if (otherCar.id === movingCarId) continue
    
    // Skip crashed or finished cars for collision purposes
    if (otherCar.crashed || otherCar.finished) continue
    
    // Check if moving car's path intersects with other car's position
    if (carPathIntersectsPosition(movePath, otherCar.pos)) {
      return otherCar
    }
    
    // Check if destination position conflicts with other car's position
    if (positionsOverlap(toPos, otherCar.pos)) {
      return otherCar
    }
  }
  
  return null // No collision detected
}

function carPathIntersectsPosition(path: Segment, carPos: Vec): boolean {
  // Check if the car's movement path passes through another car's position
  // We'll use a small radius around the car position for more realistic collision
  const collisionRadius = 0.6 // Grid units - slightly more than half a grid cell
  
  // Find the closest point on the path to the car position
  const closestPoint = closestPointOnSegment(path, carPos)
  
  // Calculate distance from closest point to car position
  const distance = Math.sqrt(
    Math.pow(closestPoint.x - carPos.x, 2) + 
    Math.pow(closestPoint.y - carPos.y, 2)
  )
  
  return distance <= collisionRadius
}

function positionsOverlap(pos1: Vec, pos2: Vec): boolean {
  // Check if two car positions are too close (overlapping)
  const minDistance = 1.0 // Minimum distance between cars in grid units
  
  const distance = Math.sqrt(
    Math.pow(pos1.x - pos2.x, 2) + 
    Math.pow(pos1.y - pos2.y, 2)
  )
  
  return distance < minDistance
}

function closestPointOnSegment(segment: Segment, point: Vec): Vec {
  // Find the closest point on a line segment to a given point
  const { a, b } = segment
  const dx = b.x - a.x
  const dy = b.y - a.y
  
  if (dx === 0 && dy === 0) {
    // Segment is actually a point
    return { x: a.x, y: a.y }
  }
  
  // Calculate parameter t for the closest point
  const t = Math.max(0, Math.min(1, 
    ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy)
  ))
  
  return {
    x: a.x + t * dx,
    y: a.y + t * dy
  }
}

// Collision consequences and handling
type CollisionResult = {
  type: 'none' | 'stop' | 'bounce' | 'crash'
  newVelocity?: Vec
  damage?: number
}

function handleCollision(movingCar: Car, collidedCar: Car): CollisionResult {
  if (!isFeatureEnabled('carCollisions')) {
    return { type: 'none' }
  }
  
  // For now, implement simple "stop" collision - cars just stop when they hit
  // Future: could implement bounce physics, damage, different collision types
  
  if (isFeatureEnabled('debugMode')) {
    console.log(`💥 Car collision: ${movingCar.name} hits ${collidedCar.name}!`)
  }
  
  // Simple collision: moving car stops at the point just before collision
  return {
    type: 'stop',
    newVelocity: { x: 0, y: 0 }, // Stop the car
    damage: 0 // No damage for now
  }
}

export function applyMove(state: GameState, acc: Vec): GameState {
  // Multi-car support is disabled, so we can safely cast to legacy state
  if (!isFeatureEnabled('multiCarSupport')) {
    const legacyState = state as LegacyGameState
    
    if (legacyState.crashed || legacyState.finished) return legacyState
    const vel = { x: legacyState.vel.x + acc.x, y: legacyState.vel.y + acc.y }
    const nextPos = { x: legacyState.pos.x + vel.x, y: legacyState.pos.y + vel.y }

    const legal = pathLegal(legacyState.pos, nextPos, legacyState)
    let crashed: boolean = legacyState.crashed
    let finished: boolean = legacyState.finished
    let currentLap = legacyState.currentLap
    let lastCrossDirection = legacyState.lastCrossDirection

    const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y)
    
    // Lap detection: check if car crosses start line
    const moveSeg: Segment = { a: legacyState.pos, b: nextPos }
    const crossedStart = segmentsIntersect(moveSeg, legacyState.start)
    
    // Debug logging for finish line detection (when debug mode is enabled)
    if (isFeatureEnabled('debugMode') && crossedStart) {
      const crossDirection = determineCrossDirection(legacyState.pos, nextPos, legacyState.start)
      console.log('🏁 Finish line crossed!', {
        from: legacyState.pos,
        to: nextPos,
        direction: crossDirection,
        currentLap: currentLap,
        targetLaps: legacyState.targetLaps,
        startLine: legacyState.start
      })
    }
    
    if (!legal) {
      crashed = true
      // Create explosion particles when crashing (if animations enabled)
      if (isFeatureEnabled('animations')) {
        AnimationUtils.createExplosion(nextPos, '#f66', 8)
      }
    } else {
      if (crossedStart) {
        // Determine crossing direction based on car position relative to start line
        // Start line is horizontal at y=18, so check if moving top-to-bottom (forward) or bottom-to-top (backward)
        const crossDirection = determineCrossDirection(legacyState.pos, nextPos, legacyState.start)
        
        // Only count forward crossings as valid lap completions
        if (crossDirection === 'forward') {
          currentLap += 1
          lastCrossDirection = 'forward'
          
          console.log('✅ Lap completed! Now on lap', currentLap, 'of', legacyState.targetLaps)
          
          // Check if race is complete
          if (currentLap >= legacyState.targetLaps) {
            finished = true
            console.log('🏆 Race finished!')
            // Create celebration particles when finishing the race
            if (isFeatureEnabled('animations')) {
              AnimationUtils.createCelebration(nextPos, '#0f0', 12)
            }
          } else {
            // Lap completed but race continues - smaller celebration
            if (isFeatureEnabled('animations')) {
              AnimationUtils.createCelebration(nextPos, '#4f4', 6)
            }
          }
        } else {
          lastCrossDirection = 'backward'
          console.log('⚠️ Wrong direction crossing!')
        }
      }
    }

    const trail = [...legacyState.trail, nextPos]
    
    // Save previous state for undo (when improvedControls is enabled)
    let previousStates = legacyState.previousStates || []
    if (isFeatureEnabled('improvedControls')) {
      // Save current state before applying move (without circular reference)
      const stateToSave = {
        ...legacyState,
        hoveredPosition: undefined,
        previousStates: undefined
      }
      previousStates = [...previousStates, stateToSave].slice(-10) // Keep last 10 moves
    }

    return { ...legacyState, pos: nextPos, vel, trail, crashed, finished, currentLap, lastCrossDirection, previousStates }
  } else {
    // Multi-car mode implementation
    const multiCarState = state as MultiCarGameState
    
    if (multiCarState.gameFinished) return multiCarState
    
    const currentCar = multiCarState.cars[multiCarState.currentPlayerIndex]
    if (!currentCar || currentCar.crashed || currentCar.finished) {
      // Switch to next player if current player can't move
      return switchToNextPlayer(multiCarState)
    }
    
    let vel = { x: currentCar.vel.x + acc.x, y: currentCar.vel.y + acc.y }
    let nextPos = { x: currentCar.pos.x + vel.x, y: currentCar.pos.y + vel.y }
    
    const legal = pathLegal(currentCar.pos, nextPos, multiCarState)
    let crashed: boolean = currentCar.crashed
    let finished: boolean = currentCar.finished
    let currentLap: number = currentCar.currentLap
    let lastCrossDirection: 'forward' | 'backward' | undefined = currentCar.lastCrossDirection
    let finishTime: number | undefined = currentCar.finishTime
    
    // Initialize checkpoint progress variables - ensure we have valid checkpoint data
    let updatedCheckpointsPassed = currentCar.checkpointsPassed || new Array(TRACK_CHECKPOINTS.length).fill(false)
    let updatedLastValidCheckpoint = currentCar.lastValidCheckpoint ?? -1
    
    const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y)
    
    // Lap detection: check if car crosses start line
    const moveSeg: Segment = { a: currentCar.pos, b: nextPos }
    const crossedStart = segmentsIntersect(moveSeg, multiCarState.start)
    
    if (isFeatureEnabled('debugMode') && crossedStart) {
      const crossDirection = determineCrossDirection(currentCar.pos, nextPos, multiCarState.start)
      console.log(`🏁 ${currentCar.name} crossed finish line!`, {
        player: multiCarState.players[multiCarState.currentPlayerIndex]?.name,
        from: currentCar.pos,
        to: nextPos,
        direction: crossDirection,
        currentLap: currentLap,
        targetLaps: multiCarState.targetLaps
      })
    }
    
    if (!legal) {
      crashed = true
      // Create explosion particles when crashing
      if (isFeatureEnabled('animations')) {
        AnimationUtils.createExplosion(nextPos, currentCar.color, 8)
      }
    } else {
      // Update checkpoint progress during the move
      const checkpointUpdate = updateCheckpointProgress(currentCar, currentCar.pos, nextPos)
      updatedCheckpointsPassed = checkpointUpdate.updatedCheckpointsPassed
      updatedLastValidCheckpoint = checkpointUpdate.updatedLastValidCheckpoint
      
      // Check for car-to-car collisions (carCollisions feature)
      const collidedCar = checkCarCollision(currentCar, currentCar.pos, nextPos, multiCarState.cars)
      if (collidedCar) {
        const collisionResult = handleCollision(currentCar, collidedCar)
        
        if (collisionResult.type === 'stop') {
          // Car stops at current position due to collision
          vel = collisionResult.newVelocity || { x: 0, y: 0 }
          nextPos = { ...currentCar.pos } // Stay at current position
          
          if (isFeatureEnabled('animations')) {
            AnimationUtils.createExplosion(nextPos, currentCar.color, 6)
          }
        }
        // Future: handle other collision types like 'bounce' or 'crash'
      }
      
      if (crossedStart) {
        const crossDirection = determineCrossDirection(currentCar.pos, nextPos, multiCarState.start)
        
        if (crossDirection === 'forward') {
          // Check if car has completed a valid lap with all checkpoints
          const completedValidLap = hasCompletedValidLap(updatedCheckpointsPassed, updatedLastValidCheckpoint)
          
          if (completedValidLap) {
            currentLap += 1
            lastCrossDirection = 'forward'
            
            // Reset checkpoint progress for the next lap
            const resetProgress = resetCheckpointProgress()
            updatedCheckpointsPassed = resetProgress.checkpointsPassed
            updatedLastValidCheckpoint = resetProgress.lastValidCheckpoint
            
            console.log(`✅ ${currentCar.name} completed valid lap ${currentLap}! (all checkpoints passed)`)
            
            // Check if this car finished the race
            if (currentLap >= multiCarState.targetLaps) {
              finished = true
              finishTime = Date.now() - multiCarState.raceStartTime
              console.log(`🏆 ${currentCar.name} finished the race! Time: ${(finishTime / 1000).toFixed(1)}s`)
              
              if (isFeatureEnabled('animations')) {
                AnimationUtils.createCelebration(nextPos, currentCar.color, 12)
              }
            } else {
              // Lap completed but race continues
              if (isFeatureEnabled('animations')) {
                AnimationUtils.createCelebration(nextPos, currentCar.color, 6)
              }
            }
          } else {
            // Forward crossing but invalid lap (not all checkpoints passed in sequence)
            lastCrossDirection = 'forward'
            console.log(`⚠️ ${currentCar.name} crossed finish line forward but lap invalid (missing checkpoints)`, {
              checkpointsPassed: updatedCheckpointsPassed,
              lastValidCheckpoint: updatedLastValidCheckpoint
            })
          }
        } else {
          lastCrossDirection = 'backward'
          console.log(`⚠️ ${currentCar.name} wrong direction crossing!`)
        }
      }
      
      // Apply checkpoint progress reset if car went backwards through checkpoints
      if (checkpointUpdate.resetLap) {
        console.log(`🔄 ${currentCar.name} checkpoint progress reset due to invalid sequence`)
      }
    }
    
    const trail = [...currentCar.trail, nextPos]
    
    // Update current car with new state including checkpoint progress
    const updatedCar: Car = {
      ...currentCar,
      pos: nextPos,
      vel,
      trail,
      crashed,
      finished,
      currentLap,
      lastCrossDirection,
      finishTime,
      checkpointsPassed: updatedCheckpointsPassed,
      lastValidCheckpoint: updatedLastValidCheckpoint
    }
    
    // Save game state for undo (full game state)
    let previousGameStates = multiCarState.previousGameStates || []
    if (isFeatureEnabled('improvedControls')) {
      const stateToSave = {
        ...multiCarState,
        hoveredPosition: undefined,
        previousGameStates: undefined
      }
      previousGameStates = [...previousGameStates, stateToSave].slice(-10) // Keep last 10 moves
    }
    
    // Update cars array
    const updatedCars = [...multiCarState.cars]
    updatedCars[multiCarState.currentPlayerIndex] = updatedCar
    
    // Check if all cars have finished or crashed
    const gameFinished = checkGameFinished(updatedCars)
    
    const newState: MultiCarGameState = {
      ...multiCarState,
      cars: updatedCars,
      gameFinished,
      previousGameStates
    }
    
    // Switch to next player after move (unless game is finished)
    if (!gameFinished && !crashed) {
      return switchToNextPlayer(newState)
    }
    
return newState
  }
}

// Get only legal step options for current mover (legacy or current car)
export function legalStepOptions(state: GameState): { acc: Vec; nextPos: Vec }[] {
  const opts = stepOptions(state)
  return opts.filter(({ nextPos }) => {
    if (isMultiCarGame(state)) {
      const currentCar = state.cars[state.currentPlayerIndex]
      if (!currentCar) return false
      return pathLegal(currentCar.pos, nextPos, state)
    } else {
      const legacyState = state as any
      return pathLegal(legacyState.pos, nextPos, state)
    }
  })
}

// Undo function for improved controls
export function undoMove(state: GameState): GameState {
  if (!isFeatureEnabled('multiCarSupport')) {
    const legacyState = state as LegacyGameState
    if (!isFeatureEnabled('improvedControls') || !legacyState.previousStates || legacyState.previousStates.length === 0) {
      return legacyState
    }
    
    const previousState = legacyState.previousStates[legacyState.previousStates.length - 1]!
    const newPreviousStates = legacyState.previousStates.slice(0, -1)
    
    return {
      ...previousState,
      previousStates: newPreviousStates,
      hoveredPosition: legacyState.hoveredPosition // Keep current hover state
    }
  } else {
    // Multi-car undo implementation
    const multiCarState = state as MultiCarGameState
    if (!isFeatureEnabled('improvedControls') || 
        !multiCarState.previousGameStates || 
        multiCarState.previousGameStates.length === 0) {
      return multiCarState
    }
    
    const previousState = multiCarState.previousGameStates[multiCarState.previousGameStates.length - 1]!
    const newPreviousGameStates = multiCarState.previousGameStates.slice(0, -1)
    
    return {
      ...previousState,
      previousGameStates: newPreviousGameStates,
      hoveredPosition: multiCarState.hoveredPosition // Keep current hover state
    }
  }
}

// Check if undo is available
export function canUndo(state: GameState): boolean {
  if (!isFeatureEnabled('multiCarSupport')) {
    const legacyState = state as LegacyGameState
    return isFeatureEnabled('improvedControls') && 
           legacyState.previousStates !== undefined && 
           legacyState.previousStates.length > 0
  } else {
    // Multi-car canUndo implementation
    const multiCarState = state as MultiCarGameState
    return isFeatureEnabled('improvedControls') && 
           multiCarState.previousGameStates !== undefined && 
           multiCarState.previousGameStates.length > 0
  }
}

export function draw(ctx: CanvasRenderingContext2D, state: GameState, canvas: HTMLCanvasElement) {
  if (!isFeatureEnabled('multiCarSupport')) {
    // Handle legacy single-car rendering
    const legacyState = state as LegacyGameState
    const g = legacyState.grid
    const W = canvas.width, H = canvas.height
    
    // Always track render performance (but only display when debugMode is enabled)
    performanceTracker.startRender()
    
    ctx.clearRect(0, 0, W, H)

    // Background
    ctx.fillStyle = '#0b0b0b'
    ctx.fillRect(0, 0, W, H)

    // Basic grid behind track (only if not using enhanced grid)
    if (legacyState.showGrid && !isFeatureEnabled('graphPaperGrid')) {
      ctx.strokeStyle = '#222'
      ctx.lineWidth = 1
      for (let x = 0; x <= W; x += g) { line(ctx, x, 0, x, H) }
      for (let y = 0; y <= H; y += g) { line(ctx, 0, y, W, y) }
    }

    // Track polygons
    drawPoly(ctx, legacyState.outer, g, '#555', '#111')
    drawPoly(ctx, legacyState.inner, g, '#555', '#0b0b0b', true)
    
    // Enhanced grid overlaid on track (if enabled)
    if (legacyState.showGrid && isFeatureEnabled('graphPaperGrid')) {
      drawEnhancedGrid(ctx, W, H, g)
    }

    // Start/Finish line - checkered flag pattern
    drawCheckeredStartLine(ctx, legacyState.start, g)

    // Directional arrows to show racing direction
    drawDirectionalArrows(ctx, legacyState, g)
    
    // Racing line overlay (if enabled)
    drawRacingLine(ctx, legacyState, g)

    // Trail
    ctx.strokeStyle = '#9cf'
    ctx.lineWidth = 2
    ctx.beginPath()
    const t0 = legacyState.trail[0]!
    ctx.moveTo(t0.x * g, t0.y * g)
    for (let i = 1; i < legacyState.trail.length; i++) {
      const p = legacyState.trail[i]!
      ctx.lineTo(p.x * g, p.y * g)
    }
    ctx.stroke()

    // Candidates with improved controls visual feedback
    if (legacyState.showCandidates && !legacyState.crashed && !legacyState.finished) {
      const opts = stepOptions(legacyState)
      for (const { nextPos } of opts) {
        const legal = pathLegal(legacyState.pos, nextPos, legacyState)
        const isHovered = isFeatureEnabled('improvedControls') && 
                         legacyState.hoveredPosition && 
                         nextPos.x === legacyState.hoveredPosition.x && 
                         nextPos.y === legacyState.hoveredPosition.y
        
        if (isHovered) {
          // Draw hover effects
          ctx.save()
          ctx.globalAlpha = 0.3
          drawNode(ctx, nextPos, g, legal ? '#0f0' : '#f33', 8) // Larger hover ring
          ctx.restore()
          
          // Draw preview trail line
          if (legal && isFeatureEnabled('improvedControls')) {
            ctx.save()
            ctx.strokeStyle = '#ff0'
            ctx.lineWidth = 2
            ctx.globalAlpha = 0.6
            ctx.setLineDash([5, 5])
            line(ctx, legacyState.pos.x * g, legacyState.pos.y * g, nextPos.x * g, nextPos.y * g)
            ctx.restore()
          }
        }
        
        // Draw normal candidate
        const radius = isHovered ? 6 : 4
        const color = legal ? (isHovered ? '#5f5' : '#0f0') : (isHovered ? '#f55' : '#f33')
        drawNode(ctx, nextPos, g, color, radius)
      }
    }

    // Car
    drawNode(ctx, legacyState.pos, g, legacyState.crashed ? '#f66' : '#ff0', 6)
    
    // Particles (if animations are enabled)
    if (isFeatureEnabled('animations')) {
      animationManager.renderParticles(ctx, g)
    }

    // End render tracking for performance metrics
    performanceTracker.endRender()
    
    // Update DOM-based HUD instead of drawing on canvas
    const speed = Math.sqrt(legacyState.vel.x * legacyState.vel.x + legacyState.vel.y * legacyState.vel.y)
    const hudData: HUDData = {
      playerInfo: {
        position: legacyState.pos,
        velocity: legacyState.vel,
        lap: legacyState.currentLap,
        targetLaps: legacyState.targetLaps,
        speed: speed
      },
      gameStatus: {
        crashed: legacyState.crashed,
        finished: legacyState.finished,
        gameFinished: false
      },
      performanceMetrics: isFeatureEnabled('debugMode') ? performanceTracker.getSummary() : undefined
    }
    
    hudManager.update(hudData)
  } else {
    // Handle multi-car rendering
    const multiCarState = state as MultiCarGameState
    const g = multiCarState.grid
    const W = canvas.width, H = canvas.height
    
    // Always track render performance (but only display when debugMode is enabled)
    performanceTracker.startRender()
    
    ctx.clearRect(0, 0, W, H)

    // Background
    ctx.fillStyle = '#0b0b0b'
    ctx.fillRect(0, 0, W, H)

    // Basic grid behind track (only if not using enhanced grid)
    if (multiCarState.showGrid && !isFeatureEnabled('graphPaperGrid')) {
      ctx.strokeStyle = '#222'
      ctx.lineWidth = 1
      for (let x = 0; x <= W; x += g) { line(ctx, x, 0, x, H) }
      for (let y = 0; y <= H; y += g) { line(ctx, 0, y, W, y) }
    }

    // Track polygons
    drawPoly(ctx, multiCarState.outer, g, '#555', '#111')
    drawPoly(ctx, multiCarState.inner, g, '#555', '#0b0b0b', true)
    
    // Enhanced grid overlaid on track (if enabled)
    if (multiCarState.showGrid && isFeatureEnabled('graphPaperGrid')) {
      drawEnhancedGrid(ctx, W, H, g)
    }

    // Start/Finish line - checkered flag pattern
    drawCheckeredStartLine(ctx, multiCarState.start, g)

    // Directional arrows to show racing direction
    drawDirectionalArrows(ctx, multiCarState, g)
    
    // Racing line overlay (if enabled)
    drawRacingLine(ctx, multiCarState, g)
    
    // Draw checkpoint lines when in debug mode
    if (isFeatureEnabled('debugMode')) {
      drawCheckpointLines(ctx, multiCarState, g)
      
      // AI Debug Visualization
      drawAIDebugVisualization(ctx, multiCarState, g)
    }

    // Draw all car trails
    for (let i = 0; i < multiCarState.cars.length; i++) {
      const car = multiCarState.cars[i]!
      const isCurrentPlayer = i === multiCarState.currentPlayerIndex
      
      // Trail style varies based on current player
      ctx.strokeStyle = isCurrentPlayer ? car.color : fadeColor(car.color, 0.5)
      ctx.lineWidth = isCurrentPlayer ? 3 : 2
      ctx.globalAlpha = isCurrentPlayer ? 1.0 : 0.6
      
      if (car.trail.length > 0) {
        ctx.beginPath()
        const t0 = car.trail[0]!
        ctx.moveTo(t0.x * g, t0.y * g)
        for (let j = 1; j < car.trail.length; j++) {
          const p = car.trail[j]!
          ctx.lineTo(p.x * g, p.y * g)
        }
        ctx.stroke()
      }
    }
    
    // Reset alpha for subsequent drawing
    ctx.globalAlpha = 1.0

    // Current player's move candidates
    const currentCar = multiCarState.cars[multiCarState.currentPlayerIndex]
    if (currentCar && multiCarState.showCandidates && !currentCar.crashed && !currentCar.finished && !multiCarState.gameFinished) {
      const opts = stepOptions(multiCarState)
      for (const { nextPos } of opts) {
        const legal = pathLegal(currentCar.pos, nextPos, multiCarState)
        const isHovered = isFeatureEnabled('improvedControls') && 
                         multiCarState.hoveredPosition && 
                         nextPos.x === multiCarState.hoveredPosition.x && 
                         nextPos.y === multiCarState.hoveredPosition.y
        
        if (isHovered) {
          // Draw hover effects
          ctx.save()
          ctx.globalAlpha = 0.3
          drawNode(ctx, nextPos, g, legal ? '#0f0' : '#f33', 8) // Larger hover ring
          ctx.restore()
          
          // Draw preview trail line
          if (legal && isFeatureEnabled('improvedControls')) {
            ctx.save()
            ctx.strokeStyle = currentCar.color
            ctx.lineWidth = 2
            ctx.globalAlpha = 0.6
            ctx.setLineDash([5, 5])
            line(ctx, currentCar.pos.x * g, currentCar.pos.y * g, nextPos.x * g, nextPos.y * g)
            ctx.restore()
          }
        }
        
        // Draw normal candidate
        const radius = isHovered ? 6 : 4
        const color = legal ? (isHovered ? '#5f5' : '#0f0') : (isHovered ? '#f55' : '#f33')
        drawNode(ctx, nextPos, g, color, radius)
      }
    }

    // Draw all cars
    for (let i = 0; i < multiCarState.cars.length; i++) {
      const car = multiCarState.cars[i]!
      const isCurrentPlayer = i === multiCarState.currentPlayerIndex
      
      // Car appearance based on status
      let carColor = car.color
      let carSize = 6
      
      if (car.crashed) {
        carColor = fadeColor(car.color, 0.3) // Very faded for crashed cars
      } else if (car.finished) {
        // Winner effects for finished cars
        carColor = lightenColor(car.color, 0.3)
        carSize = 8
      } else if (isCurrentPlayer) {
        // Current player gets a subtle glow/highlight
        ctx.save()
        ctx.shadowColor = car.color
        ctx.shadowBlur = 10
        drawNode(ctx, car.pos, g, carColor, carSize)
        ctx.restore()
        continue // Skip the normal draw below
      }
      
      drawNode(ctx, car.pos, g, carColor, carSize)
    }
    
    // Particles (if animations are enabled)
    if (isFeatureEnabled('animations')) {
      animationManager.renderParticles(ctx, g)
    }

    // End render tracking for performance metrics
    performanceTracker.endRender()
    
    // Update DOM-based HUD for multi-car mode
    const currentPlayer = getCurrentPlayer(multiCarState)
    const leaderboard = getLeaderboard(multiCarState)
    
    let hudData: HUDData
    
    if (currentPlayer && currentCar) {
      const speed = Math.sqrt(currentCar.vel.x * currentCar.vel.x + currentCar.vel.y * currentCar.vel.y)
      
      // Build leaderboard data
      const hudLeaderboard = leaderboard.map(({ car, player, position }) => ({
        position,
        playerName: player.name,
        playerColor: player.color,
        status: car.finished ? 
          `🏆 ${(car.finishTime! / 1000).toFixed(1)}s` :
          car.crashed ? '💥 Crashed' : `Lap ${car.currentLap}/${multiCarState.targetLaps}`,
        isCurrentPlayer: player.id === currentPlayer.id
      }))
      
      // Determine winner info for game completion
      const winner = leaderboard[0]
      let winnerName: string | undefined
      let winnerTime: number | undefined
      
      if (multiCarState.gameFinished && winner && winner.car.finished) {
        winnerName = winner.player.name
        winnerTime = winner.car.finishTime
      }
      
      hudData = {
        playerInfo: {
          playerName: currentPlayer.name,
          playerColor: currentPlayer.color,
          position: currentCar.pos,
          velocity: currentCar.vel,
          lap: currentCar.currentLap,
          targetLaps: multiCarState.targetLaps,
          speed: speed
        },
        gameStatus: {
          crashed: currentCar.crashed,
          finished: currentCar.finished,
          finishTime: currentCar.finishTime,
          gameFinished: multiCarState.gameFinished,
          winnerName,
          winnerTime
        },
        leaderboard: hudLeaderboard,
        performanceMetrics: isFeatureEnabled('debugMode') ? performanceTracker.getSummary() : undefined
      }
    } else {
      // Fallback HUD data when no current player/car
      hudData = {
        playerInfo: {
          position: { x: 0, y: 0 },
          velocity: { x: 0, y: 0 },
          lap: 0,
          targetLaps: multiCarState.targetLaps
        },
        gameStatus: {
          crashed: false,
          finished: false,
          gameFinished: multiCarState.gameFinished
        },
        performanceMetrics: isFeatureEnabled('debugMode') ? performanceTracker.getSummary() : undefined
      }
    }
    
    hudManager.update(hudData)
  }
}

function drawDirectionalArrows(ctx: CanvasRenderingContext2D, state: GameState, g: number) {
  ctx.save()
  ctx.fillStyle = '#888'
  ctx.strokeStyle = '#bbb'
  ctx.lineWidth = 2
  
  // Arrow positions around the track showing COUNTER-CLOCKWISE direction (matching AI racing line)
  // Counter-clockwise path: start → down → right → up → left → back to start
  const arrows = [
    // Left side near start/finish (going down from start)
    { pos: { x: 7, y: 15 }, angle: Math.PI / 2 }, // ↓
    
    // Bottom side (going left to right)
    { pos: { x: 25, y: 30 }, angle: 0 }, // →
    
    // Right side (going bottom to top)
    { pos: { x: 45, y: 17.5 }, angle: -Math.PI / 2 }, // ↑
    
    // Top side (going right to left)
    { pos: { x: 25, y: 5 }, angle: Math.PI }, // ←
  ]
  
  for (const arrow of arrows) {
    drawArrow(ctx, arrow.pos.x * g, arrow.pos.y * g, arrow.angle, 10, g)
  }
  
  ctx.restore()
}

function drawRacingLine(ctx: CanvasRenderingContext2D, state: GameState, g: number) {
  if (!isRacingLineVisible()) return
  
  try {
    // Get track analysis with custom racing line if available
    const outer = isMultiCarGame(state) ? state.outer : (state as LegacyGameState).outer
    const inner = isMultiCarGame(state) ? state.inner : (state as LegacyGameState).inner
    const start = isMultiCarGame(state) ? state.start : (state as LegacyGameState).start
    
    const trackAnalysis = createTrackAnalysisWithCustomLine(outer, inner, start)
    const racingLine = trackAnalysis.optimalRacingLine
    
    if (racingLine.length < 2) return
    
    ctx.save()
    
    // Draw racing line path
    ctx.strokeStyle = '#00ff00' // Green racing line
    ctx.lineWidth = 3
    ctx.globalAlpha = 0.7
    ctx.setLineDash([8, 4]) // Dashed line to distinguish from trails
    
    ctx.beginPath()
    const firstPoint = racingLine[0]!
    ctx.moveTo(firstPoint.pos.x * g, firstPoint.pos.y * g)
    
    for (let i = 1; i < racingLine.length; i++) {
      const point = racingLine[i]!
      ctx.lineTo(point.pos.x * g, point.pos.y * g)
    }
    
    // Connect back to start for closed loop
    ctx.lineTo(firstPoint.pos.x * g, firstPoint.pos.y * g)
    ctx.stroke()
    
    // Draw waypoints with different colors based on type
    ctx.setLineDash([]) // Solid for waypoints
    ctx.globalAlpha = 0.9
    
    for (const point of racingLine) {
      let color: string
      let radius = 3
      
      switch (point.cornerType) {
        case 'entry':
          color = '#ff9800' // Orange for corner entry
          radius = 4
          break
        case 'apex':
          color = '#f44336' // Red for apex
          radius = 5
          break
        case 'exit':
          color = '#4caf50' // Green for corner exit
          radius = 4
          break
        default: // straight
          color = '#2196f3' // Blue for straights
          radius = 3
      }
      
      // Draw waypoint
      ctx.beginPath()
      ctx.arc(point.pos.x * g, point.pos.y * g, radius, 0, 2 * Math.PI)
      ctx.fillStyle = color
      ctx.fill()
      
      // Add brake zone indicator
      if (point.brakeZone) {
        ctx.strokeStyle = '#ff5722' // Deep orange for brake zones
        ctx.lineWidth = 2
        ctx.stroke()
      }
    }
    
    ctx.restore()
  } catch (error) {
    console.error('🏁 Error drawing racing line:', error)
  }
}

function drawArrow(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, size: number, g: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  
  // Draw arrow shaft
  ctx.beginPath()
  ctx.moveTo(-size, 0)
  ctx.lineTo(size * 0.5, 0)
  ctx.stroke()
  
  // Draw arrow head
  ctx.beginPath()
  ctx.moveTo(size * 0.5, 0)
  ctx.lineTo(size * 0.2, -size * 0.4)
  ctx.lineTo(size * 0.2, size * 0.4)
  ctx.closePath()
  ctx.fill()
  
  ctx.restore()
}

function drawCheckeredStartLine(ctx: CanvasRenderingContext2D, startLine: Segment, g: number) {
  const x1 = startLine.a.x * g
  const y1 = startLine.a.y * g
  const x2 = startLine.b.x * g
  const y2 = startLine.b.y * g
  
  // Calculate line dimensions
  const dx = x2 - x1
  const dy = y2 - y1
  const length = Math.sqrt(dx * dx + dy * dy)
  
  // Checkered pattern dimensions
  const checkerSize = 8 // pixels per checker square
  const lineWidth = 16 // width of the checkered strip (increased for better visibility)
  
  // Calculate perpendicular offset for line width
  const perpX = (-dy / length) * (lineWidth / 2)
  const perpY = (dx / length) * (lineWidth / 2)
  
  ctx.save()
  
  // Draw checkered pattern - proper 2D grid
  const numCheckersAlong = Math.ceil(length / checkerSize)
  const numCheckersAcross = Math.ceil(lineWidth / checkerSize)
  
  for (let i = 0; i < numCheckersAlong; i++) {
    for (let j = 0; j < numCheckersAcross; j++) {
      // Calculate position along the line
      const t1 = i / numCheckersAlong
      const t2 = (i + 1) / numCheckersAlong
      
      // Calculate position across the line width
      const s1 = (j - numCheckersAcross / 2) / numCheckersAcross
      const s2 = (j + 1 - numCheckersAcross / 2) / numCheckersAcross
      
      // Calculate the four corners of this checker square
      const centerX1 = x1 + dx * t1
      const centerY1 = y1 + dy * t1
      const centerX2 = x1 + dx * t2
      const centerY2 = y1 + dy * t2
      
      const corner1X = centerX1 + perpX * s1 * 2
      const corner1Y = centerY1 + perpY * s1 * 2
      const corner2X = centerX2 + perpX * s1 * 2
      const corner2Y = centerY2 + perpY * s1 * 2
      const corner3X = centerX2 + perpX * s2 * 2
      const corner3Y = centerY2 + perpY * s2 * 2
      const corner4X = centerX1 + perpX * s2 * 2
      const corner4Y = centerY1 + perpY * s2 * 2
      
      // Checkered pattern: alternate based on both i and j
      const isBlack = (i + j) % 2 === 0
      ctx.fillStyle = isBlack ? '#000' : '#fff'
      
      // Draw the checker square
      ctx.beginPath()
      ctx.moveTo(corner1X, corner1Y)
      ctx.lineTo(corner2X, corner2Y)
      ctx.lineTo(corner3X, corner3Y)
      ctx.lineTo(corner4X, corner4Y)
      ctx.closePath()
      ctx.fill()
    }
  }
  
  // Add a subtle border around the entire checkered area
  ctx.strokeStyle = '#333'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x1 + perpX, y1 + perpY)
  ctx.lineTo(x2 + perpX, y2 + perpY)
  ctx.lineTo(x2 - perpX, y2 - perpY)
  ctx.lineTo(x1 - perpX, y1 - perpY)
  ctx.closePath()
  ctx.stroke()
  
  ctx.restore()
}

function drawPoly(ctx: CanvasRenderingContext2D, poly: Vec[], g: number, stroke: string, fill: string, hole = false) {
  ctx.save()
  ctx.strokeStyle = stroke
  ctx.lineWidth = 3
  ctx.fillStyle = fill
  ctx.beginPath()
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]
    if (!p) continue
    const x = p.x * g, y = p.y * g
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  }
  ctx.closePath()
  if (!hole) ctx.fill()
  ctx.stroke()
  ctx.restore()
}

function drawNode(ctx: CanvasRenderingContext2D, p: Vec, g: number, color: string, r = 4) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(p.x * g, p.y * g, r, 0, Math.PI * 2)
  ctx.fill()
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
}

// Enhanced grid drawing function with coordinate indicators
function drawEnhancedGrid(ctx: CanvasRenderingContext2D, W: number, H: number, g: number) {
  ctx.save()
  
  // Calculate grid boundaries based on game coordinate system
  const maxX = Math.floor(W / g)
  const maxY = Math.floor(H / g)
  
  // Draw grid lines with improved visibility
  ctx.strokeStyle = '#333' // Slightly brighter than original #222
  ctx.lineWidth = 0.8
  ctx.globalAlpha = 0.6 // Semi-transparent so it doesn't overwhelm track elements
  
  // Major grid lines every 5 units (like graph paper)
  ctx.strokeStyle = '#444'
  ctx.lineWidth = 1
  for (let x = 0; x <= maxX; x += 5) {
    const xPixel = x * g
    if (xPixel <= W) {
      line(ctx, xPixel, 0, xPixel, H)
    }
  }
  for (let y = 0; y <= maxY; y += 5) {
    const yPixel = y * g
    if (yPixel <= H) {
      line(ctx, 0, yPixel, W, yPixel)
    }
  }
  
  // Minor grid lines
  ctx.strokeStyle = '#2a2a2a'
  ctx.lineWidth = 0.5
  for (let x = 1; x < maxX; x++) {
    if (x % 5 !== 0) { // Skip major grid lines
      const xPixel = x * g
      if (xPixel <= W) {
        line(ctx, xPixel, 0, xPixel, H)
      }
    }
  }
  for (let y = 1; y < maxY; y++) {
    if (y % 5 !== 0) { // Skip major grid lines
      const yPixel = y * g
      if (yPixel <= H) {
        line(ctx, 0, yPixel, W, yPixel)
      }
    }
  }
  
  // Reset alpha for coordinate labels
  ctx.globalAlpha = 0.8
  
  // Coordinate labels around the edges
  ctx.fillStyle = '#666'
  ctx.font = '11px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  
  // X-axis labels (bottom edge)
  for (let x = 0; x <= maxX; x += 2) { // Every 2 units to avoid crowding
    const xPixel = x * g
    if (xPixel <= W) {
      ctx.fillText(x.toString(), xPixel, H - 8)
    }
  }
  
  // Y-axis labels (left edge) - note: Y increases downward in canvas, but we want graph paper style
  ctx.textAlign = 'right'
  for (let y = 0; y <= maxY; y += 2) { // Every 2 units to avoid crowding
    const yPixel = y * g
    if (yPixel <= H) {
      // Display coordinate as it appears in the game (Y increases downward)
      ctx.fillText(y.toString(), 12, yPixel)
    }
  }
  
  // Origin marker (0,0)
  ctx.fillStyle = '#888'
  ctx.fillRect(-2, -2, 4, 4)
  
  // Add small coordinate indicators at regular intervals along edges
  ctx.fillStyle = '#555'
  
  // Top edge tick marks
  for (let x = 5; x <= maxX; x += 5) {
    const xPixel = x * g
    if (xPixel <= W) {
      ctx.fillRect(xPixel - 0.5, 0, 1, 6)
      if (x % 10 === 0) { // Larger ticks every 10 units
        ctx.fillRect(xPixel - 1, 0, 2, 10)
        // Add label on top edge for major coordinates
        ctx.fillStyle = '#777'
        ctx.textAlign = 'center'
        ctx.fillText(x.toString(), xPixel, 15)
        ctx.fillStyle = '#555'
      }
    }
  }
  
  // Right edge tick marks
  for (let y = 5; y <= maxY; y += 5) {
    const yPixel = y * g
    if (yPixel <= H) {
      ctx.fillRect(W - 6, yPixel - 0.5, 6, 1)
      if (y % 10 === 0) { // Larger ticks every 10 units
        ctx.fillRect(W - 10, yPixel - 1, 10, 2)
        // Add label on right edge for major coordinates
        ctx.fillStyle = '#777'
        ctx.textAlign = 'left'
        ctx.fillText(y.toString(), W - 15, yPixel)
        ctx.fillStyle = '#555'
      }
    }
  }
  
  ctx.restore()
}

// Debug function to draw checkpoint lines when debug mode is enabled
function drawCheckpointLines(ctx: CanvasRenderingContext2D, state: MultiCarGameState, g: number) {
  ctx.save()
  
  // Create track analysis to get consistent checkpoint data
  const trackAnalysis = createTrackAnalysisWithCustomLine(state.outer, state.inner, state.start)
  const checkpoints = trackAnalysis.lapValidationCheckpoints
  
  // Draw each checkpoint line with different colors for identification
  const checkpointColors = ['#ff0', '#0ff', '#f0f', '#0f0'] // Yellow, Cyan, Magenta, Green
  
  for (let i = 0; i < checkpoints.length; i++) {
    const checkpoint = checkpoints[i]
    if (!checkpoint) continue
    const color = checkpointColors[i] || '#fff'
    
    ctx.strokeStyle = color
    ctx.lineWidth = 3
    ctx.globalAlpha = 0.7
    
    // Draw checkpoint line
    ctx.beginPath()
    ctx.moveTo(checkpoint.a.x * g, checkpoint.a.y * g)
    ctx.lineTo(checkpoint.b.x * g, checkpoint.b.y * g)
    ctx.stroke()
    
    // Draw checkpoint number label
    ctx.fillStyle = color
    ctx.font = '16px Arial'
    ctx.globalAlpha = 1.0
    const midX = (checkpoint.a.x + checkpoint.b.x) / 2 * g
    const midY = (checkpoint.a.y + checkpoint.b.y) / 2 * g
    ctx.fillText(`CP${i}`, midX - 10, midY - 5)
  }
  
  ctx.restore()
}

// AI Debug Visualization - show racing line, target points, and AI decision making
function drawAIDebugVisualization(ctx: CanvasRenderingContext2D, state: MultiCarGameState, g: number) {
  if (!isFeatureEnabled('aiPlayers')) return
  
  ctx.save()
  
  try {
    // Create track analysis for consistent racing line data
    const trackAnalysis = createTrackAnalysisWithCustomLine(state.outer, state.inner, state.start)
    
    // Draw racing line visualization using track analysis
    drawRacingLineVisualization(ctx, trackAnalysis.optimalRacingLine, g)
    
    // Draw AI target waypoint indicators for each AI player
    const racingLine = trackAnalysis.optimalRacingLine
    
    for (let i = 0; i < state.cars.length; i++) {
      const car = state.cars[i]
      const player = state.players[i]
      if (!car || !player) continue
      
      if (player?.isAI && !car.crashed && !car.finished) {
        drawAITargetVisualization(ctx, car, player, racingLine, g, state)
        drawSimplifiedAIVisualization(ctx, car, player, g)
      }
    }
    
  } catch (error) {
    console.warn('AI debug visualization error:', error)
  }
  
  ctx.restore()
}

// Draw racing line waypoints and speed indicators
function drawRacingLineVisualization(ctx: CanvasRenderingContext2D, racingLine: any[], g: number) {
  ctx.save()
  
  // Draw racing line as connected waypoints
  ctx.strokeStyle = '#888'
  ctx.lineWidth = 2
  ctx.globalAlpha = 0.6
  ctx.setLineDash([5, 5])
  
  ctx.beginPath()
  for (let i = 0; i < racingLine.length; i++) {
    const point = racingLine[i]
    const x = point.pos.x * g
    const y = point.pos.y * g
    
    if (i === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  }
  // Close the loop
  if (racingLine.length > 0) {
    const firstPoint = racingLine[0]
    if (firstPoint) {
      ctx.lineTo(firstPoint.pos.x * g, firstPoint.pos.y * g)
    }
  }
  ctx.stroke()
  
  // Draw waypoints with different colors based on corner type
  ctx.globalAlpha = 0.8
  ctx.setLineDash([]) // Reset dash pattern
  
  for (let i = 0; i < racingLine.length; i++) {
    const point = racingLine[i]
    if (!point) continue
    const x = point.pos.x * g
    const y = point.pos.y * g
    
    // Color based on corner type
    let color = '#888' // default
    switch (point.cornerType) {
      case 'straight': color = '#4a4'; break  // Green for straights
      case 'entry': color = '#fa4'; break     // Orange for corner entry
      case 'apex': color = '#f44'; break      // Red for apex
      case 'exit': color = '#44f'; break      // Blue for corner exit
    }
    
    // Draw waypoint circle
    ctx.fillStyle = color
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(x, y, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    
    // Draw speed indicator as a small text label
    ctx.fillStyle = '#fff'
    ctx.font = '10px Arial'
    ctx.fillText(point.targetSpeed.toString(), x + 6, y - 6)
    
    // Draw brake zone indicator
    if (point.brakeZone) {
      ctx.strokeStyle = '#f80'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(x, y, 8, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
  
  ctx.restore()
}

// Draw racing line using the single source of truth from track-analysis.ts
function drawStaticRacingLineVisualization(ctx: CanvasRenderingContext2D, state: GameState, g: number) {
  // Use the centralized track analysis - single source of truth
  const trackAnalysis = createTrackAnalysisWithCustomLine(state.outer, state.inner, state.start)
  const racingLine = trackAnalysis.optimalRacingLine
  
  ctx.save()
  
  // Draw racing line as connected waypoints
  ctx.strokeStyle = '#666'
  ctx.lineWidth = 2
  ctx.globalAlpha = 0.4
  ctx.setLineDash([5, 5])
  
  ctx.beginPath()
  for (let i = 0; i < racingLine.length; i++) {
    const point = racingLine[i]
    if (!point) continue
    const x = point.pos.x * g
    const y = point.pos.y * g
    
    if (i === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  }
  // Close the loop
  if (racingLine.length > 0) {
    const firstPoint = racingLine[0]
    if (firstPoint) {
      ctx.lineTo(firstPoint.pos.x * g, firstPoint.pos.y * g)
    }
  }
  ctx.stroke()
  
  // Draw waypoints with different colors based on corner type
  ctx.globalAlpha = 0.6
  ctx.setLineDash([]) // Reset dash pattern
  
  for (const point of racingLine) {
    const x = point.pos.x * g
    const y = point.pos.y * g
    
    // Color based on corner type from track analysis
    let color = '#888' // default
    switch (point.cornerType) {
      case 'straight': color = '#4a4'; break  // Green for straights
      case 'entry': color = '#fa4'; break     // Orange for corner entry
      case 'apex': color = '#f44'; break      // Red for apex
      case 'exit': color = '#af4'; break      // Light green for corner exit
    }
    
    // Draw waypoint circle
    ctx.fillStyle = color
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(x, y, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }
  
  ctx.restore()
}

// Draw AI target waypoint visualization  
function drawAITargetVisualization(ctx: CanvasRenderingContext2D, car: any, player: any, racingLine: any[], g: number, state?: MultiCarGameState) {
  ctx.save()
  
  try {
    // Use proper track analysis to find the AI's actual target waypoint
    let currentTarget
    if (state) {
      // Create track analysis to use the same targeting logic as the AI
      const trackAnalysis = createTrackAnalysisWithCustomLine(state.outer, state.inner, state.start)
      currentTarget = findNearestRacingLinePoint(car.pos, trackAnalysis)
    } else {
      // Fallback to first waypoint if no state available
      currentTarget = racingLine[0] || { pos: car.pos, cornerType: 'straight' }
    }
    
    const carX = car.pos.x * g
    const carY = car.pos.y * g
    const targetX = currentTarget.pos.x * g
    const targetY = currentTarget.pos.y * g
    
    // Calculate distance to target
    const distance = Math.sqrt(
      Math.pow(currentTarget.pos.x - car.pos.x, 2) + 
      Math.pow(currentTarget.pos.y - car.pos.y, 2)
    )
    
    // Draw line from AI car to its target waypoint
    ctx.strokeStyle = player.color
    ctx.lineWidth = 3
    ctx.globalAlpha = 0.8
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(carX, carY)
    ctx.lineTo(targetX, targetY)
    ctx.stroke()
    
    // Draw target waypoint with enhanced styling
    ctx.fillStyle = player.color
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.globalAlpha = 0.9
    ctx.setLineDash([])
    ctx.beginPath()
    ctx.arc(targetX, targetY, 8, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    
    // Add inner dot to highlight the target
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(targetX, targetY, 3, 0, Math.PI * 2)
    ctx.fill()
    
    // Draw target info label
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 11px Arial'
    ctx.globalAlpha = 1.0
    const labelOffset = 12
    
    // Position label to avoid overlap with other elements
    let labelX = targetX + labelOffset
    let labelY = targetY - labelOffset
    
    // Add background for better readability
    const labelText = `${player.name.replace('Player ', 'P')}: ${currentTarget.cornerType}`
    const labelWidth = ctx.measureText(labelText).width + 4
    const labelHeight = 14
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(labelX - 2, labelY - labelHeight + 2, labelWidth, labelHeight)
    
    ctx.fillStyle = player.color
    ctx.fillText(labelText, labelX, labelY)
    
    // Draw distance info
    ctx.font = '9px Arial'
    ctx.fillStyle = '#ccc'
    ctx.fillText(`${distance.toFixed(1)}u`, labelX, labelY + 12)
    
    // Draw target speed info if available
    if (currentTarget.targetSpeed !== undefined) {
      ctx.fillStyle = '#aaa'
      ctx.fillText(`v:${currentTarget.targetSpeed}`, labelX, labelY + 22)
    }
    
  } catch (error) {
    console.warn(`AI target visualization error for ${player.name}:`, error)
  }
  
  ctx.restore()
}

// Draw simplified AI indicators without complex AI logic
function drawSimplifiedAIVisualization(ctx: CanvasRenderingContext2D, car: any, player: any, g: number) {
  ctx.save()
  
  const carX = car.pos.x * g
  const carY = car.pos.y * g
  
  // Draw AI indicator - a simple ring around AI cars
  ctx.strokeStyle = player.color
  ctx.lineWidth = 2
  ctx.globalAlpha = 0.5
  ctx.setLineDash([2, 2])
  ctx.beginPath()
  ctx.arc(carX, carY, 12, 0, Math.PI * 2)
  ctx.stroke()
  
  // Draw AI label
  ctx.fillStyle = player.color
  ctx.font = '10px Arial'
  ctx.globalAlpha = 0.8
  ctx.setLineDash([])
  ctx.fillText('AI', carX + 8, carY - 8)
  
  // Draw velocity vector if car is moving
  const velMagnitude = Math.sqrt(car.vel.x * car.vel.x + car.vel.y * car.vel.y)
  if (velMagnitude > 0.1) {
    const velEndX = carX + car.vel.x * g * 1.5 // Scale for visibility
    const velEndY = carY + car.vel.y * g * 1.5
    
    ctx.strokeStyle = player.color
    ctx.lineWidth = 2
    ctx.globalAlpha = 0.6
    ctx.beginPath()
    ctx.moveTo(carX, carY)
    ctx.lineTo(velEndX, velEndY)
    ctx.stroke()
    
    // Simple arrow head
    const angle = Math.atan2(car.vel.y, car.vel.x)
    const arrowSize = 6
    ctx.fillStyle = player.color
    ctx.beginPath()
    ctx.moveTo(velEndX, velEndY)
    ctx.lineTo(
      velEndX - arrowSize * Math.cos(angle - Math.PI / 6),
      velEndY - arrowSize * Math.sin(angle - Math.PI / 6)
    )
    ctx.lineTo(
      velEndX - arrowSize * Math.cos(angle + Math.PI / 6),
      velEndY - arrowSize * Math.sin(angle + Math.PI / 6)
    )
    ctx.closePath()
    ctx.fill()
  }
  
  ctx.restore()
}

// Draw AI-specific visualization for each AI player
function drawAIPlayerVisualization(ctx: CanvasRenderingContext2D, car: any, player: any, racingLine: any[], findNearestRacingLinePointFn: any, g: number) {
  ctx.save()
  
  // Find AI's current target
  try {
    const currentTarget = findNearestRacingLinePointFn(car.pos, racingLine)
    
    // Draw target point with player's color
    const targetX = currentTarget.pos.x * g
    const targetY = currentTarget.pos.y * g
    const carX = car.pos.x * g
    const carY = car.pos.y * g
    
    // Draw line from car to target
    ctx.strokeStyle = player.color
    ctx.lineWidth = 2
    ctx.globalAlpha = 0.8
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.moveTo(carX, carY)
    ctx.lineTo(targetX, targetY)
    ctx.stroke()
    
    // Draw target point
    ctx.fillStyle = player.color
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.globalAlpha = 0.9
    ctx.setLineDash([])
    ctx.beginPath()
    ctx.arc(targetX, targetY, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    
    // Draw target info label
    ctx.fillStyle = '#fff'
    ctx.font = '12px Arial'
    ctx.fillText(`${player.name}: ${currentTarget.cornerType}`, targetX + 10, targetY - 10)
    
    // Draw distance to target
    const distance = Math.sqrt(
      Math.pow(currentTarget.pos.x - car.pos.x, 2) + 
      Math.pow(currentTarget.pos.y - car.pos.y, 2)
    )
    ctx.font = '10px Arial'
    ctx.fillText(`dist: ${distance.toFixed(1)}`, targetX + 10, targetY + 5)
    
    // Draw velocity vector
    const velMagnitude = Math.sqrt(car.vel.x * car.vel.x + car.vel.y * car.vel.y)
    if (velMagnitude > 0.1) {
      const velEndX = carX + car.vel.x * g * 2 // Scale for visibility
      const velEndY = carY + car.vel.y * g * 2
      
      ctx.strokeStyle = lightenColor(player.color, 0.3)
      ctx.lineWidth = 3
      ctx.globalAlpha = 0.7
      ctx.setLineDash([])
      ctx.beginPath()
      ctx.moveTo(carX, carY)
      ctx.lineTo(velEndX, velEndY)
      ctx.stroke()
      
      // Velocity arrow head
      const angle = Math.atan2(car.vel.y, car.vel.x)
      const arrowSize = 8
      ctx.fillStyle = lightenColor(player.color, 0.3)
      ctx.beginPath()
      ctx.moveTo(velEndX, velEndY)
      ctx.lineTo(
        velEndX - arrowSize * Math.cos(angle - Math.PI / 6),
        velEndY - arrowSize * Math.sin(angle - Math.PI / 6)
      )
      ctx.lineTo(
        velEndX - arrowSize * Math.cos(angle + Math.PI / 6),
        velEndY - arrowSize * Math.sin(angle + Math.PI / 6)
      )
      ctx.closePath()
      ctx.fill()
      
      // Speed label
      ctx.fillStyle = '#fff'
      ctx.font = '10px Arial'
      ctx.fillText(`v: ${velMagnitude.toFixed(1)}`, carX - 20, carY - 20)
    }
    
  } catch (error) {
    console.warn(`AI visualization error for ${player.name}:`, error)
  }
  
  ctx.restore()
}

// Helper functions for multi-car gameplay
export function switchToNextPlayer(state: MultiCarGameState): MultiCarGameState {
  // Find next player that can still play (not crashed and not finished)
  let nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length
  let iterations = 0
  
  // Avoid infinite loop - check all players once
  while (iterations < state.players.length) {
    const nextCar = state.cars[nextPlayerIndex]
    if (nextCar && !nextCar.crashed && !nextCar.finished) {
      return {
        ...state,
        currentPlayerIndex: nextPlayerIndex
      }
    }
    nextPlayerIndex = (nextPlayerIndex + 1) % state.players.length
    iterations++
  }
  
  // If no player can play, end the game
  return {
    ...state,
    gameFinished: true
  }
}

export function checkGameFinished(cars: Car[]): boolean {
  // Game is finished if all cars are either finished or crashed
  return cars.every(car => car.finished || car.crashed)
}

export function getCurrentPlayer(state: GameState): Player | null {
  if (isMultiCarGame(state)) {
    return state.players[state.currentPlayerIndex] || null
  }
  return null
}

export function getCurrentCar(state: GameState): Car | null {
  if (isMultiCarGame(state)) {
    return state.cars[state.currentPlayerIndex] || null
  }
  return null
}

export function getLeaderboard(state: GameState): Array<{car: Car, player: Player, position: number}> {
  if (!isMultiCarGame(state)) return []
  
  // Sort cars by: finished (first), then by finish time (fastest first), then by laps (most first), then by trail length (progress)
  const sortedData = state.cars.map((car, index) => ({
    car,
    player: state.players[index] || { id: 'unknown', name: 'Unknown', color: '#666', isLocal: false },
    position: 0 // Will be set below
  }))
  .sort((a, b) => {
    // Finished cars come first
    if (a.car.finished && !b.car.finished) return -1
    if (!a.car.finished && b.car.finished) return 1
    
    // Both finished - sort by finish time
    if (a.car.finished && b.car.finished) {
      return (a.car.finishTime || 0) - (b.car.finishTime || 0)
    }
    
    // Neither finished - sort by laps completed
    if (a.car.currentLap !== b.car.currentLap) {
      return b.car.currentLap - a.car.currentLap
    }
    
    // Same lap - sort by progress (trail length as rough estimate)
    return b.car.trail.length - a.car.trail.length
  })
  
  // Assign positions
  sortedData.forEach((data, index) => {
    data.position = index + 1
  })
  
  return sortedData
}

// Color utility functions for multi-car rendering
function fadeColor(color: string, alpha: number): string {
  // Convert hex to rgba with alpha
  const hex = color.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function lightenColor(color: string, amount: number): string {
  // Lighten a hex color by mixing with white
  const hex = color.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  
  const newR = Math.min(255, Math.round(r + (255 - r) * amount))
  const newG = Math.min(255, Math.round(g + (255 - g) * amount))
  const newB = Math.min(255, Math.round(b + (255 - b) * amount))
  
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
}

export function screenToGrid(canvas: HTMLCanvasElement, g: number, x: number, y: number): Vec {
  const rect = canvas.getBoundingClientRect()
  const gx = (x - rect.left) / (rect.width) * canvas.width / g
  const gy = (y - rect.top) / (rect.height) * canvas.height / g
  return { x: gx, y: gy }
}

export type { GameState }

