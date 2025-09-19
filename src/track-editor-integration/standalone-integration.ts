/**
 * Standalone Track Editor Integration
 * 
 * This module integrates the complete standalone track editor into the main vRacer UI.
 * It replaces the basic TypeScript track editor with the full-featured version.
 */

import { isFeatureEnabled } from '../features';
import { lockBackground, unlockBackground } from '../modal-utils';

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
  modal.className = 'track-editor-modal ui-zone';
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
    
    // Lock background interaction
    lockBackground(modal);
    
    // Focus the iframe for keyboard interaction
    const iframe = modal.querySelector('#trackEditorFrame') as HTMLIFrameElement;
    if (iframe) {
      iframe.focus();
    }
    
    console.log('🎯 Track editor opened with background locked');
  }
}

/**
 * Hide the track editor modal
 */
export function hideTrackEditor(): void {
  const modal = document.getElementById('trackEditorModal');
  if (modal) {
    // Unlock background interaction first
    unlockBackground(modal);
    
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    console.log('🔒 Track editor closed with background unlocked');
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

