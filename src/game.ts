import { add, clamp, Segment, segmentInsidePolygon, segmentsIntersect, Vec } from './geometry'
import { isFeatureEnabled } from './features'
import { performanceTracker } from './performance'
import { animationManager, AnimationUtils } from './animations'
import { hudManager, HUDData } from './hud'
import { createTrackAnalysisWithCustomLine, getExpectedRacingDirection, findNearestRacingLinePoint, determineCrossingDirection, type TrackAnalysis, type RacingLinePoint } from './track-analysis'
import { isRacingLineVisible } from './racing-line-ui'

// Utility to access CSS custom properties from canvas context
function getCSSColor(varName: string): string {
  if (typeof window === 'undefined') return '#333333' // SSR fallback
  const computedStyle = getComputedStyle(document.documentElement)
  const color = computedStyle.getPropertyValue(varName).trim()
  return color || '#333333' // Fallback if variable not found
}

// Comprehensive unified color system bridge
const UNIFIED_COLORS = {
  // Paper-based foundation colors
  get paperBg() { return getCSSColor('--paper-bg') },
  get paperAged() { return getCSSColor('--paper-aged') },
  get paperShadow() { return getCSSColor('--paper-shadow') },
  get paperBorder() { return getCSSColor('--paper-border') },
  
  // Pencil drawing colors
  get pencilDark() { return getCSSColor('--pencil-dark') },
  get pencilMedium() { return getCSSColor('--pencil-medium') },
  get pencilLight() { return getCSSColor('--pencil-light') },
  get pencilBlue() { return getCSSColor('--pencil-blue') },
  get pencilRed() { return getCSSColor('--pencil-red') },
  get pencilGreen() { return getCSSColor('--pencil-green') },
  
  // Graph paper grid colors
  get graphBlue() { return getCSSColor('--graph-blue') },
  get graphMajor() { return getCSSColor('--graph-major') },
  
  // Racing car colors (synchronized with CSS)
  get racingTangerine() { return getCSSColor('--racing-tangerine') },
  get racingYellow() { return getCSSColor('--racing-yellow') },
  get racingBlue() { return getCSSColor('--racing-blue') },
  get racingViolet() { return getCSSColor('--racing-violet') },
  get racingRed() { return getCSSColor('--racing-red') },
  
  // UI state colors
  get success() { return getCSSColor('--success') },
  get warning() { return getCSSColor('--warning') },
  get error() { return getCSSColor('--error') },
  
  // Car colors array (synchronized with CSS racing colors)
  get carColors(): string[] {
    return [
      this.racingTangerine,
      '#2F2F2F', // Charcoal (moved from position 8)
      this.racingBlue,
      this.racingViolet,
      this.racingRed,
      '#228B22', // Forest Green (fallback)
      '#8B4513', // Burnt Sienna (fallback)
      this.racingYellow, // Golden Rod (moved from position 2)
    ]
  },
  
  // UI feedback colors for game states
  get gameStates() {
    return {
      legal: this.success,
      illegal: this.error,
      warning: this.warning,
      crashed: this.error,
      finished: this.success,
      current: this.pencilBlue,
      hover: this.warning
    }
  }
}

// Legacy alias for backward compatibility
const PAPER_COLORS = UNIFIED_COLORS

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

// Car colors for multiplayer (using unified color system)
function getCarColors(): string[] {
  return UNIFIED_COLORS.carColors
}

// Legacy constant (now dynamically generated)
const CAR_COLORS = getCarColors()

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

    // Refined layering system with optimized transparency hierarchy
    
    // Foundation layers (paper and texture)
    LayerManager.drawPaperFoundation(ctx, W, H)
    LayerManager.drawPaperTexture(ctx, W, H)
    
    // Coordinate labels (grid numbers only - CSS provides grid lines)
    if (legacyState.showGrid) {
      ctx.save()
      ctx.globalAlpha = LayerManager.LAYER_OPACITY.GRID_LABELS
      drawCoordinateLabels(ctx, W, H, g)
      ctx.restore()
    }

    // Track layers (surface, shadows, texture, borders)
    LayerManager.drawTrackLayers(ctx, legacyState.outer, legacyState.inner, g)
    
    // Racing elements (start/finish, arrows, racing line)
    LayerManager.drawRacingElements(ctx, legacyState, g)

    // Trail layer with refined transparency
    if (legacyState.trail.length > 1) {
      ctx.save()
      ctx.globalAlpha = LayerManager.LAYER_OPACITY.TRAILS
      ctx.strokeStyle = UNIFIED_COLORS.racingBlue // Use racing blue from unified system
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      
      ctx.beginPath()
      const firstTrail = legacyState.trail[0]!
      ctx.moveTo(firstTrail.x * g, firstTrail.y * g)
      for (let i = 1; i < legacyState.trail.length; i++) {
        const p = legacyState.trail[i]!
        ctx.lineTo(p.x * g, p.y * g)
      }
      ctx.stroke()
      ctx.restore()
    }

    // Game feedback layer (candidates and hover effects)
    if (legacyState.showCandidates && !legacyState.crashed && !legacyState.finished) {
      ctx.save()
      ctx.globalAlpha = LayerManager.LAYER_OPACITY.GAME_FEEDBACK
      
      const opts = stepOptions(legacyState)
      for (const { nextPos } of opts) {
        const legal = pathLegal(legacyState.pos, nextPos, legacyState)
        const isHovered = isFeatureEnabled('improvedControls') && 
                         legacyState.hoveredPosition && 
                         nextPos.x === legacyState.hoveredPosition.x && 
                         nextPos.y === legacyState.hoveredPosition.y
        
        if (isHovered) {
          // Draw hover effects with layered transparency
          ctx.save()
          ctx.globalAlpha = 0.3
          drawNode(ctx, nextPos, g, legal ? UNIFIED_COLORS.gameStates.legal : UNIFIED_COLORS.gameStates.illegal, 8)
          ctx.restore()
          
          // Draw preview trail line
          if (legal && isFeatureEnabled('improvedControls')) {
            ctx.save()
            ctx.strokeStyle = UNIFIED_COLORS.gameStates.hover
            ctx.lineWidth = 2
            ctx.globalAlpha = 0.6
            ctx.setLineDash([5, 5])
            line(ctx, legacyState.pos.x * g, legacyState.pos.y * g, nextPos.x * g, nextPos.y * g)
            ctx.restore()
          }
        }
        
        // Draw normal candidate with proper layering
        const radius = isHovered ? 6 : 4
        const gameStates = UNIFIED_COLORS.gameStates
        const color = legal ? 
          (isHovered ? lightenColor(gameStates.legal, 0.2) : gameStates.legal) : 
          (isHovered ? lightenColor(gameStates.illegal, 0.2) : gameStates.illegal)
        drawNode(ctx, nextPos, g, color, radius)
      }
      
      ctx.restore()
    }

    // Car layer with full opacity for maximum clarity
    ctx.save()
    ctx.globalAlpha = LayerManager.LAYER_OPACITY.CARS
    const carColor = legacyState.crashed ? 
      UNIFIED_COLORS.gameStates.crashed : 
      UNIFIED_COLORS.racingYellow // Use racing yellow for default single car
    drawCarWithShadow(ctx, legacyState.pos, g, carColor, 6, true)
    ctx.restore()
    
    // Particle layer with slight transparency
    if (isFeatureEnabled('animations')) {
      ctx.save()
      ctx.globalAlpha = LayerManager.LAYER_OPACITY.PARTICLES
      animationManager.renderParticles(ctx, g)
      ctx.restore()
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

    // Refined layering system with optimized transparency hierarchy
    
    // Foundation layers (paper and texture)
    LayerManager.drawPaperFoundation(ctx, W, H)
    LayerManager.drawPaperTexture(ctx, W, H)
    
    // Coordinate labels with proper opacity
    if (multiCarState.showGrid) {
      ctx.save()
      ctx.globalAlpha = LayerManager.LAYER_OPACITY.GRID_LABELS
      drawCoordinateLabels(ctx, W, H, g)
      ctx.restore()
    }

    // Track layers (surface, shadows, texture, borders)
    LayerManager.drawTrackLayers(ctx, multiCarState.outer, multiCarState.inner, g)
    
    // Racing elements (start/finish, arrows, racing line)
    LayerManager.drawRacingElements(ctx, multiCarState, g)
    
    // Debug elements with proper layering
    LayerManager.drawDebugElements(ctx, multiCarState, g)

    // Trail layer with refined transparency
    ctx.save()
    ctx.globalAlpha = LayerManager.LAYER_OPACITY.TRAILS
    
    for (let i = 0; i < multiCarState.cars.length; i++) {
      const car = multiCarState.cars[i]!
      const isCurrentPlayer = i === multiCarState.currentPlayerIndex
      
      // Trail style with layered transparency
      ctx.strokeStyle = isCurrentPlayer ? car.color : fadeColor(car.color, 0.5)
      ctx.lineWidth = isCurrentPlayer ? 3 : 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      
      // Adjust transparency within the trail layer
      const trailOpacity = isCurrentPlayer ? 1.0 : 0.6
      ctx.save()
      ctx.globalAlpha = trailOpacity
      
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
      
      ctx.restore()
    }
    
    ctx.restore()

    // Game feedback layer (candidates and hover effects)
    const currentCar = multiCarState.cars[multiCarState.currentPlayerIndex]
    if (currentCar && multiCarState.showCandidates && !currentCar.crashed && !currentCar.finished && !multiCarState.gameFinished) {
      ctx.save()
      ctx.globalAlpha = LayerManager.LAYER_OPACITY.GAME_FEEDBACK
      
      const opts = stepOptions(multiCarState)
      for (const { nextPos } of opts) {
        const legal = pathLegal(currentCar.pos, nextPos, multiCarState)
        const isHovered = isFeatureEnabled('improvedControls') && 
                         multiCarState.hoveredPosition && 
                         nextPos.x === multiCarState.hoveredPosition.x && 
                         nextPos.y === multiCarState.hoveredPosition.y
        
        if (isHovered) {
          // Draw hover effects with layered transparency
          ctx.save()
          ctx.globalAlpha = 0.3
          drawNode(ctx, nextPos, g, legal ? UNIFIED_COLORS.gameStates.legal : UNIFIED_COLORS.gameStates.illegal, 8)
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
        
        // Draw normal candidate with proper layering
        const radius = isHovered ? 6 : 4
        const gameStates = UNIFIED_COLORS.gameStates
        const color = legal ? 
          (isHovered ? lightenColor(gameStates.legal, 0.2) : gameStates.legal) : 
          (isHovered ? lightenColor(gameStates.illegal, 0.2) : gameStates.illegal)
        drawNode(ctx, nextPos, g, color, radius)
      }
      
      ctx.restore()
    }

    // Car layer with full opacity for maximum clarity
    ctx.save()
    ctx.globalAlpha = LayerManager.LAYER_OPACITY.CARS
    
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
        // Current player gets enhanced shadow depth
        drawCarWithShadow(ctx, car.pos, g, carColor, carSize, true)
        continue // Skip the normal draw below
      }
      
      // Draw regular car with subtle shadow
      drawCarWithShadow(ctx, car.pos, g, carColor, carSize, false)
    }
    
    ctx.restore()
    
    // Particle layer with slight transparency
    if (isFeatureEnabled('animations')) {
      ctx.save()
      ctx.globalAlpha = LayerManager.LAYER_OPACITY.PARTICLES
      animationManager.renderParticles(ctx, g)
      ctx.restore()
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

// Removed drawDirectionalArrows function - arrows were covered by checkpoint lines and not aesthetically pleasing

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

// Helper function to draw directional arrow with number label for checkpoints
function drawDirectionalArrowLabel(ctx: CanvasRenderingContext2D, x: number, y: number, direction: number, checkpointNum: number, color: string) {
  ctx.save()
  
  // Calculate arrow direction (counter-clockwise racing direction)
  // direction: 0=right, 1=up, 2=left, 3=down based on checkpoint position
  const angles = [0, -Math.PI / 2, Math.PI, Math.PI / 2] // →, ↑, ←, ↓
  const angle = angles[direction % 4] || 0
  
  ctx.translate(x, y)
  ctx.rotate(angle)
  
  ctx.fillStyle = color
  ctx.globalAlpha = 0.9
  
  // Draw complete arrow shape as one path
  ctx.beginPath()
  
  // Arrow shaft (narrower rectangle part)
  ctx.moveTo(-12, -2.5)  // Top-left of shaft (narrower)
  ctx.lineTo(8, -2.5)    // Top-right of shaft
  ctx.lineTo(8, -6)      // Top of arrow head
  ctx.lineTo(12, 0)      // Point of arrow head
  ctx.lineTo(8, 6)       // Bottom of arrow head
  ctx.lineTo(8, 2.5)     // Bottom-right of shaft (narrower)
  ctx.lineTo(-12, 2.5)   // Bottom-left of shaft (narrower)
  ctx.closePath()
  
  ctx.fill()
  
  // Draw checkpoint number on arrow shaft
  ctx.fillStyle = '#fff'
  ctx.globalAlpha = 1.0
  ctx.font = 'bold 10px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  
  // Add subtle stroke for text visibility
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.strokeText(checkpointNum.toString(), -2, 0)
  ctx.fillText(checkpointNum.toString(), -2, 0)
  
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

// Colored pencil polygon drawing
function drawColoredPencilPoly(ctx: CanvasRenderingContext2D, poly: Vec[], g: number, stroke: string, fill: string, hole = false) {
  ctx.save()
  
  // Fill the polygon first with slightly irregular fill (only for non-holes)
  if (!hole) {
    ctx.fillStyle = fill
    ctx.globalAlpha = 0.7
    ctx.beginPath()
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i]
      if (!p) continue
      const x = p.x * g + (Math.random() - 0.5) * 0.3 // Slight jitter
      const y = p.y * g + (Math.random() - 0.5) * 0.3
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.fill()
  }
  
  // Draw the border with colored pencil effect
  ctx.restore()
  ctx.save()
  
  for (let i = 0; i < poly.length; i++) {
    const p1 = poly[i]
    const p2 = poly[(i + 1) % poly.length]
    if (!p1 || !p2) continue
    
    drawColoredPencilLine(
      ctx,
      p1.x * g,
      p1.y * g,
      p2.x * g,
      p2.y * g,
      stroke,
      3
    )
  }
  
  ctx.restore()
}

// Special function for drawing track with proper hole cutout
function drawTrackWithHole(ctx: CanvasRenderingContext2D, outer: Vec[], inner: Vec[], g: number) {
  ctx.save()
  
  // Use composite operation to create proper hole
  ctx.globalCompositeOperation = 'source-over'
  
  // First, fill the outer track area with warm graphite surface from CSS variables
  ctx.fillStyle = PAPER_COLORS.pencilMedium // Warm graphite track surface
  ctx.globalAlpha = 0.3
  ctx.beginPath()
  for (let i = 0; i < outer.length; i++) {
    const p = outer[i]
    if (!p) continue
    const x = p.x * g
    const y = p.y * g
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fill()
  
  // Cut out the inner hole - this removes the track surface to show paper background
  ctx.globalCompositeOperation = 'destination-out'
  ctx.globalAlpha = 1.0
  ctx.beginPath()
  for (let i = 0; i < inner.length; i++) {
    const p = inner[i]
    if (!p) continue
    const x = p.x * g
    const y = p.y * g
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fill()
  
  ctx.restore()
  
  // Now draw the borders with pencil dark from CSS variables
  drawCleanPolyBorder(ctx, outer, g, PAPER_COLORS.pencilDark) // Dark pencil border for outer
  drawCleanPolyBorder(ctx, inner, g, PAPER_COLORS.pencilDark) // Dark pencil border for inner
}

// Helper function to draw clean polygon border
function drawCleanPolyBorder(ctx: CanvasRenderingContext2D, poly: Vec[], g: number, stroke: string) {
  ctx.save()
  
  ctx.strokeStyle = stroke
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  
  ctx.beginPath()
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]
    if (!p) continue
    const x = p.x * g
    const y = p.y * g
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.stroke()
  
  ctx.restore()
}

// Helper function to draw just the border (legacy pencil version - keeping for reference)
function drawColoredPencilPolyBorder(ctx: CanvasRenderingContext2D, poly: Vec[], g: number, stroke: string) {
  ctx.save()
  
  for (let i = 0; i < poly.length; i++) {
    const p1 = poly[i]
    const p2 = poly[(i + 1) % poly.length]
    if (!p1 || !p2) continue
    
    drawColoredPencilLine(
      ctx,
      p1.x * g,
      p1.y * g,
      p2.x * g,
      p2.y * g,
      stroke,
      3
    )
  }
  
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

// Enhanced paper texture effect matching CSS aging
function drawSimplePaperTexture(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.save()
  
  // Layer 1: Base paper aging spots (matching CSS body::before)
  // Brown aging spot at top-left area
  const aging1 = ctx.createRadialGradient(width * 0.2, height * 0.2, 0, width * 0.2, height * 0.2, Math.min(width, height) * 0.5)
  aging1.addColorStop(0, 'rgba(139, 69, 19, 0.03)') // Matches CSS brown aging
  aging1.addColorStop(1, 'transparent')
  ctx.fillStyle = aging1
  ctx.fillRect(0, 0, width, height)
  
  // Brown aging spot at bottom-right area
  const aging2 = ctx.createRadialGradient(width * 0.8, height * 0.8, 0, width * 0.8, height * 0.8, Math.min(width, height) * 0.5)
  aging2.addColorStop(0, 'rgba(160, 82, 45, 0.02)') // Matches CSS saddle brown aging
  aging2.addColorStop(1, 'transparent')
  ctx.fillStyle = aging2
  ctx.fillRect(0, 0, width, height)
  
  // Brown aging spot at center-left area
  const aging3 = ctx.createRadialGradient(width * 0.4, height * 0.7, 0, width * 0.4, height * 0.7, Math.min(width, height) * 0.5)
  aging3.addColorStop(0, 'rgba(139, 69, 19, 0.01)') // Subtle center aging
  aging3.addColorStop(1, 'transparent')
  ctx.fillStyle = aging3
  ctx.fillRect(0, 0, width, height)
  
  // Layer 2: Paper fiber texture using CSS paper colors
  const paperBg = PAPER_COLORS.paperBg
  const paperAged = PAPER_COLORS.paperAged
  const paperShadow = PAPER_COLORS.paperShadow
  
  // Create paper fiber texture with dots (matching CSS radial gradient pattern)
  const fiberSpacing = 25 // Matches CSS 25px paper texture size
  for (let x = 0; x < width; x += fiberSpacing) {
    for (let y = 0; y < height; y += fiberSpacing) {
      if (Math.random() > 0.3) { // 70% chance for fiber texture
        const fiberGrad = ctx.createRadialGradient(x, y, 0, x, y, 1)
        fiberGrad.addColorStop(0, paperShadow + '40') // Add 40 alpha (25% opacity)
        fiberGrad.addColorStop(1, 'transparent')
        ctx.fillStyle = fiberGrad
        ctx.fillRect(x-1, y-1, 2, 2)
      }
    }
  }
  
  // Layer 3: Overall paper gradient (main paper feel)
  const gradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, Math.max(width, height)/2)
  
  // Convert hex colors to rgba with very low opacity for subtle effect
  const centerColor = paperBg.replace('#', '').match(/.{2}/g)
  const edgeColor = paperAged.replace('#', '').match(/.{2}/g)
  
  if (centerColor && centerColor.length >= 3 && edgeColor && edgeColor.length >= 3) {
    const centerR = parseInt(centerColor[0]!, 16)
    const centerG = parseInt(centerColor[1]!, 16)
    const centerB = parseInt(centerColor[2]!, 16)
    const edgeR = parseInt(edgeColor[0]!, 16)
    const edgeG = parseInt(edgeColor[1]!, 16)
    const edgeB = parseInt(edgeColor[2]!, 16)
    
    gradient.addColorStop(0, `rgba(${centerR}, ${centerG}, ${centerB}, 0.005)`) // Very subtle center
    gradient.addColorStop(1, `rgba(${edgeR}, ${edgeG}, ${edgeB}, 0.015)`) // Slightly more aged edges
  } else {
    // Fallback if color parsing fails
    gradient.addColorStop(0, 'rgba(250, 248, 240, 0.005)')
    gradient.addColorStop(1, 'rgba(245, 243, 235, 0.015)')
  }
  
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
  
  ctx.restore()
}

// Paper texture effect (legacy version with complex noise)
function drawPaperTexture(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.save()
  
  // Create subtle paper fiber texture using noise
  const imageData = ctx.createImageData(width, height)
  const data = imageData.data
  
  for (let i = 0; i < data.length; i += 4) {
    const noise = Math.random() * 10 - 5 // Random -5 to +5
    const baseColor = 254 + noise // Slight variation from #fefef8
    
    data[i] = Math.max(240, Math.min(255, baseColor))     // R
    data[i + 1] = Math.max(240, Math.min(255, baseColor)) // G  
    data[i + 2] = Math.max(245, Math.min(255, baseColor + 3)) // B (slightly more blue)
    data[i + 3] = Math.random() > 0.98 ? 5 : 0 // Very sparse tiny specks
  }
  
  ctx.globalAlpha = 0.05
  ctx.putImageData(imageData, 0, 0)
  ctx.restore()
}

// Colored pencil line effect
function drawColoredPencilLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, width: number = 2) {
  ctx.save()
  
  const dx = x2 - x1
  const dy = y2 - y1
  const distance = Math.sqrt(dx * dx + dy * dy)
  const steps = Math.floor(distance / 2) // Draw in small segments
  
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.globalAlpha = 0.8
  
  for (let i = 0; i < steps; i++) {
    const t1 = i / steps
    const t2 = (i + 1) / steps
    
    // Add slight randomness for hand-drawn effect
    const jitter = 0.3
    const x1_j = x1 + dx * t1 + (Math.random() - 0.5) * jitter
    const y1_j = y1 + dy * t1 + (Math.random() - 0.5) * jitter
    const x2_j = x1 + dx * t2 + (Math.random() - 0.5) * jitter
    const y2_j = y1 + dy * t2 + (Math.random() - 0.5) * jitter
    
    // Vary opacity slightly for texture
    ctx.globalAlpha = 0.7 + Math.random() * 0.2
    
    ctx.beginPath()
    ctx.moveTo(x1_j, y1_j)
    ctx.lineTo(x2_j, y2_j)
    ctx.stroke()
  }
  
  ctx.restore()
}

// Colored pencil circle/dot effect
function drawColoredPencilDot(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string) {
  ctx.save()
  
  ctx.fillStyle = color
  ctx.globalAlpha = 0.8
  
  // Draw multiple overlapping circles with slight jitter for texture
  for (let i = 0; i < 3; i++) {
    const jitterX = (Math.random() - 0.5) * 0.5
    const jitterY = (Math.random() - 0.5) * 0.5
    const radiusVariation = radius + (Math.random() - 0.5) * 0.5
    
    ctx.globalAlpha = 0.3 + Math.random() * 0.3
    ctx.beginPath()
    ctx.arc(x + jitterX, y + jitterY, radiusVariation, 0, Math.PI * 2)
    ctx.fill()
  }
  
  ctx.restore()
}

// Refined hand-drawn border function with subtle character and consistent opacity
function drawRefinedPencilBorder(ctx: CanvasRenderingContext2D, poly: Vec[], g: number, stroke: string, lineWidth = 3) {
  ctx.save()
  
  ctx.strokeStyle = stroke
  ctx.lineWidth = lineWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.globalAlpha = 0.9 // Consistent opacity (no random variations)
  
  for (let i = 0; i < poly.length; i++) {
    const p1 = poly[i]
    const p2 = poly[(i + 1) % poly.length]
    if (!p1 || !p2) continue
    
    const x1 = p1.x * g
    const y1 = p1.y * g
    const x2 = p2.x * g
    const y2 = p2.y * g
    
    // Refined hand-drawn effect with subtle jitter (0.1px vs previous 0.3px)
    const dx = x2 - x1
    const dy = y2 - y1
    const distance = Math.sqrt(dx * dx + dy * dy)
    const segments = Math.max(1, Math.floor(distance / 5)) // Fewer segments for better performance
    
    ctx.beginPath()
    let currentX = x1
    let currentY = y1
    ctx.moveTo(currentX, currentY)
    
    for (let j = 1; j <= segments; j++) {
      const t = j / segments
      let targetX = x1 + dx * t
      let targetY = y1 + dy * t
      
      // Add very subtle jitter for hand-drawn character (0.1px max)
      if (j < segments) { // Don't jitter the final point to ensure clean connections
        targetX += (Math.random() - 0.5) * 0.1
        targetY += (Math.random() - 0.5) * 0.1
      }
      
      ctx.lineTo(targetX, targetY)
      currentX = targetX
      currentY = targetY
    }
    
    ctx.stroke()
  }
  
  ctx.restore()
}

// Refined hand-drawn polygon function that combines fill and border
function drawRefinedPencilPoly(ctx: CanvasRenderingContext2D, poly: Vec[], g: number, stroke: string, fill: string, lineWidth = 3) {
  ctx.save()
  
  // Fill first with clean edges
  ctx.fillStyle = fill
  ctx.globalAlpha = 0.3
  ctx.beginPath()
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]
    if (!p) continue
    const x = p.x * g
    const y = p.y * g
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fill()
  
  ctx.restore()
  
  // Then draw refined border
  drawRefinedPencilBorder(ctx, poly, g, stroke, lineWidth)
}

// Refined hand-drawn line function for debug elements
function drawRefinedPencilLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, stroke: string, lineWidth = 2) {
  ctx.save()
  
  ctx.strokeStyle = stroke
  ctx.lineWidth = lineWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  
  // Refined hand-drawn effect with subtle jitter (0.1px vs previous 0.3px)
  const dx = x2 - x1
  const dy = y2 - y1
  const distance = Math.sqrt(dx * dx + dy * dy)
  const segments = Math.max(1, Math.floor(distance / 5)) // Fewer segments for better performance
  
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  
  for (let j = 1; j <= segments; j++) {
    const t = j / segments
    let targetX = x1 + dx * t
    let targetY = y1 + dy * t
    
    // Add very subtle jitter for hand-drawn character (0.1px max)
    if (j < segments) { // Don't jitter the final point to ensure clean connections
      targetX += (Math.random() - 0.5) * 0.1
      targetY += (Math.random() - 0.5) * 0.1
    }
    
    ctx.lineTo(targetX, targetY)
  }
  
  ctx.stroke()
  ctx.restore()
}

// Selective paper texture overlay for track surface
function drawTrackPaperTexture(ctx: CanvasRenderingContext2D, outer: Vec[], inner: Vec[], g: number) {
  ctx.save()
  
  // Create clipping path for track area only (outer minus inner)
  ctx.globalCompositeOperation = 'source-over'
  
  // First, create the track area clip path
  ctx.beginPath()
  for (let i = 0; i < outer.length; i++) {
    const p = outer[i]
    if (!p) continue
    const x = p.x * g
    const y = p.y * g
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  }
  ctx.closePath()
  
  // Cut out inner hole
  for (let i = 0; i < inner.length; i++) {
    const p = inner[i]
    if (!p) continue
    const x = p.x * g
    const y = p.y * g
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  }
  ctx.closePath()
  
  ctx.clip()
  
  // Apply very subtle paper texture only to track surface
  const paperShadow = PAPER_COLORS.paperShadow
  const paperAged = PAPER_COLORS.paperAged
  
  // Minimal fiber texture that matches UI layer aesthetic
  const fiberSpacing = 30 // Slightly larger spacing to preserve grid visibility
  const minX = Math.min(...outer.map(p => p.x)) * g
  const maxX = Math.max(...outer.map(p => p.x)) * g
  const minY = Math.min(...outer.map(p => p.y)) * g
  const maxY = Math.max(...outer.map(p => p.y)) * g
  
  for (let x = minX; x < maxX; x += fiberSpacing) {
    for (let y = minY; y < maxY; y += fiberSpacing) {
      if (Math.random() > 0.7) { // Only 30% chance for very sparse texture
        const fiberGrad = ctx.createRadialGradient(x, y, 0, x, y, 0.5)
        fiberGrad.addColorStop(0, paperShadow + '20') // Very low opacity (12.5%)
        fiberGrad.addColorStop(1, 'transparent')
        ctx.fillStyle = fiberGrad
        ctx.fillRect(x-0.5, y-0.5, 1, 1) // Tiny dots
      }
    }
  }
  
  // Add very subtle aged paper tint to track surface
  const trackBounds = {
    left: minX,
    top: minY,
    width: maxX - minX,
    height: maxY - minY
  }
  
  const agingGrad = ctx.createRadialGradient(
    trackBounds.left + trackBounds.width * 0.3,
    trackBounds.top + trackBounds.height * 0.3,
    0,
    trackBounds.left + trackBounds.width * 0.3,
    trackBounds.top + trackBounds.height * 0.3,
    Math.max(trackBounds.width, trackBounds.height) * 0.6
  )
  agingGrad.addColorStop(0, 'rgba(139, 69, 19, 0.005)') // Extremely subtle brown aging
  agingGrad.addColorStop(1, 'transparent')
  
  ctx.fillStyle = agingGrad
  ctx.fillRect(trackBounds.left, trackBounds.top, trackBounds.width, trackBounds.height)
  
  ctx.restore()
}

// Gentle shadow effects for track boundaries using warm gray tones
function drawTrackShadows(ctx: CanvasRenderingContext2D, outer: Vec[], inner: Vec[], g: number) {
  ctx.save()
  
  // Very subtle drop shadow for outer track boundary
  ctx.shadowColor = PAPER_COLORS.pencilLight // Warm gray shadow
  ctx.shadowBlur = 2
  ctx.shadowOffsetX = 1
  ctx.shadowOffsetY = 1
  ctx.globalAlpha = 0.3 // Very subtle
  
  // Draw invisible shape to cast shadow
  ctx.strokeStyle = 'transparent'
  ctx.lineWidth = 4
  ctx.beginPath()
  for (let i = 0; i < outer.length; i++) {
    const p = outer[i]
    if (!p) continue
    const x = p.x * g
    const y = p.y * g
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.stroke()
  
  // Reset shadow for inner boundary
  ctx.shadowOffsetX = -0.5
  ctx.shadowOffsetY = -0.5
  ctx.shadowBlur = 1
  
  // Inner boundary shadow (inward)
  ctx.beginPath()
  for (let i = 0; i < inner.length; i++) {
    const p = inner[i]
    if (!p) continue
    const x = p.x * g
    const y = p.y * g
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.stroke()
  
  ctx.restore()
}

// Enhanced car drawing with subtle shadow depth
function drawCarWithShadow(ctx: CanvasRenderingContext2D, pos: Vec, g: number, color: string, radius = 6, isCurrentPlayer = false) {
  ctx.save()
  
  // Very subtle shadow using warm gray tones
  if (!color.includes('transparent') && !color.includes('fade')) {
    ctx.shadowColor = PAPER_COLORS.pencilMedium
    ctx.shadowBlur = isCurrentPlayer ? 3 : 2
    ctx.shadowOffsetX = 1
    ctx.shadowOffsetY = 1
    ctx.globalAlpha = 0.4
  }
  
  // Draw the car
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(pos.x * g, pos.y * g, radius, 0, Math.PI * 2)
  ctx.fill()
  
  ctx.restore()
}

// Refined layering system with optimized transparency hierarchy
class LayerManager {
  static readonly LAYER_OPACITY = {
    PAPER_BASE: 0.85,          // Foundation paper layer
    PAPER_TEXTURE: 0.02,       // Subtle paper aging texture
    TRACK_SURFACE: 0.3,        // Track fill surface
    TRACK_SHADOWS: 0.3,        // Track boundary shadows
    TRACK_TEXTURE: 0.015,      // Track surface paper texture
    TRACK_BORDERS: 1.0,        // Track boundary lines
    GRID_LABELS: 0.7,          // Coordinate grid labels
    RACING_ELEMENTS: 0.7,      // Start/finish, arrows, racing line
    TRAILS: 1.0,               // Car movement trails
    DEBUG_ELEMENTS: 0.8,       // Debug overlays and checkpoints
    GAME_FEEDBACK: 1.0,        // Move candidates and hover effects
    CARS: 1.0,                 // Player cars
    PARTICLES: 0.9             // Animation particles
  }
  
  static drawPaperFoundation(ctx: CanvasRenderingContext2D, W: number, H: number) {
    // Layer 1: Paper base with optimal transparency for grid visibility
    ctx.save()
    ctx.globalAlpha = this.LAYER_OPACITY.PAPER_BASE
    const paperColor = UNIFIED_COLORS.paperBg
    ctx.fillStyle = paperColor
    ctx.fillRect(0, 0, W, H)
    ctx.restore()
  }
  
  static drawPaperTexture(ctx: CanvasRenderingContext2D, W: number, H: number) {
    // Layer 2: Paper aging texture with fine-tuned opacity
    ctx.save()
    ctx.globalAlpha = this.LAYER_OPACITY.PAPER_TEXTURE
    drawSimplePaperTexture(ctx, W, H)
    ctx.restore()
  }
  
  static drawTrackLayers(ctx: CanvasRenderingContext2D, outer: Vec[], inner: Vec[], g: number) {
    // Layer 3a: Track surface with optimized opacity
    ctx.save()
    ctx.globalAlpha = this.LAYER_OPACITY.TRACK_SURFACE
    drawTrackWithHole(ctx, outer, inner, g)
    ctx.restore()
    
    // Layer 3b: Track shadows (subtle depth)
    ctx.save()
    ctx.globalAlpha = this.LAYER_OPACITY.TRACK_SHADOWS
    drawTrackShadows(ctx, outer, inner, g)
    ctx.restore()
    
    // Layer 3c: Track surface texture (very minimal)
    ctx.save()
    ctx.globalAlpha = this.LAYER_OPACITY.TRACK_TEXTURE
    drawTrackPaperTexture(ctx, outer, inner, g)
    ctx.restore()
    
    // Layer 3d: Track borders (full opacity for clarity)
    ctx.save()
    ctx.globalAlpha = this.LAYER_OPACITY.TRACK_BORDERS
    // Track borders are drawn as part of drawTrackWithHole, so this is just for future reference
    ctx.restore()
  }
  
  static drawRacingElements(ctx: CanvasRenderingContext2D, state: GameState, g: number) {
    ctx.save()
    ctx.globalAlpha = this.LAYER_OPACITY.RACING_ELEMENTS
    
    if (isMultiCarGame(state)) {
      const multiCarState = state as MultiCarGameState
      drawCheckeredStartLine(ctx, multiCarState.start, g)
      // Removed directional arrows - they were covered by checkpoint lines and not aesthetically pleasing
      drawRacingLine(ctx, multiCarState, g)
    } else {
      const legacyState = state as LegacyGameState
      drawCheckeredStartLine(ctx, legacyState.start, g)
      // Removed directional arrows - they were covered by checkpoint lines and not aesthetically pleasing
      drawRacingLine(ctx, legacyState, g)
    }
    
    ctx.restore()
  }
  
  static drawDebugElements(ctx: CanvasRenderingContext2D, state: MultiCarGameState, g: number) {
    if (!isFeatureEnabled('debugMode')) return
    
    ctx.save()
    ctx.globalAlpha = this.LAYER_OPACITY.DEBUG_ELEMENTS
    drawCheckpointLines(ctx, state, g)
    drawAIDebugVisualization(ctx, state, g)
    ctx.restore()
  }
}

// Draw coordinate labels for technical reference (no grid lines - CSS provides those)
function drawCoordinateLabels(ctx: CanvasRenderingContext2D, W: number, H: number, g: number) {
  ctx.save()
  
  // Calculate grid boundaries based on game coordinate system
  const maxX = Math.floor(W / g)
  const maxY = Math.floor(H / g)
  
  // Coordinate labels in graphite pencil style using CSS variables
  ctx.fillStyle = PAPER_COLORS.pencilMedium // Medium pencil from CSS
  ctx.font = '11px monospace'
  ctx.globalAlpha = 0.7
  
  // X-axis labels (top edge)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  for (let x = 0; x <= maxX; x += 5) { // Every 5 units to match major grid lines
    const xPixel = x * g
    if (xPixel <= W && x > 0) { // Skip origin (0,0) for cleanliness
      ctx.fillText(x.toString(), xPixel, 4)
    }
  }
  
  // Y-axis labels (left edge)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  for (let y = 0; y <= maxY; y += 5) { // Every 5 units to match major grid lines
    const yPixel = y * g
    if (yPixel <= H && y > 0) { // Skip origin (0,0) for cleanliness
      ctx.fillText(y.toString(), 4, yPixel)
    }
  }
  
  // Origin marker (0,0) - small graphite dot using CSS color
  ctx.fillStyle = PAPER_COLORS.pencilMedium
  ctx.globalAlpha = 1.0
  ctx.beginPath()
  ctx.arc(0, 0, 2, 0, Math.PI * 2)
  ctx.fill()
  
  // Origin label using CSS color
  ctx.fillStyle = PAPER_COLORS.pencilMedium
  ctx.font = '10px monospace'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText('(0,0)', 4, 4)
  
  ctx.restore()
}

// Debug function to draw checkpoint lines with hand-drawn character
function drawCheckpointLines(ctx: CanvasRenderingContext2D, state: MultiCarGameState, g: number) {
  ctx.save()
  
  // Create track analysis to get consistent checkpoint data
  const trackAnalysis = createTrackAnalysisWithCustomLine(state.outer, state.inner, state.start)
  const checkpoints = trackAnalysis.lapValidationCheckpoints
  
  // Use warm dark brown from CSS variables for paper aesthetic
  const checkpointColor = UNIFIED_COLORS.pencilDark
  
  for (let i = 0; i < checkpoints.length; i++) {
    const checkpoint = checkpoints[i]
    if (!checkpoint) continue
    
    const x1 = checkpoint.a.x * g
    const y1 = checkpoint.a.y * g
    const x2 = checkpoint.b.x * g
    const y2 = checkpoint.b.y * g
    
    // Calculate perpendicular offset for double lines (2 pixels apart)
    const dx = x2 - x1
    const dy = y2 - y1
    const length = Math.sqrt(dx * dx + dy * dy)
    const perpX = (-dy / length) * 1 // 1 pixel offset
    const perpY = (dx / length) * 1
    
    // Draw hand-drawn style double lines with subtle character
    ctx.strokeStyle = checkpointColor
    ctx.lineWidth = 1.2
    ctx.globalAlpha = 0.8
    ctx.lineCap = 'round'
    
    // First line with subtle hand-drawn character
    drawRefinedPencilLine(ctx, 
      x1 + perpX, y1 + perpY, 
      x2 + perpX, y2 + perpY, 
      checkpointColor, 1.2
    )
    
    // Second line with subtle hand-drawn character  
    drawRefinedPencilLine(ctx, 
      x1 - perpX, y1 - perpY, 
      x2 - perpX, y2 - perpY, 
      checkpointColor, 1.2
    )
    
    // Draw directional arrow label showing racing direction and checkpoint number
    // Find which endpoint is on the inner boundary for arrow placement
    const trackCenterX = 25 * g
    const trackCenterY = 17.5 * g
    
    // Check which endpoint is closer to the inner boundary (closer to track center)
    const dist1ToCenter = Math.sqrt((x1 - trackCenterX) ** 2 + (y1 - trackCenterY) ** 2)
    const dist2ToCenter = Math.sqrt((x2 - trackCenterX) ** 2 + (y2 - trackCenterY) ** 2)
    
    // Use the endpoint that's closer to the track center (inner boundary side)
    const innerX = dist1ToCenter < dist2ToCenter ? x1 : x2
    const innerY = dist1ToCenter < dist2ToCenter ? y1 : y2
    
    // Calculate direction from inner boundary point toward track center
    const dirX = trackCenterX - innerX
    const dirY = trackCenterY - innerY
    const dirLength = Math.sqrt(dirX * dirX + dirY * dirY)
    
    // Move arrow 18 pixels inward from the inner boundary endpoint
    let arrowX = innerX
    let arrowY = innerY
    
    if (dirLength > 0) {
      const normalizedX = dirX / dirLength
      const normalizedY = dirY / dirLength
      arrowX = innerX + normalizedX * 18
      arrowY = innerY + normalizedY * 18
    }
    
    // Determine racing direction for arrow (counter-clockwise):
    // CP0: right (→), CP1: up (↑), CP2: left (←), CP3: down (↓)
    let racingDirection = i // Default matches counter-clockwise progression
    
    // Use the same gray color as the checkpoint lines for consistency
    drawDirectionalArrowLabel(ctx, arrowX, arrowY, racingDirection, i, checkpointColor)
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
  
  // Draw racing line with hand-drawn character using warm colors
  ctx.strokeStyle = UNIFIED_COLORS.pencilMedium
  ctx.lineWidth = 2
  ctx.globalAlpha = 0.6
  ctx.setLineDash([6, 3]) // Slightly adjusted dash pattern
  ctx.lineCap = 'round'
  
  // Draw racing line segments with subtle hand-drawn character
  for (let i = 0; i < racingLine.length - 1; i++) {
    const point = racingLine[i]
    const nextPoint = racingLine[i + 1]
    if (!point || !nextPoint) continue
    
    const x1 = point.pos.x * g
    const y1 = point.pos.y * g
    const x2 = nextPoint.pos.x * g
    const y2 = nextPoint.pos.y * g
    
    // Use refined pencil line for subtle hand-drawn character
    drawRefinedPencilLine(ctx, x1, y1, x2, y2, UNIFIED_COLORS.pencilMedium, 2)
  }
  
  // Close the loop with hand-drawn character
  if (racingLine.length > 0) {
    const firstPoint = racingLine[0]
    const lastPoint = racingLine[racingLine.length - 1]
    if (firstPoint && lastPoint) {
      drawRefinedPencilLine(ctx, 
        lastPoint.pos.x * g, lastPoint.pos.y * g,
        firstPoint.pos.x * g, firstPoint.pos.y * g,
        UNIFIED_COLORS.pencilMedium, 2
      )
    }
  }
  
  // Draw waypoints with different colors based on corner type
  ctx.globalAlpha = 0.8
  ctx.setLineDash([]) // Reset dash pattern
  
  for (let i = 0; i < racingLine.length; i++) {
    const point = racingLine[i]
    if (!point) continue
    const x = point.pos.x * g
    const y = point.pos.y * g
    
    // Color based on corner type using warm paper-integrated tones
    let color = UNIFIED_COLORS.pencilMedium // default warm gray
    switch (point.cornerType) {
      case 'straight': color = UNIFIED_COLORS.pencilGreen; break  // Green pencil for straights
      case 'entry': color = UNIFIED_COLORS.warning; break     // Warm orange for corner entry
      case 'apex': color = UNIFIED_COLORS.pencilRed; break      // Red pencil for apex
      case 'exit': color = UNIFIED_COLORS.pencilBlue; break      // Blue pencil for corner exit
    }
    
    // Draw waypoint circle
    ctx.fillStyle = color
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(x, y, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    
    // Draw speed indicator with hand-drawn style
    ctx.fillStyle = UNIFIED_COLORS.paperBg
    ctx.font = '9px cursive' // Hand-drawn style font
    ctx.shadowColor = UNIFIED_COLORS.pencilDark
    ctx.shadowBlur = 1
    ctx.shadowOffsetX = 0.5
    ctx.shadowOffsetY = 0.5
    ctx.fillText(point.targetSpeed.toString(), x + 6, y - 6)
    
    // Draw brake zone indicator with warm tones
    if (point.brakeZone) {
      ctx.strokeStyle = UNIFIED_COLORS.warning
      ctx.lineWidth = 2
      ctx.shadowColor = 'transparent' // Reset shadow for shapes
      ctx.shadowBlur = 0
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
  
  // Draw racing line as connected waypoints using warm colors
  ctx.strokeStyle = PAPER_COLORS.pencilLight
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
    
    // Color based on corner type from track analysis (using warm tones)
    let color = PAPER_COLORS.pencilMedium // default warm gray
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

