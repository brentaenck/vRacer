# vRacer - Graph Paper Vector Race (Vector Racetrack)

[![CI](https://github.com/brentaenck/vRacer/actions/workflows/ci.yml/badge.svg)](https://github.com/brentaenck/vRacer/actions/workflows/ci.yml)
[![Deploy](https://github.com/brentaenck/vRacer/actions/workflows/deploy.yml/badge.svg)](https://github.com/brentaenck/vRacer/actions/workflows/deploy.yml)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/brentaenck/vRacer/releases/tag/v1.0.0)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

🎮 **[Play the game live here!](https://brentaenck.github.io/vRacer/)** | 🏁 **[Latest Release v1.0.0](https://github.com/brentaenck/vRacer/releases/tag/v1.0.0)**

Quick start
- Ensure you have Node via nvm
  - nvm install
  - nvm use
- Install deps
  - npm install
- Start dev server
  - npm run dev
- Build
  - npm run build
  - npm run preview

What is this?
- A minimal canvas-based implementation of the vector race game
- Turn-based movement with velocity and acceleration on a grid
- Click a candidate next position to choose your acceleration

Controls
- Mouse: On your turn, click one of the highlighted 9 candidate nodes to choose acceleration
- R: Reset race
- G: Toggle grid
- C: Toggle candidate overlay
- H: Toggle help

Rules (simplified)
- Start at a start cell with velocity (0,0)
- Each turn you may change velocity by ax, ay ∈ {-1,0,1}
- The move from p to p' must remain inside the track polygon and not cross any wall segments
- Crossing the finish line segment in the correct direction ends the race
- No car collisions yet (single player for now)

Project Structure
- index.html: Canvas and controls
- src/main.ts: Entry point and UI wiring
- src/game.ts: Core game state, rules, rendering
- src/geometry.ts: Geometry helpers (segments, intersections)
- src/styles.css: Basic styling

Track
- A simple rectangular track with inner and outer boundaries and a start/finish line
- You can tweak the points in src/game.ts to design new tracks

## Development

This project uses **trunk-based development with feature flags** for rapid iteration.

### Quick Start for Developers
```bash
npm run dev         # Start development
npm run ci          # Validate before commits
git commit -m "..." # Commit frequently to main
```

### Feature Flags
- All new features controlled in `src/features.ts`
- Features start disabled, enabled when ready
- No feature branches - all work on `main`
- Currently enabled: `debugMode`, `stopOnCrash`

### Documentation
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Complete development guide
- **[RELEASE_STRATEGY.md](./RELEASE_STRATEGY.md)** - Versioning and release planning
- **[CHANGELOG.md](./CHANGELOG.md)** - Version history and changes
- **[WORKFLOW.md](./WORKFLOW.md)** - Quick reference

### Current Features (v1.0.0)
✅ **Complete multi-car racing with 2-player support**  
✅ **Enhanced controls** (keyboard, mouse, undo system)  
✅ **Visual polish** (60 FPS animations, particle effects)  
✅ **Developer tools** (performance metrics, debug mode)  
✅ **Professional racing** (3 laps, checkered finish line)  

### Planned Features
*See [RELEASE_STRATEGY.md](./RELEASE_STRATEGY.md) for detailed roadmap:*
- **v1.1.0:** Car collisions and competitive racing
- **v1.2.0:** Visual track editor and custom tracks
- **v2.0.0:** AI opponents and advanced physics

License
- MIT

