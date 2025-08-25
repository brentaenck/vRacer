# vRacer - Graph Paper Vector Race (Vector Racetrack)

[![CI](https://github.com/brentaenck/vRacer/actions/workflows/ci.yml/badge.svg)](https://github.com/brentaenck/vRacer/actions/workflows/ci.yml)
[![Deploy](https://github.com/brentaenck/vRacer/actions/workflows/deploy.yml/badge.svg)](https://github.com/brentaenck/vRacer/actions/workflows/deploy.yml)

🎮 **[Play the game live here!](https://brentaenck.github.io/vRacer/)**

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
- **[WORKFLOW.md](./WORKFLOW.md)** - Quick reference

### Planned Features
*All controlled by feature flags:*
- Multi-car support and blocking
- Damage model and pit lane  
- Wall bounce variants
- Track editor mode
- Save/load tracks as JSON
- Performance metrics and animations

License
- MIT

