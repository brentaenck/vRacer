/**
 * Feature Flags for vRacer
 * 
 * This file contains feature flags for trunk-based development.
 * Enable/disable features here to control what's active in the game.
 * 
 * Phase 1 Cleanup Complete (2025-01-22):
 * - REMOVED: improvedControls (enhanced keyboard/mouse controls now core functionality)
 * - REMOVED: multiCarSupport (multi-player racing now core architecture) 
 * - REMOVED: stopOnCrash (crash behavior always enabled)
 * - REMOVED: soundEffects (audio system completely removed)
 * 
 * Guidelines:
 * - Keep features disabled until they're ready for testing
 * - Use descriptive names and comments
 * - Remove flags once features are stable and always-on
 */

export interface FeatureFlags {
  // Active Development Features
  carCollisions: boolean;
  trackEditor: boolean;
  graphPaperGrid: boolean;
  dualStyling: boolean;
  aiPlayers: boolean;
  performanceMetrics: boolean;
  
  // Experimental Features  
  damageModel: boolean;
  wallBounce: boolean;
  trackSaveLoad: boolean;
  customTrackFormats: boolean;
  
  // Development Tools
  debugMode: boolean;
}

// Current feature flag configuration
export const FEATURES: FeatureFlags = {
  // Active Development Features
  carCollisions: true,        // ✅ Car-to-car collision detection enabled
  trackEditor: true,          // ✅ Track editor for custom track creation
  graphPaperGrid: true,       // ✅ Enhanced grid with coordinate indicators
  dualStyling: true,          // ✅ Modern UI with paper canvas aesthetic
  aiPlayers: true,            // ✅ Computer-controlled cars
  performanceMetrics: true,   // ✅ FPS counter, render time tracking
  
  // Experimental Features
  damageModel: false,         // 🧪 Alternative damage system
  wallBounce: false,          // 🧪 Bounce instead of stopping on wall hit
  trackSaveLoad: false,       // 🧪 Save/load custom tracks (depends on trackEditor)
  customTrackFormats: false,  // 🧪 Advanced track file formats
  
  // Development Tools
  debugMode: false,           // 🔧 Show debug info (disabled by default)
};

// Runtime overrides for features that can be toggled dynamically
const RUNTIME_OVERRIDES: Partial<FeatureFlags> = {};

/**
 * Check if a feature is enabled
 * This function can be extended later for more complex logic
 * (environment-based flags, user preferences, etc.)
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  // Check runtime overrides first, then fall back to static config
  return RUNTIME_OVERRIDES[feature] ?? FEATURES[feature];
}

/**
 * Toggle a feature at runtime (for features that support dynamic toggling)
 */
export function toggleFeature(feature: keyof FeatureFlags): boolean {
  const currentState = isFeatureEnabled(feature);
  RUNTIME_OVERRIDES[feature] = !currentState;
  return !currentState;
}

/**
 * Set a feature state at runtime
 */
export function setFeatureEnabled(feature: keyof FeatureFlags, enabled: boolean): void {
  RUNTIME_OVERRIDES[feature] = enabled;
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
