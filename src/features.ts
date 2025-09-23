/**
 * Feature Flags for vRacer
 * 
 * This file contains feature flags for trunk-based development.
 * Enable/disable features here to control what's active in the game.
 * 
 * PHASE 1 CLEANUP COMPLETE (2025-01-22) - v6.0.1:
 * - REMOVED: improvedControls (enhanced keyboard/mouse controls now core functionality)
 * - REMOVED: multiCarSupport (multi-player racing now core architecture) 
 * - REMOVED: stopOnCrash (crash behavior always enabled)
 * - REMOVED: soundEffects (audio system completely removed)
 * 
 * PHASE 2 CLEANUP COMPLETE (2025-01-22) - v6.0.2:
 * - REMOVED: graphPaperGrid (dead code - coordinate labels controlled by showGrid state)
 * - REMOVED: performanceMetrics (dead code - performance tracking controlled by debugMode)
 * - REMOVED: carCollisions (car collision system now always enabled - 3+ months stable)
 * 
 * Guidelines:
 * - Keep features disabled until they're ready for testing
 * - Use descriptive names and comments
 * - Remove flags once features are stable and always-on
 * - Current flags focus on active development and experimental features
 */

export interface FeatureFlags {
  // Active Development Features (ready but may need refinement)
  trackEditor: boolean;      // Visual track design interface
  dualStyling: boolean;      // Modern UI with paper canvas aesthetic
  aiPlayers: boolean;        // Computer-controlled racing opponents
  
  // Experimental Features (unstable, may change significantly)
  damageModel: boolean;      // Alternative car damage system
  wallBounce: boolean;       // Bounce physics instead of crash-stop
  trackSaveLoad: boolean;    // Save/load custom tracks to files
  customTrackFormats: boolean; // Advanced track file format support
  
  // Development Tools (for debugging and development)
  debugMode: boolean;        // Debug overlays and console logging
}

// Current feature flag configuration
export const FEATURES: FeatureFlags = {
  // Active Development Features (enabled and ready for use)
  trackEditor: true,          // ✅ Visual track design interface
  dualStyling: true,          // ✅ Modern UI with paper canvas aesthetic
  aiPlayers: true,            // ✅ Computer-controlled racing opponents
  
  // Experimental Features (disabled by default, may be unstable)
  damageModel: false,         // 🧪 Alternative car damage system
  wallBounce: false,          // 🧪 Bounce physics instead of crash-stop
  trackSaveLoad: false,       // 🧪 Save/load custom tracks to files
  customTrackFormats: false,  // 🧪 Advanced track file format support
  
  // Development Tools (debugging and development aids)
  debugMode: false,           // 🔧 Debug overlays and console logging (disabled by default)
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
