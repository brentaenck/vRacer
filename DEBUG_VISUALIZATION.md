# Debug Visualization System - vRacer

This document explains the debug visualization system for waypoints, racing lines, and AI player targeting in vRacer.

## 🎯 Overview

The debug visualization system provides comprehensive visual debugging tools to understand and verify:
- **Racing line waypoints** and their properties
- **AI player targeting** and decision-making
- **Lap validation checkpoints** placement
- **Track analysis integration** with the single source of truth

## 🔧 Activation

Debug visualizations are automatically enabled when:
- `debugMode: true` in `src/features.ts` (currently enabled)
- `aiPlayers: true` in `src/features.ts` (currently enabled)
- Game is running in multi-car racing mode
- AI players are present and active (not crashed/finished)

## 📊 Debug Visualization Components

### 1. Racing Line Visualization

**Function**: `drawRacingLineVisualization()` in `src/game.ts`

**What it shows**:
- **Gray dashed line**: Connects all 21 optimal racing waypoints in clockwise sequence
- **Color-coded waypoint circles** (4px radius):
  - 🟢 **Green** = straights (`'straight'`)
  - 🟠 **Orange** = corner entry (`'entry'`)
  - 🔴 **Red** = apex points (`'apex'`)
  - 🔵 **Blue** = corner exit (`'exit'`)
- **White text labels**: Target speed (2-4) positioned next to each waypoint
- **Orange brake circles**: 8px radius around waypoints where `brakeZone: true`

**Data source**: `trackAnalysis.optimalRacingLine` from `track-analysis.ts`

### 2. Lap Validation Checkpoints

**Function**: `drawCheckpointLines()` in `src/game.ts`

**What it shows**:
- **4 colored checkpoint lines** across the track width:
  - **Yellow** (CP0): Bottom section - first checkpoint after start
  - **Cyan** (CP1): Right side - after bottom corner
  - **Magenta** (CP2): Top section - after right corner  
  - **Green** (CP3): Left side - before finish line
- **CP labels**: "CP0", "CP1", "CP2", "CP3" at checkpoint midpoints
- **3px line width** with 0.7 alpha transparency

**Data source**: `trackAnalysis.lapValidationCheckpoints` from `track-analysis.ts`

### 3. AI Target Visualization

**Function**: `drawAITargetVisualization()` in `src/game.ts`

**What it shows** for each active AI player:
- **Colored dashed line** (4px dash pattern): From AI car to its current target waypoint
- **Large target circle** (8px radius): Shows the AI's selected waypoint in player color
- **White inner dot** (3px radius): Highlights the precise target position
- **Info labels** with dark background:
  - Player name and corner type: `"P2: apex"`
  - Distance to target: `"5.2u"` 
  - Target speed: `"v:3"`
- **Semi-transparent styling** (0.8-0.9 alpha)

**Data source**: Uses `findNearestRacingLinePoint(car.pos, trackAnalysis)` from `track-analysis.ts`

### 4. AI Movement Indicators

**Function**: `drawSimplifiedAIVisualization()` in `src/game.ts`

**What it shows** for each AI car:
- **Dashed ring** (12px radius): Around AI cars showing computer control
- **"AI" label**: Text positioned near each AI car
- **Velocity vectors**: Arrows showing current movement direction and speed
  - **Arrow line**: 1.5x velocity magnitude for visibility
  - **Arrow head**: 6px triangle pointing in velocity direction
  - **Color**: Player's assigned color with transparency

## 🔄 Integration with track-analysis.ts

### Single Source of Truth Architecture

All debug visualization functions use `createTrackAnalysis()` to ensure consistency:

```typescript
// Each frame, debug functions call:
const trackAnalysis = createTrackAnalysis(state.outer, state.inner, state.start)

// Then use specific data:
trackAnalysis.optimalRacingLine        // For racing line waypoints
trackAnalysis.lapValidationCheckpoints // For checkpoint placement  
findNearestRacingLinePoint(pos, trackAnalysis) // For AI targeting
```

### Benefits of Centralized Integration

✅ **Consistent data**: All visualizations use identical waypoint positions, speeds, and corner types  
✅ **Real-time accuracy**: AI targeting visualization matches actual AI decision-making logic  
✅ **No duplication**: Eliminates inconsistencies between AI behavior and debug display  
✅ **Maintainable**: Changes to racing line automatically update all visualizations  

## 🎮 Development Usage

### Basic Usage
1. **Start multi-car race** with AI opponents
2. **Debug visualizations appear automatically** (features are pre-enabled)
3. **Observe AI behavior**: Watch targeting lines and waypoint selection
4. **Verify racing line**: Check waypoint placement and speeds
5. **Validate checkpoints**: Ensure proper lap progression detection

### Advanced Debugging
- **AI targeting analysis**: Compare visualization with console logs from AI decision-making
- **Racing line verification**: Ensure waypoints follow optimal clockwise path around track
- **Performance testing**: Check if debug rendering affects game performance
- **Corner behavior**: Verify AI properly targets entry/apex/exit waypoints in sequence

### Console Integration
When `debugMode: true`, AI players also log detailed decision information to console, which correlates with the visual indicators.

## 🔧 Technical Implementation Details

### Rendering Pipeline
```typescript
// Multi-car rendering in game.ts draw() function:
if (isFeatureEnabled('debugMode')) {
  drawCheckpointLines(ctx, multiCarState, g)      // Lap validation
  drawAIDebugVisualization(ctx, multiCarState, g) // AI targeting + racing line
}
```

### Performance Considerations
- Debug visualizations only render when `debugMode` is enabled
- Fresh track analysis created each frame (acceptable for debug mode)
- Canvas operations use appropriate alpha blending and dash patterns
- Text rendering optimized with background rectangles for readability

### Data Flow
1. **Game state** → `createTrackAnalysis()` → **Track analysis object**
2. **Track analysis** → **Racing line waypoints** → **Visual waypoints**  
3. **AI position** → `findNearestRacingLinePoint()` → **Target waypoint** → **Targeting line**
4. **Track analysis** → **Checkpoints** → **Validation lines**

## 🐛 Troubleshooting

### Debug Visualizations Not Appearing
- Verify `debugMode: true` in `src/features.ts`
- Verify `aiPlayers: true` in `src/features.ts` 
- Ensure you're in multi-car racing mode (not single-player)
- Check that AI players are active (not all crashed/finished)

### AI Targeting Lines Incorrect
- Check console for AI decision logs
- Verify AI players are using proper `findNearestRacingLinePoint()` logic
- Ensure track analysis waypoints are correctly defined

### Performance Issues in Debug Mode
- Debug mode is intended for development, not production
- Disable `debugMode` for normal gameplay
- Consider reducing debug visualization complexity if needed

## 📁 Related Files

- **`src/game.ts`**: All debug visualization rendering functions
- **`src/track-analysis.ts`**: Single source of truth for racing data
- **`src/features.ts`**: Feature flags for enabling/disabling debug mode
- **`src/ai.ts`**: AI decision-making logic that debug visualizations represent

## 🔮 Future Enhancements

Potential improvements to the debug visualization system:
- **Performance metrics overlay**: Show AI decision timing and scoring
- **Path prediction visualization**: Show AI's planned future moves
- **Interactive waypoint editing**: Click to modify racing line waypoints
- **Collision prediction display**: Visualize AI collision avoidance logic
- **Race strategy indicators**: Show AI difficulty-specific behaviors

---

*Last updated: 2025-01-03*  
*Status: Fully implemented and integrated with track-analysis.ts*
