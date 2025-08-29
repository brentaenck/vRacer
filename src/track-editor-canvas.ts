/**
 * Track Editor Canvas Integration
 *
 * Handles canvas interactions (mouse/touch) and overlay rendering for the
 * Track Editor. Focuses on minimal viable drawing of the outer boundary
 * with snap-to-grid support and simple closing behavior.
 */

import { Vec } from './geometry'
import { getEditorState, isEditorActive } from './track-editor-ui'
import { validateTrack } from './track-editor'
import { refreshEditorUI } from './track-editor-ui'

// UI rendering helpers
const POINT_RADIUS = 4
const HOVER_RADIUS = 8
const CLOSE_THRESHOLD = 10 // px distance to first point to close loop

function getMousePos(canvas: HTMLCanvasElement, evt: MouseEvent): Vec {
  const rect = canvas.getBoundingClientRect()
  const x = evt.clientX - rect.left
  const y = evt.clientY - rect.top
  return { x, y }
}

function snapToGridIfNeeded(p: Vec, gridSize: number, snap: boolean): Vec {
  if (!snap) return p
  return {
    x: Math.round(p.x / gridSize) * gridSize,
    y: Math.round(p.y / gridSize) * gridSize,
  }
}

function distance(a: Vec, b: Vec): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

// Global state for editor canvas interactions
let previewPoint: Vec | null = null

export function setupEditorCanvas(canvas: HTMLCanvasElement): void {
  // Primary mouse handlers
  canvas.addEventListener('mousedown', (e) => {
    if (!isEditorActive()) return
    const state = getEditorState()
    if (!state) return

    const posPx = getMousePos(canvas, e)
    const snapPos = snapToGridIfNeeded(posPx, state.gridSize, state.snapToGrid)

    // Only implement Draw mode + Pen tool for MVP
    if (state.mode === 'draw' && state.tool === 'pen') {
      // Start drawing if not already
      if (!state.isDrawing) {
        state.isDrawing = true
        state.currentPath = []
      }

      // Close path if near first point and we have at least 3 points
      const first = state.currentPath[0]
      if (first && state.currentPath.length >= 3 && distance(snapPos, first) <= CLOSE_THRESHOLD) {
        // Close the loop - don't duplicate the first point
        // Commit to geometry.outer (replace outer with this path)
        if (state.track.geometry) {
          state.track.geometry.outer = [...state.currentPath]
          // Update validation immediately if requested
          state.validation = validateTrack(state.track.geometry)
        }
        state.isDrawing = false
        state.currentPath = []
        previewPoint = null
        state.isDirty = true
        refreshEditorUI()
        return
      }

      // Otherwise, add point to current path
      state.currentPath.push(snapPos)
      previewPoint = null // Clear preview since we committed a point
      state.isDirty = true
    }
  })

  canvas.addEventListener('mousemove', (e) => {
    if (!isEditorActive()) return
    const state = getEditorState()
    if (!state) return

    const posPx = getMousePos(canvas, e)
    const snapPos = snapToGridIfNeeded(posPx, state.gridSize, state.snapToGrid)

    // Update preview point for drawing
    if (state.isDrawing && state.mode === 'draw' && state.tool === 'pen') {
      previewPoint = snapPos
    } else if (state.mode === 'draw' && state.tool === 'pen') {
      // Show preview even when not drawing yet
      previewPoint = snapPos
    } else {
      previewPoint = null
    }
  })

  canvas.addEventListener('mouseleave', () => {
    previewPoint = null
  })

  canvas.addEventListener('mouseup', () => {
    // No special behavior on mouseup for now
  })

  console.log('🖱️ Track editor canvas handlers setup complete')
}

export function drawEditorOverlay(ctx: CanvasRenderingContext2D): void {
  const state = getEditorState()
  if (!state || !state.isActive) return

  // Semi-transparent overlay to indicate editor mode
  ctx.save()
  ctx.globalAlpha = 0.9

  // Draw current path (outer boundary in Draw+Pen)
  if (state.currentPath.length > 0) {
    ctx.lineWidth = 2
    ctx.strokeStyle = '#00d1b2' // teal
    ctx.fillStyle = '#00d1b244'

    const firstPoint = state.currentPath[0]
    if (firstPoint) {
      ctx.beginPath()
      ctx.moveTo(firstPoint.x, firstPoint.y)
      for (let i = 1; i < state.currentPath.length; i++) {
        const p = state.currentPath[i]
        if (p) {
          ctx.lineTo(p.x, p.y)
        }
      }
      ctx.stroke()
    }

    // Draw preview line from last point to current mouse position
    if (previewPoint && state.isDrawing) {
      const lastPoint = state.currentPath[state.currentPath.length - 1]
      if (lastPoint) {
        ctx.save()
        ctx.strokeStyle = '#00d1b266' // Semi-transparent teal
        ctx.setLineDash([5, 5]) // Dashed line
        ctx.beginPath()
        ctx.moveTo(lastPoint.x, lastPoint.y)
        ctx.lineTo(previewPoint.x, previewPoint.y)
        ctx.stroke()
        ctx.restore()
      }
    }

    // Points
    for (const p of state.currentPath) {
      if (p) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, POINT_RADIUS, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // If path long enough, show close indicator near first point
    if (state.currentPath.length >= 3) {
      const first = state.currentPath[0]
      if (first) {
        ctx.beginPath()
        ctx.strokeStyle = '#ffcc00'
        ctx.arc(first.x, first.y, HOVER_RADIUS, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
  }

  // Draw preview point
  if (previewPoint && state.mode === 'draw' && state.tool === 'pen') {
    ctx.save()
    ctx.fillStyle = '#00d1b2aa' // Semi-transparent teal
    ctx.beginPath()
    ctx.arc(previewPoint.x, previewPoint.y, POINT_RADIUS, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  // If a committed outer exists, render it subtly
  const outer = state.track.geometry?.outer || []
  if (outer.length > 1) {
    ctx.lineWidth = 2
    ctx.strokeStyle = '#4caf50'
    const firstOuter = outer[0]
    if (firstOuter) {
      ctx.beginPath()
      ctx.moveTo(firstOuter.x, firstOuter.y)
      for (let i = 1; i < outer.length; i++) {
        const p = outer[i]
        if (p) {
          ctx.lineTo(p.x, p.y)
        }
      }
      ctx.stroke()
    }
  }

  ctx.restore()
}

