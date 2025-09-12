#!/usr/bin/env node

/**
 * AI Testing and Analysis Framework - vRacer
 * 
 * This script provides comprehensive tools for testing, analyzing, and improving
 * AI player performance in vRacer. It runs automated tests, collects data,
 * and provides actionable insights for AI improvements.
 */

console.log('🧪 vRacer AI Testing and Analysis Framework\n');

// Test configuration
const TEST_CONFIG = {
  // Test duration and iteration settings
  MAX_MOVES_PER_TEST: 200,          // Maximum moves before declaring test failed
  TESTS_PER_DIFFICULTY: 5,          // Number of test runs per difficulty level
  POSITION_TRACKING_INTERVAL: 10,   // Track position every N moves
  
  // Success criteria
  LAP_COMPLETION_THRESHOLD: 1,      // Minimum laps to consider success
  PROGRESS_TIMEOUT: 50,             // Moves without progress before timeout
  
  // Analysis settings
  STUCK_DETECTION_RADIUS: 2.0,      // Radius for detecting stuck behavior
  WAYPOINT_REACHED_THRESHOLD: 3.0,  // Distance threshold for waypoint completion
  
  // Test scenarios
  DIFFICULTIES: ['easy', 'medium', 'hard'],
  START_POSITIONS: [
    { x: 5, y: 21, name: 'Default Start' },
    { x: 7, y: 22, name: 'Slightly Offset' },
    { x: 6, y: 20, name: 'Alternative Start' }
  ]
};

// Mock game state for testing (simplified version of actual game state)
function createTestGameState(aiStartPos = { x: 5, y: 21 }) {
  return {
    outer: [
      { x: 2, y: 2 }, { x: 48, y: 2 }, { x: 48, y: 33 }, { x: 2, y: 33 }
    ],
    inner: [
      { x: 12, y: 10 }, { x: 38, y: 10 }, { x: 38, y: 25 }, { x: 12, y: 25 }
    ],
    start: { a: { x: 4, y: 21 }, b: { x: 10, y: 21 } },
    cars: [
      {
        pos: aiStartPos,
        vel: { x: 0, y: 0 },
        trail: [aiStartPos],
        crashed: false,
        finished: false,
        currentLap: 0,
        checkpoints: []
      }
    ],
    currentPlayerIndex: 0,
    players: [
      {
        name: 'AI Test Player',
        isAI: true,
        aiDifficulty: 'medium'
      }
    ]
  };
}

// Mock track analysis (simplified version of actual track analysis)
function createMockTrackAnalysis() {
  return {
    outer: [],
    inner: [],
    startLine: { a: { x: 4, y: 21 }, b: { x: 10, y: 21 } },
    racingDirection: 'counter-clockwise',
    optimalRacingLine: [
      // Start/finish area
      { pos: { x: 5, y: 20 }, targetSpeed: 3, brakeZone: false, cornerType: 'straight', safeZone: 'left' },
      { pos: { x: 5, y: 23 }, targetSpeed: 3, brakeZone: false, cornerType: 'straight', safeZone: 'left' },
      { pos: { x: 5, y: 26 }, targetSpeed: 3, brakeZone: false, cornerType: 'straight', safeZone: 'left' },
      
      // Turn 1: Left to bottom
      { pos: { x: 8, y: 28 }, targetSpeed: 2, brakeZone: true, cornerType: 'entry', safeZone: 'left' },
      { pos: { x: 11, y: 31 }, targetSpeed: 2, brakeZone: false, cornerType: 'apex', safeZone: 'bottom' },
      { pos: { x: 18, y: 29 }, targetSpeed: 3, brakeZone: false, cornerType: 'exit', safeZone: 'bottom' },
      
      // Bottom straight
      { pos: { x: 25, y: 29 }, targetSpeed: 5, brakeZone: false, cornerType: 'straight', safeZone: 'bottom' },
      { pos: { x: 32, y: 29 }, targetSpeed: 4, brakeZone: false, cornerType: 'straight', safeZone: 'bottom' },
      
      // Turn 2: Bottom to right
      { pos: { x: 39, y: 29 }, targetSpeed: 2, brakeZone: true, cornerType: 'entry', safeZone: 'bottom' },
      { pos: { x: 42, y: 25 }, targetSpeed: 2, brakeZone: false, cornerType: 'apex', safeZone: 'right' },
      { pos: { x: 43, y: 20 }, targetSpeed: 3, brakeZone: false, cornerType: 'exit', safeZone: 'right' },
      
      // Right straight
      { pos: { x: 43, y: 17 }, targetSpeed: 4, brakeZone: false, cornerType: 'straight', safeZone: 'right' },
      { pos: { x: 43, y: 14 }, targetSpeed: 4, brakeZone: false, cornerType: 'straight', safeZone: 'right' },
      
      // Turn 3: Right to top
      { pos: { x: 38, y: 8 }, targetSpeed: 2, brakeZone: true, cornerType: 'entry', safeZone: 'right' },
      { pos: { x: 32, y: 5 }, targetSpeed: 2, brakeZone: false, cornerType: 'apex', safeZone: 'top' },
      { pos: { x: 25, y: 6 }, targetSpeed: 3, brakeZone: false, cornerType: 'exit', safeZone: 'top' },
      
      // Top straight
      { pos: { x: 20, y: 6 }, targetSpeed: 4, brakeZone: false, cornerType: 'straight', safeZone: 'top' },
      { pos: { x: 15, y: 6 }, targetSpeed: 4, brakeZone: false, cornerType: 'straight', safeZone: 'top' },
      
      // Turn 4: Top to left
      { pos: { x: 10, y: 8 }, targetSpeed: 2, brakeZone: true, cornerType: 'entry', safeZone: 'top' },
      { pos: { x: 6, y: 12 }, targetSpeed: 2, brakeZone: false, cornerType: 'apex', safeZone: 'left' },
      { pos: { x: 7, y: 16 }, targetSpeed: 3, brakeZone: false, cornerType: 'exit', safeZone: 'left' }
    ],
    lapValidationCheckpoints: [
      { a: { x: 25, y: 33 }, b: { x: 25, y: 25 } }, // Bottom
      { a: { x: 48, y: 17.5 }, b: { x: 38, y: 17.5 } }, // Right
      { a: { x: 25, y: 10 }, b: { x: 25, y: 2 } }, // Top
      { a: { x: 12, y: 17.5 }, b: { x: 2, y: 17.5 } } // Left
    ],
    safeZones: [
      {
        name: 'left',
        bounds: { minX: 3, maxX: 11, minY: 3, maxY: 32 },
        direction: { x: 0.3, y: 1 }
      },
      {
        name: 'bottom', 
        bounds: { minX: 3, maxX: 47, minY: 26, maxY: 32 },
        direction: { x: 1, y: -0.3 }
      },
      {
        name: 'right',
        bounds: { minX: 39, maxX: 47, minY: 3, maxY: 32 },
        direction: { x: -0.3, y: -1 }
      },
      {
        name: 'top',
        bounds: { minX: 3, maxX: 47, minY: 3, maxY: 9 },
        direction: { x: -1, y: 0.3 }
      }
    ],
    trackBounds: { minX: 2, maxX: 48, minY: 2, maxY: 33 },
    innerBounds: { minX: 12, maxX: 38, minY: 10, maxY: 25 }
  };
}

// Utility functions
function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function isInsideTrack(pos, trackAnalysis) {
  const { trackBounds, innerBounds } = trackAnalysis;
  
  // Must be inside outer boundary
  const inOuter = pos.x > trackBounds.minX && pos.x < trackBounds.maxX &&
                  pos.y > trackBounds.minY && pos.y < trackBounds.maxY;
  
  // Must be outside inner boundary
  const inInner = pos.x > innerBounds.minX && pos.x < innerBounds.maxX &&
                  pos.y > innerBounds.minY && pos.y < innerBounds.maxY;
  
  return inOuter && !inInner;
}

function getLegalMoves(car, trackAnalysis) {
  const legalMoves = [];
  
  // Check all 9 possible acceleration vectors (-1,-1) to (1,1)
  for (let ax = -1; ax <= 1; ax++) {
    for (let ay = -1; ay <= 1; ay++) {
      const newVel = { x: car.vel.x + ax, y: car.vel.y + ay };
      const newPos = { x: car.pos.x + newVel.x, y: car.pos.y + newVel.y };
      
      // Simple legality check - position must be inside track
      if (isInsideTrack(newPos, trackAnalysis)) {
        legalMoves.push({
          acc: { x: ax, y: ay },
          newPos,
          newVel
        });
      }
    }
  }
  
  return legalMoves;
}

// AI Test Results Data Structure
class AITestResults {
  constructor() {
    this.tests = [];
    this.summary = {
      totalTests: 0,
      successfulLaps: 0,
      averageMovesPerTest: 0,
      commonFailurePoints: [],
      stuckPositions: [],
      waypointReachStats: {}
    };
  }
  
  addTestResult(testResult) {
    this.tests.push(testResult);
    this.updateSummary();
  }
  
  updateSummary() {
    this.summary.totalTests = this.tests.length;
    this.summary.successfulLaps = this.tests.filter(t => t.lapsCompleted >= 1).length;
    this.summary.averageMovesPerTest = this.tests.reduce((sum, t) => sum + t.totalMoves, 0) / this.tests.length;
    
    // Analyze failure points
    this.analyzeFailurePoints();
    this.analyzeStuckPositions();
    this.analyzeWaypointReach();
  }
  
  analyzeFailurePoints() {
    const failurePoints = [];
    
    this.tests.forEach(test => {
      if (test.lapsCompleted < 1) {
        const lastPos = test.positionHistory[test.positionHistory.length - 1];
        if (lastPos) {
          failurePoints.push({
            pos: lastPos.pos,
            reason: test.failureReason,
            moves: test.totalMoves
          });
        }
      }
    });
    
    this.summary.commonFailurePoints = this.clusterPositions(failurePoints);
  }
  
  analyzeStuckPositions() {
    const stuckPositions = [];
    
    this.tests.forEach(test => {
      test.positionHistory.forEach((entry, index) => {
        if (index >= 10) { // Look for positions where AI stayed for multiple moves
          const recentPositions = test.positionHistory.slice(index - 10, index);
          const avgPos = this.averagePosition(recentPositions.map(p => p.pos));
          const maxDistance = Math.max(...recentPositions.map(p => distance(p.pos, avgPos)));
          
          if (maxDistance < TEST_CONFIG.STUCK_DETECTION_RADIUS) {
            stuckPositions.push(avgPos);
          }
        }
      });
    });
    
    this.summary.stuckPositions = this.clusterPositions(stuckPositions);
  }
  
  analyzeWaypointReach() {
    const waypointStats = {};
    const trackAnalysis = createMockTrackAnalysis();
    
    trackAnalysis.optimalRacingLine.forEach((waypoint, index) => {
      waypointStats[index] = {
        waypoint,
        timesReached: 0,
        averageApproachMoves: 0,
        failureRate: 0
      };
    });
    
    this.tests.forEach(test => {
      test.positionHistory.forEach(entry => {
        trackAnalysis.optimalRacingLine.forEach((waypoint, index) => {
          if (distance(entry.pos, waypoint.pos) < TEST_CONFIG.WAYPOINT_REACHED_THRESHOLD) {
            waypointStats[index].timesReached++;
          }
        });
      });
    });
    
    this.summary.waypointReachStats = waypointStats;
  }
  
  clusterPositions(positions) {
    // Simple clustering algorithm to group nearby positions
    const clusters = [];
    const visited = new Set();
    
    positions.forEach((pos, i) => {
      if (visited.has(i)) return;
      
      const cluster = [pos];
      visited.add(i);
      
      positions.forEach((otherPos, j) => {
        if (i !== j && !visited.has(j)) {
          if (distance(pos.pos || pos, otherPos.pos || otherPos) < 5.0) {
            cluster.push(otherPos);
            visited.add(j);
          }
        }
      });
      
      if (cluster.length > 0) {
        clusters.push({
          center: this.averagePosition(cluster.map(p => p.pos || p)),
          count: cluster.length,
          examples: cluster.slice(0, 3) // Keep first 3 examples
        });
      }
    });
    
    return clusters.sort((a, b) => b.count - a.count); // Sort by frequency
  }
  
  averagePosition(positions) {
    const sum = positions.reduce((acc, pos) => ({
      x: acc.x + pos.x,
      y: acc.y + pos.y
    }), { x: 0, y: 0 });
    
    return {
      x: sum.x / positions.length,
      y: sum.y / positions.length
    };
  }
}

// Mock simplified AI logic for testing (based on actual AI patterns)
function mockAIDecision(car, trackAnalysis, difficulty = 'medium') {
  const legalMoves = getLegalMoves(car, trackAnalysis);
  
  if (legalMoves.length === 0) {
    return null; // No legal moves available
  }
  
  // Simple scoring based on actual AI logic patterns
  let bestMove = legalMoves[0];
  let bestScore = -Infinity;
  
  legalMoves.forEach(move => {
    let score = 0;
    
    // 1. Forward movement bonus (simplified direction logic)
    const speed = Math.hypot(move.newVel.x, move.newVel.y);
    if (speed > 0) {
      // Prefer movement that goes generally in racing direction
      if (car.pos.x < 25 && car.pos.y < 20) {
        // Left side - prefer moving down/right
        score += move.newVel.y * 10 + move.newVel.x * 5;
      } else if (car.pos.x > 25 && car.pos.y > 15) {
        // Right side - prefer moving up/left
        score += -move.newVel.y * 10 + -move.newVel.x * 5;
      } else if (car.pos.y < 15) {
        // Top side - prefer moving left
        score += -move.newVel.x * 10;
      } else {
        // Bottom side - prefer moving right
        score += move.newVel.x * 10;
      }
    }
    
    // 2. Speed management
    const targetSpeed = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 4 : 5;
    if (speed >= 1 && speed <= targetSpeed) {
      score += 20;
    } else if (speed > targetSpeed) {
      score -= (speed - targetSpeed) * 10;
    }
    
    // 3. Racing line attraction (find nearest waypoint)
    let nearestWaypoint = trackAnalysis.optimalRacingLine[0];
    let minDistance = Infinity;
    
    trackAnalysis.optimalRacingLine.forEach(waypoint => {
      const dist = distance(move.newPos, waypoint.pos);
      if (dist < minDistance) {
        minDistance = dist;
        nearestWaypoint = waypoint;
      }
    });
    
    // Bonus for moving towards racing line
    const currentDistance = distance(car.pos, nearestWaypoint.pos);
    const newDistance = distance(move.newPos, nearestWaypoint.pos);
    if (newDistance < currentDistance) {
      score += (currentDistance - newDistance) * 15;
    }
    
    // 4. Avoid staying still
    if (speed === 0) {
      score -= 50;
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  });
  
  return bestMove.acc;
}

// Single AI test run
function runSingleAITest(difficulty = 'medium', startPos = { x: 5, y: 21 }) {
  console.log(`\n🏃 Running AI test: ${difficulty} difficulty from (${startPos.x}, ${startPos.y})`);
  
  const gameState = createTestGameState(startPos);
  const trackAnalysis = createMockTrackAnalysis();
  gameState.players[0].aiDifficulty = difficulty;
  
  const testResult = {
    difficulty,
    startPos,
    totalMoves: 0,
    lapsCompleted: 0,
    positionHistory: [],
    targetHistory: [],
    failureReason: 'unknown',
    completionTime: null,
    maxProgress: 0
  };
  
  const car = gameState.cars[0];
  let movesWithoutProgress = 0;
  let lastProgressPosition = { ...startPos };
  
  // Record initial position
  testResult.positionHistory.push({
    move: 0,
    pos: { ...car.pos },
    vel: { ...car.vel },
    speed: 0
  });
  
  console.log(`   Starting position: (${car.pos.x}, ${car.pos.y})`);
  
  for (let move = 1; move <= TEST_CONFIG.MAX_MOVES_PER_TEST; move++) {
    testResult.totalMoves = move;
    
    // Get AI decision
    const aiMove = mockAIDecision(car, trackAnalysis, difficulty);
    
    if (!aiMove) {
      testResult.failureReason = 'no_legal_moves';
      console.log(`   ❌ Failed at move ${move}: No legal moves available`);
      break;
    }
    
    // Apply move
    car.vel.x += aiMove.x;
    car.vel.y += aiMove.y;
    car.pos.x += car.vel.x;
    car.pos.y += car.vel.y;
    
    const speed = Math.hypot(car.vel.x, car.vel.y);
    
    // Record position every N moves
    if (move % TEST_CONFIG.POSITION_TRACKING_INTERVAL === 0) {
      testResult.positionHistory.push({
        move,
        pos: { ...car.pos },
        vel: { ...car.vel },
        speed
      });
      
      console.log(`   Move ${move}: pos=(${car.pos.x.toFixed(1)}, ${car.pos.y.toFixed(1)}), vel=(${car.vel.x}, ${car.vel.y}), speed=${speed.toFixed(1)}`);
    }
    
    // Check if position is still legal (crash detection)
    if (!isInsideTrack(car.pos, trackAnalysis)) {
      testResult.failureReason = 'crashed_outside_track';
      console.log(`   ❌ Failed at move ${move}: Car went outside track boundaries`);
      break;
    }
    
    // Progress detection (simplified lap completion check)
    const progressDistance = distance(car.pos, { x: 5, y: 21 }); // Distance from start
    if (progressDistance > testResult.maxProgress) {
      testResult.maxProgress = progressDistance;
      lastProgressPosition = { ...car.pos };
      movesWithoutProgress = 0;
    } else {
      movesWithoutProgress++;
    }
    
    // Check for being stuck
    if (movesWithoutProgress >= TEST_CONFIG.PROGRESS_TIMEOUT) {
      testResult.failureReason = 'stuck_no_progress';
      console.log(`   ❌ Failed at move ${move}: No progress for ${TEST_CONFIG.PROGRESS_TIMEOUT} moves`);
      break;
    }
    
    // Simple lap completion check (if we've made significant progress and returned near start)
    const distanceToStart = distance(car.pos, startPos);
    if (testResult.maxProgress > 20 && distanceToStart < 5 && move > 50) {
      testResult.lapsCompleted = 1;
      testResult.completionTime = move;
      testResult.failureReason = 'none';
      console.log(`   ✅ Success! Lap completed at move ${move}`);
      break;
    }
  }
  
  // Final status
  if (testResult.lapsCompleted === 0 && testResult.totalMoves >= TEST_CONFIG.MAX_MOVES_PER_TEST) {
    testResult.failureReason = 'timeout';
  }
  
  console.log(`   Final: ${testResult.lapsCompleted > 0 ? 'SUCCESS' : 'FAILED'} (${testResult.failureReason})`);
  console.log(`   Total moves: ${testResult.totalMoves}, Max progress: ${testResult.maxProgress.toFixed(1)}`);
  
  return testResult;
}

// Comprehensive AI testing suite
function runComprehensiveAITests() {
  console.log('🚀 Starting Comprehensive AI Testing Suite\n');
  console.log('=' .repeat(60));
  
  const overallResults = new AITestResults();
  
  // Test each difficulty level
  TEST_CONFIG.DIFFICULTIES.forEach(difficulty => {
    console.log(`\n📊 Testing ${difficulty.toUpperCase()} difficulty...`);
    
    for (let i = 0; i < TEST_CONFIG.TESTS_PER_DIFFICULTY; i++) {
      const startPos = TEST_CONFIG.START_POSITIONS[i % TEST_CONFIG.START_POSITIONS.length];
      const testResult = runSingleAITest(difficulty, startPos.pos || startPos);
      overallResults.addTestResult(testResult);
    }
  });
  
  // Generate comprehensive report
  generateTestReport(overallResults);
  
  return overallResults;
}

// Generate detailed test report
function generateTestReport(results) {
  console.log('\n' + '=' .repeat(60));
  console.log('📋 COMPREHENSIVE AI TEST REPORT');
  console.log('=' .repeat(60));
  
  const { summary } = results;
  
  console.log(`\n📈 OVERALL STATISTICS:`);
  console.log(`   Total Tests: ${summary.totalTests}`);
  console.log(`   Successful Laps: ${summary.successfulLaps}`);
  console.log(`   Success Rate: ${(summary.successfulLaps / summary.totalTests * 100).toFixed(1)}%`);
  console.log(`   Average Moves per Test: ${summary.averageMovesPerTest.toFixed(1)}`);
  
  // Difficulty breakdown
  console.log(`\n📊 PERFORMANCE BY DIFFICULTY:`);
  TEST_CONFIG.DIFFICULTIES.forEach(difficulty => {
    const difficultyTests = results.tests.filter(t => t.difficulty === difficulty);
    const successCount = difficultyTests.filter(t => t.lapsCompleted >= 1).length;
    const successRate = (successCount / difficultyTests.length * 100).toFixed(1);
    
    console.log(`   ${difficulty.toUpperCase().padEnd(6)}: ${successCount}/${difficultyTests.length} success (${successRate}%)`);
  });
  
  // Failure analysis
  console.log(`\n❌ FAILURE ANALYSIS:`);
  const failureReasons = {};
  results.tests.forEach(test => {
    if (test.lapsCompleted === 0) {
      failureReasons[test.failureReason] = (failureReasons[test.failureReason] || 0) + 1;
    }
  });
  
  Object.entries(failureReasons)
    .sort(([,a], [,b]) => b - a)
    .forEach(([reason, count]) => {
      console.log(`   ${reason.replace(/_/g, ' ').toUpperCase()}: ${count} occurrences`);
    });
  
  // Common failure points
  if (summary.commonFailurePoints.length > 0) {
    console.log(`\n🎯 COMMON FAILURE LOCATIONS:`);
    summary.commonFailurePoints.slice(0, 5).forEach((cluster, i) => {
      console.log(`   ${i + 1}. (${cluster.center.x.toFixed(1)}, ${cluster.center.y.toFixed(1)}) - ${cluster.count} failures`);
    });
  }
  
  // Stuck positions
  if (summary.stuckPositions.length > 0) {
    console.log(`\n🔄 POSITIONS WHERE AI GETS STUCK:`);
    summary.stuckPositions.slice(0, 5).forEach((cluster, i) => {
      console.log(`   ${i + 1}. (${cluster.center.x.toFixed(1)}, ${cluster.center.y.toFixed(1)}) - ${cluster.count} occurrences`);
    });
  }
  
  // Waypoint reach analysis
  console.log(`\n🎯 WAYPOINT REACH ANALYSIS:`);
  const waypointEntries = Object.entries(summary.waypointReachStats);
  waypointEntries.slice(0, 8).forEach(([index, stats]) => {
    const reachRate = (stats.timesReached / summary.totalTests * 100).toFixed(1);
    console.log(`   Waypoint ${index} (${stats.waypoint.cornerType}): ${stats.timesReached}/${summary.totalTests} (${reachRate}%)`);
  });
  
  console.log(`\n💡 RECOMMENDATIONS:`);
  generateRecommendations(results);
}

// Generate actionable recommendations based on test results
function generateRecommendations(results) {
  const { summary } = results;
  
  // Success rate analysis
  if (summary.successfulLaps === 0) {
    console.log('   🚨 CRITICAL: No AI completed any laps - fundamental issues with AI logic');
    console.log('   📝 Priority 1: Fix basic movement and waypoint targeting');
  } else if (summary.successfulLaps / summary.totalTests < 0.3) {
    console.log('   ⚠️  LOW SUCCESS RATE: Less than 30% completion rate');
    console.log('   📝 Priority 1: Analyze and fix most common failure patterns');
  }
  
  // Failure pattern analysis
  const tests = results.tests;
  const stuckCount = tests.filter(t => t.failureReason === 'stuck_no_progress').length;
  const crashCount = tests.filter(t => t.failureReason === 'crashed_outside_track').length;
  const noMovesCount = tests.filter(t => t.failureReason === 'no_legal_moves').length;
  
  if (stuckCount > summary.totalTests * 0.4) {
    console.log('   🔄 HIGH STUCK RATE: AI frequently gets stuck in positions');
    console.log('   📝 Recommendation: Improve waypoint targeting and loop detection');
  }
  
  if (crashCount > summary.totalTests * 0.3) {
    console.log('   💥 HIGH CRASH RATE: AI frequently crashes outside track');
    console.log('   📝 Recommendation: Improve safety checking and speed management');
  }
  
  if (noMovesCount > 0) {
    console.log('   🚫 NO LEGAL MOVES: AI sometimes has no valid options');
    console.log('   📝 Recommendation: Implement emergency move handling');
  }
  
  // Specific technical recommendations
  console.log('\n📋 SPECIFIC TECHNICAL IMPROVEMENTS NEEDED:');
  
  if (summary.successfulLaps === 0) {
    console.log('   1. Review waypoint targeting algorithm');
    console.log('   2. Verify track boundary detection');
    console.log('   3. Check move legality validation');
    console.log('   4. Improve direction detection for counter-clockwise racing');
  }
  
  if (summary.stuckPositions.length > 0) {
    console.log('   5. Add stuck detection and recovery mechanisms');
    console.log('   6. Improve waypoint lookahead distance');
  }
  
  if (summary.commonFailurePoints.length > 0) {
    console.log('   7. Analyze specific failure locations for track geometry issues');
    console.log('   8. Add location-specific handling for problem areas');
  }
  
  console.log('\n🔧 NEXT STEPS:');
  console.log('   1. Run this test framework after each AI improvement');
  console.log('   2. Focus on fixing the most common failure reason first');
  console.log('   3. Use debug mode to trace AI decisions in problematic areas');
  console.log('   4. Implement fixes incrementally and test each change');
}

// Main execution
// Check if this file is being run directly (ES modules)
if (import.meta.url === `file://${process.argv[1]}`) {
  const results = runComprehensiveAITests();
  
  console.log('\n🎯 Testing complete! Use these results to guide AI improvements.');
  console.log('💾 Test data can be exported for further analysis if needed.');
}

// Export for use in other scripts (ES modules)
export {
  runComprehensiveAITests,
  runSingleAITest,
  TEST_CONFIG,
  AITestResults,
  generateTestReport
};
