/**
 * Standalone Track Editor Integration
 * 
 * This module integrates the complete standalone track editor into the main vRacer UI.
 * It replaces the basic TypeScript track editor with the full-featured version.
 */

import { isFeatureEnabled } from '../features';
import { trackLoader } from '../track-loader';
import { createDefaultGame } from '../game';
import { updateTrackInfoDisplay } from '../dropdown-menu';

/**
 * Initialize the standalone track editor integration
 */
export function initializeStandaloneTrackEditor(): void {
  if (!isFeatureEnabled('trackEditor')) {
    console.log('🚫 Track editor feature is disabled');
    return;
  }

  console.log('🎯 Initializing Standalone Track Editor Integration...');
  
  // Set up track editor modal/panel integration
  setupTrackEditorModal();
  setupTrackEditorToggle();
  
  console.log('✅ Standalone Track Editor Integration initialized');
}

/**
 * Set up the track editor modal with embedded standalone editor
 */
function setupTrackEditorModal(): void {
  // Create the track editor modal container
  const editorModal = createTrackEditorModal();
  document.body.appendChild(editorModal);
  
  console.log('🏗️ Track editor modal created');
}

/**
 * Create the track editor modal with embedded standalone editor
 */
function createTrackEditorModal(): HTMLElement {
  const modal = document.createElement('div');
  modal.id = 'trackEditorModal';
  modal.className = 'track-editor-modal';
  modal.style.display = 'none';
  
  modal.innerHTML = `
    <div class="track-editor-modal-content">
      <div class="track-editor-modal-header">
        <h2>🏁 vRacer Track Editor</h2>
        <button id="closeTrackEditorModal" class="close-btn" aria-label="Close Track Editor">
          <span>&times;</span>
        </button>
      </div>
      
      <div class="track-editor-container">
        <iframe 
          id="trackEditorFrame" 
          src="track-editor/index.html" 
          frameborder="0"
          width="100%"
          height="100%"
          allow="fullscreen"
        ></iframe>
      </div>
      
      <div class="track-editor-modal-footer">
        <button id="importTrackToGame" class="btn btn-primary">
          📥 Import Track to Game
        </button>
        <button id="exportGameTrack" class="btn btn-secondary">
          📤 Export Current Game Track
        </button>
        <button id="closeTrackEditor" class="btn btn-secondary">
          Close Editor
        </button>
      </div>
    </div>
  `;
  
  // Wire up modal event listeners
  wireModalEvents(modal);
  
  return modal;
}

/**
 * Wire up track editor modal event listeners
 */
function wireModalEvents(modal: HTMLElement): void {
  // Close modal events
  const closeBtn = modal.querySelector('#closeTrackEditorModal');
  const closeTrackEditor = modal.querySelector('#closeTrackEditor');
  
  [closeBtn, closeTrackEditor].forEach(btn => {
    btn?.addEventListener('click', () => {
      hideTrackEditor();
    });
  });
  
  // Track import/export events  
  const importBtn = modal.querySelector('#importTrackToGame');
  const exportBtn = modal.querySelector('#exportGameTrack');
  
  importBtn?.addEventListener('click', importTrackToGame);
  exportBtn?.addEventListener('click', exportGameTrack);
  
  // Close on outside click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      hideTrackEditor();
    }
  });
  
  // Close on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.style.display !== 'none') {
      hideTrackEditor();
    }
  });
}

/**
 * Set up track editor toggle in the main UI
 */
function setupTrackEditorToggle(): void {
  // Add track editor shortcut (T key)
  setupTrackEditorKeyboard();
}


/**
 * Set up track editor keyboard shortcut
 */
function setupTrackEditorKeyboard(): void {
  document.addEventListener('keydown', (e) => {
    // T key to toggle track editor (when not typing in inputs)
    if (e.key.toLowerCase() === 't' && 
        !e.ctrlKey && 
        !e.metaKey && 
        e.target instanceof HTMLElement &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
      
      e.preventDefault();
      toggleTrackEditor();
    }
  });
  
  console.log('⌨️ Track editor keyboard shortcut (T key) enabled');
}

/**
 * Show the track editor modal
 */
export function showTrackEditor(): void {
  const modal = document.getElementById('trackEditorModal');
  if (modal) {
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    
    // Focus the iframe for keyboard interaction
    const iframe = modal.querySelector('#trackEditorFrame') as HTMLIFrameElement;
    if (iframe) {
      iframe.focus();
    }
    
    console.log('🎯 Track editor opened');
  }
}

/**
 * Hide the track editor modal
 */
export function hideTrackEditor(): void {
  const modal = document.getElementById('trackEditorModal');
  if (modal) {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    console.log('🔒 Track editor closed');
  }
}

/**
 * Toggle track editor visibility
 */
export function toggleTrackEditor(): void {
  const modal = document.getElementById('trackEditorModal');
  if (modal && modal.style.display !== 'none') {
    hideTrackEditor();
  } else {
    showTrackEditor();
  }
}

/**
 * Import track from track editor to main game
 */
function importTrackToGame(): void {
  console.log('📥 Importing track from editor to game...');
  
  const iframe = document.getElementById('trackEditorFrame') as HTMLIFrameElement;
  if (!iframe || !iframe.contentWindow) {
    console.error('❌ Track editor iframe not accessible');
    return;
  }
  
  // Request track data from the track editor
  iframe.contentWindow.postMessage({
    type: 'EXPORT_TRACK_REQUEST'
  }, '*');
  
  // Listen for response
  const handleMessage = (event: MessageEvent) => {
    if (event.data.type === 'EXPORT_TRACK_RESPONSE') {
      const trackData = event.data.trackData;
      
      // Import track into main game
      importTrackData(trackData);
      
      // Clean up listener
      window.removeEventListener('message', handleMessage);
      
      // Close track editor
      hideTrackEditor();
    }
  };
  
  window.addEventListener('message', handleMessage);
}

/**
 * Export current game track to track editor
 */
function exportGameTrack(): void {
  console.log('📤 Exporting current game track to editor...');
  
  // Get current game track (this would connect to the main game state)
  const currentTrack = getCurrentGameTrack();
  
  const iframe = document.getElementById('trackEditorFrame') as HTMLIFrameElement;
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage({
      type: 'IMPORT_TRACK_REQUEST',
      trackData: currentTrack
    }, '*');
  }
}

/**
 * Import track data into the main game
 */
function importTrackData(trackData: any): void {
  console.log('🔄 Importing track data into main game:', trackData);
  
  try {
    // Load the custom track using the track loader
    const gameTrack = trackLoader.loadCustomTrack(trackData);
    
    // Notify that a new track has been loaded - main.ts should listen for this
    const trackLoadedEvent = new CustomEvent('trackLoaded', {
      detail: {
        trackData: gameTrack,
        metadata: gameTrack.metadata
      }
    });
    window.dispatchEvent(trackLoadedEvent);
    
    // Update track info display in dropdown menu
    updateTrackInfoDisplay();
    
    // Show success message with track info
    const status = document.getElementById('status');
    if (status) {
      const trackName = trackData.metadata?.name || 'Custom Track';
      const trackAuthor = trackData.metadata?.author;
      const authorText = trackAuthor ? ` by ${trackAuthor}` : '';
      status.textContent = `✅ Track "${trackName}"${authorText} loaded! Press R to start a new race on this track.`;
    }
    
    console.log('✅ Track import completed successfully');
    
  } catch (error) {
    console.error('❌ Failed to import track:', error);
    
    // Show error message
    const status = document.getElementById('status');
    if (status) {
      status.textContent = `❌ Failed to load track: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
}

/**
 * Get current game track data
 */
function getCurrentGameTrack(): any {
  console.log('📋 Getting current game track data...');
  
  // Export current track data using track loader
  const trackData = trackLoader.exportCurrentTrack();
  
  if (trackData) {
    console.log('✅ Exported current game track:', trackData.metadata.name);
    return trackData;
  } else {
    console.warn('⚠️ No track data available for export');
    // Return a minimal default track as fallback
    return {
      metadata: {
        name: 'Default Track',
        author: 'vRacer Team',
        description: 'Default racing track',
        created: new Date().toISOString()
      },
      track: {
        outer: [
          { x: 2, y: 2 }, { x: 48, y: 2 }, { x: 48, y: 33 }, { x: 2, y: 33 }
        ],
        inner: [
          { x: 12, y: 10 }, { x: 38, y: 10 }, { x: 38, y: 25 }, { x: 12, y: 25 }
        ],
        checkpoints: [],
        startLine: { a: { x: 2, y: 18 }, b: { x: 12, y: 18 } }
      },
      racingLine: {
        waypoints: [],
        direction: 'counter-clockwise'
      }
    };
  }
}
