# Track Editor Cleanup Plan

## 🎯 **Objective**

Remove the old/deprecated track editor implementation to eliminate code duplication and maintain only the unified track & racing line editor accessed via the dropdown menu.

## 📋 **Current State Analysis**

### ✅ **KEEP - New Unified System (Current)**
- **Entry Point:** Dropdown menu → "Track Editor" button
- **Implementation:** `src/track-editor-integration/standalone-integration.ts`
- **UI:** Modal with iframe embedding `track-editor/index.html`
- **Status:** This is the current, fully-functional unified editor

**Files to KEEP:**
- ✅ `src/dropdown-menu.ts`
- ✅ `src/track-editor-integration/standalone-integration.ts`
- ✅ `src/track-editor-integration/modal-styles.css`
- ✅ `track-editor/` directory (standalone editor)
- ✅ `racing-line-editor/` directory (legacy but may be referenced)

### ❌ **REMOVE - Old Embedded System (Deprecated)**
- **Entry Point:** Game Settings modal → Track Editor toggle
- **Implementation:** `src/track-editor-ui.ts` with embedded sidebar panel
- **UI:** Embedded panel (`#trackEditorPanel`) in main sidebar
- **Status:** Deprecated, replaced by unified system

**Files to REMOVE:**
- ❌ `src/track-editor-ui.ts` (old embedded editor UI)
- ❌ `src/track-editor.ts` (old data structures - may be shared)
- ❌ `src/track-editor-canvas.ts` (old canvas handling)
- ❌ `test-track-editor.html` (tests old system)

## 🔄 **Cleanup Plan**

### **Phase 1: Analyze Dependencies** ✅
- [x] Identify all imports of deprecated track editor files
- [x] Check if `track-editor.ts` contains shared data structures
- [x] Verify current track editor works independently

### **Phase 2: Safe Removal Plan**

#### **Step 1: Remove Main.ts Imports and Calls**
Remove old track editor initialization from `src/main.ts`:
```typescript
// REMOVE these lines:
import { initializeTrackEditor, isEditorActive } from './track-editor-ui'
import { setupEditorCanvas, drawEditorOverlay } from './track-editor-canvas'

// REMOVE initialization call:
initializeTrackEditor()
setupEditorCanvas(canvas)

// REMOVE conditional checks:
if (isFeatureEnabled('trackEditor') && isEditorActive()) {
  // Remove these conditionals throughout main.ts
}
```

#### **Step 2: Remove HTML Elements**
Remove deprecated HTML from `index.html`:
```html
<!-- REMOVE: Old track editor panel in sidebar -->
<div id="trackEditorPanel" class="editor-panel" style="display: none;">
  <!-- Remove entire panel -->
</div>

<!-- REMOVE: Old track editor section in config modal -->
<section class="config-section" id="trackEditorSection" style="display: none;">
  <!-- Remove entire section -->
</section>
```

#### **Step 3: Clean Up CSS**
Remove deprecated CSS from `src/styles.css`:
```css
/* REMOVE: Old track editor styles */
.dual-style-enabled #trackEditorSection *,
.dual-style-enabled #trackEditorSection h3,
.dual-style-enabled #trackEditorSection div,
.dual-style-enabled #trackEditorSection span {
  /* Remove these rules */
}
```

#### **Step 4: Remove Files**
Delete deprecated files:
- ❌ `src/track-editor-ui.ts`
- ❌ `src/track-editor-canvas.ts`  
- ❌ `test-track-editor.html`

#### **Step 5: Analyze track-editor.ts**
**DECISION NEEDED:** Check if `src/track-editor.ts` contains shared types/interfaces:
- If it contains shared data structures → **KEEP and refactor**
- If it's only used by old system → **REMOVE**
- If types are needed → **Move to shared types file**

### **Phase 3: Validation**

#### **Test Cases:**
1. ✅ Verify dropdown menu → Track Editor opens correctly
2. ✅ Verify Game Settings modal no longer has track editor section  
3. ✅ Verify no console errors after cleanup
4. ✅ Verify track editor iframe loads and functions
5. ✅ Test track import/export functionality
6. ✅ Verify keyboard shortcuts still work (T key)

#### **Regression Tests:**
- All existing game functionality should work unchanged
- Racing line editor should be unaffected
- Main game controls should be unaffected
- Performance should be unchanged or improved

## 📊 **Impact Assessment**

### **Benefits:**
- ✅ **Code Simplification:** Remove ~1000+ lines of deprecated code
- ✅ **Single Source of Truth:** Only one track editor implementation  
- ✅ **Reduced Maintenance:** Fewer files to maintain and update
- ✅ **Cleaner Architecture:** Clear separation between game and editor
- ✅ **Better UX:** Users won't be confused by multiple editor entry points

### **Risks:**
- ⚠️ **Breaking Changes:** If shared types/interfaces are removed incorrectly
- ⚠️ **Feature Loss:** Need to ensure no functionality is lost
- ⚠️ **Testing Required:** Thorough testing needed before deployment

## 🚀 **Implementation Order**

### **Priority 1 (Safe):**
1. Remove imports from `main.ts`
2. Remove HTML elements from `index.html`
3. Remove CSS rules from `styles.css`

### **Priority 2 (Analysis Required):**
4. Analyze and handle `track-editor.ts` file
5. Remove/refactor any remaining dependencies

### **Priority 3 (Validation):**
6. Delete deprecated files
7. Run comprehensive tests
8. Update documentation

## 📝 **Files Summary**

| File | Action | Risk | Notes |
|------|--------|------|-------|
| `src/main.ts` | Modify | Low | Remove imports & calls |
| `index.html` | Modify | Low | Remove HTML sections |
| `src/styles.css` | Modify | Low | Remove CSS rules |
| `src/track-editor-ui.ts` | DELETE | Medium | Main deprecated file |
| `src/track-editor-canvas.ts` | DELETE | Medium | Canvas handling |
| `src/track-editor.ts` | ANALYZE | HIGH | May contain shared types |
| `test-track-editor.html` | DELETE | Low | Test file only |

## ✅ **Success Criteria**

1. **Functionality:** Track editor works via dropdown menu only
2. **Code Quality:** No deprecated imports or dead code
3. **Performance:** No regressions in game performance  
4. **UI/UX:** Clean, single path to track editor
5. **Tests:** All existing functionality continues to work
6. **Documentation:** Updated to reflect changes

---

## 🔄 **Next Steps**

1. **Review this plan** with stakeholders
2. **Create backup branch** before changes
3. **Execute Phase 2** step by step
4. **Test thoroughly** after each step
5. **Update documentation** when complete
