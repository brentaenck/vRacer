# Release Checklist Template

**Copy this checklist for each release and check off items as completed**

## Release: vX.X.X - [Release Name]
**Target Date:** [YYYY-MM-DD]  
**Release Type:** [MAJOR|MINOR|PATCH]  
**Impact:** [HIGH|MEDIUM|LOW]

---

## 🚀 **Pre-Release Phase**

### Code Preparation
- [ ] All features are complete and tested
- [ ] Feature flags are properly set (enable/disable as needed)
- [ ] Debug features are disabled for production
- [ ] No broken or incomplete features are enabled
- [ ] All commits are on `main` branch

### Quality Gates
- [ ] `npm run ci` passes (TypeScript + build validation)
- [ ] `npm run preview` works correctly  
- [ ] Manual testing of core features completed
- [ ] New features tested with flags enabled/disabled
- [ ] Game loads without errors
- [ ] All major functionality verified

### Documentation Updates
- [ ] `package.json` version updated to vX.X.X
- [ ] `CHANGELOG.md` updated with:
  - [ ] New features section
  - [ ] Bug fixes section  
  - [ ] Improvements section
  - [ ] Technical changes section
- [ ] `RELEASE_NOTES.md` updated with:
  - [ ] Comprehensive release summary
  - [ ] Problem analysis (if bug fix)
  - [ ] Impact on functionality and developer experience
  - [ ] Quality assurance and validation details
  - [ ] Future development foundation notes
- [ ] `README.md` updated if needed (version badges, features list)
- [ ] Any new documentation created/updated

---

## 📦 **Release Creation**

### Version Commit
- [ ] Commit version updates:
  ```bash
  git add package.json CHANGELOG.md RELEASE_NOTES.md
  git commit -m "release: prepare vX.X.X - [Release Name]"
  ```

### Tag Creation  
- [ ] Create annotated release tag:
  ```bash
  git tag -a vX.X.X -m "vRacer vX.X.X - [Release Name]
  
  🎯 Highlights
  - Major feature 1
  - Major feature 2
  
  ✅ New Features
  - Feature A: Description
  - Feature B: Description
  
  🐛 Bug Fixes  
  - Fix for issue X
  - Fix for issue Y
  
  📈 Improvements
  - Enhancement A
  - Enhancement B
  
  🔧 Technical
  - Technical change A  
  - Technical change B"
  ```

### Push Release
- [ ] Push everything: `git push --follow-tags`
- [ ] Verify tag appears on GitHub

---

## 🌐 **GitHub Release**

### Release Page Creation
- [ ] Go to GitHub → Releases → "Create a new release"
- [ ] Select tag: `vX.X.X`  
- [ ] Set title: `vRacer vX.X.X - [Release Name]`
- [ ] Copy content from CHANGELOG.md for description
- [ ] Build and upload assets:
  ```bash
  npm run build
  # Upload dist/ folder contents to release
  ```

### Release Publishing
- [ ] Mark as "Latest release" (if applicable)
- [ ] Publish the release
- [ ] Verify release page looks correct

---

## ✅ **Post-Release Validation**

### Deployment Verification
- [ ] Visit live deployment and verify it works
- [ ] Test core features in production environment
- [ ] Check that new features are working as expected
- [ ] Verify performance is acceptable

### Communication
- [ ] Release announced (if applicable)
- [ ] Documentation links updated  
- [ ] Team notified of release completion

### Cleanup
- [ ] Close related GitHub issues
- [ ] Update project boards/milestones
- [ ] Plan next release cycle
- [ ] Clean up any temporary files or feature flags

---

## 🔄 **Next Steps**

### Immediate Actions
- [ ] Monitor for any critical issues
- [ ] Prepare hotfixes if needed
- [ ] Gather user feedback

### Future Planning  
- [ ] Plan next release features
- [ ] Update roadmap if needed
- [ ] Schedule next development cycle

---

## 📋 **Release Notes Template**

```markdown
# vRacer vX.X.X - [Release Name]

## 🎉 Highlights
- [Major highlight 1]
- [Major highlight 2]

## ✅ New Features  
- [Feature A]: [Description with user benefits]
- [Feature B]: [Description with user benefits]

## 🐛 Bug Fixes
- Fixed [issue X] that affected [user impact]
- Resolved [problem Y] causing [specific behavior]

## 📈 Improvements
- [Enhancement A] for [better user experience]  
- [Optimization B] for [performance improvement]

## 🔧 Technical
- [Technical change A] for [developer benefit]
- [Updated dependency X] to [version Y]

## 🚀 What's Next
- Preview of upcoming vX.(X+1).X features
- [Link to roadmap or next milestone]
```

---

**✅ Release Complete!** 

Date: [YYYY-MM-DD]  
Completed by: [Name]  
Final verification: [All items checked]
