import { isFeatureEnabled } from './features'
import { performanceTracker } from './performance'

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
    this.updatePlayerInfo(data.playerInfo)
    this.updateGameStatus(data.gameStatus, data.leaderboard)
    this.updatePerformanceMetrics(data.performanceMetrics)
  }
  
  private updatePlayerInfo(playerInfo: HUDData['playerInfo']) {
    const lines: string[] = []
    
    if (playerInfo.playerName) {
      lines.push(`<div class="hud-line hud-player-name">${playerInfo.playerName}'s Turn</div>`)
    }
    
    lines.push(`<div class="hud-line">pos=(${playerInfo.position.x},${playerInfo.position.y}) vel=(${playerInfo.velocity.x},${playerInfo.velocity.y})</div>`)
    lines.push(`<div class="hud-line">lap: ${playerInfo.lap}/${playerInfo.targetLaps}</div>`)
    
    // Show speed only in debug mode
    if (isFeatureEnabled('debugMode') && playerInfo.speed !== undefined) {
      lines.push(`<div class="hud-line">speed: ${playerInfo.speed.toFixed(1)}</div>`)
    }
    
    this.playerInfoElement.innerHTML = lines.join('')
  }
  
  private updateGameStatus(gameStatus: HUDData['gameStatus'], leaderboard?: HUDData['leaderboard']) {
    const lines: string[] = []
    
    // Show leaderboard for multiplayer
    if (leaderboard && leaderboard.length > 1) {
      lines.push(`<div class="hud-line" style="margin-bottom: 6px;"><strong>🏁 Leaderboard:</strong></div>`)
      
      leaderboard.slice(0, 3).forEach(entry => { // Show top 3
        const colorStyle = `color: ${entry.playerColor}`
        lines.push(`<div class="hud-line" style="${colorStyle}">${entry.position}. ${entry.playerName}: ${entry.status}</div>`)
      })
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
