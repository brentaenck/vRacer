# Racing Line Editor Controls

## Mouse Controls

### **Waypoint Selection & Editing**
- **Single Click**: Select waypoint (gold outline appears)
- **Double Click**: Add new waypoint at cursor position
- **Drag & Drop**: Move selected waypoint to new position
- **Hover**: Preview waypoint selection (white outline, cursor changes)

### **Visual States**
- **Gold Outline**: Selected waypoint (larger size)
- **White Outline**: Hovered waypoint  
- **Red Outline**: Brake zone waypoint
- **Color Coding**: Blue=straight, Orange=entry, Red=apex, Green=exit

## Keyboard Shortcuts

### **Waypoint Management**
- **Delete/Backspace**: Delete selected waypoint
- **Ctrl+I / Cmd+I**: Insert waypoint after selected waypoint
- **Insert Key**: Insert waypoint after selected waypoint
- **Escape**: Deselect current waypoint

### **Edit History**
- **Ctrl+Z / Cmd+Z**: Undo last change
- **Ctrl+Shift+Z / Cmd+Y**: Redo change
- **50-level undo/redo history** for all modifications

## Property Editor

### **Position Controls**
- **X/Y Coordinates**: Direct position input with decimal precision
- **Live Updates**: Changes apply immediately to racing line

### **Racing Properties**
- **Target Speed**: 1-6 slider with live preview
- **Brake Zone**: Toggle for marking braking points
- **Corner Type**: Dropdown (straight/entry/apex/exit)
- **Safe Zone**: Position preference (left/right/top/bottom)

### **Buttons**
- **Insert Waypoint**: Add waypoint after selected waypoint
- **Delete Waypoint**: Remove selected waypoint
- **Copy Code**: Copy generated TypeScript to clipboard

## Waypoint Insertion Methods

### **1. Double-Click Method**
- Double-click empty track area
- Waypoint placed at exact cursor position
- Automatically inserted at best position in racing line sequence
- Default properties: speed=3, straight, no brake zone

### **2. Insert After Selected**
- Select existing waypoint first
- Click "Insert Waypoint" button OR press Ctrl+I
- New waypoint placed at midpoint to next waypoint
- Properties interpolated from neighboring waypoints

### **3. Smart Positioning**
- Editor calculates optimal insertion point in racing line
- Maintains proper waypoint sequence for closed loop
- Distance-based algorithm finds closest line segment

## Display Options

### **Visualization Toggles**
- **Show Grid**: Coordinate grid with axis labels every 5 units
- **Show Racing Line**: Green line connecting all waypoints
- **Show Waypoints**: Individual waypoint markers with color coding
- **Show Track Bounds**: Track surface and boundaries
- **Snap to Grid**: Force waypoints to align to grid intersections (1.0 unit precision)

### **Live Code Generation**
- **TypeScript Output**: Complete racing line code ready for vRacer
- **Auto-Updates**: Code regenerates with every change
- **Copy to Clipboard**: One-click copying for integration

## Grid Snapping

### **Precision Control**
- **Toggle**: Enable/disable with "Snap to Grid" checkbox
- **Grid Size**: 1.0 unit precision (matches coordinate grid)
- **Applies To**: All waypoint positioning methods

### **When Grid Snap is Active:**
- **Double-click insertion**: Waypoints snap to nearest grid intersection
- **Drag & drop**: Waypoints snap while dragging in real-time
- **Property editor**: X/Y inputs automatically round to nearest grid point
- **Insert button**: Midpoint calculations snap to grid
- **Visual feedback**: Input fields show snapped coordinates

### **Benefits:**
- **Alignment**: Perfect waypoint alignment with track geometry
- **Consistency**: All waypoints use whole number coordinates
- **Precision**: Eliminates floating-point positioning errors
- **Clean code**: Generated racing line uses integer coordinates

## Usage Tips

### **Efficient Workflow**
1. Enable all display options for full context
2. Use double-click for quick waypoint placement
3. Select and drag for fine positioning
4. Use property editor for precise tuning
5. Use keyboard shortcuts for rapid editing

### **Best Practices**
- **Start with key points**: Place waypoints at corners and straights
- **Refine gradually**: Add intermediate waypoints where needed
- **Use brake zones**: Mark heavy braking points
- **Test iteratively**: Copy code and test in vRacer frequently
- **Save often**: Use Ctrl+S to save your work (if implemented)

### **Corner Optimization**
- **Entry points**: Mark corner approach with "entry" type
- **Apex points**: Mark optimal turning point with "apex" type  
- **Exit points**: Mark corner exit with "exit" type
- **Speed tuning**: Lower speeds for tight corners, higher for straights
- **Brake zones**: Mark points where heavy braking is needed

The editor provides complete racing line editing with professional-grade tools for creating optimal lap times!
