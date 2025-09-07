# vRacer Racing Line Editor Utility - Implementation Plan

## Project Overview

A standalone web-based visual editor for creating and modifying racing line waypoints for the vRacer game. The utility provides an interactive interface to edit the `optimalRacingLine` data in `track-analysis.ts` without manual code editing.

## Goals

1. **Visual Editing**: Drag-and-drop waypoint manipulation on a canvas display
2. **Code Generation**: Automatic TypeScript code generation for direct integration
3. **Validation**: Racing line validation and optimization suggestions  
4. **Accessibility**: Make racing line editing accessible to non-programmers

## Technical Architecture

### Core Components

#### 1. Track Visualization Engine
- **Canvas Rendering**: HTML5 Canvas with vRacer coordinate system matching
- **Track Geometry**: Display outer/inner polygons, start/finish line, grid overlay
- **Viewport Controls**: Zoom, pan, and coordinate system management
- **Visual Fidelity**: Exact match to vRacer game rendering

#### 2. Waypoint Management System
- **Interactive Display**: Visual differentiation by corner type and properties
  - Straight sections: Blue circles (○)
  - Corner entries: Yellow triangles (△)
  - Apex points: Red diamonds (◆)
  - Corner exits: Green squares (□)
  - Brake zones: Orange outline highlighting
- **Manipulation**: Click selection, drag repositioning, context menus
- **Sequencing**: Proper waypoint ordering with visual connections

#### 3. Property Editor Interface
- **Selection Panel**: Current waypoint properties display
- **Edit Controls**:
  - Position: X/Y coordinate inputs with validation
  - Target Speed: Slider (1-6) with speed indicators
  - Brake Zone: Toggle checkbox with visual feedback
  - Corner Type: Dropdown (straight/entry/apex/exit)
  - Safe Zone: Dropdown (left/right/top/bottom)
- **Bulk Operations**: Multi-select editing and batch updates

#### 4. Code Generation System
- **Real-time Output**: Live TypeScript code preview
- **Formatting**: Matches existing `track-analysis.ts` style exactly
- **Comments**: Auto-generated descriptive comments per section
- **Export Options**: Clipboard copy, file download, direct replacement

## Data Structures

### Core Types
```typescript
// Editor state management
interface EditorState {
  track: TrackGeometry
  racingLine: RacingLinePoint[]
  selectedWaypoint: number | null
  selectedWaypoints: Set<number>
  viewport: ViewportState
  editMode: EditMode
  history: EditorState[]
}

interface TrackGeometry {
  outer: Vec[]
  inner: Vec[]
  startLine: Segment
  grid: number
  bounds: TrackBounds
}

interface ViewportState {
  scale: number        // Zoom level
  offsetX: number      // Pan X
  offsetY: number      // Pan Y
  canvasWidth: number
  canvasHeight: number
}

type EditMode = 'select' | 'add' | 'delete' | 'move'

// Matches vRacer RacingLinePoint exactly
interface RacingLinePoint {
  pos: Vec
  targetSpeed: number
  brakeZone: boolean
  cornerType: 'straight' | 'entry' | 'apex' | 'exit'
  safeZone: 'left' | 'right' | 'top' | 'bottom'
}
```

### Validation Rules
```typescript
interface ValidationResult {
  isValid: boolean
  warnings: ValidationWarning[]
  errors: ValidationError[]
}

interface ValidationWarning {
  waypointIndex: number
  type: 'speed_transition' | 'corner_sequence' | 'safe_zone_mismatch'
  message: string
  suggestion?: string
}
```

## Implementation Phases

### Phase 1: Core Visualization (Target: 1-2 days)

**Deliverables:**
- `index.html` - Main editor interface layout
- `css/editor.css` - Complete styling system
- `js/track-renderer.js` - Canvas rendering engine
- `js/editor.js` - Application initialization and state management
- `data/track-geometry.json` - vRacer track data extraction

**Key Features:**
- HTML5 Canvas with proper coordinate system
- Track geometry rendering (outer/inner polygons, start line)
- Grid overlay system
- Basic waypoint display (static points)
- Zoom and pan controls
- Responsive design for different screen sizes

**Technical Requirements:**
- Canvas size: 1000x700px (initial)
- Coordinate system: Match vRacer grid units (20px per unit)
- Track bounds: outer(2,2)-(48,33), inner(12,10)-(38,25)
- Grid spacing: 1 grid unit with major/minor divisions

### Phase 2: Interactive Editing (Target: 2-3 days)

**Deliverables:**
- `js/waypoint-editor.js` - Interactive waypoint manipulation
- `js/property-panel.js` - Waypoint property editing interface
- Enhanced UI with editing controls and property panels

**Key Features:**
- Click selection with multi-select support
- Drag-and-drop waypoint repositioning
- Real-time coordinate updates during drag
- Property editing panel with validation
- Waypoint insertion/deletion at any sequence position
- Undo/redo system for all editing operations

**Interaction Design:**
- Left click: Select waypoint
- Shift+click: Multi-select waypoints
- Drag: Move selected waypoint(s)
- Right click: Context menu (add, delete, properties)
- Double-click: Quick property edit
- Keyboard shortcuts: Delete, Ctrl+Z, Ctrl+Y, etc.

### Phase 3: Code Generation (Target: 1 day)

**Deliverables:**
- `js/code-generator.js` - TypeScript code formatting system
- Code preview panel with syntax highlighting
- Export functionality (clipboard, file download)

**Key Features:**
- Real-time TypeScript code generation
- Exact formatting match to `track-analysis.ts`
- Auto-generated section comments
- Code validation and error checking
- Multiple export formats (full replacement, partial update)

**Code Output Format:**
```typescript
// Generate exactly this format:
const optimalRacingLine: RacingLinePoint[] = [
  // LEFT SIDE STRAIGHT - Start area to Turn 1 approach
  { pos: { x: 5, y: 20 }, targetSpeed: 4, brakeZone: false, cornerType: 'straight', safeZone: 'left' },
  // ... (with proper comments and grouping)
]
```

### Phase 4: Advanced Features (Target: 1-2 days)

**Deliverables:**
- `js/validation.js` - Racing line validation system
- `js/import-export.js` - File import/export functionality
- `examples/` - Sample racing line configurations

**Key Features:**
- Import existing racing line from `track-analysis.ts`
- Export/import custom configurations as JSON
- Racing line validation with warnings/errors
- Performance analysis and optimization suggestions
- Multiple racing line configurations support
- Template system for different racing styles

## File Structure

```
racing-line-editor/
├── index.html                    # Main editor interface
├── css/
│   ├── editor.css               # Core styling
│   └── syntax-highlight.css     # Code highlighting
├── js/
│   ├── editor.js                # Main application controller
│   ├── track-renderer.js        # Canvas rendering system
│   ├── waypoint-editor.js       # Interactive editing
│   ├── property-panel.js        # UI property editor
│   ├── code-generator.js        # TypeScript output
│   ├── validation.js            # Racing line validation
│   ├── import-export.js         # File I/O operations
│   └── utils.js                 # Shared utilities
├── data/
│   └── track-geometry.json      # vRacer track data
├── examples/
│   ├── aggressive-racing-line.json
│   ├── conservative-racing-line.json
│   └── optimal-racing-line.json
└── README.md                    # Usage instructions
```

## Integration Workflow

### Current State → Editor
1. Extract track geometry from `game.ts` (outer, inner, start line)
2. Extract current racing line from `track-analysis.ts`
3. Load into editor for visualization and modification

### Editor → vRacer Integration
1. Edit racing line in visual interface
2. Generate TypeScript code with proper formatting
3. Copy generated code to clipboard
4. Replace `optimalRacingLine` array in `track-analysis.ts`
5. Test integration in vRacer game

### Quality Assurance
- Validation ensures track boundary compliance
- Speed transition analysis prevents unrealistic changes
- Corner type sequencing validates racing logic
- Safe zone assignment verifies track area coverage

## Success Criteria

### Phase 1 Success Metrics
- [ ] Track renders accurately with proper scaling
- [ ] All waypoints display in correct positions
- [ ] Grid overlay matches vRacer coordinate system
- [ ] Zoom/pan works smoothly without visual artifacts
- [ ] UI is responsive and intuitive

### Final Success Metrics
- [ ] Complete visual editing workflow functional
- [ ] Generated code integrates seamlessly with vRacer
- [ ] Racing line validation catches common errors
- [ ] Non-programmers can successfully create racing lines
- [ ] Performance analysis provides useful optimization suggestions

## Future Enhancement Opportunities

- **Multi-track Support**: Editor for different track layouts
- **AI-Assisted Optimization**: Automatic racing line optimization
- **Performance Simulation**: Lap time prediction based on racing line
- **Collaborative Editing**: Share and compare racing line configurations
- **Mobile Support**: Touch-friendly interface for tablet editing
- **3D Visualization**: Elevation and banking for advanced tracks

---

This plan provides a comprehensive roadmap for creating a professional racing line editor that seamlessly integrates with the vRacer game while remaining accessible to users of all technical levels.
