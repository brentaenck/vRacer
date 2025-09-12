#!/usr/bin/env node

/**
 * Real AI Test Script - vRacer
 * 
 * This script tests the actual AI implementation by importing and running
 * the real AI logic from the vRacer codebase.
 */

import { createDefaultGame, legalStepOptions, applyMove, getCurrentCar, getCurrentPlayer, isMultiCarGame } from './src/game.js'
import { chooseAIMove } from './src/ai.js'
import { isFeatureEnabled } from './src/features.js'

console.log('🧪 Real AI Test - Using Actual vRacer AI Logic\n')

// Test configuration
const TEST_CONFIG = {
  MAX_MOVES_PER_TEST: 100,
  TESTS_PER_DIFFICULTY: 3,
  DIFFICULTIES: ['easy', 'medium', 'hard']
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

async function runRealAITest(difficulty = 'medium') {
  console.log(`\n🏃 Testing REAL AI: ${difficulty} difficulty`)
  
  // Create a multi-car game with AI opponent
  let gameState = createDefaultGame()
  
  // Ensure we're in multi-car mode and have AI players
  if (!isMultiCarGame(gameState)) {
    console.error('❌ Game not in multi-car mode')
    return { success: false, reason: 'no_multi_car' }
  }
  
  // Set up AI player
  if (gameState.players && gameState.players.length > 1) {
    gameState.players[1].isAI = true
    gameState.players[1].aiDifficulty = difficulty
  }
  
  const startPos = { ...getCurrentCar(gameState).pos }
  let moveCount = 0
  let maxProgress = 0
  let lastProgressPos = { ...startPos }
  let movesWithoutProgress = 0
  
  console.log(`   Starting position: (${startPos.x}, ${startPos.y})`)
  console.log(`   Multi-car game: ${isMultiCarGame(gameState)}`)
  console.log(`   AI feature enabled: ${isFeatureEnabled('aiPlayers')}`)
  console.log(`   Debug mode: ${isFeatureEnabled('debugMode')}`)
  
  // Switch to AI player (assuming player 1 is AI)
  if (gameState.currentPlayerIndex === 0) {
    gameState.currentPlayerIndex = 1
  }
  
  for (moveCount = 1; moveCount <= TEST_CONFIG.MAX_MOVES_PER_TEST; moveCount++) {
    const currentPlayer = getCurrentPlayer(gameState)
    const currentCar = getCurrentCar(gameState)
    
    if (!currentPlayer || !currentCar) {
      console.error(`❌ No current player/car at move ${moveCount}`)
      return { success: false, reason: 'no_player_car', moves: moveCount, maxProgress }
    }
    
    if (!currentPlayer.isAI) {
      console.error(`❌ Current player is not AI at move ${moveCount}`)
      return { success: false, reason: 'not_ai_player', moves: moveCount, maxProgress }
    }
    
    if (currentCar.crashed) {
      console.log(`   ❌ AI crashed at move ${moveCount}`)
      return { success: false, reason: 'crashed', moves: moveCount, maxProgress }
    }
    
    if (currentCar.finished) {
      console.log(`   ✅ AI finished race at move ${moveCount}! Laps: ${currentCar.currentLap}`)
      return { success: true, reason: 'finished', moves: moveCount, maxProgress, laps: currentCar.currentLap }
    }
    
    // Get legal moves
    const legalMoves = legalStepOptions(gameState)
    
    if (legalMoves.length === 0) {
      console.log(`   ❌ No legal moves at move ${moveCount}`)
      console.log(`   Car position: (${currentCar.pos.x}, ${currentCar.pos.y})`)
      console.log(`   Car velocity: (${currentCar.vel.x}, ${currentCar.vel.y})`)
      return { success: false, reason: 'no_legal_moves', moves: moveCount, maxProgress }
    }
    
    // Get AI decision
    const aiMove = chooseAIMove(gameState)
    
    if (!aiMove) {
      console.log(`   ❌ AI returned null move at move ${moveCount}`)
      return { success: false, reason: 'ai_null_move', moves: moveCount, maxProgress }
    }
    
    // Apply the move
    try {
      gameState = applyMove(gameState, aiMove)
    } catch (error) {
      console.log(`   ❌ Error applying AI move at ${moveCount}: ${error.message}`)
      return { success: false, reason: 'move_application_error', moves: moveCount, maxProgress }
    }
    
    // Update progress tracking
    const newCar = getCurrentCar(gameState)
    if (newCar) {
      const progressDistance = distance(newCar.pos, startPos)
      if (progressDistance > maxProgress) {
        maxProgress = progressDistance
        lastProgressPos = { ...newCar.pos }
        movesWithoutProgress = 0
      } else {
        movesWithoutProgress++
      }
      
      // Log progress every 20 moves
      if (moveCount % 20 === 0) {
        const currentSpeed = Math.hypot(newCar.vel.x, newCar.vel.y)
        console.log(`   Move ${moveCount}: pos=(${newCar.pos.x.toFixed(1)}, ${newCar.pos.y.toFixed(1)}), vel=(${newCar.vel.x}, ${newCar.vel.y}), speed=${currentSpeed.toFixed(1)}, progress=${maxProgress.toFixed(1)}`)
      }
      
      // Check for stuck condition
      if (movesWithoutProgress >= 30) {
        console.log(`   ❌ AI appears stuck (no progress for 30 moves) at move ${moveCount}`)
        return { success: false, reason: 'stuck', moves: moveCount, maxProgress }
      }
      
      // Check for lap completion (simple check)
      if (newCar.currentLap >= 1) {
        console.log(`   🎉 AI completed ${newCar.currentLap} lap(s) at move ${moveCount}!`)
        return { success: true, reason: 'lap_completed', moves: moveCount, maxProgress, laps: newCar.currentLap }
      }
    }
    
    // Switch back to AI player for next turn (in case game switched players)
    if (isMultiCarGame(gameState)) {
      // Find AI player index
      let aiPlayerIndex = -1
      for (let i = 0; i < gameState.players.length; i++) {
        if (gameState.players[i].isAI) {
          aiPlayerIndex = i
          break
        }
      }
      
      if (aiPlayerIndex >= 0) {
        gameState.currentPlayerIndex = aiPlayerIndex
      }
    }
  }
  
  console.log(`   ⏱️ Test timeout at ${moveCount} moves`)
  return { success: false, reason: 'timeout', moves: moveCount, maxProgress }
}

async function runComprehensiveRealAITests() {
  console.log('🚀 Starting Comprehensive Real AI Tests\n')
  console.log('=' .repeat(60))
  
  const results = {
    totalTests: 0,
    successfulTests: 0,
    results: []
  }
  
  for (const difficulty of TEST_CONFIG.DIFFICULTIES) {
    console.log(`\n📊 Testing ${difficulty.toUpperCase()} difficulty...`)
    
    for (let i = 0; i < TEST_CONFIG.TESTS_PER_DIFFICULTY; i++) {
      const testResult = await runRealAITest(difficulty)
      testResult.difficulty = difficulty
      testResult.testNumber = i + 1
      
      results.totalTests++
      if (testResult.success) {
        results.successfulTests++
      }
      
      results.results.push(testResult)
      
      console.log(`   Test ${i + 1}: ${testResult.success ? 'SUCCESS' : 'FAILED'} (${testResult.reason}), moves: ${testResult.moves}, progress: ${testResult.maxProgress?.toFixed(1) || 'N/A'}`)
    }
  }
  
  // Generate report
  console.log('\n' + '=' .repeat(60))
  console.log('📋 REAL AI TEST REPORT')
  console.log('=' .repeat(60))
  
  console.log(`\n📈 OVERALL STATISTICS:`)
  console.log(`   Total Tests: ${results.totalTests}`)
  console.log(`   Successful Tests: ${results.successfulTests}`)
  console.log(`   Success Rate: ${(results.successfulTests / results.totalTests * 100).toFixed(1)}%`)
  
  const averageMoves = results.results.reduce((sum, r) => sum + r.moves, 0) / results.results.length
  console.log(`   Average Moves per Test: ${averageMoves.toFixed(1)}`)
  
  // Breakdown by difficulty
  console.log(`\n📊 PERFORMANCE BY DIFFICULTY:`)
  for (const difficulty of TEST_CONFIG.DIFFICULTIES) {
    const diffResults = results.results.filter(r => r.difficulty === difficulty)
    const successes = diffResults.filter(r => r.success).length
    const successRate = (successes / diffResults.length * 100).toFixed(1)
    console.log(`   ${difficulty.toUpperCase().padEnd(6)}: ${successes}/${diffResults.length} success (${successRate}%)`)
  }
  
  // Failure analysis
  console.log(`\n❌ FAILURE ANALYSIS:`)
  const failureReasons = {}
  results.results.forEach(result => {
    if (!result.success) {
      failureReasons[result.reason] = (failureReasons[result.reason] || 0) + 1
    }
  })
  
  Object.entries(failureReasons)
    .sort(([,a], [,b]) => b - a)
    .forEach(([reason, count]) => {
      console.log(`   ${reason.replace(/_/g, ' ').toUpperCase()}: ${count} occurrences`)
    })
    
  // Success analysis
  if (results.successfulTests > 0) {
    console.log(`\n✅ SUCCESS ANALYSIS:`)
    const successes = results.results.filter(r => r.success)
    const avgMovesToSuccess = successes.reduce((sum, r) => sum + r.moves, 0) / successes.length
    const maxLaps = Math.max(...successes.map(r => r.laps || 0))
    
    console.log(`   Average moves to success: ${avgMovesToSuccess.toFixed(1)}`)
    console.log(`   Maximum laps completed: ${maxLaps}`)
    
    successes.forEach(result => {
      console.log(`   ✓ ${result.difficulty} test ${result.testNumber}: ${result.laps || 0} lap(s) in ${result.moves} moves`)
    })
  }
  
  console.log(`\n💡 ASSESSMENT:`)
  if (results.successfulTests === 0) {
    console.log('   🚨 CRITICAL: AI still cannot complete laps with real game logic')
    console.log('   📝 The improvements need to be more fundamental - consider debugging AI decisions step-by-step')
  } else if (results.successfulTests / results.totalTests < 0.5) {
    console.log('   ⚠️ MODERATE: Some AI success but needs improvement')
    console.log('   📝 Continue iterating on the improvements')
  } else {
    console.log('   ✅ GOOD: AI is showing promising results!')
    console.log('   📝 Fine-tune for better consistency')
  }
  
  return results
}

// Run the comprehensive tests
runComprehensiveRealAITests()
  .then(results => {
    console.log('\n🎯 Real AI testing complete!')
    console.log(`Final assessment: ${results.successfulTests}/${results.totalTests} tests passed`)
  })
  .catch(error => {
    console.error('❌ Error running real AI tests:', error)
  })