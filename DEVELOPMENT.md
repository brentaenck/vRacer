# vRacer Development Flow

This document describes the development workflow and processes used for the vRacer project.

## Development Philosophy

We use **Trunk-Based Development** with **Feature Flags** to enable:
- Rapid iteration and experimentation
- Always-deployable main branch
- Minimal process overhead
- Continuous integration readiness
- Safe feature rollouts

## Core Principles

### 1. Single Branch Development
- All development happens on `main` branch
- No long-lived feature branches
- Small, frequent commits (multiple times per day)
- Every commit keeps the game in a working state

### 2. Feature Flags Control Everything
- New features start disabled in `src/features.ts`
- Features are incrementally enabled as they become stable
- Incomplete features are hidden from users
- Easy rollback by toggling flags

### 3. Always Deployable
- Every commit passes type checking and builds successfully
- Game remains playable after every commit
- CI/CD can deploy any commit automatically

## Development Workflow

### Daily Development Cycle

```bash
# 1. Start development server
npm run dev

# 2. Make small, focused changes
# - Edit code incrementally
# - Test changes in browser
# - Enable/disable features in src/features.ts

# 3. Verify everything works
npm run ci  # Type check + build

# 4. Commit frequently
git add .
git commit -m "Descriptive message about small change"

# 5. Push regularly (multiple times per day)
git push origin main
```

### Feature Development Process

#### Starting a New Feature

1. **Add Feature Flag**
   ```typescript
   // In src/features.ts
   export const FEATURES: FeatureFlags = {
     // ... existing features
     myNewFeature: false,  // Start disabled
   }
   ```

2. **Create Feature Infrastructure**
   ```bash
   git commit -m "Add feature flag for new feature X"
   ```

#### Developing the Feature

3. **Implement Incrementally**
   - Add data structures
   - Add rendering logic  
   - Add interaction logic
   - Add game mechanics

4. **Small Commits (Example sequence)**
   ```bash
   git commit -m "Add data structure for feature X"
   git commit -m "Add basic rendering for feature X"  
   git commit -m "Add user interaction for feature X"
   git commit -m "Add game logic for feature X"
   ```

#### Completing the Feature

5. **Enable Feature**
   ```typescript
   // In src/features.ts
   myNewFeature: true,  // Enable when ready
   ```

6. **Final Commit**
   ```bash
   git commit -m "Enable feature X - ready for users"
   ```

### Hotfix Process

```bash
# 1. Identify issue
# 2. Make minimal fix directly on main
git add .
git commit -m "Fix: resolve issue with X"
git push origin main
# 3. Deploy immediately (game is always deployable)
```

## Feature Flag Management

### Flag Lifecycle

1. **Disabled** - Feature under development, hidden from users
2. **Enabled** - Feature ready for testing/use
3. **Removed** - Flag deleted when feature is stable (cleanup)

### Flag Categories

- **Core Game Features**: `multiCarSupport`, `carCollisions`
- **Physics & Mechanics**: `damageModel`, `wallBounce`
- **Content Tools**: `trackEditor`, `trackSaveLoad`
- **UI/UX**: `improvedControls`, `animations`
- **Development**: `debugMode`, `performanceMetrics`

### Best Practices

```typescript
// ✅ Good: Descriptive names
trackEditorMode: false

// ❌ Bad: Vague names  
newStuff: false

// ✅ Good: Feature dependencies
carCollisions: false,     // Requires multiCarSupport
multiCarSupport: false,   // Base feature

// ✅ Good: Progressive rollout
basicDamageModel: true,   // Simple version
advancedDamage: false,    // Complex version
```

## Commit Message Conventions

### Format
```
<type>: <description>

[optional body]

[optional footer]
```

### Types
- `feat:` New feature or capability
- `fix:` Bug fix
- `refactor:` Code restructure without behavior change
- `docs:` Documentation changes
- `test:` Add or modify tests
- `ci:` CI/CD changes
- `chore:` Maintenance tasks

### Examples
```bash
# Feature development
git commit -m "feat: add Car class for multi-car support"
git commit -m "feat: implement basic collision detection"
git commit -m "feat: enable multi-car gameplay"

# Bug fixes
git commit -m "fix: prevent negative velocity in edge case"

# Feature flags
git commit -m "feat: add feature flag for damage model"
git commit -m "feat: enable track editor for testing"
```

## Testing Strategy

### Pre-Commit Checks
```bash
# Always run before committing
npm run ci
# This runs:
# - npm run type-check (TypeScript validation)
# - npm run build (Vite build)
```

### Manual Testing
- Game loads without errors
- Core functionality works (movement, collision)
- New features work as expected
- Debug info shows in console (`debugMode: true`)

### Feature Testing
```bash
# Enable feature in src/features.ts
# Test manually in browser
# Disable if issues found
# Re-enable when fixed
```

## Development Scripts

```json
{
  "dev": "vite",                    // Development server
  "build": "tsc && vite build",     // Production build  
  "preview": "vite preview",        // Preview build locally
  "type-check": "tsc --noEmit",     // TypeScript validation
  "ci": "npm run type-check && npm run build", // Full validation
  "quick-commit": "git add . && git commit -m" // Rapid commits
}
```

### Usage Examples
```bash
# Development
npm run dev

# Validation
npm run ci

# Quick commits
npm run quick-commit "Add velocity validation"
```

## File Organization

```
vRacer/
├── src/
│   ├── features.ts      # 🚩 Feature flags configuration
│   ├── main.ts         # Entry point & UI wiring
│   ├── game.ts         # Core game logic & rendering
│   └── geometry.ts     # Math utilities
├── DEVELOPMENT.md      # 📖 This file
├── README.md          # User documentation
└── package.json       # Dependencies & scripts
```

## Integration Points

### Feature Flag Integration
```typescript
// In game code
import { isFeatureEnabled } from './features'

if (isFeatureEnabled('debugMode')) {
  console.log('Debug info:', gameState)
}

if (isFeatureEnabled('multiCarSupport')) {
  renderMultipleCars(cars)
} else {
  renderSingleCar(car)
}
```

### Debug Integration
```typescript
// Development helpers
if (isFeatureEnabled('debugMode')) {
  logEnabledFeatures()  // Console output
  showDebugHUD()        // Visual debug info
}
```

## CI/CD Integration (Future)

When ready to add automated deployment:

```yaml
# .github/workflows/ci.yml
name: CI
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm ci
      - run: npm run ci  # Type check + build
      - run: npm run deploy  # Deploy on success
```

## Troubleshooting

### Common Issues

**TypeScript Errors**
```bash
npm run type-check  # Identify issues
# Fix incrementally, commit fixes
```

**Build Failures**
```bash
npm run build  # Test build locally
# Fix issues, ensure build passes before pushing
```

**Feature Conflicts**
```typescript
// Disable conflicting features temporarily
conflictingFeature: false,
// Resolve conflicts, re-enable
```

### Recovery

**Broken Main Branch** (rare in trunk-based development)
```bash
# Find last good commit
git log --oneline
# Reset to working state
git reset --hard <good-commit>
# Fix issues, recommit
```

## Benefits of This Approach

1. **Speed**: No branch management overhead
2. **Quality**: Always-working main branch
3. **Flexibility**: Easy feature rollbacks
4. **Collaboration**: No merge conflicts
5. **Deployment**: Any commit can be deployed
6. **Experimentation**: Safe to try new ideas

## Anti-Patterns to Avoid

❌ **Don't**: Create feature branches  
✅ **Do**: Use feature flags

❌ **Don't**: Large, infrequent commits  
✅ **Do**: Small, frequent commits

❌ **Don't**: Break main branch  
✅ **Do**: Keep main always working

❌ **Don't**: Leave broken features enabled  
✅ **Do**: Disable incomplete features

❌ **Don't**: Accumulate technical debt  
✅ **Do**: Clean up flags when features stabilize

---

## Quick Reference

```bash
# Start development
npm run dev

# Make changes, test locally
# Edit src/features.ts as needed

# Validate before committing
npm run ci

# Commit small changes frequently  
git add .
git commit -m "descriptive message"
git push origin main

# Repeat cycle multiple times per day
```

This development flow maximizes velocity while maintaining quality and deployability. The combination of trunk-based development and feature flags enables rapid, safe iteration on the game.
