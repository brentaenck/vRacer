/**
 * Track Editor Module
 * 
 * Data structures, interfaces, and utilities for the visual track editor.
 * Enables users to create custom racing tracks with validation and testing.
 */

import { Vec, Segment } from './geometry';

// =============================================================================
// EDITOR MODES AND TOOLS
// =============================================================================

export enum EditorMode {
  DRAW = 'draw',           // Drawing track boundaries
  EDIT = 'edit',           // Editing existing track points  
  TEST = 'test',           // Testing the track with a car
  VALIDATE = 'validate'    // Running validation checks
}

export enum EditorTool {
  PEN = 'pen',             // Draw track boundaries
  ERASER = 'eraser',       // Remove track segments
  MOVE = 'move',           // Move control points
  START_FINISH = 'start_finish'  // Place start/finish line
}

// =============================================================================
// TRACK DATA STRUCTURES
// =============================================================================

export interface TrackMetadata {
  id: string;
  name: string;
  author: string;
  description?: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  createdAt: Date;
  modifiedAt: Date;
  version: string;
  tags?: string[];
}

export interface TrackGeometry {
  outer: Vec[];            // Track outer boundary polygon
  inner: Vec[];            // Track inner boundary polygon (hole)
  walls: Segment[];        // Wall segments for collision detection
  start: Segment;          // Start/finish line segment
  startPosition: Vec;      // Starting position for cars
  checkpoints?: Vec[];     // Optional intermediate checkpoints
  width: number;           // Average track width
  length: number;          // Track perimeter length
}

export interface TrackValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metrics: {
    minWidth: number;
    maxWidth: number;
    avgWidth: number;
    totalLength: number;
    complexity: number;     // 0-100 complexity score
  };
}

export interface CustomTrack {
  metadata: TrackMetadata;
  geometry: TrackGeometry;
  validation: TrackValidation;
  thumbnail?: string;      // Base64 encoded preview image
}

// =============================================================================
// EDITOR STATE MANAGEMENT
// =============================================================================

export interface EditorState {
  mode: EditorMode;
  tool: EditorTool;
  isActive: boolean;
  isDirty: boolean;        // Has unsaved changes
  
  // Current track being edited
  track: Partial<CustomTrack>;
  
  // Drawing state
  isDrawing: boolean;
  currentPath: Vec[];
  snapToGrid: boolean;
  gridSize: number;
  
  // Selection and interaction
  selectedPoints: number[];
  hoveredPoint?: number;
  dragStartPos?: Vec;
  
  // UI state
  showGrid: boolean;
  showValidation: boolean;
  showPreview: boolean;
  zoomLevel: number;
  panOffset: Vec;
}

// =============================================================================
// TRACK GENERATION AND VALIDATION
// =============================================================================

export interface TrackValidationRule {
  name: string;
  check: (track: TrackGeometry) => { passed: boolean; message?: string };
  severity: 'error' | 'warning';
}

export const TRACK_VALIDATION_RULES: TrackValidationRule[] = [
  {
    name: 'Minimum Width',
    severity: 'error',
    check: (track) => {
      const minWidth = Math.min(...calculateTrackWidths(track));
      return {
        passed: minWidth >= 40, // Minimum 2 grid units wide
        message: minWidth < 40 ? `Track too narrow: ${minWidth}px (minimum 40px)` : undefined
      };
    }
  },
  {
    name: 'Closed Loop',
    severity: 'error', 
    check: (track) => {
      const isClosedOuter = isPolygonClosed(track.outer);
      const isClosedInner = isPolygonClosed(track.inner);
      return {
        passed: isClosedOuter && isClosedInner,
        message: !isClosedOuter || !isClosedInner ? 'Track boundaries must form closed loops' : undefined
      };
    }
  },
  {
    name: 'Start/Finish Placement',
    severity: 'error',
    check: (track) => {
      const lineIntersectsTrack = segmentIntersectsTrackBoundary(track.start, track);
      return {
        passed: lineIntersectsTrack,
        message: !lineIntersectsTrack ? 'Start/finish line must cross the track' : undefined
      };
    }
  },
  {
    name: 'Complexity Warning',
    severity: 'warning',
    check: (track) => {
      const complexity = calculateTrackComplexity(track);
      return {
        passed: complexity <= 80,
        message: complexity > 80 ? 'Very complex track may impact performance' : undefined
      };
    }
  }
];

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function createDefaultTrack(): Partial<CustomTrack> {
  return {
    metadata: {
      id: generateTrackId(),
      name: 'New Track',
      author: 'Anonymous',
      difficulty: 'Medium',
      createdAt: new Date(),
      modifiedAt: new Date(),
      version: '1.0.0'
    },
    geometry: {
      outer: [],
      inner: [],
      walls: [],
      start: { a: { x: 0, y: 0 }, b: { x: 0, y: 0 } },
      startPosition: { x: 0, y: 0 },
      width: 0,
      length: 0
    },
    validation: {
      isValid: false,
      errors: ['Track not yet created'],
      warnings: [],
      metrics: {
        minWidth: 0,
        maxWidth: 0,
        avgWidth: 0,
        totalLength: 0,
        complexity: 0
      }
    }
  };
}

export function generateTrackId(): string {
  return `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function isPolygonClosed(points: Vec[], tolerance: number = 5): boolean {
  if (points.length < 3) return false;
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return false;
  const distance = Math.sqrt((last.x - first.x) ** 2 + (last.y - first.y) ** 2);
  return distance <= tolerance;
}

export function calculateTrackWidths(track: TrackGeometry): number[] {
  // Calculate width at multiple points along the track
  // This is a simplified implementation - real algorithm would be more sophisticated
  const samplePoints = 20;
  const widths: number[] = [];
  
  for (let i = 0; i < samplePoints; i++) {
    // Sample points along outer boundary
    const t = i / (samplePoints - 1);
    const outerIdx = Math.floor(t * (track.outer.length - 1));
    const innerIdx = Math.floor(t * (track.inner.length - 1));
    
    if (outerIdx < track.outer.length && innerIdx < track.inner.length) {
      const outerPoint = track.outer[outerIdx];
      const innerPoint = track.inner[innerIdx];
      if (outerPoint && innerPoint) {
        const width = Math.sqrt(
          (outerPoint.x - innerPoint.x) ** 2 + (outerPoint.y - innerPoint.y) ** 2
        );
        widths.push(width);
      }
    }
  }
  
  return widths.length > 0 ? widths : [0];
}

export function segmentIntersectsTrackBoundary(segment: Segment, track: TrackGeometry): boolean {
  // Check if segment intersects with track boundaries
  // This would use the existing intersection detection from geometry.ts
  return true; // Placeholder - implement with actual intersection logic
}

export function calculateTrackComplexity(track: TrackGeometry): number {
  // Calculate complexity based on number of points, sharp turns, etc.
  const pointCount = track.outer.length + track.inner.length;
  const baseComplexity = Math.min(pointCount / 20 * 50, 50); // 0-50 based on point count
  
  // Add complexity for sharp turns (simplified calculation)
  const turnComplexity = Math.min(calculateSharpTurns(track.outer) * 10, 30);
  
  return Math.min(baseComplexity + turnComplexity, 100);
}

function calculateSharpTurns(points: Vec[]): number {
  // Count sharp turns in the polygon (simplified)
  let sharpTurns = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];
    
    if (!prev || !curr || !next) continue;
    
    // Calculate angle between vectors
    const v1 = { x: curr.x - prev.x, y: curr.y - prev.y };
    const v2 = { x: next.x - curr.x, y: next.y - curr.y };
    
    const angle = Math.abs(Math.atan2(v1.y, v1.x) - Math.atan2(v2.y, v2.x));
    
    // Sharp turn if angle > 60 degrees
    if (angle > Math.PI / 3) {
      sharpTurns++;
    }
  }
  return sharpTurns;
}

// =============================================================================
// EXPORT/IMPORT FUNCTIONALITY
// =============================================================================

export function serializeTrack(track: CustomTrack): string {
  return JSON.stringify(track, null, 2);
}

export function deserializeTrack(data: string): CustomTrack | null {
  try {
    const parsed = JSON.parse(data);
    // Add validation to ensure it's a valid track
    if (parsed.metadata && parsed.geometry) {
      return parsed as CustomTrack;
    }
    return null;
  } catch (error) {
    console.error('Failed to deserialize track:', error);
    return null;
  }
}

export function validateTrack(track: TrackGeometry): TrackValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Run all validation rules
  for (const rule of TRACK_VALIDATION_RULES) {
    const result = rule.check(track);
    if (!result.passed && result.message) {
      if (rule.severity === 'error') {
        errors.push(result.message);
      } else {
        warnings.push(result.message);
      }
    }
  }
  
  // Calculate metrics
  const widths = calculateTrackWidths(track);
  const metrics = {
    minWidth: Math.min(...widths),
    maxWidth: Math.max(...widths),
    avgWidth: widths.reduce((a, b) => a + b, 0) / widths.length,
    totalLength: calculateTrackLength(track),
    complexity: calculateTrackComplexity(track)
  };
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    metrics
  };
}

function calculateTrackLength(track: TrackGeometry): number {
  // Calculate the total length of the track centerline
  // This is a simplified calculation - could be more sophisticated
  let length = 0;
  const points = track.outer;
  
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    if (p1 && p2) {
      length += Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
    }
  }
  
  return length;
}
