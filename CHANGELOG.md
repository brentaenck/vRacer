# Changelog

All notable changes to vRacer will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.3.1] - 2025-01-11

### 🎨 **Visual Improvements: Enhanced Car Colors & Unified UI Zone**

#### 🎨 Changed
- **Car Color Palette Enhancement**
  - Updated primary car colors to darker, more saturated tones for better visibility
  - Deep Orange (#CC5500), Golden Rod (#B8860B), Deep Blue (#003D82), Deep Purple (#5D1A8B), Crimson Red (#8B0000)
  - Improved contrast against track surface after hand-drawn rendering effects
  - Swapped Golden Rod with Charcoal for better primary player visibility

- **Unified UI Zone Frame**
  - Removed gaps between header and sidebar to create seamless dark UI frame
  - UI Zone now forms solid L-shaped frame around Canvas Zone
  - Eliminated individual borders and shadows from header/sidebar in dual styling mode
  - Added padding to game area for proper canvas inset within UI Zone

#### 🔧 Technical
- Updated CSS layout system to remove main layout gaps and padding
- Enhanced car color fallback array with Forest Green, Burnt Sienna, and Charcoal
- Improved visual cohesion between UI Zone components
- Maintained responsive design for mobile layouts

### 🎯 Improved
- **Car Visibility**: Darker car colors maintain visibility with artistic rendering effects
- **UI Cohesion**: Seamless dark frame creates professional appearance
- **User Experience**: Eliminated visual distractions between UI elements

## [3.3.0] - 2025-01-11

### 🎨 **MAJOR: Dual UI Styling System - Professional UI with Artistic Canvas**

#### 🆕 Added
- **Dual UI Styling System**
  - Feature flag controlled dual styling (`dualStyling: true` by default)
  - Zone-based CSS architecture (`.canvas-zone` vs `.ui-zone`)
  - Runtime toggle function `toggleDualStyling()` accessible via console
  - Comprehensive terminology documentation in `DUAL_UI_STYLING_STRATEGY.md`

- **Modern UI Color Palette System**
  - Hierarchical dark theme color palette with 6 depth levels
  - Surface (#0f172a) → Primary (#1e293b) → Secondary (#334155) → Tertiary (#475569) → Quaternary (#64748b)
  - Professional UI text colors: Primary (#f1f5f9), Secondary (#cbd5e1), Tertiary (#94a3b8)
  - Complete CSS variable system for UI Zone styling

- **Professional UI Typography**
  - Inter font family for all UI Zone elements
  - Clean system fonts separate from Canvas Zone artistic fonts
  - Consistent font hierarchy: heading, primary, monospace variants

#### 🔄 Changed
- **UI Zone Dark Theme Implementation**
  - All UI elements (header, sidebar, modals) now use professional dark slate theme
  - High contrast light text (#f1f5f9) on dark backgrounds for excellent readability
  - 4-level hierarchical depth structure in New Game modal for visual clarity
  - Enhanced button styling with hover states and proper focus indicators

- **Canvas Zone Preservation**
  - Hand-drawn paper aesthetic completely preserved for game area
  - Warm paper colors (#FEFEF8) and artistic fonts maintained
  - All game rendering unchanged - racing elements keep authentic character

#### 🐛 Fixed
- **Complete Text Visibility**
  - Fixed all black text elements that were unreadable on dark backgrounds
  - Hamburger menu lines now visible with light colors
  - All modal text (New Game, Settings) properly readable
  - Sidebar content completely updated with light text colors

- **Font Consistency**
  - Enforced UI Zone fonts throughout all interface elements
  - Eliminated mixed Canvas/UI font usage in modals
  - Consistent typography hierarchy across all UI components

- **Interactive Elements**
  - Form inputs, selects, and controls styled for dark theme
  - Toggle switches and keyboard shortcuts properly visible
  - Button hover states and feedback consistent across UI Zone

#### 🔧 Technical
- Added 400+ lines of modern UI CSS with professional design system
- Implemented comprehensive `!important` overrides for theme consistency
- Created zone-based architectural separation with clear boundaries
- Extended CSS variable system with UI-specific color palette
- Maintained complete backward compatibility with Canvas Zone styling
- Added runtime styling toggle system for user preference

#### 📚 Documentation
- Complete dual UI styling strategy documentation
- Terminology guide for precise feedback and development
- Technical architecture documentation with implementation details
- User experience guidelines and design principles

### 🎯 Impact
- **Professional Appearance**: UI Zone now has modern, developer-friendly dark theme
- **Enhanced Readability**: All text elements clearly visible with proper contrast ratios
- **Preserved Authenticity**: Canvas Zone maintains beautiful hand-drawn paper aesthetic
- **Better UX**: Clean separation between functional UI and immersive game area
- **Accessibility**: Improved contrast ratios meeting modern accessibility standards

## [3.2.0] - 2025-01-10

### 🎨 **MAJOR: Complete Visual Design System Implementation**

#### 🎨 Added
- **Unified Color System Bridge**
  - `UNIFIED_COLORS` object dynamically accessing CSS custom properties in canvas context
  - Complete synchronization between UI and canvas color palettes
  - `getCSSColor()` utility function for real-time CSS variable access
  - Paper-based color foundation: `--paper-bg`, `--paper-aged`, `--paper-shadow`
  - Pencil drawing colors: `--pencil-dark/medium/light/blue/red/green`
  - Racing colors: `--racing-tangerine/yellow/blue/violet/red`
  - Game state colors: success/error/warning for consistent UI feedback

- **Advanced Layering System**
  - `LayerManager` class orchestrating 8 distinct transparency layers
  - Optimized layer hierarchy: Paper Foundation → Texture → Grid → Track → Racing Elements → Trails → Game Feedback → Cars → Particles
  - Fine-tuned opacity settings for natural paper-authentic depth
  - Performance-optimized transparency management

- **Refined Hand-Drawn Character System**
  - `drawRefinedPencilBorder()` function with 0.1px jitter (optimized from 0.3px)
  - `drawRefinedPencilLine()` function for debug elements
  - Consistent opacity without random variations
  - Performance-optimized segment generation
  - Subtle hand-drawn character maintaining visibility

- **Enhanced Paper Texture System**
  - Three-layer paper aging effects matching CSS `body::before` gradients
  - Brown aging spots using exact CSS rgba values: `rgba(139, 69, 19, 0.03)`
  - Paper fiber texture with sparse 30% density at 25px spacing
  - Selective track surface texture overlay
  - CSS-synchronized paper colors for seamless integration

- **Performance Benchmarking System**
  - `PerformanceBenchmark` class for comprehensive performance testing
  - Console-accessible `runPerformanceBenchmark(duration)` function
  - Real-time FPS, frame time, render time, and memory usage tracking
  - Automatic comparison with baseline performance metrics
  - Performance regression detection and reporting

#### 🎨 Changed
- **Track Rendering System**
  - Track surface: CSS variable-driven warm graphite tones
  - Track boundaries: Warm brown pencil colors from unified system
  - Selective paper texture applied only to track surface area
  - Gentle shadow effects using warm gray CSS colors
  - All hard-coded colors replaced with unified system

- **Debug Interface Integration**
  - Checkpoint lines: Hand-drawn character with refined pencil lines
  - Debug typography: Cursive fonts for authentic hand-drawn feel
  - Racing line visualization: Paper-integrated color palette
  - Debug labels: Subtle shadows for paper background visibility
  - Complete warm tone adoption for all debug elements

- **Game Feedback System**
  - Move candidates: Unified success/error colors from CSS variables
  - Hover effects: Consistent warm tone highlighting
  - Trail rendering: Racing colors from unified system
  - Car visualization: Enhanced shadow depth with warm gray tones
  - All UI feedback synchronized with CSS design tokens

#### 🔧 Technical
- Added `LayerManager.drawPaperFoundation/Texture/TrackLayers/RacingElements/DebugElements()` methods
- Added `drawTrackShadows()` and `drawCarWithShadow()` for depth effects
- Added `drawTrackPaperTexture()` for selective surface enhancement
- Enhanced `drawSimplePaperTexture()` with CSS-matching aging effects
- Refactored `CAR_COLORS` to use dynamic `getCarColors()` from unified system
- Updated all drawing functions to use `UNIFIED_COLORS` instead of hard-coded hex values
- Maintained backward compatibility with `PAPER_COLORS` alias

### 🎯 Improved
- **Visual Cohesion**: 100% synchronization between UI and canvas color systems
- **Professional Polish**: Authentic paper notebook aesthetic throughout
- **Performance**: Maintained 55-60 FPS while adding visual enhancements
- **User Experience**: Warm, inviting paper tones replace cold digital grays
- **Debug Integration**: Debug elements feel integrated rather than overlaid
- **Hand-Drawn Character**: Subtle artistic touch without sacrificing clarity

### 📚 Documentation
- Added comprehensive `VISUAL_IMPROVEMENTS_SUMMARY.md` with user testing protocol
- Complete technical implementation details and success criteria
- Performance benchmarking instructions and validation framework
- User feedback collection guidelines and expected outcomes

## [3.1.1] - 2025-01-10

### 🎨 **Visual Refinements: Clean Canvas Rendering & Professional Debug Interface**

#### 🎨 Changed
- **Canvas Rendering Improvements**
  - Removed pencil drawing effects from all track and car elements for better visibility
  - Track surface: Clean polygons with solid fills instead of jittery pencil strokes
  - Car trails: Smooth continuous lines instead of segmented pencil effects
  - Car rendering: Simple filled circles instead of overlapping textured dots
  - Paper texture: Minimized to subtle gradient overlay

- **Track Color Scheme Enhancement**
  - Swapped track surface and boundary colors for better contrast
  - Track surface: Dark gray (#333333) with 30% transparency
  - Track boundaries: Light gray (#E0E0E0) for clear definition
  - Background transparency: Graph paper grid now visible through all elements

- **Debug Interface Improvements**
  - Checkpoint lines: Professional dark gray (#1A1A1A) thin double lines
  - Checkpoint labels: Positioned at inner boundary endpoints instead of line midpoints
  - Label styling: Subtle 10px Arial font with 70% opacity
  - Smart positioning: Labels offset 15 pixels inward from inner track boundaries

#### 🔧 Technical
- Added `drawCleanPolyBorder()` function for clean polygon border rendering
- Added `drawSimplePaperTexture()` function with minimal gradient overlay
- Enhanced checkpoint label positioning with endpoint detection algorithm
- Improved canvas transparency settings for better grid visibility
- Maintained backward compatibility with existing drawing functions

### 🎯 Improved
- **Visual Clarity**: Enhanced visibility of track boundaries and car positions
- **Professional Appearance**: Clean, technical drawing aesthetic
- **Debug Experience**: Better organized and positioned debug elements
- **Graph Paper Integration**: Authentic graph paper visibility throughout
- **Performance**: Simplified rendering with better frame rates

## [3.1.0] - 2025-01-09

### 🎨 **Visual Enhancement: Vibrant Car Color Palette**

#### 🎨 Changed
- **Car Color Scheme Redesign**
  - Updated primary car colors to vibrant, distinct palette:
    - Player 1: 🧡 Tangerine (#F28E2B)
    - Player 2: 💛 Golden Yellow (#F4D03F) 
    - Player 3: 💙 Royal Blue (#286DC0)
    - Player 4: 💜 Violet (#8E44AD)
  - Replaced previous basic RGB colors with professional color palette
  - Enhanced visual distinction between players in multi-car races
  - Maintained fallback colors for players 5-8

#### 🔧 Technical
- Updated `CAR_COLORS` array in `src/game.ts`
- Refactored CSS color variables from `--racing-red/green/blue/yellow/orange` to `--racing-tangerine/yellow/blue/violet`
- Updated CSS utility classes and data-color selectors in `src/styles.css`
- Updated player setup UI color indicators for new palette
- Maintained backward compatibility with existing game state

### 🎯 Improved
- **Player Identification**: Enhanced visual clarity in multi-player races
- **Color Accessibility**: Better contrast and distinct color choices
- **UI Consistency**: Unified color scheme across game canvas, trails, and setup interface
- **Brand Enhancement**: More vibrant and modern visual appearance

## [3.0.0] - 2025-01-07

### 🎨 **MAJOR: Racing Line Editor & Custom Racing Line Integration**

#### 🏁 Added
- **Complete Racing Line Editor System**
  - Standalone web-based racing line editor with interactive track visualization
  - Phase 2 interactive features: waypoint selection, dragging, insertion, and editing
  - Grid snapping system for precise waypoint placement
  - Property editor for waypoint attributes (speed, brake zone, corner type)
  - Undo/redo support for waypoint management
  - Live TypeScript code generation for racing line data
  - Export/import functionality with JSON format

- **Custom Racing Line Integration in vRacer**
  - Import custom racing lines from JSON files via UI controls
  - Racing line visualization overlay with color-coded waypoints
  - Toggle racing line visibility with "L" keyboard shortcut
  - Launch racing line editor directly from main game
  - Global custom racing line state management

- **AI Integration with Custom Racing Lines**
  - AI players now use imported custom racing lines instead of hardcoded defaults
  - Enhanced AI decision-making based on user-optimized racing paths
  - Seamless integration with existing AI difficulty levels
  - All AI pathfinding updated to leverage custom track analysis

#### 🎯 Improved
- **Track Analysis System**: Extended with custom racing line support
- **User Experience**: Complete workflow from racing line design to AI implementation
- **Developer Tools**: Powerful racing line optimization capabilities
- **Game Customization**: Players can create and test optimal racing strategies

#### 🔧 Technical
- New `racing-line-ui.ts` module for import/export functionality
- Updated `track-analysis.ts` with `createTrackAnalysisWithCustomLine()` function
- Enhanced `game.ts` with racing line overlay rendering (`drawRacingLine()`)
- Global racing line state management with JSON validation
- Backward compatibility maintained with default racing line fallback
- TypeScript integration throughout racing line editor

### 📚 Documentation
- Comprehensive racing line editor documentation
- Integration guides for custom racing line workflow
- Technical API documentation for racing line data structures

---

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
