import { applyMove, createDefaultGame, draw, screenToGrid } from './game'
import { clamp } from './geometry'
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
  if (e.key === 'r' || e.key === 'R') { state = createDefaultGame(); syncToggles(); render() }
  if (e.key === 'g' || e.key === 'G') { gridToggle.checked = !gridToggle.checked; gridToggle.dispatchEvent(new Event('change')) }
  if (e.key === 'c' || e.key === 'C') { candToggle.checked = !candToggle.checked; candToggle.dispatchEvent(new Event('change')) }
  if (e.key === 'h' || e.key === 'H') { helpToggle.checked = !helpToggle.checked; helpToggle.dispatchEvent(new Event('change')) }
})

function syncToggles() {
  gridToggle.checked = state.showGrid
  candToggle.checked = state.showCandidates
  helpToggle.checked = state.showHelp
}

