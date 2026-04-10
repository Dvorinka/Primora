# PRIMORA — Frontend System Architecture (SolidJS / React Hybrid)

A modern, developer-focused UI system for Primora.

---

## Table of Contents

- [🧠 Frontend Philosophy](#-frontend-philosophy)
- [⚙️ Tech Stack](#-tech-stack)
  - [Default Stack (Primary)](#default-stack-primary)
  - [Fallback Stack](#fallback-stack)
- [UI Libraries](#ui-libraries)
- [🎨 UI System Design](#-ui-system-design)
  - [Core Visual Language](#core-visual-language)
  - [Color System](#color-system)
  - [Grid System](#grid-system)
  - [Core UI Components](#core-ui-components)
- [⚡ Interaction Design](#-interaction-design)
- [♿ Accessibility](#-accessibility)
- [📱 Responsiveness](#-responsiveness)
- [🧠 Component Strategy](#-component-strategy)
- [🚀 Summary](#-summary)

---

## 🧠 Frontend Philosophy

- UI is a **control surface**, not decoration
- Everything is data-first
- Navigation is project-centric
- Components are reusable system blocks
- Minimal runtime overhead

---

## ⚙️ Tech Stack

### Default Stack (Primary)

- SolidJS (preferred)
- Vite
- TypeScript (strict mode)
- Tailwind CSS

### Fallback Stack

React is ONLY used when:
- The ecosystem requires it
- A third-party library is React-only
- Migration constraints exist

---

## UI Libraries

- Ark UI (Solid)
- shadcn-solid (preferred implementation layer)
- shadcn/ui (React fallback)

---

## 🎨 UI System Design

### Core Visual Language

- Dark-first UI system
- Blue accent: `#19a3d9`
- Card-based layout system
- Soft borders, minimal shadows
- High contrast typography hierarchy

### Color System

```css
:root {
  --bg-main: #131315;
  --bg-subtle: #19191c;
  --bg-elevated: #1d1d21;

  --surface-2: #2d2d31;
  --surface-3: #4a4a4d;

  --border: #252529;
  --border-strong: #3e3e42;

  --text-primary: #ededf0;
  --text-secondary: #bebec4;
  --text-muted: #5b5b5f;

  --accent: #19a3d9;
}
```

**Typography**
- Primary: Inter
- Brand: Aeonik Pro
- Mono: Fira Code

**Hierarchy:**
- H1: product pages
- H2: sections
- H3: cards
- body: default
- small: metadata

### 🧱 Layout System

**Global Layout Pattern**
```
Sidebar → Context Header → Content Grid → Detail Panels
```

### Grid System

- 12-column responsive grid
- Auto-fit dashboard cards

```css
.grid {
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}
```

**Spacing System**
- Base unit: 8px
- Card padding: 16–24px
- Section spacing: 24–40px

**Border Radius**
```css
:root {
  --radius: 12px;
}
```

Applied consistently across:
- Cards
- Inputs
- Buttons
- Modals

### 🧩 Core UI Components

1. **Dashboard Card**
   - Used for:
     - Metrics
     - Stats
     - Charts
   - Structure:
     - Label (muted)
     - Value (primary)
     - Optional chart

2. **Sidebar Navigation**
   - Persistent left layout
   - Icon + label
   - Active state highlight (accent background)
   - Collapsible groups

   **Active state:**
   ```css
   background: rgba(25, 163, 217, 0.12);
   border-left: accent line;
   ```

3. **Tables**
   - Used for:
     - Users
     - Logs
     - Files
     - API keys
   - Design:
     - Minimal borders
     - Hover highlight
     - Compact spacing
     - Fast scan readability

4. **File Explorer UI**
   - Tree navigation (left)
   - File list (center)
   - Optional preview panel (right)

   **Features:**
   - Drag & drop upload
   - Streaming upload
   - Instant metadata fetch

5. **Charts**
   - Minimal grid lines
   - Single accent color
   - No heavy gradients
   - Focus on readability

6. **Buttons**
   - **Primary:**
     ```css
     background: #19a3d9;
     color: white;
     ```
   - **Secondary:**
     ```css
     background: surface-based;
     border: subtle border;
     ```

---

## ⚡ Interaction Design

- Hover: 150ms ease
- Modal open: 200ms
- No excessive animations
- Instant navigation priority

---

## ♿ Accessibility

**Mandatory Features:**
- Full ARIA labeling
- Keyboard navigation support
- Visible focus states
- Contrast compliance (WCAG AA minimum)
- Screen reader compatibility

---

## 📱 Responsiveness

- Mobile-first layout scaling
- Sidebar collapses into drawer
- Tables become stacked cards on small screens
- Charts remain responsive

---

## 🧠 Component Strategy

- Fully reusable primitives
- No page-specific UI components
- Composition over inheritance
- Predictable props structure

---

## 🚀 Summary

Primora frontend is:

A fast, accessible, system-driven developer UI built with SolidJS-first architecture and React compatibility fallback.

It prioritizes:
- Speed
- Clarity
- Accessibility
- Consistency
- Developer ergonomics