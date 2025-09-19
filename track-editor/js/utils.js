/**
 * Utility Functions for Track Editor
 */

// Mathematical utilities
const MathUtils = {
    // Calculate distance between two points
    distance(p1, p2) {
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    },
    
    // Clamp value between min and max
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    },
    
    // Linear interpolation
    lerp(start, end, t) {
        return start + (end - start) * t;
    },
    
    // Degrees to radians
    degToRad(degrees) {
        return degrees * Math.PI / 180;
    },
    
    // Radians to degrees
    radToDeg(radians) {
        return radians * 180 / Math.PI;
    }
};

// DOM utilities
const DOMUtils = {
    // Get element by ID with error handling
    getElementById(id) {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`Element with ID '${id}' not found`);
        }
        return element;
    },
    
    // Add class to element
    addClass(element, className) {
        if (element && element.classList) {
            element.classList.add(className);
        }
    },
    
    // Remove class from element
    removeClass(element, className) {
        if (element && element.classList) {
            element.classList.remove(className);
        }
    },
    
    // Toggle class on element
    toggleClass(element, className) {
        if (element && element.classList) {
            element.classList.toggle(className);
        }
    }
};

// Event utilities
const EventUtils = {
    // Add event listener with error handling
    addEventListener(element, event, handler) {
        if (element && typeof handler === 'function') {
            element.addEventListener(event, handler);
        } else {
            console.warn('Invalid element or handler for event:', event);
        }
    },
    
    // Remove event listener
    removeEventListener(element, event, handler) {
        if (element && typeof handler === 'function') {
            element.removeEventListener(event, handler);
        }
    },
    
    // Prevent default and stop propagation
    preventDefault(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
    }
};

// Storage utilities
const StorageUtils = {
    // Save to localStorage
    save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
            return false;
        }
    },
    
    // Load from localStorage
    load(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Failed to load from localStorage:', error);
            return null;
        }
    },
    
    // Remove from localStorage
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Failed to remove from localStorage:', error);
            return false;
        }
    }
};

// File utilities
const FileUtils = {
    // Download data as file
    downloadAsFile(data, filename, type = 'application/json') {
        const blob = new Blob([data], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },
    
    // Read file as text
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    },
    
    // Create file input and trigger file selection
    selectFile(accept = '*/*') {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = accept;
            input.onchange = (e) => {
                const file = e.target.files[0];
                resolve(file);
            };
            input.click();
        });
    }
};

// Coordinate system utilities (vRacer uses 20 pixels per grid unit)
const CoordinateUtils = {
    // Grid size in pixels (matches vRacer game)
    GRID_SIZE: 20,
    
    // Convert grid units to pixels
    gridToPixels(gridValue) {
        if (typeof gridValue === 'number') {
            return gridValue * this.GRID_SIZE;
        } else if (gridValue && typeof gridValue === 'object') {
            if (gridValue.x !== undefined && gridValue.y !== undefined) {
                // Convert point object
                return {
                    x: gridValue.x * this.GRID_SIZE,
                    y: gridValue.y * this.GRID_SIZE
                };
            }
        }
        return gridValue;
    },
    
    // Convert pixels to grid units
    pixelsToGrid(pixelValue) {
        if (typeof pixelValue === 'number') {
            return pixelValue / this.GRID_SIZE;
        } else if (pixelValue && typeof pixelValue === 'object') {
            if (pixelValue.x !== undefined && pixelValue.y !== undefined) {
                // Convert point object
                return {
                    x: pixelValue.x / this.GRID_SIZE,
                    y: pixelValue.y / this.GRID_SIZE
                };
            }
        }
        return pixelValue;
    },
    
    // Convert array of points from grid to pixels
    gridArrayToPixels(gridPoints) {
        if (!Array.isArray(gridPoints)) return gridPoints;
        return gridPoints.map(point => this.gridToPixels(point));
    },
    
    // Convert array of points from pixels to grid
    pixelArrayToGrid(pixelPoints) {
        if (!Array.isArray(pixelPoints)) return pixelPoints;
        return pixelPoints.map(point => this.pixelsToGrid(point));
    },
    
    // Snap value to grid (in grid units)
    snapToGridUnits(value) {
        if (typeof value === 'number') {
            return Math.round(value);
        } else if (value && typeof value === 'object' && value.x !== undefined && value.y !== undefined) {
            return {
                x: Math.round(value.x),
                y: Math.round(value.y)
            };
        }
        return value;
    },
    
    // Convert screen coordinates to grid units (for mouse input)
    screenToGrid(screenPos, view) {
        // First convert screen to world pixels
        const worldPixels = {
            x: (screenPos.x - view.offsetX) / view.zoom,
            y: (screenPos.y - view.offsetY) / view.zoom
        };
        // Then convert to grid units
        return this.pixelsToGrid(worldPixels);
    },
    
    // Convert grid units to screen coordinates (for rendering)
    gridToScreen(gridPos, view) {
        // First convert grid to world pixels
        const worldPixels = this.gridToPixels(gridPos);
        // Then convert to screen coordinates
        return {
            x: worldPixels.x * view.zoom + view.offsetX,
            y: worldPixels.y * view.zoom + view.offsetY
        };
    }
};

// Export utilities to global scope
if (typeof window !== 'undefined') {
    window.MathUtils = MathUtils;
    window.DOMUtils = DOMUtils;
    window.EventUtils = EventUtils;
    window.StorageUtils = StorageUtils;
    window.FileUtils = FileUtils;
    window.CoordinateUtils = CoordinateUtils;
}
