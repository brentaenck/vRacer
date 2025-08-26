import { add, clamp, Segment, segmentInsidePolygon, segmentsIntersect, Vec } from './geometry'
import { isFeatureEnabled } from './features'
import { performanceTracker } from './performance'
import { animationManager, AnimationUtils } from './animations'

type GameState = {
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
  // Lap tracking system
  currentLap: number
  targetLaps: number
  lastCrossDirection?: 'forward' | 'backward'
  // Improved controls state
  hoveredPosition?: Vec
  // Undo/redo system
  previousStates?: GameState[]
  // Animation state
  animatedPos?: Vec
  isAnimating?: boolean
}

export function createDefaultGame(): GameState {
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

export function stepOptions(state: GameState): { acc: Vec; nextPos: Vec }[] {
  const opts: { acc: Vec; nextPos: Vec }[] = []
  for (let ax = -1; ax <= 1; ax++) {
    for (let ay = -1; ay <= 1; ay++) {
      const acc = { x: ax, y: ay }
      const vel = { x: state.vel.x + ax, y: state.vel.y + ay }
      const nextPos = { x: state.pos.x + vel.x, y: state.pos.y + vel.y }
      opts.push({ acc, nextPos })
    }
  }
  return opts
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
  if (state.crashed || state.finished) return state
  const vel = { x: state.vel.x + acc.x, y: state.vel.y + acc.y }
  const nextPos = { x: state.pos.x + vel.x, y: state.pos.y + vel.y }

  const legal = pathLegal(state.pos, nextPos, state)
  let crashed: boolean = state.crashed
  let finished: boolean = state.finished
  let currentLap = state.currentLap
  let lastCrossDirection = state.lastCrossDirection

  // Lap detection: check if car crosses start line
  const moveSeg: Segment = { a: state.pos, b: nextPos }
  const crossedStart = segmentsIntersect(moveSeg, state.start)
  
  if (!legal) {
    crashed = true
    // Create explosion particles when crashing (if animations enabled)
    if (isFeatureEnabled('animations')) {
      AnimationUtils.createExplosion(nextPos, '#f66', 8)
    }
  } else if (crossedStart) {
    // Determine crossing direction based on car position relative to start line
    // Start line is horizontal at y=18, so check if moving top-to-bottom (forward) or bottom-to-top (backward)
    const crossDirection = determineCrossDirection(state.pos, nextPos, state.start)
    
    // Only count forward crossings as valid lap completions
    if (crossDirection === 'forward') {
      currentLap += 1
      lastCrossDirection = 'forward'
      
      // Check if race is complete
      if (currentLap >= state.targetLaps) {
        finished = true
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
      // Could implement penalty for wrong direction if desired
    }
  }

  const trail = [...state.trail, nextPos]
  
  // Save previous state for undo (when improvedControls is enabled)
  let previousStates = state.previousStates || []
  if (isFeatureEnabled('improvedControls')) {
    // Save current state before applying move (without circular reference)
    const stateToSave = {
      ...state,
      hoveredPosition: undefined,
      previousStates: undefined
    }
    previousStates = [...previousStates, stateToSave].slice(-10) // Keep last 10 moves
  }

  return { ...state, pos: nextPos, vel, trail, crashed, finished, currentLap, lastCrossDirection, previousStates }
}

// Undo function for improved controls
export function undoMove(state: GameState): GameState {
  if (!isFeatureEnabled('improvedControls') || !state.previousStates || state.previousStates.length === 0) {
    return state
  }
  
  const previousState = state.previousStates[state.previousStates.length - 1]!
  const newPreviousStates = state.previousStates.slice(0, -1)
  
  return {
    ...previousState,
    previousStates: newPreviousStates,
    hoveredPosition: state.hoveredPosition // Keep current hover state
  }
}

// Check if undo is available
export function canUndo(state: GameState): boolean {
  return isFeatureEnabled('improvedControls') && 
         state.previousStates !== undefined && 
         state.previousStates.length > 0
}

export function draw(ctx: CanvasRenderingContext2D, state: GameState, canvas: HTMLCanvasElement) {
  const g = state.grid
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
  if (state.showGrid) {
    ctx.strokeStyle = '#222'
    ctx.lineWidth = 1
    for (let x = 0; x <= W; x += g) { line(ctx, x, 0, x, H) }
    for (let y = 0; y <= H; y += g) { line(ctx, 0, y, W, y) }
  }

  // Track polygons
  drawPoly(ctx, state.outer, g, '#555', '#111')
  drawPoly(ctx, state.inner, g, '#555', '#0b0b0b', true)

  // Start/Finish line - checkered flag pattern
  drawCheckeredStartLine(ctx, state.start, g)

  // Directional arrows to show racing direction
  drawDirectionalArrows(ctx, state, g)

  // Trail
  ctx.strokeStyle = '#9cf'
  ctx.lineWidth = 2
  ctx.beginPath()
  const t0 = state.trail[0]!
  ctx.moveTo(t0.x * g, t0.y * g)
  for (let i = 1; i < state.trail.length; i++) {
    const p = state.trail[i]!
    ctx.lineTo(p.x * g, p.y * g)
  }
  ctx.stroke()

  // Candidates with improved controls visual feedback
  if (state.showCandidates && !state.crashed && !state.finished) {
    const opts = stepOptions(state)
    for (const { nextPos } of opts) {
      const legal = pathLegal(state.pos, nextPos, state)
      const isHovered = isFeatureEnabled('improvedControls') && 
                       state.hoveredPosition && 
                       nextPos.x === state.hoveredPosition.x && 
                       nextPos.y === state.hoveredPosition.y
      
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
          line(ctx, state.pos.x * g, state.pos.y * g, nextPos.x * g, nextPos.y * g)
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
  drawNode(ctx, state.pos, g, state.crashed ? '#f66' : '#ff0', 6)
  
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
  
  drawHudLine(`pos=(${state.pos.x},${state.pos.y}) vel=(${state.vel.x},${state.vel.y})`)
  
  // Lap counter - always visible
  drawHudLine(`lap: ${state.currentLap}/${state.targetLaps}`)
  
  // Feature-flagged debug information
  if (isFeatureEnabled('debugMode')) {
    drawHudLine(`trail: ${state.trail.length} points`)
    const speed = Math.sqrt(state.vel.x * state.vel.x + state.vel.y * state.vel.y)
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
  
  if (state.crashed) drawHudLine('CRASHED — press R to reset')
  if (state.finished) {
    // Show victory message with race details
    ctx.fillStyle = '#0f0' // Green for victory
    drawHudLine('🏁 RACE COMPLETE! 🏁')
    ctx.fillStyle = '#ddd' // Reset color
    drawHudLine(`Completed ${state.currentLap}/${state.targetLaps} laps — press R to race again`)
  }
  
  // Feature-flagged development help
  if (isFeatureEnabled('debugMode') && state.showHelp) {
    ctx.fillStyle = '#888'
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
    const helpY = H - 90
    ctx.fillText('🚩 Debug mode enabled', 12, helpY)
    ctx.fillText('Features can be toggled in src/features.ts', 12, helpY + 15)
    
    if (isFeatureEnabled('improvedControls')) {
      ctx.fillText('⌨️  Keyboard controls: WASD/arrows, Q/E/Z/X (diagonals), Space/Enter (coast)', 12, helpY + 30)
      if (canUndo(state)) {
        ctx.fillText('↶  Undo: U or Ctrl+Z', 12, helpY + 45)
      }
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

export function screenToGrid(canvas: HTMLCanvasElement, g: number, x: number, y: number): Vec {
  const rect = canvas.getBoundingClientRect()
  const gx = (x - rect.left) / (rect.width) * canvas.width / g
  const gy = (y - rect.top) / (rect.height) * canvas.height / g
  return { x: gx, y: gy }
}

export type { GameState }

