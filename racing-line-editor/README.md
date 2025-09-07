# vRacer Racing Line Editor

A visual editor for creating and modifying racing line waypoints for the vRacer game.

## Quick Start

1. **Open the Editor**: Open `index.html` in your web browser
2. **View the Track**: The editor loads the current vRacer track with the existing racing line
3. **Edit Waypoints**: Select, drag, and modify waypoint properties
4. **Generate Code**: Copy the generated TypeScript code to replace the racing line in `track-analysis.ts`

## Features (Phase 1 Complete)

### ✅ Core Visualization
- **Track Rendering**: Accurate display of vRacer track geometry with proper scaling
- **Racing Line Display**: Visual racing line with speed-based color coding
- **Grid Overlay**: Coordinate grid matching vRacer's system (20px per unit)
- **Waypoint Visualization**: Different shapes for each waypoint type:
  - **Circles**: Straight sections (Blue)
  - **Triangles**: Corner entries (Orange) 
  - **Diamonds**: Apex points (Red)
  - **Squares**: Corner exits (Green)
  - **Orange outline**: Brake zones

### ✅ Interactive Controls
- **Mouse Navigation**: Zoom with scroll wheel, pan with middle-click
- **Viewport Controls**: Zoom slider, reset view, fit track buttons
- **Display Toggles**: Show/hide grid, racing line, waypoints, track bounds
- **Edit Modes**: Select, Add, Delete waypoints

### ✅ Waypoint Management
- **Selection**: Click waypoints to select and edit properties
- **Drag & Drop**: Drag waypoints to reposition them in real-time
- **Property Editing**: Full waypoint property editor with:
  - Position (X, Y coordinates)
  - Target Speed (1-6 scale)
  - Brake Zone (checkbox)
  - Corner Type (straight/entry/apex/exit)
  - Safe Zone (left/right/top/bottom)

### ✅ Code Generation
- **Live Preview**: Real-time TypeScript code generation
- **Copy to Clipboard**: One-click code copying
- **Download**: Save generated code as `.ts` file
- **vRacer Compatible**: Generated code matches `track-analysis.ts` format exactly

## Controls

### Mouse Controls
- **Left Click**: Select waypoint (in Select mode), Add waypoint (in Add mode), Delete waypoint (in Delete mode)
- **Left Drag**: Move selected waypoint
- **Middle Click + Drag**: Pan the view
- **Scroll Wheel**: Zoom in/out
- **Right Click**: Select waypoint (context menu coming in Phase 2)

### Keyboard Shortcuts
- **S**: Switch to Select mode
- **A**: Switch to Add mode  
- **D**: Switch to Delete mode
- **G**: Toggle grid display
- **R**: Reset view to fit track
- **Escape**: Deselect and return to Select mode
- **Delete**: Delete selected waypoint

## Usage Workflow

1. **Load**: The editor automatically loads the current vRacer racing line
2. **Edit**: 
   - Select waypoints to see their properties
   - Drag waypoints to reposition them
   - Use the property panel to adjust speed, brake zones, etc.
   - Add new waypoints by switching to Add mode and clicking
   - Delete waypoints by switching to Delete mode and clicking
3. **Review**: Check the generated code in the bottom panel
4. **Export**: Copy code to clipboard or download as file
5. **Integrate**: Replace the `optimalRacingLine` array in `track-analysis.ts`

## Statistics Display

The editor shows real-time statistics:
- **Total Waypoints**: Number of waypoints in the racing line
- **Average Speed**: Mean target speed across all waypoints
- **Brake Zones**: Count of waypoints marked as brake zones
- **Corner Count**: Number of non-straight waypoints

## Current Track Data

The editor loads track geometry from `data/track-geometry.json`:
- **Track Bounds**: outer(2,2)-(48,33), inner(12,10)-(38,25)
- **Grid Size**: 20 pixels per grid unit (matching vRacer)
- **Racing Direction**: Counter-clockwise
- **Start/Finish**: Left side of track at Y=18

## Phase 1 Complete ✅

**Delivered Features:**
- Complete visual track and racing line display
- Interactive waypoint editing with drag & drop
- Full property editing interface
- Real-time code generation
- Professional UI with dark theme
- Comprehensive mouse and keyboard controls

**Phase 2 Coming Next:**
- Advanced waypoint editing (insert, reorder)
- Import/export functionality
- Racing line validation
- Performance optimization suggestions

## Browser Compatibility

- **Recommended**: Chrome, Firefox, Safari, Edge (modern versions)
- **Requirements**: HTML5 Canvas, ES6 JavaScript, CSS Grid
- **Local File Access**: Some browsers require a local server for file loading

---

**Status**: Phase 1 Complete - Ready for testing and feedback!
