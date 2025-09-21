import { applyMove, createDefaultGame, draw, screenToGrid, stepOptions, undoMove, canUndo, getCurrentPlayer, getCurrentCar, isMultiCarGame, createMultiCarGameFromConfig } from './game'
import { clamp, Vec } from './geometry'
import { logEnabledFeatures, isFeatureEnabled, toggleFeature } from './features'
import { performanceTracker, PerformanceBenchmark } from './performance'
import { animationManager, AnimationUtils } from './animations'
import { initializeStandaloneTrackEditor } from './track-editor-integration/standalone-integration'
import { initializeDropdownMenu } from './dropdown-menu'
import { chooseAIMove } from './ai'
import { trackLoader } from './track-loader'
import { lockBackground, unlockBackground } from './modal-utils'
import { getVersionString, getVersionInfo } from './version'

/**
 * Initialize version display throughout the app
 */
function initializeVersionDisplay() {
  const appVersionEl = document.getElementById('appVersion')
  const footerVersionEl = document.getElementById('footerVersion')
  
  const versionString = getVersionString()
  
  if (appVersionEl) {
    appVersionEl.textContent = versionString
  }
  
  if (footerVersionEl) {
    footerVersionEl.textContent = `vRacer ${versionString}`
  }
  
  // Log version info for debugging
  const versionInfo = getVersionInfo()
  console.log('🏁 vRacer Version Info:', versionInfo)
}

/**
 * Initialize dual styling system based on feature flag
 */
function initializeDualStyling() {
  const appElement = document.getElementById('app')
  if (!appElement) return

  if (isFeatureEnabled('dualStyling')) {
    appElement.classList.add('dual-style-enabled')
    console.log('🎨 Dual styling enabled: Modern UI with paper canvas')
  } else {
    appElement.classList.remove('dual-style-enabled')
    console.log('📜 Paper styling enabled: Full paper aesthetic')
  }
}

/**
 * Toggle dual styling mode (for runtime switching)
 */
function toggleDualStyling() {
  const appElement = document.getElementById('app')
  if (!appElement) return

  const isCurrentlyEnabled = appElement.classList.contains('dual-style-enabled')
  if (isCurrentlyEnabled) {
    appElement.classList.remove('dual-style-enabled')
    console.log('📜 Switched to full paper aesthetic')
  } else {
    appElement.classList.add('dual-style-enabled')
    console.log('🎨 Switched to dual styling mode')
  }
}

// Expose toggleDualStyling to global scope for console access
;(window as any).toggleDualStyling = toggleDualStyling

const canvas = document.getElementById('canvas') as HTMLCanvasElement
const ctx = canvas.getContext('2d')!
const statusEl = document.getElementById('status')!

// Configuration modal elements
const configModal = document.getElementById('configModal') as HTMLDivElement
const closeConfigBtn = document.getElementById('closeConfigBtn') as HTMLButtonElement

// New Game modal elements
const newGameModal = document.getElementById('newGameModal') as HTMLDivElement
const closeNewGameBtn = document.getElementById('closeNewGameBtn') as HTMLButtonElement
const startNewGameBtn = document.getElementById('startNewGameBtn') as HTMLButtonElement
const playerCountSelect = document.getElementById('playerCount') as HTMLSelectElement
const lapCountSelect = document.getElementById('lapCount') as HTMLSelectElement
const playerGrid = document.getElementById('playerGrid') as HTMLDivElement

// Enhanced New Game modal elements
const humanCount = document.getElementById('humanCount') as HTMLSpanElement
const aiCount = document.getElementById('aiCount') as HTMLSpanElement
const totalLaps = document.getElementById('totalLaps') as HTMLSpanElement
const raceStatus = document.getElementById('raceStatus') as HTMLSpanElement
const randomSetupBtn = document.getElementById('randomSetupBtn') as HTMLButtonElement

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

// Initialize version display
initializeVersionDisplay()

// Initialize dual styling system
initializeDualStyling()

// Initialize standalone track editor integration
initializeStandaloneTrackEditor()

// Initialize dropdown menu system
initializeDropdownMenu()


// Listen for track loading events
window.addEventListener('trackLoaded', (event: any) => {
  console.log('🏁 Track loaded event received:', event.detail);
  // Track has been loaded, but we need to manually start a new game to use it
  // For now, just show a message - user will press R to start new race
});


// Check if it's an AI player's turn and schedule move
function checkAITurn() {
  if (!isFeatureEnabled('aiPlayers')) return
  
  // Clear any existing AI timeout
  if (aiTurnTimeout !== null) {
    clearTimeout(aiTurnTimeout)
    aiTurnTimeout = null
  }
  
  // AI continues normally - no track editor pause needed
  
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
  // Initialize visibility and stats based on current selections
  updatePlayerCardVisibility()
  updateRacePreview()
  
  newGameModal.classList.add('show')
  newGameModal.setAttribute('aria-hidden', 'false')
  
  // Lock background interaction
  lockBackground(newGameModal)
  
  setTimeout(() => startNewGameBtn.focus(), 50)
}

function closeNewGameModal() {
  // Unlock background interaction first
  unlockBackground(newGameModal)
  
  newGameModal.classList.remove('show')
  newGameModal.setAttribute('aria-hidden', 'true')
}

function updatePlayerCardVisibility() {
  const count = parseInt(playerCountSelect.value, 10)
  const playerCards = playerGrid.querySelectorAll('.player-card')
  
  playerCards.forEach((card, idx) => {
    (card as HTMLElement).style.display = idx < count ? 'flex' : 'none'
  })
}

function updateRacePreview() {
  const count = parseInt(playerCountSelect.value, 10)
  const laps = parseInt(lapCountSelect.value, 10)
  const playerCards = Array.from(playerGrid.querySelectorAll('.player-card')).slice(0, count)
  
  let humans = 0
  let ais = 0
  
  playerCards.forEach(card => {
    const aiCheckbox = card.querySelector('.player-ai') as HTMLInputElement
    if (aiCheckbox?.checked) {
      ais++
    } else {
      humans++
    }
  })
  
  // Update preview stats
  if (humanCount) humanCount.textContent = humans.toString()
  if (aiCount) aiCount.textContent = ais.toString()
  if (totalLaps) totalLaps.textContent = laps.toString()
  
  // Update race status
  const totalPlayers = humans + ais
  const playerText = totalPlayers === 1 ? 'player' : 'players'
  const lapText = laps === 1 ? 'lap' : 'laps'
  if (raceStatus) {
    raceStatus.textContent = `Ready to race! ${totalPlayers} ${playerText}, ${laps} ${lapText}`
  }
}

// Enhanced modal event listeners
playerCountSelect?.addEventListener('change', () => {
  updatePlayerCardVisibility()
  updateRacePreview()
})

lapCountSelect?.addEventListener('change', () => {
  updateRacePreview()
})

// Setup AI toggle functionality for each player card
function setupPlayerCardListeners() {
  const playerCards = playerGrid.querySelectorAll('.player-card')
  
  playerCards.forEach(card => {
    const aiToggle = card.querySelector('.player-ai') as HTMLInputElement
    const aiDiffSelect = card.querySelector('.player-ai-diff') as HTMLSelectElement
    
    if (aiToggle && aiDiffSelect) {
      // Show/hide AI difficulty dropdown based on AI toggle
      const updateAIDiffVisibility = () => {
        aiDiffSelect.style.display = aiToggle.checked ? 'block' : 'none'
        updateRacePreview()
      }
      
      aiToggle.addEventListener('change', updateAIDiffVisibility)
      updateAIDiffVisibility() // Initialize state
    }
  })
}

// Enhanced preset functionality
function applyPreset(presetType: string) {
  const playerCards = Array.from(playerGrid.querySelectorAll('.player-card'))
  
  switch (presetType) {
    case 'solo':
      // 1 Human + 1 AI
      playerCountSelect.value = '2'
      updatePlayerCardVisibility()
      
      // Player 1: Human
      if (playerCards[0]) {
        const nameInput = playerCards[0].querySelector('.player-name') as HTMLInputElement
        const aiToggle = playerCards[0].querySelector('.player-ai') as HTMLInputElement
        nameInput.value = 'Player 1'
        aiToggle.checked = false
      }
      
      // Player 2: AI
      if (playerCards[1]) {
        const nameInput = playerCards[1].querySelector('.player-name') as HTMLInputElement
        const aiToggle = playerCards[1].querySelector('.player-ai') as HTMLInputElement
        nameInput.value = 'AI Opponent'
        aiToggle.checked = true
      }
      break
      
    case 'local':
      // 2-4 Human players
      playerCountSelect.value = '2'
      updatePlayerCardVisibility()
      
      playerCards.slice(0, 2).forEach((card, idx) => {
        const nameInput = card.querySelector('.player-name') as HTMLInputElement
        const aiToggle = card.querySelector('.player-ai') as HTMLInputElement
        nameInput.value = `Player ${idx + 1}`
        aiToggle.checked = false
      })
      break
      
    case 'ai-challenge':
      // 1 Human + 3 AI
      playerCountSelect.value = '4'
      updatePlayerCardVisibility()
      
      // Player 1: Human
      if (playerCards[0]) {
        const nameInput = playerCards[0].querySelector('.player-name') as HTMLInputElement
        const aiToggle = playerCards[0].querySelector('.player-ai') as HTMLInputElement
        nameInput.value = 'Player 1'
        aiToggle.checked = false
      }
      
      // Players 2-4: AI
      playerCards.slice(1, 4).forEach((card, idx) => {
        const nameInput = card.querySelector('.player-name') as HTMLInputElement
        const aiToggle = card.querySelector('.player-ai') as HTMLInputElement
        const diffSelect = card.querySelector('.player-ai-diff') as HTMLSelectElement
        nameInput.value = `AI ${idx + 1}`
        aiToggle.checked = true
        
        // Vary AI difficulty
        const difficulties = ['easy', 'medium', 'hard']
        diffSelect.value = difficulties[idx] || 'medium'
      })
      break
  }
  
  // Update preview and AI toggles after applying preset
  setupPlayerCardListeners()
  updateRacePreview()
}

function randomizeSetup() {
  const playerCards = Array.from(playerGrid.querySelectorAll('.player-card'))
  const count = parseInt(playerCountSelect.value, 10)
  const names = ['Alex', 'Sam', 'Jordan', 'Casey', 'Taylor', 'Morgan', 'Riley', 'Cameron']
  const aiNames = ['HAL 9000', 'Deep Blue', 'Watson', 'AlphaGo', 'Skynet', 'ARIA', 'Nova', 'Zephyr']
  
  playerCards.slice(0, count).forEach((card, idx) => {
    const nameInput = card.querySelector('.player-name') as HTMLInputElement
    const aiToggle = card.querySelector('.player-ai') as HTMLInputElement
    const diffSelect = card.querySelector('.player-ai-diff') as HTMLSelectElement
    
    // Randomly decide if AI (30% chance)
    const isAI = Math.random() < 0.3
    aiToggle.checked = isAI
    
    if (isAI) {
      // Pick random AI name and difficulty
      const randomAIName = aiNames[Math.floor(Math.random() * aiNames.length)]
      nameInput.value = randomAIName || 'AI Player'
      const difficulties = ['easy', 'medium', 'hard']
      const randomDifficulty = difficulties[Math.floor(Math.random() * difficulties.length)]
      diffSelect.value = randomDifficulty || 'medium'
    } else {
      // Pick random human name
      const randomName = names[Math.floor(Math.random() * names.length)]
      nameInput.value = randomName || `Player ${idx + 1}`
    }
  })
  
  // Randomize lap count too
  const lapOptions = ['1', '2', '3', '5', '10']
  const randomLapOption = lapOptions[Math.floor(Math.random() * lapOptions.length)]
  lapCountSelect.value = randomLapOption || '3'
  
  // Update everything
  setupPlayerCardListeners()
  updateRacePreview()
}

// Initialize player card listeners when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  setupPlayerCardListeners()
  
  // Setup preset buttons
  const presetButtons = document.querySelectorAll('.preset-btn')
  presetButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLButtonElement
      const preset = target.dataset.preset
      if (preset) {
        // Remove active state from all presets
        presetButtons.forEach(b => b.classList.remove('active'))
        // Add active state to clicked preset
        target.classList.add('active')
        // Apply preset
        applyPreset(preset)
      }
    })
  })
  
  // Setup random button
  if (randomSetupBtn) {
    randomSetupBtn.addEventListener('click', randomizeSetup)
  }
})

closeNewGameBtn?.addEventListener('click', closeNewGameModal)

startNewGameBtn?.addEventListener('click', () => {
  // Build players config from enhanced form
  const count = parseInt(playerCountSelect.value, 10)
  const lapCount = parseInt(lapCountSelect.value, 10)
  const playerCards = Array.from(playerGrid.querySelectorAll('.player-card')).slice(0, count)
  const players = playerCards.map((card, idx) => {
    const nameInput = card.querySelector('.player-name') as HTMLInputElement
    const aiCheckbox = card.querySelector('.player-ai') as HTMLInputElement
    const diffSelect = card.querySelector('.player-ai-diff') as HTMLSelectElement
    const isAI = aiCheckbox?.checked || false
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
  
  // Lock background interaction
  lockBackground(configModal)
  
  // Focus first interactive element in modal
  setTimeout(() => gridToggle.focus(), 100)
}

function closeConfigModal() {
  // Unlock background interaction first
  unlockBackground(configModal)
  
  configModal.classList.remove('show')
  configModal.setAttribute('aria-hidden', 'true')
}

// Modal event listeners - handled by dropdown menu now
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
  debugToggle.checked = isFeatureEnabled('debugMode')
}

// Performance benchmark function for console access
// Usage: runPerformanceBenchmark(5) to run a 5-second test
async function runPerformanceBenchmark(durationSeconds: number = 5): Promise<any> {
  console.log(`🚀 Starting ${durationSeconds}s performance benchmark...`)
  
  try {
    const results = await PerformanceBenchmark.runBenchmark(durationSeconds, () => {
      draw(ctx, state, canvas)
    })
    
    const report = PerformanceBenchmark.generateReport(results)
    console.log('\n' + report.join('\n'))
    
    // Compare with v3.1.1 baseline (assuming ~50fps baseline from previous performance improvements)
    const comparison = PerformanceBenchmark.comparePerformance(50, results.avgFps)
    console.log(`\n📈 Comparison vs baseline (50fps):`)  
    console.log(`FPS Delta: ${comparison.deltaFps >= 0 ? '+' : ''}${comparison.deltaFps} (${comparison.deltaPercent >= 0 ? '+' : ''}${comparison.deltaPercent}%)`)
    
    if (comparison.improved) {
      console.log(`✨ Performance improved!`)
    } else if (comparison.maintained) {
      console.log(`👍 Performance maintained within acceptable range`)
    } else if (comparison.regressed && comparison.acceptable) {
      console.log(`⚠️ Slight performance regression, but still acceptable`)
    } else if (comparison.regressed && !comparison.acceptable) {
      console.log(`❌ Performance regression detected - optimization needed`)
    }
    
    return results
  } catch (error) {
    console.error('❌ Benchmark failed:', error)
  }
}

// Make benchmark function available globally for console access
;(window as any).runPerformanceBenchmark = runPerformanceBenchmark


