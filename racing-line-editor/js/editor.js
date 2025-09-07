// vRacer Racing Line Editor - Main Application Controller

class RacingLineEditor {
    constructor() {
        // Check if dependencies are loaded
        if (!window.EditorUtils || !window.TrackRenderer) {
            console.error('Dependencies not loaded yet. Retrying...');
            setTimeout(() => new RacingLineEditor(), 100);
            return;
        }
        
        // Import utilities
        const { Vec, DOMUtils, EventUtils, CanvasUtils, MathUtils } = window.EditorUtils;
        this.Vec = Vec;
        this.DOMUtils = DOMUtils;
        this.EventUtils = EventUtils;
        this.CanvasUtils = CanvasUtils;
        this.MathUtils = MathUtils;
        
        // Get canvas and initialize renderer
        this.canvas = document.getElementById('trackCanvas');
        if (!this.canvas) {
            console.error('Canvas element not found!');
            return;
        }
        
        this.renderer = new TrackRenderer(this.canvas);
        
        // Editor state
        this.editMode = 'select';
        this.selectedWaypoint = null;
        this.isDragging = false;
        this.dragStart = null;
        this.isPanning = false;
        this.panStart = null;
        
        // Initialize the application
        this.init();
    }

    async init() {
        try {
            // Load track data
            await this.loadTrackData();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Initialize UI
            this.updateUI();
            
            // Start render loop
            this.startRenderLoop();
            
            console.log('Racing Line Editor initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Racing Line Editor:', error);
            this.showStatus('Error loading track data', 'error');
        }
    }

    // Load track data from JSON file
    async loadTrackData() {
        try {
            const response = await fetch('data/track-geometry.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            this.renderer.loadTrackData(data);
            this.showStatus('Track data loaded successfully', 'success');
        } catch (error) {
            console.error('Error loading track data:', error);
            throw error;
        }
    }

    // Set up all event listeners
    setupEventListeners() {
        // Canvas mouse events
        this.setupCanvasEvents();
        
        // UI control events
        this.setupUIEvents();
        
        // Keyboard events
        this.setupKeyboardEvents();
    }

    // Set up canvas mouse and touch events
    setupCanvasEvents() {
        // Mouse move - handle hover and dragging
        this.EventUtils.addEventListener(this.canvas, 'mousemove', (e) => {
            const canvasPos = this.CanvasUtils.getMousePos(this.canvas, e);
            const worldPos = this.renderer.canvasToWorld(canvasPos);
            
            // Update coordinate display
            this.updateCoordinateDisplay(worldPos);
            
            if (this.isDragging && this.selectedWaypoint !== null) {
                // Drag waypoint
                this.updateWaypointPosition(this.selectedWaypoint, worldPos);
            } else if (this.isPanning) {
                // Pan viewport
                if (this.panStart) {
                    const deltaX = canvasPos.x - this.panStart.x;
                    const deltaY = canvasPos.y - this.panStart.y;
                    this.renderer.pan(deltaX, deltaY);
                    this.panStart = canvasPos.clone();
                }
            } else {
                // Handle hover
                const hoveredWaypoint = this.renderer.hitTestWaypoint(canvasPos);
                this.renderer.setHoveredWaypoint(hoveredWaypoint);
                
                // Update cursor
                this.updateCursor(hoveredWaypoint !== null);
            }
        });

        // Mouse down - start interaction
        EventUtils.addEventListener(this.canvas, 'mousedown', (e) => {
            const canvasPos = CanvasUtils.getMousePos(this.canvas, e);
            const worldPos = this.renderer.canvasToWorld(canvasPos);
            
            if (e.button === 0) { // Left click
                this.handleLeftClick(canvasPos, worldPos, e);
            } else if (e.button === 1) { // Middle click - pan
                this.startPanning(canvasPos);
                e.preventDefault();
            } else if (e.button === 2) { // Right click
                this.handleRightClick(canvasPos, worldPos, e);
            }
        });

        // Mouse up - end interaction
        EventUtils.addEventListener(this.canvas, 'mouseup', (e) => {
            if (e.button === 0 && this.isDragging) {
                this.stopDragging();
            } else if (e.button === 1 && this.isPanning) {
                this.stopPanning();
            }
        });

        // Mouse wheel - zoom
        EventUtils.addEventListener(this.canvas, 'wheel', (e) => {
            e.preventDefault();
            
            const canvasPos = CanvasUtils.getMousePos(this.canvas, e);
            const worldPos = this.renderer.canvasToWorld(canvasPos);
            
            // Zoom in/out
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            const currentScale = this.renderer.viewport.scale;
            const newScale = currentScale * zoomFactor;
            
            // Apply zoom
            this.renderer.setScale(newScale);
            
            // Adjust offset to zoom around mouse position
            const newWorldPos = this.renderer.canvasToWorld(canvasPos);
            const worldDelta = worldPos.sub(newWorldPos);
            this.renderer.pan(
                worldDelta.x * this.renderer.viewport.scale,
                worldDelta.y * this.renderer.viewport.scale
            );
            
            this.updateZoomDisplay();
        });

        // Context menu - prevent default
        EventUtils.addEventListener(this.canvas, 'contextmenu', (e) => {
            e.preventDefault();
        });

        // Mouse leave - clear hover state
        EventUtils.addEventListener(this.canvas, 'mouseleave', () => {
            this.renderer.setHoveredWaypoint(null);
            this.stopDragging();
            this.stopPanning();
        });
    }

    // Handle left mouse click
    handleLeftClick(canvasPos, worldPos, event) {
        const clickedWaypoint = this.renderer.hitTestWaypoint(canvasPos);
        
        switch (this.editMode) {
            case 'select':
                if (clickedWaypoint !== null) {
                    this.selectWaypoint(clickedWaypoint);
                    
                    // Start dragging if not holding Shift
                    if (!event.shiftKey) {
                        this.startDragging();
                    }
                } else {
                    this.selectWaypoint(null);
                }
                break;
                
            case 'add':
                this.addWaypoint(worldPos, clickedWaypoint);
                break;
                
            case 'delete':
                if (clickedWaypoint !== null) {
                    this.deleteWaypoint(clickedWaypoint);
                }
                break;
        }
    }

    // Handle right mouse click
    handleRightClick(canvasPos, worldPos, event) {
        const clickedWaypoint = this.renderer.hitTestWaypoint(canvasPos);
        
        if (clickedWaypoint !== null) {
            this.selectWaypoint(clickedWaypoint);
            // TODO: Show context menu
        }
    }

    // Start dragging operation
    startDragging() {
        if (this.selectedWaypoint !== null) {
            this.isDragging = true;
            this.canvas.style.cursor = 'move';
        }
    }

    // Stop dragging operation
    stopDragging() {
        this.isDragging = false;
        this.canvas.style.cursor = this.getDefaultCursor();
    }

    // Start panning operation
    startPanning(canvasPos) {
        this.isPanning = true;
        this.panStart = canvasPos.clone();
        this.canvas.style.cursor = 'move';
    }

    // Stop panning operation
    stopPanning() {
        this.isPanning = false;
        this.panStart = null;
        this.canvas.style.cursor = this.getDefaultCursor();
    }

    // Get default cursor for current edit mode
    getDefaultCursor() {
        switch (this.editMode) {
            case 'select': return 'default';
            case 'add': return 'crosshair';
            case 'delete': return 'not-allowed';
            default: return 'default';
        }
    }

    // Update cursor based on hover state
    updateCursor(isHovering) {
        if (this.isDragging || this.isPanning) return;
        
        if (isHovering && this.editMode === 'select') {
            this.canvas.style.cursor = 'pointer';
        } else {
            this.canvas.style.cursor = this.getDefaultCursor();
        }
    }

    // Set up UI control event listeners
    setupUIEvents() {
        // Track display toggles
        EventUtils.addEventListener('showGrid', 'change', (e) => {
            this.renderer.setShowGrid(e.target.checked);
        });
        
        EventUtils.addEventListener('showRacingLine', 'change', (e) => {
            this.renderer.setShowRacingLine(e.target.checked);
        });
        
        EventUtils.addEventListener('showWaypoints', 'change', (e) => {
            this.renderer.setShowWaypoints(e.target.checked);
        });
        
        EventUtils.addEventListener('showTrackBounds', 'change', (e) => {
            this.renderer.setShowTrackBounds(e.target.checked);
        });

        // Zoom slider
        EventUtils.addEventListener('zoomSlider', 'input', (e) => {
            const scale = parseFloat(e.target.value);
            this.renderer.setScale(scale);
            this.updateZoomDisplay();
        });

        // Viewport control buttons
        EventUtils.addEventListener('resetViewBtn', 'click', () => {
            this.renderer.resetView();
            this.updateZoomDisplay();
        });
        
        EventUtils.addEventListener('fitTrackBtn', 'click', () => {
            this.renderer.fitTrack();
            this.updateZoomDisplay();
        });

        // Edit mode radio buttons
        document.querySelectorAll('input[name=\"editMode\"]').forEach(radio => {
            EventUtils.addEventListener(radio, 'change', (e) => {
                if (e.target.checked) {
                    this.setEditMode(e.target.value);
                }
            });
        });

        // Waypoint property editors
        this.setupWaypointPropertyEvents();

        // Header buttons
        EventUtils.addEventListener('loadBtn', 'click', () => this.loadRacingLine());
        EventUtils.addEventListener('saveBtn', 'click', () => this.saveConfiguration());
        EventUtils.addEventListener('exportBtn', 'click', () => this.exportCode());
        EventUtils.addEventListener('copyCodeBtn', 'click', () => this.copyCodeToClipboard());
        EventUtils.addEventListener('downloadCodeBtn', 'click', () => this.downloadCode());
    }

    // Set up waypoint property editing events
    setupWaypointPropertyEvents() {
        // Position inputs
        EventUtils.addEventListener('posX', 'input', EventUtils.debounce(() => {
            this.updateSelectedWaypointFromUI();
        }, 300));
        
        EventUtils.addEventListener('posY', 'input', EventUtils.debounce(() => {
            this.updateSelectedWaypointFromUI();
        }, 300));

        // Target speed slider
        EventUtils.addEventListener('targetSpeed', 'input', (e) => {
            const speed = parseInt(e.target.value);
            DOMUtils.setText('speedValue', speed.toString());
            this.updateSelectedWaypointFromUI();
        });

        // Brake zone checkbox
        EventUtils.addEventListener('brakeZone', 'change', () => {
            this.updateSelectedWaypointFromUI();
        });

        // Corner type dropdown
        EventUtils.addEventListener('cornerType', 'change', () => {
            this.updateSelectedWaypointFromUI();
        });

        // Safe zone dropdown
        EventUtils.addEventListener('safeZone', 'change', () => {
            this.updateSelectedWaypointFromUI();
        });

        // Delete waypoint button
        EventUtils.addEventListener('deleteWaypoint', 'click', () => {
            if (this.selectedWaypoint !== null) {
                this.deleteWaypoint(this.selectedWaypoint);
            }
        });
    }

    // Set up keyboard event listeners
    setupKeyboardEvents() {
        EventUtils.addEventListener(document, 'keydown', (e) => {
            // Ignore if typing in input fields
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
            
            switch (e.code) {
                case 'KeyS': // Select mode
                    this.setEditMode('select');
                    break;
                case 'KeyA': // Add mode
                    this.setEditMode('add');
                    break;
                case 'KeyD': // Delete mode
                case 'Delete':
                    if (this.editMode !== 'delete') {
                        this.setEditMode('delete');
                    } else if (this.selectedWaypoint !== null) {
                        this.deleteWaypoint(this.selectedWaypoint);
                    }
                    break;
                case 'KeyG': // Toggle grid
                    const gridCheckbox = document.getElementById('showGrid');
                    gridCheckbox.checked = !gridCheckbox.checked;
                    this.renderer.setShowGrid(gridCheckbox.checked);
                    break;
                case 'KeyR': // Reset view
                    this.renderer.resetView();
                    this.updateZoomDisplay();
                    break;
                case 'Escape': // Cancel current operation
                    this.selectWaypoint(null);
                    this.setEditMode('select');
                    break;
            }
        });
    }

    // Set edit mode
    setEditMode(mode) {
        this.editMode = mode;
        
        // Update radio button
        const radio = document.querySelector(`input[name="editMode"][value="${mode}"]`);
        if (radio) radio.checked = true;
        
        // Update cursor
        this.canvas.style.cursor = this.getDefaultCursor();
        
        // Update canvas wrapper class for CSS styling
        this.canvas.parentElement.className = `canvas-wrapper mode-${mode}`;
    }

    // Select a waypoint
    selectWaypoint(index) {
        this.selectedWaypoint = index;
        this.renderer.setSelectedWaypoint(index);
        this.updateWaypointEditor();
        this.updateSelectedInfo();
    }

    // Add a new waypoint
    addWaypoint(worldPos, insertIndex = null) {
        const racingLine = this.renderer.getRacingLine();
        
        // Create new waypoint with default properties
        const newWaypoint = {
            pos: worldPos.clone(),
            targetSpeed: 3,
            brakeZone: false,
            cornerType: 'straight',
            safeZone: 'left',
            comment: 'New waypoint'
        };
        
        // Insert waypoint at appropriate position
        if (insertIndex !== null) {
            racingLine.splice(insertIndex + 1, 0, newWaypoint);
        } else {
            racingLine.push(newWaypoint);
        }
        
        // Update renderer and select new waypoint
        this.renderer.setRacingLine(racingLine);
        this.selectWaypoint(insertIndex !== null ? insertIndex + 1 : racingLine.length - 1);
        this.updateStats();
        this.generateCode();
        
        this.showStatus(`Added waypoint at (${worldPos.x.toFixed(1)}, ${worldPos.y.toFixed(1)})`, 'success');
    }

    // Delete a waypoint
    deleteWaypoint(index) {
        const racingLine = this.renderer.getRacingLine();
        
        if (index >= 0 && index < racingLine.length) {
            racingLine.splice(index, 1);
            this.renderer.setRacingLine(racingLine);
            
            // Adjust selection
            if (this.selectedWaypoint === index) {
                this.selectWaypoint(null);
            } else if (this.selectedWaypoint > index) {
                this.selectWaypoint(this.selectedWaypoint - 1);
            }
            
            this.updateStats();
            this.generateCode();
            this.showStatus('Waypoint deleted', 'success');
        }
    }

    // Update waypoint position
    updateWaypointPosition(index, worldPos) {
        const racingLine = this.renderer.getRacingLine();
        
        if (index >= 0 && index < racingLine.length) {
            racingLine[index].pos = worldPos.clone();
            this.renderer.setRacingLine(racingLine);
            this.updateWaypointEditor();
            this.generateCode();
        }
    }

    // Update selected waypoint from UI inputs
    updateSelectedWaypointFromUI() {
        if (this.selectedWaypoint === null) return;
        
        const racingLine = this.renderer.getRacingLine();
        const waypoint = racingLine[this.selectedWaypoint];
        
        if (waypoint) {
            // Get values from UI
            const posX = parseFloat(document.getElementById('posX').value) || 0;
            const posY = parseFloat(document.getElementById('posY').value) || 0;
            const targetSpeed = parseInt(document.getElementById('targetSpeed').value) || 1;
            const brakeZone = document.getElementById('brakeZone').checked;
            const cornerType = document.getElementById('cornerType').value;
            const safeZone = document.getElementById('safeZone').value;
            
            // Update waypoint
            waypoint.pos = new Vec(posX, posY);
            waypoint.targetSpeed = targetSpeed;
            waypoint.brakeZone = brakeZone;
            waypoint.cornerType = cornerType;
            waypoint.safeZone = safeZone;
            
            this.renderer.setRacingLine(racingLine);
            this.updateStats();
            this.generateCode();
        }
    }

    // Update waypoint editor panel
    updateWaypointEditor() {
        if (this.selectedWaypoint === null) {
            DOMUtils.hide('waypointEditor');
            DOMUtils.show('noSelection');
            return;
        }
        
        DOMUtils.show('waypointEditor');
        DOMUtils.hide('noSelection');
        
        const racingLine = this.renderer.getRacingLine();
        const waypoint = racingLine[this.selectedWaypoint];
        
        if (waypoint) {
            // Update form fields
            DOMUtils.setText('waypointIndex', this.selectedWaypoint.toString());
            document.getElementById('posX').value = waypoint.pos.x.toFixed(1);
            document.getElementById('posY').value = waypoint.pos.y.toFixed(1);
            document.getElementById('targetSpeed').value = waypoint.targetSpeed;
            document.getElementById('brakeZone').checked = waypoint.brakeZone;
            document.getElementById('cornerType').value = waypoint.cornerType;
            document.getElementById('safeZone').value = waypoint.safeZone;
            
            // Update speed display
            DOMUtils.setText('speedValue', waypoint.targetSpeed.toString());
        }
    }

    // Update coordinate display
    updateCoordinateDisplay(worldPos) {
        DOMUtils.setText('mouseCoords', `${worldPos.x.toFixed(1)}, ${worldPos.y.toFixed(1)}`);
    }

    // Update selected waypoint info
    updateSelectedInfo() {
        const info = this.selectedWaypoint !== null ? 
            `Waypoint ${this.selectedWaypoint}` : 
            'None';
        DOMUtils.setText('selectedInfo', info);
    }

    // Update zoom display
    updateZoomDisplay() {
        const scale = this.renderer.viewport.scale;
        const percentage = Math.round(scale * 100);
        DOMUtils.setText('zoomValue', `${percentage}%`);
        
        // Update zoom slider
        const slider = document.getElementById('zoomSlider');
        if (slider) {
            slider.value = scale.toString();
        }
    }

    // Update racing line statistics
    updateStats() {
        const racingLine = this.renderer.getRacingLine();
        
        if (racingLine.length === 0) {
            DOMUtils.setText('totalWaypoints', '0');
            DOMUtils.setText('avgSpeed', '0');
            DOMUtils.setText('brakeZones', '0');
            DOMUtils.setText('cornerCount', '0');
            return;
        }
        
        // Calculate statistics
        const totalWaypoints = racingLine.length;
        const totalSpeed = racingLine.reduce((sum, wp) => sum + wp.targetSpeed, 0);
        const avgSpeed = (totalSpeed / totalWaypoints).toFixed(1);
        const brakeZones = racingLine.filter(wp => wp.brakeZone).length;
        const corners = racingLine.filter(wp => wp.cornerType !== 'straight').length;
        
        // Update display
        DOMUtils.setText('totalWaypoints', totalWaypoints.toString());
        DOMUtils.setText('avgSpeed', avgSpeed);
        DOMUtils.setText('brakeZones', brakeZones.toString());
        DOMUtils.setText('cornerCount', corners.toString());
    }

    // Generate TypeScript code
    generateCode() {
        const racingLine = this.renderer.getRacingLine();
        
        if (racingLine.length === 0) {
            DOMUtils.setHTML('generatedCode', '<code>// No waypoints defined</code>');
            return;
        }
        
        let code = 'const optimalRacingLine: RacingLinePoint[] = [\n';
        
        racingLine.forEach((waypoint, index) => {
            const comment = waypoint.comment || `Waypoint ${index}`;
            code += `    // ${comment}\n`;
            code += `    { pos: { x: ${waypoint.pos.x}, y: ${waypoint.pos.y} }, `;
            code += `targetSpeed: ${waypoint.targetSpeed}, `;
            code += `brakeZone: ${waypoint.brakeZone}, `;
            code += `cornerType: '${waypoint.cornerType}', `;
            code += `safeZone: '${waypoint.safeZone}' }`;
            
            if (index < racingLine.length - 1) {
                code += ',';
            }
            code += '\n';
        });
        
        code += '];';
        
        DOMUtils.setHTML('generatedCode', `<code>${this.escapeHtml(code)}</code>`);
    }

    // Escape HTML for display
    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Show status message
    showStatus(message, type = 'info') {
        // TODO: Implement status message display
        console.log(`[${type.toUpperCase()}] ${message}`);
    }

    // Update UI elements
    updateUI() {
        this.updateStats();
        this.updateZoomDisplay();
        this.generateCode();
        this.updateCoordinateDisplay(new Vec(0, 0));
        this.updateSelectedInfo();
    }

    // Start render loop
    startRenderLoop() {
        const renderFrame = () => {
            this.renderer.render();
            requestAnimationFrame(renderFrame);
        };
        renderFrame();
    }

    // Load racing line from file
    loadRacingLine() {
        // TODO: Implement file loading
        this.showStatus('Load functionality not yet implemented', 'warning');
    }

    // Save configuration to file
    saveConfiguration() {
        // TODO: Implement file saving
        this.showStatus('Save functionality not yet implemented', 'warning');
    }

    // Export generated code
    exportCode() {
        // TODO: Implement code export
        this.showStatus('Export functionality not yet implemented', 'warning');
    }

    // Copy code to clipboard
    async copyCodeToClipboard() {
        const codeElement = document.getElementById('generatedCode');
        if (codeElement) {
            try {
                await navigator.clipboard.writeText(codeElement.textContent);
                this.showStatus('Code copied to clipboard!', 'success');
            } catch (err) {
                console.error('Failed to copy code:', err);
                this.showStatus('Failed to copy code to clipboard', 'error');
            }
        }
    }

    // Download code as file
    downloadCode() {
        const codeElement = document.getElementById('generatedCode');
        if (codeElement) {
            const code = codeElement.textContent;
            const blob = new Blob([code], { type: 'text/typescript' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'racing-line.ts';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showStatus('Code downloaded as racing-line.ts', 'success');
        }
    }
}

// Initialize the editor when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.racingLineEditor = new RacingLineEditor();
});
