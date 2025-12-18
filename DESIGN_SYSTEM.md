# JobSight Design System

**Version:** 1.0
**Last Updated:** December 2025

## Table of Contents

1. [Design Principles](#design-principles)
2. [Brand Identity](#brand-identity)
3. [Color System](#color-system)
4. [Typography](#typography)
5. [Spacing & Layout](#spacing--layout)
6. [Components](#components)
7. [Responsive Design](#responsive-design)
8. [Accessibility](#accessibility)
9. [Animations & Interactions](#animations--interactions)
10. [Dark Mode](#dark-mode)
11. [Mobile & Touch Optimization](#mobile--touch-optimization)
12. [Design Tokens](#design-tokens)

---

## Design Principles

### Core Values

**1. Field-First Design**
- Prioritize usability in construction environments
- Design for gloved hands and outdoor visibility
- Support multiple device types (phones, tablets, wearables)

**2. Professional & Trustworthy**
- Clean, organized interfaces that reflect construction professionalism
- Consistent visual language across all touchpoints
- Blueprint-inspired aesthetic that resonates with industry

**3. Performance & Efficiency**
- Fast, responsive interfaces for time-sensitive workflows
- Minimal cognitive load through clear information hierarchy
- Progressive disclosure to avoid overwhelming users

**4. Accessible & Inclusive**
- WCAG 2.1 Level AA compliance
- Support for various lighting conditions and device capabilities
- Adaptable to different user needs and preferences

---

## Brand Identity

### Overview

JobSight embodies **Professional Construction Technology** through a modern, industrial-inspired design language. The visual identity draws from construction blueprints, steel and concrete materials, and safety-conscious color choices.

### Logo System

**Primary Logo**
- Full horizontal lockup for headers and marketing
- Icon-only version for compact spaces and app icons
- Sidebar variant optimized for navigation contexts
- Auth presentation version for login/onboarding screens

**Logo Usage Guidelines**
- Maintain clear space around logo (minimum 1x logo height)
- Use white version on dark backgrounds
- Use standard version on light backgrounds
- Never stretch, rotate, or alter logo proportions
- Avoid placing logo on busy or low-contrast backgrounds

**Logo Sizes**
- Small: 24px height (mobile navigation, favicons)
- Medium: 32px height (standard headers)
- Large: 48px height (auth screens, hero sections)
- Extra Large: 96px height (splash screens, marketing)

### Brand Patterns

**Blueprint Pattern**
- Grid-based pattern reminiscent of construction blueprints
- Use for decorative backgrounds and hero sections
- Brand blue color on subtle background

**Construction Grid**
- Large-scale grid for dark mode backgrounds
- Creates depth and professional technical aesthetic

**Concrete Texture**
- Subtle noise texture for surface variety
- Use sparingly to add tactile quality

**Steel Mesh**
- Diagonal stripe pattern suggesting industrial materials
- Ideal for loading states and transitional elements

---

## Color System

### Primary Colors

**Professional Blueprint Blue**
- Primary color across all interfaces
- Hex: `#1E40AF`
- Usage: Primary actions, links, active states, brand elements
- Inspired by traditional construction blueprint paper

**Color Palette**
- Blueprint Blue 50: Lightest tint (backgrounds, hover states)
- Blueprint Blue 100-400: Light to medium tints (borders, subtle elements)
- Blueprint Blue 500: Standard brand color
- Blueprint Blue 600-900: Dark shades (text, high contrast elements)

### Secondary Colors

**Industrial Grays**
- Zinc/slate scale for neutral elements
- Surface 50: Lightest background
- Surface 100-300: Light surfaces, cards, dividers
- Surface 400-600: Medium gray for text, icons
- Surface 700-900: Dark surfaces, headers
- Surface 950: Darkest background (dark mode)

### Semantic Colors

**Success (Approved Green)**
- Hex: `#10B981`
- Usage: Approvals, completions, positive confirmations
- Represents safety and go-ahead signals in construction

**Warning (Safety Yellow)**
- Hex: `#FBBF24`
- Usage: Cautions, pending states, attention needed
- Draws from safety equipment and signage

**Destructive (Caution Red)**
- Hex: `#EF4444`
- Usage: Errors, deletions, critical alerts
- Associated with stop signals and danger warnings

**Info (Steel Cyan)**
- Hex: `#06B6D4`
- Usage: Informational messages, tips, updates
- Cool, professional tone for neutral information

### Color Usage Guidelines

**Contrast Requirements**
- Text on background: Minimum 4.5:1 ratio
- Large text (18px+): Minimum 3:1 ratio
- Interactive elements: Minimum 3:1 ratio against adjacent colors

**Color Accessibility**
- Never rely on color alone to convey information
- Pair colors with icons, text, or patterns
- Test all color combinations in various lighting conditions
- Ensure colors work in both light and dark modes

**Do's**
- Use primary blue for calls-to-action and important interactions
- Apply semantic colors consistently (green = success, red = error)
- Maintain sufficient contrast for outdoor visibility
- Use grays for hierarchy and visual organization

**Don'ts**
- Don't use more than 3-4 colors in a single interface
- Avoid using red and green as the only differentiators
- Never use low-contrast color combinations
- Don't override semantic color meanings

---

## Typography

### Font Families

**Display Font: DM Sans**
- Usage: Headings, titles, emphasis text
- Characteristics: Modern, clean, professional
- Weights: Regular (400), Medium (500), Semibold (600), Bold (700)

**Body Font: System Font Stack**
- Primary: -apple-system, BlinkMacSystemFont, 'Segoe UI'
- Usage: Paragraphs, UI text, form labels
- Optimized for readability across all platforms

**Monospace Font: JetBrains Mono**
- Usage: Code snippets, technical data, timestamps
- Characteristics: Clear character distinction
- Weights: Regular (400), Medium (500)

### Type Scale

**Mobile (Base)**
- Extra Small: 12px / 0.75rem (labels, captions)
- Small: 14px / 0.875rem (body text, form inputs)
- Base: 16px / 1rem (primary body text)
- Large: 18px / 1.125rem (emphasized text)
- XL: 20px / 1.25rem (subheadings)
- 2XL: 24px / 1.5rem (section headings)
- 3XL: 30px / 1.875rem (page titles)
- 4XL: 36px / 2.25rem (hero headings)

**Tablet Adjustments**
- Extra Small: 13px
- Small: 15px
- Base: 17px
- Large: 19px
- Scale up 15-20% from mobile baseline

**Desktop**
- Scale up 10-15% from tablet baseline
- Maximum comfortable reading width: 65-75 characters

### Line Heights

- **Tight (1.2)**: Large headings, display text
- **Snug (1.375)**: Subheadings, card titles
- **Normal (1.5)**: Body text, paragraphs
- **Relaxed (1.75)**: Descriptive text, help content
- **Loose (2.0)**: Spaced lists, navigational elements

### Font Weights

- **Regular (400)**: Body text, descriptions
- **Medium (500)**: Emphasized text, labels
- **Semibold (600)**: Subheadings, important UI text
- **Bold (700)**: Headings, critical information

### Typography Guidelines

**Readability**
- Maintain optimal line length (45-75 characters for body text)
- Use adequate line height for comfortable reading
- Ensure sufficient contrast between text and background
- Increase font sizes on tablets for arm's-length viewing

**Hierarchy**
- Establish clear visual hierarchy through size and weight
- Use consistent heading levels throughout the app
- Limit to 3-4 font sizes per screen
- Pair font weights appropriately (don't mix too many weights)

**Responsive Typography**
- Scale fonts proportionally across breakpoints
- Maintain readability on all device sizes
- Test typography in landscape and portrait orientations
- Adjust for outdoor viewing conditions (larger sizes preferred)

---

## Spacing & Layout

### Grid System

**Base Unit: 8px**
- All spacing uses 8px increments for consistency
- Creates harmonious, predictable layouts
- Simplifies design decisions and handoff

**Spacing Scale**
- 0: 0px (no spacing)
- 1: 4px (0.25rem) - Tight internal spacing
- 2: 8px (0.5rem) - Standard small spacing
- 3: 12px (0.75rem) - Medium-tight spacing
- 4: 16px (1rem) - Standard spacing
- 5: 20px (1.25rem) - Medium spacing
- 6: 24px (1.5rem) - Comfortable spacing
- 8: 32px (2rem) - Large spacing
- 10: 40px (2.5rem) - Extra large spacing
- 12: 48px (3rem) - Section spacing
- 16: 64px (4rem) - Major section breaks
- 20: 80px (5rem) - Page-level spacing
- 24: 96px (6rem) - Hero spacing

### Layout Patterns

**Container Widths**
- Mobile: 100% width with 16px padding
- Tablet: 100% width with 24px padding
- Desktop: Maximum 1280px centered with 32px padding
- Wide: Maximum 1536px for dashboards

**Grid Layouts**
- Mobile: Single column (stack all content)
- Tablet Portrait: 2 columns for forms and lists
- Tablet Landscape: 3 columns for dashboards
- Desktop: Up to 4 columns for complex layouts

**Sidebar Layouts**
- Mobile: Drawer overlay (hidden by default)
- Tablet Landscape: Persistent sidebar (200-240px width)
- Desktop: Persistent sidebar (240-280px width)

**Master-Detail Layouts**
- Mobile: Separate views with navigation
- Tablet: Split view (40% master, 60% detail)
- Desktop: Split view (30% master, 70% detail)

### Spacing Guidelines

**Component Spacing**
- Internal padding: 12-16px for compact, 16-24px for comfortable
- Between related elements: 8-12px
- Between unrelated elements: 24-32px
- Section breaks: 48-64px

**Touch Targets**
- Minimum size: 44px × 44px (mobile)
- Recommended: 48px × 48px (comfortable tapping)
- Glove Mode: 60px × 60px (enhanced for field workers)
- Spacing between targets: Minimum 8px

**Margins & Padding**
- Use consistent spacing within component types
- Maintain alignment across related elements
- Create breathing room with adequate white space
- Avoid cramped layouts especially on mobile

---

## Components

### Component Hierarchy

**Foundational**
- Button, Input, Checkbox, Radio, Select, Label
- Basic building blocks used throughout the app

**Layout**
- Card, Accordion, Tabs, Sheet, Collapsible
- Structure and organize content

**Feedback**
- Alert, Toast, Badge, Tooltip, Progress, Skeleton
- Communicate status and provide guidance

**Data Display**
- Table, Avatar, Pagination, Virtual Table
- Present information clearly and efficiently

**Navigation**
- Dropdown Menu, Breadcrumbs, Tabs
- Help users move through the application

**Dialogs**
- Dialog, Alert Dialog, Popover
- Focus attention and gather input

### Button Variants

**Default**
- Primary actions and main calls-to-action
- Blueprint blue background with white text
- Use sparingly for maximum impact

**Destructive**
- Delete, remove, or irreversible actions
- Red background indicating caution
- Require confirmation for critical actions

**Outline**
- Secondary actions that need visibility
- Blueprint blue border with blue text
- Less emphasis than default buttons

**Secondary**
- Tertiary actions or alternative options
- Gray background with dark text
- Support primary actions without competing

**Ghost**
- Subtle actions in toolbars and menus
- No background, hover state shows background
- Minimal visual weight

**Link**
- Inline actions that look like text links
- Blueprint blue text, underline on hover
- Blend with text content

### Form Elements

**Input Fields**
- Clear labels above or beside inputs
- Placeholder text for format guidance
- Error states with descriptive messages
- Disabled states visually distinct

**Select Dropdowns**
- Custom styled for consistency
- Keyboard navigable
- Search functionality for long lists
- Clear indication of selected value

**Checkboxes & Radios**
- Large touch targets (minimum 44px)
- Clear visual states (unchecked, checked, disabled)
- Grouped logically with related options
- Labels clickable for better UX

### Card Components

**Standard Card**
- White background (light mode), elevated surface (dark mode)
- Subtle shadow for depth
- 8-12px border radius
- 16-24px internal padding

**Interactive Card**
- Hover state with subtle lift and shadow increase
- Clickable entire surface area
- Clear visual feedback on interaction
- Cursor changes to pointer

**Status Card**
- Colored border or accent indicating state
- Success (green), Warning (yellow), Error (red), Info (blue)
- Icon reinforcing the status message
- Dismissible when appropriate

### Component Guidelines

**Consistency**
- Use the same component for the same purpose
- Apply variants consistently (outline for secondary, etc.)
- Maintain spacing patterns within component types

**Feedback**
- Provide immediate visual feedback for all interactions
- Show loading states for async operations
- Indicate disabled states clearly
- Use animations to guide attention

**Composition**
- Build complex interfaces from simple components
- Maintain component independence and reusability
- Avoid deeply nested component structures
- Prefer composition over customization

---

## Responsive Design

### Breakpoint Strategy

**Mobile First**
- Design for mobile devices as the baseline
- Progressively enhance for larger screens
- Assume touch input and limited screen space

**Breakpoints**
- Small: 640px (large phones, small tablets)
- Tablet: 768px (iPad portrait, smaller tablets)
- Tablet Large: 1024px (iPad landscape, large tablets)
- Desktop: 1280px (laptops, monitors)
- Wide: 1536px (large monitors, external displays)

**Orientation Considerations**
- Tablet Portrait: 768px - 1024px, portrait orientation
- Tablet Landscape: 768px - 1366px, landscape orientation
- Adjust layouts based on available width and height
- Optimize for both orientations on tablets

### Responsive Patterns

**Navigation**
- Mobile: Bottom navigation or hamburger menu
- Tablet Portrait: Top tabs or drawer
- Tablet Landscape: Persistent sidebar
- Desktop: Expanded sidebar with labels

**Forms**
- Mobile: Single column, stacked fields
- Tablet: Two columns for related fields
- Desktop: Multi-column with logical grouping
- Always maintain adequate touch targets

**Data Tables**
- Mobile: Card view or horizontal scroll
- Tablet: Full table with essential columns
- Desktop: Complete table with all columns
- Responsive column visibility based on priority

**Dashboards**
- Mobile: Stacked widgets, single column
- Tablet Portrait: 2-column grid
- Tablet Landscape: 3-column grid
- Desktop: 3-4 column grid with flexible sizing

### Touch Optimization

**Target Sizes**
- Minimum: 44px × 44px (WCAG 2.1 compliance)
- Recommended: 48px × 48px
- Glove Mode: 60px × 60px for field workers
- Spacing between targets: 8px minimum

**Gestures**
- Swipe: Navigate between views, delete items
- Long press: Show contextual menus
- Pull to refresh: Update data in lists
- Pinch to zoom: Image galleries, technical drawings

**Tablet-Specific Patterns**
- Persistent sidebars in landscape
- Split-view layouts for productivity
- Drag and drop for organization
- Multi-select with checkboxes
- Keyboard shortcuts support

### Responsive Guidelines

**Content Priority**
- Show most important content first on mobile
- Progressive disclosure for secondary information
- Avoid horizontal scrolling
- Maintain readability at all sizes

**Performance**
- Optimize images for device resolution
- Lazy load below-the-fold content
- Use appropriate image formats
- Minimize layout shifts during loading

**Testing**
- Test on actual devices when possible
- Check both orientations on tablets
- Verify touch targets are accessible
- Ensure outdoor visibility

---

## Accessibility

### WCAG 2.1 Level AA Compliance

**Color Contrast**
- Normal text: 4.5:1 minimum ratio
- Large text (18px+ or 14px+ bold): 3:1 minimum
- UI components and graphics: 3:1 minimum
- Test in both light and dark modes

**Keyboard Navigation**
- All interactive elements keyboard accessible
- Logical tab order following visual flow
- Focus indicators clearly visible
- Skip links for bypass blocks
- Keyboard shortcuts documented

**Screen Reader Support**
- Semantic HTML structure
- ARIA labels for icons and actions
- Live regions for dynamic content
- Descriptive link text
- Form labels properly associated

### Inclusive Design

**Touch Targets**
- Minimum 44px × 44px on mobile
- Adequate spacing between interactive elements
- Glove Mode option for 60px × 60px targets
- Large tap areas on critical actions

**Focus Indicators**
- 2px outline around focused elements
- High contrast against background
- Never remove focus styles
- Custom focus styles match brand

**Alternative Text**
- Descriptive alt text for images
- Decorative images marked appropriately
- Icons paired with text labels
- Status conveyed through multiple means

**Motion & Animation**
- Respect reduced motion preferences
- Provide static alternatives
- Avoid auto-playing animations
- Keep animations subtle and purposeful

### Accessibility Guidelines

**Form Accessibility**
- Clear labels for all inputs
- Error messages specific and helpful
- Required fields clearly indicated
- Validation doesn't rely on color alone

**Content Structure**
- Use proper heading hierarchy (H1 → H6)
- Landmarks for major page sections
- Lists for grouped items
- Tables for tabular data only

**Testing**
- Use automated accessibility checkers
- Test with screen readers (NVDA, JAWS, VoiceOver)
- Navigate using keyboard only
- Test with various assistive technologies

---

## Animations & Interactions

### Transition Timings

**Fast (150ms)**
- Hover states on buttons and links
- Tooltip appearances
- Focus indicators
- Subtle color changes

**Base (300ms)**
- Component state changes
- Modal openings and closings
- Dropdown menus
- Tab switching

**Slow (500ms)**
- Page transitions
- Complex animations
- Loading sequences
- Major state changes

**Bounce (600ms)**
- Delightful interactions
- Success confirmations
- Attention-grabbing moments
- Special celebrations

### Easing Functions

**Standard (cubic-bezier 0.4, 0, 0.2, 1)**
- Default for most animations
- Smooth, natural feeling
- Acceleration and deceleration

**Bounce (cubic-bezier 0.68, -0.55, 0.265, 1.55)**
- Playful, engaging interactions
- Success states and confirmations
- Special moments only

### Animation Types

**Fade**
- Opacity transitions for appearing/disappearing
- Tooltips, modals, overlays
- Subtle, non-distracting

**Slide**
- Drawers from sides or bottom
- Mobile navigation
- Contextual panels
- 250-300ms duration

**Scale**
- Button press feedback (scale down to 0.95)
- Hover effects (scale up to 1.05)
- Popover appearances
- Quick, responsive feeling

**Shimmer**
- Loading placeholders
- Skeleton screens
- Indicates content loading
- Continuous smooth animation

**Pulse**
- Status indicators
- Notification badges
- Attention to new content
- Subtle, rhythmic

### Interaction Feedback

**Button Press**
- Scale down slightly (0.95)
- Reduce opacity (0.9)
- Immediate feedback
- Quick spring back

**Hover States**
- Subtle color shifts
- Small scale increases
- Shadow enhancements
- Clear but not jarring

**Loading States**
- Skeleton screens for content
- Progress indicators for operations
- Shimmer effects for placeholders
- Informative, not frustrating

**Success/Error Feedback**
- Brief color flash or icon
- Toast notification if persistent
- Sound if appropriate (optional)
- Clear, immediate confirmation

### Animation Guidelines

**Performance**
- Use GPU-accelerated properties (transform, opacity)
- Avoid animating layout properties (width, height, top, left)
- Limit simultaneous animations
- Test on lower-end devices

**Purposeful Motion**
- Every animation should serve a purpose
- Guide user attention to important changes
- Communicate relationships between elements
- Maintain spatial consistency

**Reduced Motion**
- Respect user preferences
- Provide static alternatives
- Simplify or eliminate animations
- Maintain functionality without motion

---

## Dark Mode

### Implementation Strategy

**Class-Based Toggle**
- Dark mode triggered by class on root element
- Instant switching without page reload
- Persistent across sessions
- System preference detection available

**Design Philosophy**
- True dark backgrounds (near-black, not gray)
- Elevated surfaces lighter than background
- Reduced contrast for comfort
- Enhanced shadows for depth perception

### Color Adjustments

**Backgrounds**
- Background: Very dark (5% lightness)
- Surface: Elevated grays (8-12% lightness)
- Cards: Gray-800 to Gray-900
- Overlays: Semi-transparent black

**Text**
- Primary: Near-white (98% lightness)
- Secondary: Medium gray (70% lightness)
- Disabled: Dark gray (40% lightness)
- Maintain contrast ratios

**Brand Colors**
- Keep Professional Blueprint Blue consistent
- Adjust saturation slightly for comfort
- Ensure sufficient contrast on dark backgrounds
- Test semantic colors for visibility

### Surface Elevation

**Elevation Strategy**
- Lower surfaces darker
- Higher surfaces lighter
- Creates depth through lightness, not shadow
- Elevation levels: 0, 1, 2, 3, 4

**Shadow Enhancement**
- Increase shadow opacity in dark mode
- Use darker shadows for definition
- Softer, more diffused shadows
- Colored glows for primary elements

### Dark Mode Guidelines

**Contrast Management**
- Avoid pure white text (use near-white)
- Reduce contrast compared to light mode
- Test for eye strain in dark environments
- Ensure readability without harshness

**Color Saturation**
- Desaturate colors slightly
- Avoid overly vibrant colors
- Maintain brand identity with subtle adjustments
- Test colors at typical nighttime brightness levels

**Images & Media**
- Consider image brightness and contrast
- Add subtle overlays if needed
- Ensure logos work on dark backgrounds
- Test illustrations for visibility

---

## Mobile & Touch Optimization

### Glove Mode

**Purpose**
- Enable construction workers to use the app while wearing work gloves
- Dramatically increase touch target sizes to 60px minimum
- Improve usability in field conditions (outdoor, weather, safety equipment)
- Comply with WCAG 2.5.5 Enhanced Target Size (AAA)

**Activation**
- Toggle in user settings
- Visual indicator when active (green dot badge)
- Persists across sessions via localStorage
- Can be enabled/disabled quickly
- App-wide setting affects all pages

**Technical Implementation**

```tsx
// Wrap your app with GloveModeProvider
import { GloveModeProvider } from '@/components/ui/touch-wrapper'

function App() {
  return (
    <GloveModeProvider>
      <Router>
        <AppLayout />
      </Router>
    </GloveModeProvider>
  )
}

// Access glove mode state in any component
import { useGloveMode } from '@/components/ui/touch-wrapper'

function MyComponent() {
  const { isGloveModeEnabled, toggleGloveMode } = useGloveMode()

  return (
    <TouchWrapper size={isGloveModeEnabled ? 'large' : 'default'}>
      <Button onClick={toggleGloveMode}>
        {isGloveModeEnabled ? 'Disable' : 'Enable'} Glove Mode
      </Button>
    </TouchWrapper>
  )
}
```

**Touch Target Scaling**
- **Normal mode**: 44-48px minimum (WCAG AA)
- **Glove mode**: 60px minimum (WCAG AAA + field-tested)
- All interactive elements scale proportionally
- Spacing increases to prevent mis-taps
- Applies to buttons, badges, checkboxes, radio buttons, and all clickable elements

**Visual Changes**
- Larger buttons and controls (60px touch targets)
- Increased font sizes for better readability
  - Normal: 14px → Glove: 16-18px minimum
- More generous padding and margins
  - Normal: 8-12px → Glove: 16-20px
- Simplified layouts to accommodate size increases
- Visual indicator badge shows glove mode status

**Use Cases**
- ✅ Field superintendents wearing work gloves
- ✅ Outdoor use in bright sunlight
- ✅ Workers wearing safety equipment
- ✅ Cold weather conditions requiring gloves
- ✅ Users with motor skill challenges
- ✅ Accessibility enhancement for all users

### Safe Area Handling

**Notch & Rounded Corner Support**
- Safe area insets for iOS devices
- Padding adjusted for camera notch
- Avoid placing interactive elements in unsafe areas
- Test on various device types

**Bottom Navigation**
- Account for home indicator on iOS
- Adequate padding below bottom bars
- Gesture-friendly spacing
- Visual separation from system UI

### Touch Interactions

**Tap**
- Primary interaction method
- Immediate visual feedback
- Standard for buttons, links, cards
- 44px minimum target size

**Swipe**
- Navigate between views
- Delete actions in lists
- Dismiss cards or modals
- Natural, gesture-based

**Long Press**
- Reveal contextual menus
- Select items for batch operations
- Access secondary functions
- 500ms activation threshold

**Pull to Refresh**
- Update data in scrollable lists
- Standard gesture users expect
- Visual feedback during pull
- Smooth animation on release

**Pinch & Zoom**
- Technical drawings and blueprints
- Image galleries
- Maps and site plans
- Disable on UI elements

### Mobile-Specific Patterns

**Bottom Sheets**
- Modal panels from bottom of screen
- Natural thumb-zone accessibility
- Swipe to dismiss
- Partial height for quick actions

**Floating Action Button (FAB)**
- Primary action always accessible
- Bottom-right positioning
- Large touch target (56px+)
- Clear, singular purpose

**Card Layouts**
- Stacked vertically on mobile
- Full-width with margin
- Tap entire card for actions
- Clear visual hierarchy

**List Optimization**
- Virtual scrolling for long lists
- 56px minimum row height
- Swipe actions for quick operations
- Loading indicators for infinite scroll

### Performance Optimization

**Touch Responsiveness**
- Immediate visual feedback (<100ms)
- Optimistic UI updates
- Smooth scrolling (60fps)
- Minimize layout shifts

**Offline Support**
- Cache critical data locally
- Queue actions when offline
- Sync when connection restored
- Clear offline indicators

**Battery Efficiency**
- Minimize background processes
- Throttle animations when battery low
- Reduce polling frequency
- Efficient data fetching

### TouchWrapper Component

The TouchWrapper component ensures all interactive elements meet WCAG 2.1 Level AA touch target requirements (44×44px minimum) on mobile devices while maintaining compact sizing on desktop.

**Purpose**
- Provides invisible touch target expansion for small interactive elements
- Maintains visual design while improving mobile usability
- Supports field workers wearing gloves with optional 60px "glove mode"
- Zero visual footprint - transparent, no background or borders

**Implementation**
```tsx
import { TouchWrapper } from '@/components/ui/touch-wrapper'

// Default: 44px minimum on mobile, compact on desktop
<TouchWrapper>
  <Badge onClick={handleClick}>5 items</Badge>
</TouchWrapper>

// Comfortable: 48px for primary actions
<TouchWrapper size="comfortable">
  <IconButton icon="edit" onClick={handleEdit} />
</TouchWrapper>

// Glove Mode: 60px for field workers
<TouchWrapper size="large">
  <SmallButton />
</TouchWrapper>

// Conditional wrapping
<TouchWrapper enabled={onClick !== undefined}>
  <StatusBadge status="approved" onClick={onClick} />
</TouchWrapper>
```

**Size Variants**

| Variant | Size | Use Case | Visual Example |
|---------|------|----------|----------------|
| `default` | 44px | WCAG AA minimum, standard mobile use | Icon buttons, badges, small controls |
| `comfortable` | 48px | Primary actions, frequently-used controls | Main navigation, action buttons |
| `large` | 60px | Field workers with gloves, outdoor use | All interactive elements in glove mode |

**Glove Mode Integration**

Enable app-wide glove mode for field workers:

```tsx
// App root
import { GloveModeProvider } from '@/components/ui/touch-wrapper'

function App() {
  return (
    <GloveModeProvider>
      <YourApp />
    </GloveModeProvider>
  )
}

// In components
import { useGloveMode } from '@/components/ui/touch-wrapper'

function ActionButton() {
  const { isGloveModeEnabled } = useGloveMode()

  return (
    <TouchWrapper size={isGloveModeEnabled ? 'large' : 'default'}>
      <IconButton icon="save" />
    </TouchWrapper>
  )
}
```

**When to Use TouchWrapper**

✅ **Use for**:
- Icon-only buttons < 44px
- Badges with onClick handlers
- Small checkboxes/radio buttons
- Chip/tag components that are clickable
- Close buttons in dialogs/modals
- Pagination controls
- Small action buttons in tables

❌ **Don't use for**:
- Full-width buttons (already large enough)
- Text links in paragraphs
- Non-interactive elements
- Elements already ≥ 44px
- Desktop-only interfaces (use responsive sizing instead)

**Responsive Behavior**

TouchWrapper automatically adapts across breakpoints:

- **Mobile (< 768px)**: Full touch target (44px, 48px, or 60px)
- **Desktop (≥ 768px)**: Compact sizing (natural size)
- **Negative margin technique**: Expands touch area without affecting visual layout

**Accessibility Notes**

- Maintains keyboard navigation (tab order unaffected)
- Preserves focus indicators
- Screen reader compatible
- Supports ARIA labels via `aria-label` prop
- WCAG 2.1 Level AA compliant (Success Criterion 2.5.5)

**Testing Touch Targets**

Verify compliance using browser DevTools:

1. Enable device toolbar (mobile viewport)
2. Set viewport to 375×667 (iPhone SE)
3. Inspect element > Computed styles
4. Verify min-height/min-width ≥ 44px
5. Test tap accuracy with finger (not mouse)

**Automated Testing**:
```typescript
// e2e/accessibility test
test('touch targets meet 44px minimum', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });

  const interactiveElements = await page.getByRole('button').all();
  for (const element of interactiveElements) {
    const box = await element.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThanOrEqual(44);
  }
});
```

**Common Patterns**

Pattern 1: Interactive Badge
```tsx
// Before
<Badge onClick={handleFilter}>Active</Badge>

// After
{onClick ? (
  <TouchWrapper>
    <Badge onClick={onClick}>Active</Badge>
  </TouchWrapper>
) : (
  <Badge>Active</Badge>
)}
```

Pattern 2: Table Action Buttons
```tsx
// Before
<button className="h-8 w-8">
  <Edit className="h-4 w-4" />
</button>

// After
<TouchWrapper>
  <button className="h-8 w-8">
    <Edit className="h-4 w-4" />
  </button>
</TouchWrapper>
```

Pattern 3: Checkbox/Radio with Label
```tsx
// RadioGroupItem already has touchFriendly built-in
<RadioGroupItem value="option1" touchFriendly={true} />

// For custom checkboxes
<TouchWrapper>
  <Checkbox id="terms" />
</TouchWrapper>
```

**Performance Considerations**

- Zero runtime overhead (CSS-only solution)
- No JavaScript required for touch expansion
- Negative margins maintain document flow
- No layout recalculation on resize

**Dark Mode Compatibility**

TouchWrapper is fully compatible with dark mode:
- Transparent background works in both themes
- Focus indicators maintain proper contrast
- No theme-specific adjustments needed

---

## Design Tokens

### Purpose of Design Tokens

Design tokens are the foundational design decisions (colors, spacing, typography) represented as data. They ensure consistency across the application and enable easy theme updates.

### Color Tokens

**Brand Colors**
- `--color-primary`: Professional Blueprint Blue
- `--color-secondary`: Industrial Gray
- `--color-accent`: Safety Yellow

**Semantic Colors**
- `--color-success`: Approved Green
- `--color-warning`: Safety Yellow
- `--color-destructive`: Caution Red
- `--color-info`: Steel Cyan

**Surface Colors**
- `--color-background`: Page background
- `--color-foreground`: Primary text
- `--color-card`: Card background
- `--color-border`: Borders and dividers

**Interactive States**
- `--color-hover`: Hover state overlay
- `--color-active`: Active/pressed state
- `--color-focus`: Focus ring color
- `--color-disabled`: Disabled element color

### Spacing Tokens

**Base Grid**
- `--grid-unit`: 8px base spacing unit
- `--spacing-xs`: 4px (0.5 units)
- `--spacing-sm`: 8px (1 unit)
- `--spacing-md`: 16px (2 units)
- `--spacing-lg`: 24px (3 units)
- `--spacing-xl`: 32px (4 units)
- `--spacing-2xl`: 48px (6 units)
- `--spacing-3xl`: 64px (8 units)

**Component Spacing**
- `--padding-tight`: 12px
- `--padding-standard`: 16px
- `--padding-comfortable`: 24px
- `--padding-spacious`: 32px

### Typography Tokens

**Font Families**
- `--font-display`: DM Sans (headings)
- `--font-body`: System font stack (body text)
- `--font-mono`: JetBrains Mono (code, data)

**Font Sizes**
- `--text-xs`: 12px
- `--text-sm`: 14px
- `--text-base`: 16px
- `--text-lg`: 18px
- `--text-xl`: 20px
- `--text-2xl`: 24px
- `--text-3xl`: 30px
- `--text-4xl`: 36px

**Line Heights**
- `--leading-tight`: 1.2
- `--leading-snug`: 1.375
- `--leading-normal`: 1.5
- `--leading-relaxed`: 1.75
- `--leading-loose`: 2.0

### Border & Shadow Tokens

**Border Radius**
- `--radius-tight`: 4px
- `--radius-standard`: 8px
- `--radius-relaxed`: 12px
- `--radius-pill`: 9999px (fully rounded)

**Shadows**
- `--shadow-soft`: Subtle depth
- `--shadow-medium`: Standard elevation
- `--shadow-large`: Prominent elevation
- `--shadow-xl`: Maximum elevation
- `--shadow-blue-glow`: Brand-colored glow effect

### Transition Tokens

**Durations**
- `--transition-fast`: 150ms
- `--transition-base`: 300ms
- `--transition-slow`: 500ms
- `--transition-bounce`: 600ms

**Easing**
- `--ease-standard`: cubic-bezier(0.4, 0, 0.2, 1)
- `--ease-bounce`: cubic-bezier(0.68, -0.55, 0.265, 1.55)

### Using Design Tokens

**Consistency**
- Always use tokens instead of hard-coded values
- Ensures design decisions propagate throughout app
- Makes theme updates simple and centralized

**Flexibility**
- Tokens adapt automatically in dark mode
- Responsive adjustments handled systematically
- Easy to experiment with design changes

**Documentation**
- Reference token names in design files
- Include tokens in component specifications
- Update tokens documentation when adding new values

---

## Best Practices

### General Guidelines

**Clarity Over Cleverness**
- Prioritize clear, understandable interfaces
- Avoid overly complex or novel patterns
- Use familiar conventions when possible
- Test with actual users in real environments

**Consistency is Key**
- Apply patterns uniformly across the app
- Use components as designed
- Maintain spacing and alignment
- Follow established conventions

**Progressive Enhancement**
- Start with mobile-first baseline
- Add capabilities for larger screens
- Degrade gracefully when features unavailable
- Test across device capabilities

**Performance Matters**
- Optimize for field conditions (slower networks)
- Minimize data usage and battery drain
- Test on actual devices, not just simulators
- Monitor real-world performance metrics

### Design Process

**Research & Discovery**
- Understand user needs and context
- Observe users in actual work environments
- Identify pain points and opportunities
- Validate assumptions through testing

**Design & Prototype**
- Start with low-fidelity sketches
- Use design tokens for consistency
- Create interactive prototypes
- Test early and often

**Development Handoff**
- Provide detailed specifications
- Include edge cases and error states
- Document interactions and animations
- Collaborate with developers throughout

**Testing & Iteration**
- Test with real users
- Gather feedback continuously
- Iterate based on usage data
- Refine and improve over time

### Maintenance

**Regular Audits**
- Review component usage
- Identify inconsistencies
- Update deprecated patterns
- Refresh design system documentation

**Version Control**
- Track design system changes
- Document breaking changes
- Provide migration guides
- Communicate updates to team

**Community & Feedback**
- Encourage team contributions
- Document design decisions
- Create feedback channels
- Foster design culture

---

## Resources & Tools

### Design Tools
- Figma for UI design and prototyping
- Browser DevTools for inspection and debugging
- Accessibility testing tools (WAVE, axe DevTools)
- Color contrast checkers

### Development Tools
- Tailwind CSS for utility-first styling
- CSS custom properties for theming
- Component libraries for consistency
- Storybook for component development

### Documentation
- This design system documentation
- Component usage examples
- Accessibility guidelines (WCAG 2.1)
- Industry best practices

### Support
- Design system team for questions
- Regular office hours for consultation
- Slack channel for discussions
- GitHub issues for bugs and requests

---

## Changelog

### Version 1.0 (December 2025)
- Initial design system documentation
- Comprehensive brand identity guidelines
- Mobile and tablet optimization patterns
- Glove Mode for field workers
- Dark mode theming system
- Accessibility standards and guidelines
- Component library documentation

---

**Questions or Feedback?**
Contact the design system team or open an issue on GitHub.
