#!/usr/bin/env node

/**
 * vRacer Release Notes Template Generator
 * 
 * This script helps generate a template for RELEASE_NOTES.md entries
 * by analyzing the current version and staged changes.
 */

import fs from 'fs'
import { execSync } from 'child_process'

function getCurrentVersion() {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
    return packageJson.version
  } catch (error) {
    console.error('❌ Error reading package.json:', error.message)
    process.exit(1)
  }
}

function getChangelogEntries() {
  try {
    const changelog = fs.readFileSync('CHANGELOG.md', 'utf8')
    const lines = changelog.split('\n')
    const unreleased = []
    let inUnreleased = false
    
    for (const line of lines) {
      if (line.startsWith('## [Unreleased]')) {
        inUnreleased = true
        continue
      }
      if (line.startsWith('## [') && inUnreleased) {
        break
      }
      if (inUnreleased && line.trim()) {
        unreleased.push(line)
      }
    }
    
    return unreleased.filter(line => line.startsWith('- ') || line.startsWith('### '))
  } catch (error) {
    return []
  }
}

function generateTemplate(version, releaseType = 'patch') {
  const today = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
  
  const changelogEntries = getChangelogEntries()
  const hasChanges = changelogEntries.length > 0
  
  return `## 🔧 v${version} - [Release Title]
*Released: ${today}*

### **✅ Release Summary**

**Release Type**: ${releaseType.charAt(0).toUpperCase() + releaseType.slice(1)} release (vX.X.X → v${version})  
**Focus**: [Brief description of main focus/theme of this release]

### **🚨 Major Changes** ${releaseType === 'patch' ? '(if bug fix)' : ''}

#### **The Problem** ${releaseType === 'patch' ? '(if applicable)' : ''}
${releaseType === 'patch' ? '- [Description of the issue that was fixed]' : '- [Description of what prompted these changes]'}

#### **The Solution**
- [What was implemented/fixed]
- [Key improvements made]

### **🔧 Implementation Details**

#### **1. [Module/Component] Changes**
- ✅ [Specific change 1]
- ✅ [Specific change 2]
- ✅ [Specific change 3]

${hasChanges ? `
#### **Technical Changes** (from CHANGELOG.md)
${changelogEntries.map(entry => entry.replace(/^-/, '- ✅')).join('\n')}
` : ''}

### **🎯 Impact on Functionality**

**Before Changes**:
- ❌ [What was problematic/missing]
- ❌ [User pain points]

**After Changes**:
- ✅ [What is now improved]
- ✅ [Benefits to users/developers]

### **🔍 Validation and Quality Assurance**

#### **Technical Validation**
- ✅ **TypeScript Compilation**: Zero errors
- ✅ **Production Build**: Successful ([size] kB)
- ✅ **Automated Testing**: Pre-commit and pre-push hooks passed
- ✅ **[Other validations]**: [Description]

### **🚀 Release Process Excellence**

#### **Professional Release Management**
- ✅ **Semantic Versioning**: Proper ${releaseType} release for [reason]
- ✅ **Conventional Commits**: Detailed commit message following established format
- ✅ **Comprehensive Documentation**: Updated both CHANGELOG.md and RELEASE_NOTES.md
- ✅ **Git Tagging**: Annotated tag with complete release notes
- ✅ **Quality Gates**: All automated validation hooks passed successfully

### **📊 Developer Experience Impact**

**For [Target Audience 1]**:
- **[Benefit 1]**: [Description]
- **[Benefit 2]**: [Description]

**For [Target Audience 2]**:
- **[Benefit 1]**: [Description]
- **[Benefit 2]**: [Description]

### **🔮 Future Development Foundation**

This release establishes:
- **[Foundation 1]**: [Description]
- **[Foundation 2]**: [Description]
- **[Foundation 3]**: [Description]

---
`
}

function main() {
  const version = getCurrentVersion()
  const args = process.argv.slice(2)
  const releaseType = args[0] || 'patch'
  
  if (!['major', 'minor', 'patch'].includes(releaseType)) {
    console.error('❌ Invalid release type. Use: major, minor, or patch')
    process.exit(1)
  }
  
  console.log('🔧 vRacer Release Notes Template Generator')
  console.log(`📦 Version: v${version}`)
  console.log(`📋 Type: ${releaseType} release`)
  console.log('')
  
  const template = generateTemplate(version, releaseType)
  
  console.log('📝 Template generated! Copy this to RELEASE_NOTES.md:')
  console.log(''.padEnd(60, '='))
  console.log(template)
  console.log(''.padEnd(60, '='))
  console.log('')
  console.log('💡 Tips:')
  console.log('- Replace [placeholders] with actual content')
  console.log('- Add specific details about changes made')
  console.log('- Include impact analysis for users and developers')
  console.log('- Validate that all sections are complete before committing')
  console.log('')
  console.log('📋 Next steps:')
  console.log('1. Copy template above into RELEASE_NOTES.md')
  console.log('2. Fill in all [placeholder] sections')
  console.log('3. Add to git: git add RELEASE_NOTES.md')
  console.log('4. Commit: git commit -m "release: prepare v' + version + ' - [description]"')
}

// Run if this file is executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  main()
}
