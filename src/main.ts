import { applyMove, createDefaultGame, draw, screenToGrid, stepOptions, undoMove, canUndo, getCurrentPlayer, getCurrentCar, isMultiCarGame, createMultiCarGameFromConfig } from './game'
import { clamp, Vec } from './geometry'
import { logEnabledFeatures, isFeatureEnabled, toggleFeature } from './features'
import { performanceTracker } from './performance'
import { animationManager, AnimationUtils } from './animations'
import { initializeTrackEditor, isEditorActive } from './track-editor-ui'
import { setupEditorCanvas, drawEditorOverlay } from './track-editor-canvas'
import { chooseAIMove } from './ai'

const canvas = document.getElementById('canvas') as HTMLCanvasElement
const ctx = canvas.getContext('2d')!
const statusEl = document.getElementById('status')!

// Configuration modal elements
const configBtn = document.getElementById('configBtn') as HTMLButtonElement
const configModal = document.getElementById('configModal') as HTMLDivElement
const closeConfigBtn = document.getElementById('closeConfigBtn') as HTMLButtonElement

// New Game modal elements
const newGameModal = document.getElementById('newGameModal') as HTMLDivElement
const closeNewGameBtn = document.getElementById('closeNewGameBtn') as HTMLButtonElement
const startNewGameBtn = document.getElementById('startNewGameBtn') as HTMLButtonElement
const playerCountSelect = document.getElementById('playerCount') as HTMLSelectElement
const lapCountSelect = document.getElementById('lapCount') as HTMLSelectElement
const playerRows = document.getElementById('playerRows') as HTMLDivElement

// Control elements
const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement
const gridToggle = document.getElementById('gridToggle') as HTMLInputElement
const candToggle = document.getElementById('candToggle') as HTMLInputElement
const debugToggle = document.getElementById('debugToggle') as HTMLInputElement


let state = createDefaultGame()

// AI automation variables
let aiTurnTimeout: number | null = null
const AI_MOVE_DELAY = 800 // milliseconds before AI makes move

// Initialize feature flags and log enabled features
logEnabledFeatures()

// Initialize track editor UI system
initializeTrackEditor()

// Initialize track editor canvas handlers
setupEditorCanvas(canvas)


// Check if it's an AI player's turn and schedule move
function checkAITurn() {
  if (!isFeatureEnabled('aiPlayers')) return
  
  // Clear any existing AI timeout
  if (aiTurnTimeout !== null) {
    clearTimeout(aiTurnTimeout)
    aiTurnTimeout = null
  }
  
  // Only handle AI turns in multi-car mode
  if (!isMultiCarGame(state)) return
  
  const currentPlayer = getCurrentPlayer(state)
  const currentCar = getCurrentCar(state)
  
  // Check if current player is AI and can move
  if (currentPlayer?.isAI && currentCar && !currentCar.crashed && !currentCar.finished && !state.gameFinished) {
    aiTurnTimeout = setTimeout(() => {
      const aiMove = chooseAIMove(state)
      if (aiMove) {
        const newState = applyMove(state, aiMove)
        if (newState !== state) {
          state = newState
          render()
          // Check for next AI turn (in case multiple AI players in sequence)
          checkAITurn()
        }
      }
    }, AI_MOVE_DELAY) as unknown as number
  }
}

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
  
  // Draw track editor overlay if active
  if (isFeatureEnabled('trackEditor') && isEditorActive()) {
    drawEditorOverlay(ctx)
  }
  
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
      const aiIndicator = currentPlayer?.isAI ? ' (AI)' : ''
      statusEl.textContent = `Multi-car Racing - ${currentPlayer?.name || 'Unknown'}'s Turn${aiIndicator}`
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

// Initialize toggle states
syncToggles()
render()

// Start AI turn checking
if (isFeatureEnabled('aiPlayers')) {
  checkAITurn()
}

// Show New Game modal on initial load
setTimeout(() => {
  openNewGameModal()
}, 100)

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
      // Check if next player is AI
      if (isFeatureEnabled('aiPlayers')) {
        checkAITurn()
      }
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
  openNewGameModal()
})

function openNewGameModal() {
  // Initialize visibility based on count
  const count = parseInt(playerCountSelect.value, 10)
  updatePlayerRowVisibility(count)
  
  newGameModal.classList.add('show')
  newGameModal.setAttribute('aria-hidden', 'false')
  setTimeout(() => startNewGameBtn.focus(), 50)
}

function closeNewGameModal() {
  newGameModal.classList.remove('show')
  newGameModal.setAttribute('aria-hidden', 'true')
}

function updatePlayerRowVisibility(count: number) {
  const rows = playerRows.querySelectorAll('.player-row')
  rows.forEach((row, idx) => {
    (row as HTMLElement).style.display = idx < count ? 'block' : 'none'
  })
}

playerCountSelect?.addEventListener('change', () => {
  const count = parseInt(playerCountSelect.value, 10)
  updatePlayerRowVisibility(count)
})

// Add AI toggle functionality for each player row
document.addEventListener('DOMContentLoaded', () => {
  const playerAiToggleInputs = document.querySelectorAll('.player-ai')
  playerAiToggleInputs.forEach(toggle => {
    toggle.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement
      const playerRow = target.closest('.player-row')
      const aiSettings = playerRow?.querySelector('.player-ai-settings') as HTMLElement
      if (aiSettings) {
        aiSettings.style.display = target.checked ? 'block' : 'none'
      }
    })
  })
})

closeNewGameBtn?.addEventListener('click', closeNewGameModal)

startNewGameBtn?.addEventListener('click', () => {
  // Build players config from form
  const count = parseInt(playerCountSelect.value, 10)
  const lapCount = parseInt(lapCountSelect.value, 10)
  const rows = Array.from(playerRows.querySelectorAll('.player-row')).slice(0, count)
  const players = rows.map((row, idx) => {
    const nameInput = row.querySelector('.player-name') as HTMLInputElement
    const aiCheckbox = row.querySelector('.player-ai') as HTMLInputElement
    const diffSelect = row.querySelector('.player-ai-diff') as HTMLSelectElement
    const isAI = aiCheckbox.checked
    return {
      name: (nameInput?.value || `Player ${idx + 1}`).trim(),
      isLocal: !isAI,
      isAI,
      aiDifficulty: isAI ? (diffSelect?.value as any || 'medium') : undefined
    }
  })

  // Clear AI timeout
  if (aiTurnTimeout !== null) {
    clearTimeout(aiTurnTimeout)
    aiTurnTimeout = null
  }

  // Create game from config (multi-car), fallback to default if single player and multi disabled
  if (isFeatureEnabled('multiCarSupport') && players.length > 1) {
    state = createMultiCarGameFromConfig({ players, targetLaps: lapCount })
  } else if (players.length === 1) {
    state = createDefaultGame()
    // For single player legacy mode, manually set target laps
    if ('targetLaps' in state) {
      (state as any).targetLaps = lapCount
    }
  } else {
    state = createMultiCarGameFromConfig({ players, targetLaps: lapCount })
  }

  syncToggles()
  render()
  closeNewGameModal()
  if (isFeatureEnabled('aiPlayers')) checkAITurn()
})

gridToggle.addEventListener('change', () => { state = { ...state, showGrid: gridToggle.checked }; render() })
candToggle.addEventListener('change', () => { state = { ...state, showCandidates: candToggle.checked }; render() })
debugToggle.addEventListener('change', () => { 
  toggleFeature('debugMode'); 
  render(); 
})

// Configuration modal functionality
function openConfigModal() {
  configModal.classList.add('show')
  configModal.setAttribute('aria-hidden', 'false')
  // Focus first interactive element in modal
  setTimeout(() => gridToggle.focus(), 100)
}

function closeConfigModal() {
  configModal.classList.remove('show')
  configModal.setAttribute('aria-hidden', 'true')
  // Return focus to hamburger button
  configBtn.focus()
}

// Modal event listeners
configBtn.addEventListener('click', openConfigModal)
closeConfigBtn.addEventListener('click', closeConfigModal)

// Close modal when clicking outside content
configModal.addEventListener('click', (e) => {
  if (e.target === configModal) {
    closeConfigModal()
  }
})

newGameModal.addEventListener('click', (e) => {
  if (e.target === newGameModal) {
    closeNewGameModal()
  }
})

window.addEventListener('keydown', (e) => {
  // Close configuration modal with Escape key
  if (e.key === 'Escape' && configModal.classList.contains('show')) {
    closeConfigModal()
    e.preventDefault()
    return
  }
  
  // Close new game modal with Escape key
  if (e.key === 'Escape' && newGameModal.classList.contains('show')) {
    closeNewGameModal()
    e.preventDefault()
    return
  }
  
  // Existing toggle controls
  if (e.key === 'r' || e.key === 'R') {
    openNewGameModal()
  }
  if (e.key === 'g' || e.key === 'G') { gridToggle.checked = !gridToggle.checked; gridToggle.dispatchEvent(new Event('change')) }
  if (e.key === 'c' || e.key === 'C') { candToggle.checked = !candToggle.checked; candToggle.dispatchEvent(new Event('change')) }
  if (e.key === 'd' || e.key === 'D') { debugToggle.checked = !debugToggle.checked; debugToggle.dispatchEvent(new Event('change')) }
  
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
            // Only handle diagonal movement if track editor is not active
            if (!isEditorActive()) {
              acc = { x: 1, y: -1 }
            }
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
            // Check if next player is AI after keyboard move
            if (isFeatureEnabled('aiPlayers')) {
              checkAITurn()
            }
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
            // Only handle diagonal movement if track editor is not active
            if (!isEditorActive()) {
              acc = { x: 1, y: -1 }
            }
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
  debugToggle.checked = isFeatureEnabled('debugMode')
}


