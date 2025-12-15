# Tablet Optimization Guide

This document describes the tablet-specific optimizations implemented in SuperSiteHero for iPad, Android tablets, and similar devices.

## Overview

The application provides explicit optimizations for tablet devices in both **landscape** and **portrait** orientations. These optimizations go beyond basic responsive design to provide a native-feeling experience on tablet devices.

## Breakpoints

### Tailwind CSS Breakpoints

The following tablet-specific breakpoints are available in `tailwind.config.js`:

```javascript
screens: {
  // Standard breakpoints
  'sm': '640px',
  'md': '768px',
  'lg': '1024px',
  'xl': '1280px',
  '2xl': '1536px',

  // Tablet-specific breakpoints
  'tablet': '768px',                    // Tablet portrait start
  'tablet-lg': '1024px',                // Tablet landscape / iPad Pro portrait

  // Orientation-aware breakpoints
  'tablet-landscape': {
    min: '768px', max: '1366px',
    raw: '(orientation: landscape)'
  },
  'tablet-portrait': {
    min: '768px', max: '1024px',
    raw: '(orientation: portrait)'
  },

  // iPad Pro specific
  'tablet-pro': { min: '1024px', max: '1366px' },
  'tablet-pro-landscape': { min: '1024px', max: '1366px', raw: '(orientation: landscape)' },
  'tablet-pro-portrait': { min: '834px', max: '1194px', raw: '(orientation: portrait)' },

  // Touch device detection
  'touch': { raw: '(pointer: coarse)' }
}
```

### Usage Examples

```jsx
// Show only on tablet landscape
<div className="hidden tablet-landscape:block">
  Landscape content
</div>

// Show only on tablet portrait
<div className="hidden tablet-portrait:block">
  Portrait content
</div>

// Different grid columns based on orientation
<div className="grid grid-cols-2 tablet-landscape:grid-cols-3">
  {/* items */}
</div>

// Touch-friendly sizing
<button className="touch:min-h-[44px] touch:min-w-[44px]">
  Touch Me
</button>
```

## React Hooks

### useTabletMode

The primary hook for tablet detection and responsive behavior:

```typescript
import { useTabletMode } from '@/hooks/useTabletMode';

function MyComponent() {
  const {
    isTablet,           // Boolean: is tablet device
    isLandscape,        // Boolean: tablet in landscape
    isPortrait,         // Boolean: tablet in portrait
    orientation,        // 'portrait' | 'landscape' | null
    tabletType,         // 'standard' | 'pro' | 'none'
    isLargeTablet,      // Boolean: iPad Pro size
    isTouchDevice,      // Boolean: touch capability
    viewportWidth,      // Number: current width
    viewportHeight,     // Number: current height
    shouldCollapseSidebar, // Boolean: recommended sidebar state
    recommendedGridCols,   // Number: suggested grid columns
    showPersistentSidebar, // Boolean: show persistent vs drawer
  } = useTabletMode();

  return (
    <div className={isTablet && isLandscape ? 'grid-cols-3' : 'grid-cols-2'}>
      {/* content */}
    </div>
  );
}
```

### useTabletSidebar

Hook for managing sidebar state on tablets:

```typescript
import { useTabletSidebar } from '@/hooks/useTabletMode';

function Layout() {
  const {
    isOpen,                 // Boolean: sidebar open state
    toggle,                 // Function: toggle sidebar
    open,                   // Function: open sidebar
    close,                  // Function: close sidebar
    shouldShowPersistent,   // Boolean: show persistent sidebar
  } = useTabletSidebar();

  return (
    <>
      {!shouldShowPersistent && (
        <button onClick={toggle}>Menu</button>
      )}
      <Sidebar isOpen={isOpen} isPersistent={shouldShowPersistent} />
    </>
  );
}
```

### useTabletClasses

Get pre-defined CSS classes for tablet layouts:

```typescript
import { useTabletClasses } from '@/hooks/useTabletMode';

function Page() {
  const { containerClass, gridClass, formClass, sidebarClass } = useTabletClasses();

  return (
    <div className={containerClass}>
      <nav className={sidebarClass}>...</nav>
      <div className={gridClass}>...</div>
    </div>
  );
}
```

## UI Components

### TabletCard & TabletCardGrid

Optimized card components for tablet displays:

```tsx
import { TabletCard, TabletCardGrid } from '@/components/ui';

<TabletCardGrid
  desktopCols={4}
  tabletLandscapeCols={3}
  tabletPortraitCols={2}
  gap="md"
>
  <TabletCard
    variant="default"   // 'default' | 'compact' | 'spacious'
    interactive         // Enable hover/active states
    bordered           // Show border
    icon={<Icon />}    // Optional icon
    title="Card Title"
    description="Description text"
    action={<Button>Action</Button>}
    footer={<div>Footer content</div>}
  >
    Card content
  </TabletCard>
</TabletCardGrid>
```

### TabletForm Components

Form components optimized for tablet input:

```tsx
import {
  TabletForm,
  TabletFormField,
  TabletFormSection,
  TabletFormRow,
  TabletFormActions,
  TabletInput,
} from '@/components/ui';

<TabletForm
  landscapeCols={2}    // Columns in landscape
  portraitCols={1}     // Columns in portrait
  gap="md"
  onSubmit={handleSubmit}
>
  <TabletFormSection title="Personal Info" description="Enter your details">
    <TabletFormRow cols={2}>
      <TabletFormField label="First Name" required htmlFor="firstName">
        <TabletInput id="firstName" placeholder="John" clearable />
      </TabletFormField>
      <TabletFormField label="Last Name" required htmlFor="lastName">
        <TabletInput id="lastName" placeholder="Doe" />
      </TabletFormField>
    </TabletFormRow>

    <TabletFormField label="Email" fullWidth error={errors.email}>
      <TabletInput type="email" inputSize="lg" />
    </TabletFormField>
  </TabletFormSection>

  <TabletFormActions align="right" sticky>
    <Button variant="outline">Cancel</Button>
    <Button type="submit">Save</Button>
  </TabletFormActions>
</TabletForm>
```

### TabletTable Components

Table optimized for tablet displays:

```tsx
import {
  TabletTable,
  TabletTableHeader,
  TabletTableBody,
  TabletTableRow,
  TabletTableHead,
  TabletTableCell,
  TabletTableEmpty,
} from '@/components/ui';

<TabletTable
  scrollable           // Enable horizontal scroll
  stickyHeader        // Sticky header row
  maxHeight="60vh"    // Max height before scroll
  selectable          // Enable row selection
  selectedRows={selected}
  onSelectionChange={setSelected}
  allRowIds={allIds}
>
  <TabletTableHeader>
    <TabletTableRow>
      <TabletTableHead isSelectAll />
      <TabletTableHead sortable sortDirection="asc" onSort={handleSort}>
        Name
      </TabletTableHead>
      <TabletTableHead hideOnPortrait>Description</TabletTableHead>
      <TabletTableHead>Status</TabletTableHead>
    </TabletTableRow>
  </TabletTableHeader>

  <TabletTableBody>
    {items.map(item => (
      <TabletTableRow key={item.id} rowId={item.id} clickable onRowClick={() => {}}>
        <TabletTableCell>{item.name}</TabletTableCell>
        <TabletTableCell hideOnPortrait truncate maxWidth={200}>
          {item.description}
        </TabletTableCell>
        <TabletTableCell>{item.status}</TabletTableCell>
      </TabletTableRow>
    ))}

    {items.length === 0 && (
      <TabletTableEmpty
        colSpan={3}
        title="No items"
        description="Get started by creating your first item"
        action={<Button>Create Item</Button>}
      />
    )}
  </TabletTableBody>
</TabletTable>
```

## CSS Classes

### Container Classes

```css
/* General tablet container */
.tablet-container { padding-left: 1.5rem; padding-right: 1.5rem; }

/* Grids */
.tablet-grid { grid-template-columns: repeat(2, 1fr); }
.tablet-grid-3 { grid-template-columns: repeat(3, 1fr); }
.tablet-landscape-grid { grid-template-columns: repeat(3, 1fr); }
.tablet-portrait-grid { grid-template-columns: repeat(2, 1fr); }

/* Touch targets */
.tablet-touch-target { min-height: 44px; min-width: 44px; }
.tablet-touch-target-lg { min-height: 48px; min-width: 48px; }
```

### Layout Classes

```css
/* Landscape sidebar layout */
.tablet-landscape-sidebar {
  display: grid;
  grid-template-columns: minmax(280px, 320px) 1fr;
}

/* Master-detail layout */
.tablet-landscape-master-detail {
  display: grid;
  grid-template-columns: minmax(300px, 380px) 1fr;
  height: calc(100vh - var(--header-height, 64px));
}

/* Split view */
.tablet-landscape-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
}

/* Canvas/document viewer layout */
.tablet-landscape-canvas-layout {
  display: grid;
  grid-template-columns: auto 1fr;
}
```

### Visibility Classes

```css
/* Show/hide based on orientation */
.tablet-landscape-only { /* visible only in landscape */ }
.tablet-portrait-only { /* visible only in portrait */ }
.tablet-landscape-hidden { /* hidden in landscape */ }
.tablet-portrait-hidden { /* hidden in portrait */ }
```

## Layout Patterns

### Landscape Mode

In landscape orientation, the app uses:

1. **Persistent Sidebar**: Navigation is always visible on the left
2. **Side-by-side Content**: Forms show 2-3 columns
3. **Master-Detail Views**: List on left, detail on right
4. **Horizontal Toolbars**: Full toolbar with all options visible

### Portrait Mode

In portrait orientation, the app uses:

1. **Drawer Navigation**: Sidebar slides in from left
2. **Single Column**: Forms stack vertically
3. **Full-width Content**: Cards and content take full width
4. **Bottom Navigation**: Quick access to main sections
5. **Tabbed Interfaces**: Horizontal scrolling tabs

## Touch Optimization

### Minimum Touch Targets

All interactive elements should be at least 44x44 pixels (Apple Human Interface Guidelines):

```tsx
<button className="min-h-[44px] min-w-[44px]">
  Touch Me
</button>

// Or use the utility class
<button className="tablet-touch-target">
  Touch Me
</button>
```

### Touch Feedback

Add active states for touch feedback:

```tsx
<button className="active:scale-[0.98] active:opacity-80 transition-transform">
  Press Me
</button>
```

### Pinch-to-Zoom

For canvas/viewer components:

```tsx
<div className="tablet-pinch-zoom">
  <canvas />
</div>
```

## Testing

Test your tablet layouts on the following devices/sizes:

| Device | Portrait | Landscape |
|--------|----------|-----------|
| iPad | 768x1024 | 1024x768 |
| iPad Pro 11" | 834x1194 | 1194x834 |
| iPad Pro 12.9" | 1024x1366 | 1366x1024 |
| Android Tablet | 800x1280 | 1280x800 |
| Samsung Tab | 800x1280 | 1280x800 |

### Browser DevTools

1. Open Chrome DevTools (F12)
2. Click the device toggle button
3. Select "iPad" or add custom device
4. Toggle between portrait/landscape using the rotation button

### Physical Testing

For best results, test on actual tablet devices:
- Check touch targets are easy to hit
- Verify scroll behavior is smooth
- Test orientation changes
- Check keyboard doesn't obscure inputs

## Best Practices

1. **Always use the hooks**: Use `useTabletMode` instead of manual media queries
2. **Provide touch targets**: Minimum 44x44px for interactive elements
3. **Test both orientations**: Ensure layout works in portrait AND landscape
4. **Consider keyboard**: Tablets have on-screen keyboards that reduce viewport
5. **Optimize images**: Use appropriate sizes for tablet displays
6. **Handle orientation changes**: Content should reflow smoothly
7. **Use semantic landmarks**: Help with accessibility on tablets

## Migration Guide

To add tablet optimizations to existing components:

1. Import the hooks:
   ```typescript
   import { useTabletMode } from '@/hooks/useTabletMode';
   ```

2. Use in component:
   ```typescript
   const { isTablet, isLandscape, isPortrait, isTouchDevice } = useTabletMode();
   ```

3. Apply conditional classes:
   ```tsx
   <div className={cn(
     "base-class",
     isTablet && isLandscape && "tablet-landscape-grid",
     isTablet && isPortrait && "tablet-portrait-stack"
   )}>
   ```

4. Add touch-friendly sizing:
   ```tsx
   <button className={cn(
     "btn",
     isTouchDevice && "min-h-[44px] min-w-[44px]"
   )}>
   ```
