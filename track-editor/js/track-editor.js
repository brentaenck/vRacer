/**
 * vRacer Track Editor - Core Module
 * 
 * Handles track geometry editing with professional canvas-based tools.
 * Manages drawing, editing, and validation of track boundaries.
 */

// Global state
const TrackEditor = {
    // Editor state
    mode: 'track',
    tool: 'pen',
    boundaryType: 'outer',
    
    // Canvas and rendering
    canvas: null,
    ctx: null,
    canvasRect: null,
    
    // Track data
    track: {
        metadata: {
            name: 'New Track',
            author: 'Anonymous',
            description: '',
            difficulty: 'Medium',
            version: '1.0.0',
            created: new Date().toISOString(),
            tags: ['custom']
        },
        track: {
            outer: [],
            inner: [],
            startLine: { a: { x: 0, y: 0 }, b: { x: 0, y: 0 } },
            checkpoints: [],
            walls: []
        },
        racingLine: {
            waypoints: [],
            direction: 'counter-clockwise',
            validated: false
        },
        validation: {
            trackValid: false,
            racingLineValid: false,
            errors: [],
            warnings: [],
            metrics: {
                trackLength: 0,
                avgWidth: 0,
                complexity: 0
            }
        }
    },
    
    // View state
    view: {
        zoom: 1.0,
        offsetX: 0,
        offsetY: 0,
        gridSize: 20,
        showGrid: true,
        snapToGrid: true,
        showTrackBounds: true,
        showRacingLine: true,
        showWaypoints: true,
        showValidation: false
    },
    
    // Interaction state
    isDrawing: false,
    selectedPoints: [],
    hoveredPoint: null,
    mousePos: { x: 0, y: 0 },
    dragStart: null,
    isDragging: false,
    dragPointIndex: -1,
    dragBoundaryType: 'outer',
    
    // Initialize the editor
    init() {
        console.log('🏁 Initializing Track Editor Core...');
        
        // Get canvas and context
        this.canvas = document.getElementById('trackCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.updateCanvasRect();
        
        // Set up event listeners
        this.setupEventListeners();
        this.setupUI();
        
        // Initial render
        this.render();
        
        console.log('✅ Track Editor Core initialized');
    },
    
    // Set up all event listeners
    setupEventListeners() {
        // Mode switching
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setMode(e.target.dataset.mode);
            });
        });
        
        // Tool selection
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setTool(e.target.dataset.tool);
            });
        });
        
        // Boundary type selection
        document.querySelectorAll('input[name="boundary"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.boundaryType = e.target.value;
                this.updateStatus(`Drawing ${e.target.value} boundary`);
            });
        });
        
        // Canvas mouse events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('dblclick', (e) => this.handleDoubleClick(e));
        
        // View controls
        document.getElementById('zoomIn')?.addEventListener('click', () => this.zoomIn());
        document.getElementById('zoomOut')?.addEventListener('click', () => this.zoomOut());
        document.getElementById('fitView')?.addEventListener('click', () => this.fitView());
        document.getElementById('resetView')?.addEventListener('click', () => this.resetView());
        
        // View options
        document.getElementById('showGrid')?.addEventListener('change', (e) => {
            this.view.showGrid = e.target.checked;
            this.render();
        });
        
        document.getElementById('snapToGrid')?.addEventListener('change', (e) => {
            this.view.snapToGrid = e.target.checked;
        });
        
        document.getElementById('showTrackBounds')?.addEventListener('change', (e) => {
            this.view.showTrackBounds = e.target.checked;
            this.render();
        });
        
        // Template buttons
        document.querySelectorAll('.template-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.loadTemplate(e.target.dataset.template);
            });
        });
        
        // Property inputs
        this.setupPropertyInputs();
        
        // File management buttons
        this.setupFileManagement();
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        
        // Window resize
        window.addEventListener('resize', () => {
            this.updateCanvasRect();
            this.render();
        });
        
        // Auto-save setup
        this.setupAutoSave();
    },
    
    // Set up property input handlers
    setupPropertyInputs() {
        const trackName = document.getElementById('trackName');
        const trackAuthor = document.getElementById('trackAuthor');
        const trackDifficulty = document.getElementById('trackDifficulty');
        const trackDescription = document.getElementById('trackDescription');
        
        if (trackName) {
            trackName.addEventListener('change', (e) => {
                this.track.metadata.name = e.target.value;
                this.incrementAutoSave();
                this.updateOutput();
            });
        }
        
        if (trackAuthor) {
            trackAuthor.addEventListener('change', (e) => {
                this.track.metadata.author = e.target.value;
                this.incrementAutoSave();
                this.updateOutput();
            });
        }
        
        if (trackDifficulty) {
            trackDifficulty.addEventListener('change', (e) => {
                this.track.metadata.difficulty = e.target.value;
                this.incrementAutoSave();
                this.updateOutput();
            });
        }
        
        if (trackDescription) {
            trackDescription.addEventListener('change', (e) => {
                this.track.metadata.description = e.target.value;
                this.incrementAutoSave();
                this.updateOutput();
            });
        }
    },
    
    // Set up UI state
    setupUI() {
        this.updateModeUI();
        this.updateToolUI();
        this.updateStats();
        this.updateOutput();
        this.updateStatus('Ready - Select a tool to begin editing');
    },
    
    // Handle mouse down
    handleMouseDown(e) {
        const pos = this.getCanvasPosition(e);
        const worldPos = this.screenToWorld(pos);
        
        this.dragStart = worldPos;
        
        if (this.mode === 'track') {
            this.handleTrackMouseDown(worldPos);
        }
    },
    
    // Handle track editing mouse down
    handleTrackMouseDown(pos) {
        const snappedPos = this.view.snapToGrid ? this.snapToGrid(pos) : pos;
        
        switch (this.tool) {
            case 'pen':
                this.handlePenTool(snappedPos);
                break;
            case 'eraser':
                this.handleEraserTool(snappedPos);
                break;
            case 'move':
                this.handleMoveTool(snappedPos);
                break;
            case 'startfinish':
                this.handleStartFinishTool(snappedPos);
                break;
        }
    },
    
    // Handle pen tool
    handlePenTool(pos) {
        const boundary = this.boundaryType === 'outer' ? this.track.track.outer : this.track.track.inner;
        
        // Check if we're closing the loop
        if (boundary.length >= 3) {
            const firstPoint = boundary[0];
            const distance = Math.sqrt(
                Math.pow(pos.x - firstPoint.x, 2) + Math.pow(pos.y - firstPoint.y, 2)
            );
            
            if (distance <= 10) {
                // Close the loop by adding a marker or flag
                // We don't add the first point again, but we mark the boundary as closed
                if (!boundary.closed) {
                    boundary.closed = true;
                    
                    // Track change for auto-save
                    this.incrementAutoSave();
                    
                    this.updateStatus(`${this.boundaryType} boundary completed!`);
                    this.validateTrack();
                    this.updateStats();
                    this.updateOutput();
                    this.render();
                }
                return;
            }
        }
        
        // Add point to boundary
        boundary.push({ x: pos.x, y: pos.y });
        
        // Track change for auto-save
        this.incrementAutoSave();
        
        this.updateStats();
        this.updateOutput();
        this.render();
        
        this.updateStatus(`Added point to ${this.boundaryType} boundary (${boundary.length} points)`);
    },
    
    // Handle eraser tool
    handleEraserTool(pos) {
        const boundary = this.boundaryType === 'outer' ? this.track.track.outer : this.track.track.inner;
        
        // Find closest point within eraser range
        let closestIndex = -1;
        let closestDistance = Infinity;
        const eraseRange = 8; // pixels
        
        for (let i = 0; i < boundary.length; i++) {
            const point = boundary[i];
            const distance = Math.sqrt(
                Math.pow(pos.x - point.x, 2) + Math.pow(pos.y - point.y, 2)
            );
            
            if (distance <= eraseRange && distance < closestDistance) {
                closestDistance = distance;
                closestIndex = i;
            }
        }
        
        if (closestIndex !== -1) {
            // Remove the point
            boundary.splice(closestIndex, 1);
            
            // If we removed points and now have fewer than 3, mark as not closed
            if (boundary.length < 3) {
                delete boundary.closed;
            }
            
            // Track change for auto-save
            this.incrementAutoSave();
            
            // Update everything
            this.validateTrack();
            this.updateStats();
            this.updateOutput();
            this.render();
            
            this.updateStatus(`Removed point from ${this.boundaryType} boundary (${boundary.length} points remaining)`);
        } else {
        this.updateStatus(`No ${this.boundaryType} boundary point found to erase`);
        }
    },
    
    // Handle move tool
    handleMoveTool(pos) {
        const boundary = this.boundaryType === 'outer' ? this.track.track.outer : this.track.track.inner;
        
        // Find closest point within selection range
        let closestIndex = -1;
        let closestDistance = Infinity;
        const selectRange = 10; // pixels
        
        for (let i = 0; i < boundary.length; i++) {
            const point = boundary[i];
            const distance = Math.sqrt(
                Math.pow(pos.x - point.x, 2) + Math.pow(pos.y - point.y, 2)
            );
            
            if (distance <= selectRange && distance < closestDistance) {
                closestDistance = distance;
                closestIndex = i;
            }
        }
        
        if (closestIndex !== -1) {
            // Start dragging this point
            this.selectedPoints = [closestIndex];
            this.isDragging = true;
            this.dragPointIndex = closestIndex;
            this.dragBoundaryType = this.boundaryType;
            
            this.updateStatus(`Selected ${this.boundaryType} boundary point ${closestIndex + 1} - drag to move`);
        } else {
            // Deselect if clicking empty space
            this.selectedPoints = [];
            this.updateStatus(`Move tool active - click on a ${this.boundaryType} boundary point to select and drag`);
        }
        
        this.render();
    },
    
    // Handle mouse move
    handleMouseMove(e) {
        const pos = this.getCanvasPosition(e);
        const worldPos = this.screenToWorld(pos);
        
        this.mousePos = worldPos;
        
        // Handle dragging for move tool
        if (this.isDragging && this.dragPointIndex !== -1) {
            const boundary = this.dragBoundaryType === 'outer' ? this.track.track.outer : this.track.track.inner;
            const snappedPos = this.view.snapToGrid ? this.snapToGrid(worldPos) : worldPos;
            
            if (boundary[this.dragPointIndex]) {
                boundary[this.dragPointIndex].x = snappedPos.x;
                boundary[this.dragPointIndex].y = snappedPos.y;
                
                // Update validation and output during drag
                this.validateTrack();
                this.updateStats();
                this.updateOutput();
            }
        }
        
        // Update mouse position display
        const mousePositionEl = document.getElementById('mousePosition');
        if (mousePositionEl) {
            const snappedPos = this.view.snapToGrid ? this.snapToGrid(worldPos) : worldPos;
            mousePositionEl.textContent = `Mouse: (${snappedPos.x.toFixed(1)}, ${snappedPos.y.toFixed(1)})`;
        }
        
        // Update hover state and render if needed (but not during dragging)
        if (!this.isDragging) {
            this.updateHover(worldPos);
            this.updateLoopCloseStatus(worldPos);
        }
        this.render();
    },
    
    // Handle mouse up
    handleMouseUp(e) {
        if (this.isDragging && this.dragPointIndex !== -1) {
            // Track change for auto-save
            this.incrementAutoSave();
            
            // Finish dragging
            this.isDragging = false;
            const pointNum = this.dragPointIndex + 1;
            this.updateStatus(`Moved ${this.dragBoundaryType} boundary point ${pointNum} - click another point to select`);
            this.dragPointIndex = -1;
        }
        this.dragStart = null;
    },
    
    // Handle click
    handleClick(e) {
        // Click handling is mostly done in mousedown
        // This is here for any additional click-specific logic
    },
    
    // Handle double click
    handleDoubleClick(e) {
        if (this.mode === 'racing') {
            // Add waypoint for racing line
            const pos = this.getCanvasPosition(e);
            const worldPos = this.screenToWorld(pos);
            const snappedPos = this.view.snapToGrid ? this.snapToGrid(worldPos) : worldPos;
            
            this.addWaypoint(snappedPos);
        }
    },
    
    // Show save dialog
    showSaveDialog() {
        const name = prompt('Enter track name:', this.track.metadata.name || 'Untitled Track');
        if (name) {
            this.saveTrack(name);
        }
    },
    
    // Save track with given name
    saveTrack(name) {
        try {
            this.track.metadata.name = name;
            this.track.metadata.lastModified = new Date().toISOString();
            
            // Store boundary closed states in metadata (since JSON doesn't preserve array properties)
            this.track.metadata.boundaries = {
                outerClosed: !!this.track.track.outer.closed,
                innerClosed: !!this.track.track.inner.closed
            };
            
            FileManager.saveTrack(this.track, name);
            this.updateStatus(`Track "${name}" saved successfully`);
            this.autoSaveActions = 0; // Reset since we just saved
        } catch (error) {
            console.error('Save failed:', error);
            this.updateStatus('Save failed: ' + error.message, 'error');
        }
    },
    
    // Show load dialog
    showLoadDialog() {
        const tracks = FileManager.listSavedTracks();
        if (tracks.length === 0) {
            alert('No saved tracks found.');
            return;
        }
        
        // Create simple dialog
        let message = 'Select track to load:\n\n';
        tracks.forEach((track, index) => {
            const modified = new Date(track.modified).toLocaleDateString();
            message += `${index + 1}. ${track.displayName} (${modified})\n`;
        });
        
        const choice = prompt(message + '\nEnter number (1-' + tracks.length + '):', '1');
        const trackIndex = parseInt(choice) - 1;
        
        if (trackIndex >= 0 && trackIndex < tracks.length) {
            this.loadTrack(tracks[trackIndex].name);
        }
    },
    
    // Load track by name
    loadTrack(name) {
        try {
            const trackData = FileManager.loadTrack(name);
            if (trackData) {
                this.loadTrackData(trackData);
                this.updateStatus(`Track "${name}" loaded successfully`);
            } else {
                this.updateStatus('Track not found', 'error');
            }
        } catch (error) {
            console.error('Load failed:', error);
            this.updateStatus('Load failed: ' + error.message, 'error');
        }
    },
    
    // Load track data into editor
    loadTrackData(trackData) {
        this.track = trackData;
        
        // Restore boundary closed states from metadata (since JSON doesn't preserve array properties)
        if (this.track.metadata && this.track.metadata.boundaries) {
            if (this.track.metadata.boundaries.outerClosed) {
                this.track.track.outer.closed = true;
            }
            if (this.track.metadata.boundaries.innerClosed) {
                this.track.track.inner.closed = true;
            }
        }
        
        // Reset editor state
        this.selectedTool = 'pen';
        this.selectedMode = 'outer';
        this.selectedPointIndex = -1;
        this.hoveredPointIndex = -1;
        this.isDrawing = false;
        
        // Update UI
        this.updatePropertyInputs();
        this.updateToolUI();
        this.updateModeUI();
        this.render();
    },
    
    // Export track as JSON file
    exportTrack() {
        try {
            const name = this.track.metadata.name || 'track';
            const cleanName = name.replace(/[^a-zA-Z0-9-_]/g, '_');
            
            // Update metadata before export
            this.track.metadata.lastModified = new Date().toISOString();
            this.track.metadata.version = '1.0.0';
            
            // Store boundary closed states in metadata (since JSON doesn't preserve array properties)
            this.track.metadata.boundaries = {
                outerClosed: !!this.track.track.outer.closed,
                innerClosed: !!this.track.track.inner.closed
            };
            
            FileManager.exportTrack(this.track, `${cleanName}.json`);
            this.updateStatus(`Track exported as ${cleanName}.json`);
        } catch (error) {
            console.error('Export failed:', error);
            this.updateStatus('Export failed: ' + error.message, 'error');
        }
    },
    
    // Import track from JSON file
    async importTrack() {
        try {
            const hasUnsavedChanges = this.autoSaveActions > 0;
            if (hasUnsavedChanges) {
                const shouldContinue = confirm('You have unsaved changes. Import track anyway?');
                if (!shouldContinue) return;
            }
            
            this.updateStatus('Select JSON file to import...');
            const trackData = await FileManager.importTrack();
            
            if (trackData) {
                this.loadTrackData(trackData);
                this.updateStatus(`Track "${trackData.metadata?.name || 'Imported Track'}" imported successfully`);
                this.fitView(); // Fit the view to show the imported track
            } else {
                this.updateStatus('Import cancelled');
            }
        } catch (error) {
            console.error('Import failed:', error);
            this.updateStatus('Import failed: ' + error.message, 'error');
        }
    },
    
    // Show manage tracks dialog
    showManageTracksDialog() {
        const tracks = FileManager.listSavedTracks();
        
        if (tracks.length === 0) {
            alert('No saved tracks to manage.');
            return;
        }
        
        // Create dialog content
        let message = 'Manage Saved Tracks:\n\n';
        tracks.forEach((track, index) => {
            const modified = new Date(track.modified).toLocaleDateString();
            const size = track.pointCount + track.waypointCount;
            message += `${index + 1}. "${track.displayName}" by ${track.author}\n`;
            message += `   Modified: ${modified} | Points: ${size} | Difficulty: ${track.difficulty}\n\n`;
        });
        
        message += 'Actions:\n';
        message += 'D + number: Delete track (e.g., "D1")\n';
        message += 'CLEAR ALL: Delete all saved tracks\n';
        message += 'Press Cancel or Enter to close\n\n';
        
        const action = prompt(message + 'Enter action:', '');
        
        if (!action) return; // User cancelled
        
        this.processManageAction(action.trim().toUpperCase(), tracks);
    },
    
    // Process manage tracks action
    processManageAction(action, tracks) {
        try {
            if (action === 'CLEAR ALL') {
                const confirm = prompt(
                    `⚠️  WARNING: This will permanently delete ALL ${tracks.length} saved tracks!\n\n` +
                    'Type "DELETE ALL" to confirm:', 
                    ''
                );
                
                if (confirm === 'DELETE ALL') {
                    this.clearAllTracks(tracks);
                } else {
                    this.updateStatus('Clear all tracks cancelled');
                }
                
            } else if (action.startsWith('D') && action.length > 1) {
                const trackNumber = parseInt(action.substring(1));
                
                if (trackNumber >= 1 && trackNumber <= tracks.length) {
                    this.deleteTrack(tracks[trackNumber - 1]);
                } else {
                    this.updateStatus('Invalid track number', 'error');
                }
                
            } else if (action !== '') {
                this.updateStatus('Unknown action. Use D1, D2, etc. or CLEAR ALL', 'error');
            }
            
        } catch (error) {
            console.error('Manage tracks error:', error);
            this.updateStatus('Action failed: ' + error.message, 'error');
        }
    },
    
    // Delete single track
    deleteTrack(track) {
        const confirm = window.confirm(
            `Delete track "${track.displayName}" by ${track.author}?\n\n` +
            `Modified: ${new Date(track.modified).toLocaleString()}\n` +
            `This action cannot be undone.`
        );
        
        if (confirm) {
            try {
                const success = FileManager.deleteTrack(track.name);
                if (success) {
                    this.updateStatus(`Track "${track.displayName}" deleted successfully`);
                } else {
                    this.updateStatus('Failed to delete track', 'error');
                }
            } catch (error) {
                console.error('Delete track error:', error);
                this.updateStatus('Delete failed: ' + error.message, 'error');
            }
        } else {
            this.updateStatus('Delete cancelled');
        }
    },
    
    // Clear all tracks
    clearAllTracks(tracks) {
        let deletedCount = 0;
        let errors = [];
        
        for (const track of tracks) {
            try {
                const success = FileManager.deleteTrack(track.name);
                if (success) {
                    deletedCount++;
                } else {
                    errors.push(track.displayName);
                }
            } catch (error) {
                errors.push(`${track.displayName} (${error.message})`);
            }
        }
        
        // Also clear auto-save
        try {
            FileManager.clearAutoSave();
        } catch (error) {
            console.warn('Failed to clear auto-save:', error);
        }
        
        if (errors.length === 0) {
            this.updateStatus(`Successfully deleted all ${deletedCount} tracks and cleared auto-save`);
        } else {
            this.updateStatus(
                `Deleted ${deletedCount}/${tracks.length} tracks. Errors: ${errors.join(', ')}`, 
                'error'
            );
        }
    },
    
    // Create new track (with confirmation)
    newTrack() {
        const hasUnsavedChanges = this.autoSaveActions > 0;
        if (hasUnsavedChanges) {
            const shouldContinue = confirm('You have unsaved changes. Create new track anyway?');
            if (!shouldContinue) return;
        }
        
        this.loadBlankTemplate();
        this.updateStatus('New track created');
        // Note: loadBlankTemplate() already calls render()
    },
    
    // Handle keyboard shortcuts
    handleKeyDown(e) {
        // File operations
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 's':
                    e.preventDefault();
                    this.showSaveDialog();
                    break;
                case 'o':
                    e.preventDefault();
                    this.showLoadDialog();
                    break;
                case 'i':
                    e.preventDefault();
                    this.importTrack();
                    break;
                case 'e':
                    e.preventDefault();
                    this.exportTrack();
                    break;
                case 'n':
                    e.preventDefault();
                    this.newTrack();
                    break;
                case 'm':
                    e.preventDefault();
                    this.showManageTracksDialog();
                    break;
            }
            return;
        }
        
        // Don't handle shortcuts if user is typing in inputs
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
            return;
        }
        
        switch (e.key.toLowerCase()) {
            case 'p':
                this.setTool('pen');
                break;
            case 'e':
                this.setTool('eraser');
                break;
            case 'm':
                this.setTool('move');
                break;
            case 's':
                this.setTool('startfinish');
                break;
            case 'g':
                document.getElementById('showGrid')?.click();
                break;
            case '1':
                this.setMode('track');
                break;
            case '2':
                this.setMode('racing');
                break;
            case '3':
                this.setMode('preview');
                break;
            case 'escape':
                // Clear selections and stop dragging
                this.selectedPoints = [];
                this.isDragging = false;
                this.dragPointIndex = -1;
                this.updateStatus(`${this.tool} tool active`);
                this.render();
                break;
        }
    },
    
    // Set editor mode
    setMode(mode) {
        this.mode = mode;
        this.updateModeUI();
        this.updateStatus(`Switched to ${mode} mode`);
        
        // Show/hide relevant tool panels
        if (mode === 'track') {
            document.getElementById('trackTools').style.display = 'block';
            document.getElementById('racingLineTools').style.display = 'none';
            document.getElementById('waypointEditor').style.display = 'none';
        } else if (mode === 'racing') {
            document.getElementById('trackTools').style.display = 'none';
            document.getElementById('racingLineTools').style.display = 'block';
            document.getElementById('waypointEditor').style.display = 'block';
        }
        
        this.render();
    },
    
    // Set editor tool
    setTool(tool) {
        // Clear any existing selections/dragging when changing tools
        this.selectedPoints = [];
        this.isDragging = false;
        this.dragPointIndex = -1;
        
        this.tool = tool;
        this.updateToolUI();
        
        // Update status with tool-specific instructions
        switch (tool) {
            case 'pen':
                this.updateStatus(`Pen tool active - click to add ${this.boundaryType} boundary points`);
                this.canvas.style.cursor = 'crosshair';
                break;
            case 'eraser':
                this.updateStatus(`Eraser tool active - click on ${this.boundaryType} boundary points to remove them`);
                this.canvas.style.cursor = 'not-allowed';
                break;
            case 'move':
                this.updateStatus(`Move tool active - click on ${this.boundaryType} boundary points to select and drag`);
                this.canvas.style.cursor = 'move';
                break;
            case 'startfinish':
                this.updateStatus(`Start/Finish tool active - click to place racing start/finish line`);
                this.canvas.style.cursor = 'crosshair';
                break;
            default:
                this.updateStatus(`${tool} tool selected`);
                this.canvas.style.cursor = 'default';
        }
        
        // Re-render to update visual state
        this.render();
    },
    
    // Update mode UI
    updateModeUI() {
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === this.mode);
        });
    },
    
    // Update tool UI
    updateToolUI() {
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === this.tool);
        });
    },
    
    // Update statistics display
    updateStats() {
        const trackPointCount = document.getElementById('trackPointCount');
        const waypointCount = document.getElementById('waypointCount');
        const trackLength = document.getElementById('trackLength');
        const avgSpeed = document.getElementById('avgSpeed');
        
        if (trackPointCount) {
            const totalPoints = this.track.track.outer.length + this.track.track.inner.length;
            trackPointCount.textContent = totalPoints;
        }
        
        if (waypointCount) {
            waypointCount.textContent = this.track.racingLine.waypoints.length;
        }
        
        if (trackLength) {
            const length = this.calculateTrackLength();
            trackLength.textContent = `${Math.round(length)} units`;
        }
        
        if (avgSpeed && this.track.racingLine.waypoints.length > 0) {
            const avgSpeedValue = this.track.racingLine.waypoints
                .reduce((sum, wp) => sum + (wp.targetSpeed || 3), 0) / this.track.racingLine.waypoints.length;
            avgSpeed.textContent = avgSpeedValue.toFixed(1);
        } else if (avgSpeed) {
            avgSpeed.textContent = '0';
        }
    },
    
    // Calculate track length
    calculateTrackLength() {
        let length = 0;
        const points = this.track.track.outer;
        
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            length += Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
        }
        
        return length;
    },
    
    // Update output code
    updateOutput() {
        const outputCode = document.getElementById('outputCode');
        if (!outputCode) return;
        
        const jsonOutput = JSON.stringify(this.track, null, 2);
        outputCode.innerHTML = `<code>${this.escapeHtml(jsonOutput)}</code>`;
    },
    
    // Update status message
    updateStatus(message) {
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.textContent = message;
        }
    },
    
    // Utility functions
    getCanvasPosition(e) {
        this.updateCanvasRect();
        return {
            x: e.clientX - this.canvasRect.left,
            y: e.clientY - this.canvasRect.top
        };
    },
    
    updateCanvasRect() {
        this.canvasRect = this.canvas.getBoundingClientRect();
    },
    
    screenToWorld(screenPos) {
        return {
            x: (screenPos.x - this.view.offsetX) / this.view.zoom,
            y: (screenPos.y - this.view.offsetY) / this.view.zoom
        };
    },
    
    worldToScreen(worldPos) {
        return {
            x: worldPos.x * this.view.zoom + this.view.offsetX,
            y: worldPos.y * this.view.zoom + this.view.offsetY
        };
    },
    
    snapToGrid(pos) {
        const gridSize = this.view.gridSize;
        return {
            x: Math.round(pos.x / gridSize) * gridSize,
            y: Math.round(pos.y / gridSize) * gridSize
        };
    },
    
    updateHover(worldPos) {
        // Check if mouse is hovering over any points
        // This would be used for highlighting hovered elements
        this.hoveredPoint = null;
        
        // Only check hover for current boundary type when using eraser/move tools
        if (this.tool === 'eraser' || this.tool === 'move') {
            const boundary = this.boundaryType === 'outer' ? this.track.track.outer : this.track.track.inner;
            const hoverRange = this.tool === 'eraser' ? 8 : 10;
            
            for (let i = 0; i < boundary.length; i++) {
                const point = boundary[i];
                const distance = Math.sqrt(
                    Math.pow(worldPos.x - point.x, 2) + Math.pow(worldPos.y - point.y, 2)
                );
                
                if (distance <= hoverRange) {
                    this.hoveredPoint = { 
                        type: 'track', 
                        index: i, 
                        point, 
                        boundary: this.boundaryType,
                        tool: this.tool 
                    };
                    this.canvas.style.cursor = this.tool === 'eraser' ? 'not-allowed' : 'grab';
                    return;
                }
            }
        } else {
            // Check all boundary points for other tools
            const allPoints = [...this.track.track.outer, ...this.track.track.inner];
            for (let i = 0; i < allPoints.length; i++) {
                const point = allPoints[i];
                const distance = Math.sqrt(
                    Math.pow(worldPos.x - point.x, 2) + Math.pow(worldPos.y - point.y, 2)
                );
                
                if (distance <= 5) {
                    this.hoveredPoint = { type: 'track', index: i, point };
                    this.canvas.style.cursor = 'pointer';
                    return;
                }
            }
        }
        
        // Reset cursor based on current tool
        switch (this.tool) {
            case 'pen':
                this.canvas.style.cursor = 'crosshair';
                break;
            case 'eraser':
                this.canvas.style.cursor = 'not-allowed';
                break;
            case 'move':
                this.canvas.style.cursor = this.isDragging ? 'grabbing' : 'move';
                break;
            case 'startfinish':
                this.canvas.style.cursor = 'crosshair';
                break;
            default:
                this.canvas.style.cursor = 'default';
        }
    },
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    // Check if a boundary loop is closed
    isLoopClosed(points) {
        if (points.length < 3) return false;
        const first = points[0];
        const last = points[points.length - 1];
        const distance = Math.sqrt(
            Math.pow(last.x - first.x, 2) + Math.pow(last.y - first.y, 2)
        );
        return distance <= 10;
    },
    
    // Update status message for loop closure feedback
    updateLoopCloseStatus(worldPos) {
        if (this.tool !== 'pen' || this.mode !== 'track') return;
        
        const boundary = this.boundaryType === 'outer' ? this.track.track.outer : this.track.track.inner;
        if (boundary.length < 3 || boundary.closed) return;
        
        const snappedPos = this.view.snapToGrid ? this.snapToGrid(worldPos) : worldPos;
        const firstPoint = boundary[0];
        const distanceToFirst = Math.sqrt(
            Math.pow(snappedPos.x - firstPoint.x, 2) + Math.pow(snappedPos.y - firstPoint.y, 2)
        );
        
        if (distanceToFirst <= 10) {
            this.updateStatus(`Click to close ${this.boundaryType} boundary loop (${boundary.length} points)`);
        } else if (boundary.length >= 3) {
            this.updateStatus(`Drawing ${this.boundaryType} boundary - click near first point to close loop (${boundary.length} points)`);
        }
    },
    
    // View controls
    zoomIn() {
        this.view.zoom = Math.min(this.view.zoom * 1.2, 5.0);
        this.updateZoomDisplay();
        this.render();
    },
    
    zoomOut() {
        this.view.zoom = Math.max(this.view.zoom / 1.2, 0.1);
        this.updateZoomDisplay();
        this.render();
    },
    
    resetView() {
        this.view.zoom = 1.0;
        this.view.offsetX = this.canvas.width / 2;
        this.view.offsetY = this.canvas.height / 2;
        this.updateZoomDisplay();
        this.render();
    },
    
    fitView() {
        // Fit view to show all track content
        const allPoints = [...this.track.track.outer, ...this.track.track.inner, ...this.track.racingLine.waypoints.map(w => w.pos)];
        
        if (allPoints.length === 0) {
            this.resetView();
            return;
        }
        
        const bounds = this.calculateBounds(allPoints);
        const padding = 50;
        
        const zoomX = (this.canvas.width - padding * 2) / (bounds.maxX - bounds.minX);
        const zoomY = (this.canvas.height - padding * 2) / (bounds.maxY - bounds.minY);
        
        this.view.zoom = Math.min(zoomX, zoomY, 2.0);
        this.view.offsetX = this.canvas.width / 2 - (bounds.minX + bounds.maxX) / 2 * this.view.zoom;
        this.view.offsetY = this.canvas.height / 2 - (bounds.minY + bounds.maxY) / 2 * this.view.zoom;
        
        this.updateZoomDisplay();
        this.render();
    },
    
    calculateBounds(points) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        points.forEach(point => {
            const p = point.pos || point; // Handle both waypoint objects and plain points
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        });
        
        return { minX, minY, maxX, maxY };
    },
    
    updateZoomDisplay() {
        const zoomEl = document.getElementById('zoomLevel');
        if (zoomEl) {
            zoomEl.textContent = `${Math.round(this.view.zoom * 100)}%`;
        }
    },
    
    // Template loading
    loadTemplate(templateName) {
        switch (templateName) {
            case 'oval':
                this.loadOvalTemplate();
                break;
            case 'figure8':
                this.loadFigure8Template();
                break;
            case 'circuit':
                this.loadCircuitTemplate();
                break;
            case 'blank':
                this.loadBlankTemplate();
                break;
        }
    },
    
    loadOvalTemplate() {
        // Simple oval track
        this.track.track.outer = [
            { x: 100, y: 100 },
            { x: 400, y: 100 },
            { x: 400, y: 300 },
            { x: 100, y: 300 }
        ];
        this.track.track.outer.closed = true; // Mark as closed
        
        this.track.track.inner = [
            { x: 150, y: 150 },
            { x: 350, y: 150 },
            { x: 350, y: 250 },
            { x: 150, y: 250 }
        ];
        this.track.track.inner.closed = true; // Mark as closed
        
        this.track.metadata.name = 'Simple Oval';
        this.track.metadata.description = 'A basic oval racing circuit';
        this.updatePropertyInputs();
    },
    
    // Setup file management event handlers
    setupFileManagement() {
        // Save button
        const saveBtn = document.getElementById('saveTrackBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.showSaveDialog());
        }
        
        // Load button
        const loadBtn = document.getElementById('loadTrackBtn');
        if (loadBtn) {
            loadBtn.addEventListener('click', () => this.showLoadDialog());
        }
        
        // Export button
        const exportBtn = document.getElementById('exportTrackBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportTrack());
        }
        
        // Import button
        const importBtn = document.getElementById('importTrackBtn');
        if (importBtn) {
            importBtn.addEventListener('click', () => this.importTrack());
        }
        
        // Manage Tracks button
        const manageBtn = document.getElementById('manageTracksBtn');
        if (manageBtn) {
            manageBtn.addEventListener('click', () => this.showManageTracksDialog());
        }
        
        // New Track button
        const newTrackBtn = document.getElementById('newTrackBtn');
        if (newTrackBtn) {
            newTrackBtn.addEventListener('click', () => this.newTrack());
        }
    },
    
    // Setup auto-save functionality
    setupAutoSave() {
        // Auto-save every 30 seconds
        setInterval(() => {
            this.performAutoSave();
        }, 30000);
        
        // Auto-save on significant actions
        this.autoSaveActions = 0;
        
        // Check for existing auto-save on load
        if (FileManager.hasAutoSave()) {
            this.offerAutoSaveRestore();
        }
    },
    
    // Perform auto-save
    performAutoSave() {
        if (this.autoSaveActions > 0) {
            // Store boundary closed states before auto-save
            this.track.metadata.boundaries = {
                outerClosed: !!this.track.track.outer.closed,
                innerClosed: !!this.track.track.inner.closed
            };
            
            FileManager.autoSave(this.track);
            this.autoSaveActions = 0;
            console.log('🔄 Track auto-saved');
        }
    },
    
    // Increment auto-save counter for significant actions
    incrementAutoSave() {
        this.autoSaveActions++;
    },
    
    // Offer to restore auto-saved track
    offerAutoSaveRestore() {
        const autoSaveData = FileManager.loadAutoSave();
        if (!autoSaveData) return;
        
        const autoSaveTime = new Date(autoSaveData.metadata.autoSaveTime).toLocaleString();
        const shouldRestore = confirm(
            `Found auto-saved track from ${autoSaveTime}.\n\nRestore auto-saved progress?`
        );
        
        if (shouldRestore) {
            this.loadTrackData(autoSaveData);
            this.updateStatus('Restored auto-saved track');
        } else {
            FileManager.clearAutoSave();
        }
    },
    
    loadBlankTemplate() {
        // Clear everything
        this.track.track.outer = [];
        this.track.track.inner = [];
        this.track.racingLine.waypoints = [];
        
        // Reset closed flags
        delete this.track.track.outer.closed;
        delete this.track.track.inner.closed;
        
        this.track.metadata.name = 'New Track';
        this.track.metadata.description = '';
        
        this.updatePropertyInputs();
        this.updateStats();
        this.updateOutput();
        this.resetView();
        this.render();
    },
    
    updatePropertyInputs() {
        const trackName = document.getElementById('trackName');
        const trackAuthor = document.getElementById('trackAuthor');
        const trackDifficulty = document.getElementById('trackDifficulty');
        const trackDescription = document.getElementById('trackDescription');
        
        if (trackName) trackName.value = this.track.metadata.name;
        if (trackAuthor) trackAuthor.value = this.track.metadata.author;
        if (trackDifficulty) trackDifficulty.value = this.track.metadata.difficulty;
        if (trackDescription) trackDescription.value = this.track.metadata.description;
    },
    
    // Validation
    validateTrack() {
        const errors = [];
        const warnings = [];
        
        // Check outer boundary
        if (this.track.track.outer.length < 3) {
            errors.push('Track outer boundary needs at least 3 points');
        }
        
        // Check if boundaries form closed loops
        if (this.track.track.outer.length >= 3) {
            const firstOuter = this.track.track.outer[0];
            const lastOuter = this.track.track.outer[this.track.track.outer.length - 1];
            const outerDistance = Math.sqrt(
                Math.pow(lastOuter.x - firstOuter.x, 2) + Math.pow(lastOuter.y - firstOuter.y, 2)
            );
            
            if (outerDistance > 10) {
                warnings.push('Outer boundary is not closed - click near first point to close');
            }
        }
        
        this.track.validation = {
            trackValid: errors.length === 0,
            racingLineValid: this.track.racingLine.waypoints.length >= 3,
            errors,
            warnings,
            metrics: {
                trackLength: this.calculateTrackLength(),
                avgWidth: 0, // TODO: Calculate average width
                complexity: Math.min(this.track.track.outer.length / 10 * 50, 100)
            }
        };
    },
    
    // Add waypoint (for racing line mode)
    addWaypoint(pos) {
        const waypoint = {
            pos: { x: pos.x, y: pos.y },
            targetSpeed: 3,
            brakeZone: false,
            cornerType: 'straight',
            safeZone: 'left'
        };
        
        this.track.racingLine.waypoints.push(waypoint);
        this.updateStats();
        this.updateOutput();
        this.render();
        
        this.updateStatus(`Added waypoint (${this.track.racingLine.waypoints.length} total)`);
    },
    
    // Main render function
    render() {
        if (!this.ctx) return;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Save context for transformations
        this.ctx.save();
        
        // Apply view transformations
        this.ctx.translate(this.view.offsetX, this.view.offsetY);
        this.ctx.scale(this.view.zoom, this.view.zoom);
        
        // Render grid
        if (this.view.showGrid) {
            this.renderGrid();
        }
        
        // Render track
        if (this.view.showTrackBounds) {
            this.renderTrack();
        }
        
        // Render racing line
        if (this.view.showRacingLine && this.mode !== 'track') {
            this.renderRacingLine();
        }
        
        // Render waypoints
        if (this.view.showWaypoints && this.mode !== 'track') {
            this.renderWaypoints();
        }
        
        // Render preview elements
        this.renderPreview();
        
        // Restore context
        this.ctx.restore();
    },
    
    // Render grid
    renderGrid() {
        const gridSize = this.view.gridSize;
        const bounds = {
            minX: -this.view.offsetX / this.view.zoom,
            minY: -this.view.offsetY / this.view.zoom,
            maxX: (this.canvas.width - this.view.offsetX) / this.view.zoom,
            maxY: (this.canvas.height - this.view.offsetY) / this.view.zoom
        };
        
        this.ctx.strokeStyle = '#333333';
        this.ctx.lineWidth = 0.5 / this.view.zoom;
        
        // Vertical lines
        const startX = Math.floor(bounds.minX / gridSize) * gridSize;
        const endX = Math.ceil(bounds.maxX / gridSize) * gridSize;
        
        for (let x = startX; x <= endX; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, bounds.minY);
            this.ctx.lineTo(x, bounds.maxY);
            this.ctx.stroke();
        }
        
        // Horizontal lines
        const startY = Math.floor(bounds.minY / gridSize) * gridSize;
        const endY = Math.ceil(bounds.maxY / gridSize) * gridSize;
        
        for (let y = startY; y <= endY; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(bounds.minX, y);
            this.ctx.lineTo(bounds.maxX, y);
            this.ctx.stroke();
        }
    },
    
    // Render track boundaries
    renderTrack() {
        // Render outer boundary
        this.renderBoundary(this.track.track.outer, '#00d1b2', 2);
        
        // Render inner boundary
        this.renderBoundary(this.track.track.inner, '#ff6b35', 2);
    },
    
    // Render boundary
    renderBoundary(points, color, lineWidth) {
        if (points.length < 2) return;
        
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth / this.view.zoom;
        this.ctx.fillStyle = color + '44'; // Semi-transparent fill
        
        this.ctx.beginPath();
        this.ctx.moveTo(points[0].x, points[0].y);
        
        for (let i = 1; i < points.length; i++) {
            this.ctx.lineTo(points[i].x, points[i].y);
        }
        
        // Check if boundary is marked as closed or if points are close enough
        const isClosed = points.closed || (points.length >= 3 && this.isLoopClosed(points));
        
        if (isClosed) {
            this.ctx.closePath();
            this.ctx.fill();
        }
        
        this.ctx.stroke();
        
        // Render points
        this.ctx.fillStyle = color;
        for (const point of points) {
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, 3 / this.view.zoom, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // If closed, highlight the first point differently
        if (isClosed && points.length > 0) {
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 2 / this.view.zoom;
            this.ctx.beginPath();
            this.ctx.arc(points[0].x, points[0].y, 5 / this.view.zoom, 0, Math.PI * 2);
            this.ctx.stroke();
        }
    },
    
    // Render racing line
    renderRacingLine() {
        const waypoints = this.track.racingLine.waypoints;
        if (waypoints.length < 2) return;
        
        this.ctx.strokeStyle = '#22c55e';
        this.ctx.lineWidth = 2 / this.view.zoom;
        
        this.ctx.beginPath();
        this.ctx.moveTo(waypoints[0].pos.x, waypoints[0].pos.y);
        
        for (let i = 1; i < waypoints.length; i++) {
            this.ctx.lineTo(waypoints[i].pos.x, waypoints[i].pos.y);
        }
        
        this.ctx.stroke();
    },
    
    // Render waypoints
    renderWaypoints() {
        const waypoints = this.track.racingLine.waypoints;
        
        for (const waypoint of waypoints) {
            // Color based on speed
            const speedColors = ['#ef4444', '#f59e0b', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];
            const colorIndex = Math.min(Math.floor(waypoint.targetSpeed || 3) - 1, speedColors.length - 1);
            
            this.ctx.fillStyle = speedColors[colorIndex] || '#22c55e';
            
            this.ctx.beginPath();
            this.ctx.arc(waypoint.pos.x, waypoint.pos.y, 4 / this.view.zoom, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Brake zone indicator
            if (waypoint.brakeZone) {
                this.ctx.strokeStyle = '#ef4444';
                this.ctx.lineWidth = 2 / this.view.zoom;
                this.ctx.stroke();
            }
        }
    },
    
    // Render preview elements
    renderPreview() {
        // Render hover effects for different tools
        if (this.hoveredPoint) {
            const point = this.hoveredPoint.point;
            
            if (this.hoveredPoint.tool === 'eraser') {
                // Red highlight for eraser
                this.ctx.strokeStyle = '#ef4444';
                this.ctx.fillStyle = '#ef444444';
                this.ctx.lineWidth = 2 / this.view.zoom;
                this.ctx.beginPath();
                this.ctx.arc(point.x, point.y, 8 / this.view.zoom, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();
            } else if (this.hoveredPoint.tool === 'move') {
                // Blue highlight for move
                this.ctx.strokeStyle = '#3b82f6';
                this.ctx.fillStyle = '#3b82f644';
                this.ctx.lineWidth = 2 / this.view.zoom;
                this.ctx.beginPath();
                this.ctx.arc(point.x, point.y, 8 / this.view.zoom, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();
            } else {
                // Default white highlight
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 2 / this.view.zoom;
                this.ctx.beginPath();
                this.ctx.arc(point.x, point.y, 6 / this.view.zoom, 0, Math.PI * 2);
                this.ctx.stroke();
            }
        }
        
        // Render selected points for move tool
        if (this.tool === 'move' && this.selectedPoints.length > 0) {
            const boundary = this.boundaryType === 'outer' ? this.track.track.outer : this.track.track.inner;
            
            for (const pointIndex of this.selectedPoints) {
                if (boundary[pointIndex]) {
                    const point = boundary[pointIndex];
                    this.ctx.strokeStyle = '#22c55e';
                    this.ctx.fillStyle = '#22c55e44';
                    this.ctx.lineWidth = 3 / this.view.zoom;
                    this.ctx.beginPath();
                    this.ctx.arc(point.x, point.y, 10 / this.view.zoom, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.stroke();
                }
            }
        }
        
        // Tool-specific previews
        if (this.tool === 'pen' && this.mode === 'track') {
            const boundary = this.boundaryType === 'outer' ? this.track.track.outer : this.track.track.inner;
            
            if (boundary.length > 0 && this.mousePos && !boundary.closed) {
                const snappedPos = this.view.snapToGrid ? this.snapToGrid(this.mousePos) : this.mousePos;
                const lastPoint = boundary[boundary.length - 1];
                
                // Check if we're near the first point for loop closure
                let nearFirstPoint = false;
                if (boundary.length >= 3) {
                    const firstPoint = boundary[0];
                    const distanceToFirst = Math.sqrt(
                        Math.pow(snappedPos.x - firstPoint.x, 2) + Math.pow(snappedPos.y - firstPoint.y, 2)
                    );
                    
                    if (distanceToFirst <= 10) {
                        nearFirstPoint = true;
                        
                        // Highlight first point for loop closure
                        this.ctx.strokeStyle = '#ffcc00';
                        this.ctx.fillStyle = '#ffcc0044';
                        this.ctx.lineWidth = 3 / this.view.zoom;
                        this.ctx.beginPath();
                        this.ctx.arc(firstPoint.x, firstPoint.y, 8 / this.view.zoom, 0, Math.PI * 2);
                        this.ctx.fill();
                        this.ctx.stroke();
                        
                        // Draw closing line preview
                        this.ctx.strokeStyle = '#ffcc0088';
                        this.ctx.setLineDash([3, 3]);
                        this.ctx.lineWidth = 2 / this.view.zoom;
                        this.ctx.beginPath();
                        this.ctx.moveTo(lastPoint.x, lastPoint.y);
                        this.ctx.lineTo(firstPoint.x, firstPoint.y);
                        this.ctx.stroke();
                        this.ctx.setLineDash([]);
                    }
                }
                
                if (!nearFirstPoint) {
                    // Normal preview line from last point to mouse
                    this.ctx.strokeStyle = '#ffffff66';
                    this.ctx.setLineDash([5, 5]);
                    this.ctx.lineWidth = 1 / this.view.zoom;
                    this.ctx.beginPath();
                    this.ctx.moveTo(lastPoint.x, lastPoint.y);
                    this.ctx.lineTo(snappedPos.x, snappedPos.y);
                    this.ctx.stroke();
                    this.ctx.setLineDash([]);
                    
                    // Preview point
                    this.ctx.fillStyle = '#ffffff88';
                    this.ctx.beginPath();
                    this.ctx.arc(snappedPos.x, snappedPos.y, 3 / this.view.zoom, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        }
    }
};

// Initialize when DOM is ready
if (typeof window !== 'undefined') {
    window.TrackEditor = TrackEditor;
}