# vRacer UI Wireframe & Layout Documentation

## 🎨 Complete UI Layout Wireframe

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    HEADER (Banner)                                      │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐  ┌─────────────────┐  │
│  │        BRAND SECTION        │  │         HUD SECTION         │  │    CONTROLS     │  │
│  │  🏁 vRacer [v2.0.0]        │  │  Player 1's Turn            │  │  [🔄 Reset]     │  │
│  │  Professional Vector Racing │  │  pos=(7,20) vel=(0,0)      │  │  [☑Grid]       │  │
│  └─────────────────────────────┘  │  lap: 0/3 | FPS: 60        │  │  [☑Moves]      │  │
│                                    └─────────────────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                 MAIN CONTENT AREA                                       │
│                                                                                         │
│  ┌───────────────────────────────────────────────────┐  ┌─────────────────────────────┐ │
│  │                                                   │  │                             │ │
│  │                GAME CANVAS                        │  │          SIDEBAR            │ │
│  │                                                   │  │        (320px wide)         │ │
│  │  ┌─────────────────────────────────────────────┐  │  │                             │ │
│  │  │              TRACK AREA                     │  │  │ ┌─────────────────────────┐ │ │
│  │  │   ╭─────────────────────────────────────╮   │  │  │ │    📊 GAME STATUS      │ │ │
│  │  │  ╱                                       ╲  │  │  │ │                         │ │ │
│  │  │ ╱        🚗 🚗 Multi-car Racing           ╲ │  │  │ │ Player 1's Turn         │ │ │
│  │  │ │    ╔══════════════════════════════╗     │ │  │  │ │ pos=(7,20) vel=(0,0)   │ │ │
│  │  │ │    ║                              ║     │ │  │  │ │ lap: 0/3                │ │ │
│  │  │ │🏁  ║     Track Inner Area         ║     │ │  │  │ │                         │ │ │
│  │  │ │    ║                              ║     │ │  │  │ │ 🏁 Leaderboard:        │ │ │
│  │  │ │    ╚══════════════════════════════╝     │ │  │  │ │ 1. Player 1: Lap 0/3   │ │ │
│  │  │ ╲                                         ╱ │  │  │ │ 2. Player 2: Lap 0/3   │ │ │
│  │  │  ╲                                       ╱  │  │  │ └─────────────────────────┘ │ │
│  │                                                   │  │ ┌─────────────────────────┐ │ │
│  │                                                   │  │ │    ❓ HOW TO PLAY       │ │ │
│  │                                                   │  │ │                         │ │ │
│  │                                                   │  │ │ 🎯 Objective            │ │ │
│  │                                                   │  │ │ • Complete 3 laps       │ │ │
│  │                                                   │  │ │ • Cross finish line     │ │ │
│  │                                                   │  │ │                         │ │ │
│  │  └─────────────────────────────────────────────┘  │  │ │ 🕹️ Controls            │ │ │
│  │                                                   │  │ │ • Mouse: Click nodes    │ │ │
│  │                                                   │  │ │ • Keyboard: WASD        │ │ │
│  │                                                   │  │ │ • Diagonals: Q/E/Z/X    │ │ │
│  │                                                   │  │ │                         │ │ │
│  │                                                   │  │ │ ⚡ Physics              │ │ │
│  │                                                   │  │ │ • Velocity changes ±1   │ │ │
│  │                                                   │  │ │ • Cars have momentum    │ │ │
│  │                                                   │  │ │                         │ │ │
│  │                                                   │  │ │ ⌨️ Shortcuts            │ │ │
│  │                                                   │  │ │ • R - Reset game        │ │ │
│  │                                                   │  │ │ • G - Toggle grid       │ │ │
│  │                                                   │  │ │ • C - Toggle moves      │ │ │
│  │                                                   │  │ │ • H - Toggle help       │ │ │
│  │                                                   │  │ └─────────────────────────┘ │ │
│  │                                                   │  │                             │ │
│  │                                                   │  │ ┌─────────────────────────┐ │ │
│  │                                                   │  │ │    🚀 FEATURES          │ │ │
│  │                                                   │  │ │                         │ │ │
│  │                                                   │  │ │ [Multi-Car Racing]      │ │ │
│  │                                                   │  │ │ [Car Collisions]        │ │ │
│  │                                                   │  │ │ [Advanced Controls]     │ │ │
│  │                                                   │  │ │ [Particle Effects]      │ │ │
│  │                                                   │  │ │ [Performance Metrics]   │ │ │
│  │                                                   │  │ └─────────────────────────┘ │ │
│  └───────────────────────────────────────────────────┘  └─────────────────────────────┘ │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                   FOOTER (Content Info)                                 │
│                                                                                         │
│  vRacer v2.0.0 • Professional Vector Racing Game    MIT License • View Source          │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 📱 Responsive Layout Variations

### Desktop Layout (>1024px)
```
[Header: Full horizontal layout]
[Main: Two-column grid - Canvas | Sidebar]
[Footer: Two-column info layout]
```

### Tablet Layout (768px-1024px)
```
[Header: Stacked brand and controls]
[Main: Single column - Canvas above, Sidebar below (collapsed)]
[Footer: Centered single column]
```

### Mobile Layout (<768px)
```
[Header: Vertical stack with smaller text]
[Main: Single column, Sidebar max-height 300px]
[Footer: Single column, centered]
```

---

## 🎯 Detailed UI Area Descriptions

### 1. 🏁 **HEADER SECTION** (Banner Role)

**Purpose**: Primary navigation and branding area with game controls
**Layout**: Flexbox with space-between alignment

#### **Brand Section** (Left Side)
- **Logo**: 🏁 vRacer with gradient text effect (#00d4ff to #4488ff)
- **Version Badge**: Small pill showing "v2.0.0"
- **Tagline**: "Professional Vector Racing" in uppercase
- **Visual Effects**: Text shadow with cyan glow, premium typography

#### **HUD Section** (Center)
- **Player Turn**: Shows current active player in their color
- **Position/Velocity**: Real-time car coordinates and speed vector
- **Lap Progress**: Current lap vs total laps (e.g., "lap: 0/3")
- **Performance Metrics**: FPS and debug info when enabled
- **Responsive**: Collapses on mobile, essential info only

#### **Controls Section** (Right Side)  
- **Reset Button**: Red gradient button with 🔄 icon and hover effects
- **Toggle Controls**: Three checkboxes for Grid, Moves (candidates), Help
- **Interaction**: Smooth hover transitions, accessibility-focused design
- **Mobile**: Stacks vertically on small screens

### 2. 🎮 **MAIN GAME CANVAS** (Application Role)

**Purpose**: Primary game interaction area with track and cars
**Dimensions**: Responsive, maintains aspect ratio
**Features**: 
- **Track Rendering**: Outer/inner track polygons with racing colors
- **Multi-car Support**: Up to 8 colored cars with individual trails  
- **Interactive Elements**: Clickable move candidates, hover effects
- **Visual Effects**: Particle systems for collisions and celebrations

#### **Track Elements**
- **Checkered Start/Finish Line**: Professional 2D black-white pattern
- **Directional Arrows**: Show counter-clockwise racing direction
- **Grid System**: Optional overlay for precise positioning
- **Boundaries**: Clear visual track limits with collision detection

#### **Car Visualization**
- **Multiple Cars**: Each with unique colors (#ff4444 red, #44ff44 green, etc.)
- **Trail System**: Shows movement history with varying opacity
- **Current Player**: Highlighted with glow effect and brighter trail
- **Status Indicators**: Crashed cars faded, finished cars enlarged


### 3. 📊 **SIDEBAR** (Complementary Role)

**Purpose**: Game information, help content, and feature display
**Width**: 320px on desktop, full-width on mobile
**Scroll**: Vertical overflow with custom styled scrollbar

#### **Game Status Section**
- **Current Turn**: Shows active player name in player color
- **Car Information**: Position, velocity, lap progress
- **Leaderboard**: Real-time race standings with finish times
- **Race Status**: Win conditions, finish notifications

#### **Help Content Section** (Categorized)

**🎯 Objective**
- Complete 3 laps around the track
- Cross checkered finish line in correct direction  
- Beat other players in multi-car races

**🕹️ Controls**
- **Mouse**: Click highlighted nodes to move
- **Keyboard**: WASD or arrow keys for movement
- **Diagonals**: Q/E/Z/X keys for diagonal movement
- **Coast**: Space or Enter for zero acceleration
- **Undo**: U or Ctrl+Z for move reversal

**⚡ Physics**
- Velocity changes by -1, 0, or +1 each turn
- Cars have momentum - planning required
- Stay within track boundaries to avoid crashes
- Car-to-car collision detection active

**⌨️ Shortcuts**
- **R**: Reset game
- **G**: Toggle grid display
- **C**: Toggle move candidates
- **H**: Toggle help panel

#### **Features Section**
- **Feature Badges**: Green pills showing enabled features
- **Current Status**: Multi-Car Racing, Car Collisions, Advanced Controls
- **Visual Indicators**: Success-colored badges with subtle glow effects

### 4. 🌐 **FOOTER** (Content Info Role)

**Purpose**: Project information and external links
**Layout**: Flexbox with space-between on desktop, centered on mobile

#### **Project Information** (Left Side)
- **Name & Version**: vRacer v2.0.0
- **Description**: Professional Vector Racing Game
- **Color**: Accent blue for project name

#### **Legal & Links** (Right Side)
- **License**: MIT License declaration
- **Source Link**: GitHub repository link with hover effects
- **Accessibility**: Proper external link attributes (target="_blank", rel="noopener")

---

## 🎨 **Design System Colors**

### **Primary Palette**
- **Background Primary**: `#0a0a0b` (Deep black)
- **Background Secondary**: `#161618` (Dark charcoal)  
- **Background Tertiary**: `#1e1e20` (Medium charcoal)
- **Text Primary**: `#ffffff` (Pure white)
- **Text Accent**: `#00d4ff` (Cyan blue)

### **Racing Colors**
- **Red Car**: `#ff4444`
- **Green Car**: `#44ff44` 
- **Blue Car**: `#4444ff`
- **Yellow Car**: `#ffcc00`

### **Status Colors**
- **Success**: `#22c55e` (Green)
- **Warning**: `#f59e0b` (Orange)
- **Error**: `#ef4444` (Red)

---

## 📐 **Layout Specifications**

### **Grid System**
- **Main Layout**: CSS Grid with `1fr 320px` columns
- **Mobile Breakpoint**: Single column below 1024px
- **Responsive**: Fluid sizing with max-width constraints

### **Typography**
- **Primary Font**: Inter (Google Fonts) for UI text
- **Monospace Font**: JetBrains Mono for game data/code
- **Font Weights**: 400 (normal), 500 (medium), 600 (semibold), 700 (bold)

### **Spacing System** 
- **XS**: 4px, **SM**: 8px, **MD**: 12px, **LG**: 16px, **XL**: 24px, **2XL**: 32px
- **Consistent**: All spacing uses CSS custom properties

### **Interactive States**
- **Hover**: 0.15s ease-out transitions with transform/color changes
- **Focus**: 2px accent-colored outline with offset
- **Active**: Pressed state with reduced transform

This comprehensive UI system creates a professional, accessible, and visually appealing racing game interface that works seamlessly across all device sizes! 🏁

