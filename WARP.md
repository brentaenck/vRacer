# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

vRacer is a canvas-based implementation of the vector race game (Graph Paper Vector Race). It's a turn-based racing game where players control velocity and acceleration on a grid-based track, with collision detection and physics.

## Development Methodology

This project uses **Trunk-Based Development** with **Feature Flags** for rapid iteration:
- All development happens on `main` branch
- No feature branches - use feature flags in `src/features.ts` instead
- Small, frequent commits to maintain always-working state
- Features start disabled and are enabled when ready

## Essential Commands

```bash
# Development server (most common)
npm run dev

# Pre-commit validation (always run before committing)
npm run ci              # Runs type-check + build

# Individual checks
npm run type-check      # TypeScript validation only
npm run build          # Production build
npm run preview        # Preview production build

# Quick development flow
npm run quick-commit "message"  # Equivalent to: git add . && git commit -m
```

### Node.js Setup
This project requires Node.js 18+ and uses nvm:
```bash
nvm install    # Install required Node version
nvm use        # Switch to project Node version
npm install    # Install dependencies
```

## Architecture Overview

### Core Modules

**`src/features.ts`** - Feature flag system (critical for development)
- Controls all new functionality via boolean flags
- Features start disabled, enabled when ready
- Currently enabled: `debugMode`, `stopOnCrash`
- Planned features: `multiCarSupport`, `carCollisions`, `trackEditor`

**`src/game.ts`** - Core game engine
- Game state management (`GameState` type)
- Physics calculations (velocity, acceleration, collision)
- Track geometry (outer/inner polygons, walls, start/finish)
- Rendering system with canvas drawing
- Move validation and legal path checking

**`src/geometry.ts`** - Mathematical utilities
- Vector operations (`Vec` type, add, sub, dot, len)
- Segment intersection detection
- Point-in-polygon testing (ray casting)
- Supercover line sampling for collision detection

**`src/main.ts`** - UI and event handling
- Canvas click handling for move selection
- Keyboard shortcuts (R-reset, G-grid, C-candidates, H-help)
- DOM integration and game loop management

### Game State Structure
```typescript
type GameState = {
  grid: number          // Pixels per grid unit (20)
  outer: Vec[]         // Track boundary polygon
  inner: Vec[]         // Track hole polygon
  walls: Segment[]     // Wall segments for collision
  start: Segment       // Start/finish line
  pos: Vec             // Current car position
  vel: Vec             // Current velocity vector
  trail: Vec[]         // Movement history
  crashed: boolean     // Collision state
  finished: boolean    // Race completion
  showGrid: boolean    // UI toggle states
  showCandidates: boolean
  showHelp: boolean
}
```

### Physics Model
- Grid-based movement with discrete positions
- Acceleration limited to {-1, 0, 1} in each axis per turn
- Move validation ensures path stays within track polygons
- Collision detection uses supercover line sampling
- Finish detection via start line intersection

## Development Workflow

### Feature Development Process

1. **Add Feature Flag** (always start here):
```typescript
// In src/features.ts
export const FEATURES: FeatureFlags = {
  myNewFeature: false,  // Start disabled
}
```

2. **Implement Incrementally**:
```bash
git commit -m "feat: add feature flag for X"
git commit -m "feat: add data structures for X"
git commit -m "feat: add rendering logic for X"
git commit -m "feat: add interaction handling for X"
```

3. **Enable When Ready**:
```typescript
myNewFeature: true,  // Enable for users
```
```bash
git commit -m "feat: enable feature X - ready for users"
```

### Daily Development Cycle

```bash
# Start development
npm run dev

# Make changes, test in browser
# Toggle features in src/features.ts as needed

# Before each commit (critical step)
npm run ci

# Commit frequently (multiple times per day)
git add .
git commit -m "feat: add collision detection for cars"
git push origin main
```

### Testing and Validation

**Pre-commit Requirements:**
- `npm run ci` must pass (TypeScript + build)
- Game loads without console errors
- Core functionality remains working
- New features work when enabled

**Manual Testing:**
- Mouse movement selection works
- Keyboard shortcuts (R, G, C, H) work
- Debug info appears when `debugMode: true`
- Game state persists correctly through moves

## Feature Flag System

### Usage Patterns
```typescript
// Simple feature toggle
if (isFeatureEnabled('debugMode')) {
  console.log('Debug info:', gameState)
}

// Alternative implementations
if (isFeatureEnabled('wallBounce')) {
  bounceOffWall()
} else {
  stopAtWall()  // Current behavior
}

// Progressive feature rollout
if (isFeatureEnabled('basicDamage')) {
  // Simple damage model
}
if (isFeatureEnabled('advancedDamage')) {
  // Complex damage system
}
```

### Current Feature Categories
- **Core Game**: `multiCarSupport`, `carCollisions`
- **Physics**: `damageModel`, `wallBounce`, `stopOnCrash` 
- **Track Tools**: `trackEditor`, `trackSaveLoad`
- **UI/UX**: `improvedControls`, `soundEffects`, `animations`
- **Development**: `debugMode`, `performanceMetrics`, `aiPlayers`

## Common Development Tasks

### Adding New Game Mechanics
1. Add feature flag in `src/features.ts`
2. Extend `GameState` type if needed in `src/game.ts`
3. Add logic to `applyMove()` function
4. Update rendering in `draw()` function
5. Test with flag disabled/enabled

### Adding UI Features
1. Add feature flag and DOM element handling in `src/main.ts`
2. Add event listeners for new controls
3. Update rendering/HUD display in `src/game.ts`
4. Ensure keyboard shortcuts don't conflict

### Track/Geometry Changes
1. Modify track definitions in `createDefaultGame()`
2. Test collision detection with new geometry
3. Ensure start/finish line positioning works
4. Validate path legality functions

### Debug Features
Enable `debugMode: true` in `src/features.ts` to get:
- Enhanced console logging
- Detailed HUD information (trail length, speed)
- Feature flag status logging
- Performance metrics (when `performanceMetrics` enabled)

## Code Style and Patterns

- **Immutable State Updates**: Always return new state objects
- **Feature Flag Guards**: Wrap new functionality in `isFeatureEnabled()` checks
- **TypeScript**: Strict typing for all game state and geometry
- **Functional Style**: Pure functions for physics calculations
- **Canvas Rendering**: Direct 2D context manipulation for performance

## Troubleshooting

**TypeScript Errors**: Run `npm run type-check` and fix incrementally
**Build Failures**: Run `npm run build` to test production build locally
**Feature Conflicts**: Disable conflicting features temporarily in `src/features.ts`
**Game State Issues**: Check console for debug output when `debugMode: true`

## References

- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Complete development methodology guide
- **[WORKFLOW.md](./WORKFLOW.md)** - Quick reference for daily development
- **[README.md](./README.md)** - User-facing documentation and game rules
