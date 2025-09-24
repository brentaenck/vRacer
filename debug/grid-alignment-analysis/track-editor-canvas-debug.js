// Track Editor Canvas Dimensions Diagnostic
// Copy and paste this into the browser console when track editor is open

console.log('=== TRACK EDITOR CANVAS DIAGNOSTIC ===');

const canvas = document.getElementById('trackCanvas');
if (!canvas) {
    console.log('❌ Track canvas not found - make sure track editor is open');
} else {
    const rect = canvas.getBoundingClientRect();
    
    console.log('=== CANVAS MEASUREMENTS ===');
    console.log('Canvas Internal Size:', canvas.width, 'x', canvas.height);
    console.log('CSS Display Size:', Math.round(rect.width), 'x', Math.round(rect.height));
    
    console.log('\n=== SCALING FACTORS ===');
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    console.log('Scale X:', scaleX.toFixed(4));
    console.log('Scale Y:', scaleY.toFixed(4));
    console.log('Perfect scaling?', scaleX === 1.0 && scaleY === 1.0 ? '✅ YES' : '❌ NO');
    
    console.log('\n=== COORDINATE SYSTEM TEST ===');
    
    // Test the track editor's coordinate conversion
    if (typeof window.CoordinateUtils !== 'undefined' && typeof window.TrackEditor !== 'undefined') {
        // Simulate a mouse click at position that should be grid (1,1)
        const expectedPixelPos = { x: 20, y: 20 }; // 20px = 1 grid unit at GRID_SIZE=20
        const testView = { zoom: 1.0, offsetX: 0, offsetY: 0 };
        
        console.log('For position that should be grid (1,1):');
        console.log('Expected pixel position:', expectedPixelPos);
        
        const gridResult = window.CoordinateUtils.screenToGrid(expectedPixelPos, testView);
        console.log('Track editor conversion result:', gridResult.x.toFixed(2), gridResult.y.toFixed(2));
        console.log('Should be: 1.00, 1.00');
        console.log('Alignment accuracy:', 
            Math.abs(gridResult.x - 1.0) < 0.01 && Math.abs(gridResult.y - 1.0) < 0.01 ? '✅ PERFECT' : '❌ NEEDS FIX');
        
        console.log('\n=== TRACK EDITOR STATUS ===');
        console.log(scaleX === 1.0 && scaleY === 1.0 ? 
            '✅ Track editor likely DOES NOT need alignment fixes' : 
            '⚠️  Track editor MAY need alignment fixes');
            
    } else {
        console.log('⚠️  Track editor utilities not loaded - make sure you\'re on the track editor page');
    }
}

console.log('\n=== INSTRUCTIONS ===');
console.log('1. Open the vRacer track editor');
console.log('2. Paste this script in the browser console');
console.log('3. Check if scaling factors are 1.0000');
console.log('4. If not, the track editor needs similar fixes to the main game');