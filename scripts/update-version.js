#!/usr/bin/env node

/**
 * Version Update Script
 * 
 * This script ensures all version references in the codebase
 * are synchronized with the version in package.json.
 * 
 * Usage: node scripts/update-version.js
 * Or: npm run update-version
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function updateVersion() {
  try {
    // Read version from package.json
    const packageJsonPath = path.join(__dirname, '../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const version = packageJson.version;
    
    console.log(`🔄 Updating all version references to v${version}`);
    
    // Update track editor HTML console log
    const trackEditorPath = path.join(__dirname, '../track-editor/index.html');
    let trackEditorContent = fs.readFileSync(trackEditorPath, 'utf-8');
    
    // Update the console log version in track editor
    trackEditorContent = trackEditorContent.replace(
      /console\.log\(`🏁 vRacer Track Editor v[\d.]+`\);/,
      `console.log(\`🏁 vRacer Track Editor v${version}\`);`
    );
    
    fs.writeFileSync(trackEditorPath, trackEditorContent);
    console.log(`✅ Updated track-editor/index.html to v${version}`);
    
    // Update main HTML placeholders (these will be dynamically updated at runtime)
    const mainHtmlPath = path.join(__dirname, '../index.html');
    let mainHtmlContent = fs.readFileSync(mainHtmlPath, 'utf-8');
    
    // Update header version placeholder
    mainHtmlContent = mainHtmlContent.replace(
      /<span class="version" id="appVersion">v[\d.]+<\/span>/,
      `<span class="version" id="appVersion">v${version}</span>`
    );
    
    // Update footer version placeholder
    mainHtmlContent = mainHtmlContent.replace(
      /<strong id="footerVersion">vRacer v[\d.]+<\/strong>/,
      `<strong id="footerVersion">vRacer v${version}</strong>`
    );
    
    fs.writeFileSync(mainHtmlPath, mainHtmlContent);
    console.log(`✅ Updated index.html placeholders to v${version}`);
    
    console.log(`🎉 All version references updated to v${version}`);
    console.log(`📝 Note: The main app will dynamically inject the version from package.json at runtime`);
    
  } catch (error) {
    console.error('❌ Error updating versions:', error);
    process.exit(1);
  }
}

// Run the update
updateVersion();