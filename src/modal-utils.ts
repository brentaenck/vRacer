/**
 * Modal Isolation Utilities
 * 
 * Provides comprehensive modal isolation to prevent background interaction
 * including scrolling, keyboard events, and focus management.
 */

interface ModalState {
  element: HTMLElement;
  originalBodyOverflow: string;
  originalBodyPosition: string;
  originalScrollY: number;
  backgroundKeydownListener?: (e: KeyboardEvent) => void;
  backgroundScrollListener?: (e: Event) => void;
  backgroundWheelListener?: (e: WheelEvent) => void;
  backgroundTouchmoveListener?: (e: TouchEvent) => void;
}

// Track active modals for proper stacking
let activeModals: ModalState[] = [];

/**
 * Lock the background when a modal opens
 */
export function lockBackground(modalElement: HTMLElement): void {
  console.log('🔒 Locking background interaction for modal');
  
  // Store current scroll position
  const scrollY = window.scrollY;
  
  // Create modal state
  const modalState: ModalState = {
    element: modalElement,
    originalBodyOverflow: document.body.style.overflow,
    originalBodyPosition: document.body.style.position,
    originalScrollY: scrollY
  };
  
  // Lock body scrolling
  document.body.style.overflow = 'hidden';
  document.body.style.position = 'fixed';
  document.body.style.top = `-${scrollY}px`;
  document.body.style.width = '100%';
  
  // Create event listeners for this modal
  modalState.backgroundKeydownListener = (e: KeyboardEvent) => {
    // Allow Escape key to propagate (for modal closing)
    if (e.key === 'Escape') return;
    
    // Block all other keyboard events if they're not targeting the modal
    if (!modalElement.contains(e.target as Node)) {
      e.preventDefault();
      e.stopPropagation();
      console.log('🚫 Blocked background keyboard event:', e.key);
    }
  };
  
  modalState.backgroundScrollListener = (e: Event) => {
    if (!modalElement.contains(e.target as Node)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };
  
  modalState.backgroundWheelListener = (e: WheelEvent) => {
    if (!modalElement.contains(e.target as Node)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };
  
  modalState.backgroundTouchmoveListener = (e: TouchEvent) => {
    if (!modalElement.contains(e.target as Node)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };
  
  // Add event listeners
  document.addEventListener('keydown', modalState.backgroundKeydownListener, { capture: true });
  document.addEventListener('scroll', modalState.backgroundScrollListener, { passive: false, capture: true });
  document.addEventListener('wheel', modalState.backgroundWheelListener, { passive: false, capture: true });
  document.addEventListener('touchmove', modalState.backgroundTouchmoveListener, { passive: false, capture: true });
  
  // Add to active modals stack
  activeModals.push(modalState);
  
  console.log('✅ Background locked. Active modals:', activeModals.length);
}

/**
 * Unlock the background when a modal closes
 */
export function unlockBackground(modalElement: HTMLElement): void {
  console.log('🔓 Unlocking background interaction for modal');
  
  // Find the modal state
  const modalIndex = activeModals.findIndex(state => state.element === modalElement);
  if (modalIndex === -1) {
    console.warn('⚠️ Modal not found in active stack');
    return;
  }
  
  const modalState = activeModals[modalIndex];
  if (!modalState) {
    console.warn('⚠️ Modal state not found');
    return;
  }
  
  // Remove event listeners
  if (modalState.backgroundKeydownListener) {
    document.removeEventListener('keydown', modalState.backgroundKeydownListener, { capture: true } as any);
  }
  if (modalState.backgroundScrollListener) {
    document.removeEventListener('scroll', modalState.backgroundScrollListener, { capture: true } as any);
  }
  if (modalState.backgroundWheelListener) {
    document.removeEventListener('wheel', modalState.backgroundWheelListener, { capture: true } as any);
  }
  if (modalState.backgroundTouchmoveListener) {
    document.removeEventListener('touchmove', modalState.backgroundTouchmoveListener, { capture: true } as any);
  }
  
  // Remove from active modals stack
  activeModals.splice(modalIndex, 1);
  
  // If this was the last modal, restore body scrolling
  if (activeModals.length === 0) {
    document.body.style.overflow = modalState.originalBodyOverflow;
    document.body.style.position = modalState.originalBodyPosition;
    document.body.style.top = '';
    document.body.style.width = '';
    
    // Restore scroll position
    window.scrollTo(0, modalState.originalScrollY);
    
    console.log('✅ Background fully unlocked');
  } else {
    console.log('📚 Background remains locked. Active modals:', activeModals.length);
  }
}

/**
 * Check if background is currently locked
 */
export function isBackgroundLocked(): boolean {
  return activeModals.length > 0;
}

/**
 * Force unlock all modals (emergency cleanup)
 */
export function forceUnlockBackground(): void {
  console.warn('🚨 Force unlocking all modals');
  
  // Remove all event listeners
  activeModals.forEach(modalState => {
    if (modalState.backgroundKeydownListener) {
      document.removeEventListener('keydown', modalState.backgroundKeydownListener, { capture: true } as any);
    }
    if (modalState.backgroundScrollListener) {
      document.removeEventListener('scroll', modalState.backgroundScrollListener, { capture: true } as any);
    }
    if (modalState.backgroundWheelListener) {
      document.removeEventListener('wheel', modalState.backgroundWheelListener, { capture: true } as any);
    }
    if (modalState.backgroundTouchmoveListener) {
      document.removeEventListener('touchmove', modalState.backgroundTouchmoveListener, { capture: true } as any);
    }
  });
  
  // Restore body if any modal was active
  if (activeModals.length > 0) {
    const lastModal = activeModals[activeModals.length - 1];
    if (lastModal) {
      document.body.style.overflow = lastModal.originalBodyOverflow;
      document.body.style.position = lastModal.originalBodyPosition;
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, lastModal.originalScrollY);
    }
  }
  
  // Clear stack
  activeModals = [];
  console.log('✅ All modals force unlocked');
}

// Expose utilities to global scope for debugging
if (typeof window !== 'undefined') {
  (window as any).modalUtils = {
    lockBackground,
    unlockBackground,
    isBackgroundLocked,
    forceUnlockBackground,
    getActiveModals: () => activeModals.length
  };
}