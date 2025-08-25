/**
 * Feature Flags for vRacer
 * 
 * This file contains all feature flags for trunk-based development.
 * Enable/disable features here to control what's active in the game.
 * 
 * Guidelines:
 * - Keep features disabled until they're ready for testing
 * - Use descriptive names and comments
 * - Remove flags once features are stable and always-on
 */

export interface FeatureFlags {
  // Core game features
  multiCarSupport: boolean;
  carCollisions: boolean;
  
  // Damage and physics
  damageModel: boolean;
  wallBounce: boolean;
  stopOnCrash: boolean;
  
  // Track features
  trackEditor: boolean;
  trackSaveLoad: boolean;
  customTrackFormats: boolean;
  
  // UI and UX improvements
  improvedControls: boolean;
  soundEffects: boolean;
  animations: boolean;
  
  // Development and debugging
  debugMode: boolean;
  performanceMetrics: boolean;
  aiPlayers: boolean;
}

// Current feature flag configuration
export const FEATURES: FeatureFlags = {
  // Core game features - these are planned from README
  multiCarSupport: false,     // Next major feature to implement
  carCollisions: false,       // Depends on multiCarSupport
  
  // Damage and physics - experimental features
  damageModel: false,         // Alternative game modes
  wallBounce: false,          // Instead of stopping on wall hit
  stopOnCrash: true,          // Current behavior (always on for now)
  
  // Track features - content creation tools
  trackEditor: false,         // Major feature for later
  trackSaveLoad: false,       // Depends on trackEditor
  customTrackFormats: false,  // Advanced track features
  
  // UI and UX improvements - polish features
  improvedControls: false,    // Keyboard support, better mouse handling
  soundEffects: false,        // Audio feedback
  animations: false,          // Smooth movement, particle effects
  
  // Development and debugging - always useful
  debugMode: true,            // Show extra info for development
  performanceMetrics: false,  // FPS counter, render time
  aiPlayers: false,           // Computer-controlled cars
};

/**
 * Check if a feature is enabled
 * This function can be extended later for more complex logic
 * (environment-based flags, user preferences, etc.)
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return FEATURES[feature];
}

/**
 * Get all enabled features (useful for debugging)
 */
export function getEnabledFeatures(): string[] {
  return Object.entries(FEATURES)
    .filter(([_, enabled]) => enabled)
    .map(([feature, _]) => feature);
}

/**
 * Development helper: log all enabled features to console
 */
export function logEnabledFeatures(): void {
  if (FEATURES.debugMode) {
    console.log('🚩 Enabled features:', getEnabledFeatures().join(', '));
  }
}
