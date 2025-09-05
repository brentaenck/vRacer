# Waypoint and Racing Line System - vRacer

This document describes the comprehensive waypoint and racing line system that powers AI behavior, debug visualization, and race strategy in vRacer.

## 🎯 System Overview

The vRacer waypoint system uses **`src/track-analysis.ts`** as the single source of truth for all racing line data. This centralized architecture ensures consistency across AI behavior, debug visualization, and game logic, eliminating duplication and maintaining synchronized behavior across all game systems.

## 🏗️ Central Architecture

### **Single Source of Truth Pattern**

All racing line data flows through a centralized analysis system:

```typescript
// Main entry point used by all game systems
export function createTrackAnalysis(
  outer: Vec[], 
  inner: Vec[], 
  startLine: Segment
): TrackAnalysis {
  return analyzeTrack(outer, inner, startLine)
}
```

**Integration Points:**
- **AI Players**: Use `findNearestRacingLinePoint()` for targeting decisions
- **Debug Visualization**: Renders waypoints with color-coded information
- **Lap Validation**: Uses checkpoints for proper lap completion tracking
- **Race Strategy**: Provides speed targets and brake zone information

## 📍 How Racing Lines Are Determined

### **Static Racing Line Definition**

The racing line consists of **statically defined waypoints** hard-coded in the source code, rather than being algorithmically generated at runtime. These waypoints follow professional racing principles:

#### **1. Track Analysis Process**

```typescript
export function analyzeTrack(
  outer: Vec[], 
  inner: Vec[], 
  startLine: Segment
): TrackAnalysis
```

The `analyzeTrack()` function processes track geometry to generate:

- **21 optimal racing waypoints** positioned for counter-clockwise racing
- **4 lap validation checkpoints** across track sections  
- **4 safe racing zones** (left, bottom, right, top)
- **Track bounds and geometry analysis data**

#### **2. Racing Philosophy Implementation**

The waypoints follow established racing line theory:

- **Outside-Inside-Outside Lines**: Wide entry, late apex, early exit for corners
- **Progressive Speed Management**: Brake → minimum corner speed → accelerate
- **Counter-Clockwise Optimization**: Tailored for the rectangular track layout
- **Speed Zone Classification**: Straights (3-4 speed), corners (2 speed), exits (3 speed)

#### **3. Waypoint Creation Process**

**Important Clarification**: The waypoints are **not** created through any runtime process or user interface. Instead:

- **Development Time**: Waypoints were designed by developers and hard-coded into `track-analysis.ts`
- **Compile Time**: Waypoints exist as static constants in the TypeScript source code
- **Runtime**: `analyzeTrack()` function simply returns the pre-defined waypoint array
- **No Dynamic Generation**: No algorithms create waypoints; they're fixed data structures

To modify waypoints, developers must:
1. Edit the `optimalRacingLine` array in `src/track-analysis.ts`
2. Recompile the application
3. Test the new racing line behavior

## 🗂️ Waypoint Data Structure

### **Racing Line Point Interface**

```typescript
export interface RacingLinePoint {
  pos: Vec                    // Position coordinates (x, y)
  targetSpeed: number         // Optimal speed (2-4 units)
  brakeZone: boolean         // Whether to brake before this point
  cornerType: 'straight' | 'entry' | 'apex' | 'exit'  // Racing behavior category
  safeZone: 'left' | 'right' | 'top' | 'bottom'      // Track section
}
```

### **Waypoint Categories**

#### **Corner Types**
- **`'straight'`**: High-speed sections, maintain or increase speed
- **`'entry'`**: Corner approach, prepare for braking
- **`'apex'`**: Tightest part of corner, minimum safe speed
- **`'exit'`**: Corner exit, begin acceleration

#### **Safe Zones**
- **`'left'`**: Left side of track, primary racing direction downward
- **`'bottom'`**: Bottom section, primary racing direction rightward  
- **`'right'`**: Right side, primary racing direction upward
- **`'top'`**: Top section, primary racing direction leftward

## 🏁 Racing Line Implementation

### **Statically Defined Optimal Path**

The racing line consists of 21 strategically placed waypoints, hard-coded in `src/track-analysis.ts`:

```typescript
const optimalRacingLine: RacingLinePoint[] = [
  // Start/finish area - positioned for straight-line approach
  { pos: { x: 7, y: 20 }, targetSpeed: 3, brakeZone: false, cornerType: 'straight', safeZone: 'left' },
  
  // Left side straight - gradual acceleration
  { pos: { x: 7, y: 23 }, targetSpeed: 3, brakeZone: false, cornerType: 'straight', safeZone: 'left' },
  { pos: { x: 7, y: 26 }, targetSpeed: 3, brakeZone: false, cornerType: 'straight', safeZone: 'left' },
  
  // Turn 1: Left to bottom (entry-apex-exit sequence)
  { pos: { x: 8, y: 28 }, targetSpeed: 2, brakeZone: true, cornerType: 'entry', safeZone: 'left' },
  { pos: { x: 12, y: 30 }, targetSpeed: 2, brakeZone: false, cornerType: 'apex', safeZone: 'bottom' },
  { pos: { x: 18, y: 29 }, targetSpeed: 3, brakeZone: false, cornerType: 'exit', safeZone: 'bottom' },
  
  // Bottom straight - high-speed section
  { pos: { x: 25, y: 29 }, targetSpeed: 4, brakeZone: false, cornerType: 'straight', safeZone: 'bottom' },
  { pos: { x: 32, y: 29 }, targetSpeed: 4, brakeZone: false, cornerType: 'straight', safeZone: 'bottom' },
  
  // Turn 2: Bottom to right (entry-apex-exit sequence)
  { pos: { x: 38, y: 28 }, targetSpeed: 2, brakeZone: true, cornerType: 'entry', safeZone: 'bottom' },
  { pos: { x: 42, y: 25 }, targetSpeed: 2, brakeZone: false, cornerType: 'apex', safeZone: 'right' },
  { pos: { x: 41, y: 20 }, targetSpeed: 3, brakeZone: false, cornerType: 'exit', safeZone: 'right' },
  
  // Right straight - maintain high speed
  { pos: { x: 41, y: 17 }, targetSpeed: 4, brakeZone: false, cornerType: 'straight', safeZone: 'right' },
  { pos: { x: 41, y: 14 }, targetSpeed: 4, brakeZone: false, cornerType: 'straight', safeZone: 'right' },
  
  // Turn 3: Right to top (entry-apex-exit sequence)
  { pos: { x: 38, y: 8 }, targetSpeed: 2, brakeZone: true, cornerType: 'entry', safeZone: 'right' },
  { pos: { x: 32, y: 5 }, targetSpeed: 2, brakeZone: false, cornerType: 'apex', safeZone: 'top' },
  { pos: { x: 25, y: 6 }, targetSpeed: 3, brakeZone: false, cornerType: 'exit', safeZone: 'top' },
  
  // Top straight - fast section
  { pos: { x: 20, y: 6 }, targetSpeed: 4, brakeZone: false, cornerType: 'straight', safeZone: 'top' },
  { pos: { x: 15, y: 6 }, targetSpeed: 4, brakeZone: false, cornerType: 'straight', safeZone: 'top' },
  
  // Turn 4: Top to left (entry-apex-exit sequence)
  { pos: { x: 10, y: 8 }, targetSpeed: 2, brakeZone: true, cornerType: 'entry', safeZone: 'top' },
  { pos: { x: 6, y: 12 }, targetSpeed: 2, brakeZone: false, cornerType: 'apex', safeZone: 'left' },
  { pos: { x: 7, y: 16 }, targetSpeed: 3, brakeZone: false, cornerType: 'exit', safeZone: 'left' }
]
```

### **Speed Optimization Strategy**

- **Straights**: 3-4 speed units for maximum velocity
- **Corner Entry**: 2 speed units with braking preparation
- **Apex Points**: 2 speed units (minimum safe cornering speed)
- **Corner Exit**: 3 speed units with acceleration preparation

## 🧭 Safe Zones and Direction Logic

### **Track Segmentation System**

The track is divided into four safe racing zones:

```typescript
const safeZones: SafeZone[] = [
  {
    name: 'left',
    bounds: { minX: 3, maxX: 11, minY: 3, maxY: 32 },
    direction: { x: 0.3, y: 1 } // Mainly downward for counter-clockwise
  },
  {
    name: 'bottom', 
    bounds: { minX: 3, maxX: 47, minY: 26, maxY: 32 },
    direction: { x: 1, y: -0.3 } // Mainly rightward for counter-clockwise
  },
  {
    name: 'right',
    bounds: { minX: 39, maxX: 47, minY: 3, maxY: 32 },
    direction: { x: -0.3, y: -1 } // Mainly upward for counter-clockwise
  },
  {
    name: 'top',
    bounds: { minX: 3, maxX: 47, minY: 3, maxY: 9 },
    direction: { x: -1, y: 0.3 } // Mainly leftward for counter-clockwise
  }
]
```

### **Dynamic Direction Determination**

```typescript
export function getExpectedRacingDirection(pos: Vec, analysis: TrackAnalysis): Vec {
  // Find which safe zone this position is in
  for (const zone of analysis.safeZones) {
    if (pos.x >= zone.bounds.minX && pos.x <= zone.bounds.maxX &&
        pos.y >= zone.bounds.minY && pos.y <= zone.bounds.maxY) {
      return zone.direction
    }
  }
  
  // Fallback: determine by position relative to track center
  const centerX = (analysis.trackBounds.minX + analysis.trackBounds.maxX) / 2
  const centerY = (analysis.trackBounds.minY + analysis.trackBounds.maxY) / 2
  
  // Counter-clockwise direction logic based on position
  if (analysis.racingDirection === 'counter-clockwise') {
    if (pos.x < centerX) return { x: 0.3, y: 1 }      // Left: go down
    else if (pos.x > centerX) return { x: -0.3, y: -1 } // Right: go up
    else if (pos.y < centerY) return { x: -1, y: 0.3 }  // Top: go left
    else return { x: 1, y: -0.3 }                       // Bottom: go right
  }
}
```

## 🎯 Waypoint Selection Algorithm

### **AI Targeting Logic**

The waypoint selection algorithm prioritizes forward-facing waypoints with optimal distances:

```typescript
export function findNearestRacingLinePoint(pos: Vec, analysis: TrackAnalysis): RacingLinePoint {
  const expectedDirection = getExpectedRacingDirection(pos, analysis)
  
  let bestIdx = 0
  let bestScore = -Infinity
  
  for (let i = 0; i < racingLine.length; i++) {
    const point = racingLine[i]
    const dist = distance(pos, point.pos)
    
    // Calculate direction alignment
    const dirVector = { x: point.pos.x - pos.x, y: point.pos.y - pos.y }
    const dirMagnitude = Math.hypot(dirVector.x, dirVector.y)
    
    if (dirMagnitude < 0.1) continue // Skip points too close
    
    const normalizedDir = {
      x: dirVector.x / dirMagnitude,
      y: dirVector.y / dirMagnitude
    }
    
    const alignment = normalizedDir.x * expectedDirection.x + normalizedDir.y * expectedDirection.y
    
    // Scoring algorithm
    let score = 0
    
    if (alignment > 0.3) { // Must be reasonably forward
      score = alignment * 100 // Strong bonus for forward direction
      
      // Distance scoring - prefer moderate distances (2-8 units)
      if (dist >= 2 && dist <= 8) {
        score += (8 - Math.abs(dist - 5)) * 10 // Peak at distance 5
      } else if (dist > 8 && dist <= 15) {
        score += (15 - dist) * 2 // Declining for far targets
      } else if (dist > 15) {
        score -= dist // Penalty for very far targets
      }
      
      // Bonus for closer targets when immediate guidance needed
      if (dist < 3) score += 20
    } else {
      // Heavy penalty for backward-pointing targets
      score = -100 - dist
    }
    
    if (score > bestScore) {
      bestScore = score
      bestIdx = i
    }
  }
  
  return racingLine[bestIdx] || racingLine[0] // Return best target or fallback
}
```

### **Scoring Priorities**

1. **Forward Alignment** (alignment > 0.3): Must point in racing direction
2. **Optimal Distance** (2-8 units): Prefer moderate distances for responsive targeting
3. **Immediate Guidance** (< 3 units): Bonus for close waypoints when needed
4. **Backward Penalty**: Heavy penalties for waypoints behind current position

## 📊 Lap Validation System

### **Checkpoint Placement**

Four checkpoints validate proper lap progression:

```typescript
const lapValidationCheckpoints: Segment[] = [
  // Checkpoint 0: Bottom side (first after start, counter-clockwise)
  { a: { x: 25, y: trackBounds.maxY }, b: { x: 25, y: innerBounds.maxY } },
  
  // Checkpoint 1: Right side (after turning from bottom)
  { a: { x: trackBounds.maxX, y: 17.5 }, b: { x: innerBounds.maxX, y: 17.5 } },
  
  // Checkpoint 2: Top side (after turning from right) 
  { a: { x: 25, y: innerBounds.minY }, b: { x: 25, y: trackBounds.minY } },
  
  // Checkpoint 3: Left side (after turning from top, before finish)
  { a: { x: innerBounds.minX, y: 17.5 }, b: { x: trackBounds.minX, y: 17.5 } }
]
```

### **Direction Validation**

```typescript
export function determineCrossingDirection(
  fromPos: Vec, 
  toPos: Vec, 
  startLine: Segment, 
  analysis: TrackAnalysis
): 'forward' | 'backward' {
  const lineY = startLine.a.y
  const fromSide = fromPos.y < lineY ? 'top' : 'bottom'
  const toSide = toPos.y < lineY ? 'top' : 'bottom'
  
  if (analysis.racingDirection === 'counter-clockwise') {
    // Cars should approach from above and cross downward
    if (fromSide === 'top' && toSide === 'bottom') return 'forward'
    else if (fromSide === 'bottom' && toSide === 'top') return 'backward'
  }
  
  return 'forward' // Default fallback
}
```

## 🔧 System Integration

### **Multi-System Usage**

The track analysis integrates seamlessly with multiple game systems:

#### **AI Player Integration**
```typescript
// AI players use consistent waypoint targeting
const targetWaypoint = findNearestRacingLinePoint(car.pos, trackAnalysis)
const moveScore = evaluateMove(move, targetWaypoint, trackAnalysis)
```

#### **Debug Visualization Integration**
```typescript
// Debug rendering uses same waypoint data
if (isFeatureEnabled('debugMode')) {
  drawRacingLineVisualization(ctx, trackAnalysis)
  drawAITargetVisualization(ctx, cars, trackAnalysis)
}
```

#### **Lap Validation Integration**
```typescript
// Checkpoint crossing uses centralized direction logic
const crossDirection = determineCrossingDirection(fromPos, toPos, startLine, trackAnalysis)
if (crossDirection === 'forward') validateLapProgression(car)
```

### **Data Flow Architecture**

```
Game State Geometry → createTrackAnalysis() → TrackAnalysis Object
                                                      ↓
                              ┌─────────────────────────────────────┐
                              ↓                     ↓               ↓
                        AI Targeting      Debug Visualization   Lap Validation
                              ↓                     ↓               ↓  
                    findNearestRacingLinePoint()  Waypoint Rendering  Checkpoint Logic
```

## 🎮 Debug Visualization Integration

### **Visual Waypoint System**

When `debugMode: true`, the system renders:

- **Gray dashed racing line**: Connects all 21 waypoints in sequence
- **Color-coded waypoint circles**:
  - 🟢 **Green**: Straights
  - 🟠 **Orange**: Corner entries  
  - 🔴 **Red**: Apex points
  - 🔵 **Blue**: Corner exits
- **Speed labels**: Target speeds displayed next to waypoints
- **Brake zone indicators**: Orange circles around braking waypoints
- **AI targeting lines**: Show current AI waypoint selections

### **Checkpoint Visualization**

- **Colored checkpoint lines**: Yellow, Cyan, Magenta, Green for CP0-CP3
- **Track section labels**: "CP0", "CP1", "CP2", "CP3" at midpoints
- **Semi-transparent rendering**: 0.7 alpha for non-intrusive display

## 🚀 Performance and Benefits

### **System Advantages**

✅ **Consistency**: All game systems use identical waypoint data  
✅ **Performance**: Statically defined racing lines optimized for rectangular track
✅ **Maintainability**: Single point of modification for racing line changes  
✅ **Extensibility**: Architecture supports different track layouts  
✅ **Racing Realism**: Follows professional racing line theory  
✅ **Debug Transparency**: Visual system matches AI behavior exactly  

### **Performance Characteristics**

- **Build Size Impact**: Minimal (waypoints are small data structures)
- **Runtime Efficiency**: O(n) waypoint selection with n=21 waypoints
- **Memory Usage**: Static waypoint data, no dynamic generation
- **Scalability**: System handles multiple AI players efficiently

## 📁 Related Files

- **`src/track-analysis.ts`**: Central waypoint and racing line system
- **`src/game.ts`**: Game state integration and debug visualization
- **`src/ai.ts`**: AI player waypoint targeting implementation
- **`src/features.ts`**: Feature flags for debug mode activation
- **`DEBUG_VISUALIZATION.md`**: Detailed debug rendering documentation

## 🔮 Future Enhancements

### **Potential Improvements**

- **Multi-Track Support**: Extend system for different track layouts
- **Dynamic Racing Lines**: Adaptive waypoints based on race conditions
- **Weather Integration**: Speed adjustments for track conditions  
- **Overtaking Lines**: Alternative racing lines for strategic positioning
- **Track Editor Integration**: Visual waypoint editing capabilities

---

*Last updated: 2025-01-03*  
*Status: Fully implemented and integrated across all game systems*
