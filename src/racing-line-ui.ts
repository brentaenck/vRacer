/**
 * Racing Line UI Integration
 * 
 * Handles racing line import/export functionality in the main vRacer game.
 * Provides UI controls for loading custom racing lines from the racing line editor.
 */

import { loadRacingLineFromJson, clearCustomRacingLine, getCustomRacingLine } from './track-analysis'

// UI Elements
let racingLineToggle: HTMLInputElement
let importRacingLineBtn: HTMLButtonElement
let clearRacingLineBtn: HTMLButtonElement
let openRacingLineEditorBtn: HTMLButtonElement
let racingLineInfo: HTMLSpanElement
let racingLineStatus: HTMLDivElement

// State
let racingLineVisibilityState = false

/**
 * Initialize racing line UI controls
 */
export function initializeRacingLineUI(): void {
  // Get DOM elements
  racingLineToggle = document.getElementById('racingLineToggle') as HTMLInputElement
  importRacingLineBtn = document.getElementById('importRacingLineBtn') as HTMLButtonElement
  clearRacingLineBtn = document.getElementById('clearRacingLineBtn') as HTMLButtonElement
  openRacingLineEditorBtn = document.getElementById('openRacingLineEditorBtn') as HTMLButtonElement
  racingLineInfo = document.getElementById('racingLineInfo') as HTMLSpanElement
  racingLineStatus = document.getElementById('racingLineStatus') as HTMLDivElement
  
  // Set up event listeners
  setupEventListeners()
  
  // Update initial UI state
  updateRacingLineStatus()
  
  console.log('🏁 Racing Line UI initialized')
}

/**
 * Set up event listeners for racing line controls
 */
function setupEventListeners(): void {
  if (racingLineToggle) {
    racingLineToggle.addEventListener('change', handleRacingLineToggle)
  }
  
  if (importRacingLineBtn) {
    importRacingLineBtn.addEventListener('click', handleImportRacingLine)
  }
  
  if (clearRacingLineBtn) {
    clearRacingLineBtn.addEventListener('click', handleClearRacingLine)
  }
  
  if (openRacingLineEditorBtn) {
    openRacingLineEditorBtn.addEventListener('click', handleOpenRacingLineEditor)
  }
}

/**
 * Handle racing line visibility toggle
 */
function handleRacingLineToggle(): void {
  racingLineVisibilityState = racingLineToggle?.checked || false
  console.log('🏁 Racing line visibility:', racingLineVisibilityState)
  
  // Trigger re-render in main game
  // The game render loop will check isRacingLineVisible() to decide whether to draw the racing line
}

/**
 * Handle racing line import from JSON file
 */
function handleImportRacingLine(): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    
    try {
      const text = await file.text()
      const jsonData = JSON.parse(text)
      
      // Load racing line using track-analysis module
      const success = loadRacingLineFromJson(jsonData)
      
      if (success) {
        updateRacingLineStatus()
        // Show success message
        showRacingLineMessage(`Racing line loaded from ${file.name}`, 'success')
        
        // Auto-enable racing line visibility
        if (racingLineToggle) {
          racingLineToggle.checked = true
          racingLineVisibilityState = true
        }
        
        console.log('✅ Racing line imported successfully from', file.name)
      } else {
        showRacingLineMessage('Failed to load racing line - invalid format', 'error')
      }
      
    } catch (error) {
      console.error('❌ Racing line import error:', error)
      showRacingLineMessage('Failed to parse racing line JSON file', 'error')
    }
  }
  
  input.click()
}

/**
 * Handle clearing custom racing line (revert to default)
 */
function handleClearRacingLine(): void {
  clearCustomRacingLine()
  updateRacingLineStatus()
  showRacingLineMessage('Custom racing line cleared - using default', 'info')
  console.log('🗑️ Custom racing line cleared')
}

/**
 * Handle opening racing line editor
 */
function handleOpenRacingLineEditor(): void {
  // Open unified track editor in racing line mode in new tab/window
  const editorUrl = './track-editor/'
  const editorWindow = window.open(editorUrl, '_blank', 'width=1400,height=900')
  
  if (editorWindow) {
    showRacingLineMessage('Track Editor opened in new window - switch to Racing mode to edit racing lines', 'info')
    console.log('✏️ Unified Track Editor opened for racing line editing')
  } else {
    showRacingLineMessage('Failed to open Track Editor - check popup blocker', 'error')
  }
}

/**
 * Update racing line status display
 */
function updateRacingLineStatus(): void {
  const customRacingLine = getCustomRacingLine()
  
  if (customRacingLine) {
    // Custom racing line is loaded
    if (racingLineInfo) {
      racingLineInfo.textContent = `Custom racing line (${customRacingLine.length} waypoints)`
    }
    if (racingLineStatus) {
      racingLineStatus.classList.add('custom-loaded')
    }
  } else {
    // Using default racing line
    if (racingLineInfo) {
      racingLineInfo.textContent = 'Using default racing line'
    }
    if (racingLineStatus) {
      racingLineStatus.classList.remove('custom-loaded')
    }
  }
}

/**
 * Show temporary message to user about racing line operations
 */
function showRacingLineMessage(message: string, type: 'success' | 'error' | 'info'): void {
  // Create temporary notification
  const notification = document.createElement('div')
  notification.className = `racing-line-notification ${type}`
  notification.textContent = message
  
  // Style the notification
  Object.assign(notification.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '12px 16px',
    borderRadius: '8px',
    color: 'white',
    fontWeight: '500',
    fontSize: '14px',
    zIndex: '1000',
    opacity: '0',
    transform: 'translateY(-10px)',
    transition: 'all 0.3s ease',
    backgroundColor: type === 'success' ? '#22c55e' : 
                    type === 'error' ? '#ef4444' : '#3b82f6'
  })
  
  document.body.appendChild(notification)
  
  // Animate in
  setTimeout(() => {
    notification.style.opacity = '1'
    notification.style.transform = 'translateY(0)'
  }, 10)
  
  // Remove after delay
  setTimeout(() => {
    notification.style.opacity = '0'
    notification.style.transform = 'translateY(-10px)'
    setTimeout(() => {
      document.body.removeChild(notification)
    }, 300)
  }, 3000)
}

/**
 * Check if racing line should be visible
 */
export function isRacingLineVisible(): boolean {
  return racingLineVisibilityState
}

/**
 * Get racing line visibility toggle state
 */
export function getRacingLineToggleState(): boolean {
  return racingLineToggle?.checked || false
}

/**
 * Keyboard shortcut handler for racing line toggle
 */
export function handleRacingLineKeyboardShortcut(): void {
  if (racingLineToggle) {
    racingLineToggle.checked = !racingLineToggle.checked
    handleRacingLineToggle()
    showRacingLineMessage(
      `Racing line ${racingLineToggle.checked ? 'enabled' : 'disabled'}`, 
      'info'
    )
  }
}
