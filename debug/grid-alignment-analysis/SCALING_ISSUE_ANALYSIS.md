# Canvas-CSS Grid Scaling Mismatch Analysis

## 🔍 **Problem Identified**

**Issue**: Mouse coordinates show 0.8x scaling factor between visual grid and coordinate system
- Expected (1,1) → Actual (0.8,0.8)
- Expected (2,2) → Actual (1.6,1.6)

## 📐 **Root Cause Analysis**

### **CSS Grid Specifications** (from styles.css)
```css
#canvas {
  background-size: 
    100px 100px,  /* Major vertical lines */
    100px 100px,  /* Major horizontal lines */
    20px 20px,    /* Minor vertical lines - THIS IS KEY */
    20px 20px;    /* Minor horizontal lines - THIS IS KEY */
}
```

**CSS Grid Unit**: 20px per grid square

### **Canvas Coordinate System** (from game.ts)
```typescript
export function screenToGrid(canvas: HTMLCanvasElement, g: number, x: number, y: number): Vec {
  const rect = canvas.getBoundingClientRect()
  const gx = (x - rect.left) / (rect.width) * canvas.width / g
  const gy = (y - rect.top) / (rect.height) * canvas.height / g
  return { x: gx, y: gy }
}
```

**Game Grid Unit**: `g = 20` (pixels per grid unit)

### **The Scaling Problem**

The issue is that the **canvas's actual pixel dimensions** don't match the **CSS grid dimensions**.

**Formula**: `(mouse_screen_coord / canvas_display_size) * canvas_internal_size / grid_unit`

If the result is 0.8x what we expect, it means:
- Either `canvas.width` / `canvas.height` are **80% of what they should be**
- Or the CSS display size (`rect.width` / `rect.height`) is **125% larger than expected**

## 🧪 **Diagnostic Steps**

### Step 1: Check Canvas Dimensions
Add this to the browser console to check actual dimensions:

```javascript
const canvas = document.getElementById('canvas')
const rect = canvas.getBoundingClientRect()
console.log('Canvas CSS Display Size:', rect.width, 'x', rect.height)
console.log('Canvas Internal Size:', canvas.width, 'x', canvas.height)
console.log('Expected ratio (should be 1.0):', canvas.width / rect.width, canvas.height / rect.height)
```

### Step 2: Check Grid Unit
```javascript
// This should be 20
console.log('Game grid unit:', state.grid)
```

## 🔧 **Potential Solutions**

### Option A: Fix Canvas Dimensions
If canvas internal dimensions are wrong, set them correctly:

```javascript
// Ensure canvas internal dimensions match display dimensions
canvas.width = canvas.clientWidth
canvas.height = canvas.clientHeight
```

### Option B: Fix screenToGrid Calculation
If the calculation is wrong, adjust the scaling factor:

```typescript
export function screenToGrid(canvas: HTMLCanvasElement, g: number, x: number, y: number): Vec {
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  const gx = (x - rect.left) * scaleX / g
  const gy = (y - rect.top) * scaleY / g
  return { x: gx, y: gy }
}
```

### Option C: Fix CSS Grid Size
If CSS grid is wrong size, change to match expected scaling:

```css
#canvas {
  background-size: 
    125px 125px,  /* Major lines (100px * 1.25) */
    125px 125px,  /* Major lines */
    25px 25px,    /* Minor lines (20px * 1.25) */
    25px 25px;    /* Minor lines */
}
```

## 🎯 **Recommended Fix**

**Option B** is most likely correct - the `screenToGrid` function should properly account for the difference between canvas display size and internal pixel dimensions.

The current formula assumes `canvas.width === rect.width`, but this is often not the case due to CSS scaling, device pixel ratios, or canvas sizing.