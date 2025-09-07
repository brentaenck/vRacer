// vRacer Racing Line Editor - Utility Functions

// Vector operations (matching vRacer geometry.ts)
class Vec {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    // Create a copy of this vector
    clone() {
        return new Vec(this.x, this.y);
    }

    // Add another vector to this one
    add(other) {
        return new Vec(this.x + other.x, this.y + other.y);
    }

    // Subtract another vector from this one
    sub(other) {
        return new Vec(this.x - other.x, this.y - other.y);
    }

    // Scale this vector by a scalar
    scale(scalar) {
        return new Vec(this.x * scalar, this.y * scalar);
    }

    // Get the length (magnitude) of this vector
    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    // Get the squared length (avoids sqrt for performance)
    lengthSq() {
        return this.x * this.x + this.y * this.y;
    }

    // Normalize this vector (make unit length)
    normalize() {
        const len = this.length();
        if (len === 0) return new Vec(0, 0);
        return new Vec(this.x / len, this.y / len);
    }

    // Dot product with another vector
    dot(other) {
        return this.x * other.x + this.y * other.y;
    }

    // Distance to another vector
    distanceTo(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Squared distance to another vector (faster)
    distanceToSq(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return dx * dx + dy * dy;
    }

    // Convert to string for debugging
    toString() {
        return `Vec(${this.x.toFixed(2)}, ${this.y.toFixed(2)})`;
    }
}

// Segment class for line segments
class Segment {
    constructor(a, b) {
        this.a = a;
        this.b = b;
    }

    // Get the length of this segment
    length() {
        return this.a.distanceTo(this.b);
    }

    // Get the midpoint of this segment
    midpoint() {
        return new Vec(
            (this.a.x + this.b.x) / 2,
            (this.a.y + this.b.y) / 2
        );
    }

    // Get a point at parameter t along the segment (0 = start, 1 = end)
    pointAt(t) {
        return new Vec(
            this.a.x + t * (this.b.x - this.a.x),
            this.a.y + t * (this.b.y - this.a.y)
        );
    }

    // Convert to string for debugging
    toString() {
        return `Segment(${this.a.toString()} -> ${this.b.toString()})`;
    }
}

// Math utilities
const MathUtils = {
    // Clamp a value between min and max
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    },

    // Linear interpolation between a and b
    lerp(a, b, t) {
        return a + (b - a) * t;
    },

    // Map a value from one range to another
    mapRange(value, fromMin, fromMax, toMin, toMax) {
        const t = (value - fromMin) / (fromMax - fromMin);
        return toMin + t * (toMax - toMin);
    },

    // Check if a number is approximately equal to another
    approximately(a, b, epsilon = 1e-6) {
        return Math.abs(a - b) < epsilon;
    },

    // Convert degrees to radians
    toRadians(degrees) {
        return degrees * Math.PI / 180;
    },

    // Convert radians to degrees
    toDegrees(radians) {
        return radians * 180 / Math.PI;
    },

    // Round to specified decimal places
    round(value, decimals = 0) {
        const factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
    }
};

// Point-in-polygon test using ray casting algorithm
function pointInPolygon(point, polygon) {
    let x = point.x, y = point.y;
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        let xi = polygon[i].x, yi = polygon[i].y;
        let xj = polygon[j].x, yj = polygon[j].y;
        
        if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
            inside = !inside;
        }
    }
    
    return inside;
}

// Check if a point is inside the track (inside outer, outside inner)
function pointInTrack(point, outer, inner) {
    const inOuter = pointInPolygon(point, outer);
    const inInner = pointInPolygon(point, inner);
    return inOuter && !inInner;
}

// Color utilities
const ColorUtils = {
    // Get color by corner type
    getCornerTypeColor(cornerType) {
        switch (cornerType) {
            case 'straight': return '#2196F3'; // Blue
            case 'entry': return '#FF9800';    // Orange
            case 'apex': return '#F44336';     // Red
            case 'exit': return '#4CAF50';     // Green
            default: return '#9E9E9E';         // Gray
        }
    },

    // Get color by safe zone
    getSafeZoneColor(safeZone) {
        switch (safeZone) {
            case 'left': return '#9C27B0';     // Purple
            case 'right': return '#00BCD4';    // Cyan
            case 'top': return '#FF5722';      // Deep Orange
            case 'bottom': return '#8BC34A';   // Light Green
            default: return '#9E9E9E';         // Gray
        }
    },

    // Get speed color (green = fast, red = slow)
    getSpeedColor(speed, maxSpeed = 6) {
        const ratio = speed / maxSpeed;
        if (ratio > 0.8) return '#4CAF50';      // Green - Fast
        if (ratio > 0.6) return '#8BC34A';      // Light Green
        if (ratio > 0.4) return '#FFEB3B';      // Yellow
        if (ratio > 0.2) return '#FF9800';      // Orange
        return '#F44336';                        // Red - Slow
    },

    // Convert hex color to rgba
    hexToRgba(hex, alpha = 1) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
};

// Canvas utilities
const CanvasUtils = {
    // Get mouse position relative to canvas
    getMousePos(canvas, event) {
        const rect = canvas.getBoundingClientRect();
        return new Vec(
            event.clientX - rect.left,
            event.clientY - rect.top
        );
    },

    // Convert canvas coordinates to world coordinates
    canvasToWorld(canvasPos, viewport) {
        return new Vec(
            (canvasPos.x - viewport.offsetX) / viewport.scale,
            (canvasPos.y - viewport.offsetY) / viewport.scale
        );
    },

    // Convert world coordinates to canvas coordinates
    worldToCanvas(worldPos, viewport) {
        return new Vec(
            worldPos.x * viewport.scale + viewport.offsetX,
            worldPos.y * viewport.scale + viewport.offsetY
        );
    },

    // Check if a point is near another point (for hit testing)
    isPointNear(p1, p2, threshold = 10) {
        return p1.distanceTo(p2) <= threshold;
    },

    // Draw a circle
    drawCircle(ctx, center, radius, fillColor, strokeColor = null, lineWidth = 1) {
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);
        
        if (fillColor) {
            ctx.fillStyle = fillColor;
            ctx.fill();
        }
        
        if (strokeColor) {
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = lineWidth;
            ctx.stroke();
        }
    },

    // Draw a rectangle
    drawRect(ctx, pos, width, height, fillColor, strokeColor = null, lineWidth = 1) {
        if (fillColor) {
            ctx.fillStyle = fillColor;
            ctx.fillRect(pos.x, pos.y, width, height);
        }
        
        if (strokeColor) {
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = lineWidth;
            ctx.strokeRect(pos.x, pos.y, width, height);
        }
    },

    // Draw a line
    drawLine(ctx, start, end, color = '#000000', lineWidth = 1, lineDash = null) {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        
        if (lineDash) {
            ctx.setLineDash(lineDash);
        } else {
            ctx.setLineDash([]);
        }
        
        ctx.stroke();
    },

    // Draw a polygon
    drawPolygon(ctx, points, fillColor = null, strokeColor = '#000000', lineWidth = 1, closed = true) {
        if (points.length < 2) return;
        
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        
        if (closed) {
            ctx.closePath();
        }
        
        if (fillColor) {
            ctx.fillStyle = fillColor;
            ctx.fill();
        }
        
        if (strokeColor) {
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = lineWidth;
            ctx.stroke();
        }
    },

    // Draw text
    drawText(ctx, text, pos, color = '#000000', font = '12px Arial', align = 'left', baseline = 'top') {
        ctx.fillStyle = color;
        ctx.font = font;
        ctx.textAlign = align;
        ctx.textBaseline = baseline;
        ctx.fillText(text, pos.x, pos.y);
    },

    // Clear the entire canvas
    clear(ctx, canvas, color = '#FFFFFF') {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    },

    // Save and restore canvas state
    save(ctx) {
        ctx.save();
    },

    restore(ctx) {
        ctx.restore();
    }
};

// DOM utilities
const DOMUtils = {
    // Get element by ID with null check
    getElementById(id) {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`Element with ID '${id}' not found`);
        }
        return element;
    },

    // Set element text content
    setText(elementId, text) {
        const element = this.getElementById(elementId);
        if (element) {
            element.textContent = text;
        }
    },

    // Set element HTML content
    setHTML(elementId, html) {
        const element = this.getElementById(elementId);
        if (element) {
            element.innerHTML = html;
        }
    },

    // Show/hide element
    show(elementId, display = 'block') {
        const element = this.getElementById(elementId);
        if (element) {
            element.style.display = display;
        }
    },

    hide(elementId) {
        const element = this.getElementById(elementId);
        if (element) {
            element.style.display = 'none';
        }
    },

    // Add CSS class
    addClass(elementId, className) {
        const element = this.getElementById(elementId);
        if (element) {
            element.classList.add(className);
        }
    },

    // Remove CSS class
    removeClass(elementId, className) {
        const element = this.getElementById(elementId);
        if (element) {
            element.classList.remove(className);
        }
    },

    // Toggle CSS class
    toggleClass(elementId, className) {
        const element = this.getElementById(elementId);
        if (element) {
            element.classList.toggle(className);
        }
    }
};

// Event utilities
const EventUtils = {
    // Add event listener with optional cleanup
    addEventListener(element, event, handler, options = null) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        
        if (element) {
            element.addEventListener(event, handler, options);
            return () => element.removeEventListener(event, handler, options);
        }
        
        return () => {}; // No-op cleanup function
    },

    // Debounce function calls
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Throttle function calls
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }
};

// Export all utilities for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = {
        Vec,
        Segment,
        MathUtils,
        ColorUtils,
        CanvasUtils,
        DOMUtils,
        EventUtils,
        pointInPolygon,
        pointInTrack
    };
} else {
    // Browser environment - attach to window
    window.EditorUtils = {
        Vec,
        Segment,
        MathUtils,
        ColorUtils,
        CanvasUtils,
        DOMUtils,
        EventUtils,
        pointInPolygon,
        pointInTrack
    };
}
