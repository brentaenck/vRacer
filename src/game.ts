import { add, clamp, Segment, segmentInsidePolygon, segmentsIntersect, Vec } from './geometry'
import { isFeatureEnabled } from './features'
import { performanceTracker } from './performance'
import { animationManager, AnimationUtils } from './animations'
import { AudioUtils } from './audio'

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
  const wallSegments = (poly: Vec[]) => poly.map((p, i) => ({ a: p, b: poly[(i + 1) % poly.length]! }))
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
    const color = CAR_COLORS[i % CAR_COLORS.length]!
    const startPos = startPositions[i] || { x: 7, y: 20 + i } // Fallback positioning
    
    const player = createPlayer(playerId, playerName, color, true) // All local for now
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
  const wallSegments = (poly: Vec[]) => poly.map((p, i) => ({ a: p, b: poly[(i + 1) % poly.length]! }))
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

function polyToSegments(poly: Vec[]): Segment[] {
  return poly.map((p, i) => ({ a: p, b: poly[(i + 1) % poly.length]! }))
}

function insideTrack(p: Vec, state: GameState): boolean {
  // Inside outer and outside inner
  const inOuter = pointInPoly(p, state.outer)
  const inInner = pointInPoly(p, state.inner)
  return inOuter && !inInner
}

function pointInPoly(p: Vec, poly: Vec[]): boolean {
  // ray casting
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const pi = poly[i]!
    const pj = poly[j]!
    const intersect = (pi.y > p.y) !== (pj.y > p.y) &&
      p.x < ((pj.x - pi.x) * (p.y - pi.y)) / (pj.y - pi.y + 1e-12) + pi.x
    if (intersect) inside = !inside
  }
  return inside
}

function pathLegal(a: Vec, b: Vec, state: GameState): boolean {
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

// Determine if crossing the start line is in the correct direction (forward/backward)
function determineCrossDirection(fromPos: Vec, toPos: Vec, startLine: Segment): 'forward' | 'backward' {
  // For our track layout, the start line is now horizontal at y=18
  // Counter-clockwise racing: car comes from top (around the track) and crosses downward
  // Forward direction is top-to-bottom (lower y to higher y values)
  
  const lineY = startLine.a.y // Start line is horizontal, so both points have same y
  const fromSide = fromPos.y < lineY ? 'top' : 'bottom'
  const toSide = toPos.y < lineY ? 'top' : 'bottom'
  
  // Forward crossing: from top side to bottom side (completing counter-clockwise lap)
  if (fromSide === 'top' && toSide === 'bottom') {
    return 'forward'
  }
  // Backward crossing: from bottom side to top side
  else if (fromSide === 'bottom' && toSide === 'top') {
    return 'backward'
  }
  
  // This shouldn't happen if we're truly crossing, but default to forward
  return 'forward'
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

    // Calculate speed for engine sound (before any state changes)
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
      // Stop engine and play crash sound effect
      if (isFeatureEnabled('soundEffects')) {
        AudioUtils.stopEngine()
        AudioUtils.playCrash()
      }
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
            // Stop engine sound and play victory fanfare
            if (isFeatureEnabled('soundEffects')) {
              AudioUtils.stopEngine()
              AudioUtils.playVictoryFanfare()
            }
            // Create celebration particles when finishing the race
            if (isFeatureEnabled('animations')) {
              AnimationUtils.createCelebration(nextPos, '#0f0', 12)
            }
          } else {
            // Play lap completion sound
            if (isFeatureEnabled('soundEffects')) {
              AudioUtils.playLapComplete()
            }
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
      
      // Play engine sound based on speed (only when moving legally and race isn't finished)
      if (isFeatureEnabled('soundEffects') && speed > 0 && !finished) {
        AudioUtils.updateEngineSound(speed)
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
    
    const vel = { x: currentCar.vel.x + acc.x, y: currentCar.vel.y + acc.y }
    const nextPos = { x: currentCar.pos.x + vel.x, y: currentCar.pos.y + vel.y }
    
    const legal = pathLegal(currentCar.pos, nextPos, multiCarState)
    let crashed: boolean = currentCar.crashed
    let finished: boolean = currentCar.finished
    let currentLap: number = currentCar.currentLap
    let lastCrossDirection: 'forward' | 'backward' | undefined = currentCar.lastCrossDirection
    let finishTime: number | undefined = currentCar.finishTime
    
    // Calculate speed for engine sound
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
      // Stop engine and play crash sound effect
      if (isFeatureEnabled('soundEffects')) {
        AudioUtils.stopEngine()
        AudioUtils.playCrash()
      }
      // Create explosion particles when crashing
      if (isFeatureEnabled('animations')) {
        AnimationUtils.createExplosion(nextPos, currentCar.color, 8)
      }
    } else {
      if (crossedStart) {
        const crossDirection = determineCrossDirection(currentCar.pos, nextPos, multiCarState.start)
        
        if (crossDirection === 'forward') {
          currentLap += 1
          lastCrossDirection = 'forward'
          
          console.log(`✅ ${currentCar.name} completed lap ${currentLap}!`)
          
          // Check if this car finished the race
          if (currentLap >= multiCarState.targetLaps) {
            finished = true
            finishTime = Date.now() - multiCarState.raceStartTime
            console.log(`🏆 ${currentCar.name} finished the race! Time: ${(finishTime / 1000).toFixed(1)}s`)
            
            // Play victory fanfare for race completion
            if (isFeatureEnabled('soundEffects')) {
              AudioUtils.stopEngine()
              AudioUtils.playVictoryFanfare()
            }
            if (isFeatureEnabled('animations')) {
              AnimationUtils.createCelebration(nextPos, currentCar.color, 12)
            }
          } else {
            // Lap completed but race continues
            if (isFeatureEnabled('soundEffects')) {
              AudioUtils.playLapComplete()
            }
            if (isFeatureEnabled('animations')) {
              AnimationUtils.createCelebration(nextPos, currentCar.color, 6)
            }
          }
        } else {
          lastCrossDirection = 'backward'
          console.log(`⚠️ ${currentCar.name} wrong direction crossing!`)
        }
      }
      
      // Play engine sound based on speed
      if (isFeatureEnabled('soundEffects') && speed > 0 && !finished) {
        AudioUtils.updateEngineSound(speed)
      }
    }
    
    const trail = [...currentCar.trail, nextPos]
    
    // Update current car with new state
    const updatedCar: Car = {
      ...currentCar,
      pos: nextPos,
      vel,
      trail,
      crashed,
      finished,
      currentLap,
      lastCrossDirection,
      finishTime
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
    
    // Track render performance if enabled
    if (isFeatureEnabled('performanceMetrics')) {
      performanceTracker.startRender()
    }
    
    ctx.clearRect(0, 0, W, H)

    // Background
    ctx.fillStyle = '#0b0b0b'
    ctx.fillRect(0, 0, W, H)

    // Grid
    if (legacyState.showGrid) {
      ctx.strokeStyle = '#222'
      ctx.lineWidth = 1
      for (let x = 0; x <= W; x += g) { line(ctx, x, 0, x, H) }
      for (let y = 0; y <= H; y += g) { line(ctx, 0, y, W, y) }
    }

    // Track polygons
    drawPoly(ctx, legacyState.outer, g, '#555', '#111')
    drawPoly(ctx, legacyState.inner, g, '#555', '#0b0b0b', true)

    // Start/Finish line - checkered flag pattern
    drawCheckeredStartLine(ctx, legacyState.start, g)

    // Directional arrows to show racing direction
    drawDirectionalArrows(ctx, legacyState, g)

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

    // HUD text
    ctx.fillStyle = '#ddd'
    ctx.font = '14px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
    
    let hudLine = 1
    const lineHeight = 16
    const drawHudLine = (text: string) => {
      ctx.fillText(text, 12, hudLine * lineHeight + 4)
      hudLine++
    }
    
    drawHudLine(`pos=(${legacyState.pos.x},${legacyState.pos.y}) vel=(${legacyState.vel.x},${legacyState.vel.y})`)
    
    // Lap counter - always visible
    drawHudLine(`lap: ${legacyState.currentLap}/${legacyState.targetLaps}`)
    
    // Feature-flagged debug information
    if (isFeatureEnabled('debugMode')) {
      drawHudLine(`trail: ${legacyState.trail.length} points`)
      const speed = Math.sqrt(legacyState.vel.x * legacyState.vel.x + legacyState.vel.y * legacyState.vel.y)
      drawHudLine(`speed: ${speed.toFixed(1)}`)
    }
    
    // Feature-flagged performance metrics
    if (isFeatureEnabled('performanceMetrics')) {
      // End render tracking
      performanceTracker.endRender()
      
      // Display comprehensive performance metrics
      const performanceLines = performanceTracker.getSummary()
      for (const line of performanceLines) {
        if (line.includes('⚠️')) {
          // Performance warnings in red
          ctx.fillStyle = '#f66'
          drawHudLine(line)
          ctx.fillStyle = '#ddd' // Reset color
        } else {
          drawHudLine(line)
        }
      }
    }
    
    if (legacyState.crashed) drawHudLine('CRASHED — press R to reset')
    if (legacyState.finished) {
      // Show victory message with race details
      ctx.fillStyle = '#0f0' // Green for victory
      drawHudLine('🏁 RACE COMPLETE! 🏁')
      ctx.fillStyle = '#ddd' // Reset color
      drawHudLine(`Completed ${legacyState.currentLap}/${legacyState.targetLaps} laps — press R to race again`)
    }
    
    // Feature-flagged development help
    if (isFeatureEnabled('debugMode') && legacyState.showHelp) {
      ctx.fillStyle = '#888'
      ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
      const helpY = H - 110
      ctx.fillText('🚩 Debug mode enabled', 12, helpY)
      ctx.fillText('Features can be toggled in src/features.ts', 12, helpY + 15)
      
      if (isFeatureEnabled('improvedControls')) {
        ctx.fillText('⌨️  Keyboard controls: WASD/arrows, Q/E/Z/X (diagonals), Space/Enter (coast)', 12, helpY + 30)
        if (canUndo(legacyState)) {
          ctx.fillText('↶  Undo: U or Ctrl+Z', 12, helpY + 45)
        }
      }
      
      if (isFeatureEnabled('soundEffects')) {
        ctx.fillText('🔊 Audio controls: M (mute), +/- (volume)', 12, helpY + 60)
      }
    }
  } else {
    // Handle multi-car rendering
    const multiCarState = state as MultiCarGameState
    const g = multiCarState.grid
    const W = canvas.width, H = canvas.height
    
    // Track render performance if enabled
    if (isFeatureEnabled('performanceMetrics')) {
      performanceTracker.startRender()
    }
    
    ctx.clearRect(0, 0, W, H)

    // Background
    ctx.fillStyle = '#0b0b0b'
    ctx.fillRect(0, 0, W, H)

    // Grid
    if (multiCarState.showGrid) {
      ctx.strokeStyle = '#222'
      ctx.lineWidth = 1
      for (let x = 0; x <= W; x += g) { line(ctx, x, 0, x, H) }
      for (let y = 0; y <= H; y += g) { line(ctx, 0, y, W, y) }
    }

    // Track polygons
    drawPoly(ctx, multiCarState.outer, g, '#555', '#111')
    drawPoly(ctx, multiCarState.inner, g, '#555', '#0b0b0b', true)

    // Start/Finish line - checkered flag pattern
    drawCheckeredStartLine(ctx, multiCarState.start, g)

    // Directional arrows to show racing direction
    drawDirectionalArrows(ctx, multiCarState, g)

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

    // HUD text - Multi-player information
    ctx.fillStyle = '#ddd'
    ctx.font = '14px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
    
    let hudLine = 1
    const lineHeight = 16
    const drawHudLine = (text: string, color = '#ddd') => {
      ctx.fillStyle = color
      ctx.fillText(text, 12, hudLine * lineHeight + 4)
      hudLine++
      ctx.fillStyle = '#ddd' // Reset
    }
    
    // Current player info
    const currentPlayer = getCurrentPlayer(multiCarState)
    if (currentPlayer && currentCar) {
      drawHudLine(`${currentPlayer.name}'s Turn`, currentPlayer.color)
      drawHudLine(`pos=(${currentCar.pos.x},${currentCar.pos.y}) vel=(${currentCar.vel.x},${currentCar.vel.y})`)
      drawHudLine(`lap: ${currentCar.currentLap}/${multiCarState.targetLaps}`)
      
      if (isFeatureEnabled('debugMode')) {
        const speed = Math.sqrt(currentCar.vel.x * currentCar.vel.x + currentCar.vel.y * currentCar.vel.y)
        drawHudLine(`speed: ${speed.toFixed(1)}`)
      }
    }
    
    // Leaderboard
    const leaderboard = getLeaderboard(multiCarState)
    if (leaderboard.length > 1) {
      drawHudLine('') // Empty line
      drawHudLine('🏁 Leaderboard:')
      
      leaderboard.slice(0, 4).forEach(({ car, player, position }) => { // Show top 4
        const status = car.finished ? 
          `🏆 ${(car.finishTime! / 1000).toFixed(1)}s` :
          car.crashed ? '💥 Crashed' : `Lap ${car.currentLap}/${multiCarState.targetLaps}`
        
        drawHudLine(`${position}. ${player.name}: ${status}`, player.color)
      })
    }
    
    // Game status
    if (multiCarState.gameFinished) {
      drawHudLine('') // Empty line
      const winner = leaderboard[0]
      if (winner && winner.car.finished) {
        drawHudLine('🏁 RACE COMPLETE! 🏁', '#0f0')
        drawHudLine(`🥇 Winner: ${winner.player.name} (${(winner.car.finishTime! / 1000).toFixed(1)}s)`, winner.player.color)
      } else {
        drawHudLine('🏁 Race ended - All players crashed', '#f66')
      }
      drawHudLine('Press R to start a new race')
    }
    
    // Feature-flagged performance metrics
    if (isFeatureEnabled('performanceMetrics')) {
      // End render tracking
      performanceTracker.endRender()
      
      // Display comprehensive performance metrics
      const performanceLines = performanceTracker.getSummary()
      for (const line of performanceLines) {
        if (line.includes('⚠️')) {
          drawHudLine(line, '#f66')
        } else {
          drawHudLine(line)
        }
      }
    }
    
    // Feature-flagged development help
    if (isFeatureEnabled('debugMode') && multiCarState.showHelp) {
      ctx.fillStyle = '#888'
      ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
      const helpY = H - 140
      
      ctx.fillText('🚩 Multi-car mode enabled', 12, helpY)
      ctx.fillText('Features can be toggled in src/features.ts', 12, helpY + 15)
      
      if (isFeatureEnabled('improvedControls')) {
        ctx.fillText('⌨️  Keyboard controls: WASD/arrows, Q/E/Z/X (diagonals), Space/Enter (coast)', 12, helpY + 30)
        ctx.fillText('🔄 Players take turns automatically after each move', 12, helpY + 45)
        if (canUndo(multiCarState)) {
          ctx.fillText('↶  Undo: U or Ctrl+Z', 12, helpY + 60)
        }
      }
      
      if (isFeatureEnabled('soundEffects')) {
        ctx.fillText('🔊 Audio controls: M (mute), +/- (volume)', 12, helpY + 75)
      }
      
      ctx.fillText(`👥 Players: ${multiCarState.players.length}`, 12, helpY + 90)
    }
  }
}

function drawDirectionalArrows(ctx: CanvasRenderingContext2D, state: GameState, g: number) {
  ctx.save()
  ctx.fillStyle = '#888'
  ctx.strokeStyle = '#bbb'
  ctx.lineWidth = 2
  
  // Arrow positions around the track showing counter-clockwise direction
  const arrows = [
    // Bottom side (going left to right)
    { pos: { x: 25, y: 30 }, angle: 0 }, // →
    
    // Right side (going bottom to top)
    { pos: { x: 45, y: 17.5 }, angle: -Math.PI / 2 }, // ↑
    
    // Top side (going right to left)
    { pos: { x: 25, y: 5 }, angle: Math.PI }, // ←
    
    // Left side near start/finish (going top to bottom)
    { pos: { x: 7, y: 12 }, angle: Math.PI / 2 }, // ↓
  ]
  
  for (const arrow of arrows) {
    drawArrow(ctx, arrow.pos.x * g, arrow.pos.y * g, arrow.angle, 10, g)
  }
  
  ctx.restore()
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
    const p = poly[i]!
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
    player: state.players[index]!,
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

