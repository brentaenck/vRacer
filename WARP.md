# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

**🔥 CRITICAL FOR AI ASSISTANTS**: This repository has **automated validation** via git hooks and structured workflows. Always run `npm run ci` before committing and follow conventional commit formats. Use `npm run workflow-help` for reminders.

## Project Overview

vRacer is a canvas-based implementation of the vector race game (Graph Paper Vector Race). It's a turn-based racing game where players control velocity and acceleration on a grid-based track, with collision detection and physics.

## Development Methodology

This project uses **Trunk-Based Development** with **Feature Flags** for rapid iteration:
- All development happens on `main` branch
- No feature branches - use feature flags in `src/features.ts` instead
- Small, frequent commits to maintain always-working state
- Features start disabled and are enabled when ready
- **Automated validation** via git hooks ensures code quality
- **Structured templates** for consistent issues and PRs

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

# Workflow helpers
npm run workflow-help    # Show workflow reminders
npm run pre-release      # Release preparation checklist  
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
- ✅ Completed: `improvedControls`, `animations`, `performanceMetrics`, `debugMode`
- 🚧 Ready to implement: `multiCarSupport`, `soundEffects`, `carCollisions`
- 📋 Planned features: `trackEditor`, `damageModel`, `aiPlayers`

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
- HUD update coordination with game state

**`src/hud.ts`** - DOM-based HUD system
- HUD data interface and management
- Real-time game info display in header
- Player info, performance metrics, game status
- Responsive design and mobile optimization

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
- Proper lap tracking with directional validation
- Professional checkered finish line spanning track width

## ✅ COMPLETED FEATURES (Ready for Production)

### 🏎️ Core Racing Experience
- **3-lap race system** with proper completion detection
- **Checkered finish line** with authentic 2D black & white pattern
- **Directional arrows** showing counter-clockwise racing path
- **Fixed start position** preventing false finish triggers
- **Lap counter** displaying progress ("lap: 1/3")

### ⌨️ Enhanced Controls (`improvedControls`)
- **Keyboard support**: WASD, arrow keys, diagonal movement (Q/E/Z/X)
- **Mouse hover effects** with candidate preview and trail lines
- **Undo system**: U or Ctrl+Z to revert last move (10-move history)
- **Coast control**: Space/Enter for zero acceleration

### ✨ Visual Polish (`animations`)
- **60 FPS animation loop** with requestAnimationFrame
- **Particle effects**: explosion on crash, celebration on lap completion
- **Smooth interpolation** system with easing functions
- **Performance-optimized** rendering with particle recycling

### 📈 Developer Tools (`performanceMetrics`)
- **Advanced FPS tracking** with frame time history
- **Render time monitoring** per frame
- **Memory usage display** with garbage collection detection
- **Performance warnings** for lag detection
- **60 FPS target monitoring** with detailed metrics

### 🔧 Debug Features (`debugMode`)
- **Enhanced HUD** with trail length, speed, coordinates
- **Feature flag status** logging
- **Console debugging** for game state inspection
- **Development help** text with keyboard shortcuts

## 🚀 PHASE 1 COMPLETE - v1.0.0 RELEASED!

### ✅ Recently Completed

**Multi-Car Racing Support** (`multiCarSupport: true`) - **DONE!**
- ✅ Multiple car state management 
- ✅ Turn-based multiplayer logic
- ✅ Individual car trail and collision tracking
- ✅ Player switching and race completion
- ✅ Leaderboard and race status

**Audio System Removal** (`soundEffects: false`) - **DONE!**
- ✅ Complete removal of engine sounds and audio dependencies
- ✅ 23% bundle size reduction (33.75kB → 25.90kB JS)
- ✅ Cleaner, more focused codebase

## 🗺️ NEXT DEVELOPMENT PHASES

**For detailed release planning, see [RELEASE_STRATEGY.md](./RELEASE_STRATEGY.md)**

### Priority 1: `carCollisions` (v1.1.0 - Q1 2025)
**Status**: Ready to implement (multiCarSupport foundation complete)
- Car-to-car collision detection and physics
- Collision consequences and visual feedback  
- Enhanced competitive multiplayer dynamics

### Priority 2: Track Editor (v1.2.0 - Q2 2025)
**Status**: Major feature for content creation
- Visual track design interface
- Custom track creation and validation
- Track sharing and importing capabilities

### Priority 3: AI Players (v2.0.0 - Q3 2025)
**Status**: Advanced feature requiring major architecture changes
- Computer-controlled opponents with pathfinding
- Multiple difficulty levels
- Single-player racing modes

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

# Commit frequently (validation is automatic)
git add .
git commit -m "feat: add collision detection for cars"  # pre-commit hook runs npm run ci
git push origin main                                      # pre-push hook validates build
```

**🤖 AI Assistant Note**: Git hooks automatically run validation, but it's still good practice to run `npm run ci` manually during development to catch issues early.

## 🔄 AUTOMATED WORKFLOW SYSTEM

### ⚡ Git Hooks (Automatic Quality Control)

The repository uses custom git hooks to prevent common issues:

**Pre-commit Hook** (`.githooks/pre-commit`)
- Automatically runs `npm run ci` before every commit
- Blocks commits if TypeScript errors or build failures exist
- Bypass only in emergencies: `git commit --no-verify`

**Pre-push Hook** (`.githooks/pre-push`)
- Runs full build validation before pushing to remote
- Ensures production builds work correctly
- Prevents pushing broken code to main branch

**Commit Message Hook** (`.githooks/commit-msg`)
- Validates conventional commit format: `type(scope): description`
- Valid types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `release`
- Example: `feat(ai): improve collision detection`
- Provides helpful format examples on validation failure

**Setup**: Hooks are automatically configured via `git config core.hooksPath .githooks`

### 📋 GitHub Templates

**Issue Templates** (`.github/ISSUE_TEMPLATE/`)
- **Bug Reports**: Structured form with browser/game mode details
- **Feature Requests**: Categorized with priority and implementation help options
- **Configuration**: Disables blank issues, redirects to discussions

**Pull Request Template** (`.github/PULL_REQUEST_TEMPLATE.md`)
- Comprehensive testing checklist
- Feature flag validation reminders
- Release process integration
- Links to `RELEASE_CHECKLIST.md` for version changes

### 🚀 Release Automation

**Release Commands**:
```bash
npm run pre-release     # Shows checklist + validates everything
npm run release-check   # Validates release readiness
```

**Release Process** (see `RELEASE_CHECKLIST.md`):
1. Run `npm run pre-release` for validation
2. Update version in `package.json` (semantic versioning)
3. Update `CHANGELOG.md` with changes
4. Commit with: `git commit -m "release: prepare vX.X.X - description"`
5. Create annotated tag: `git tag -a vX.X.X -m "Release notes"`
6. Push with tags: `git push --follow-tags`
7. Create GitHub Release with `dist/` assets

### Testing and Validation

**Automated Validation** (enforced by git hooks):
- `npm run ci` must pass (TypeScript + build) - **blocked by pre-commit hook**
- Production build must work - **blocked by pre-push hook**  
- Commit messages must follow format - **blocked by commit-msg hook**

**Manual Testing Requirements:**
- Game loads without console errors
- Core functionality remains working
- New features work when enabled
- Mouse movement selection works
- Keyboard shortcuts (R, G, C, H) work
- Debug info appears when `debugMode: true`
- Game state persists correctly through moves

**Validation Override** (emergency only):
```bash
git commit --no-verify   # Bypasses pre-commit hook
git push --no-verify     # Bypasses pre-push hook
```

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

### 📚 Process Documentation
- **[WORKFLOW.md](./WORKFLOW.md)** - 🔥 **Quick reference (START HERE)**
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Complete development methodology guide
- **[RELEASE_STRATEGY.md](./RELEASE_STRATEGY.md)** - Versioning and release planning
- **[RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md)** - Step-by-step release checklist
- **[CHANGELOG.md](./CHANGELOG.md)** - Version history and changes
- **[README.md](./README.md)** - User-facing documentation and game rules

### 🛠️ Automation Files
- **`.githooks/`** - Pre-commit, pre-push, and commit-msg validation
- **`.github/ISSUE_TEMPLATE/`** - Structured bug reports and feature requests
- **`.github/PULL_REQUEST_TEMPLATE.md`** - PR checklist and validation
- **`package.json`** - Workflow helper scripts (workflow-help, pre-release)
- **`.gitmessage`** - Commit message template with examples
