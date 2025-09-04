# Changelog

All notable changes to vRacer will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
