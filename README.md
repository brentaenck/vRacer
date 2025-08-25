vRacer - Graph Paper Vector Race (Vector Racetrack)

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

## Development Workflow

This project uses **trunk-based development** with feature flags for rapid iteration:

### Feature Flags
- All new features are controlled by flags in `src/features.ts`
- Features start disabled and are incrementally enabled as they're completed
- No long-lived feature branches - all work goes directly to `main`
- See enabled features in browser console when `debugMode` is on

### Trunk-Based Development Process
1. **Small, frequent commits** directly to `main` branch
2. **Feature flags** to hide incomplete features from users
3. **Always deployable** - every commit should keep the game working
4. **Continuous integration** ready (build and test on every push)

### Making Changes
```bash
# Make small, incremental changes
git add .
git commit -m "Add velocity display to debug HUD"
git push origin main

# Enable/disable features in src/features.ts
# No branching needed for experiments!
```

### Current Feature Flags
Check `src/features.ts` for the full list. Currently enabled:
- `debugMode: true` - Enhanced debug information and console logs
- `stopOnCrash: true` - Stop immediately when hitting walls (current behavior)

Next ideas (disabled until implementation)
- Multi-car support and blocking
- Damage model and pit lane
- Wall bounce or stop-on-crash variants
- Track editor mode
- Save/load tracks as JSON
- Performance metrics and FPS counter
- Sound effects and animations

License
- MIT

