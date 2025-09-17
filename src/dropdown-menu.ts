/**
 * Dropdown Menu Handler
 * 
 * Manages the dropdown menu for game settings and track editor access.
 * Replaces the old hamburger menu modal system with proper dropdown navigation.
 */

import { showTrackEditor } from './track-editor-integration/standalone-integration';
import { trackLoader } from './track-loader';

/**
 * Initialize the dropdown menu system
 */
export function initializeDropdownMenu(): void {
  console.log('🎛️ Initializing dropdown menu...');
  
  const menuBtn = document.getElementById('menuBtn');
  const dropdownMenu = document.getElementById('dropdownMenu');
  const gameSettingsBtn = document.getElementById('gameSettingsBtn');
  const trackEditorBtn = document.getElementById('trackEditorBtn');
  const loadTrackBtn = document.getElementById('loadTrackBtn');
  const restoreDefaultTrackBtn = document.getElementById('restoreDefaultTrackBtn');
  const currentTrackInfo = document.getElementById('currentTrackInfo');
  
  if (!menuBtn || !dropdownMenu || !gameSettingsBtn || !trackEditorBtn || !loadTrackBtn || !restoreDefaultTrackBtn) {
    console.error('❌ Dropdown menu elements not found');
    return;
  }
  
  // Set up menu toggle
  menuBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleDropdownMenu();
  });
  
  // Set up menu items
  gameSettingsBtn.addEventListener('click', (e) => {
    e.preventDefault();
    hideDropdownMenu();
    openGameSettings();
  });
  
  trackEditorBtn.addEventListener('click', (e) => {
    e.preventDefault();
    hideDropdownMenu();
    openTrackEditor();
  });
  
  loadTrackBtn.addEventListener('click', (e) => {
    e.preventDefault();
    hideDropdownMenu();
    loadTrackFromFile();
  });
  
  restoreDefaultTrackBtn.addEventListener('click', (e) => {
    e.preventDefault();
    hideDropdownMenu();
    restoreDefaultTrack();
  });
  
  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.dropdown-menu-container')) {
      hideDropdownMenu();
    }
  });
  
  // Handle keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideDropdownMenu();
    }
  });
  
  // Set up keyboard navigation within menu
  setupMenuKeyboardNavigation();
  
  // Update track info display
  updateTrackInfoDisplay();
  
  console.log('✅ Dropdown menu initialized');
}

/**
 * Toggle dropdown menu visibility
 */
function toggleDropdownMenu(): void {
  const menuBtn = document.getElementById('menuBtn');
  const dropdownMenu = document.getElementById('dropdownMenu');
  
  if (!menuBtn || !dropdownMenu) return;
  
  const isOpen = menuBtn.getAttribute('aria-expanded') === 'true';
  
  if (isOpen) {
    hideDropdownMenu();
  } else {
    showDropdownMenu();
  }
}

/**
 * Show dropdown menu
 */
function showDropdownMenu(): void {
  const menuBtn = document.getElementById('menuBtn');
  const dropdownMenu = document.getElementById('dropdownMenu');
  
  if (!menuBtn || !dropdownMenu) return;
  
  menuBtn.setAttribute('aria-expanded', 'true');
  dropdownMenu.setAttribute('aria-hidden', 'false');
  
  // Focus first menu item for keyboard navigation
  const firstMenuItem = dropdownMenu.querySelector('.menu-item') as HTMLElement;
  if (firstMenuItem) {
    firstMenuItem.tabIndex = 0;
  }
  
  console.log('📂 Dropdown menu opened');
}

/**
 * Hide dropdown menu
 */
function hideDropdownMenu(): void {
  const menuBtn = document.getElementById('menuBtn');
  const dropdownMenu = document.getElementById('dropdownMenu');
  
  if (!menuBtn || !dropdownMenu) return;
  
  menuBtn.setAttribute('aria-expanded', 'false');
  dropdownMenu.setAttribute('aria-hidden', 'true');
  
  // Reset tabindex for all menu items
  const menuItems = dropdownMenu.querySelectorAll('.menu-item');
  menuItems.forEach(item => {
    (item as HTMLElement).tabIndex = -1;
  });
  
  console.log('📁 Dropdown menu closed');
}

/**
 * Set up keyboard navigation within the menu
 */
function setupMenuKeyboardNavigation(): void {
  const dropdownMenu = document.getElementById('dropdownMenu');
  if (!dropdownMenu) return;
  
  dropdownMenu.addEventListener('keydown', (e) => {
    const menuItems = Array.from(dropdownMenu.querySelectorAll('.menu-item')) as HTMLElement[];
    const currentIndex = menuItems.findIndex(item => item === document.activeElement);
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % menuItems.length;
        menuItems[nextIndex]?.focus();
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        const prevIndex = currentIndex <= 0 ? menuItems.length - 1 : currentIndex - 1;
        menuItems[prevIndex]?.focus();
        break;
        
      case 'Enter':
      case ' ':
        e.preventDefault();
        (document.activeElement as HTMLElement)?.click();
        break;
        
      case 'Escape':
        e.preventDefault();
        hideDropdownMenu();
        document.getElementById('menuBtn')?.focus();
        break;
    }
  });
}

/**
 * Open game settings modal
 */
function openGameSettings(): void {
  console.log('⚙️ Opening game settings...');
  
  const configModal = document.getElementById('configModal');
  if (configModal) {
    configModal.classList.add('show');
    configModal.setAttribute('aria-hidden', 'false');
    
    // Focus the first focusable element in the modal
    const firstFocusable = configModal.querySelector('button, input, select, textarea') as HTMLElement;
    firstFocusable?.focus();
  } else {
    console.error('❌ Config modal not found');
  }
}

/**
 * Open track editor
 */
function openTrackEditor(): void {
  console.log('🏁 Opening track editor...');
  showTrackEditor();
}

/**
 * Load track from JSON file
 */
function loadTrackFromFile(): void {
  console.log('📁 Loading track from file...');
  
  // Create file input element
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json';
  fileInput.style.display = 'none';
  
  fileInput.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const trackData = JSON.parse(text);
      
      // Load the custom track
      trackLoader.loadCustomTrack(trackData);
      
      // Update track info display
      updateTrackInfoDisplay();
      
      // Show success message
      const status = document.getElementById('status');
      if (status) {
        const trackName = trackData.metadata?.name || 'Custom Track';
        status.textContent = `✅ Track "${trackName}" loaded! Press R to start a new race on this track.`;
      }
      
      console.log('✅ Track loaded from file successfully');
      
    } catch (error) {
      console.error('❌ Failed to load track from file:', error);
      
      const status = document.getElementById('status');
      if (status) {
        status.textContent = `❌ Failed to load track: ${error instanceof Error ? error.message : 'Invalid file format'}`;
      }
    } finally {
      // Clean up file input
      document.body.removeChild(fileInput);
    }
  });
  
  // Add to DOM and trigger file dialog
  document.body.appendChild(fileInput);
  fileInput.click();
}

/**
 * Restore default track
 */
function restoreDefaultTrack(): void {
  console.log('🔄 Restoring default track...');
  
  trackLoader.restoreDefaultTrack();
  updateTrackInfoDisplay();
  
  const status = document.getElementById('status');
  if (status) {
    status.textContent = '✅ Default track restored! Press R to start a new race.';
  }
}

/**
 * Check if dropdown menu is open
 */
export function isDropdownMenuOpen(): boolean {
  const menuBtn = document.getElementById('menuBtn');
  return menuBtn?.getAttribute('aria-expanded') === 'true';
}

/**
 * Close dropdown menu (public function)
 */
export function closeDropdownMenu(): void {
  hideDropdownMenu();
}

/**
 * Update track info display (public function)
 */
export function updateTrackInfoDisplay(): void {
  const currentTrackInfo = document.getElementById('currentTrackInfo');
  if (!currentTrackInfo) return;
  
  const trackInfo = trackLoader.getCurrentTrackInfo();
  const textElement = currentTrackInfo.querySelector('.menu-text');
  
  if (textElement) {
    const authorText = trackInfo.author ? ` by ${trackInfo.author}` : '';
    const customIndicator = trackInfo.isCustom ? ' 🏆' : '';
    textElement.textContent = `Track: ${trackInfo.name}${authorText}${customIndicator}`;
  }
}
