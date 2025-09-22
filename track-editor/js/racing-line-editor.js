/**
 * Racing Line Editor Module
 * 
 * Handles racing line waypoint creation, editing, and management.
 * Integrated with track editor for unified track and racing line design.
 */

const RacingLineEditor = {
    // Racing line state
    selectedWaypoint: null,
    isDraggingWaypoint: false,
    dragStartPos: null,
    hoveredWaypoint: null,
    editMode: 'select', // 'select', 'add', 'delete'
    
    // Initialize racing line editor
    init() {
        console.log('🏎️ Initializing Racing Line Editor...');
        this.setupRacingLineEvents();
        console.log('✅ Racing Line Editor initialized');
    },
    
    // Set up racing line specific event listeners
    setupRacingLineEvents() {
        // Waypoint property editors
        this.setupWaypointPropertyEvents();
        
        // NOTE: Racing line tool selection is now handled by the main TrackEditor
        
        // Racing line display options
        const showRacingLine = document.getElementById('showRacingLine');
        if (showRacingLine) {
            showRacingLine.addEventListener('change', (e) => {
                TrackEditor.view.showRacingLine = e.target.checked;
                TrackEditor.render();
            });
        }
        
        const showWaypoints = document.getElementById('showWaypoints');
        if (showWaypoints) {
            showWaypoints.addEventListener('change', (e) => {
                TrackEditor.view.showWaypoints = e.target.checked;
                TrackEditor.render();
            });
        }
    },
    
    // Set up waypoint property editing events
    setupWaypointPropertyEvents() {
        const propertyInputs = {
            'posX': (value) => this.updateSelectedWaypointProperty('pos', { ...this.getSelectedWaypoint()?.pos, x: parseFloat(value) || 0 }),
            'posY': (value) => this.updateSelectedWaypointProperty('pos', { x: this.getSelectedWaypoint()?.pos?.x || 0, y: parseFloat(value) || 0 }),
            'targetSpeed': (value) => {
                const speed = parseInt(value) || 1;
                document.getElementById('speedValue').textContent = speed;
                this.updateSelectedWaypointProperty('targetSpeed', speed);
            },
            'brakeZone': (checked) => this.updateSelectedWaypointProperty('brakeZone', checked),
            'cornerType': (value) => this.updateSelectedWaypointProperty('cornerType', value),
            'safeZone': (value) => this.updateSelectedWaypointProperty('safeZone', value)
        };
        
        Object.keys(propertyInputs).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                if (element.type === 'checkbox') {
                    element.addEventListener('change', (e) => propertyInputs[id](e.target.checked));
                } else if (element.type === 'range') {
                    element.addEventListener('input', (e) => propertyInputs[id](e.target.value));
                } else {
                    element.addEventListener('input', (e) => propertyInputs[id](e.target.value));
                }
            }
        });
        
        // Waypoint action buttons
        const insertBtn = document.getElementById('insertWaypoint');
        if (insertBtn) {
            insertBtn.addEventListener('click', () => this.insertWaypointAfterSelected());
        }
        
        const deleteBtn = document.getElementById('deleteWaypoint');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.deleteSelectedWaypoint());
        }
    },
    
    // Set racing line tool
    setRacingLineTool(tool) {
        this.editMode = tool;
        
        // Update tool button states
        this.updateRacingLineToolUI();
        
        // Update cursor and status
        switch (tool) {
            case 'select':
                TrackEditor.canvas.style.cursor = 'default';
                TrackEditor.updateStatus('Racing line select mode - click waypoints to select and edit');
                break;
            case 'add':
                TrackEditor.canvas.style.cursor = 'crosshair';
                TrackEditor.updateStatus('Racing line add mode - double-click to add waypoints');
                break;
            case 'delete':
                TrackEditor.canvas.style.cursor = 'not-allowed';
                TrackEditor.updateStatus('Racing line delete mode - click waypoints to delete');
                break;
        }
    },
    
    // Update racing line tool UI
    updateRacingLineToolUI() {
        document.querySelectorAll('#racingLineTools .tool-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-tool') === this.editMode);
        });
    },
    
    // Handle racing line mode interactions
    handleRacingLineMouseDown(worldPos, event) {
        const clickedWaypoint = this.hitTestWaypoint(worldPos);
        
        switch (this.editMode) {
            case 'select':
                if (clickedWaypoint !== null) {
                    this.selectWaypoint(clickedWaypoint);
                    this.startDraggingWaypoint(worldPos);
                } else {
                    this.selectWaypoint(null);
                }
                break;
                
            case 'delete':
                if (clickedWaypoint !== null) {
                    this.deleteWaypoint(clickedWaypoint);
                }
                break;
        }
    },
    
    // Handle racing line mode mouse move
    handleRacingLineMouseMove(worldPos) {
        if (this.isDraggingWaypoint && this.selectedWaypoint !== null) {
            this.updateWaypointPosition(this.selectedWaypoint, worldPos);
        } else {
            // Update hover state
            const hoveredWaypoint = this.hitTestWaypoint(worldPos);
            if (hoveredWaypoint !== this.hoveredWaypoint) {
                this.hoveredWaypoint = hoveredWaypoint;
                TrackEditor.render();
            }
        }
    },
    
    // Handle racing line mode mouse up
    handleRacingLineMouseUp() {
        if (this.isDraggingWaypoint) {
            this.stopDraggingWaypoint();
        }
    },
    
    // Handle racing line mode double click
    handleRacingLineDoubleClick(worldPos) {
        if (this.editMode === 'add' || this.editMode === 'select') {
            this.addWaypoint(worldPos);
        }
    },
    
    // Add waypoint at position
    addWaypoint(position) {
        const snappedPos = TrackEditor.view.snapToGrid ? TrackEditor.snapToGrid(position) : position;
        
        const newWaypoint = {
            pos: { x: snappedPos.x, y: snappedPos.y },
            targetSpeed: 3,
            brakeZone: false,
            cornerType: 'straight',
            safeZone: 'left'
        };
        
        // Find best insertion point (closest to racing line path)
        const insertIndex = this.findBestInsertionIndex(snappedPos);
        
        TrackEditor.track.racingLine.waypoints.splice(insertIndex, 0, newWaypoint);
        
        // Select the new waypoint
        this.selectWaypoint(insertIndex);
        
        // Update everything
        TrackEditor.updateStats();
        TrackEditor.updateOutput();
        TrackEditor.render();
        
        // Validate racing line
        if (typeof TrackEditor.validateRacingLine === 'function') {
            TrackEditor.validateRacingLine();
        }
        
        TrackEditor.updateStatus(`Added waypoint at (${snappedPos.x.toFixed(1)}, ${snappedPos.y.toFixed(1)})`);
    },
    
    // Delete waypoint
    deleteWaypoint(index) {
        const waypoints = TrackEditor.track.racingLine.waypoints;
        
        if (index >= 0 && index < waypoints.length) {
            waypoints.splice(index, 1);
            
            // Adjust selection
            if (this.selectedWaypoint === index) {
                this.selectWaypoint(null);
            } else if (this.selectedWaypoint > index) {
                this.selectWaypoint(this.selectedWaypoint - 1);
            }
            
            // Update everything
            TrackEditor.updateStats();
            TrackEditor.updateOutput();
            TrackEditor.render();
            
            // Validate racing line
            if (typeof TrackEditor.validateRacingLine === 'function') {
                TrackEditor.validateRacingLine();
            }
            
            TrackEditor.updateStatus('Waypoint deleted');
        }
    },
    
    // Delete selected waypoint
    deleteSelectedWaypoint() {
        if (this.selectedWaypoint !== null) {
            this.deleteWaypoint(this.selectedWaypoint);
        }
    },
    
    // Insert waypoint after selected
    insertWaypointAfterSelected() {
        if (this.selectedWaypoint === null) return;
        
        const waypoints = TrackEditor.track.racingLine.waypoints;
        const currentWaypoint = waypoints[this.selectedWaypoint];
        const nextIndex = (this.selectedWaypoint + 1) % waypoints.length;
        const nextWaypoint = waypoints[nextIndex];
        
        // Calculate midpoint
        const midX = (currentWaypoint.pos.x + nextWaypoint.pos.x) / 2;
        const midY = (currentWaypoint.pos.y + nextWaypoint.pos.y) / 2;
        
        // Create new waypoint with interpolated properties
        const newWaypoint = {
            pos: { x: midX, y: midY },
            targetSpeed: Math.round((currentWaypoint.targetSpeed + nextWaypoint.targetSpeed) / 2),
            brakeZone: false,
            cornerType: 'straight',
            safeZone: currentWaypoint.safeZone
        };
        
        waypoints.splice(this.selectedWaypoint + 1, 0, newWaypoint);
        this.selectWaypoint(this.selectedWaypoint + 1);
        
        // Update everything
        TrackEditor.updateStats();
        TrackEditor.updateOutput();
        TrackEditor.render();
        
        TrackEditor.updateStatus(`Inserted waypoint after waypoint ${this.selectedWaypoint}`);
    },
    
    // Select waypoint
    selectWaypoint(index) {
        this.selectedWaypoint = index;
        this.updateWaypointEditor();
        TrackEditor.render();
    },
    
    // Get selected waypoint
    getSelectedWaypoint() {
        if (this.selectedWaypoint === null) return null;
        return TrackEditor.track.racingLine.waypoints[this.selectedWaypoint];
    },
    
    // Update selected waypoint property
    updateSelectedWaypointProperty(property, value) {
        const waypoint = this.getSelectedWaypoint();
        if (waypoint) {
            waypoint[property] = value;
            TrackEditor.updateStats();
            TrackEditor.updateOutput();
            TrackEditor.render();
            
            // Validate racing line if position changed
            if (property === 'pos' && typeof TrackEditor.validateRacingLine === 'function') {
                TrackEditor.validateRacingLine();
            }
        }
    },
    
    // Start dragging waypoint
    startDraggingWaypoint(worldPos) {
        this.isDraggingWaypoint = true;
        this.dragStartPos = { x: worldPos.x, y: worldPos.y };
        TrackEditor.canvas.style.cursor = 'move';
    },
    
    // Stop dragging waypoint
    stopDraggingWaypoint() {
        this.isDraggingWaypoint = false;
        this.dragStartPos = null;
        TrackEditor.canvas.style.cursor = 'default';
    },
    
    // Update waypoint position
    updateWaypointPosition(index, worldPos) {
        const waypoints = TrackEditor.track.racingLine.waypoints;
        
        if (index >= 0 && index < waypoints.length) {
            const snappedPos = TrackEditor.view.snapToGrid ? TrackEditor.snapToGrid(worldPos) : worldPos;
            waypoints[index].pos = { x: snappedPos.x, y: snappedPos.y };
            
            // Update property editor if this waypoint is selected
            if (index === this.selectedWaypoint) {
                this.updateWaypointEditor();
            }
            
            TrackEditor.updateStats();
            TrackEditor.updateOutput();
            TrackEditor.render();
            
            // Validate racing line after position change
            if (typeof TrackEditor.validateRacingLine === 'function') {
                TrackEditor.validateRacingLine();
            }
        }
    },
    
    // Hit test waypoint at world position
    hitTestWaypoint(worldPos) {
        const waypoints = TrackEditor.track.racingLine.waypoints;
        // FIXED: Hit radius should be in grid units, not pixels
        // 0.4 grid units = 8 pixels (reasonable click target)
        const hitRadius = 0.4; 
        
        for (let i = 0; i < waypoints.length; i++) {
            const waypoint = waypoints[i];
            const dx = worldPos.x - waypoint.pos.x;
            const dy = worldPos.y - waypoint.pos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= hitRadius) {
                return i;
            }
        }
        
        return null;
    },
    
    // Find best insertion index for new waypoint
    findBestInsertionIndex(position) {
        const waypoints = TrackEditor.track.racingLine.waypoints;
        
        if (waypoints.length === 0) {
            return 0;
        }
        
        if (waypoints.length === 1) {
            return 1;
        }
        
        let bestIndex = waypoints.length;
        let minDistance = Infinity;
        
        // Find closest line segment
        for (let i = 0; i < waypoints.length; i++) {
            const current = waypoints[i];
            const next = waypoints[(i + 1) % waypoints.length];
            
            // Calculate distance to line segment
            const distance = this.distanceToLineSegment(
                position,
                current.pos,
                next.pos
            );
            
            if (distance < minDistance) {
                minDistance = distance;
                bestIndex = i + 1;
            }
        }
        
        return bestIndex % (waypoints.length + 1);
    },
    
    // Calculate distance from point to line segment
    distanceToLineSegment(point, lineStart, lineEnd) {
        const A = point.x - lineStart.x;
        const B = point.y - lineStart.y;
        const C = lineEnd.x - lineStart.x;
        const D = lineEnd.y - lineStart.y;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        
        if (lenSq === 0) {
            return Math.sqrt(A * A + B * B);
        }
        
        let param = dot / lenSq;
        
        let xx, yy;
        
        if (param < 0) {
            xx = lineStart.x;
            yy = lineStart.y;
        } else if (param > 1) {
            xx = lineEnd.x;
            yy = lineEnd.y;
        } else {
            xx = lineStart.x + param * C;
            yy = lineStart.y + param * D;
        }
        
        const dx = point.x - xx;
        const dy = point.y - yy;
        
        return Math.sqrt(dx * dx + dy * dy);
    },
    
    // Update waypoint editor panel
    updateWaypointEditor() {
        const waypointEditor = document.getElementById('waypointEditor');
        const noSelection = document.getElementById('noWaypointSelection');
        const waypointProperties = document.getElementById('waypointProperties');
        
        if (this.selectedWaypoint === null) {
            if (noSelection) noSelection.style.display = 'block';
            if (waypointProperties) waypointProperties.style.display = 'none';
            return;
        }
        
        if (noSelection) noSelection.style.display = 'none';
        if (waypointProperties) waypointProperties.style.display = 'block';
        
        const waypoint = this.getSelectedWaypoint();
        if (waypoint) {
            // Update form fields
            const waypointIndex = document.getElementById('waypointIndex');
            if (waypointIndex) waypointIndex.textContent = this.selectedWaypoint.toString();
            
            const posX = document.getElementById('posX');
            if (posX) posX.value = waypoint.pos.x.toFixed(1);
            
            const posY = document.getElementById('posY');
            if (posY) posY.value = waypoint.pos.y.toFixed(1);
            
            const targetSpeed = document.getElementById('targetSpeed');
            if (targetSpeed) targetSpeed.value = waypoint.targetSpeed;
            
            const speedValue = document.getElementById('speedValue');
            if (speedValue) speedValue.textContent = waypoint.targetSpeed.toString();
            
            const brakeZone = document.getElementById('brakeZone');
            if (brakeZone) brakeZone.checked = waypoint.brakeZone;
            
            const cornerType = document.getElementById('cornerType');
            if (cornerType) cornerType.value = waypoint.cornerType;
            
            const safeZone = document.getElementById('safeZone');
            if (safeZone) safeZone.value = waypoint.safeZone;
        }
    }
};

// Export to global scope
if (typeof window !== 'undefined') {
    window.RacingLineEditor = RacingLineEditor;
}
