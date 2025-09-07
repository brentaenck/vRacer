// Simple Node.js test for data loading
const fs = require('fs');

try {
    // Test JSON loading
    const data = JSON.parse(fs.readFileSync('data/track-geometry.json', 'utf8'));
    
    console.log('✅ JSON loads successfully');
    console.log('Track metadata:', data.metadata.name);
    console.log('Track outer points:', data.track.outer.length);
    console.log('Track inner points:', data.track.inner.length);
    console.log('Racing line waypoints:', data.racingLine.waypoints.length);
    
    // Test basic structure
    if (data.track && data.track.outer && data.track.inner && data.racingLine && data.racingLine.waypoints) {
        console.log('✅ Data structure is valid');
    } else {
        console.log('❌ Data structure has issues');
    }
    
    // Test waypoint structure
    const firstWaypoint = data.racingLine.waypoints[0];
    if (firstWaypoint && firstWaypoint.pos && firstWaypoint.targetSpeed !== undefined) {
        console.log('✅ Waypoint structure is valid');
        console.log('First waypoint:', firstWaypoint.pos, 'Speed:', firstWaypoint.targetSpeed);
    } else {
        console.log('❌ Waypoint structure has issues');
    }
    
} catch (error) {
    console.log('❌ Error loading data:', error.message);
}
