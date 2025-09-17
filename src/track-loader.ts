/**
 * Track Loader System
 * 
 * Handles loading custom tracks into the main vRacer game.
 * Provides track conversion, validation, and game state updates.
 */

import { Vec, Segment } from './geometry';
import { isFeatureEnabled } from './features';
import { setCustomRacingLine, loadRacingLineFromJson, type RacingLinePoint } from './track-analysis';

// Track data format from track editor
interface TrackEditorData {
  metadata: {
    name: string;
    author?: string;
    description?: string;
    difficulty?: string;
    version?: string;
    created?: string;
  };
  track: {
    outer: Vec[];
    inner: Vec[];
    startLine?: {
      a: Vec;
      b: Vec;
    };
    checkpoints?: any[];
    walls?: Segment[];
  };
  racingLine?: {
    waypoints: any[];
    direction?: string;
  };
  validation?: {
    trackValid?: boolean;
    errors?: string[];
    warnings?: string[];
  };
}

// Game state compatible track format
interface GameTrackData {
  grid: number;
  outer: Vec[];
  inner: Vec[];
  walls: Segment[];
  start: Segment;
  metadata?: {
    name: string;
    author?: string;
    description?: string;
    difficulty?: string;
    isCustomTrack: boolean;
  };
}

/**
 * Track Loader Service
 */
export class TrackLoader {
  private static instance: TrackLoader;
  private currentCustomTrack: GameTrackData | null = null;
  private defaultTrack: GameTrackData | null = null;
  
  static getInstance(): TrackLoader {
    if (!TrackLoader.instance) {
      TrackLoader.instance = new TrackLoader();
    }
    return TrackLoader.instance;
  }
  
  private constructor() {
    // Initialize with current default track for fallback
    this.captureDefaultTrack();
  }
  
  /**
   * Capture the current default track for restore functionality
   */
  private captureDefaultTrack(): void {
    // Get the hardcoded default track from game.ts
    const grid = 20;
    const outer: Vec[] = [
      { x: 2, y: 2 }, { x: 48, y: 2 }, { x: 48, y: 33 }, { x: 2, y: 33 }
    ];
    const inner: Vec[] = [
      { x: 12, y: 10 }, { x: 38, y: 10 }, { x: 38, y: 25 }, { x: 12, y: 25 }
    ];
    
    // Generate walls
    const wallSegments = (poly: Vec[]) => poly.map((p, i) => ({ 
      a: p, 
      b: poly[(i + 1) % poly.length] || poly[0]! 
    }));
    const walls = [...wallSegments(outer), ...wallSegments(inner)];
    
    const start: Segment = { a: { x: 2, y: 18 }, b: { x: 12, y: 18 } };
    
    this.defaultTrack = {
      grid,
      outer,
      inner,
      walls,
      start,
      metadata: {
        name: 'Default vRacer Track',
        author: 'vRacer Team',
        description: 'Original rectangular racing track',
        difficulty: 'Medium',
        isCustomTrack: false
      }
    };
  }
  
  /**
   * Convert a single point from editor pixel coordinates to game grid coordinates
   */
  private convertPointToGrid(point: Vec, gridSize: number): Vec {
    return {
      x: Math.round((point.x / gridSize) * 10) / 10, // Convert pixels to grid units with 1 decimal precision
      y: Math.round((point.y / gridSize) * 10) / 10
    };
  }
  
  /**
   * Convert an array of points from editor pixel coordinates to game grid coordinates
   */
  private convertCoordinatesToGrid(points: Vec[], gridSize: number): Vec[] {
    return points.map(point => this.convertPointToGrid(point, gridSize));
  }
  
  /**
   * Convert racing line waypoints from editor pixel coordinates to game grid coordinates
   */
  private convertRacingLineToGrid(racingLineData: any, gridSize: number): RacingLinePoint[] | null {
    try {
      if (!racingLineData.waypoints || !Array.isArray(racingLineData.waypoints)) {
        return null;
      }
      
      const convertedWaypoints: RacingLinePoint[] = racingLineData.waypoints.map((waypoint: any, index: number) => {
        if (!waypoint.pos || typeof waypoint.pos.x !== 'number' || typeof waypoint.pos.y !== 'number') {
          throw new Error(`Invalid waypoint ${index}: missing or invalid position`);
        }
        
        return {
          pos: this.convertPointToGrid(waypoint.pos, gridSize),
          targetSpeed: waypoint.targetSpeed || 3,
          brakeZone: !!waypoint.brakeZone,
          cornerType: waypoint.cornerType || 'straight',
          safeZone: waypoint.safeZone || 'left'
        };
      });
      
      console.log('  ✅ Converted racing line waypoints (grid units):', convertedWaypoints.length);
      return convertedWaypoints;
      
    } catch (error) {
      console.error('❌ Failed to convert racing line:', error);
      return null;
    }
  }
  
  /**
   * Validate track editor data format
   */
  private validateTrackData(trackData: any): trackData is TrackEditorData {
    if (!trackData || typeof trackData !== 'object') {
      throw new Error('Invalid track data: not an object');
    }
    
    if (!trackData.metadata || typeof trackData.metadata !== 'object') {
      throw new Error('Invalid track data: missing metadata');
    }
    
    if (!trackData.track || typeof trackData.track !== 'object') {
      throw new Error('Invalid track data: missing track geometry');
    }
    
    if (!Array.isArray(trackData.track.outer) || trackData.track.outer.length < 3) {
      throw new Error('Invalid track data: outer boundary must have at least 3 points');
    }
    
    if (!Array.isArray(trackData.track.inner)) {
      throw new Error('Invalid track data: missing inner boundary array');
    }
    
    // Validate that points have x,y coordinates
    for (const point of trackData.track.outer) {
      if (typeof point.x !== 'number' || typeof point.y !== 'number') {
        throw new Error('Invalid track data: outer boundary points must have x,y coordinates');
      }
    }
    
    for (const point of trackData.track.inner) {
      if (typeof point.x !== 'number' || typeof point.y !== 'number') {
        throw new Error('Invalid track data: inner boundary points must have x,y coordinates');
      }
    }
    
    return true;
  }
  
  /**
   * Convert track editor data to game-compatible format
   */
  private convertToGameFormat(editorData: TrackEditorData): GameTrackData {
    // Use standard grid size
    const grid = 20;
    
    // Convert from editor pixel coordinates to game grid coordinates
    // Track editor uses pixel coordinates, game uses grid units (pixels / grid)
    console.log('🎯 Converting coordinates from editor to game format:');
    console.log('  📐 Original outer boundary (pixels):', editorData.track.outer);
    console.log('  📐 Original inner boundary (pixels):', editorData.track.inner);
    
    const outer = this.convertCoordinatesToGrid(editorData.track.outer, grid);
    const inner = this.convertCoordinatesToGrid(editorData.track.inner, grid);
    
    console.log('  ✅ Converted outer boundary (grid units):', outer);
    console.log('  ✅ Converted inner boundary (grid units):', inner);
    
    // Generate walls from track boundaries
    const wallSegments = (poly: Vec[]) => poly.map((p, i) => ({ 
      a: p, 
      b: poly[(i + 1) % poly.length] || poly[0]! 
    }));
    const walls = [...wallSegments(outer), ...wallSegments(inner)];
    
    // Use provided start line or generate a default one
    let start: Segment;
    if (editorData.track.startLine?.a && editorData.track.startLine?.b) {
      console.log('  🏁 Converting start line from pixels:', editorData.track.startLine);
      start = {
        a: this.convertPointToGrid(editorData.track.startLine.a, grid),
        b: this.convertPointToGrid(editorData.track.startLine.b, grid)
      };
      console.log('  ✅ Converted start line to grid units:', start);
    } else {
      // Generate start line on left side of track (default behavior)
      const minY = Math.min(...outer.map(p => p.y));
      const maxY = Math.max(...outer.map(p => p.y));
      const leftX = Math.min(...outer.map(p => p.x));
      const midY = (minY + maxY) / 2;
      
      start = {
        a: { x: leftX, y: midY },
        b: { x: leftX + 10, y: midY }
      };
      
      console.log('⚠️ No start line in track data, generated default start line:', start);
    }
    
    return {
      grid,
      outer,
      inner,
      walls,
      start,
      metadata: {
        name: editorData.metadata.name || 'Custom Track',
        author: editorData.metadata.author || 'Unknown',
        description: editorData.metadata.description || 'Imported custom track',
        difficulty: editorData.metadata.difficulty || 'Medium',
        isCustomTrack: true
      }
    };
  }
  
  /**
   * Load custom track from track editor data
   */
  loadCustomTrack(trackEditorData: any): GameTrackData {
    console.log('🏁 Loading custom track:', trackEditorData);
    
    // Validate the track data
    this.validateTrackData(trackEditorData);
    
    // Convert to game format
    const gameTrack = this.convertToGameFormat(trackEditorData);
    
    // Store as current custom track
    this.currentCustomTrack = gameTrack;
    
    // Process racing line data if present
    if (trackEditorData.racingLine?.waypoints && Array.isArray(trackEditorData.racingLine.waypoints)) {
      console.log('🏁 Processing racing line data from track...');
      console.log('  📐 Original racing line waypoints (pixels):', trackEditorData.racingLine.waypoints.length);
      
      // Convert racing line waypoints from pixels to grid coordinates (using game track's grid size)
      const convertedRacingLine = this.convertRacingLineToGrid(trackEditorData.racingLine, gameTrack.grid);
      
      if (convertedRacingLine) {
        // Set the converted racing line globally
        setCustomRacingLine(convertedRacingLine);
        console.log('✅ Custom racing line loaded:', convertedRacingLine.length, 'waypoints');
      } else {
        console.log('⚠️ Racing line conversion failed, using default racing line');
      }
    } else {
      console.log('📍 No racing line data in track file, using default racing line');
      // Clear any existing custom racing line
      setCustomRacingLine(null);
    }
    
    console.log('✅ Custom track loaded successfully:', gameTrack.metadata?.name);
    return gameTrack;
  }
  
  /**
   * Get current custom track (if any)
   */
  getCurrentCustomTrack(): GameTrackData | null {
    return this.currentCustomTrack;
  }
  
  /**
   * Check if a custom track is loaded
   */
  hasCustomTrack(): boolean {
    return this.currentCustomTrack !== null;
  }
  
  /**
   * Get track info for UI display
   */
  getCurrentTrackInfo(): { name: string; author?: string; isCustom: boolean } {
    if (this.currentCustomTrack?.metadata) {
      return {
        name: this.currentCustomTrack.metadata.name,
        author: this.currentCustomTrack.metadata.author,
        isCustom: true
      };
    } else if (this.defaultTrack?.metadata) {
      return {
        name: this.defaultTrack.metadata.name,
        author: this.defaultTrack.metadata.author,
        isCustom: false
      };
    } else {
      return {
        name: 'Default Track',
        isCustom: false
      };
    }
  }
  
  /**
   * Restore default track
   */
  restoreDefaultTrack(): GameTrackData | null {
    this.currentCustomTrack = null;
    // Clear any custom racing line when restoring default track
    setCustomRacingLine(null);
    console.log('🔄 Restored default track and cleared custom racing line');
    return this.defaultTrack;
  }
  
  /**
   * Clear custom track
   */
  clearCustomTrack(): void {
    this.currentCustomTrack = null;
    // Clear any custom racing line when clearing custom track
    setCustomRacingLine(null);
    console.log('🖑️ Custom track and racing line cleared');
  }
  
  /**
   * Export current track data (for editor)
   */
  exportCurrentTrack(): TrackEditorData | null {
    const trackData = this.currentCustomTrack || this.defaultTrack;
    if (!trackData) return null;
    
    return {
      metadata: {
        name: trackData.metadata?.name || 'Current Track',
        author: trackData.metadata?.author || 'vRacer Player',
        description: trackData.metadata?.description || 'Track exported from main game',
        difficulty: trackData.metadata?.difficulty || 'Medium',
        version: '1.0.0',
        created: new Date().toISOString()
      },
      track: {
        outer: [...trackData.outer],
        inner: [...trackData.inner],
        startLine: {
          a: { ...trackData.start.a },
          b: { ...trackData.start.b }
        },
        checkpoints: [],
        walls: [...trackData.walls]
      },
      racingLine: {
        waypoints: [],
        direction: 'counter-clockwise'
      },
      validation: {
        trackValid: true,
        errors: [],
        warnings: []
      }
    };
  }
}

// Global track loader instance
export const trackLoader = TrackLoader.getInstance();