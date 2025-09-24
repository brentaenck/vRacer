// Canvas Dimensions Diagnostic
// Run this in browser console to get exact measurements

const canvas = document.getElementById('canvas')
const rect = canvas.getBoundingClientRect()

console.log('=== EXACT CANVAS MEASUREMENTS ===')
console.log('Canvas Internal Size:', canvas.width, 'x', canvas.height)
console.log('CSS Display Size (getBoundingClientRect):', Math.round(rect.width), 'x', Math.round(rect.height))
console.log('CSS Display Size (clientWidth/Height):', canvas.clientWidth, 'x', canvas.clientHeight)
console.log('CSS Display Size (offsetWidth/Height):', canvas.offsetWidth, 'x', canvas.offsetHeight)

console.log('\n=== SCALING CALCULATIONS ===')
const scaleX = canvas.width / rect.width
const scaleY = canvas.height / rect.height
console.log('Current scaling factor X:', scaleX.toFixed(4))
console.log('Current scaling factor Y:', scaleY.toFixed(4))

console.log('\n=== WHAT CANVAS SIZE SHOULD BE ===')
const targetWidth = Math.round(rect.width)
const targetHeight = Math.round(rect.height)
console.log('To fix alignment, canvas should be:', targetWidth, 'x', targetHeight)
console.log('Canvas is currently:', canvas.width, 'x', canvas.height)

console.log('\n=== CSS GRID TEST ===')
const styles = getComputedStyle(canvas)
console.log('CSS background-size:', styles.backgroundSize)

console.log('\n=== MOUSE POSITION TEST ===')
// Test what screenToGrid returns for position that should be (1,1)
const expectedPixelX = 20  // 1 grid unit at 20px per unit
const expectedPixelY = 20  // 1 grid unit at 20px per unit
const mouseX = rect.left + expectedPixelX
const mouseY = rect.top + expectedPixelY

console.log('For mouse at CSS pixel (20, 20) relative to canvas:')
console.log('Mouse screen coordinates:', mouseX.toFixed(1), mouseY.toFixed(1))

// Current screenToGrid calculation
const gx = (mouseX - rect.left) * scaleX / 20
const gy = (mouseY - rect.top) * scaleY / 20
console.log('screenToGrid result:', gx.toFixed(2), gy.toFixed(2))
console.log('Should be: 1.00, 1.00')

console.log('\n=== SOLUTION ===')
console.log('Change HTML canvas dimensions from:')
console.log('  width="' + canvas.width + '" height="' + canvas.height + '"')
console.log('To:')
console.log('  width="' + targetWidth + '" height="' + targetHeight + '"')