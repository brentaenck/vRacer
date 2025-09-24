// Quick diagnostic for the 0.1 unit offset
const canvas = document.getElementById('canvas')
const rect = canvas.getBoundingClientRect()

console.log('=== CURRENT STATE ===')
console.log('Canvas Internal:', canvas.width, 'x', canvas.height)
console.log('CSS Display:', rect.width.toFixed(2), 'x', rect.height.toFixed(2))
console.log('Scaling factors:', (canvas.width / rect.width).toFixed(6), (canvas.height / rect.height).toFixed(6))

console.log('\n=== BORDER/PADDING CHECK ===')
const styles = getComputedStyle(canvas)
console.log('Border width:', styles.borderWidth)
console.log('Padding:', styles.padding)
console.log('Border-radius:', styles.borderRadius)

console.log('\n=== PRECISE POSITION TEST ===')
// Test the exact pixel position where grid (1,1) should be
const gridX = 1, gridY = 1
const expectedPixelX = gridX * 20  // 20px per grid unit
const expectedPixelY = gridY * 20  // 20px per grid unit

console.log('Grid (1,1) should be at CSS pixel:', expectedPixelX, expectedPixelY)

// Test screenToGrid at that position
const mouseX = rect.left + expectedPixelX
const mouseY = rect.top + expectedPixelY

const scaleX = canvas.width / rect.width
const scaleY = canvas.height / rect.height
const resultX = (mouseX - rect.left) * scaleX / 20
const resultY = (mouseY - rect.top) * scaleY / 20

console.log('screenToGrid result:', resultX.toFixed(3), resultY.toFixed(3))
console.log('Offset from expected:', (resultX - 1).toFixed(3), (resultY - 1).toFixed(3))

console.log('\n=== BORDER IMPACT ===')
console.log('If 3px border is affecting positioning:')
console.log('Effective canvas area might be:', (rect.width - 6), 'x', (rect.height - 6))
console.log('Adjusted scaling would be:', (canvas.width / (rect.width - 6)).toFixed(6))