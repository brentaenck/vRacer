/**
 * Dropdown Menu Handler
 * 
 * Manages the dropdown menu for game settings and track editor access.
 * Replaces the old hamburger menu modal system with proper dropdown navigation.
 */

import { showTrackEditor } from './track-editor-integration/standalone-integration';

/**
 * Initialize the dropdown menu system
 */
export function initializeDropdownMenu(): void {
  console.log('🎛️ Initializing dropdown menu...');
  
  const menuBtn = document.getElementById('menuBtn');
  const dropdownMenu = document.getElementById('dropdownMenu');
  const gameSettingsBtn = document.getElementById('gameSettingsBtn');
  const trackEditorBtn = document.getElementById('trackEditorBtn');
  
  if (!menuBtn || !dropdownMenu || !gameSettingsBtn || !trackEditorBtn) {
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