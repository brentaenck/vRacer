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
  // REMOVED: animations - eliminated animation system for simplified gameplay
  graphPaperGrid: boolean;
  dualStyling: boolean;          // Modern UI with paper canvas aesthetic
  
  // Development and debugging
  debugMode: boolean;
  performanceMetrics: boolean;
  aiPlayers: boolean;
}

// Current feature flag configuration
export const FEATURES: FeatureFlags = {
  // Core game features - these are planned from README
  multiCarSupport: true,      // ✅ Multi-player racing support enabled
  carCollisions: true,        // ✅ Car-to-car collision detection enabled
  
  // Damage and physics - experimental features
  damageModel: false,         // Alternative game modes
  wallBounce: false,          // Instead of stopping on wall hit
  stopOnCrash: true,          // Current behavior (always on for now)
  
  // Track features - content creation tools
  trackEditor: true,          // 🚧 Track editor for custom track creation
  trackSaveLoad: false,       // Depends on trackEditor
  customTrackFormats: false,  // Advanced track features
  
  // UI and UX improvements - polish features
  improvedControls: true,     // Keyboard support, better mouse handling
  soundEffects: false,        // Audio feedback - DISABLED
  // REMOVED: animations flag - animation system eliminated
  graphPaperGrid: true,       // Enhanced grid with coordinate indicators
  dualStyling: true,          // Modern UI with paper canvas - ENABLED for better UX
  
  // Development and debugging
  debugMode: false,           // Show extra info for development (disabled by default)
  performanceMetrics: true,   // FPS counter, render time
  aiPlayers: true,            // Computer-controlled cars
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
