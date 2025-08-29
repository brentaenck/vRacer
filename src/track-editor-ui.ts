/**
 * Track Editor UI Integration
 * 
 * Handles the connection between the track editor panel and the main application.
 * Manages editor state, UI updates, and user interactions.
 */

import { isFeatureEnabled } from './features';
import { 
  EditorState, 
  EditorMode, 
  EditorTool, 
  createDefaultTrack,
  CustomTrack,
  validateTrack
} from './track-editor';

// Global editor state
let editorState: EditorState | null = null;

/**
 * Initialize the track editor UI system
 */
export function initializeTrackEditor(): void {
  if (!isFeatureEnabled('trackEditor')) {
    console.log('Track editor feature is disabled');
    return;
  }

  console.log('🛠️ Initializing Track Editor UI...');

  // Show the track editor section in config modal
  showTrackEditorInConfig();
  
  // Wire up event listeners
  setupEditorToggle();
  setupKeyboardShortcuts();
  setupToolPalette();
  setupModeButtons();
  setupOptionsToggles();
  setupActionButtons();
  
  console.log('✅ Track Editor UI initialized successfully');
}

/**
 * Show the track editor section in the configuration modal
 */
function showTrackEditorInConfig(): void {
  const editorSection = document.getElementById('trackEditorSection');
  if (editorSection) {
    editorSection.style.display = 'block';
    console.log('📊 Track editor section visible in config');
  }
}

/**
 * Setup the main editor toggle functionality
 */
function setupEditorToggle(): void {
  const editorToggle = document.getElementById('editorToggle') as HTMLInputElement;
  
  if (!editorToggle) {
    console.warn('❌ Editor toggle element not found');
    return;
  }

  editorToggle.addEventListener('change', (event) => {
    const isEnabled = (event.target as HTMLInputElement).checked;
    
    if (isEnabled) {
      enableTrackEditor();
    } else {
      disableTrackEditor();
    }
  });

  console.log('🔗 Editor toggle wired up');
}

/**
 * Enable the track editor and show the editor panel
 */
function enableTrackEditor(): void {
  console.log('🎨 Enabling Track Editor...');
  
  // Initialize editor state
  editorState = {
    mode: EditorMode.DRAW,
    tool: EditorTool.PEN,
    isActive: true,
    isDirty: false,
    track: createDefaultTrack(),
    isDrawing: false,
    currentPath: [],
    snapToGrid: true,
    gridSize: 20,
    selectedPoints: [],
    showGrid: true,
    showValidation: false,
    showPreview: false,
    zoomLevel: 1.0,
    panOffset: { x: 0, y: 0 }
  };

  // Add editor-active class to sidebar and hide default content
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.classList.add('editor-active');
  }

  // Show the editor panel
  const editorPanel = document.getElementById('trackEditorPanel');
  if (editorPanel) {
    editorPanel.style.display = 'block';
    updateEditorUI();
  }

  // Close config modal
  const configModal = document.getElementById('configModal');
  if (configModal) {
    configModal.classList.remove('show');
    configModal.setAttribute('aria-hidden', 'true');
  }

  console.log('✅ Track Editor enabled');
}

/**
 * Disable the track editor and hide the editor panel
 */
function disableTrackEditor(): void {
  console.log('🔻 Disabling Track Editor...');
  
  const editorPanel = document.getElementById('trackEditorPanel');
  if (editorPanel) {
    editorPanel.style.display = 'none';
  }
  
  // Remove editor-active class from sidebar to restore default content
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.classList.remove('editor-active');
  }
  
  editorState = null;
  console.log('✅ Track Editor disabled');
}

/**
 * Update the editor UI to reflect current state
 */
function updateEditorUI(): void {
  if (!editorState) return;

  // Update mode display
  const modeDisplay = document.getElementById('editorMode');
  if (modeDisplay) {
    modeDisplay.textContent = `${editorState.mode.charAt(0).toUpperCase() + editorState.mode.slice(1)} Mode`;
  }

  // Update active tool button
  document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.classList.remove('tool-active');
    if (btn.getAttribute('data-tool') === editorState?.tool) {
      btn.classList.add('tool-active');
    }
  });

  // Update active mode button
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.remove('mode-active');
    if (btn.getAttribute('data-mode') === editorState?.mode) {
      btn.classList.add('mode-active');
    }
  });

  // Update option toggles
  const snapToggle = document.getElementById('snapToGrid') as HTMLInputElement;
  if (snapToggle) {
    snapToggle.checked = editorState.snapToGrid;
  }

  const validationToggle = document.getElementById('showValidation') as HTMLInputElement;
  if (validationToggle) {
    validationToggle.checked = editorState.showValidation;
  }

  // Update track properties
  const trackNameInput = document.getElementById('trackName') as HTMLInputElement;
  const trackAuthorInput = document.getElementById('trackAuthor') as HTMLInputElement;
  const trackDifficultySelect = document.getElementById('trackDifficulty') as HTMLSelectElement;

  if (trackNameInput && editorState.track.metadata) {
    trackNameInput.value = editorState.track.metadata.name || 'New Track';
  }
  
  if (trackAuthorInput && editorState.track.metadata) {
    trackAuthorInput.value = editorState.track.metadata.author || 'Anonymous';
  }
  
  if (trackDifficultySelect && editorState.track.metadata) {
    trackDifficultySelect.value = editorState.track.metadata.difficulty || 'Medium';
  }

  console.log(`🔄 UI updated - Mode: ${editorState.mode}, Tool: ${editorState.tool}`);
}

/**
 * Setup keyboard shortcuts for the editor
 */
function setupKeyboardShortcuts(): void {
  document.addEventListener('keydown', (event) => {
    // Only handle shortcuts if editor is active and not in an input field
    if (!editorState || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (event.key.toLowerCase()) {
      case 'e':
        if (!event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          toggleTrackEditor();
        }
        break;
      case 'p':
        if (editorState.isActive) {
          event.preventDefault();
          setEditorTool(EditorTool.PEN);
        }
        break;
      case 'delete':
      case 'backspace':
        if (editorState.isActive) {
          event.preventDefault();
          setEditorTool(EditorTool.ERASER);
        }
        break;
      case 'm':
        if (editorState.isActive) {
          event.preventDefault();
          setEditorTool(EditorTool.MOVE);
        }
        break;
      case '1':
        if (editorState.isActive) {
          event.preventDefault();
          setEditorMode(EditorMode.DRAW);
        }
        break;
      case '2':
        if (editorState.isActive) {
          event.preventDefault();
          setEditorMode(EditorMode.EDIT);
        }
        break;
      case '3':
        if (editorState.isActive) {
          event.preventDefault();
          setEditorMode(EditorMode.TEST);
        }
        break;
      case '4':
        if (editorState.isActive) {
          event.preventDefault();
          setEditorMode(EditorMode.VALIDATE);
        }
        break;
      case 'escape':
        if (editorState.isActive) {
          event.preventDefault();
          disableTrackEditor();
          // Also uncheck the toggle
          const editorToggle = document.getElementById('editorToggle') as HTMLInputElement;
          if (editorToggle) {
            editorToggle.checked = false;
          }
        }
        break;
    }
  });

  console.log('⌨️ Keyboard shortcuts setup complete');
}

/**
 * Toggle track editor on/off
 */
function toggleTrackEditor(): void {
  const editorToggle = document.getElementById('editorToggle') as HTMLInputElement;
  if (editorToggle) {
    editorToggle.checked = !editorToggle.checked;
    editorToggle.dispatchEvent(new Event('change'));
  }
}

/**
 * Setup tool palette button interactions
 */
function setupToolPalette(): void {
  document.querySelectorAll('.tool-btn').forEach(button => {
    button.addEventListener('click', (event) => {
      const tool = (event.target as HTMLElement).closest('.tool-btn')?.getAttribute('data-tool') as EditorTool;
      if (tool && editorState) {
        setEditorTool(tool);
      }
    });
  });

  console.log('🔨 Tool palette wired up');
}

/**
 * Setup mode button interactions
 */
function setupModeButtons(): void {
  document.querySelectorAll('.mode-btn').forEach(button => {
    button.addEventListener('click', (event) => {
      const mode = (event.target as HTMLElement).closest('.mode-btn')?.getAttribute('data-mode') as EditorMode;
      if (mode && editorState) {
        setEditorMode(mode);
      }
    });
  });

  console.log('🎯 Mode buttons wired up');
}

/**
 * Setup option toggle interactions
 */
function setupOptionsToggles(): void {
  const snapToggle = document.getElementById('snapToGrid') as HTMLInputElement;
  if (snapToggle) {
    snapToggle.addEventListener('change', (event) => {
      if (editorState) {
        editorState.snapToGrid = (event.target as HTMLInputElement).checked;
        console.log(`📏 Snap to grid: ${editorState.snapToGrid}`);
      }
    });
  }

  const validationToggle = document.getElementById('showValidation') as HTMLInputElement;
  if (validationToggle) {
    validationToggle.addEventListener('change', (event) => {
      if (editorState) {
        editorState.showValidation = (event.target as HTMLInputElement).checked;
        updateValidationDisplay();
        console.log(`✅ Show validation: ${editorState.showValidation}`);
      }
    });
  }

  console.log('⚙️ Options toggles wired up');
}

/**
 * Setup action button interactions
 */
function setupActionButtons(): void {
  // Save button
  const saveBtn = document.getElementById('saveTrackBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      if (editorState?.track.geometry) {
        saveTrack();
      }
    });
  }

  // Load button
  const loadBtn = document.getElementById('loadTrackBtn');
  if (loadBtn) {
    loadBtn.addEventListener('click', () => {
      showTrackLibrary();
    });
  }

  // Export button
  const exportBtn = document.getElementById('exportTrackBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      if (editorState?.track.geometry) {
        exportTrack();
      }
    });
  }

  // Clear button
  const clearBtn = document.getElementById('clearTrackBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      clearTrack();
    });
  }

  // Close editor button
  const closeBtn = document.getElementById('closeEditorBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      disableTrackEditor();
      const editorToggle = document.getElementById('editorToggle') as HTMLInputElement;
      if (editorToggle) {
        editorToggle.checked = false;
      }
    });
  }

  console.log('💾 Action buttons wired up');
}

/**
 * Set the current editor tool
 */
function setEditorTool(tool: EditorTool): void {
  if (!editorState) return;
  
  editorState.tool = tool;
  updateEditorUI();
  console.log(`🔧 Tool changed to: ${tool}`);
}

/**
 * Set the current editor mode
 */
function setEditorMode(mode: EditorMode): void {
  if (!editorState) return;
  
  editorState.mode = mode;
  updateEditorUI();
  console.log(`🎯 Mode changed to: ${mode}`);
}

/**
 * Update the validation display based on current track
 */
function updateValidationDisplay(): void {
  if (!editorState) return;

  const validationResults = document.getElementById('validationResults');
  const errorsContainer = document.getElementById('validationErrors');
  const warningsContainer = document.getElementById('validationWarnings');
  const metricsContainer = document.getElementById('validationMetrics');

  if (!validationResults || !errorsContainer || !warningsContainer || !metricsContainer) {
    return;
  }

  if (editorState.showValidation && editorState.track.geometry) {
    validationResults.style.display = 'block';
    
    const validation = validateTrack(editorState.track.geometry);
    
    // Display errors
    errorsContainer.innerHTML = validation.errors.length > 0 
      ? validation.errors.map(error => `<div>❌ ${error}</div>`).join('')
      : '';
    
    // Display warnings  
    warningsContainer.innerHTML = validation.warnings.length > 0
      ? validation.warnings.map(warning => `<div>⚠️ ${warning}</div>`).join('')
      : '';
    
    // Display metrics
    const metrics = validation.metrics;
    metricsContainer.innerHTML = `
      <div>Length: ${Math.round(metrics.totalLength)}px</div>
      <div>Width: ${Math.round(metrics.minWidth)}-${Math.round(metrics.maxWidth)}px</div>
      <div>Complexity: ${Math.round(metrics.complexity)}%</div>
    `;
  } else {
    validationResults.style.display = 'none';
  }
}

/**
 * Save the current track (placeholder)
 */
function saveTrack(): void {
  console.log('💾 Save track functionality - placeholder');
  // TODO: Implement localStorage saving
  alert('Save functionality coming soon!');
}

/**
 * Show track library (placeholder)
 */
function showTrackLibrary(): void {
  console.log('📚 Track library functionality - placeholder');
  // TODO: Implement track library UI
  alert('Load functionality coming soon!');
}

/**
 * Export current track (placeholder)
 */
function exportTrack(): void {
  console.log('📤 Export track functionality - placeholder');
  // TODO: Implement JSON export
  alert('Export functionality coming soon!');
}

/**
 * Clear current track
 */
function clearTrack(): void {
  if (!editorState) return;
  
  const confirmed = confirm('Clear the current track? This cannot be undone.');
  if (confirmed) {
    editorState.track = createDefaultTrack();
    editorState.currentPath = [];
    editorState.selectedPoints = [];
    editorState.isDirty = false;
    updateEditorUI();
    updateValidationDisplay();
    console.log('🗑️ Track cleared');
  }
}

/**
 * Get current editor state (for other modules to use)
 */
export function getEditorState(): EditorState | null {
  return editorState;
}

/**
 * Check if track editor is currently active
 */
export function isEditorActive(): boolean {
  return editorState?.isActive ?? false;
}

/**
 * Refresh the editor UI (for external modules to trigger updates)
 */
export function refreshEditorUI(): void {
  updateEditorUI();
  updateValidationDisplay();
}
