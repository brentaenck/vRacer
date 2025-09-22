import { isFeatureEnabled } from './features'
// Performance tracking now handled by simple-performance.ts

// Safari-compatible color resolution function
function resolvePlayerColor(color: string): string {
  // If it's already a hex color or named color, return as-is
  if (color.startsWith('#') || !color.includes('var(')) {
    return color
  }
  
  // For CSS custom properties, resolve them to actual values
  if (typeof window !== 'undefined') {
    const computedStyle = getComputedStyle(document.documentElement)
    
    // Extract the CSS variable name from var() syntax
    const varMatch = color.match(/var\(([^)]+)\)/)
    if (varMatch) {
      const varName = varMatch[1]!.trim()
      const resolvedColor = computedStyle.getPropertyValue(varName).trim()
      if (resolvedColor) {
        return resolvedColor
      }
    }
  }
  
  // Fallback color mapping for common racing colors (Safari fallback)
  const colorFallbacks: Record<string, string> = {
    'var(--racing-tangerine)': '#FF6B35',
    'var(--racing-yellow)': '#F7D945', 
    'var(--racing-blue)': '#2E86DE',
    'var(--racing-violet)': '#A55EEA',
    'var(--racing-red)': '#EE5A52',
  }
  
  return colorFallbacks[color] || color || '#2F2F2F' // Default to charcoal if unresolved
}

export interface HUDData {
  // Player information
  playerInfo: {
    playerName?: string
    playerColor?: string
    position: { x: number, y: number }
    velocity: { x: number, y: number }
    lap: number
    targetLaps: number
    speed?: number
  }
  
  // Game status
  gameStatus: {
    crashed: boolean
    finished: boolean
    finishTime?: number
    gameFinished?: boolean
    winnerName?: string
    winnerTime?: number
  }
  
  // Leaderboard (for multi-player)
  leaderboard?: Array<{
    position: number
    playerName: string
    playerColor: string
    status: string
    lapStatus: string
    positionInfo: string
    velocityInfo: string
    isCurrentPlayer: boolean
  }>
  
  // Performance metrics (debug mode only)
  performanceMetrics?: string[]
}

export class HUDManager {
  private playerInfoElement: HTMLElement
  private gameStatusElement: HTMLElement
  private performanceMetricsElement: HTMLElement
  
  constructor() {
    this.playerInfoElement = document.getElementById('playerInfo')!
    this.gameStatusElement = document.getElementById('gameStatus')!
    this.performanceMetricsElement = document.getElementById('performanceMetrics')!
    
    if (!this.playerInfoElement || !this.gameStatusElement || !this.performanceMetricsElement) {
      throw new Error('HUD elements not found in DOM')
    }
  }
  
  update(data: HUDData) {
    this.updatePlayerInfo(data.playerInfo, data.leaderboard)
    this.updateGameStatus(data.gameStatus, data.leaderboard)
    this.updatePerformanceMetrics(data.performanceMetrics)
  }
  
  private updatePlayerInfo(playerInfo: HUDData['playerInfo'], leaderboard?: HUDData['leaderboard']) {
    const lines: string[] = []
    
    // Add leaderboard title at the top if multiplayer
    if (leaderboard && leaderboard.length > 1) {
      lines.push(`<div class="hud-leaderboard-title">🏁 Leaderboard</div>`)
    }
    
    // Only show current player's turn indicator - detailed info is now in leaderboard
    if (playerInfo.playerName) {
      lines.push(`<div class="hud-line hud-player-name">${playerInfo.playerName}'s Turn</div>`)
    }
    
    // Show speed only in debug mode
    if (isFeatureEnabled('debugMode') && playerInfo.speed !== undefined) {
      lines.push(`<div class="hud-line">speed: ${playerInfo.speed.toFixed(1)} units/turn</div>`)
    }
    
    this.playerInfoElement.innerHTML = lines.join('')
  }
  
  private updateGameStatus(gameStatus: HUDData['gameStatus'], leaderboard?: HUDData['leaderboard']) {
    const lines: string[] = []
    
    // Show leaderboard for multiplayer
    if (leaderboard && leaderboard.length > 1) {
      lines.push(`<div class="hud-leaderboard">`)
      lines.push(`<div class="hud-player-cards">`)
      
      leaderboard.forEach(entry => {
        const currentPlayerClass = entry.isCurrentPlayer ? ' current-player' : ''
        const resolvedColor = resolvePlayerColor(entry.playerColor)
        
        lines.push(`
          <div class="hud-player-card${currentPlayerClass}" style="background-color: ${resolvedColor}; border: 2px solid ${resolvedColor}">
            <div class="hud-player-header">
              <div class="hud-player-badge" style="background-color: rgba(0,0,0,0.2); color: white">${entry.position}</div>
              <span class="hud-player-name">${entry.playerName}</span>
            </div>
            <div class="hud-player-details">
              <span class="hud-detail-item">${entry.lapStatus}</span>
              <span class="hud-detail-item">${entry.positionInfo}</span>
              <span class="hud-detail-item">${entry.velocityInfo}</span>
            </div>
          </div>
        `)
      })
      
      lines.push(`</div>`)
      lines.push(`</div>`)
    }
    
    // Game completion status
    if (gameStatus.crashed) {
      lines.push(`<div class="hud-line hud-crashed">CRASHED — press R to reset</div>`)
    }
    
    if (gameStatus.finished && !gameStatus.gameFinished) {
      lines.push(`<div class="hud-line hud-winner">🏁 RACE COMPLETE! 🏁</div>`)
      if (gameStatus.finishTime) {
        lines.push(`<div class="hud-line">Time: ${(gameStatus.finishTime / 1000).toFixed(1)}s — press R to race again</div>`)
      }
    }
    
    if (gameStatus.gameFinished) {
      if (gameStatus.winnerName && gameStatus.winnerTime) {
        lines.push(`<div class="hud-line hud-winner">🏁 RACE COMPLETE! 🏁</div>`)
        lines.push(`<div class="hud-line hud-winner">🥇 Winner: ${gameStatus.winnerName} (${(gameStatus.winnerTime / 1000).toFixed(1)}s)</div>`)
      } else {
        lines.push(`<div class="hud-line hud-crashed">🏁 Race ended - All players crashed</div>`)
      }
      lines.push(`<div class="hud-line">Press R to start a new race</div>`)
    }
    
    this.gameStatusElement.innerHTML = lines.join('')
  }
  
  private updatePerformanceMetrics(metrics?: string[]) {
    if (isFeatureEnabled('debugMode') && metrics) {
      this.performanceMetricsElement.classList.add('visible')
      
      const lines = metrics.map(metric => {
        const isWarning = metric.includes('⚠️')
        const className = isWarning ? 'hud-warning' : ''
        return `<div class="hud-line ${className}">${metric}</div>`
      })
      
      this.performanceMetricsElement.innerHTML = lines.join('')
    } else {
      this.performanceMetricsElement.classList.remove('visible')
      this.performanceMetricsElement.innerHTML = ''
    }
  }
}

// Global HUD manager instance
export const hudManager = new HUDManager()
