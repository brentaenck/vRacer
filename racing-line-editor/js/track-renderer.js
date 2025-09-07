// vRacer Racing Line Editor - Track Renderer Module

class TrackRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Rendering state
        this.trackData = null;
        this.racingLine = [];
        this.viewport = {
            scale: 1.0,
            offsetX: 0,
            offsetY: 0,
            canvasWidth: canvas.width,
            canvasHeight: canvas.height
        };
        
        // Display options
        this.showGrid = true;
        this.showRacingLine = true;
        this.showWaypoints = true;
        this.showTrackBounds = true;
        this.showStartLine = true;
        
        // Selection state
        this.selectedWaypoint = null;
        this.hoveredWaypoint = null;
        
        // Waypoint rendering configuration
        this.waypointRadius = 6;
        this.waypointHoverRadius = 8;
        this.waypointSelectedRadius = 10;
        
        // Initialize viewport to center the track
        this.initializeViewport();
    }

    // Initialize viewport to show the entire track centered
    initializeViewport() {
        if (!this.trackData) return;
        
        const bounds = this.trackData.track.bounds.track;
        const trackWidth = bounds.maxX - bounds.minX;
        const trackHeight = bounds.maxY - bounds.minY;
        
        // Calculate scale to fit track with padding
        const padding = 50; // pixels
        const scaleX = (this.canvas.width - padding * 2) / trackWidth;
        const scaleY = (this.canvas.height - padding * 2) / trackHeight;
        this.viewport.scale = Math.min(scaleX, scaleY, 3.0); // Max scale of 3x
        
        // Center the track
        const scaledTrackWidth = trackWidth * this.viewport.scale;
        const scaledTrackHeight = trackHeight * this.viewport.scale;
        this.viewport.offsetX = (this.canvas.width - scaledTrackWidth) / 2 - bounds.minX * this.viewport.scale;
        this.viewport.offsetY = (this.canvas.height - scaledTrackHeight) / 2 - bounds.minY * this.viewport.scale;
    }

    // Load track data from JSON
    loadTrackData(data) {
        this.trackData = data;
        
        // Convert JSON to Vec objects for easier manipulation
        const Vec = window.EditorUtils.Vec;
        this.trackData.track.outer = data.track.outer.map(p => new Vec(p.x, p.y));
        this.trackData.track.inner = data.track.inner.map(p => new Vec(p.x, p.y));
        this.trackData.track.startLine.a = new Vec(data.track.startLine.a.x, data.track.startLine.a.y);
        this.trackData.track.startLine.b = new Vec(data.track.startLine.b.x, data.track.startLine.b.y);
        
        // Load racing line waypoints
        this.racingLine = data.racingLine.waypoints.map(wp => ({
            pos: new Vec(wp.pos.x, wp.pos.y),
            targetSpeed: wp.targetSpeed,
            brakeZone: wp.brakeZone,
            cornerType: wp.cornerType,
            safeZone: wp.safeZone,
            comment: wp.comment || ''
        }));
        
        this.initializeViewport();
    }

    // Main render method
    render() {
        // Clear canvas
        CanvasUtils.clear(this.ctx, this.canvas, '#f8f9fa');
        
        if (!this.trackData) {
            this.renderNoData();
            return;
        }
        
        // Save context state
        CanvasUtils.save(this.ctx);
        
        // Render in order (back to front)
        if (this.showGrid) this.renderGrid();
        if (this.showTrackBounds) this.renderTrack();
        if (this.showStartLine) this.renderStartLine();
        if (this.showRacingLine) this.renderRacingLine();
        if (this.showWaypoints) this.renderWaypoints();
        
        // Restore context state
        CanvasUtils.restore(this.ctx);
    }

    // Render "no data" message
    renderNoData() {
        const center = new Vec(this.canvas.width / 2, this.canvas.height / 2);
        CanvasUtils.drawText(
            this.ctx,
            'Loading track data...',
            center,
            '#666666',
            '18px Arial',
            'center',
            'middle'
        );
    }

    // Render grid overlay
    renderGrid() {
        const gridSpacing = 1; // 1 grid unit
        const bounds = this.trackData.track.bounds.track;
        
        // Calculate visible grid range
        const minX = Math.floor(bounds.minX - 2);
        const maxX = Math.ceil(bounds.maxX + 2);
        const minY = Math.floor(bounds.minY - 2);
        const maxY = Math.ceil(bounds.maxY + 2);
        
        // Draw vertical lines
        for (let x = minX; x <= maxX; x += gridSpacing) {
            const startCanvas = CanvasUtils.worldToCanvas(new Vec(x, minY), this.viewport);
            const endCanvas = CanvasUtils.worldToCanvas(new Vec(x, maxY), this.viewport);
            
            const isMajor = x % 5 === 0;
            const color = isMajor ? '#d0d0d0' : '#e8e8e8';
            const lineWidth = isMajor ? 1 : 0.5;
            
            CanvasUtils.drawLine(this.ctx, startCanvas, endCanvas, color, lineWidth);
        }
        
        // Draw horizontal lines
        for (let y = minY; y <= maxY; y += gridSpacing) {
            const startCanvas = CanvasUtils.worldToCanvas(new Vec(minX, y), this.viewport);
            const endCanvas = CanvasUtils.worldToCanvas(new Vec(maxX, y), this.viewport);
            
            const isMajor = y % 5 === 0;
            const color = isMajor ? '#d0d0d0' : '#e8e8e8';
            const lineWidth = isMajor ? 1 : 0.5;
            
            CanvasUtils.drawLine(this.ctx, startCanvas, endCanvas, color, lineWidth);
        }
    }

    // Render track boundaries
    renderTrack() {
        const outer = this.trackData.track.outer;
        const inner = this.trackData.track.inner;
        
        // Convert to canvas coordinates
        const outerCanvas = outer.map(p => CanvasUtils.worldToCanvas(p, this.viewport));
        const innerCanvas = inner.map(p => CanvasUtils.worldToCanvas(p, this.viewport));
        
        // Draw track surface (area between outer and inner)
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'source-over';
        
        // Fill outer polygon
        CanvasUtils.drawPolygon(this.ctx, outerCanvas, '#4a5568', null, 2);
        
        // Cut out inner polygon (track hole)
        this.ctx.globalCompositeOperation = 'destination-out';
        CanvasUtils.drawPolygon(this.ctx, innerCanvas, '#ffffff', null, 2);
        
        this.ctx.restore();
        
        // Draw track boundaries
        CanvasUtils.drawPolygon(this.ctx, outerCanvas, null, '#2d3748', 3);
        CanvasUtils.drawPolygon(this.ctx, innerCanvas, null, '#2d3748', 3);
    }

    // Render start/finish line
    renderStartLine() {
        const startLine = this.trackData.track.startLine;
        const startCanvas = CanvasUtils.worldToCanvas(startLine.a, this.viewport);
        const endCanvas = CanvasUtils.worldToCanvas(startLine.b, this.viewport);
        
        // Draw checkered pattern for start/finish line
        this.renderCheckeredLine(startCanvas, endCanvas, 8);
        
        // Draw start/finish text
        const midpoint = startCanvas.add(endCanvas).scale(0.5);
        const textPos = midpoint.add(new Vec(-15, -15));
        CanvasUtils.drawText(
            this.ctx,
            'START/FINISH',
            textPos,
            '#2d3748',
            '12px Arial',
            'center',
            'middle'
        );
    }

    // Render checkered pattern for start/finish line
    renderCheckeredLine(start, end, squareSize) {
        const length = start.distanceTo(end);
        const numSquares = Math.ceil(length / squareSize);
        const direction = end.sub(start).normalize();
        const perpendicular = new Vec(-direction.y, direction.x).scale(squareSize / 2);
        
        this.ctx.save();
        
        for (let i = 0; i < numSquares; i++) {
            const t = i / numSquares;
            const nextT = (i + 1) / numSquares;
            const pos1 = start.add(end.sub(start).scale(t));
            const pos2 = start.add(end.sub(start).scale(nextT));
            
            const isBlack = i % 2 === 0;
            const color = isBlack ? '#000000' : '#ffffff';
            
            // Draw rectangle for each square
            const corners = [
                pos1.add(perpendicular),
                pos2.add(perpendicular),
                pos2.sub(perpendicular),
                pos1.sub(perpendicular)
            ];
            
            CanvasUtils.drawPolygon(this.ctx, corners, color, '#2d3748', 1);
        }
        
        this.ctx.restore();
    }

    // Render racing line
    renderRacingLine() {
        if (this.racingLine.length < 2) return;
        
        // Draw line segments connecting waypoints
        for (let i = 0; i < this.racingLine.length - 1; i++) {
            const current = this.racingLine[i];
            const next = this.racingLine[i + 1];
            
            const startCanvas = CanvasUtils.worldToCanvas(current.pos, this.viewport);
            const endCanvas = CanvasUtils.worldToCanvas(next.pos, this.viewport);
            
            // Color based on speed
            const avgSpeed = (current.targetSpeed + next.targetSpeed) / 2;
            const color = ColorUtils.getSpeedColor(avgSpeed);
            
            CanvasUtils.drawLine(this.ctx, startCanvas, endCanvas, color, 3);
        }
        
        // Connect last waypoint to first (complete the circuit)
        if (this.racingLine.length > 2) {
            const last = this.racingLine[this.racingLine.length - 1];
            const first = this.racingLine[0];
            
            const startCanvas = CanvasUtils.worldToCanvas(last.pos, this.viewport);
            const endCanvas = CanvasUtils.worldToCanvas(first.pos, this.viewport);
            
            const avgSpeed = (last.targetSpeed + first.targetSpeed) / 2;
            const color = ColorUtils.getSpeedColor(avgSpeed);
            
            CanvasUtils.drawLine(this.ctx, startCanvas, endCanvas, color, 3, [5, 5]);
        }
    }

    // Render waypoints
    renderWaypoints() {
        this.racingLine.forEach((waypoint, index) => {
            this.renderWaypoint(waypoint, index);
        });
    }

    // Render individual waypoint
    renderWaypoint(waypoint, index) {
        const canvasPos = CanvasUtils.worldToCanvas(waypoint.pos, this.viewport);
        
        // Determine waypoint appearance
        const isSelected = this.selectedWaypoint === index;
        const isHovered = this.hoveredWaypoint === index;
        
        let radius = this.waypointRadius;
        let strokeWidth = 2;
        
        if (isSelected) {
            radius = this.waypointSelectedRadius;
            strokeWidth = 3;
        } else if (isHovered) {
            radius = this.waypointHoverRadius;
            strokeWidth = 3;
        }
        
        // Get colors based on properties
        const fillColor = ColorUtils.getCornerTypeColor(waypoint.cornerType);
        const strokeColor = waypoint.brakeZone ? '#FF5722' : '#2d3748';
        
        // Draw waypoint shape based on corner type
        switch (waypoint.cornerType) {
            case 'straight':
                CanvasUtils.drawCircle(this.ctx, canvasPos, radius, fillColor, strokeColor, strokeWidth);
                break;
            case 'entry':
                this.drawTriangle(canvasPos, radius, fillColor, strokeColor, strokeWidth);
                break;
            case 'apex':
                this.drawDiamond(canvasPos, radius, fillColor, strokeColor, strokeWidth);
                break;
            case 'exit':
                this.drawSquare(canvasPos, radius, fillColor, strokeColor, strokeWidth);
                break;
        }
        
        // Draw speed indicator
        if (isSelected || isHovered) {
            const speedColor = ColorUtils.getSpeedColor(waypoint.targetSpeed);
            CanvasUtils.drawText(
                this.ctx,
                waypoint.targetSpeed.toString(),
                canvasPos.add(new Vec(0, -radius - 15)),
                speedColor,
                'bold 12px Arial',
                'center',
                'middle'
            );
        }
        
        // Draw index number
        if (isSelected || isHovered) {
            CanvasUtils.drawText(
                this.ctx,
                index.toString(),
                canvasPos.add(new Vec(0, radius + 15)),
                '#2d3748',
                '10px Arial',
                'center',
                'middle'
            );
        }
    }

    // Draw triangle shape for corner entry waypoints
    drawTriangle(center, radius, fillColor, strokeColor, strokeWidth) {
        const height = radius * 1.5;
        const width = radius * 1.3;
        
        const points = [
            center.add(new Vec(0, -height * 0.6)),           // Top
            center.add(new Vec(-width * 0.5, height * 0.4)), // Bottom left
            center.add(new Vec(width * 0.5, height * 0.4))   // Bottom right
        ];
        
        CanvasUtils.drawPolygon(this.ctx, points, fillColor, strokeColor, strokeWidth);
    }

    // Draw diamond shape for apex waypoints
    drawDiamond(center, radius, fillColor, strokeColor, strokeWidth) {
        const size = radius * 1.2;
        
        const points = [
            center.add(new Vec(0, -size)),      // Top
            center.add(new Vec(size, 0)),       // Right
            center.add(new Vec(0, size)),       // Bottom
            center.add(new Vec(-size, 0))       // Left
        ];
        
        CanvasUtils.drawPolygon(this.ctx, points, fillColor, strokeColor, strokeWidth);
    }

    // Draw square shape for corner exit waypoints
    drawSquare(center, radius, fillColor, strokeColor, strokeWidth) {
        const size = radius * 1.1;
        const halfSize = size * 0.5;
        
        const pos = center.sub(new Vec(halfSize, halfSize));
        CanvasUtils.drawRect(this.ctx, pos, size, size, fillColor, strokeColor, strokeWidth);
    }

    // Hit test for waypoints
    hitTestWaypoint(canvasPos) {
        const threshold = this.waypointHoverRadius + 2;
        
        for (let i = 0; i < this.racingLine.length; i++) {
            const waypoint = this.racingLine[i];
            const waypointCanvas = CanvasUtils.worldToCanvas(waypoint.pos, this.viewport);
            
            if (CanvasUtils.isPointNear(canvasPos, waypointCanvas, threshold)) {
                return i;
            }
        }
        
        return null;
    }

    // Convert canvas coordinates to world coordinates
    canvasToWorld(canvasPos) {
        return CanvasUtils.canvasToWorld(canvasPos, this.viewport);
    }

    // Convert world coordinates to canvas coordinates
    worldToCanvas(worldPos) {
        return CanvasUtils.worldToCanvas(worldPos, this.viewport);
    }

    // Set viewport scale (zoom)
    setScale(scale) {
        this.viewport.scale = MathUtils.clamp(scale, 0.2, 5.0);
    }

    // Pan the viewport
    pan(deltaX, deltaY) {
        this.viewport.offsetX += deltaX;
        this.viewport.offsetY += deltaY;
    }

    // Reset viewport to show entire track
    resetView() {
        this.initializeViewport();
    }

    // Fit track to canvas
    fitTrack() {
        this.initializeViewport();
    }

    // Update display options
    setShowGrid(show) { this.showGrid = show; }
    setShowRacingLine(show) { this.showRacingLine = show; }
    setShowWaypoints(show) { this.showWaypoints = show; }
    setShowTrackBounds(show) { this.showTrackBounds = show; }
    setShowStartLine(show) { this.showStartLine = show; }
    
    // Update selection state
    setSelectedWaypoint(index) { this.selectedWaypoint = index; }
    setHoveredWaypoint(index) { this.hoveredWaypoint = index; }
    
    // Get current racing line
    getRacingLine() { return this.racingLine; }
    
    // Update racing line
    setRacingLine(racingLine) { this.racingLine = racingLine; }
    
    // Get track data
    getTrackData() { return this.trackData; }
    
    // Get viewport state
    getViewport() { return { ...this.viewport }; }
}

// Export for use in other modules
window.TrackRenderer = TrackRenderer;
