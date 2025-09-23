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
        gridSize: 20, // Grid size in pixels for rendering (CoordinateUtils.GRID_SIZE)
        showGrid: true,
        snapToGrid: true,
        showTrackBounds: true,
        showRacingLine: true,
        showWaypoints: true,
        showCheckpoints: true,
        showDirectionArrows: true,
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
    
    // Checkpoint interaction state
    selectedCheckpointIndex: null,
    selectedCheckpointEndpoint: null, // 'a' or 'b'
    hoveredCheckpoint: null,
    isDraggingCheckpoint: false,
    
    // Initialize the editor
    init() {
        console.log('🏁 Initializing Track Editor Core...');
        
        // Get canvas and context
        this.canvas = document.getElementById('trackCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Initialize canvas dimensions based on CSS size
        this.initializeCanvasDimensions();
        
        this.updateCanvasRect();
        
        // Initialize racing line editor
        if (typeof RacingLineEditor !== 'undefined') {
            RacingLineEditor.init();
        }
        
        // Set up event listeners
        this.setupEventListeners();
        this.setupUI();
        
        // Clear any existing auto-save data since we don't use it anymore
        if (typeof FileManager !== 'undefined' && FileManager.clearAutoSave) {
            FileManager.clearAutoSave();
        }
        
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
        
        // Tool selection (track tools only)
        document.querySelectorAll('#trackTools .tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setTool(e.target.dataset.tool);
            });
        });
        
        // Racing line tool selection (handled separately)
        document.querySelectorAll('#racingLineTools .tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (typeof RacingLineEditor !== 'undefined') {
                    RacingLineEditor.setRacingLineTool(e.target.dataset.tool);
                }
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

        document.getElementById('showRacingLine')?.addEventListener('change', (e) => {
            this.view.showRacingLine = e.target.checked;
            this.render();
        });

        document.getElementById('showWaypoints')?.addEventListener('change', (e) => {
            this.view.showWaypoints = e.target.checked;
            this.render();
        });

        document.getElementById('showCheckpoints')?.addEventListener('change', (e) => {
            this.view.showCheckpoints = e.target.checked;
            this.render();
        });

        document.getElementById('showDirectionArrows')?.addEventListener('change', (e) => {
            this.view.showDirectionArrows = e.target.checked;
            this.render();
        });
        
        document.getElementById('showValidation')?.addEventListener('change', (e) => {
            this.view.showValidation = e.target.checked;
            
            // Show/hide validation panel
            const validationResults = document.getElementById('validationResults');
            if (validationResults) {
                validationResults.style.display = e.target.checked ? 'block' : 'none';
            }
            
            // Update display if enabled
            if (e.target.checked) {
                this.validateTrack();
                this.validateRacingLine();
                this.updateValidationDisplay();
            }
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
        
        // Code view buttons
        this.setupCodeViewButtons();
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        
        // Window resize
        window.addEventListener('resize', () => {
            this.initializeCanvasDimensions();
            this.updateCanvasRect();
            this.render();
        });
    },
    
    // Initialize canvas dimensions to match CSS size
    initializeCanvasDimensions() {
        const rect = this.canvas.getBoundingClientRect();
        
        // Set canvas dimensions to match actual display size
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        
        // FIXED: Initialize view to show coordinate origin (0,0) at top-left like main game
        // This ensures the track editor coordinate system matches the main game
        this.view.offsetX = 0;
        this.view.offsetY = 0;
        
        console.log(`🎨 Canvas initialized: ${rect.width}x${rect.height}, coordinate system matches main game`);
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
                this.updateOutput();
            });
        }
        
        if (trackAuthor) {
            trackAuthor.addEventListener('change', (e) => {
                this.track.metadata.author = e.target.value;
                this.updateOutput();
            });
        }
        
        if (trackDifficulty) {
            trackDifficulty.addEventListener('change', (e) => {
                this.track.metadata.difficulty = e.target.value;
                this.updateOutput();
            });
        }
        
        if (trackDescription) {
            trackDescription.addEventListener('change', (e) => {
                this.track.metadata.description = e.target.value;
                this.updateOutput();
            });
        }
        
        // Racing direction control
        const racingDirection = document.getElementById('racingDirection');
        if (racingDirection) {
            racingDirection.addEventListener('change', (e) => {
                this.track.racingLine.direction = e.target.value;
                this.updateStats();
                this.render();
                this.updateOutput();
                this.updateStatus(`Racing direction changed to ${e.target.value}`);
            });
        }
        
        // Checkpoint management buttons
        const validateTrackBtn = document.getElementById('validateTrack');
        if (validateTrackBtn) {
            validateTrackBtn.addEventListener('click', () => this.validateTrackConfiguration());
        }
        
        const deleteCheckpointBtn = document.getElementById('deleteCheckpoint');
        if (deleteCheckpointBtn) {
            deleteCheckpointBtn.addEventListener('click', () => this.deleteSelectedCheckpoint());
        }
    },
    
    // Set up UI state
    setupUI() {
        this.updateModeUI();
        this.updateToolUI();
        this.updateStats();
        this.updateOutput();
        this.updateStatus('Ready - Select a tool to begin editing');
        
        // Initialize racing direction dropdown
        const racingDirectionSelect = document.getElementById('racingDirection');
        if (racingDirectionSelect) {
            racingDirectionSelect.value = this.track.racingLine.direction || 'counter-clockwise';
        }
    },
    
    // Handle mouse down
    handleMouseDown(e) {
        const pos = this.getCanvasPosition(e);
        const worldPos = this.screenToWorld(pos);
        
        
        this.dragStart = worldPos;
        
        if (this.mode === 'track') {
            this.handleTrackMouseDown(worldPos);
        } else if (this.mode === 'racing') {
            if (typeof RacingLineEditor !== 'undefined') {
                RacingLineEditor.handleRacingLineMouseDown(worldPos, e);
            }
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
            case 'checkpoint':
                this.handleCheckpointTool(snappedPos);
                break;
        }
    },
    
    // Handle start/finish line tool
    handleStartFinishTool(pos) {
        // Start/finish line requires two points
        if (!this.startFinishState) {
            this.startFinishState = {
                placing: false,
                firstPoint: null,
                previewPoint: null
            };
        }
        
        if (!this.startFinishState.placing) {
            // First click - start placing start/finish line
            this.startFinishState.placing = true;
            this.startFinishState.firstPoint = { x: pos.x, y: pos.y };
            this.startFinishState.previewPoint = null;
            
            this.updateStatus('Click second point to complete start/finish line');
            this.render();
        } else {
            // Second click - complete start/finish line
            const secondPoint = { x: pos.x, y: pos.y };
            
            // Validate line length
            const distance = Math.sqrt(
                Math.pow(secondPoint.x - this.startFinishState.firstPoint.x, 2) +
                Math.pow(secondPoint.y - this.startFinishState.firstPoint.y, 2)
            );
            
            if (distance < 0.5) { // 0.5 grid units = 10 pixels
                this.updateStatus('Start/finish line too short - click farther away from first point');
                return;
            }
            
            // Set the start/finish line in track data
            this.track.track.startLine = {
                a: { x: this.startFinishState.firstPoint.x, y: this.startFinishState.firstPoint.y },
                b: { x: secondPoint.x, y: secondPoint.y }
            };
            
            // Reset state
            this.startFinishState = {
                placing: false,
                firstPoint: null,
                previewPoint: null
            };
            
            
            // Update everything
            this.updateStats();
            this.updateOutput();
            this.render();
            
            this.updateStatus(`Start/finish line placed (${distance.toFixed(1)} units long)`);
        }
    },
    
    // Handle checkpoint tool (placement and selection/editing)
    handleCheckpointTool(pos) {
        // Initialize checkpoint state if needed
        if (!this.checkpointState) {
            this.checkpointState = {
                placing: false,
                firstPoint: null,
                previewPoint: null
            };
        }
        
        // If currently placing a checkpoint, continue with placement logic
        if (this.checkpointState.placing) {
            // Second click - complete checkpoint
            const secondPoint = { x: pos.x, y: pos.y };
            
            // Validate line length
            const distance = Math.sqrt(
                Math.pow(secondPoint.x - this.checkpointState.firstPoint.x, 2) +
                Math.pow(secondPoint.y - this.checkpointState.firstPoint.y, 2)
            );
            
            if (distance < 0.3) { // 0.3 grid units = 6 pixels
                this.updateStatus('Checkpoint line too short - click farther away from first point');
                return;
            }
            
            // Create checkpoint in track data
            const newCheckpoint = {
                id: this.track.track.checkpoints.length,
                name: `Checkpoint ${this.track.track.checkpoints.length + 1}`,
                segment: {
                    a: { x: this.checkpointState.firstPoint.x, y: this.checkpointState.firstPoint.y },
                    b: { x: secondPoint.x, y: secondPoint.y }
                },
                description: `User-added checkpoint ${this.track.track.checkpoints.length + 1}`,
                expectedDirection: this.track.racingLine.direction || 'counter-clockwise'
            };
            this.track.track.checkpoints.push(newCheckpoint);
            
            // Reset state
            this.checkpointState = {
                placing: false,
                firstPoint: null,
                previewPoint: null
            };
            
            
            
            // Update everything
            this.updateStats();
            this.updateOutput();
            this.render();
            
            this.updateStatus(`Checkpoint placed (${distance.toFixed(1)} units long)`);
            return;
        }
        
        // Check if clicking on existing checkpoint for selection/editing
        const checkpointHit = this.findCheckpointHit(pos);
        if (checkpointHit) {
            // Select checkpoint and endpoint
            this.selectedCheckpointIndex = checkpointHit.index;
            this.selectedCheckpointEndpoint = checkpointHit.endpoint;
            this.isDraggingCheckpoint = true;
            
            const checkpoint = this.track.track.checkpoints[checkpointHit.index];
            this.updateStatus(`Selected ${checkpoint.name} (${checkpointHit.endpoint} endpoint) - drag to move, Del to delete`);
            this.render();
            return;
        }
        
        // No checkpoint hit, start new checkpoint placement
        this.checkpointState.placing = true;
        this.checkpointState.firstPoint = { x: pos.x, y: pos.y };
        this.checkpointState.previewPoint = null;
        
        // Clear any existing checkpoint selection
        this.selectedCheckpointIndex = null;
        this.selectedCheckpointEndpoint = null;
        
        this.updateStatus('Click second point to complete checkpoint');
        this.render();
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
            
            if (distance <= 0.5) { // 0.5 grid units = 10 pixels
                // Close the loop by adding a marker or flag
                // We don't add the first point again, but we mark the boundary as closed
                if (!boundary.closed) {
                    boundary.closed = true;
                    
                    
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
        const eraseRange = 0.4; // 0.4 grid units = 8 pixels
        
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
        const selectRange = 0.5; // 0.5 grid units = 10 pixels
        
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
        
        if (this.mode === 'track') {
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
            
            // Handle checkpoint endpoint dragging
            if (this.isDraggingCheckpoint && this.selectedCheckpointIndex !== null && this.selectedCheckpointEndpoint) {
                const checkpoint = this.track.track.checkpoints[this.selectedCheckpointIndex];
                const snappedPos = this.view.snapToGrid ? this.snapToGrid(worldPos) : worldPos;
                
                if (checkpoint) {
                    // Update the selected endpoint
                    if (this.selectedCheckpointEndpoint === 'a') {
                        checkpoint.segment.a.x = snappedPos.x;
                        checkpoint.segment.a.y = snappedPos.y;
                    } else if (this.selectedCheckpointEndpoint === 'b') {
                        checkpoint.segment.b.x = snappedPos.x;
                        checkpoint.segment.b.y = snappedPos.y;
                    }
                    
                    // Update validation and output during drag
                    this.validateTrack();
                    this.updateStats();
                    this.updateOutput();
                }
            }
            
        // Update hover state and render if needed (but not during dragging)
        if (!this.isDragging) {
            this.updateHover(worldPos);
            this.updateLoopCloseStatus(worldPos);
            this.updateStartFinishPreview(worldPos);
            this.updateCheckpointPreview(worldPos);
        }
        } else if (this.mode === 'racing') {
            if (typeof RacingLineEditor !== 'undefined') {
                RacingLineEditor.handleRacingLineMouseMove(worldPos);
            }
        }
        
        // Update mouse position display
        const mousePositionEl = document.getElementById('mousePosition');
        if (mousePositionEl) {
            const snappedPos = this.view.snapToGrid ? this.snapToGrid(worldPos) : worldPos;
            mousePositionEl.textContent = `Grid: (${snappedPos.x.toFixed(1)}, ${snappedPos.y.toFixed(1)})`;
        }
        
        this.render();
    },
    
    // Handle mouse up
    handleMouseUp(e) {
        if (this.mode === 'track') {
            if (this.isDragging && this.dragPointIndex !== -1) {
                
                // Finish dragging
                this.isDragging = false;
                const pointNum = this.dragPointIndex + 1;
                this.updateStatus(`Moved ${this.dragBoundaryType} boundary point ${pointNum} - click another point to select`);
                this.dragPointIndex = -1;
            }
            
            // Handle checkpoint dragging completion
            if (this.isDraggingCheckpoint && this.selectedCheckpointIndex !== null) {
                
                // Finish checkpoint dragging
                this.isDraggingCheckpoint = false;
                const checkpoint = this.track.track.checkpoints[this.selectedCheckpointIndex];
                this.updateStatus(`Moved ${checkpoint.name} (${this.selectedCheckpointEndpoint} endpoint) - Del to delete, click elsewhere to deselect`);
            }
        } else if (this.mode === 'racing') {
            if (typeof RacingLineEditor !== 'undefined') {
                RacingLineEditor.handleRacingLineMouseUp();
            }
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
            
            if (typeof RacingLineEditor !== 'undefined') {
                RacingLineEditor.handleRacingLineDoubleClick(worldPos);
            }
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
    
    
    // Create new track
    newTrack() {
        this.loadBlankTemplate();
        this.updateStatus('New track created');
        // Note: loadBlankTemplate() already calls render()
    },
    
    // Handle keyboard shortcuts
    handleKeyDown(e) {
        // File operations
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
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
            case 'c':
                this.setTool('checkpoint');
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
            case 'delete':
            case 'backspace':
                // Delete selected checkpoint
                if (this.selectedCheckpointIndex !== null) {
                    this.deleteCheckpointByIndex(this.selectedCheckpointIndex);
                }
                break;
            case 'escape':
                // Clear selections and stop dragging
                this.selectedPoints = [];
                this.selectedCheckpointIndex = null;
                this.selectedCheckpointEndpoint = null;
                this.isDragging = false;
                this.isDraggingCheckpoint = false;
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
        const trackTools = document.getElementById('trackTools');
        const racingLineTools = document.getElementById('racingLineTools');
        const waypointEditor = document.getElementById('waypointEditor');
        
        // Show/hide sidebar panels based on mode
        const trackDesignPanel = document.getElementById('trackDesignPanel');
        const racingLinePanel = document.getElementById('racingLinePanel');
        const previewPanel = document.getElementById('previewPanel');
        const trackDataPanel = document.getElementById('trackDataPanel');
        
        if (mode === 'track') {
            if (trackTools) trackTools.style.display = 'block';
            if (racingLineTools) racingLineTools.style.display = 'none';
            if (waypointEditor) waypointEditor.style.display = 'none';
            
            // Show track design panel
            if (trackDesignPanel) trackDesignPanel.style.display = 'block';
            if (racingLinePanel) racingLinePanel.style.display = 'none';
            if (previewPanel) previewPanel.style.display = 'none';
            if (trackDataPanel) trackDataPanel.style.display = 'none';
            
            // Reset racing line editor state when leaving racing mode
            if (typeof RacingLineEditor !== 'undefined') {
                RacingLineEditor.selectWaypoint(null);
            }
            
        } else if (mode === 'racing') {
            if (trackTools) trackTools.style.display = 'none';
            if (racingLineTools) racingLineTools.style.display = 'block';
            if (waypointEditor) waypointEditor.style.display = 'block';
            
            // Show racing line panel
            if (trackDesignPanel) trackDesignPanel.style.display = 'none';
            if (racingLinePanel) racingLinePanel.style.display = 'block';
            if (previewPanel) previewPanel.style.display = 'none';
            if (trackDataPanel) trackDataPanel.style.display = 'none';
            
            // Initialize racing line tools when entering racing mode
            if (typeof RacingLineEditor !== 'undefined') {
                RacingLineEditor.setRacingLineTool('select');
                RacingLineEditor.updateWaypointEditor();
            }
        } else if (mode === 'track-data') {
            // Hide all editing tools when in data view mode
            if (trackTools) trackTools.style.display = 'none';
            if (racingLineTools) racingLineTools.style.display = 'none';
            if (waypointEditor) waypointEditor.style.display = 'none';
            
            // Show track data panel only
            if (trackDesignPanel) trackDesignPanel.style.display = 'none';
            if (racingLinePanel) racingLinePanel.style.display = 'none';
            if (previewPanel) previewPanel.style.display = 'none';
            if (trackDataPanel) trackDataPanel.style.display = 'block';
            
            // Show code view overlay in canvas area
            const codeView = document.getElementById('codeView');
            if (codeView) {
                codeView.style.display = 'flex';
                this.updateCodeView();
            }
        }
        
        // Show/hide code view overlay based on mode
        const codeView = document.getElementById('codeView');
        if (codeView && mode !== 'track-data') {
            codeView.style.display = 'none';
        }
        
        this.render();
    },
    
    // Set editor tool
    setTool(tool) {
        // Clear any existing selections/dragging when changing tools
        this.selectedPoints = [];
        this.isDragging = false;
        this.dragPointIndex = -1;
        
        // Reset start/finish state when switching away from start/finish tool
        if (this.tool === 'startfinish' && tool !== 'startfinish') {
            this.startFinishState = {
                placing: false,
                firstPoint: null,
                previewPoint: null
            };
        }
        
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
            case 'checkpoint':
                this.updateStatus(`Checkpoint tool active - click to place/select checkpoints, drag endpoints to edit, Del to delete`);
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
        // Only update track tools, not racing line tools
        document.querySelectorAll('#trackTools .tool-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === this.tool);
        });
    },
    
    // Update statistics display
    updateStats() {
        const trackPointCount = document.getElementById('trackPointCount');
        const waypointCount = document.getElementById('waypointCount');
        const checkpointCount = document.getElementById('checkpointCount');
        const racingDirectionDisplay = document.getElementById('racingDirectionDisplay');
        const trackLength = document.getElementById('trackLength');
        const avgSpeed = document.getElementById('avgSpeed');
        
        if (trackPointCount) {
            const totalPoints = this.track.track.outer.length + this.track.track.inner.length;
            trackPointCount.textContent = totalPoints;
        }
        
        if (waypointCount) {
            waypointCount.textContent = this.track.racingLine.waypoints.length;
        }
        
        if (checkpointCount) {
            checkpointCount.textContent = this.track.track.checkpoints.length;
        }
        
        if (racingDirectionDisplay) {
            const direction = this.track.racingLine.direction || 'counter-clockwise';
            racingDirectionDisplay.textContent = direction === 'counter-clockwise' ? 'Counter-Clockwise' : 'Clockwise';
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
    
    // Set up code view button handlers
    setupCodeViewButtons() {
        const copyBtn = document.getElementById('copyCodeBtn');
        const downloadBtn = document.getElementById('downloadCodeBtn');
        
        if (copyBtn) {
            copyBtn.addEventListener('click', () => this.copyTrackData());
        }
        
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => this.downloadTrackData());
        }
    },
    
    // Update code view (canvas overlay)
    updateCodeView() {
        const codeViewOutput = document.getElementById('codeViewOutput');
        if (!codeViewOutput) return;
        
        // Create enhanced export data with checkpoint metadata
        const exportData = {
            ...this.track,
            // Ensure checkpoints have proper metadata structure
            track: {
                ...this.track.track,
                checkpoints: this.track.track.checkpoints.length > 0 ? {
                    description: 'Lap validation checkpoints - placed to detect proper racing progression',
                    validationOrder: 'sequential',
                    segments: this.track.track.checkpoints
                } : []
            },
            racingLine: {
                ...this.track.racingLine,
                direction: this.track.racingLine.direction || 'counter-clockwise'
            },
            metadata: {
                ...this.track.metadata,
                racingDirection: this.track.racingLine.direction || 'counter-clockwise',
                totalCheckpoints: this.track.track.checkpoints.length,
                lastModified: new Date().toISOString()
            }
        };
        
        const jsonOutput = JSON.stringify(exportData, null, 2);
        codeViewOutput.innerHTML = `<code>${this.escapeHtml(jsonOutput)}</code>`;
    },
    
    // Copy track data to clipboard
    copyTrackData() {
        const codeViewOutput = document.getElementById('codeViewOutput');
        if (!codeViewOutput) return;
        
        const text = codeViewOutput.textContent || codeViewOutput.innerText;
        navigator.clipboard.writeText(text).then(() => {
            this.updateStatus('Track data copied to clipboard!');
            
            // Visual feedback
            const copyBtn = document.getElementById('copyCodeBtn');
            if (copyBtn) {
                const originalText = copyBtn.textContent;
                copyBtn.textContent = '✅ Copied!';
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                }, 2000);
            }
        }).catch(err => {
            console.error('Failed to copy track data:', err);
            this.updateStatus('Failed to copy track data - see console');
        });
    },
    
    // Download track data as JSON file
    downloadTrackData() {
        const codeViewOutput = document.getElementById('codeViewOutput');
        if (!codeViewOutput) return;
        
        const text = codeViewOutput.textContent || codeViewOutput.innerText;
        const trackName = this.track.metadata.name || 'track';
        const filename = `${trackName.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
        
        const blob = new Blob([text], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.updateStatus(`Track data downloaded as ${filename}`);
    },
    
    // Update output code (sidebar panel)
    updateOutput() {
        const outputCode = document.getElementById('outputCode');
        if (!outputCode) return;
        
        // Create enhanced export data with checkpoint metadata
        const exportData = {
            ...this.track,
            // Ensure checkpoints have proper metadata structure
            track: {
                ...this.track.track,
                checkpoints: this.track.track.checkpoints.length > 0 ? {
                    description: 'Lap validation checkpoints - placed to detect proper racing progression',
                    validationOrder: 'sequential',
                    segments: this.track.track.checkpoints
                } : []
            },
            racingLine: {
                ...this.track.racingLine,
                direction: this.track.racingLine.direction || 'counter-clockwise'
            },
            metadata: {
                ...this.track.metadata,
                racingDirection: this.track.racingLine.direction || 'counter-clockwise',
                totalCheckpoints: this.track.track.checkpoints.length,
                lastModified: new Date().toISOString()
            }
        };
        
        const jsonOutput = JSON.stringify(exportData, null, 2);
        outputCode.innerHTML = `<code>${this.escapeHtml(jsonOutput)}</code>`;
        
        // Also update code view if it's visible
        if (this.mode === 'track-data') {
            this.updateCodeView();
        }
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
        // Convert screen coordinates to grid units using new coordinate system
        return CoordinateUtils.screenToGrid(screenPos, this.view);
    },
    
    worldToScreen(worldPos) {
        // Convert grid units to screen coordinates using new coordinate system
        return CoordinateUtils.gridToScreen(worldPos, this.view);
    },
    
    snapToGrid(pos) {
        // Snap position to grid units (pos is already in grid units)
        return CoordinateUtils.snapToGridUnits(pos);
    },
    
    updateHover(worldPos) {
        // Check if mouse is hovering over any points
        // This would be used for highlighting hovered elements
        this.hoveredPoint = null;
        this.hoveredCheckpoint = null;
        
        // Check for checkpoint hover when using checkpoint tool
        if (this.tool === 'checkpoint') {
            const checkpointHit = this.findCheckpointHit(worldPos);
            if (checkpointHit) {
                this.hoveredCheckpoint = checkpointHit;
                this.canvas.style.cursor = 'grab';
                return;
            }
        }
        
        // Only check hover for current boundary type when using eraser/move tools
        if (this.tool === 'eraser' || this.tool === 'move') {
            const boundary = this.boundaryType === 'outer' ? this.track.track.outer : this.track.track.inner;
            const hoverRange = this.tool === 'eraser' ? 0.4 : 0.5; // Grid units (0.4 = 8px, 0.5 = 10px)
            
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
        } else if (this.tool !== 'checkpoint') {
            // Check all boundary points for other tools (but not checkpoint tool)
            const allPoints = [...this.track.track.outer, ...this.track.track.inner];
            for (let i = 0; i < allPoints.length; i++) {
                const point = allPoints[i];
                const distance = Math.sqrt(
                    Math.pow(worldPos.x - point.x, 2) + Math.pow(worldPos.y - point.y, 2)
                );
                
                if (distance <= 0.25) { // 0.25 grid units = 5 pixels
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
            case 'checkpoint':
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
        return distance <= 0.5; // 0.5 grid units = 10 pixels
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
        
        if (distanceToFirst <= 0.5) { // 0.5 grid units = 10 pixels
            this.updateStatus(`Click to close ${this.boundaryType} boundary loop (${boundary.length} points)`);
        } else if (boundary.length >= 3) {
            this.updateStatus(`Drawing ${this.boundaryType} boundary - click near first point to close loop (${boundary.length} points)`);
        }
    },
    
    // Update start/finish line preview
    updateStartFinishPreview(worldPos) {
        if (this.tool !== 'startfinish' || this.mode !== 'track') return;
        
        if (this.startFinishState && this.startFinishState.placing && this.startFinishState.firstPoint) {
            const snappedPos = this.view.snapToGrid ? this.snapToGrid(worldPos) : worldPos;
            this.startFinishState.previewPoint = { x: snappedPos.x, y: snappedPos.y };
            
            // Calculate distance for status update
            const distance = Math.sqrt(
                Math.pow(snappedPos.x - this.startFinishState.firstPoint.x, 2) +
                Math.pow(snappedPos.y - this.startFinishState.firstPoint.y, 2)
            );
            
            if (distance < 0.5) { // 0.5 grid units = 10 pixels
                this.updateStatus(`Start/finish line too short (${distance.toFixed(1)} units) - move farther from first point`);
            } else {
                this.updateStatus(`Click to complete start/finish line (${distance.toFixed(1)} units long)`);
            }
            
            this.render();
        }
    },
    
    // Update checkpoint preview
    updateCheckpointPreview(worldPos) {
        if (this.tool !== 'checkpoint' || this.mode !== 'track') return;
        
        if (this.checkpointState && this.checkpointState.placing && this.checkpointState.firstPoint) {
            const snappedPos = this.view.snapToGrid ? this.snapToGrid(worldPos) : worldPos;
            this.checkpointState.previewPoint = { x: snappedPos.x, y: snappedPos.y };
            
            // Calculate distance for status update
            const distance = Math.sqrt(
                Math.pow(snappedPos.x - this.checkpointState.firstPoint.x, 2) +
                Math.pow(snappedPos.y - this.checkpointState.firstPoint.y, 2)
            );
            
            if (distance < 0.3) { // 0.3 grid units = 6 pixels
                this.updateStatus(`Checkpoint line too short (${distance.toFixed(1)} units) - move farther from first point`);
            } else {
                this.updateStatus(`Click to complete checkpoint (${distance.toFixed(1)} units long)`);
            }
            
            this.render();
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
        // FIXED: Reset to show (0,0) at top-left corner like main game
        this.view.offsetX = 0;
        this.view.offsetY = 0;
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
        
        // Convert bounds from grid units to pixels for zoom calculation
        const boundsPixels = {
            minX: bounds.minX * CoordinateUtils.GRID_SIZE,
            minY: bounds.minY * CoordinateUtils.GRID_SIZE,
            maxX: bounds.maxX * CoordinateUtils.GRID_SIZE,
            maxY: bounds.maxY * CoordinateUtils.GRID_SIZE
        };
        
        const zoomX = (this.canvas.width - padding * 2) / (boundsPixels.maxX - boundsPixels.minX);
        const zoomY = (this.canvas.height - padding * 2) / (boundsPixels.maxY - boundsPixels.minY);
        
        this.view.zoom = Math.min(zoomX, zoomY, 2.0);
        this.view.offsetX = this.canvas.width / 2 - (boundsPixels.minX + boundsPixels.maxX) / 2 * this.view.zoom;
        this.view.offsetY = this.canvas.height / 2 - (boundsPixels.minY + boundsPixels.maxY) / 2 * this.view.zoom;
        
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
        // Simple oval track - coordinates in grid units (fits within game canvas 50x35 grid units)
        this.track.track.outer = [
            { x: 4, y: 4 },      // Grid unit 4,4 (within 0-50, 0-35 limits)
            { x: 46, y: 4 },     // Grid unit 46,4
            { x: 46, y: 31 },    // Grid unit 46,31
            { x: 4, y: 31 }      // Grid unit 4,31
        ];
        this.track.track.outer.closed = true; // Mark as closed
        
        this.track.track.inner = [
            { x: 14, y: 11 },    // Grid unit 14,11
            { x: 36, y: 11 },    // Grid unit 36,11
            { x: 36, y: 24 },    // Grid unit 36,24
            { x: 14, y: 24 }     // Grid unit 14,24
        ];
        this.track.track.inner.closed = true; // Mark as closed
        
        // Add start/finish line on the left side (grid units)
        this.track.track.startLine = {
            a: { x: 4, y: 17.5 },    // Left edge, middle height
            b: { x: 14, y: 17.5 }    // To inner boundary
        };
        
        this.track.metadata.name = 'Simple Oval';
        this.track.metadata.description = 'A basic oval racing circuit - fits within game canvas';
        this.updatePropertyInputs();
        
        // Refresh and validate
        this.validateTrack();
        this.updateStats();
        this.updateOutput();
        this.render();
        this.updateStatus('Loaded Simple Oval template');
    },
    
    loadFigure8Template() {
        // Figure-8 template - to be implemented
        this.updateStatus('Figure-8 template not yet implemented - using blank template');
        this.loadBlankTemplate();
    },
    
    loadCircuitTemplate() {
        // Circuit template - to be implemented
        this.updateStatus('Circuit template not yet implemented - using blank template');
        this.loadBlankTemplate();
    },
    
    // Setup file management event handlers
    setupFileManagement() {
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
        
        // New Track button
        const newTrackBtn = document.getElementById('newTrackBtn');
        if (newTrackBtn) {
            newTrackBtn.addEventListener('click', () => this.newTrack());
        }
    },
    
    
    loadBlankTemplate() {
        // FIXED: Completely clear ALL track elements
        this.track.track.outer = [];
        this.track.track.inner = [];
        this.track.track.checkpoints = [];
        this.track.track.walls = [];
        
        // Reset start/finish line to default empty state
        this.track.track.startLine = { a: { x: 0, y: 0 }, b: { x: 0, y: 0 } };
        
        // Clear racing line
        this.track.racingLine.waypoints = [];
        this.track.racingLine.direction = 'counter-clockwise';
        this.track.racingLine.validated = false;
        
        // Reset closed flags
        delete this.track.track.outer.closed;
        delete this.track.track.inner.closed;
        
        // Reset metadata
        this.track.metadata.name = 'New Track';
        this.track.metadata.author = 'Anonymous';
        this.track.metadata.description = '';
        this.track.metadata.difficulty = 'Medium';
        this.track.metadata.created = new Date().toISOString();
        
        // Clear validation state
        this.track.validation = {
            trackValid: false,
            racingLineValid: false,
            errors: [],
            warnings: [],
            metrics: {
                trackLength: 0,
                avgWidth: 0,
                complexity: 0
            }
        };
        
        // Reset editor state
        this.selectedPoints = [];
        this.selectedCheckpointIndex = null;
        this.selectedCheckpointEndpoint = null;
        this.hoveredPoint = null;
        this.hoveredCheckpoint = null;
        this.isDragging = false;
        this.isDraggingCheckpoint = false;
        this.dragPointIndex = -1;
        
        // Reset tool states
        this.startFinishState = {
            placing: false,
            firstPoint: null,
            previewPoint: null
        };
        
        this.checkpointState = {
            placing: false,
            firstPoint: null,
            previewPoint: null
        };
        
        // Reset racing line editor state
        if (typeof RacingLineEditor !== 'undefined') {
            RacingLineEditor.selectWaypoint(null);
        }
        
        this.updatePropertyInputs();
        this.updateStats();
        this.updateOutput();
        this.resetView();
        this.render();
        
        this.updateStatus('New blank track created - all elements cleared');
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
            
            if (outerDistance > 0.5) { // 0.5 grid units = 10 pixels
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
        
        // Validate racing line after adding waypoint
        this.validateRacingLine();
    },
    
    // Validate racing line against track boundaries
    validateRacingLine() {
        if (!this.track.racingLine.waypoints.length) {
            this.track.validation.racingLineValid = true;
            this.track.validation.errors = this.track.validation.errors.filter(error => !error.includes('racing line'));
            this.track.validation.warnings = this.track.validation.warnings.filter(warning => !warning.includes('racing line'));
            return;
        }
        
        const waypoints = this.track.racingLine.waypoints;
        const outerBoundary = this.track.track.outer;
        const innerBoundary = this.track.track.inner;
        
        let racingLineErrors = [];
        let racingLineWarnings = [];
        
        // Check if track boundaries exist
        if (outerBoundary.length < 3) {
            racingLineErrors.push('Racing line requires track outer boundary');
        } else {
            // Validate each waypoint is within track boundaries
            for (let i = 0; i < waypoints.length; i++) {
                const waypoint = waypoints[i];
                const isInside = this.isPointInTrack(waypoint.pos, outerBoundary, innerBoundary);
                
                if (!isInside) {
                    racingLineErrors.push(`Waypoint ${i} is outside track boundaries`);
                }
            }
        }
        
        // Check for reasonable speed transitions
        for (let i = 0; i < waypoints.length - 1; i++) {
            const current = waypoints[i];
            const next = waypoints[i + 1];
            const speedDiff = Math.abs(current.targetSpeed - next.targetSpeed);
            
            if (speedDiff > 2) {
                racingLineWarnings.push(`Large speed change between waypoints ${i} and ${i + 1}`);
            }
        }
        
        // Update validation state
        this.track.validation.racingLineValid = racingLineErrors.length === 0;
        
        // Remove old racing line errors/warnings
        this.track.validation.errors = this.track.validation.errors.filter(error => !error.includes('racing line') && !error.includes('Waypoint'));
        this.track.validation.warnings = this.track.validation.warnings.filter(warning => !warning.includes('racing line') && !error.includes('waypoint'));
        
        // Add new racing line errors/warnings
        this.track.validation.errors.push(...racingLineErrors);
        this.track.validation.warnings.push(...racingLineWarnings);
        
        // Update validation display if visible
        this.updateValidationDisplay();
    },
    
    // Check if point is within track boundaries (inside outer, outside inner)
    isPointInTrack(point, outerBoundary, innerBoundary) {
        // Check if point is inside outer boundary
        const insideOuter = this.isPointInPolygon(point, outerBoundary);
        if (!insideOuter) {
            return false;
        }
        
        // Check if point is outside inner boundary (if exists)
        if (innerBoundary.length >= 3) {
            const insideInner = this.isPointInPolygon(point, innerBoundary);
            if (insideInner) {
                return false; // Point is in inner boundary (hole), so not valid
            }
        }
        
        return true;
    },
    
    // Point-in-polygon test using ray casting algorithm
    isPointInPolygon(point, polygon) {
        if (polygon.length < 3) return false;
        
        let inside = false;
        const x = point.x;
        const y = point.y;
        
        let j = polygon.length - 1;
        for (let i = 0; i < polygon.length; i++) {
            const xi = polygon[i].x;
            const yi = polygon[i].y;
            const xj = polygon[j].x;
            const yj = polygon[j].y;
            
            if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
            
            j = i;
        }
        
        return inside;
    },
    
    // Render start/finish line
    renderStartFinishLine() {
        // Render existing start/finish line
        if (this.track.track.startLine && this.track.track.startLine.a && this.track.track.startLine.b) {
            const line = this.track.track.startLine;
            
            // Convert start/finish line endpoints from grid units to pixels
            const pointAPixel = CoordinateUtils.gridToPixels(line.a);
            const pointBPixel = CoordinateUtils.gridToPixels(line.b);
            
            // Checkered flag pattern
            this.renderCheckeredLine(pointAPixel, pointBPixel, '#000000', '#ffffff', 6);
            
            // Add "START" and "FINISH" text
            this.ctx.fillStyle = '#000000';
            this.ctx.font = `${14 / this.view.zoom}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            const midX = (pointAPixel.x + pointBPixel.x) / 2;
            const midY = (pointAPixel.y + pointBPixel.y) / 2;
            
            // Calculate perpendicular offset for text
            const dx = pointBPixel.x - pointAPixel.x;
            const dy = pointBPixel.y - pointAPixel.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const perpX = -dy / length * 15 / this.view.zoom;
            const perpY = dx / length * 15 / this.view.zoom;
            
            // Draw START/FINISH text above the line
            this.ctx.fillStyle = '#ffffff';
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 2 / this.view.zoom;
            
            this.ctx.strokeText('START/FINISH', midX + perpX, midY + perpY);
            this.ctx.fillText('START/FINISH', midX + perpX, midY + perpY);
        }
        
        // Render preview for start/finish line tool
        if (this.tool === 'startfinish' && this.startFinishState) {
            if (this.startFinishState.firstPoint) {
                // Convert first point from grid units to pixels
                const firstPointPixel = CoordinateUtils.gridToPixels(this.startFinishState.firstPoint);
                
                // Draw first point
                this.ctx.fillStyle = '#ff0000';
                this.ctx.beginPath();
                this.ctx.arc(firstPointPixel.x, firstPointPixel.y, 6 / this.view.zoom, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Draw preview line if placing
                if (this.startFinishState.placing && this.startFinishState.previewPoint) {
                    // Convert preview point from grid units to pixels
                    const previewPointPixel = CoordinateUtils.gridToPixels(this.startFinishState.previewPoint);
                    
                    const distance = Math.sqrt(
                        Math.pow(this.startFinishState.previewPoint.x - this.startFinishState.firstPoint.x, 2) +
                        Math.pow(this.startFinishState.previewPoint.y - this.startFinishState.firstPoint.y, 2)
                    );
                    
                    // Use different colors based on validity
                    const lineColor = distance >= 10 ? '#00ff00' : '#ff6666';
                    
                    this.ctx.strokeStyle = lineColor;
                    this.ctx.lineWidth = 4 / this.view.zoom;
                    this.ctx.setLineDash([8 / this.view.zoom, 4 / this.view.zoom]);
                    
                    this.ctx.beginPath();
                    this.ctx.moveTo(firstPointPixel.x, firstPointPixel.y);
                    this.ctx.lineTo(previewPointPixel.x, previewPointPixel.y);
                    this.ctx.stroke();
                    
                    this.ctx.setLineDash([]); // Reset dash pattern
                    
                    // Draw second point preview
                    this.ctx.fillStyle = lineColor;
                    this.ctx.beginPath();
                    this.ctx.arc(previewPointPixel.x, previewPointPixel.y, 4 / this.view.zoom, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        }
    },
    
    // Render checkered pattern line
    renderCheckeredLine(pointA, pointB, color1, color2, segmentLength) {
        const dx = pointB.x - pointA.x;
        const dy = pointB.y - pointA.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const unitX = dx / length;
        const unitY = dy / length;
        
        // Calculate perpendicular for line width
        const perpX = -unitY * 3 / this.view.zoom;
        const perpY = unitX * 3 / this.view.zoom;
        
        const numSegments = Math.ceil(length / segmentLength);
        const actualSegmentLength = length / numSegments;
        
        for (let i = 0; i < numSegments; i++) {
            const t1 = (i * actualSegmentLength) / length;
            const t2 = ((i + 1) * actualSegmentLength) / length;
            
            const x1 = pointA.x + dx * t1;
            const y1 = pointA.y + dy * t1;
            const x2 = pointA.x + dx * t2;
            const y2 = pointA.y + dy * t2;
            
            // Alternate colors
            this.ctx.fillStyle = (i % 2 === 0) ? color1 : color2;
            
            // Draw segment as a rectangle
            this.ctx.beginPath();
            this.ctx.moveTo(x1 + perpX, y1 + perpY);
            this.ctx.lineTo(x2 + perpX, y2 + perpY);
            this.ctx.lineTo(x2 - perpX, y2 - perpY);
            this.ctx.lineTo(x1 - perpX, y1 - perpY);
            this.ctx.closePath();
            this.ctx.fill();
        }
        
        // Add border
        this.ctx.strokeStyle = '#333333';
        this.ctx.lineWidth = 1 / this.view.zoom;
        this.ctx.beginPath();
        this.ctx.moveTo(pointA.x + perpX, pointA.y + perpY);
        this.ctx.lineTo(pointB.x + perpX, pointB.y + perpY);
        this.ctx.moveTo(pointA.x - perpX, pointA.y - perpY);
        this.ctx.lineTo(pointB.x - perpX, pointB.y - perpY);
        this.ctx.stroke();
    },
    
    // Update validation display in the UI
    updateValidationDisplay() {
        if (!this.view.showValidation) return;
        
        const validationResults = document.getElementById('validationResults');
        const validationErrors = document.getElementById('validationErrors');
        const validationWarnings = document.getElementById('validationWarnings');
        const validationMetrics = document.getElementById('validationMetrics');
        
        if (validationResults) {
            validationResults.style.display = 'block';
        }
        
        // Display errors
        if (validationErrors) {
            if (this.track.validation.errors.length > 0) {
                validationErrors.innerHTML = this.track.validation.errors.map(error => 
                    `<div class="validation-error">❌ ${error}</div>`
                ).join('');
            } else {
                validationErrors.innerHTML = '<div class="validation-success">✅ No errors</div>';
            }
        }
        
        // Display warnings
        if (validationWarnings) {
            if (this.track.validation.warnings.length > 0) {
                validationWarnings.innerHTML = this.track.validation.warnings.map(warning => 
                    `<div class="validation-warning">⚠️ ${warning}</div>`
                ).join('');
            } else {
                validationWarnings.innerHTML = '<div class="validation-success">✅ No warnings</div>';
            }
        }
        
        // Display metrics
        if (validationMetrics) {
            const metrics = this.track.validation.metrics;
            validationMetrics.innerHTML = `
                <div>Track Length: ${metrics.trackLength.toFixed(1)} units</div>
                <div>Complexity: ${metrics.complexity.toFixed(0)}%</div>
                <div>Track Valid: ${this.track.validation.trackValid ? '✅' : '❌'}</div>
                <div>Racing Line Valid: ${this.track.validation.racingLineValid ? '✅' : '❌'}</div>
            `;
        }
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
        
        // Note: Grid is now provided by CSS background on canvas element
        // No longer need to render grid via canvas
        
        // Render track
        if (this.view.showTrackBounds) {
            this.renderTrack();
        }
        
        // Render start/finish line
        this.renderStartFinishLine();
        
        // Render racing line
        if (this.view.showRacingLine && this.mode !== 'track') {
            this.renderRacingLine();
        }
        
        // Render waypoints
        if (this.view.showWaypoints && this.mode !== 'track') {
            this.renderWaypoints();
        }
        
        // Render checkpoints
        if (this.view.showCheckpoints) {
            this.renderCheckpoints();
        }
        
        // Render direction arrows (only in racing line mode, not in track design mode)
        if (this.view.showDirectionArrows && this.track.racingLine.waypoints.length > 1 && this.mode !== 'track') {
            this.renderDirectionArrows();
        }
        
        // Render preview elements
        this.renderPreview();
        
        // Restore context
        this.ctx.restore();
    },
    
    // renderGrid() function removed - grid is now provided by CSS background
    // This improves performance and ensures visual consistency with main game
    
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
        
        // Convert first point from grid units to pixels for drawing
        const firstPixel = CoordinateUtils.gridToPixels(points[0]);
        
        this.ctx.beginPath();
        this.ctx.moveTo(firstPixel.x, firstPixel.y);
        
        for (let i = 1; i < points.length; i++) {
            // Convert each point from grid units to pixels
            const pixelPoint = CoordinateUtils.gridToPixels(points[i]);
            this.ctx.lineTo(pixelPoint.x, pixelPoint.y);
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
            // Convert point from grid units to pixels for drawing
            const pixelPoint = CoordinateUtils.gridToPixels(point);
            this.ctx.beginPath();
            this.ctx.arc(pixelPoint.x, pixelPoint.y, 3 / this.view.zoom, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // If closed, highlight the first point differently
        if (isClosed && points.length > 0) {
            const firstPixel = CoordinateUtils.gridToPixels(points[0]);
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 2 / this.view.zoom;
            this.ctx.beginPath();
            this.ctx.arc(firstPixel.x, firstPixel.y, 5 / this.view.zoom, 0, Math.PI * 2);
            this.ctx.stroke();
        }
    },
    
    // Render racing line
    renderRacingLine() {
        const waypoints = this.track.racingLine.waypoints;
        if (waypoints.length < 2) return;
        
        // Render racing line segments with speed-based color coding (different from waypoint colors)
        for (let i = 0; i < waypoints.length; i++) {
            const current = waypoints[i];
            const next = waypoints[(i + 1) % waypoints.length];
            
            if (!current || !next) continue;
            
            // Get speed-based color
            const speedColors = {
                1: '#ef4444', // Red - slowest
                2: '#f59e0b', // Orange
                3: '#eab308', // Yellow
                4: '#22c55e', // Green
                5: '#3b82f6', // Blue
                6: '#8b5cf6'  // Purple - fastest
            };
            
            const speed = current.targetSpeed || 3;
            const lineColor = speedColors[speed] || '#22c55e';
            
            // Draw line segment
            this.ctx.strokeStyle = lineColor;
            this.ctx.lineWidth = 3 / this.view.zoom; // Thicker for better visibility
            
            // Convert waypoint positions from grid units to pixels
            const currentPixel = CoordinateUtils.gridToPixels(current.pos);
            const nextPixel = CoordinateUtils.gridToPixels(next.pos);
            
            this.ctx.beginPath();
            this.ctx.moveTo(currentPixel.x, currentPixel.y);
            this.ctx.lineTo(nextPixel.x, nextPixel.y);
            this.ctx.stroke();
        }
        
        // If closed loop, connect last to first
        if (waypoints.length >= 3) {
            const first = waypoints[0];
            const last = waypoints[waypoints.length - 1];
            
            const speed = last.targetSpeed || 3;
            const speedColors = {
                1: '#ef4444', 2: '#f59e0b', 3: '#eab308',
                4: '#22c55e', 5: '#3b82f6', 6: '#8b5cf6'
            };
            const lineColor = speedColors[speed] || '#22c55e';
            
            this.ctx.strokeStyle = lineColor;
            this.ctx.lineWidth = 3 / this.view.zoom;
            
            // Convert waypoint positions from grid units to pixels
            const lastPixel = CoordinateUtils.gridToPixels(last.pos);
            const firstPixel = CoordinateUtils.gridToPixels(first.pos);
            
            this.ctx.beginPath();
            this.ctx.moveTo(lastPixel.x, lastPixel.y);
            this.ctx.lineTo(firstPixel.x, firstPixel.y);
            this.ctx.stroke();
        }
    },
    
    // Render waypoints
    renderWaypoints() {
        const waypoints = this.track.racingLine.waypoints;
        
        for (let i = 0; i < waypoints.length; i++) {
            const waypoint = waypoints[i];
            
            // Get waypoint shape and color based on corner type (matching racing line editor)
            // Note: Racing line segments use speed colors, waypoints use corner type colors
            const cornerShapes = {
                'straight': 'circle',
                'entry': 'triangle', 
                'apex': 'diamond',
                'exit': 'square'
            };
            
            const cornerColors = {
                'straight': '#3b82f6', // Blue - straight sections
                'entry': '#f59e0b',    // Orange - corner entries
                'apex': '#ef4444',     // Red - apex points
                'exit': '#22c55e'      // Green - corner exits
            };
            
            const cornerType = waypoint.cornerType || 'straight';
            const baseColor = cornerColors[cornerType] || '#3b82f6';
            const shape = cornerShapes[cornerType] || 'circle';
            
            // Check if this waypoint is selected or hovered
            const isSelected = (typeof RacingLineEditor !== 'undefined') && (RacingLineEditor.selectedWaypoint === i);
            const isHovered = (typeof RacingLineEditor !== 'undefined') && (RacingLineEditor.hoveredWaypoint === i);
            
            const size = isSelected ? 8 : (isHovered ? 6 : 5);
            
            // Convert waypoint position from grid units to pixels
            const waypointPixel = CoordinateUtils.gridToPixels(waypoint.pos);
            
            this.ctx.fillStyle = baseColor;
            
            // Draw waypoint shape
            this.ctx.beginPath();
            
            switch (shape) {
                case 'circle':
                    this.ctx.arc(waypointPixel.x, waypointPixel.y, size / this.view.zoom, 0, Math.PI * 2);
                    break;
                    
                case 'triangle':
                    const triSize = size / this.view.zoom;
                    this.ctx.moveTo(waypointPixel.x, waypointPixel.y - triSize);
                    this.ctx.lineTo(waypointPixel.x - triSize * 0.866, waypointPixel.y + triSize * 0.5);
                    this.ctx.lineTo(waypointPixel.x + triSize * 0.866, waypointPixel.y + triSize * 0.5);
                    this.ctx.closePath();
                    break;
                    
                case 'diamond':
                    const dimSize = size / this.view.zoom;
                    this.ctx.moveTo(waypointPixel.x, waypointPixel.y - dimSize);
                    this.ctx.lineTo(waypointPixel.x + dimSize, waypointPixel.y);
                    this.ctx.lineTo(waypointPixel.x, waypointPixel.y + dimSize);
                    this.ctx.lineTo(waypointPixel.x - dimSize, waypointPixel.y);
                    this.ctx.closePath();
                    break;
                    
                case 'square':
                    const sqSize = size / this.view.zoom;
                    this.ctx.rect(waypointPixel.x - sqSize, waypointPixel.y - sqSize, sqSize * 2, sqSize * 2);
                    break;
            }
            
            this.ctx.fill();
            
            // Selection highlight
            if (isSelected) {
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 3 / this.view.zoom;
                this.ctx.stroke();
            } else if (isHovered) {
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 2 / this.view.zoom;
                this.ctx.stroke();
            }
            
            // Brake zone indicator - orange outline
            if (waypoint.brakeZone) {
                this.ctx.strokeStyle = '#f59e0b';
                this.ctx.lineWidth = 3 / this.view.zoom;
                this.ctx.stroke();
            }
            
            // Draw waypoint index number for selected waypoint
            if (isSelected && this.view.zoom > 0.5) {
                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = `${12 / this.view.zoom}px Arial`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(i.toString(), waypointPixel.x, waypointPixel.y - 15 / this.view.zoom);
            }
        }
    },
    
    // Render checkpoints
    renderCheckpoints() {
        const checkpoints = this.track.track.checkpoints;
        if (!checkpoints || checkpoints.length === 0) return;
        
        checkpoints.forEach((checkpoint, index) => {
            const segment = checkpoint.segment;
            const isSelected = this.selectedCheckpointIndex === index;
            const isHovered = this.hoveredCheckpoint && this.hoveredCheckpoint.index === index;
            
            // Choose colors based on state
            let lineColor = '#ffa500'; // Default orange
            let endpointColor = '#ffa500';
            let lineWidth = 3;
            
            if (isSelected) {
                lineColor = '#ff6b6b'; // Red for selected
                lineWidth = 4;
            } else if (isHovered) {
                lineColor = '#ffdd00'; // Yellow for hovered
                lineWidth = 3.5;
            }
            
            // Convert checkpoint segment from grid units to pixels
            const segmentAPixel = CoordinateUtils.gridToPixels(segment.a);
            const segmentBPixel = CoordinateUtils.gridToPixels(segment.b);
            
            // Draw checkpoint line
            this.ctx.strokeStyle = lineColor;
            this.ctx.lineWidth = lineWidth / this.view.zoom;
            this.ctx.beginPath();
            this.ctx.moveTo(segmentAPixel.x, segmentAPixel.y);
            this.ctx.lineTo(segmentBPixel.x, segmentBPixel.y);
            this.ctx.stroke();
            
            // Draw checkpoint number
            const midX = (segmentAPixel.x + segmentBPixel.x) / 2;
            const midY = (segmentAPixel.y + segmentBPixel.y) / 2;
            
            this.ctx.fillStyle = lineColor;
            this.ctx.font = `${12 / this.view.zoom}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(`${index + 1}`, midX, midY - 10 / this.view.zoom);
            
            // Draw endpoint A
            const isEndpointASelected = isSelected && this.selectedCheckpointEndpoint === 'a';
            this.ctx.fillStyle = isEndpointASelected ? '#ff3333' : lineColor;
            this.ctx.strokeStyle = isEndpointASelected ? '#ffffff' : lineColor;
            this.ctx.lineWidth = isEndpointASelected ? 2 / this.view.zoom : 1 / this.view.zoom;
            
            this.ctx.beginPath();
            this.ctx.arc(segmentAPixel.x, segmentAPixel.y, isEndpointASelected ? 5 / this.view.zoom : 3 / this.view.zoom, 0, Math.PI * 2);
            this.ctx.fill();
            if (isEndpointASelected) {
                this.ctx.stroke();
            }
            
            // Draw endpoint B
            const isEndpointBSelected = isSelected && this.selectedCheckpointEndpoint === 'b';
            this.ctx.fillStyle = isEndpointBSelected ? '#ff3333' : lineColor;
            this.ctx.strokeStyle = isEndpointBSelected ? '#ffffff' : lineColor;
            this.ctx.lineWidth = isEndpointBSelected ? 2 / this.view.zoom : 1 / this.view.zoom;
            
            this.ctx.beginPath();
            this.ctx.arc(segmentBPixel.x, segmentBPixel.y, isEndpointBSelected ? 5 / this.view.zoom : 3 / this.view.zoom, 0, Math.PI * 2);
            this.ctx.fill();
            if (isEndpointBSelected) {
                this.ctx.stroke();
            }
            
            // Add endpoint labels for selected checkpoint
            if (isSelected) {
                this.ctx.fillStyle = '#ffffff';
                this.ctx.strokeStyle = '#000000';
                this.ctx.lineWidth = 2 / this.view.zoom;
                this.ctx.font = `${10 / this.view.zoom}px Arial`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                
                // Label A endpoint
                this.ctx.strokeText('A', segmentAPixel.x, segmentAPixel.y - 12 / this.view.zoom);
                this.ctx.fillText('A', segmentAPixel.x, segmentAPixel.y - 12 / this.view.zoom);
                
                // Label B endpoint
                this.ctx.strokeText('B', segmentBPixel.x, segmentBPixel.y - 12 / this.view.zoom);
                this.ctx.fillText('B', segmentBPixel.x, segmentBPixel.y - 12 / this.view.zoom);
            }
        });
    },
    
    // Render direction arrows along racing line
    renderDirectionArrows() {
        const waypoints = this.track.racingLine.waypoints;
        if (waypoints.length < 2) return;
        
        // COORDINATE SYSTEM EXPLANATION:
        // Track editor waypoints are inherently ordered in CLOCKWISE direction
        // (waypoint[0] → waypoint[1] represents clockwise movement around track)
        // However, vRacer game expects COUNTER-CLOCKWISE waypoint ordering.
        // 
        // When track direction is set to "counter-clockwise", we must reverse
        // the arrow direction to visually show counter-clockwise movement,
        // even though the waypoint indices progress clockwise.
        const direction = this.track.racingLine.direction || 'counter-clockwise';
        const arrowColor = direction === 'counter-clockwise' ? '#2196f3' : '#ff5722';
        
        this.ctx.fillStyle = arrowColor;
        this.ctx.strokeStyle = arrowColor;
        this.ctx.lineWidth = 2 / this.view.zoom;
        
        // Draw arrows every few waypoints
        for (let i = 0; i < waypoints.length; i += 4) {
            const current = waypoints[i];
            const next = waypoints[(i + 1) % waypoints.length];
            
            // IMPORTANT: Track editor waypoints are ordered clockwise,
            // but vRacer expects counter-clockwise. When direction setting
            // is "counter-clockwise", we need to reverse the arrow direction
            // to match the expected racing direction.
            const shouldReverse = direction === 'counter-clockwise';
            
            // If reversing, swap current and next to get opposite direction
            const fromPoint = shouldReverse ? next : current;
            const toPoint = shouldReverse ? current : next;
            
            // Convert waypoint positions from grid units to pixels
            const fromPixel = CoordinateUtils.gridToPixels(fromPoint.pos);
            const toPixel = CoordinateUtils.gridToPixels(toPoint.pos);
            
            // Calculate direction vector (corrected for waypoint ordering)
            const dx = toPixel.x - fromPixel.x;
            const dy = toPixel.y - fromPixel.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            
            if (length > 20 / this.view.zoom) { // Only draw if segment is long enough
                const unitX = dx / length;
                const unitY = dy / length;
                
                // Position arrow at 60% along the corrected segment
                const arrowX = fromPixel.x + dx * 0.6;
                const arrowY = fromPixel.y + dy * 0.6;
                
                // Make arrows larger and more visible (increased from 8 to 12)
                const arrowSize = 12 / this.view.zoom;
                
                // Draw arrow triangle pointing in direction of travel
                // Create a proper arrow pointing from current toward next waypoint
                this.ctx.beginPath();
                
                // Arrow tip (point of the triangle) - move further along the direction vector
                const tipX = arrowX + arrowSize * unitX * 0.5;
                const tipY = arrowY + arrowSize * unitY * 0.5;
                this.ctx.moveTo(tipX, tipY);
                
                // Arrow base points (wings of the triangle) - behind the tip
                const baseX = arrowX - arrowSize * unitX * 0.5;
                const baseY = arrowY - arrowSize * unitY * 0.5;
                
                // Left wing of arrow (perpendicular to direction)
                this.ctx.lineTo(
                    baseX - arrowSize * unitY * 0.4,
                    baseY + arrowSize * unitX * 0.4
                );
                
                // Right wing of arrow (perpendicular to direction)
                this.ctx.lineTo(
                    baseX + arrowSize * unitY * 0.4,
                    baseY - arrowSize * unitX * 0.4
                );
                
                this.ctx.closePath();
                this.ctx.fill();
                
                // Add subtle outline for better visibility
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 1 / this.view.zoom;
                this.ctx.stroke();
            }
        }
    },
    
    // Render preview elements
    renderPreview() {
        // Render hover effects for different tools
        if (this.hoveredPoint) {
            const point = this.hoveredPoint.point;
            
            // Convert hovered point from grid units to pixels
            const pointPixel = CoordinateUtils.gridToPixels(point);
            
            if (this.hoveredPoint.tool === 'eraser') {
                // Red highlight for eraser
                this.ctx.strokeStyle = '#ef4444';
                this.ctx.fillStyle = '#ef444444';
                this.ctx.lineWidth = 2 / this.view.zoom;
                this.ctx.beginPath();
                this.ctx.arc(pointPixel.x, pointPixel.y, 8 / this.view.zoom, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();
            } else if (this.hoveredPoint.tool === 'move') {
                // Blue highlight for move
                this.ctx.strokeStyle = '#3b82f6';
                this.ctx.fillStyle = '#3b82f644';
                this.ctx.lineWidth = 2 / this.view.zoom;
                this.ctx.beginPath();
                this.ctx.arc(pointPixel.x, pointPixel.y, 8 / this.view.zoom, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();
            } else {
                // Default white highlight
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 2 / this.view.zoom;
                this.ctx.beginPath();
                this.ctx.arc(pointPixel.x, pointPixel.y, 6 / this.view.zoom, 0, Math.PI * 2);
                this.ctx.stroke();
            }
        }
        
        // Render selected points for move tool
        if (this.tool === 'move' && this.selectedPoints.length > 0) {
            const boundary = this.boundaryType === 'outer' ? this.track.track.outer : this.track.track.inner;
            
            for (const pointIndex of this.selectedPoints) {
                if (boundary[pointIndex]) {
                    // Convert point from grid units to pixels
                    const pixelPoint = CoordinateUtils.gridToPixels(boundary[pointIndex]);
                    this.ctx.strokeStyle = '#22c55e';
                    this.ctx.fillStyle = '#22c55e44';
                    this.ctx.lineWidth = 3 / this.view.zoom;
                    this.ctx.beginPath();
                    this.ctx.arc(pixelPoint.x, pixelPoint.y, 10 / this.view.zoom, 0, Math.PI * 2);
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
                    
                    if (distanceToFirst <= 0.5) { // 0.5 grid units = 10 pixels
                        nearFirstPoint = true;
                        
                        // Convert points from grid units to pixels
                        const firstPointPixel = CoordinateUtils.gridToPixels(firstPoint);
                        const lastPointPixel = CoordinateUtils.gridToPixels(lastPoint);
                        
                        // Highlight first point for loop closure
                        this.ctx.strokeStyle = '#ffcc00';
                        this.ctx.fillStyle = '#ffcc0044';
                        this.ctx.lineWidth = 3 / this.view.zoom;
                        this.ctx.beginPath();
                        this.ctx.arc(firstPointPixel.x, firstPointPixel.y, 8 / this.view.zoom, 0, Math.PI * 2);
                        this.ctx.fill();
                        this.ctx.stroke();
                        
                        // Draw closing line preview
                        this.ctx.strokeStyle = '#ffcc0088';
                        this.ctx.setLineDash([3, 3]);
                        this.ctx.lineWidth = 2 / this.view.zoom;
                        this.ctx.beginPath();
                        this.ctx.moveTo(lastPointPixel.x, lastPointPixel.y);
                        this.ctx.lineTo(firstPointPixel.x, firstPointPixel.y);
                        this.ctx.stroke();
                        this.ctx.setLineDash([]);
                    }
                }
                
                if (!nearFirstPoint) {
                    // Convert points from grid units to pixels
                    const lastPointPixel = CoordinateUtils.gridToPixels(lastPoint);
                    const snappedPosPixel = CoordinateUtils.gridToPixels(snappedPos);
                    
                    // Normal preview line from last point to mouse
                    this.ctx.strokeStyle = '#ffffff66';
                    this.ctx.setLineDash([5, 5]);
                    this.ctx.lineWidth = 1 / this.view.zoom;
                    this.ctx.beginPath();
                    this.ctx.moveTo(lastPointPixel.x, lastPointPixel.y);
                    this.ctx.lineTo(snappedPosPixel.x, snappedPosPixel.y);
                    this.ctx.stroke();
                    this.ctx.setLineDash([]);
                    
                    // Preview point
                    this.ctx.fillStyle = '#ffffff88';
                    this.ctx.beginPath();
                    this.ctx.arc(snappedPosPixel.x, snappedPosPixel.y, 3 / this.view.zoom, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        }
        
        // Checkpoint tool preview
        if (this.tool === 'checkpoint' && this.mousePos) {
            const snappedPos = this.view.snapToGrid ? this.snapToGrid(this.mousePos) : this.mousePos;
            
            // Initialize checkpoint state if needed
            if (!this.checkpointState) {
                this.checkpointState = {
                    placing: false,
                    firstPoint: null,
                    previewPoint: null
                };
            }
            
            if (!this.checkpointState.placing || !this.checkpointState.firstPoint) {
                // Convert snapped position from grid units to pixels
                const snappedPosPixel = CoordinateUtils.gridToPixels(snappedPos);
                
                // Preview first point
                this.ctx.fillStyle = '#00ff00aa';
                this.ctx.strokeStyle = '#00ff00';
                this.ctx.lineWidth = 2 / this.view.zoom;
                this.ctx.beginPath();
                this.ctx.arc(snappedPosPixel.x, snappedPosPixel.y, 6 / this.view.zoom, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();
            } else {
                // Preview checkpoint segment
                const firstPoint = this.checkpointState.firstPoint;
                const length = Math.sqrt(
                    Math.pow(snappedPos.x - firstPoint.x, 2) + 
                    Math.pow(snappedPos.y - firstPoint.y, 2)
                );
                
                // Color based on length validity (minimum 0.3 grid units = 6 pixels)
                const isValidLength = length >= 0.3;
                const previewColor = isValidLength ? '#00ff00' : '#ff0000';
                const previewColorAlpha = isValidLength ? '#00ff00aa' : '#ff0000aa';
                
                // Convert points from grid units to pixels
                const firstPointPixel = CoordinateUtils.gridToPixels(firstPoint);
                const snappedPosPixel = CoordinateUtils.gridToPixels(snappedPos);
                
                // Draw preview line
                this.ctx.strokeStyle = previewColorAlpha;
                this.ctx.lineWidth = 3 / this.view.zoom;
                this.ctx.beginPath();
                this.ctx.moveTo(firstPointPixel.x, firstPointPixel.y);
                this.ctx.lineTo(snappedPosPixel.x, snappedPosPixel.y);
                this.ctx.stroke();
                
                // Draw first point (already placed)
                this.ctx.fillStyle = '#00ff00';
                this.ctx.strokeStyle = '#00ff00';
                this.ctx.lineWidth = 2 / this.view.zoom;
                this.ctx.beginPath();
                this.ctx.arc(firstPointPixel.x, firstPointPixel.y, 6 / this.view.zoom, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();
                
                // Draw second point preview
                this.ctx.fillStyle = previewColorAlpha;
                this.ctx.strokeStyle = previewColor;
                this.ctx.lineWidth = 2 / this.view.zoom;
                this.ctx.beginPath();
                this.ctx.arc(snappedPosPixel.x, snappedPosPixel.y, 4 / this.view.zoom, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();
                
                // Show length indicator (in grid units)
                if (length > 0) {
                    const midX = (firstPointPixel.x + snappedPosPixel.x) / 2;
                    const midY = (firstPointPixel.y + snappedPosPixel.y) / 2;
                    
                    this.ctx.fillStyle = previewColor;
                    this.ctx.font = `${12 / this.view.zoom}px monospace`;
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText(`${length.toFixed(1)}u`, midX, midY - 10 / this.view.zoom); // Show as grid units (u)
                }
            }
        }
    },
    
    // Checkpoint Utility Functions
    findCheckpointHit(pos) {
        const hitRadius = 0.4; // 0.4 grid units = 8 pixels
        
        for (let i = 0; i < this.track.track.checkpoints.length; i++) {
            const checkpoint = this.track.track.checkpoints[i];
            
            // Check endpoint A
            const distanceA = Math.sqrt(
                Math.pow(pos.x - checkpoint.segment.a.x, 2) + 
                Math.pow(pos.y - checkpoint.segment.a.y, 2)
            );
            
            if (distanceA <= hitRadius) {
                return { index: i, endpoint: 'a', distance: distanceA };
            }
            
            // Check endpoint B
            const distanceB = Math.sqrt(
                Math.pow(pos.x - checkpoint.segment.b.x, 2) + 
                Math.pow(pos.y - checkpoint.segment.b.y, 2)
            );
            
            if (distanceB <= hitRadius) {
                return { index: i, endpoint: 'b', distance: distanceB };
            }
        }
        
        return null;
    },
    
    // Delete checkpoint by index
    deleteCheckpointByIndex(index) {
        if (index < 0 || index >= this.track.track.checkpoints.length) {
            return false;
        }
        
        const checkpoint = this.track.track.checkpoints[index];
        this.track.track.checkpoints.splice(index, 1);
        
        // Re-number remaining checkpoints
        this.track.track.checkpoints.forEach((cp, i) => {
            cp.id = i;
            cp.name = cp.name.replace(/Checkpoint \d+/, `Checkpoint ${i + 1}`);
        });
        
        // Clear selection if this was the selected checkpoint
        if (this.selectedCheckpointIndex === index) {
            this.selectedCheckpointIndex = null;
            this.selectedCheckpointEndpoint = null;
        }
        
        // Update everything
        this.updateStats();
        this.updateOutput();
        this.render();
        
        this.updateStatus(`Deleted ${checkpoint.name}`);
        return true;
    },
    
    // Checkpoint Management Functions
    deleteSelectedCheckpoint() {
        // Delete the currently selected checkpoint
        if (this.selectedCheckpointIndex !== undefined && this.selectedCheckpointIndex !== null) {
            this.deleteCheckpointByIndex(this.selectedCheckpointIndex);
        } else {
            this.updateStatus('No checkpoint selected - click on a checkpoint to select it first');
        }
    },
    
    validateTrackConfiguration() {
        const issues = [];
        const warnings = [];
        
        // Validate racing line direction consistency
        if (this.track.racingLine.waypoints.length > 3) {
            let directionChanges = 0;
            for (let i = 1; i < this.track.racingLine.waypoints.length - 1; i++) {
                const prev = this.track.racingLine.waypoints[i - 1].pos;
                const curr = this.track.racingLine.waypoints[i].pos;
                const next = this.track.racingLine.waypoints[i + 1].pos;
                
                const cross1 = (curr.x - prev.x) * (next.y - curr.y) - (curr.y - prev.y) * (next.x - curr.x);
                
                if (i > 1) {
                    const prevPrev = this.track.racingLine.waypoints[i - 2].pos;
                    const cross2 = (prev.x - prevPrev.x) * (curr.y - prev.y) - (prev.y - prevPrev.y) * (curr.x - prev.x);
                    
                    if (Math.sign(cross1) !== Math.sign(cross2) && Math.abs(cross1) > 1) {
                        directionChanges++;
                    }
                }
            }
            
            if (directionChanges > this.track.racingLine.waypoints.length * 0.3) {
                warnings.push(`Racing line has ${directionChanges} direction inconsistencies - consider smoothing`);
            }
        }
        
        // Validate checkpoint coverage
        if (this.track.track.checkpoints.length < 3) {
            warnings.push('Consider adding more checkpoints for better lap validation');
        }
        
        // Validate checkpoint spacing
        if (this.track.track.checkpoints.length > 1) {
            for (let i = 0; i < this.track.track.checkpoints.length - 1; i++) {
                const cp1 = this.track.track.checkpoints[i];
                const cp2 = this.track.track.checkpoints[i + 1];
                
                const midX1 = (cp1.segment.a.x + cp1.segment.b.x) / 2;
                const midY1 = (cp1.segment.a.y + cp1.segment.b.y) / 2;
                const midX2 = (cp2.segment.a.x + cp2.segment.b.x) / 2;
                const midY2 = (cp2.segment.a.y + cp2.segment.b.y) / 2;
                
                const distance = Math.sqrt((midX2 - midX1) ** 2 + (midY2 - midY1) ** 2);
                if (distance < 5) {
                    warnings.push(`Checkpoints ${i + 1} and ${i + 2} are very close together`);
                }
            }
        }
        
        // Validate track boundaries exist
        if (this.track.track.outer.length < 3) {
            issues.push('Track requires outer boundary with at least 3 points');
        }
        
        // Display results
        let statusMessage = 'Track Validation: ';
        if (issues.length === 0 && warnings.length === 0) {
            statusMessage += 'All checks passed! ✓';
        } else {
            statusMessage += `${issues.length} issues, ${warnings.length} warnings`;
        }
        
        this.updateStatus(statusMessage);
        
        if (issues.length > 0 || warnings.length > 0) {
            console.log('Track Validation Results:');
            issues.forEach(issue => console.log('❌ ISSUE:', issue));
            warnings.forEach(warning => console.log('⚠️ WARNING:', warning));
        }
        
        // Update validation in track data
        this.track.validation.errors = [...this.track.validation.errors.filter(e => !e.includes('validation')), ...issues];
        this.track.validation.warnings = [...this.track.validation.warnings.filter(w => !w.includes('validation')), ...warnings];
        this.updateValidationDisplay();
    }
};

// Initialize when DOM is ready
if (typeof window !== 'undefined') {
    window.TrackEditor = TrackEditor;
}