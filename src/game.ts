import { add, clamp, Segment, segmentInsidePolygon, segmentsIntersect, Vec } from './geometry'
import { isFeatureEnabled } from './features'

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

  const start: Segment = { a: { x: 12, y: 10 }, b: { x: 12, y: 25 } }

  const startCell = { x: 9, y: 18 }

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

export function applyMove(state: GameState, acc: Vec): GameState {
  if (state.crashed || state.finished) return state
  const vel = { x: state.vel.x + acc.x, y: state.vel.y + acc.y }
  const nextPos = { x: state.pos.x + vel.x, y: state.pos.y + vel.y }

  const legal = pathLegal(state.pos, nextPos, state)
  let crashed: boolean = state.crashed
  let finished: boolean = state.finished

  // Finish detection: segment crosses start line from outer->inner side
  const moveSeg: Segment = { a: state.pos, b: nextPos }
  const crossedStart = segmentsIntersect(moveSeg, state.start)
  if (!legal) {
    crashed = true
  } else if (crossedStart) {
    // Determine direction: crossing from outside to inside relative to inner polygon near the line
    finished = true
  }

  const trail = [...state.trail, nextPos]

  return { ...state, pos: nextPos, vel, trail, crashed, finished }
}

export function draw(ctx: CanvasRenderingContext2D, state: GameState, canvas: HTMLCanvasElement) {
  const g = state.grid
  const W = canvas.width, H = canvas.height
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

  // Start line
  ctx.strokeStyle = '#0ff'
  ctx.lineWidth = 3
  line(ctx, state.start.a.x * g, state.start.a.y * g, state.start.b.x * g, state.start.b.y * g)

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

  // Candidates
  if (state.showCandidates && !state.crashed && !state.finished) {
    const opts = stepOptions(state)
    for (const { nextPos } of opts) {
      const legal = pathLegal(state.pos, nextPos, state)
      drawNode(ctx, nextPos, g, legal ? '#0f0' : '#f33')
    }
  }

  // Car
  drawNode(ctx, state.pos, g, state.crashed ? '#f66' : '#ff0', 6)

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
  
  // Feature-flagged debug information
  if (isFeatureEnabled('debugMode')) {
    drawHudLine(`trail: ${state.trail.length} points`)
    const speed = Math.sqrt(state.vel.x * state.vel.x + state.vel.y * state.vel.y)
    drawHudLine(`speed: ${speed.toFixed(1)}`)
  }
  
  // Feature-flagged performance metrics
  if (isFeatureEnabled('performanceMetrics')) {
    const now = performance.now()
    const fps = Math.round(1000 / (now - (window as any).lastFrameTime || 16))
    drawHudLine(`FPS: ${fps}`)
    ;(window as any).lastFrameTime = now
  }
  
  if (state.crashed) drawHudLine('CRASHED — press R to reset')
  if (state.finished) drawHudLine('FINISHED! — press R to race again')
  
  // Feature-flagged development help
  if (isFeatureEnabled('debugMode') && state.showHelp) {
    ctx.fillStyle = '#888'
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
    const helpY = H - 90
    ctx.fillText('🚩 Debug mode enabled', 12, helpY)
    ctx.fillText('Features can be toggled in src/features.ts', 12, helpY + 15)
    
    if (isFeatureEnabled('improvedControls')) {
      ctx.fillText('⌨️  Keyboard controls: WASD/arrows, Q/E/Z/X (diagonals), Space/Enter (coast)', 12, helpY + 30)
    }
  }
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

