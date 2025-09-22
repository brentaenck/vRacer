# Changelog

All notable changes to the vRacer Track Editor will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [5.2.2] - 2025-01-22

### Fixed
- **CRITICAL**: Fixed coordinate system mismatch between track editor and main vRacer game
- Fixed racing line waypoint hit detection (corrected hit radius from 8 to 0.4 grid units)
- Fixed racing line tool event handling conflicts with track tools
- Fixed "New Track" button not clearing all track elements (start/finish, checkpoints, etc.)
- Fixed racing line tool UI active states not updating correctly
- Fixed tool conflicts between track design and racing line modes

### Improved
- Updated coordinate system to match main game (top-left origin)
- Enhanced racing line tool separation and functionality
- Improved waypoint selection precision in racing mode
- Better editor state management and reset functionality
- More accurate grid position display in header

### Changed
- Separated racing line tools from track tools event handling
- Updated coordinate conversion functions for game compatibility
- Enhanced `loadBlankTemplate()` to completely clear all track elements

## [5.2.1] - Previous Release
- Initial unified track and racing line editor implementation

---

## Version Format

- **Major** (X.0.0): Breaking changes, major new features
- **Minor** (X.Y.0): New features, improvements, significant bug fixes
- **Patch** (X.Y.Z): Small bug fixes, minor improvements