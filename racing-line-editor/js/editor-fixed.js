// vRacer Racing Line Editor - Main Application Controller (Fixed Version)

class RacingLineEditor {
    constructor() {
        // Wait for DOM to be ready and dependencies to load
        if (document.readyState !== 'complete') {
            document.addEventListener('DOMContentLoaded', () => this.init());
            return;
        }
        this.init();
    }

    init() {
        // Check dependencies
        if (!window.EditorUtils || !window.TrackRenderer) {
            console.error('Dependencies not loaded. Retrying...');
            setTimeout(() => this.init(), 100);
            return;
        }

        console.log('Initializing Racing Line Editor...');
        
        // Get utilities
        this.Vec = window.EditorUtils.Vec;
        this.DOMUtils = window.EditorUtils.DOMUtils;
        this.EventUtils = window.EditorUtils.EventUtils;
        this.CanvasUtils = window.EditorUtils.CanvasUtils;
        this.MathUtils = window.EditorUtils.MathUtils;

        // Get canvas
        this.canvas = document.getElementById('trackCanvas');
        if (!this.canvas) {
            console.error('Canvas element not found!');
            return;
        }

        // Initialize renderer
        this.renderer = new TrackRenderer(this.canvas);

        // Editor state
        this.editMode = 'select';
        this.selectedWaypoint = null;
        this.isDragging = false;
        this.isPanning = false;
        this.panStart = null;

        // Start initialization
        this.loadTrackDataAndStart();
    }

    async loadTrackDataAndStart() {
        try {
            console.log('Loading track data...');
            
            const response = await fetch('data/track-geometry.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Track data loaded:', data.metadata.name);
            
            this.renderer.loadTrackData(data);
            
            // Set up everything
            this.setupEventListeners();
            this.updateUI();
            this.startRenderLoop();
            
            console.log('Racing Line Editor initialized successfully!');
            
        } catch (error) {
            console.error('Failed to initialize:', error);
        }
    }

    setupEventListeners() {
        // Canvas events
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        this.canvas.addEventListener('mouseleave', () => this.handleMouseLeave());

        // UI controls
        const showGrid = document.getElementById('showGrid');
        if (showGrid) showGrid.addEventListener('change', (e) => this.renderer.setShowGrid(e.target.checked));
        
        const showRacingLine = document.getElementById('showRacingLine');
        if (showRacingLine) showRacingLine.addEventListener('change', (e) => this.renderer.setShowRacingLine(e.target.checked));
        
        const showWaypoints = document.getElementById('showWaypoints');
        if (showWaypoints) showWaypoints.addEventListener('change', (e) => this.renderer.setShowWaypoints(e.target.checked));
        
        const showTrackBounds = document.getElementById('showTrackBounds');
        if (showTrackBounds) showTrackBounds.addEventListener('change', (e) => this.renderer.setShowTrackBounds(e.target.checked));

        // Zoom slider
        const zoomSlider = document.getElementById('zoomSlider');
        if (zoomSlider) zoomSlider.addEventListener('input', (e) => {
            this.renderer.setScale(parseFloat(e.target.value));
            this.updateZoomDisplay();
        });

        // Buttons
        const resetViewBtn = document.getElementById('resetViewBtn');
        if (resetViewBtn) resetViewBtn.addEventListener('click', () => {
            this.renderer.resetView();
            this.updateZoomDisplay();
        });

        const fitTrackBtn = document.getElementById('fitTrackBtn');
        if (fitTrackBtn) fitTrackBtn.addEventListener('click', () => {
            this.renderer.fitTrack();
            this.updateZoomDisplay();
        });

        // Edit mode radios
        document.querySelectorAll('input[name="editMode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.setEditMode(e.target.value);
                }
            });
        });

        // Waypoint property inputs
        const posX = document.getElementById('posX');
        const posY = document.getElementById('posY');
        const targetSpeed = document.getElementById('targetSpeed');
        const brakeZone = document.getElementById('brakeZone');
        const cornerType = document.getElementById('cornerType');
        const safeZone = document.getElementById('safeZone');

        if (posX) posX.addEventListener('input', () => this.updateSelectedWaypointFromUI());
        if (posY) posY.addEventListener('input', () => this.updateSelectedWaypointFromUI());
        if (targetSpeed) {
            targetSpeed.addEventListener('input', (e) => {
                const speedValue = document.getElementById('speedValue');
                if (speedValue) speedValue.textContent = e.target.value;
                this.updateSelectedWaypointFromUI();
            });
        }
        if (brakeZone) brakeZone.addEventListener('change', () => this.updateSelectedWaypointFromUI());
        if (cornerType) cornerType.addEventListener('change', () => this.updateSelectedWaypointFromUI());
        if (safeZone) safeZone.addEventListener('change', () => this.updateSelectedWaypointFromUI());

        // Header buttons
        const copyCodeBtn = document.getElementById('copyCodeBtn');
        if (copyCodeBtn) copyCodeBtn.addEventListener('click', () => this.copyCodeToClipboard());
        
        const downloadCodeBtn = document.getElementById('downloadCodeBtn');
        if (downloadCodeBtn) downloadCodeBtn.addEventListener('click', () => this.downloadCode());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }

    handleMouseMove(e) {
        const canvasPos = this.CanvasUtils.getMousePos(this.canvas, e);
        const worldPos = this.renderer.canvasToWorld(canvasPos);
        
        // Update coordinate display
        const mouseCoords = document.getElementById('mouseCoords');
        if (mouseCoords) {
            mouseCoords.textContent = `${worldPos.x.toFixed(1)}, ${worldPos.y.toFixed(1)}`;
        }

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
            if (hoveredWaypoint !== null && this.editMode === 'select') {
                this.canvas.style.cursor = 'pointer';
            } else {
                this.canvas.style.cursor = this.getDefaultCursor();
            }
        }
    }

    handleMouseDown(e) {
        const canvasPos = this.CanvasUtils.getMousePos(this.canvas, e);
        const worldPos = this.renderer.canvasToWorld(canvasPos);
        
        if (e.button === 0) { // Left click
            const clickedWaypoint = this.renderer.hitTestWaypoint(canvasPos);
            
            switch (this.editMode) {
                case 'select':
                    if (clickedWaypoint !== null) {
                        this.selectWaypoint(clickedWaypoint);
                        if (!e.shiftKey) {
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
        } else if (e.button === 1) { // Middle click - pan
            this.startPanning(canvasPos);
            e.preventDefault();
        }
    }

    handleMouseUp(e) {
        if (e.button === 0 && this.isDragging) {
            this.stopDragging();
        } else if (e.button === 1 && this.isPanning) {
            this.stopPanning();
        }
    }

    handleWheel(e) {
        e.preventDefault();
        
        const canvasPos = this.CanvasUtils.getMousePos(this.canvas, e);
        const worldPos = this.renderer.canvasToWorld(canvasPos);
        
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const currentScale = this.renderer.viewport.scale;
        const newScale = currentScale * zoomFactor;
        
        this.renderer.setScale(newScale);
        
        // Zoom around mouse position
        const newWorldPos = this.renderer.canvasToWorld(canvasPos);
        const worldDelta = worldPos.sub(newWorldPos);
        this.renderer.pan(
            worldDelta.x * this.renderer.viewport.scale,
            worldDelta.y * this.renderer.viewport.scale
        );
        
        this.updateZoomDisplay();
    }

    handleMouseLeave() {
        this.renderer.setHoveredWaypoint(null);
        this.stopDragging();
        this.stopPanning();
    }

    handleKeyDown(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
        
        switch (e.code) {
            case 'KeyS': this.setEditMode('select'); break;
            case 'KeyA': this.setEditMode('add'); break;
            case 'KeyD': this.setEditMode('delete'); break;
            case 'KeyG': this.toggleGrid(); break;
            case 'KeyR': this.renderer.resetView(); this.updateZoomDisplay(); break;
            case 'Escape': this.selectWaypoint(null); this.setEditMode('select'); break;
        }
    }

    getDefaultCursor() {
        switch (this.editMode) {
            case 'select': return 'default';
            case 'add': return 'crosshair';
            case 'delete': return 'not-allowed';
            default: return 'default';
        }
    }

    startDragging() {
        if (this.selectedWaypoint !== null) {
            this.isDragging = true;
            this.canvas.style.cursor = 'move';
        }
    }

    stopDragging() {
        this.isDragging = false;
        this.canvas.style.cursor = this.getDefaultCursor();
    }

    startPanning(canvasPos) {
        this.isPanning = true;
        this.panStart = canvasPos.clone();
        this.canvas.style.cursor = 'move';
    }

    stopPanning() {
        this.isPanning = false;
        this.panStart = null;
        this.canvas.style.cursor = this.getDefaultCursor();
    }

    setEditMode(mode) {
        this.editMode = mode;
        const radio = document.querySelector(`input[name="editMode"][value="${mode}"]`);
        if (radio) radio.checked = true;
        this.canvas.style.cursor = this.getDefaultCursor();
    }

    toggleGrid() {
        const gridCheckbox = document.getElementById('showGrid');
        if (gridCheckbox) {
            gridCheckbox.checked = !gridCheckbox.checked;
            this.renderer.setShowGrid(gridCheckbox.checked);
        }
    }

    selectWaypoint(index) {
        this.selectedWaypoint = index;
        this.renderer.setSelectedWaypoint(index);
        this.updateWaypointEditor();
        this.updateSelectedInfo();
    }

    addWaypoint(worldPos, insertIndex = null) {
        const racingLine = this.renderer.getRacingLine();
        
        const newWaypoint = {
            pos: worldPos.clone(),
            targetSpeed: 3,
            brakeZone: false,
            cornerType: 'straight',
            safeZone: 'left',
            comment: 'New waypoint'
        };
        
        if (insertIndex !== null) {
            racingLine.splice(insertIndex + 1, 0, newWaypoint);
        } else {
            racingLine.push(newWaypoint);
        }
        
        this.renderer.setRacingLine(racingLine);
        this.selectWaypoint(insertIndex !== null ? insertIndex + 1 : racingLine.length - 1);
        this.updateStats();
        this.generateCode();
        
        console.log(`Added waypoint at (${worldPos.x.toFixed(1)}, ${worldPos.y.toFixed(1)})`);
    }

    deleteWaypoint(index) {
        const racingLine = this.renderer.getRacingLine();
        
        if (index >= 0 && index < racingLine.length) {
            racingLine.splice(index, 1);
            this.renderer.setRacingLine(racingLine);
            
            if (this.selectedWaypoint === index) {
                this.selectWaypoint(null);
            } else if (this.selectedWaypoint > index) {
                this.selectWaypoint(this.selectedWaypoint - 1);
            }
            
            this.updateStats();
            this.generateCode();
            console.log('Waypoint deleted');
        }
    }

    updateWaypointPosition(index, worldPos) {
        const racingLine = this.renderer.getRacingLine();
        
        if (index >= 0 && index < racingLine.length) {
            racingLine[index].pos = worldPos.clone();
            this.renderer.setRacingLine(racingLine);
            this.updateWaypointEditor();
            this.generateCode();
        }
    }

    updateSelectedWaypointFromUI() {
        if (this.selectedWaypoint === null) return;
        
        const racingLine = this.renderer.getRacingLine();
        const waypoint = racingLine[this.selectedWaypoint];
        
        if (waypoint) {
            const posX = parseFloat(document.getElementById('posX').value) || 0;
            const posY = parseFloat(document.getElementById('posY').value) || 0;
            const targetSpeed = parseInt(document.getElementById('targetSpeed').value) || 1;
            const brakeZone = document.getElementById('brakeZone').checked;
            const cornerType = document.getElementById('cornerType').value;
            const safeZone = document.getElementById('safeZone').value;
            
            waypoint.pos = new this.Vec(posX, posY);
            waypoint.targetSpeed = targetSpeed;
            waypoint.brakeZone = brakeZone;
            waypoint.cornerType = cornerType;
            waypoint.safeZone = safeZone;
            
            this.renderer.setRacingLine(racingLine);
            this.updateStats();
            this.generateCode();
        }
    }

    updateWaypointEditor() {
        const noSelection = document.getElementById('noSelection');
        const waypointEditor = document.getElementById('waypointEditor');
        
        if (this.selectedWaypoint === null) {
            if (noSelection) noSelection.style.display = 'block';
            if (waypointEditor) waypointEditor.style.display = 'none';
            return;
        }
        
        if (noSelection) noSelection.style.display = 'none';
        if (waypointEditor) waypointEditor.style.display = 'block';
        
        const racingLine = this.renderer.getRacingLine();
        const waypoint = racingLine[this.selectedWaypoint];
        
        if (waypoint) {
            const waypointIndex = document.getElementById('waypointIndex');
            const posX = document.getElementById('posX');
            const posY = document.getElementById('posY');
            const targetSpeed = document.getElementById('targetSpeed');
            const speedValue = document.getElementById('speedValue');
            const brakeZone = document.getElementById('brakeZone');
            const cornerType = document.getElementById('cornerType');
            const safeZone = document.getElementById('safeZone');
            
            if (waypointIndex) waypointIndex.textContent = this.selectedWaypoint.toString();
            if (posX) posX.value = waypoint.pos.x.toFixed(1);
            if (posY) posY.value = waypoint.pos.y.toFixed(1);
            if (targetSpeed) targetSpeed.value = waypoint.targetSpeed;
            if (speedValue) speedValue.textContent = waypoint.targetSpeed.toString();
            if (brakeZone) brakeZone.checked = waypoint.brakeZone;
            if (cornerType) cornerType.value = waypoint.cornerType;
            if (safeZone) safeZone.value = waypoint.safeZone;
        }
    }

    updateSelectedInfo() {
        const selectedInfo = document.getElementById('selectedInfo');
        if (selectedInfo) {
            const info = this.selectedWaypoint !== null ? 
                `Waypoint ${this.selectedWaypoint}` : 
                'None';
            selectedInfo.textContent = info;
        }
    }

    updateZoomDisplay() {
        const scale = this.renderer.viewport.scale;
        const percentage = Math.round(scale * 100);
        
        const zoomValue = document.getElementById('zoomValue');
        if (zoomValue) zoomValue.textContent = `${percentage}%`;
        
        const slider = document.getElementById('zoomSlider');
        if (slider) slider.value = scale.toString();
    }

    updateStats() {
        const racingLine = this.renderer.getRacingLine();
        
        const totalWaypoints = racingLine.length;
        const avgSpeed = totalWaypoints > 0 ? 
            (racingLine.reduce((sum, wp) => sum + wp.targetSpeed, 0) / totalWaypoints).toFixed(1) : 
            '0';
        const brakeZones = racingLine.filter(wp => wp.brakeZone).length;
        const corners = racingLine.filter(wp => wp.cornerType !== 'straight').length;
        
        const totalWaypointsEl = document.getElementById('totalWaypoints');
        const avgSpeedEl = document.getElementById('avgSpeed');
        const brakeZonesEl = document.getElementById('brakeZones');
        const cornerCountEl = document.getElementById('cornerCount');
        
        if (totalWaypointsEl) totalWaypointsEl.textContent = totalWaypoints.toString();
        if (avgSpeedEl) avgSpeedEl.textContent = avgSpeed;
        if (brakeZonesEl) brakeZonesEl.textContent = brakeZones.toString();
        if (cornerCountEl) cornerCountEl.textContent = corners.toString();
    }

    generateCode() {
        const racingLine = this.renderer.getRacingLine();
        const generatedCode = document.getElementById('generatedCode');
        
        if (!generatedCode) return;
        
        if (racingLine.length === 0) {
            generatedCode.innerHTML = '<code>// No waypoints defined</code>';
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
        
        generatedCode.innerHTML = `<code>${this.escapeHtml(code)}</code>`;
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    async copyCodeToClipboard() {
        const codeElement = document.getElementById('generatedCode');
        if (codeElement) {
            try {
                await navigator.clipboard.writeText(codeElement.textContent);
                console.log('Code copied to clipboard!');
            } catch (err) {
                console.error('Failed to copy code:', err);
            }
        }
    }

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
            
            console.log('Code downloaded as racing-line.ts');
        }
    }

    updateUI() {
        this.updateStats();
        this.updateZoomDisplay();
        this.generateCode();
        this.updateSelectedInfo();
    }

    startRenderLoop() {
        const renderFrame = () => {
            this.renderer.render();
            requestAnimationFrame(renderFrame);
        };
        renderFrame();
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.racingLineEditor = new RacingLineEditor();
});
