# vRacer - Graph Paper Vector Race (Vector Racetrack)

[![CI](https://github.com/brentaenck/vRacer/actions/workflows/ci.yml/badge.svg)](https://github.com/brentaenck/vRacer/actions/workflows/ci.yml)
[![Deploy](https://github.com/brentaenck/vRacer/actions/workflows/deploy.yml/badge.svg)](https://github.com/brentaenck/vRacer/actions/workflows/deploy.yml)
[![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)](https://github.com/brentaenck/vRacer/releases/tag/v3.0.0)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

🎮 **[Play the game live here!](https://brentaenck.github.io/vRacer/)** | 🏁 **[Latest Release v3.0.0](https://github.com/brentaenck/vRacer/releases/tag/v3.0.0)**

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
- A comprehensive canvas-based implementation of the vector race game
- Turn-based movement with velocity and acceleration on a grid
- Complete racing line editor for creating custom racing strategies
- AI opponents that adapt to your custom racing lines
- Click a candidate next position to choose your acceleration

Controls
- Mouse: On your turn, click one of the highlighted 9 candidate nodes to choose acceleration
- R: Reset race
- G: Toggle grid
- C: Toggle candidate overlay
- L: Toggle racing line overlay (v3.0+)
- D: Toggle debug mode
- U or Ctrl+Z: Undo last move

Rules (simplified)
- Start at a start cell with velocity (0,0)
- Each turn you may change velocity by ax, ay ∈ {-1,0,1}
- The move from p to p' must remain inside the track polygon and not cross any wall segments
- Crossing the finish line segment in the correct direction ends the race
- No car collisions yet (single player for now)

Project Structure
- index.html: Canvas and controls with DOM-based HUD
- src/main.ts: Entry point and UI event handling
- src/game.ts: Core game state, rules, canvas rendering
- src/hud.ts: DOM-based HUD management and display
- src/geometry.ts: Geometry helpers (segments, intersections)
- src/features.ts: Feature flag system
- src/styles.css: Complete UI styling system

Track
- A simple rectangular track with inner and outer boundaries and a start/finish line
- You can tweak the points in src/game.ts to design new tracks

## Development

This project uses **trunk-based development with feature flags** for rapid iteration.

### 📋 Quick Development Workflow
```bash
# Daily development cycle
npm run dev            # Start development server
# Make changes, test in browser
npm run ci             # Validate before each commit 
git add . && git commit -m "feat: description"
git push origin main   # Push frequently
```

### 🚀 Release Process 
```bash
# 1. Prepare release
npm run pre-release    # Shows checklist + validates build
# 2. Update version in package.json (MAJOR.MINOR.PATCH)
# 3. Update CHANGELOG.md with features/fixes
# 4. Commit changes
git commit -m "release: prepare vX.X.X - description"
# 5. Create and push tag
git tag -a vX.X.X -m "Release notes"
git push --follow-tags
# 6. Create GitHub Release + upload dist/ assets
```

### 🏴 Feature Flags
- All new features controlled in `src/features.ts`
- Features start **disabled**, enabled when ready
- No feature branches - all work on `main`
- Use: `if (isFeatureEnabled('myFeature')) { ... }`

### 📚 Process Documentation
- **[WORKFLOW.md](./WORKFLOW.md)** - 🔥 Quick reference (START HERE)
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Complete development guide
- **[RELEASE_STRATEGY.md](./RELEASE_STRATEGY.md)** - Versioning and release planning
- **[RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md)** - Step-by-step release checklist
- **[CHANGELOG.md](./CHANGELOG.md)** - Version history and changes

### 📝 GitHub Templates

Structured issue and PR templates help maintain consistent quality:

- **Bug Reports**: `.github/ISSUE_TEMPLATE/bug_report.yml` - Detailed bug tracking
- **Feature Requests**: `.github/ISSUE_TEMPLATE/feature_request.yml` - Enhancement proposals  
- **Pull Requests**: `.github/PULL_REQUEST_TEMPLATE.md` - Code review checklist

All templates reference our release process and include validation reminders.

### 🎯 Helpful Commands
```bash
npm run workflow-help  # Show workflow reminders
npm run pre-release    # Release preparation checklist
npm run ci             # Full validation (type-check + build)
npm run preview        # Test production build
```

### ⚡ Automated Validation (Git Hooks)

This repository uses custom git hooks to ensure code quality:

- **Pre-commit**: Runs `npm run ci` (TypeScript + build validation)
- **Pre-push**: Runs full build tests before pushing
- **Commit-msg**: Validates conventional commit message format

**Setup**: Hooks are automatically enabled via `git config core.hooksPath .githooks`

**Bypass** (emergency only): `git commit --no-verify`

**Commit Format**: `type(scope): description`
- Valid types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `release`
- Example: `feat(ai): improve collision detection`

### Current Features (v3.0.0)
✅ **Complete racing line editor** (standalone web-based editor with drag-and-drop)  
✅ **Custom racing line integration** (import/export, AI adaptation)  
✅ **Multi-car racing** (up to 8 players with AI support)  
✅ **Enhanced controls** (keyboard, mouse, undo system)  
✅ **Visual polish** (60 FPS animations, particle effects, racing line overlays)  
✅ **Developer tools** (performance metrics, debug mode, racing line visualization)  
✅ **Professional racing** (3 laps, checkered finish line, lap tracking)  
✅ **Modern UI architecture** (DOM-based HUD, responsive design, modal systems)  
✅ **Car collision detection** (multi-car competitive racing)  
✅ **AI players** (3 difficulty levels with custom racing line support)  

## 🎨 Racing Line Editor (v3.0+)

v3.0.0 introduces a complete racing line editor system:

### **🏗️ Standalone Editor**
- **Interactive track visualization** with precise grid coordinates
- **Drag-and-drop waypoint editing** with real-time feedback
- **Grid snapping system** for precise waypoint placement
- **Property editor** for speed, brake zones, and corner types
- **Undo/redo support** with full history management
- **Live TypeScript code generation** for integration
- **Export/import system** with JSON format validation

### **🔗 vRacer Integration**
- **One-click import** of custom racing lines via configuration modal
- **Visual overlay** with color-coded waypoints and speed indicators
- **"L" key toggle** for racing line visibility
- **Direct editor access** from main game interface
- **AI adaptation** - AI players use your custom racing lines instantly

### **🎯 Complete Workflow**
1. **Design** racing lines in the standalone editor
2. **Export** as JSON with optimized waypoint data
3. **Import** into vRacer via the configuration modal
4. **Test** against AI opponents using your racing lines
5. **Iterate** and refine for optimal performance

### Planned Features
*See [RELEASE_STRATEGY.md](./RELEASE_STRATEGY.md) for detailed roadmap:*
- **v3.1.0:** Multiple racing lines per track and racing line library
- **v3.2.0:** Advanced track editor with custom track creation
- **v4.0.0:** Multiplayer networking and tournament systems

License
- MIT

