import { defineConfig } from 'vite'
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { glob } from 'glob'

function copyTrackEditor() {
  return {
    name: 'copy-track-editor',
    writeBundle() {
      const sourceDir = 'track-editor'
      const targetDir = 'dist/track-editor'
      
      // Create target directory if it doesn't exist
      if (!existsSync(targetDir)) {
        mkdirSync(targetDir, { recursive: true })
      }
      
      // Copy all files from track-editor to dist/track-editor
      try {
        const files = glob.sync('track-editor/**/*', { nodir: true })
        files.forEach(file => {
          const targetFile = file.replace('track-editor/', 'dist/track-editor/')
          const targetFileDir = dirname(targetFile)
          
          // Create subdirectories if needed
          if (!existsSync(targetFileDir)) {
            mkdirSync(targetFileDir, { recursive: true })
          }
          
          copyFileSync(file, targetFile)
        })
        
        console.log('✅ Track editor files copied to dist/')
      } catch (error) {
        console.error('❌ Failed to copy track editor files:', error)
      }
    }
  }
}

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true
  },
  plugins: [copyTrackEditor()],
  define: {
    __APP_VERSION__: JSON.stringify(JSON.parse(readFileSync('package.json', 'utf-8')).version)
  }
})

