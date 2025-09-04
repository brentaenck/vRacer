# Pull Request

## Description
Brief description of the changes in this PR.

## Type of Change
- [ ] 🐛 Bug fix (non-breaking change that fixes an issue)
- [ ] 🚀 New feature (non-breaking change that adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📚 Documentation update
- [ ] 🧹 Code cleanup/refactoring
- [ ] 🏷️ Release (version bump and changelog update)

## Related Issues
Closes #(issue_number)

## Testing
- [ ] I have tested these changes locally
- [ ] `npm run ci` passes (TypeScript + build)
- [ ] `npm run build` produces working production build
- [ ] Game functions correctly in browser
- [ ] No console errors when testing

## Feature Flags (if applicable)
- [ ] New features are behind feature flags in `src/features.ts`
- [ ] Features start disabled by default
- [ ] Feature flag documented in code comments

## Release Checklist (if version change)
- [ ] Version updated in `package.json`
- [ ] `CHANGELOG.md` updated with changes
- [ ] Release notes prepared
- [ ] All tests passing
- [ ] Production build tested
- [ ] Ready for GitHub Release creation

*See [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md) for full release process*

## Screenshots/Videos (if applicable)
<!-- Add any visual proof of your changes -->

## Additional Notes
<!-- Any additional information or context about this PR -->

---

**Development Workflow Reminders:**
- This project uses trunk-based development on `main` branch
- Feature flags control new functionality (see `src/features.ts`)
- Git hooks automatically run validation (pre-commit, pre-push)
- Follow conventional commit messages: `type(scope): description`
