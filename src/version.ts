/**
 * Application version management
 * 
 * This module provides access to the application version that is automatically
 * injected from package.json at build time by Vite.
 */

// Vite injects this at build time from package.json
declare const __APP_VERSION__: string;

/**
 * Current application version from package.json
 * Automatically updated during build process
 */
export const APP_VERSION = __APP_VERSION__;

/**
 * Get version string formatted for display
 * @returns Version string with 'v' prefix
 */
export function getVersionString(): string {
  return `v${APP_VERSION}`;
}

/**
 * Get version info for debugging/logging
 */
export function getVersionInfo() {
  return {
    version: APP_VERSION,
    versionString: getVersionString(),
    buildTime: new Date().toISOString()
  };
}