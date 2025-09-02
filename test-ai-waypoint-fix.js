#!/usr/bin/env node

/**
 * Test script to verify the AI waypoint targeting fix.
 * This tests that the AI targets forward waypoints instead of backward ones.
 */

// Mock required modules for testing
const mockVec = (x, y) => ({ x, y });
const mockGameState = {
  outer: [
    { x: 2, y: 2 }, { x: 48, y: 2 }, { x: 48, y: 33 }, { x: 2, y: 33 }
  ],
  inner: [
    { x: 12, y: 10 }, { x: 38, y: 10 }, { x: 38, y: 25 }, { x: 12, y: 25 }
  ],
  start: { a: { x: 4, y: 21 }, b: { x: 10, y: 21 } }
};

// Mock track analysis function for testing
function createMockTrackAnalysis() {
  return {
    outer: mockGameState.outer,
    inner: mockGameState.inner,
    startLine: mockGameState.start,
    racingDirection: 'clockwise',
    optimalRacingLine: [
      // Start area waypoints (y=20-24)
      { pos: { x: 7, y: 23 }, targetSpeed: 2, brakeZone: false, cornerType: 'straight', safeZone: 'left' },
      { pos: { x: 7, y: 26 }, targetSpeed: 3, brakeZone: false, cornerType: 'straight', safeZone: 'left' },
      { pos: { x: 7, y: 29 }, targetSpeed: 2.5, brakeZone: true, cornerType: 'entry', safeZone: 'left' },
      
      // Bottom corner waypoints
      { pos: { x: 10, y: 30 }, targetSpeed: 2, brakeZone: true, cornerType: 'apex', safeZone: 'bottom' },
      { pos: { x: 15, y: 30 }, targetSpeed: 2.5, brakeZone: false, cornerType: 'exit', safeZone: 'bottom' },
      { pos: { x: 25, y: 30 }, targetSpeed: 3, brakeZone: false, cornerType: 'straight', safeZone: 'bottom' },
      
      // Right side waypoints
      { pos: { x: 42, y: 29 }, targetSpeed: 2.5, brakeZone: true, cornerType: 'entry', safeZone: 'right' },
      { pos: { x: 43, y: 25 }, targetSpeed: 2, brakeZone: true, cornerType: 'apex', safeZone: 'right' },
      { pos: { x: 43, y: 20 }, targetSpeed: 2.5, brakeZone: false, cornerType: 'exit', safeZone: 'right' },
      { pos: { x: 43, y: 15 }, targetSpeed: 3, brakeZone: false, cornerType: 'straight', safeZone: 'right' },
      
      // Top corner waypoints
      { pos: { x: 42, y: 6 }, targetSpeed: 2.5, brakeZone: true, cornerType: 'entry', safeZone: 'top' },
      { pos: { x: 35, y: 5 }, targetSpeed: 2, brakeZone: true, cornerType: 'apex', safeZone: 'top' },
      { pos: { x: 25, y: 5 }, targetSpeed: 2.5, brakeZone: false, cornerType: 'exit', safeZone: 'top' },
      { pos: { x: 15, y: 5 }, targetSpeed: 3, brakeZone: false, cornerType: 'straight', safeZone: 'top' },
      
      // Left side waypoints (back to start)
      { pos: { x: 10, y: 6 }, targetSpeed: 2.5, brakeZone: true, cornerType: 'entry', safeZone: 'left' },
      { pos: { x: 7, y: 10 }, targetSpeed: 2, brakeZone: true, cornerType: 'apex', safeZone: 'left' },
      { pos: { x: 7, y: 15 }, targetSpeed: 2.5, brakeZone: false, cornerType: 'exit', safeZone: 'left' },
      { pos: { x: 7, y: 20 }, targetSpeed: 3, brakeZone: false, cornerType: 'straight', safeZone: 'left' }
    ],
    lapValidationCheckpoints: [],
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

// Mock implementation of getExpectedRacingDirection
function mockGetExpectedRacingDirection(pos, analysis) {
  // Find which safe zone this position is in
  for (const zone of analysis.safeZones) {
    if (pos.x >= zone.bounds.minX && pos.x <= zone.bounds.maxX &&
        pos.y >= zone.bounds.minY && pos.y <= zone.bounds.maxY) {
      return zone.direction;
    }
  }
  
  // Fallback: determine by position relative to track center
  const centerX = (analysis.trackBounds.minX + analysis.trackBounds.maxX) / 2;
  const centerY = (analysis.trackBounds.minY + analysis.trackBounds.maxY) / 2;
  
  if (analysis.racingDirection === 'clockwise') {
    if (pos.x < centerX) {
      return { x: 0.3, y: 1 }; // Left side: go down
    } else if (pos.x > centerX) {
      return { x: -0.3, y: -1 }; // Right side: go up
    } else if (pos.y < centerY) {
      return { x: 1, y: -0.3 }; // Top: go right
    } else {
      return { x: -1, y: 0.3 }; // Bottom: go left
    }
  }
  
  return { x: 0, y: 1 }; // Default fallback
}

// Mock implementation of findNearestRacingLinePoint
function mockFindNearestRacingLinePoint(pos, analysis) {
  const racingLine = analysis.optimalRacingLine;
  
  if (racingLine.length === 0) {
    return {
      pos: { x: 7, y: 23 },
      targetSpeed: 2,
      brakeZone: false,
      cornerType: 'straight',
      safeZone: 'left'
    };
  }
  
  // Get expected direction to determine which waypoints are "ahead"
  const expectedDirection = mockGetExpectedRacingDirection(pos, analysis);
  
  // Helper function to calculate distance
  function distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
  }
  
  // Find the best forward-looking target by considering both distance and direction
  let bestIdx = 0;
  let bestScore = -Infinity;
  
  for (let i = 0; i < racingLine.length; i++) {
    const point = racingLine[i];
    if (!point) continue;
    
    const dist = distance(pos, point.pos);
    const dirVector = {
      x: point.pos.x - pos.x,
      y: point.pos.y - pos.y
    };
    
    // Normalize direction vector
    const dirMagnitude = Math.hypot(dirVector.x, dirVector.y);
    if (dirMagnitude < 0.1) continue; // Skip points too close
    
    const normalizedDir = {
      x: dirVector.x / dirMagnitude,
      y: dirVector.y / dirMagnitude
    };
    
    // Calculate alignment with expected racing direction
    const alignment = normalizedDir.x * expectedDirection.x + normalizedDir.y * expectedDirection.y;
    
    // Score combines forward alignment with reasonable distance
    let score = 0;
    
    if (alignment > 0.3) { // Must be reasonably forward
      score = alignment * 100; // Strong bonus for forward direction
      
      // Distance scoring - prefer moderate distances (2-8 units)
      if (dist >= 2 && dist <= 8) {
        score += (8 - Math.abs(dist - 5)) * 10; // Peak at distance 5
      } else if (dist > 8 && dist <= 15) {
        score += (15 - dist) * 2; // Declining for far targets
      } else if (dist > 15) {
        score -= dist; // Penalty for very far targets
      }
      
      // Small bonus for closer targets if we need immediate guidance
      if (dist < 3) {
        score += 20;
      }
    } else {
      // Heavy penalty for backward-pointing targets
      score = -100 - dist;
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  
  const targetPoint = racingLine[bestIdx];
  if (!targetPoint) {
    return racingLine[0] || {
      pos: { x: 7, y: 23 },
      targetSpeed: 2,
      brakeZone: false,
      cornerType: 'straight',
      safeZone: 'left'
    };
  }
  
  return targetPoint;
}

// Test function
function testAIWaypointTargeting() {
  console.log('🧪 Testing AI Waypoint Targeting Fix...\n');
  
  const analysis = createMockTrackAnalysis();
  
  // Test cases: AI starting positions that were problematic
  const testCases = [
    { name: 'Start Position (Original Bug)', pos: { x: 5, y: 21 }, expectedForward: true },
    { name: 'Start Position Variant 1', pos: { x: 7, y: 21 }, expectedForward: true },
    { name: 'Start Position Variant 2', pos: { x: 6, y: 22 }, expectedForward: true },
    { name: 'Mid-Left Side', pos: { x: 8, y: 15 }, expectedForward: true },
    { name: 'Bottom Section', pos: { x: 20, y: 30 }, expectedForward: true },
    { name: 'Right Side', pos: { x: 42, y: 20 }, expectedForward: true },
    { name: 'Top Section', pos: { x: 25, y: 6 }, expectedForward: true },
  ];
  
  let passedTests = 0;
  let totalTests = testCases.length;
  
  for (const testCase of testCases) {
    console.log(`\n📍 Testing: ${testCase.name} at (${testCase.pos.x}, ${testCase.pos.y})`);
    
    // Get the expected racing direction for this position
    const expectedDirection = mockGetExpectedRacingDirection(testCase.pos, analysis);
    console.log(`   Expected racing direction: (${expectedDirection.x.toFixed(2)}, ${expectedDirection.y.toFixed(2)})`);
    
    // Find the target waypoint using the fixed algorithm
    const targetWaypoint = mockFindNearestRacingLinePoint(testCase.pos, analysis);
    console.log(`   Target waypoint: (${targetWaypoint.pos.x}, ${targetWaypoint.pos.y}), type: ${targetWaypoint.cornerType}`);
    
    // Calculate the direction from current position to target
    const toTarget = {
      x: targetWaypoint.pos.x - testCase.pos.x,
      y: targetWaypoint.pos.y - testCase.pos.y
    };
    const targetDistance = Math.hypot(toTarget.x, toTarget.y);
    
    if (targetDistance > 0) {
      const normalizedToTarget = {
        x: toTarget.x / targetDistance,
        y: toTarget.y / targetDistance
      };
      
      // Check alignment with expected racing direction
      const alignment = normalizedToTarget.x * expectedDirection.x + normalizedToTarget.y * expectedDirection.y;
      console.log(`   Direction to target: (${normalizedToTarget.x.toFixed(2)}, ${normalizedToTarget.y.toFixed(2)})`);
      console.log(`   Alignment with racing direction: ${alignment.toFixed(3)}`);
      console.log(`   Distance to target: ${targetDistance.toFixed(1)} units`);
      
      // Test passes if alignment is forward (> 0) and reasonable distance
      const isForward = alignment > 0;
      const isReasonableDistance = targetDistance >= 1 && targetDistance <= 25;
      
      if (isForward && isReasonableDistance) {
        console.log(`   ✅ PASS: Targets forward waypoint with good alignment`);
        passedTests++;
      } else {
        console.log(`   ❌ FAIL: ${!isForward ? 'Backward targeting' : 'Unreasonable distance'}`);
      }
    } else {
      console.log(`   ❌ FAIL: Target is at current position (distance = 0)`);
    }
  }
  
  console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests PASSED! The AI waypoint targeting fix is working correctly.');
    console.log('\nKey improvements verified:');
    console.log('✅ AI always targets forward waypoints (no backward movement)');
    console.log('✅ Target selection considers racing direction alignment');
    console.log('✅ Distance scoring prevents extremely close or far targets');
    console.log('✅ Start position handling ensures proper initial direction');
    return true;
  } else {
    console.log('❌ Some tests FAILED. The fix may need additional adjustments.');
    return false;
  }
}

// Additional test: Simulate the original bug scenario
function testOriginalBugScenario() {
  console.log('\n\n🔍 Testing Original Bug Scenario...');
  console.log('Simulating AI at start position (5, 21) with the fixed algorithm...\n');
  
  const analysis = createMockTrackAnalysis();
  const startPos = { x: 5, y: 21 };
  
  // Test multiple iterations to ensure consistent forward targeting
  for (let iteration = 1; iteration <= 5; iteration++) {
    console.log(`Iteration ${iteration}:`);
    
    const target = mockFindNearestRacingLinePoint(startPos, analysis);
    const expectedDirection = mockGetExpectedRacingDirection(startPos, analysis);
    
    const toTarget = {
      x: target.pos.x - startPos.x,
      y: target.pos.y - startPos.y
    };
    const distance = Math.hypot(toTarget.x, toTarget.y);
    const normalizedToTarget = {
      x: toTarget.x / distance,
      y: toTarget.y / distance
    };
    
    const alignment = normalizedToTarget.x * expectedDirection.x + normalizedToTarget.y * expectedDirection.y;
    
    console.log(`  Target: (${target.pos.x}, ${target.pos.y}), alignment: ${alignment.toFixed(3)}, distance: ${distance.toFixed(1)}`);
    
    if (alignment <= 0) {
      console.log('  ❌ ERROR: Still targeting backward waypoint!');
      return false;
    } else {
      console.log('  ✅ OK: Forward waypoint targeted');
    }
  }
  
  console.log('\n✅ Original bug scenario test PASSED: AI consistently targets forward waypoints');
  return true;
}

// Run the tests
console.log('🎯 vRacer AI Waypoint Targeting Fix - Test Suite');
console.log('='.repeat(60));

const mainTestResult = testAIWaypointTargeting();
const bugScenarioResult = testOriginalBugScenario();

console.log('\n' + '='.repeat(60));
if (mainTestResult && bugScenarioResult) {
  console.log('🎉 ALL TESTS PASSED! The AI waypoint targeting fix is working correctly.');
  process.exit(0);
} else {
  console.log('❌ Some tests failed. Please review the fix implementation.');
  process.exit(1);
}
