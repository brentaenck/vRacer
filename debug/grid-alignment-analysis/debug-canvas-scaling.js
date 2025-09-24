// Debug Canvas Scaling Issue
// Run this in browser console to diagnose the scaling mismatch

const canvas = document.getElementById('canvas')
const rect = canvas.getBoundingClientRect()

console.log('=== CANVAS DIAGNOSTICS ===')
console.log('Canvas CSS Display Size:', rect.width, 'x', rect.height)
console.log('Canvas Internal Size:', canvas.width, 'x', canvas.height)
console.log('Canvas Client Size:', canvas.clientWidth, 'x', canvas.clientHeight)
console.log('Canvas Offset Size:', canvas.offsetWidth, 'x', canvas.offsetHeight)

console.log('\n=== SCALING FACTORS ===')
const scaleX = canvas.width / rect.width
const scaleY = canvas.height / rect.height
console.log('Scale X (internal/display):', scaleX)
console.log('Scale Y (internal/display):', scaleY)
console.log('Device pixel ratio:', window.devicePixelRatio)

console.log('\n=== GAME STATE ===')
console.log('Game grid unit:', state?.grid)

console.log('\n=== EXPECTED VS ACTUAL ===')
// Simulate mouse at grid intersection (1,1)
// Should be at pixel (20, 20) in CSS coordinates
const expectedX = 20  // 1 grid unit * 20px
const expectedY = 20  // 1 grid unit * 20px

// Simulate screenToGrid calculation for that position
const mouseX = rect.left + expectedX
const mouseY = rect.top + expectedY

// Old calculation (what was happening before)
const oldGx = (mouseX - rect.left) / (rect.width) * canvas.width / 20
const oldGy = (mouseY - rect.top) / (rect.height) * canvas.height / 20

// New calculation (current fix)
const newGx = (mouseX - rect.left) * scaleX / 20
const newGy = (mouseY - rect.top) * scaleY / 20

console.log('For mouse at CSS pixel (20, 20) - should be grid (1, 1):')
console.log('Old calculation result:', oldGx.toFixed(2), oldGy.toFixed(2))
console.log('New calculation result:', newGx.toFixed(2), newGy.toFixed(2))

console.log('\n=== CSS GRID INFO ===')
const styles = getComputedStyle(canvas)
console.log('Background size:', styles.backgroundSize)
console.log('Background position:', styles.backgroundPosition)

// Test the actual screenToGrid function
console.log('\n=== ACTUAL FUNCTION TEST ===')
// This will test the actual function at pixel (20,20) relative to canvas
const testResult = screenToGrid(canvas, 20, rect.left + 20, rect.top + 20)
console.log('screenToGrid(canvas, 20, rect.left + 20, rect.top + 20):', testResult)