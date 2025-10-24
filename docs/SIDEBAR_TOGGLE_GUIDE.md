# Sidebar Toggle Feature

## 🎯 Overview

The sidebar now includes a toggle functionality that allows users to collapse and expand the sidebar on both desktop and mobile devices. The sidebar state is persisted in localStorage.

## ✨ Features

### Desktop (≥ 992px)
- **Toggle Button**: Located in the top navigation bar (left side)
- **Icon Changes**: 
  - Expanded: `pi-arrow-left` (←)
  - Collapsed: `pi-arrow-right` (→)
- **Collapsed Width**: 4.5rem (72px)
- **Expanded Width**: 16rem (256px)
- **Smooth Transition**: 300ms ease-in-out animation
- **State Persistence**: Sidebar state is saved to localStorage

### Mobile (< 992px)
- **Hamburger Menu**: Located in the top navigation bar
- **Icon**: `pi-bars` (≡)
- **Overlay**: Dark overlay appears when sidebar is open
- **Full Width**: Sidebar takes full 16rem width
- **Slide Animation**: Sidebar slides from left

## 🎨 Visual Changes

### Expanded Sidebar
```
┌──────────────┐
│  🏢 Management │
├──────────────┤
│ Overview     │
│ 🏠 Dashboard │
│ 📊 Analytics │
│              │
│ Finance      │
│ 💰 Accounts  │
└──────────────┘
```

### Collapsed Sidebar
```
┌───┐
│ 🏢 │
├───┤
│ Ov│
│ 🏠 │
│ 📊 │
│    │
│ Fi │
│ 💰 │
└───┘
```

## 🔧 Implementation Details

### SidebarService

New service created at `src/app/core/services/sidebar.service.ts`

**Properties:**
- `isOpen: Signal<boolean>` - Desktop sidebar state
- `isMobileOpen: Signal<boolean>` - Mobile sidebar state

**Methods:**
- `toggle()` - Toggle desktop sidebar
- `open()` - Open desktop sidebar
- `close()` - Close desktop sidebar
- `toggleMobile()` - Toggle mobile sidebar
- `openMobile()` - Open mobile sidebar
- `closeMobile()` - Close mobile sidebar

**Usage:**
```typescript
import { SidebarService } from './core/services/sidebar.service';

constructor(public sidebarService: SidebarService) {}

// Toggle sidebar
this.sidebarService.toggle();

// Check if open
const isOpen = this.sidebarService.isOpen();
```

### Updated Components

#### 1. Sidebar Component
- Uses `sidebarService.isOpen()` for desktop state
- Uses `sidebarService.isMobileOpen()` for mobile state
- Conditionally renders labels based on collapse state
- Added `.collapsed` class for styling

#### 2. Top Navigation Component
- Added desktop toggle button (hidden on mobile)
- Added mobile toggle button (hidden on desktop)
- Icons change based on sidebar state

#### 3. Main Layout Component
- Injects `SidebarService`
- Applies `.sidebar-collapsed` class when sidebar is collapsed
- Adjusts layout spacing

## 🎨 CSS Classes

### Sidebar States
```scss
.sidebar {
  width: 16rem; // Expanded
  
  &.collapsed {
    width: 4.5rem; // Collapsed (desktop only)
  }
  
  &.mobile-open {
    transform: translateX(0); // Mobile visible
  }
}
```

### Layout States
```scss
.main-layout {
  &.sidebar-collapsed {
    app-sidebar {
      flex: 0 0 4.5rem;
    }
  }
}
```

## 📱 Responsive Behavior

| Screen Size | Button Location | Behavior |
|------------|----------------|----------|
| < 992px | Top-nav (hamburger) | Opens sidebar with overlay |
| ≥ 992px | Top-nav (arrow) | Collapses sidebar in place |

## 💾 LocalStorage

The sidebar state is persisted in localStorage with the key:
```javascript
'sidebar_open' // true or false
```

This means the sidebar will remember its state across page refreshes and sessions.

## 🎯 User Experience

### Desktop Flow
1. User clicks arrow button in top-nav
2. Sidebar animates to collapsed state (4.5rem width)
3. Navigation labels hide
4. Icons remain visible and centered
5. State saves to localStorage

### Mobile Flow
1. User clicks hamburger menu
2. Sidebar slides in from left
3. Dark overlay appears
4. User can close by:
   - Clicking overlay
   - Clicking hamburger again
   - Navigating to a route

## 🔄 Animations

All transitions use CSS for optimal performance:

```scss
transition: width 0.3s ease-in-out, transform 0.2s ease-in-out;
```

## 🎨 Customization

### Change Collapsed Width
Edit `sidebar.component.scss`:
```scss
&.collapsed {
  width: 5rem; // Your custom width
}
```

### Change Animation Speed
```scss
transition: width 0.5s ease-in-out; // Slower animation
```

### Change Breakpoint
Update media queries in all components:
```scss
@media (min-width: 1024px) { // New breakpoint
  // Desktop styles
}
```

## 🐛 Troubleshooting

### Sidebar doesn't collapse
- Check if `SidebarService` is properly injected
- Verify localStorage is accessible
- Check browser console for errors

### Animation is jerky
- Ensure GPU acceleration with `transform` instead of `left`
- Check if too many transitions are defined
- Verify `will-change` property isn't overused

### State not persisting
- Check localStorage permissions
- Verify key name: `'sidebar_open'`
- Check if localStorage is cleared on logout

## 📊 Testing

### Manual Testing
1. **Desktop Collapse**: Click arrow button, verify sidebar collapses
2. **Desktop Expand**: Click arrow again, verify sidebar expands
3. **Mobile Open**: Click hamburger, verify sidebar slides in
4. **Mobile Close**: Click overlay, verify sidebar closes
5. **Persistence**: Refresh page, verify state is maintained
6. **Responsive**: Resize window, verify behavior changes at 992px

### Test Checklist
- [ ] Desktop toggle button works
- [ ] Mobile hamburger works
- [ ] Icons change correctly
- [ ] Labels hide when collapsed
- [ ] Animation is smooth
- [ ] State persists after refresh
- [ ] Overlay works on mobile
- [ ] Layout adjusts properly
- [ ] No console errors
- [ ] Works in dark mode

## 🚀 Future Enhancements

- [ ] Add keyboard shortcuts (Ctrl+B to toggle)
- [ ] Add animation preferences (reduced motion)
- [ ] Add hover to expand on collapsed state
- [ ] Add tooltip on collapsed menu items
- [ ] Add section dividers even when collapsed
- [ ] Add mini labels on hover (collapsed state)

---

**Toggle sidebar to improve your workspace! 🎉**
