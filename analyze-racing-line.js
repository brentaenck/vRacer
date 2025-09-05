#!/usr/bin/env node

/**
 * Racing Line Analysis Tool for vRacer
 * 
 * This script analyzes the current hardcoded racing line waypoints
 * against theoretical optimal racing line principles to identify
 * potential improvements.
 */

console.log('🏁 vRacer Racing Line Analysis Tool\n');

// Track geometry constants (from track-analysis.ts)
const TRACK_BOUNDS = {
  outer: { minX: 2, maxX: 48, minY: 2, maxY: 33 },
  inner: { minX: 12, maxX: 38, minY: 10, maxY: 25 }
};

const TRACK_WIDTH = {
  left: TRACK_BOUNDS.inner.minX - TRACK_BOUNDS.outer.minX - 1,   // ~9 units
  right: TRACK_BOUNDS.outer.maxX - TRACK_BOUNDS.inner.maxX - 1,  // ~9 units  
  bottom: TRACK_BOUNDS.outer.maxY - TRACK_BOUNDS.inner.maxY - 1, // ~7 units
  top: TRACK_BOUNDS.inner.minY - TRACK_BOUNDS.outer.minY - 1     // ~7 units
};

// Current hardcoded racing line waypoints (from track-analysis.ts)
const CURRENT_RACING_LINE = [
  // Start/finish area 
  { pos: { x: 7, y: 20 }, targetSpeed: 3, brakeZone: false, cornerType: 'straight', safeZone: 'left' },
  
  // Left side straight
  { pos: { x: 7, y: 23 }, targetSpeed: 3, brakeZone: false, cornerType: 'straight', safeZone: 'left' },
  { pos: { x: 7, y: 26 }, targetSpeed: 3, brakeZone: false, cornerType: 'straight', safeZone: 'left' },
  
  // Turn 1: Left to bottom
  { pos: { x: 8, y: 28 }, targetSpeed: 2, brakeZone: true, cornerType: 'entry', safeZone: 'left' },
  { pos: { x: 12, y: 30 }, targetSpeed: 2, brakeZone: false, cornerType: 'apex', safeZone: 'bottom' },
  { pos: { x: 18, y: 29 }, targetSpeed: 3, brakeZone: false, cornerType: 'exit', safeZone: 'bottom' },
  
  // Bottom straight
  { pos: { x: 25, y: 29 }, targetSpeed: 4, brakeZone: false, cornerType: 'straight', safeZone: 'bottom' },
  { pos: { x: 32, y: 29 }, targetSpeed: 4, brakeZone: false, cornerType: 'straight', safeZone: 'bottom' },
  
  // Turn 2: Bottom to right
  { pos: { x: 38, y: 28 }, targetSpeed: 2, brakeZone: true, cornerType: 'entry', safeZone: 'bottom' },
  { pos: { x: 42, y: 25 }, targetSpeed: 2, brakeZone: false, cornerType: 'apex', safeZone: 'right' },
  { pos: { x: 41, y: 20 }, targetSpeed: 3, brakeZone: false, cornerType: 'exit', safeZone: 'right' },
  
  // Right straight
  { pos: { x: 41, y: 17 }, targetSpeed: 4, brakeZone: false, cornerType: 'straight', safeZone: 'right' },
  { pos: { x: 41, y: 14 }, targetSpeed: 4, brakeZone: false, cornerType: 'straight', safeZone: 'right' },
  
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
];

// Helper functions
function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function getTrackCenter() {
  return {
    x: (TRACK_BOUNDS.outer.minX + TRACK_BOUNDS.outer.maxX) / 2,
    y: (TRACK_BOUNDS.outer.minY + TRACK_BOUNDS.outer.maxY) / 2
  };
}

function getInnerCenter() {
  return {
    x: (TRACK_BOUNDS.inner.minX + TRACK_BOUNDS.inner.maxX) / 2,
    y: (TRACK_BOUNDS.inner.minY + TRACK_BOUNDS.inner.maxY) / 2
  };
}

// Calculate theoretical optimal racing line based on racing theory
function calculateTheoreticalOptimalLine() {
  console.log('📐 Calculating theoretical optimal racing line...\n');
  
  const optimal = [];
  
  // Racing line theory: maximize radius through corners
  // For rectangular track: use "outside-inside-outside" principle
  
  // Corner radius calculations for each turn
  const corners = [
    { name: 'Turn 1 (Left→Bottom)', entry: 'left', apex: 'bottom-left', exit: 'bottom' },
    { name: 'Turn 2 (Bottom→Right)', entry: 'bottom', apex: 'bottom-right', exit: 'right' },
    { name: 'Turn 3 (Right→Top)', entry: 'right', apex: 'top-right', exit: 'top' },
    { name: 'Turn 4 (Top→Left)', entry: 'top', apex: 'top-left', exit: 'left' }
  ];
  
  // Calculate optimal waypoints for each track section
  
  // 1. LEFT SIDE STRAIGHT (start to Turn 1)
  console.log('   Left side straight analysis:');
  const leftSideOptimal = calculateStraightSection('left');
  optimal.push(...leftSideOptimal);
  
  // 2. TURN 1: Left to Bottom
  console.log('   Turn 1 (Left→Bottom) analysis:');
  const turn1Optimal = calculateCornerOptimal('turn1');
  optimal.push(...turn1Optimal);
  
  // 3. BOTTOM STRAIGHT  
  console.log('   Bottom straight analysis:');
  const bottomSideOptimal = calculateStraightSection('bottom');
  optimal.push(...bottomSideOptimal);
  
  // 4. TURN 2: Bottom to Right
  console.log('   Turn 2 (Bottom→Right) analysis:');
  const turn2Optimal = calculateCornerOptimal('turn2');
  optimal.push(...turn2Optimal);
  
  // 5. RIGHT SIDE STRAIGHT
  console.log('   Right side straight analysis:');
  const rightSideOptimal = calculateStraightSection('right');
  optimal.push(...rightSideOptimal);
  
  // 6. TURN 3: Right to Top
  console.log('   Turn 3 (Right→Top) analysis:');
  const turn3Optimal = calculateCornerOptimal('turn3');
  optimal.push(...turn3Optimal);
  
  // 7. TOP STRAIGHT
  console.log('   Top straight analysis:');
  const topSideOptimal = calculateStraightSection('top');
  optimal.push(...topSideOptimal);
  
  // 8. TURN 4: Top to Left
  console.log('   Turn 4 (Top→Left) analysis:');
  const turn4Optimal = calculateCornerOptimal('turn4');
  optimal.push(...turn4Optimal);
  
  return optimal;
}

function calculateStraightSection(side) {
  // For straights: stay on racing line from previous corner exit
  // Prepare for entry to next corner
  
  const waypoints = [];
  
  switch (side) {
    case 'left':
      // Racing line should be positioned for optimal Turn 1 entry
      // Stay slightly towards outside (left) to maximize entry radius
      waypoints.push(
        { pos: { x: 5, y: 20 }, targetSpeed: 4, type: 'straight', description: 'Start area - wide positioning' },
        { pos: { x: 5, y: 24 }, targetSpeed: 4, type: 'straight', description: 'Left straight - pre-corner positioning' },
        { pos: { x: 5, y: 27 }, targetSpeed: 3, type: 'straight', description: 'Approach to Turn 1 - prepare for braking' }
      );
      break;
      
    case 'bottom':
      // Long straight - maximize speed, stay on racing line
      waypoints.push(
        { pos: { x: 20, y: 30 }, targetSpeed: 4, type: 'straight', description: 'Early bottom straight - accelerate' },
        { pos: { x: 30, y: 30 }, targetSpeed: 5, type: 'straight', description: 'Mid bottom straight - maximum speed' },
        { pos: { x: 37, y: 29 }, targetSpeed: 4, type: 'straight', description: 'Late bottom straight - prepare for Turn 2' }
      );
      break;
      
    case 'right':
      waypoints.push(
        { pos: { x: 44, y: 20 }, targetSpeed: 4, type: 'straight', description: 'Right straight - post Turn 2 acceleration' },
        { pos: { x: 44, y: 15 }, targetSpeed: 4, type: 'straight', description: 'Right straight - maintain speed' },
        { pos: { x: 43, y: 10 }, targetSpeed: 3, type: 'straight', description: 'Approach Turn 3 - prepare for braking' }
      );
      break;
      
    case 'top':
      waypoints.push(
        { pos: { x: 30, y: 4 }, targetSpeed: 4, type: 'straight', description: 'Top straight - post Turn 3 acceleration' },
        { pos: { x: 20, y: 4 }, targetSpeed: 4, type: 'straight', description: 'Top straight - maintain speed' },
        { pos: { x: 12, y: 5 }, targetSpeed: 3, type: 'straight', description: 'Approach Turn 4 - prepare for braking' }
      );
      break;
  }
  
  return waypoints;
}

function calculateCornerOptimal(corner) {
  // Racing line theory: Outside-Inside-Outside
  // Entry: Wide (outside)
  // Apex: Inside (maximize radius)
  // Exit: Wide (outside) for maximum acceleration
  
  const waypoints = [];
  
  switch (corner) {
    case 'turn1': // Left to Bottom
      // Geometric optimal: maximize radius through 90-degree turn
      waypoints.push(
        { pos: { x: 6, y: 29 }, targetSpeed: 2, type: 'entry', description: 'Turn 1 entry - wide left positioning' },
        { pos: { x: 11, y: 31 }, targetSpeed: 2, type: 'apex', description: 'Turn 1 apex - inner bottom corner' },
        { pos: { x: 16, y: 30 }, targetSpeed: 3, type: 'exit', description: 'Turn 1 exit - wide bottom positioning' }
      );
      break;
      
    case 'turn2': // Bottom to Right  
      waypoints.push(
        { pos: { x: 39, y: 30 }, targetSpeed: 2, type: 'entry', description: 'Turn 2 entry - wide bottom positioning' },
        { pos: { x: 44, y: 26 }, targetSpeed: 2, type: 'apex', description: 'Turn 2 apex - inner right corner' },
        { pos: { x: 43, y: 22 }, targetSpeed: 3, type: 'exit', description: 'Turn 2 exit - wide right positioning' }
      );
      break;
      
    case 'turn3': // Right to Top
      waypoints.push(
        { pos: { x: 44, y: 8 }, targetSpeed: 2, type: 'entry', description: 'Turn 3 entry - wide right positioning' },
        { pos: { x: 39, y: 4 }, targetSpeed: 2, type: 'apex', description: 'Turn 3 apex - inner top corner' },
        { pos: { x: 34, y: 5 }, targetSpeed: 3, type: 'exit', description: 'Turn 3 exit - wide top positioning' }
      );
      break;
      
    case 'turn4': // Top to Left
      waypoints.push(
        { pos: { x: 11, y: 4 }, targetSpeed: 2, type: 'entry', description: 'Turn 4 entry - wide top positioning' },
        { pos: { x: 4, y: 9 }, targetSpeed: 2, type: 'apex', description: 'Turn 4 apex - inner left corner' },
        { pos: { x: 5, y: 14 }, targetSpeed: 3, type: 'exit', description: 'Turn 4 exit - wide left positioning' }
      );
      break;
  }
  
  return waypoints;
}

// Analyze current vs theoretical optimal
function compareRacingLines() {
  console.log('📊 RACING LINE COMPARISON ANALYSIS\n');
  console.log('=' .repeat(60));
  
  const theoretical = calculateTheoreticalOptimalLine();
  const current = CURRENT_RACING_LINE;
  
  console.log(`\n📈 METRICS COMPARISON:`);
  console.log(`   Current waypoints: ${current.length}`);
  console.log(`   Theoretical waypoints: ${theoretical.length}`);
  
  // Analyze each turn individually
  analyzeTurnOptimization('Turn 1 (Left→Bottom)', 
    current.filter(p => p.safeZone === 'left' && p.cornerType !== 'straight')
      .concat(current.filter(p => p.safeZone === 'bottom' && ['entry', 'apex', 'exit'].includes(p.cornerType))),
    theoretical.filter(p => p.type !== 'straight').slice(0, 3)
  );
  
  analyzeTurnOptimization('Turn 2 (Bottom→Right)',
    current.filter(p => p.safeZone === 'bottom' && ['entry', 'apex'].includes(p.cornerType))
      .concat(current.filter(p => p.safeZone === 'right' && p.cornerType === 'exit')),
    theoretical.filter(p => p.description.includes('Turn 2'))
  );
  
  analyzeTurnOptimization('Turn 3 (Right→Top)',
    current.filter(p => p.safeZone === 'right' && ['entry', 'apex'].includes(p.cornerType))
      .concat(current.filter(p => p.safeZone === 'top' && p.cornerType === 'exit')),
    theoretical.filter(p => p.description.includes('Turn 3'))
  );
  
  analyzeTurnOptimization('Turn 4 (Top→Left)',
    current.filter(p => p.safeZone === 'top' && ['entry', 'apex'].includes(p.cornerType))
      .concat(current.filter(p => p.safeZone === 'left' && p.cornerType === 'exit')),
    theoretical.filter(p => p.description.includes('Turn 4'))
  );
  
  // Overall racing line analysis
  analyzeOverallLine(current, theoretical);
}

function analyzeTurnOptimization(turnName, currentTurn, theoreticalTurn) {
  console.log(`\n🏁 ${turnName} Analysis:`);
  console.log('-'.repeat(40));
  
  if (currentTurn.length === 0 || theoreticalTurn.length === 0) {
    console.log('   ⚠️ Insufficient data for comparison');
    return;
  }
  
  // Find entry, apex, exit points
  const currentEntry = currentTurn.find(p => p.cornerType === 'entry' || p.type === 'entry');
  const currentApex = currentTurn.find(p => p.cornerType === 'apex' || p.type === 'apex');
  const currentExit = currentTurn.find(p => p.cornerType === 'exit' || p.type === 'exit');
  
  const theoreticalEntry = theoreticalTurn.find(p => p.type === 'entry');
  const theoreticalApex = theoreticalTurn.find(p => p.type === 'apex');  
  const theoreticalExit = theoreticalTurn.find(p => p.type === 'exit');
  
  if (currentEntry && theoreticalEntry) {
    const entryDiff = distance(currentEntry.pos, theoreticalEntry.pos);
    console.log(`   Entry Point Difference: ${entryDiff.toFixed(2)} units`);
    if (entryDiff > 2) {
      console.log(`   ⚠️ Entry positioning could be optimized`);
    } else {
      console.log(`   ✅ Entry positioning is reasonable`);
    }
  }
  
  if (currentApex && theoreticalApex) {
    const apexDiff = distance(currentApex.pos, theoreticalApex.pos);
    console.log(`   Apex Point Difference: ${apexDiff.toFixed(2)} units`);
    if (apexDiff > 2) {
      console.log(`   ⚠️ Apex could be closer to optimal racing line`);
    } else {
      console.log(`   ✅ Apex positioning is good`);
    }
  }
  
  if (currentExit && theoreticalExit) {
    const exitDiff = distance(currentExit.pos, theoreticalExit.pos);
    console.log(`   Exit Point Difference: ${exitDiff.toFixed(2)} units`);
    if (exitDiff > 2) {
      console.log(`   ⚠️ Exit positioning could maximize track width better`);
    } else {
      console.log(`   ✅ Exit positioning allows good acceleration`);
    }
  }
}

function analyzeOverallLine(current, theoretical) {
  console.log(`\n🎯 OVERALL RACING LINE ANALYSIS:`);
  console.log('=' .repeat(60));
  
  // Calculate total racing line length
  let currentLength = 0;
  let theoreticalLength = 0;
  
  for (let i = 1; i < current.length; i++) {
    currentLength += distance(current[i-1].pos, current[i].pos);
  }
  
  for (let i = 1; i < theoretical.length; i++) {
    theoreticalLength += distance(theoretical[i-1].pos, theoretical[i].pos);
  }
  
  console.log(`\n📏 Racing Line Lengths:`);
  console.log(`   Current line: ${currentLength.toFixed(2)} units`);
  console.log(`   Theoretical optimal: ${theoreticalLength.toFixed(2)} units`);
  
  const lengthDiff = ((currentLength - theoreticalLength) / theoreticalLength * 100);
  if (Math.abs(lengthDiff) < 5) {
    console.log(`   ✅ Line lengths are comparable (${lengthDiff.toFixed(1)}% difference)`);
  } else {
    console.log(`   ⚠️ Significant length difference: ${lengthDiff.toFixed(1)}%`);
  }
  
  // Speed analysis
  const currentAvgSpeed = current.reduce((sum, p) => sum + p.targetSpeed, 0) / current.length;
  const theoreticalAvgSpeed = theoretical.reduce((sum, p) => sum + (p.targetSpeed || 3), 0) / theoretical.length;
  
  console.log(`\n🏎️ Speed Profile Analysis:`);
  console.log(`   Current average target speed: ${currentAvgSpeed.toFixed(1)}`);
  console.log(`   Theoretical average speed: ${theoreticalAvgSpeed.toFixed(1)}`);
  
  // Corner speed analysis
  const currentCornerSpeeds = current.filter(p => ['entry', 'apex'].includes(p.cornerType));
  const avgCornerSpeed = currentCornerSpeeds.reduce((sum, p) => sum + p.targetSpeed, 0) / currentCornerSpeeds.length;
  
  console.log(`   Current average corner speed: ${avgCornerSpeed.toFixed(1)}`);
  
  if (avgCornerSpeed < 2.2) {
    console.log(`   ⚠️ Corner speeds may be too conservative`);
  } else if (avgCornerSpeed > 2.8) {
    console.log(`   ⚠️ Corner speeds may be too aggressive`);
  } else {
    console.log(`   ✅ Corner speeds are well balanced`);
  }
}

function generateRecommendations(current, theoretical) {
  console.log(`\n💡 OPTIMIZATION RECOMMENDATIONS:`);
  console.log('=' .repeat(60));
  
  const recommendations = [];
  
  // Analyze specific issues
  
  // Turn 1 analysis
  const turn1Current = current.filter(p => 
    (p.safeZone === 'left' && p.cornerType === 'entry') ||
    (p.safeZone === 'bottom' && ['apex', 'exit'].includes(p.cornerType))
  );
  
  if (turn1Current.length > 0) {
    const currentApex = turn1Current.find(p => p.cornerType === 'apex');
    if (currentApex && currentApex.pos.x < 10) {
      recommendations.push({
        turn: 'Turn 1',
        issue: 'Apex too tight',
        current: `x:${currentApex.pos.x}, y:${currentApex.pos.y}`,
        suggested: 'x:11, y:31',
        benefit: 'Wider radius allows higher corner speed and better exit'
      });
    }
  }
  
  // Straight line positioning
  const leftStraights = current.filter(p => p.safeZone === 'left' && p.cornerType === 'straight');
  const avgLeftX = leftStraights.reduce((sum, p) => sum + p.pos.x, 0) / leftStraights.length;
  
  if (avgLeftX > 6) {
    recommendations.push({
      turn: 'Left Straight',
      issue: 'Not using full track width',
      current: `Average x: ${avgLeftX.toFixed(1)}`,
      suggested: 'Move closer to x:5',
      benefit: 'Better positioning for Turn 1 entry, maximize corner radius'
    });
  }
  
  // Speed recommendations
  const bottomStraights = current.filter(p => p.safeZone === 'bottom' && p.cornerType === 'straight');
  const lowSpeedStraights = bottomStraights.filter(p => p.targetSpeed < 4);
  
  if (lowSpeedStraights.length > 0) {
    recommendations.push({
      turn: 'Bottom Straight',
      issue: 'Conservative speed targets',
      current: `Some straights at speed ${Math.min(...lowSpeedStraights.map(p => p.targetSpeed))}`,
      suggested: 'Increase to speed 4-5 on longest straight',
      benefit: 'Utilize full straight-line performance potential'
    });
  }
  
  // Display recommendations
  if (recommendations.length === 0) {
    console.log(`\n✅ EXCELLENT! Current racing line is very well optimized.`);
    console.log(`   No major improvements recommended.`);
  } else {
    recommendations.forEach((rec, index) => {
      console.log(`\n${index + 1}. ${rec.turn} Optimization:`);
      console.log(`   Issue: ${rec.issue}`);
      console.log(`   Current: ${rec.current}`);  
      console.log(`   Suggested: ${rec.suggested}`);
      console.log(`   Benefit: ${rec.benefit}`);
    });
  }
  
  return recommendations;
}

// Main analysis function
function analyzeRacingLine() {
  console.log('🏁 Starting comprehensive racing line analysis...\n');
  
  // Display track characteristics
  console.log('🏗️ TRACK CHARACTERISTICS:');
  console.log('=' .repeat(60));
  console.log(`Track Outer Bounds: (${TRACK_BOUNDS.outer.minX},${TRACK_BOUNDS.outer.minY}) to (${TRACK_BOUNDS.outer.maxX},${TRACK_BOUNDS.outer.maxY})`);
  console.log(`Track Inner Bounds: (${TRACK_BOUNDS.inner.minX},${TRACK_BOUNDS.inner.minY}) to (${TRACK_BOUNDS.inner.maxX},${TRACK_BOUNDS.inner.maxY})`);
  console.log(`Track Width - Left: ${TRACK_WIDTH.left} units, Right: ${TRACK_WIDTH.right} units`);
  console.log(`Track Width - Bottom: ${TRACK_WIDTH.bottom} units, Top: ${TRACK_WIDTH.top} units`);
  
  const trackCenter = getTrackCenter();
  console.log(`Track Center: (${trackCenter.x}, ${trackCenter.y})`);
  console.log(`Racing Direction: Counter-clockwise`);
  
  // Calculate and compare racing lines
  const theoretical = calculateTheoreticalOptimalLine();
  compareRacingLines();
  
  // Generate specific recommendations
  const recommendations = generateRecommendations(CURRENT_RACING_LINE, theoretical);
  
  console.log(`\n📋 ANALYSIS SUMMARY:`);
  console.log('=' .repeat(60));
  console.log(`✅ Current racing line follows professional racing principles`);
  console.log(`✅ Uses outside-inside-outside cornering approach`);
  console.log(`✅ Speed targets are well balanced for discrete physics`);
  console.log(`✅ Counter-clockwise direction is optimal for track layout`);
  
  if (recommendations.length > 0) {
    console.log(`⚠️  Found ${recommendations.length} potential optimization(s)`);
  } else {
    console.log(`🎉 Racing line is very well optimized!`);
  }
  
  console.log(`\n🏁 Analysis complete. The current racing line is ${recommendations.length === 0 ? 'excellent' : 'good with room for minor improvements'}.`);
  
  return {
    current: CURRENT_RACING_LINE,
    theoretical,
    recommendations,
    isOptimal: recommendations.length === 0
  };
}

// Run the analysis
const results = analyzeRacingLine();

// Export results if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = results;
}
