# vRacer Coordinate System Documentation

## 📐 Overview

This document provides a complete reference for the graph paper grid coordinate system used in vRacer for positioning game elements, tracks, cars, and waypoints.

## 🎯 Core Coordinate System

### **Coordinate System Type**
vRacer uses a **standard computer graphics coordinate system** consistent with HTML5 Canvas:

- **Origin**: Top-left corner of the canvas
- **X-axis**: Left to Right (positive X increases rightward)
- **Y-axis**: Top to Bottom (positive Y increases downward)

### **📍 Origin Point {x:0, y:0}**
- **Location**: Top-left corner of the canvas
- **Visual Marker**: A small gray square (4x4 pixels) displayed when debug grid is enabled
- **Code Reference**: `ctx.fillRect(-2, -2, 4, 4)` in `drawEnhancedGrid()`

## 🧭 Axis Orientation and Visual Layout

```
    X-AXIS (Horizontal: Left → Right)
    0   5   10  15  20  25  30  35  40  45  X
  0 ┌─────────────────────────────────────────→
    │ ORIGIN
  5 │   ╔═══════════════════════════════════╗
    │   ║ TRACK OUTER BOUNDARY (2,2)-(48,33)║
 10 │   ║     ┌─────────────────────┐       ║
    │   ║     │ INNER (12,10)-(38,25)│       ║
 15 │   ║ ←─ START/FINISH (2,18)-(12,18)     ║
    │   ║     │                     │       ║
 20 │   ║  ●  │  ● = SPAWN (7,20)   │       ║ Y-AXIS
    │   ║     │                     │       ║ (Vertical:
 25 │   ║     └─────────────────────┘       ║  Top ↓ 
    │   ║                                   ║  Bottom)
 30 │   ║                                   ║
    │   ╚═══════════════════════════════════╝
 35 ▼
   Y
```

## 📏 Grid System Specifications

### **Grid Unit Conversion**
```typescript
const grid = 20 // pixels per grid unit
// Conversion: gameCoordinate * 20 = canvasPixels
```

### **Grid Line Types**
- **Major Grid Lines**: Every 5 units
  - Color: `#444` (brighter visibility)
  - Width: 1px
  - Include coordinate labels on edges
- **Minor Grid Lines**: Every 1 unit
  - Color: `#2a2a2a` (subtle)
  - Width: 0.5px
  - Semi-transparent (60% alpha)

### **Coordinate Labels**
- **X-axis Labels**: Bottom edge, every 2 units to avoid crowding
- **Y-axis Labels**: Left edge, every 2 units 
- **Major Coordinate Labels**: Top and right edges, every 10 units
- **Font**: `11px monospace` for consistency

## 🏁 Track Layout Coordinates

### **Track Boundaries**
```typescript
// Outer track boundary (rectangular)
const outer: Vec[] = [
  { x: 2, y: 2 },   // Top-left corner
  { x: 48, y: 2 },  // Top-right corner  
  { x: 48, y: 33 }, // Bottom-right corner
  { x: 2, y: 33 }   // Bottom-left corner
]

// Inner track boundary (rectangular hole)
const inner: Vec[] = [
  { x: 12, y: 10 }, // Inner top-left
  { x: 38, y: 10 }, // Inner top-right
  { x: 38, y: 25 }, // Inner bottom-right
  { x: 12, y: 25 }  // Inner bottom-left
]
```

### **Key Game Elements**

| Element | Coordinates | Description |
|---------|-------------|-------------|
| **Canvas Origin** | `{x: 0, y: 0}` | Top-left canvas corner |
| **Track Bounds** | `(2,2)` to `(48,33)` | 46×31 unit racing area |
| **Inner Bounds** | `(12,10)` to `(38,25)` | 26×15 unit obstacle |
| **Start/Finish Line** | `{x: 2, y: 18}` to `{x: 12, y: 18}` | 10-unit wide line |
| **Default Spawn** | `{x: 7, y: 20}` | Primary car starting position |
| **Track Width** | Left: 9, Right: 9, Top: 7, Bottom: 7 units | Available racing space |

## 🎯 Racing Line Waypoints

The hardcoded racing line uses these coordinate ranges:

### **Left Side (Safe Zone)**
- **X Range**: 5-12 units (utilizes left track width)
- **Y Range**: 8-31 units (full left side length)
- **Racing Direction**: Downward (positive Y)

### **Bottom Side (Safe Zone)**  
- **X Range**: 11-44 units (longest straight section)
- **Y Range**: 28-31 units (bottom track width)
- **Racing Direction**: Rightward (positive X)

### **Right Side (Safe Zone)**
- **X Range**: 38-47 units (utilizes right track width)  
- **Y Range**: 5-31 units (full right side length)
- **Racing Direction**: Upward (negative Y)

### **Top Side (Safe Zone)**
- **X Range**: 6-44 units (full top section)
- **Y Range**: 4-10 units (top track width)
- **Racing Direction**: Leftward (negative X)

## 🖱️ Mouse-to-Grid Conversion

### **Screen-to-Grid Function**
```typescript
export function screenToGrid(canvas: HTMLCanvasElement, g: number, x: number, y: number): Vec {
  const rect = canvas.getBoundingClientRect()
  const gx = (x - rect.left) / (rect.width) * canvas.width / g
  const gy = (y - rect.top) / (rect.height) * canvas.height / g
  return { x: gx, y: gy }
}
```

### **Conversion Process**
1. **Get canvas bounds**: `canvas.getBoundingClientRect()`
2. **Normalize to canvas**: Convert screen pixels to canvas pixels
3. **Scale to grid units**: Divide by grid size (20 pixels/unit)
4. **Return grid coordinates**: `{x: gx, y: gy}`

## 🎨 Visual Grid Features

### **Debug Grid Display**
When enabled via `showGrid: true`:

```typescript
// Origin marker
ctx.fillStyle = '#888'
ctx.fillRect(-2, -2, 4, 4)

// Grid transparency
ctx.globalAlpha = 0.6

// Color scheme
major_lines: '#444'    // Brighter, every 5 units
minor_lines: '#2a2a2a' // Subtle, every unit  
labels: '#666'         // Readable coordinate text
```

### **Coordinate Display**
- **Bottom edge**: X-axis values (0, 2, 4, 6, ...)
- **Left edge**: Y-axis values (0, 2, 4, 6, ...)
- **Top edge**: Major X coordinates (0, 10, 20, 30, ...)
- **Right edge**: Major Y coordinates (0, 10, 20, 30, ...)

## 📐 Practical Usage Examples

### **Positioning Game Elements**
```typescript
// Car starting positions (staggered for multiplayer)
const startPositions: Vec[] = [
  { x: 7, y: 20 },   // Player 1: center
  { x: 5, y: 21 },   // Player 2: left & back  
  { x: 9, y: 21 },   // Player 3: right & back
  { x: 6, y: 22 },   // Player 4: left & further back
]

// Racing line waypoint example
{ pos: { x: 25, y: 29 }, targetSpeed: 5, cornerType: 'straight', safeZone: 'bottom' }
//    └─ Bottom straight section, high speed area
```

### **Movement and Physics**
```typescript
// Velocity vectors follow same coordinate system
vel: { x: 2, y: -1 }  // Moving right (2 units) and up (1 unit)
//        └─ Positive X = right
//              └─ Negative Y = upward movement
```

### **Drawing Operations**
```typescript
// Convert game coordinates to canvas pixels for rendering
const drawX = gamePos.x * grid  // gamePos.x * 20
const drawY = gamePos.y * grid  // gamePos.y * 20
ctx.arc(drawX, drawY, radius, 0, Math.PI * 2)
```

## ⚠️ Important Considerations

### **Y-Axis Direction**
- **Computer Graphics**: Y increases downward (used in vRacer)
- **Mathematical Graphs**: Y increases upward (traditional)
- **Impact**: Movement "up" in game terms means decreasing Y coordinates

### **Grid Unit Scale**
- **1 grid unit** = **20 canvas pixels**
- **Track dimensions**: 46×31 grid units = 920×620 canvas pixels
- **Minimum canvas size**: ~1000×700 pixels for full track visibility

### **Coordinate Precision**
- **Game logic**: Uses floating-point coordinates for smooth movement
- **Grid display**: Rounds to integers for visual grid alignment
- **Mouse input**: Converted from screen pixels to precise grid coordinates

## 🔧 Developer Reference

### **Key Files**
- **`src/game.ts`**: Track definitions, coordinate transformations
- **`src/track-analysis.ts`**: Racing line waypoint coordinates
- **`src/main.ts`**: Mouse-to-grid conversion, input handling

### **Code Patterns**
```typescript
// Standard coordinate access
const pos: Vec = { x: 7, y: 20 }
const pixelX = pos.x * state.grid  // Convert to canvas pixels
const pixelY = pos.y * state.grid

// Bounds checking
const inBounds = pos.x >= 0 && pos.x <= maxX && pos.y >= 0 && pos.y <= maxY

// Distance calculation  
const distance = Math.hypot(pos1.x - pos2.x, pos1.y - pos2.y)
```

---

**Document Status**: Complete  
**Last Updated**: January 2025  
**Related Documentation**: `WARP.md`, `track-analysis.ts`, `WAYPOINT_SYSTEM.md`
