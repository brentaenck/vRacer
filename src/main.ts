import { applyMove, createDefaultGame, draw, screenToGrid, stepOptions, undoMove, canUndo } from './game'
import { clamp, Vec } from './geometry'
import { logEnabledFeatures, isFeatureEnabled } from './features'

const canvas = document.getElementById('canvas') as HTMLCanvasElement
const ctx = canvas.getContext('2d')!
const statusEl = document.getElementById('status')!
const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement
const gridToggle = document.getElementById('gridToggle') as HTMLInputElement
const candToggle = document.getElementById('candToggle') as HTMLInputElement
const helpToggle = document.getElementById('helpToggle') as HTMLInputElement

let state = createDefaultGame()

// Initialize feature flags and log enabled features
logEnabledFeatures()

function render() {
  draw(ctx, state, canvas)
  
  // Enhanced status display when debugMode is enabled
  if (isFeatureEnabled('debugMode')) {
    const debugInfo = { 
      pos: state.pos, 
      vel: state.vel, 
      crashed: state.crashed, 
      finished: state.finished,
      trail_length: state.trail.length
    }
    statusEl.textContent = JSON.stringify(debugInfo, null, 2)
  } else {
    statusEl.textContent = JSON.stringify({ pos: state.pos, vel: state.vel, crashed: state.crashed, finished: state.finished }, null, 2)
  }
}

render()

// Mouse hover for improved controls
if (isFeatureEnabled('improvedControls')) {
  canvas.addEventListener('mousemove', (e) => {
    if (state.crashed || state.finished) return
    const g = state.grid
    const p = screenToGrid(canvas, g, e.clientX, e.clientY)
    const gx = Math.round(p.x)
    const gy = Math.round(p.y)
    
    // Find if mouse is near a valid candidate position
    const opts = stepOptions(state)
    let hoveredPos: Vec | undefined = undefined
    
    for (const { nextPos } of opts) {
      const dx = Math.abs(nextPos.x - gx)
      const dy = Math.abs(nextPos.y - gy)
      if (dx <= 0.5 && dy <= 0.5) {
        hoveredPos = nextPos
        break
      }
    }
    
    if (hoveredPos?.x !== state.hoveredPosition?.x || hoveredPos?.y !== state.hoveredPosition?.y) {
      state = { ...state, hoveredPosition: hoveredPos }
      render()
    }
  })
  
  canvas.addEventListener('mouseleave', () => {
    if (state.hoveredPosition) {
      state = { ...state, hoveredPosition: undefined }
      render()
    }
  })
}

canvas.addEventListener('click', (e) => {
  if (state.crashed || state.finished) return
  const g = state.grid
  const p = screenToGrid(canvas, g, e.clientX, e.clientY)
  // Choose nearest integer grid point around candidate positions; allow some radius
  const gx = Math.round(p.x)
  const gy = Math.round(p.y)
  const ax = clamp(gx - state.pos.x - state.vel.x, -1, 1)
  const ay = clamp(gy - state.pos.y - state.vel.y, -1, 1)
  const newState = applyMove(state, { x: ax, y: ay })
  if (newState !== state) {
    state = newState
    render()
  }
})

resetBtn.addEventListener('click', () => { state = createDefaultGame(); syncToggles(); render() })

gridToggle.addEventListener('change', () => { state = { ...state, showGrid: gridToggle.checked }; render() })
candToggle.addEventListener('change', () => { state = { ...state, showCandidates: candToggle.checked }; render() })
helpToggle.addEventListener('change', () => { state = { ...state, showHelp: helpToggle.checked }; render() })

window.addEventListener('keydown', (e) => {
  // Existing toggle controls
  if (e.key === 'r' || e.key === 'R') { state = createDefaultGame(); syncToggles(); render() }
  if (e.key === 'g' || e.key === 'G') { gridToggle.checked = !gridToggle.checked; gridToggle.dispatchEvent(new Event('change')) }
  if (e.key === 'c' || e.key === 'C') { candToggle.checked = !candToggle.checked; candToggle.dispatchEvent(new Event('change')) }
  if (e.key === 'h' || e.key === 'H') { helpToggle.checked = !helpToggle.checked; helpToggle.dispatchEvent(new Event('change')) }
  
  // Improved controls: Undo functionality
  if ((e.key === 'u' || e.key === 'U' || (e.ctrlKey && e.key === 'z')) && canUndo(state)) {
    state = undoMove(state)
    render()
    e.preventDefault()
    return
  }
  
  // Improved controls: Keyboard movement
  if (isFeatureEnabled('improvedControls') && !state.crashed && !state.finished) {
    let acc: { x: number, y: number } | null = null
    
    // Arrow keys and WASD for acceleration selection
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        acc = { x: 0, y: -1 }
        break
      case 'ArrowDown':
      case 's':
      case 'S':
        acc = { x: 0, y: 1 }
        break
      case 'ArrowLeft':
      case 'a':
      case 'A':
        acc = { x: -1, y: 0 }
        break
      case 'ArrowRight':
      case 'd':
      case 'D':
        acc = { x: 1, y: 0 }
        break
      // Diagonal movements
      case 'q':
      case 'Q':
        acc = { x: -1, y: -1 }
        break
      case 'e':
      case 'E':
        acc = { x: 1, y: -1 }
        break
      case 'z':
      case 'Z':
        acc = { x: -1, y: 1 }
        break
      case 'x':
      case 'X':
        acc = { x: 1, y: 1 }
        break
      case ' ': // Space for no acceleration (coast)
      case 'Enter':
        acc = { x: 0, y: 0 }
        e.preventDefault() // Prevent default space/enter behavior
        break
    }
    
    if (acc !== null) {
      const newState = applyMove(state, acc)
      if (newState !== state) {
        state = newState
        render()
      }
    }
  }
})

function syncToggles() {
  gridToggle.checked = state.showGrid
  candToggle.checked = state.showCandidates
  helpToggle.checked = state.showHelp
}

