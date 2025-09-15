/**
 * File Manager Module
 * 
 * Complete import/export functionality for track persistence and sharing
 */

const FileManager = {
    // Auto-save key for current work
    AUTO_SAVE_KEY: 'vRacer_autosave',
    
    // Save track to localStorage with name
    saveTrack(trackData, name) {
        if (!name || name.trim() === '') {
            throw new Error('Track name cannot be empty');
        }
        
        const cleanName = name.trim();
        const key = `vRacer_track_${cleanName}`;
        
        // Add save timestamp to metadata
        const trackWithTimestamp = {
            ...trackData,
            metadata: {
                ...trackData.metadata,
                name: cleanName,
                modifiedAt: new Date().toISOString()
            }
        };
        
        const success = StorageUtils.save(key, trackWithTimestamp);
        if (success) {
            console.log(`💾 Track '${cleanName}' saved to localStorage`);
        }
        return success;
    },
    
    // Load track from localStorage
    loadTrack(name) {
        const key = `vRacer_track_${name}`;
        const trackData = StorageUtils.load(key);
        if (trackData) {
            console.log(`📁 Track '${name}' loaded from localStorage`);
        }
        return trackData;
    },
    
    // Auto-save current track state
    autoSave(trackData) {
        const autoSaveData = {
            ...trackData,
            metadata: {
                ...trackData.metadata,
                autoSaved: true,
                autoSaveTime: new Date().toISOString()
            }
        };
        
        return StorageUtils.save(this.AUTO_SAVE_KEY, autoSaveData);
    },
    
    // Load auto-saved track
    loadAutoSave() {
        return StorageUtils.load(this.AUTO_SAVE_KEY);
    },
    
    // Check if auto-save exists
    hasAutoSave() {
        return this.loadAutoSave() !== null;
    },
    
    // Clear auto-save
    clearAutoSave() {
        return StorageUtils.remove(this.AUTO_SAVE_KEY);
    },
    
    // Export track as JSON file
    exportTrack(trackData, filename) {
        // Clean up the data for export (remove auto-save flags, etc.)
        const exportData = {
            ...trackData,
            metadata: {
                ...trackData.metadata,
                exportedAt: new Date().toISOString(),
                exportedFrom: 'vRacer Track Editor v1.0.0'
            }
        };
        
        // Remove auto-save specific fields
        delete exportData.metadata.autoSaved;
        delete exportData.metadata.autoSaveTime;
        
        const jsonData = JSON.stringify(exportData, null, 2);
        const trackName = trackData.metadata?.name || 'untitled';
        const sanitizedName = trackName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const finalFilename = filename || `${sanitizedName}_track.json`;
        
        FileUtils.downloadAsFile(jsonData, finalFilename);
        console.log(`📤 Track exported as ${finalFilename}`);
    },
    
    // Import track from JSON file
    async importTrack() {
        try {
            const file = await FileUtils.selectFile('.json');
            if (!file) return null;
            
            const content = await FileUtils.readFileAsText(file);
            const trackData = JSON.parse(content);
            
            // Validate imported track structure
            if (!this.validateTrackStructure(trackData)) {
                throw new Error('Invalid track file format');
            }
            
            // Add import metadata
            trackData.metadata = {
                ...trackData.metadata,
                importedAt: new Date().toISOString(),
                importedFrom: file.name,
                originalName: trackData.metadata?.name || 'Imported Track'
            };
            
            console.log(`📥 Track imported from ${file.name}`);
            return trackData;
            
        } catch (error) {
            console.error('Failed to import track:', error);
            throw error;
        }
    },
    
    // Validate track data structure
    validateTrackStructure(trackData) {
        if (!trackData || typeof trackData !== 'object') return false;
        if (!trackData.metadata || typeof trackData.metadata !== 'object') return false;
        if (!trackData.track || typeof trackData.track !== 'object') return false;
        if (!Array.isArray(trackData.track.outer)) return false;
        if (!Array.isArray(trackData.track.inner)) return false;
        if (!trackData.racingLine || typeof trackData.racingLine !== 'object') return false;
        if (!Array.isArray(trackData.racingLine.waypoints)) return false;
        
        return true;
    },
    
    // List saved tracks with metadata
    listSavedTracks() {
        const tracks = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('vRacer_track_') && key !== this.AUTO_SAVE_KEY) {
                const name = key.replace('vRacer_track_', '');
                const trackData = StorageUtils.load(key);
                
                if (trackData && trackData.metadata) {
                    tracks.push({
                        name,
                        displayName: trackData.metadata.name || name,
                        author: trackData.metadata.author || 'Unknown',
                        difficulty: trackData.metadata.difficulty || 'Medium',
                        created: trackData.metadata.created || 'Unknown',
                        modified: trackData.metadata.modifiedAt || trackData.metadata.created || 'Unknown',
                        pointCount: (trackData.track?.outer?.length || 0) + (trackData.track?.inner?.length || 0),
                        waypointCount: trackData.racingLine?.waypoints?.length || 0
                    });
                } else {
                    // Legacy track without proper metadata
                    tracks.push({
                        name,
                        displayName: name,
                        author: 'Unknown',
                        difficulty: 'Unknown',
                        created: 'Unknown',
                        modified: 'Unknown',
                        pointCount: 0,
                        waypointCount: 0
                    });
                }
            }
        }
        
        // Sort by modified date (newest first)
        tracks.sort((a, b) => {
            const dateA = new Date(a.modified);
            const dateB = new Date(b.modified);
            return dateB.getTime() - dateA.getTime();
        });
        
        return tracks;
    },
    
    // Delete saved track
    deleteTrack(name) {
        const key = `vRacer_track_${name}`;
        const success = StorageUtils.remove(key);
        if (success) {
            console.log(`🗑️ Track '${name}' deleted from localStorage`);
        }
        return success;
    },
    
    // Rename saved track
    renameTrack(oldName, newName) {
        if (!newName || newName.trim() === '') {
            throw new Error('New track name cannot be empty');
        }
        
        const cleanNewName = newName.trim();
        const oldKey = `vRacer_track_${oldName}`;
        const newKey = `vRacer_track_${cleanNewName}`;
        
        // Check if new name already exists
        if (StorageUtils.load(newKey) !== null) {
            throw new Error(`Track named '${cleanNewName}' already exists`);
        }
        
        const trackData = StorageUtils.load(oldKey);
        if (!trackData) {
            throw new Error(`Track '${oldName}' not found`);
        }
        
        // Update metadata with new name
        trackData.metadata = {
            ...trackData.metadata,
            name: cleanNewName,
            modifiedAt: new Date().toISOString()
        };
        
        // Save with new name and delete old
        const saveSuccess = StorageUtils.save(newKey, trackData);
        if (saveSuccess) {
            StorageUtils.remove(oldKey);
            console.log(`✏️ Track renamed from '${oldName}' to '${cleanNewName}'`);
            return true;
        }
        
        return false;
    },
    
    // Get storage usage info
    getStorageInfo() {
        const tracks = this.listSavedTracks();
        const hasAutoSave = this.hasAutoSave();
        
        return {
            trackCount: tracks.length,
            hasAutoSave,
            storageUsed: this.calculateStorageUsage(),
            tracks
        };
    },
    
    // Calculate approximate localStorage usage
    calculateStorageUsage() {
        let totalSize = 0;
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('vRacer_')) {
                const value = localStorage.getItem(key);
                totalSize += key.length + (value ? value.length : 0);
            }
        }
        
        // Convert to KB
        return Math.round(totalSize / 1024 * 100) / 100;
    }
};

// Export to global scope
if (typeof window !== 'undefined') {
    window.FileManager = FileManager;
}