# vRacer Coordinate System Unification Plan

## 🎯 **Project Overview**

**Goal**: Unify vRacer game and track editor to use the same coordinate system (grid units) throughout, eliminating the need for coordinate conversion and reducing complexity.

**Current State**: 
- vRacer Game: Grid units (`{x: 7, y: 20}`)
- Track Editor: Pixels (`{x: 140, y: 400}`) 
- TrackLoader: Converts pixels ÷ 20 → grid units

**Target State**:
- Both systems: Grid units (`{x: 7, y: 20}`)
- No conversion needed
- Direct data compatibility

## 📋 **Implementation Phases**

### **Phase 1: Track Editor Core Coordinate System** ⏱️ 2-3 hours

#### **1.1 Update Track Editor Data Structures**
- **File**: `track-editor/js/track-editor.js`
- **Changes**:
  - All track data stored in grid units instead of pixels
  - Update initial track boundaries from pixels to grid units
  - Update default templates to use grid coordinates

#### **1.2 Update Mouse Input Handling**
- **File**: `track-editor/js/track-editor.js` 
- **Changes**:
  - Convert mouse screen coordinates directly to grid units
  - Use same `screenToGrid()` function pattern as main game
  - Update `snapToGrid()` function to work with grid units
  - Modify click detection for grid-unit precision

#### **1.3 Update Canvas Rendering System**
- **File**: `track-editor/js/track-renderer.js`
- **Changes**:
  - Scale all drawing operations: `gridCoordinate * gridSize` for canvas pixels
  - Update grid drawing to show grid units on labels
  - Modify point visualization to scale from grid units to pixels for display

#### **Expected Outcome**: Track editor stores and manipulates coordinates in grid units but still displays correctly

---

### **Phase 2: Racing Line Editor Integration** ⏱️ 1-2 hours

#### **2.1 Update Racing Line Editor**
- **File**: `track-editor/js/racing-line-editor.js`
- **Changes**:
  - Waypoint positions stored in grid units
  - Update waypoint placement and editing logic
  - Ensure racing line coordinates match game format

#### **2.2 Update Waypoint Display**
- **Changes**:
  - Waypoint editor properties show grid unit coordinates
  - Visual waypoint rendering scales to canvas pixels

#### **Expected Outcome**: Racing line editor creates waypoints directly compatible with vRacer game

---

### **Phase 3: Track Templates and Examples** ⏱️ 1 hour

#### **3.1 Convert All Templates**
- **File**: `track-editor/js/track-editor.js`
- **Templates to Update**:
  - Simple Oval: Convert pixel coordinates to grid units
  - Figure 8: Convert pixel coordinates to grid units  
  - GP Circuit: Convert pixel coordinates to grid units
  - Blank Canvas: Ensure proper grid unit bounds

#### **3.2 Update Default Values**
- **Changes**:
  - Start line coordinates in grid units
  - Checkpoint default positions in grid units
  - Track bounds validation in grid units

#### **Expected Outcome**: All templates create tracks directly in grid units

---

### **Phase 4: Remove Conversion Layer** ⏱️ 1 hour

#### **4.1 Simplify TrackLoader**
- **File**: `src/track-loader.ts`
- **Changes**:
  - Remove `convertPointToGrid()` function
  - Remove `convertCoordinatesToGrid()` function  
  - Remove `convertRacingLineToGrid()` function
  - Direct data passthrough from track editor to game
  - Update validation to expect grid units

#### **4.2 Update Import/Export**
- **Changes**:
  - Track editor export: Already in grid units
  - Game import: No conversion needed
  - Update JSON schema documentation

#### **Expected Outcome**: Clean data flow without conversion overhead

---

### **Phase 5: UI and UX Updates** ⏱️ 1 hour

#### **5.1 Update Coordinate Displays**
- **Files**: Track editor UI components
- **Changes**:
  - Position displays show grid units (e.g., "x: 7, y: 20")
  - Grid size display shows "Grid: 1 unit = 20 pixels"
  - Tooltip coordinates in grid units
  - Status bar coordinates in grid units

#### **5.2 Update Help and Documentation**
- **Changes**:
  - Update in-editor help text to mention grid units
  - Update coordinate system references
  - Ensure consistency with main game terminology

#### **Expected Outcome**: Users see consistent coordinate values throughout

---

### **Phase 6: Testing and Validation** ⏱️ 1-2 hours

#### **6.1 Functional Testing**
- **Test Cases**:
  - Create track in editor → Import to game → Verify identical appearance
  - Create racing line in editor → Verify AI follows correctly in game
  - Test all track templates → Ensure proper proportions
  - Test coordinate precision → Verify no rounding errors
  - Test mouse interaction → Verify accurate placement

#### **6.2 Data Migration Testing**
- **Test Cases**:
  - Load old pixel-based track files → Should be rejected with clear error
  - Export new grid-unit tracks → Should work seamlessly with game
  - Round-trip test: Editor → Game → Back to Editor

#### **6.3 Performance Testing**
- **Verify**: No performance regression from coordinate changes
- **Check**: Rendering performance remains smooth

#### **Expected Outcome**: Robust, well-tested coordinate system

---

### **Phase 7: Documentation and Cleanup** ⏱️ 30 minutes

#### **7.1 Update Documentation**
- **Files**: 
  - `COORDINATE_SYSTEM.md` - Update to reflect single coordinate system
  - Track editor help documentation
  - Code comments throughout changed files

#### **7.2 Code Cleanup**
- **Remove**: All pixel-to-grid conversion functions
- **Remove**: Dead code and unused parameters
- **Update**: Comments to reflect grid unit usage

#### **Expected Outcome**: Clean, well-documented unified system

---

## 🔧 **Technical Implementation Details**

### **Key Coordinate Conversion Changes**

#### **Current Track Editor Mouse Handling**:
```javascript
// OLD: Store in pixels
const worldPos = {
  x: mouseX, // e.g., 140 pixels
  y: mouseY  // e.g., 400 pixels
};
```

#### **New Track Editor Mouse Handling**:
```javascript  
// NEW: Store in grid units (like vRacer)
const worldPos = screenToGrid(canvas, gridSize, mouseX, mouseY);
// Returns: {x: 7, y: 20} grid units
```

#### **Current Canvas Rendering**:
```javascript
// OLD: Direct pixel drawing
ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
```

#### **New Canvas Rendering**:
```javascript
// NEW: Scale grid units to pixels for display
const pixelX = point.x * gridSize; // 7 * 20 = 140
const pixelY = point.y * gridSize; // 20 * 20 = 400
ctx.arc(pixelX, pixelY, radius, 0, Math.PI * 2);
```

### **Data Structure Changes**

#### **Before** (Track Editor):
```json
{
  "track": {
    "outer": [
      {"x": 40, "y": 40},    // pixels
      {"x": 960, "y": 40},   // pixels  
      {"x": 960, "y": 660},  // pixels
      {"x": 40, "y": 660}    // pixels
    ]
  }
}
```

#### **After** (Track Editor):
```json
{
  "track": {
    "outer": [
      {"x": 2, "y": 2},      // grid units (same as vRacer)
      {"x": 48, "y": 2},     // grid units
      {"x": 48, "y": 33},    // grid units  
      {"x": 2, "y": 33}      // grid units
    ]
  }
}
```

### **Function Modifications Required**

| File | Function | Change Required |
|------|----------|----------------|
| `track-editor.js` | `handleMouseDown()` | Add `screenToGrid()` conversion |
| `track-editor.js` | `handleMouseMove()` | Add `screenToGrid()` conversion |
| `track-editor.js` | `snapToGrid()` | Work with grid units, not pixels |
| `track-renderer.js` | `drawTrackBoundary()` | Scale grid units to pixels |
| `track-renderer.js` | `drawWaypoints()` | Scale grid units to pixels |
| `racing-line-editor.js` | `handleWaypointPlacement()` | Use grid coordinates |
| `track-loader.ts` | `loadCustomTrack()` | Remove coordinate conversion |

---

## 📊 **Risk Assessment and Mitigation**

### **High Risk Items**
1. **Data Compatibility**: Old pixel-based tracks become incompatible
   - **Mitigation**: Clear error messages, migration guide
   - **Detection**: Check coordinate ranges to identify old vs new format

2. **Precision Loss**: Converting to grid units might lose precision  
   - **Mitigation**: Use floating-point grid coordinates (e.g., 7.5 units)
   - **Testing**: Verify smooth curves maintain quality

### **Medium Risk Items**  
1. **Mouse Input Accuracy**: Grid unit snapping might feel different
   - **Mitigation**: Thorough testing of mouse interaction
   - **Fallback**: Adjustable snap sensitivity

2. **Template Accuracy**: Converted templates might not match exactly
   - **Mitigation**: Manual verification of each template
   - **Testing**: Visual comparison before/after conversion

### **Low Risk Items**
1. **Performance Impact**: Scaling operations for rendering
   - **Impact**: Minimal (simple multiplication)
   - **Verification**: Performance testing confirms no regression

---

## 🧪 **Testing Strategy**

### **Unit Tests**
- Coordinate conversion functions
- Mouse-to-grid conversion accuracy
- Template coordinate validation
- Data structure integrity

### **Integration Tests**  
- Track editor → Game data flow
- Racing line compatibility
- Import/export functionality
- Template loading and creation

### **User Acceptance Tests**
- Create simple track in editor
- Import to game and verify appearance
- Create complex track with racing line
- Test all templates and tools
- Verify coordinate displays are intuitive

### **Regression Tests**
- Ensure all existing vRacer game functionality works
- Verify track editor tools still work correctly
- Confirm no visual changes to game rendering
- Validate all keyboard shortcuts and interactions

---

## 📋 **Implementation Checklist**

### **Phase 1: Core System** 
- [ ] Update track data structures to grid units
- [ ] Implement `screenToGrid()` mouse conversion  
- [ ] Update canvas rendering to scale grid→pixels
- [ ] Modify snap-to-grid for grid units
- [ ] Test basic track creation and editing

### **Phase 2: Racing Line**
- [ ] Convert racing line editor to grid units
- [ ] Update waypoint coordinate displays
- [ ] Test racing line creation and export
- [ ] Verify AI compatibility

### **Phase 3: Templates**
- [ ] Convert Simple Oval template coordinates
- [ ] Convert Figure 8 template coordinates  
- [ ] Convert GP Circuit template coordinates
- [ ] Update default values and bounds
- [ ] Test all templates load correctly

### **Phase 4: Conversion Removal**
- [ ] Remove pixel→grid conversion functions
- [ ] Update TrackLoader for direct passthrough
- [ ] Remove unused conversion parameters
- [ ] Update data validation for grid units

### **Phase 5: UI Updates**
- [ ] Update coordinate displays throughout UI
- [ ] Update help text and labels
- [ ] Update grid size display format
- [ ] Test all UI coordinate references

### **Phase 6: Testing**
- [ ] Create test tracks in editor
- [ ] Import test tracks to game  
- [ ] Verify visual accuracy
- [ ] Test all editor tools and modes
- [ ] Performance testing

### **Phase 7: Documentation**
- [ ] Update COORDINATE_SYSTEM.md
- [ ] Update code comments
- [ ] Update track editor help
- [ ] Create migration guide for old tracks

---

## 🎯 **Success Criteria**

### **Technical**
✅ Track editor stores all coordinates in grid units  
✅ No coordinate conversion code required  
✅ Direct data compatibility between editor and game  
✅ All templates and tools work correctly  
✅ No performance regression  

### **User Experience**  
✅ Coordinates shown in editor match game coordinates  
✅ Track creation workflow unchanged from user perspective  
✅ All existing editor functionality preserved  
✅ Clear error messages for incompatible old tracks  
✅ Intuitive coordinate displays throughout UI  

### **Code Quality**
✅ Simplified, cleaner codebase  
✅ Consistent coordinate system throughout  
✅ Reduced complexity and maintenance overhead  
✅ Well-documented coordinate usage  
✅ Comprehensive test coverage  

---

## 📅 **Timeline Estimate**

**Total Estimated Time**: 7-10 hours over 2-3 work sessions

**Recommended Schedule**:
- **Session 1 (3-4 hours)**: Phases 1-2 (Core system and racing line)
- **Session 2 (2-3 hours)**: Phases 3-4 (Templates and conversion removal)  
- **Session 3 (2-3 hours)**: Phases 5-7 (UI, testing, documentation)

**Milestone Checkpoints**:
1. After Phase 2: Basic track creation works in grid units
2. After Phase 4: Complete elimination of conversion layer
3. After Phase 6: All functionality tested and working
4. After Phase 7: Documentation complete, ready for release

This plan provides a systematic approach to unifying the coordinate systems while minimizing risk and ensuring quality throughout the process.