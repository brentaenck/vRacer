# Changelog

All notable changes to vRacer will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.3.0] - 2025-01-05

### 🏁 Added
- **Comprehensive Racing Line Optimization System**
  - Complete Phase 1 & Phase 2 racing line optimizations implemented
  - 6 distinct waypoint improvements across 5 major track sections
  - Left side straight positioning optimized (x:7→x:5) for better track width utilization
  - Turn 1 apex optimization (12,30→11,31) for improved corner radius
  - Turn 2 entry optimization (38,28→39,29) for wider entry angle
  - Right side straight positioning optimized (x:41→x:43) for symmetric track width usage
  - Bottom straight speed enhancement (speed 4→5) for maximum performance

- **Enhanced Graph Paper Grid System**
  - New `graphPaperGrid` feature flag for authentic graph paper racing experience
  - Visible grid lines overlaid on track surface with coordinate indicators
  - Major grid lines every 5 units, minor grid lines every 1 unit
  - X-axis and Y-axis coordinate labels around track perimeter
  - Tick marks and coordinate indicators for precise position determination
  - Semi-transparent overlay design that doesn't overwhelm track elements
  - Monospace font coordinate system for professional appearance

### 🎯 Improved
- **Racing Performance**: Expected 8-15% faster lap times from optimized racing line
- **Track Width Utilization**: 22% improvement on both left and right sides (2 of 9 available units)
- **Corner Geometry**: Enhanced entry angles, apex positioning, and exit trajectories
- **Speed Optimization**: Better utilization of available speed range (2-5 units)
- **Authenticity**: More true to original graph paper racing game experience
- **Position Analysis**: Easier waypoint analysis and position determination

### 🔧 Technical
- Professional racing theory applied with outside-inside-outside cornering principles
- Single source of truth architecture maintained for all racing line optimizations
- Backward compatibility preserved for basic grid display option
- All optimizations follow vRacer's trunk-based development methodology
- Comprehensive documentation with implementation plans and analysis tools

## [2.2.2] - 2025-09-04

### 🔧 Fixed
- **Racing Direction Terminology Standardization**
  - Fixed inconsistent racing direction labels throughout codebase
  - Standardized all terminology to match actual counter-clockwise implementation
  - Corrected track-analysis.ts racingDirection from 'clockwise' to 'counter-clockwise'
  - Fixed directional comments in game.ts and ai.ts to use consistent counter-clockwise terminology
  - Fixed critical Top/Bottom direction vectors in fallback logic (Top: go left, Bottom: go right)
  - Updated visual arrow comments to correctly describe counter-clockwise movement

### 🎯 Improved
- **Code Consistency**: All racing direction logic now uses consistent counter-clockwise terminology
- **AI Behavior**: AI directional guidance now perfectly matches actual waypoint implementation
- **Developer Experience**: Eliminated confusing contradictions between comments and implementation
- **Documentation Accuracy**: All directional descriptions now correctly reflect the racing flow

### 🔧 Technical
- Updated safe zone direction comments for counter-clockwise racing
- Fixed getExpectedRacingDirection() fallback logic for Top/Bottom track sections
- Aligned AI velocity alignment calculations with correct directional flow
- Ensured lap validation logic matches actual racing direction

## [2.2.1] - 2025-01-03

### 🔧 Fixed
- **Debug Visualization System improvements**
  - Fixed AI target visualization to use proper `findNearestRacingLinePoint()` from track-analysis.ts
  - AI targeting lines now correctly show what each AI player is actually targeting
  - Enhanced integration with single source of truth racing line data
  - Eliminated inconsistency between AI decision-making and debug display

### 📚 Added  
- **Comprehensive debug visualization documentation** 
  - New `DEBUG_VISUALIZATION.md` with complete system explanation
  - Technical details for racing line waypoints, AI targeting, and checkpoint visualization
  - Integration guide for track-analysis.ts single source of truth
  - Troubleshooting and development usage instructions

### 🎯 Improved
- **Debug mode accuracy**: Debug visualizations now perfectly match AI behavior
- **Developer experience**: Better understanding of AI decision-making through accurate visualization
- **Documentation completeness**: All debug features now properly documented

## [2.2.0] - 2025-09-03

### 🤖 Added
- **Major AI Player improvements (Phase 1 implementation)**
  - Backward movement prevention with aggressive penalty system (-1000 penalty)
  - Enhanced speed management with competitive target speeds (3-5 units for medium AI)
  - Predictive crash prevention system to avoid illegal future positions (-2000 penalty)
  - Racing line attraction mechanism to pull AI back to optimal racing path
  - Improved start position handling to prevent AI from getting stuck
  - Corner approach safety penalties for safer cornering behavior
  - Comprehensive debug logging for AI decision analysis

### 🎯 Improved
- **Simplified AI move scoring system** reduced to 6 core factors:
  - Progress toward racing line waypoints
  - Speed management and acceleration
  - Safety and crash avoidance
  - Racing line adherence
  - Direction alignment with track flow
  - Start area handling

### 🚀 Performance
- AI now successfully completes laps and passes checkpoints
- Eliminated AI getting stuck at start positions
- AI achieves competitive racing speeds while maintaining safety
- Effective track navigation with proper racing line following

### 🔧 Technical
- Enhanced waypoint targeting with lookahead system
- Dynamic target speed calculation based on AI difficulty
- Multi-factor move evaluation with weighted scoring
- Emergency mode handling for extreme situations

## [1.1.0] - 2025-08-27

### Added
- **Car-to-car collision detection system** for multi-player racing
  - Realistic collision detection with 0.6 grid unit collision radius
  - Cars stop when attempting to collide with other cars
  - Visual particle effects on collision (when animations enabled)
  - Debug console logging for collision events
  - Smart collision logic that respects crashed/finished car states
- Extensible collision handling framework supporting future collision types
- Geometric collision detection using path-to-point distance calculations
- Integration with turn-based multi-car gameplay mechanics

### Technical
- Added `checkCarCollision()`, `carPathIntersectsPosition()`, `positionsOverlap()` functions
- Added `closestPointOnSegment()` geometric helper function
- Added `handleCollision()` system for collision consequence management
- Enabled `carCollisions` feature flag for production use
- Maintained full backward compatibility with single-car mode
## [1.0.0] - 2025-08-27

### 🎉 **PHASE 1 COMPLETE - INITIAL STABLE RELEASE**

First stable release of vRacer! This represents a complete, production-ready vector racing game with multi-player support and professional polish.

### ✅ Added

#### 🏎️ **Core Racing Experience**
- Complete 3-lap race system with proper finish detection
- Professional checkered finish line with authentic 2D pattern
- Directional arrows showing counter-clockwise racing path
- Accurate lap tracking and progress display
- Track geometry with proper collision detection

#### 🏁 **Multi-Car Racing** 
- Full 2-player racing support with turn-based gameplay
- Individual car state management (position, velocity, trails)
- Player switching and turn management
- Race leaderboard with completion times
- Different colored cars for visual distinction

#### ⌨️ **Enhanced Controls**
- Keyboard support: WASD, arrow keys for movement
- Diagonal movement: Q/E/Z/X keys
- Coast control: Space/Enter for zero acceleration  
- Mouse hover effects with move preview
- Undo system: U or Ctrl+Z (10-move history)

#### ✨ **Visual Polish**
- 60 FPS animation system with requestAnimationFrame
- Particle effects: explosions on crash, celebrations on lap completion
- Smooth visual feedback and hover states
- Professional UI with clean design

#### 📈 **Developer Tools**
- Advanced performance metrics (FPS, render time, memory)
- Debug mode with detailed HUD information
- Feature flag system for development control
- Console logging for game state inspection

### 🔇 Changed
- Removed audio system for cleaner, simpler codebase
- 23% reduction in bundle size (33.75kB → 25.90kB JS)
- Streamlined architecture focused on core gameplay

### 🎯 **Technical Achievements**
- Trunk-based development with feature flags
- TypeScript implementation with strict typing
- Canvas-based rendering for optimal performance
- Immutable state management
- Clean separation of concerns

---

## Future Releases

### [1.1.0] - Planned
- **Car Collisions**: Car-to-car collision detection and physics
- **Enhanced Multiplayer**: Improved competitive racing dynamics

### [1.2.0] - Planned  
- **Track Editor**: Visual track design and custom track creation
- **Track Save/Load**: Custom track persistence

### [2.0.0] - Planned
- **AI Players**: Computer-controlled opponents with pathfinding
- **Advanced Physics**: Damage model and alternative physics systems

---

## Development Guidelines

### Semantic Versioning Strategy
- **MAJOR** (X.0.0): Breaking changes, major feature additions
- **MINOR** (1.X.0): New features, backward compatible
- **PATCH** (1.0.X): Bug fixes, small improvements

### Release Process
1. Update version in `package.json`
2. Document changes in `CHANGELOG.md` 
3. Create git tag: `git tag v1.0.0`
4. Build and test: `npm run ci`
5. Push with tags: `git push --tags`
6. Create GitHub Release with built assets
