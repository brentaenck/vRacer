import { applyMove, createDefaultGame, draw, screenToGrid, stepOptions, undoMove, canUndo } from './game'
import { clamp, Vec } from './geometry'
import { logEnabledFeatures, isFeatureEnabled } from './features'
import { performanceTracker } from './performance'
import { animationManager, AnimationUtils } from './animations'

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
  // Track frame performance if enabled
  if (isFeatureEnabled('performanceMetrics')) {
    performanceTracker.startFrame()
  }
  
  // Update animations if enabled
  if (isFeatureEnabled('animations')) {
    animationManager.update()
  }
  
  draw(ctx, state, canvas)
  
  // End frame tracking
  if (isFeatureEnabled('performanceMetrics')) {
    performanceTracker.endFrame()
  }
  
  // Enhanced status display when debugMode is enabled
  if (isFeatureEnabled('debugMode')) {
    if (isFeatureEnabled('multiCarSupport') && 'cars' in state) {
      // Multi-car debug info
      const multiCarState = state as any
      const currentCar = multiCarState.cars[multiCarState.currentPlayerIndex]
      const currentPlayer = multiCarState.players[multiCarState.currentPlayerIndex]
      const debugInfo = {
        currentPlayer: currentPlayer?.name,
        playerIndex: multiCarState.currentPlayerIndex,
        currentCar: currentCar ? {
          pos: currentCar.pos,
          vel: currentCar.vel,
          crashed: currentCar.crashed,
          finished: currentCar.finished,
          trail_length: currentCar.trail.length
        } : null,
        totalCars: multiCarState.cars.length,
        gameFinished: multiCarState.gameFinished
      }
      statusEl.textContent = JSON.stringify(debugInfo, null, 2)
    } else {
      const legacyState = state as any
      const debugInfo = { 
        pos: legacyState.pos, 
        vel: legacyState.vel, 
        crashed: legacyState.crashed, 
        finished: legacyState.finished,
        trail_length: legacyState.trail.length
      }
      statusEl.textContent = JSON.stringify(debugInfo, null, 2)
    }
  } else {
    if (isFeatureEnabled('multiCarSupport') && 'cars' in state) {
      // Multi-car status
      const multiCarState = state as any
      const currentPlayer = multiCarState.players[multiCarState.currentPlayerIndex]
      statusEl.textContent = `Multi-car Racing - ${currentPlayer?.name || 'Unknown'}'s Turn`
    } else {
      const legacyState = state as any
      statusEl.textContent = JSON.stringify({ pos: legacyState.pos, vel: legacyState.vel, crashed: legacyState.crashed, finished: legacyState.finished }, null, 2)
    }
  }
}

// Animation loop for smooth rendering
function animationLoop() {
  render()
  requestAnimationFrame(animationLoop)
}

// Start animation loop if animations are enabled
if (isFeatureEnabled('animations')) {
  animationLoop()
}

render()

// Mouse hover for improved controls
if (isFeatureEnabled('improvedControls')) {
  canvas.addEventListener('mousemove', (e) => {
    if (isFeatureEnabled('multiCarSupport') && 'cars' in state) {
      // Multi-car mode handling
      const multiCarState = state as any
      const currentCar = multiCarState.cars[multiCarState.currentPlayerIndex]
      if (!currentCar || currentCar.crashed || currentCar.finished || multiCarState.gameFinished) return
      
      const g = multiCarState.grid
      const p = screenToGrid(canvas, g, e.clientX, e.clientY)
      const gx = Math.round(p.x)
      const gy = Math.round(p.y)
      
      // Find if mouse is near a valid candidate position
      const opts = stepOptions(multiCarState)
      let hoveredPos: Vec | undefined = undefined
      
      for (const { nextPos } of opts) {
        const dx = Math.abs(nextPos.x - gx)
        const dy = Math.abs(nextPos.y - gy)
        if (dx <= 0.5 && dy <= 0.5) {
          hoveredPos = nextPos
          break
        }
      }
      
      if (hoveredPos?.x !== multiCarState.hoveredPosition?.x || hoveredPos?.y !== multiCarState.hoveredPosition?.y) {
        state = { ...multiCarState, hoveredPosition: hoveredPos }
        render()
      }
    } else {
      // Legacy mode handling
      const legacyState = state as any
      if (legacyState.crashed || legacyState.finished) return
      const g = legacyState.grid
      const p = screenToGrid(canvas, g, e.clientX, e.clientY)
      const gx = Math.round(p.x)
      const gy = Math.round(p.y)
      
      // Find if mouse is near a valid candidate position
      const opts = stepOptions(legacyState)
      let hoveredPos: Vec | undefined = undefined
      
      for (const { nextPos } of opts) {
        const dx = Math.abs(nextPos.x - gx)
        const dy = Math.abs(nextPos.y - gy)
        if (dx <= 0.5 && dy <= 0.5) {
          hoveredPos = nextPos
          break
        }
      }
      
      if (hoveredPos?.x !== legacyState.hoveredPosition?.x || hoveredPos?.y !== legacyState.hoveredPosition?.y) {
        state = { ...legacyState, hoveredPosition: hoveredPos }
        render()
      }
    }
  })
  
  canvas.addEventListener('mouseleave', () => {
    if (isFeatureEnabled('multiCarSupport') && 'cars' in state) {
      // Multi-car mode
      const multiCarState = state as any
      if (multiCarState.hoveredPosition) {
        state = { ...multiCarState, hoveredPosition: undefined }
        render()
      }
    } else {
      // Legacy mode
      const legacyState = state as any
      if (legacyState.hoveredPosition) {
        state = { ...legacyState, hoveredPosition: undefined }
        render()
      }
    }
  })
}

canvas.addEventListener('click', (e) => {
  if (isFeatureEnabled('multiCarSupport') && 'cars' in state) {
    // Multi-car mode handling
    const multiCarState = state as any
    const currentCar = multiCarState.cars[multiCarState.currentPlayerIndex]
    if (!currentCar || currentCar.crashed || currentCar.finished || multiCarState.gameFinished) return
    
    const g = multiCarState.grid
    const p = screenToGrid(canvas, g, e.clientX, e.clientY)
    const gx = Math.round(p.x)
    const gy = Math.round(p.y)
    const ax = clamp(gx - currentCar.pos.x - currentCar.vel.x, -1, 1)
    const ay = clamp(gy - currentCar.pos.y - currentCar.vel.y, -1, 1)
    const newState = applyMove(multiCarState, { x: ax, y: ay })
    if (newState !== multiCarState) {
      state = newState
      render()
    }
  } else {
    // Legacy mode handling
    const legacyState = state as any
    if (legacyState.crashed || legacyState.finished) return
    const g = legacyState.grid
    const p = screenToGrid(canvas, g, e.clientX, e.clientY)
    // Choose nearest integer grid point around candidate positions; allow some radius
    const gx = Math.round(p.x)
    const gy = Math.round(p.y)
    const ax = clamp(gx - legacyState.pos.x - legacyState.vel.x, -1, 1)
    const ay = clamp(gy - legacyState.pos.y - legacyState.vel.y, -1, 1)
    const newState = applyMove(legacyState, { x: ax, y: ay })
    if (newState !== legacyState) {
      state = newState
      render()
    }
  }
})

resetBtn.addEventListener('click', () => { 
  state = createDefaultGame(); 
  syncToggles(); 
  render() 
})

gridToggle.addEventListener('change', () => { state = { ...state, showGrid: gridToggle.checked }; render() })
candToggle.addEventListener('change', () => { state = { ...state, showCandidates: candToggle.checked }; render() })
helpToggle.addEventListener('change', () => { state = { ...state, showHelp: helpToggle.checked }; render() })

window.addEventListener('keydown', (e) => {
  // Existing toggle controls
  if (e.key === 'r' || e.key === 'R') { 
    state = createDefaultGame(); 
    syncToggles(); 
    render() 
  }
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
  if (isFeatureEnabled('improvedControls')) {
    if (isFeatureEnabled('multiCarSupport') && 'cars' in state) {
      // Multi-car mode handling
      const multiCarState = state as any
      const currentCar = multiCarState.cars[multiCarState.currentPlayerIndex]
      if (currentCar && !currentCar.crashed && !currentCar.finished && !multiCarState.gameFinished) {
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
          const newState = applyMove(multiCarState, acc)
          if (newState !== multiCarState) {
            state = newState
            render()
          }
        }
      }
    } else {
      // Legacy mode handling
      const legacyState = state as any
      if (!legacyState.crashed && !legacyState.finished) {
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
          const newState = applyMove(legacyState, acc)
          if (newState !== legacyState) {
            state = newState
            render()
          }
        }
      }
    }
  }
})

function syncToggles() {
  gridToggle.checked = state.showGrid
  candToggle.checked = state.showCandidates
  helpToggle.checked = state.showHelp
}


