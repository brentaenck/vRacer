# vRacer Unified Track & Racing Line Editor

A professional, standalone editor for creating custom racing tracks and optimal racing lines for the vRacer game.

## 🎯 Overview

This unified editor combines track geometry design with racing line creation in a single, powerful tool. Unlike the previous embedded editor, this standalone approach provides:

- **Professional canvas-based editing** with full-screen workspace
- **Unified workflow** from track design to racing line optimization
- **Clean data exchange** via JSON track packages
- **Zero conflicts** with the main game - complete isolation
- **Specialized UI** optimized for design tasks

## 🚀 Features

### ✅ Core Track Design
- **Canvas-based drawing** with click-to-place point system
- **Snap-to-grid** for precise alignment (configurable grid size)
- **Boundary tools** for outer track boundaries and inner holes/obstacles
- **Real-time preview** with visual feedback during editing
- **Track templates** (oval, blank canvas)
- **Loop closure detection** with visual feedback and automatic closing

### ✅ Professional Tools
- **Multiple edit modes**: Track Design, Racing Line, Preview
- **Tool palette**: Pen (✅), Eraser (✅), Move (✅), Start/Finish line placement (🚧)
- **Viewport controls**: Zoom, pan, fit view, reset view
- **Grid system**: Toggle grid display, snap-to-grid precision
- **Visual options**: Show/hide track bounds, racing line, waypoints
- **Advanced editing**: Point-level precision, hover feedback, drag operations

### ✅ Track Properties
- **Metadata management**: Name, author, difficulty, description
- **Track validation** with real-time error/warning feedback
- **Statistics display**: Point counts, track length, complexity metrics
- **Professional track packaging** with complete metadata
- **Auto-save system** with change tracking and recovery

### 🚧 Racing Line Integration (In Development)
- **Waypoint management**: Click to add, drag to move racing line points
- **Speed optimization**: Target speeds, brake zones, corner types
- **Visual feedback**: Color-coded waypoints based on speed
- **Safe zone assignment**: Left/right/top/bottom positioning

### ✅ Complete File Management System
- **JSON track packages**: Complete tracks with racing lines
- **Local storage**: Save/load tracks in browser localStorage
- **File import/export**: JSON file sharing between devices/browsers
- **Track management**: Delete individual tracks or clear all storage
- **Auto-save**: Background saving every 30 seconds with change detection
- **Keyboard shortcuts**: Full workflow coverage (Ctrl+N/O/I/M/S/E)
- **Data validation**: Proper boundary closure and metadata preservation

## 🎮 Quick Start

### Opening the Editor
1. Open `index.html` in your web browser
2. The editor loads with a blank canvas ready for track design

### Basic Track Creation Workflow
1. **Design Track Geometry**:
   - Click "Track Design" mode (or press `1`)
   - Select "Pen" tool (or press `P`)
   - Click to place points for outer track boundary
   - Click near first point to close the track loop
   
2. **Create Racing Line** (optional):
   - Click "Racing Line" mode (or press `2`)
   - Double-click to add racing waypoints
   - Select waypoints to adjust speed and properties
   
3. **Export Track**:
   - Click "Export" button to save as JSON file
   - Import into main vRacer game for racing

## ⌨️ Keyboard Shortcuts

### File Management
- `Ctrl+N` - New track (clear canvas)
- `Ctrl+O` - Load track (from localStorage)
- `Ctrl+I` - Import track (from JSON file)
- `Ctrl+M` - Manage tracks (delete/clear storage)
- `Ctrl+S` - Save track (to localStorage)
- `Ctrl+E` - Export track (as JSON file)

### Mode Switching
- `1` - Track Design mode
- `2` - Racing Line mode  
- `3` - Preview mode

### Track Tools
- `P` - Pen tool (draw boundaries)
- `E` - Eraser tool
- `M` - Move tool
- `S` - Start/Finish line tool

### View Controls
- `G` - Toggle grid display
- `Escape` - Deselect/cancel current operation

### Viewport
- Mouse wheel - Zoom in/out
- Middle mouse + drag - Pan view (not yet implemented)

## 🏗️ Architecture

### File Structure
```
track-editor/
├── index.html              # Main editor interface
├── css/
│   └── editor.css          # Professional dark theme styling
├── js/
│   ├── track-editor.js     # Core track geometry editing
│   ├── racing-line-editor.js # Racing line editing (placeholder)
│   ├── track-renderer.js   # Canvas rendering system
│   ├── file-manager.js     # Import/export functionality
│   ├── validation.js       # Track validation system
│   └── utils.js            # Shared utility functions
└── data/
    └── (track templates - coming soon)
```

### Data Format
```json
{
  "metadata": {
    "name": "Track Name",
    "author": "Designer",
    "difficulty": "Medium",
    "description": "Track description",
    "version": "1.0.0",
    "created": "2025-01-14T23:54:45Z",
    "tags": ["custom"]
  },
  "track": {
    "outer": [{"x": 100, "y": 100}, ...],
    "inner": [{"x": 150, "y": 150}, ...],
    "startLine": {"a": {"x": 0, "y": 0}, "b": {"x": 10, "y": 0}},
    "checkpoints": [],
    "walls": []
  },
  "racingLine": {
    "waypoints": [
      {
        "pos": {"x": 200, "y": 200},
        "targetSpeed": 4,
        "brakeZone": false,
        "cornerType": "straight",
        "safeZone": "left"
      }
    ],
    "direction": "counter-clockwise",
    "validated": false
  },
  "validation": {
    "trackValid": true,
    "racingLineValid": false,
    "errors": [],
    "warnings": [],
    "metrics": {
      "trackLength": 500,
      "avgWidth": 80,
      "complexity": 35
    }
  }
}
```

## 🔄 Development Status

### Phase 1: Foundation ✅ COMPLETE
- [x] Professional HTML/CSS interface
- [x] Core track geometry editing with pen tool
- [x] Canvas rendering system with grid
- [x] View controls (zoom, pan, fit)
- [x] Track templates (oval, blank)
- [x] Basic validation system
- [x] JSON output generation

### Phase 2: Advanced Tools ✅ COMPLETE  
- [x] Eraser and Move tools implementation
- [x] Visual hover feedback and point selection
- [x] Drag-and-drop point repositioning
- [x] Boundary closure detection and visual feedback
- [ ] Start/Finish line placement 🚧
- [ ] Inner boundary drawing (partial - UI exists)
- [ ] Undo/redo system 📋

### Phase 3: File Management System ✅ COMPLETE
- [x] Complete file import/export system (JSON)
- [x] localStorage track management with metadata
- [x] Track deletion and storage clearing
- [x] Auto-save with change tracking
- [x] Keyboard shortcuts for all operations
- [x] Boundary closure preservation across save/load
- [x] Comprehensive error handling and validation

### Phase 4: Racing Line Integration 🚧 NEXT PRIORITY
- [ ] Port racing line waypoint editing from existing editor
- [ ] Waypoint property editing UI (skeleton exists)
- [ ] Speed-based color coding
- [ ] Racing line validation
- [ ] Racing line rendering and interaction

### Phase 5: Production Polish 📌 PLANNED
- [ ] Advanced validation rules (track width, intersections)
- [ ] Template library expansion (figure-8, circuit)
- [ ] Performance optimization for large tracks
- [ ] Enhanced UI/UX polish

## 🤝 Integration with vRacer

The unified editor is designed to work seamlessly with the main vRacer game:

1. **Track Packages**: Complete tracks are exported as JSON files
2. **Import System**: Main game will load track packages for racing
3. **Backward Compatibility**: Supports existing racing line format
4. **Clean Separation**: Editor runs independently - zero game conflicts

## 🔧 Technical Notes

### Browser Requirements
- Modern browser with HTML5 Canvas support
- ES6 JavaScript features (arrow functions, destructuring, etc.)
- localStorage for track saving (optional)

### Performance Considerations
- Optimized canvas rendering for smooth 60fps editing
- Efficient redraw system - only renders when needed
- Handles complex tracks with 100+ points smoothly

### Development
- No build system required - pure HTML/CSS/JS
- Modular architecture for easy extension
- Professional code organization following vRacer patterns

---

**Status**: Phase 1 Complete - Core functionality working!  
**Next**: Racing line integration and advanced tools

This represents a major architectural improvement over the embedded editor approach, providing the foundation for professional track creation tools.