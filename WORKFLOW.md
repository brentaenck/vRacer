# vRacer Workflow Quick Reference

## Daily Development

```bash
# Start
npm run dev

# Develop incrementally
# - Edit code
# - Test in browser  
# - Toggle features in src/features.ts

# Before each commit
npm run ci

# Commit frequently
git add .
git commit -m "feat: add collision detection data structures"
git push origin main
```

## Feature Development

### 1. Add Feature Flag
```typescript
// src/features.ts
export const FEATURES = {
  newFeature: false,  // Start disabled
}
```

### 2. Develop Incrementally
```bash
git commit -m "feat: add feature flag for X"
git commit -m "feat: add data structures for X"  
git commit -m "feat: add rendering for X"
git commit -m "feat: add interaction logic for X"
```

### 3. Enable When Ready
```typescript
// src/features.ts
newFeature: true,  // Enable for users
```

```bash
git commit -m "feat: enable feature X"
```

## Common Commands

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Production build
npm run preview                # Preview build

# Validation  
npm run type-check             # TypeScript check
npm run ci                     # Full validation

# Git shortcuts
npm run quick-commit "message" # git add . && git commit -m
git log --oneline              # View commit history
```

## Feature Flag Patterns

```typescript
// Simple toggle
if (isFeatureEnabled('debugMode')) {
  showDebugInfo()
}

// Alternative implementations
if (isFeatureEnabled('wallBounce')) {
  bounceOffWall()
} else {
  stopAtWall()  // Current behavior
}

// Progressive rollout
if (isFeatureEnabled('basicDamage')) {
  // Simple damage
} 
if (isFeatureEnabled('advancedDamage')) {
  // Complex damage system
}
```

## Commit Types

- `feat:` New feature
- `fix:` Bug fix  
- `docs:` Documentation
- `refactor:` Code cleanup
- `chore:` Maintenance

## Key Principles

✅ **Do**
- Commit multiple times per day
- Keep main branch always working
- Test before every commit
- Use feature flags for new work
- Make small, focused commits

❌ **Don't**
- Create feature branches
- Break the main branch
- Leave broken features enabled
- Make large commits
- Skip validation steps

---

**See [DEVELOPMENT.md](./DEVELOPMENT.md) for full documentation**
