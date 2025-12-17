# Screen Reader Testing Guide

This guide provides comprehensive instructions for manually testing the application with screen readers to ensure WCAG 2.1 AA compliance and excellent accessibility for visually impaired users.

## Table of Contents

1. [Overview](#overview)
2. [Screen Reader Tools](#screen-reader-tools)
3. [Testing Environment Setup](#testing-environment-setup)
4. [Testing Checklist](#testing-checklist)
5. [Testing the PolishedVariant1Professional Component](#testing-the-polishedvariant1professional-component)
6. [Common Issues and Solutions](#common-issues-and-solutions)
7. [Documentation Template](#documentation-template)

## Overview

Screen reader testing is essential for ensuring that visually impaired users can effectively navigate and interact with the application. Automated accessibility tests (axe-core) catch many issues, but manual screen reader testing is required to verify the actual user experience.

### Why Manual Testing is Required

- **Context and Flow**: Screen readers provide context that automated tools cannot verify
- **Announcement Quality**: Ensures labels and descriptions are clear and helpful
- **Navigation Patterns**: Verifies logical tab order and landmark navigation
- **User Experience**: Tests actual user workflows, not just technical compliance

## Screen Reader Tools

### NVDA (Windows) - Free ✅

**Download**: https://www.nvaccess.org/download/
**Cost**: Free (donations appreciated)
**Best for**: Windows testing, most widely used free screen reader

#### Basic NVDA Commands

| Action | Keys |
|--------|------|
| Start/Stop NVDA | `Ctrl + Alt + N` |
| Read next line | `↓` |
| Read previous line | `↑` |
| Next heading | `H` |
| Next landmark | `D` |
| Next link | `K` |
| Next button | `B` |
| Next form field | `F` |
| List all links | `NVDA + F7` |
| List all headings | `NVDA + F7` (then select Headings) |
| Toggle browse/focus mode | `NVDA + Space` |
| Read current line | `NVDA + ↑` |
| Read from cursor | `NVDA + ↓` |
| Stop reading | `Ctrl` |

### JAWS (Windows) - Commercial

**Website**: https://www.freedomscientific.com/products/software/jaws/
**Cost**: $90-$1,595 (40-minute demo available)
**Best for**: Professional testing, most feature-rich

#### Basic JAWS Commands

| Action | Keys |
|--------|------|
| Read next line | `↓` |
| Read previous line | `↑` |
| Next heading | `H` |
| Next landmark | `R` |
| Next link | `Tab` (in links list mode) |
| Next button | `B` |
| List all links | `Insert + F7` |
| List all headings | `Insert + F6` |
| Read page title | `Insert + T` |
| Read from cursor | `Insert + ↓` |

### VoiceOver (macOS/iOS) - Built-in ✅

**Access**: Built into macOS and iOS
**Cost**: Free
**Best for**: Mac/iOS testing, Safari compatibility

#### Basic VoiceOver Commands (macOS)

| Action | Keys |
|--------|------|
| Turn on/off VoiceOver | `Cmd + F5` |
| VoiceOver modifier (VO) | `Ctrl + Option` |
| Next item | `VO + →` |
| Previous item | `VO + ←` |
| Next heading | `VO + Cmd + H` |
| Web rotor (navigation) | `VO + U` |
| Interact with element | `VO + Shift + ↓` |
| Stop interacting | `VO + Shift + ↑` |
| Read from cursor | `VO + A` |
| Pause/resume | `Ctrl` |

#### Basic VoiceOver Commands (iOS)

| Action | Gesture |
|--------|---------|
| Turn on/off VoiceOver | Triple-click home button or side button |
| Next item | Swipe right |
| Previous item | Swipe left |
| Activate item | Double-tap |
| Rotor (navigation) | Two-finger rotate |
| Read from top | Two-finger swipe up |
| Pause/resume | Two-finger tap |

## Testing Environment Setup

### NVDA Setup (Windows)

1. **Install NVDA**
   ```
   Download from https://www.nvaccess.org/download/
   Run installer → Next → Agree → Install
   ```

2. **Configure Speech Rate**
   ```
   NVDA Menu → Preferences → Settings → Speech
   Set Rate to 50-70 for comfortable testing speed
   ```

3. **Configure Browser**
   - Use Chrome, Firefox, or Edge
   - Ensure JavaScript is enabled
   - Clear cache before testing

4. **Test NVDA is Working**
   - Press `NVDA + N` to open menu
   - Navigate to Help → About
   - NVDA should read the dialog

### VoiceOver Setup (macOS)

1. **Enable VoiceOver**
   ```
   System Preferences → Accessibility → VoiceOver
   Check "Enable VoiceOver"
   Or press: Cmd + F5
   ```

2. **Configure Speech Rate**
   ```
   VoiceOver Utility → Speech
   Adjust Rate slider to comfortable speed (40-60%)
   ```

3. **Configure Browser**
   - Use Safari for best compatibility
   - Chrome also works well
   - Clear cache before testing

4. **Test VoiceOver is Working**
   - Press `VO + H` for help
   - VoiceOver should provide instructions

## Testing Checklist

Use this checklist for each component or page you test:

### Navigation & Structure

- [ ] **Page Title**: Is announced when page loads
- [ ] **Heading Hierarchy**: H1 exists, headings don't skip levels (H1 → H2 → H3, not H1 → H3)
- [ ] **Landmarks**: Banner, main, navigation, complementary regions are announced
- [ ] **Tab Order**: Logical and matches visual order
- [ ] **Skip Links**: "Skip to main content" works if present

### Interactive Elements

- [ ] **Buttons**: Announced as "button" with clear purpose
- [ ] **Links**: Announced as "link" with descriptive text (not "click here")
- [ ] **Form Fields**: Have associated labels announced before the field
- [ ] **Form Validation**: Errors are announced and associated with fields
- [ ] **Focus Indicators**: Visible when tabbing through elements

### Dynamic Content

- [ ] **ARIA Live Regions**: Updates are announced automatically
- [ ] **Loading States**: "Loading" or "busy" status is announced
- [ ] **Modal Dialogs**: Focus is trapped, ESC closes, focus returns on close
- [ ] **Notifications**: Toast messages are announced
- [ ] **Expanding/Collapsing**: State changes are announced (collapsed/expanded)

### Images & Media

- [ ] **Images**: Have alt text describing content/purpose
- [ ] **Decorative Images**: Marked as decorative (alt="" or role="presentation")
- [ ] **Icons**: Have aria-label or are marked decorative
- [ ] **Videos**: Have captions/transcripts if containing speech

### Tables & Lists

- [ ] **Tables**: Have captions, header cells are marked
- [ ] **Lists**: Announced as list with item count
- [ ] **Definition Lists**: Terms and definitions are associated

## Testing the PolishedVariant1Professional Component

### Test Scenario 1: Initial Page Load

**URL**: `/blueprint-samples/variants/1-professional`

#### Expected Announcements (NVDA)

1. **Page Load**:
   - "Dashboard, heading level 1"
   - "Welcome back, John • [current date]"

2. **Navigate with Headings (`H` key)**:
   - "Dashboard, heading level 1"
   - "Active Projects, heading level 2"
   - "Recent Activity, heading level 2"

3. **Navigate with Landmarks (`D` key)**:
   - "Banner, landmark"
   - "Main, landmark"
   - "Active Projects, region"
   - "Recent Activity, region"

#### What to Test

```markdown
1. Press `NVDA + Ctrl` to start reading from top
   ✓ Announces: "VARIANT 1: PROFESSIONAL"
   ✓ Announces: "Back to Blueprint Variants, link"
   ✓ Announces: "Dashboard, heading level 1"

2. Press `H` to navigate headings
   ✓ First: "Dashboard, heading level 1"
   ✓ Second: "Active Projects, heading level 2"
   ✓ Third: "Recent Activity, heading level 2"
   ✓ Project names: "Downtown Tower, heading level 3"

3. Press `B` to navigate buttons
   ✓ "Back to Blueprint Variants, link" (actually a link styled as button)
   ✓ "Active Projects: 12 out of 15, +2 change, button"
   ✓ "Team Members: 48 out of 50, +5 change, button"
   ✓ "View All, link"
```

### Test Scenario 2: Interactive Elements

#### Stat Cards

**Test**: Tab to stat cards and verify announcements

```markdown
1. Tab to first stat card
   ✓ Focus ring is visible
   ✓ Announces: "Active Projects: 12 out of 15, +2 change, button"

2. Press Enter/Space
   ✓ Card responds to activation
   ✓ Visual feedback occurs

3. Tab to remaining stat cards
   ✓ Each announces its metric and value
   ✓ Trend (+ or -) is included
```

#### Project Cards

**Test**: Navigate project list

```markdown
1. Tab into "Active Projects" section
   ✓ Announces: "Active Projects, region"

2. Tab to first project card
   ✓ Announces: "View project: Downtown Tower, link"
   ✓ Announces status: "On Track"
   ✓ Announces date: "Mar 15, 2024"
   ✓ Announces progress: "68%"

3. Press Enter on project card
   ✓ Navigates to project (or provides feedback)
```

### Test Scenario 3: Dark Mode

**Test**: Verify accessibility in dark mode

```markdown
1. Enable dark mode (if toggle exists, or use DevTools)
   ✓ Content remains readable
   ✓ Focus indicators remain visible
   ✓ No announcement of mode change (unless intentional)

2. Navigate all interactive elements
   ✓ All elements still have proper labels
   ✓ Visual indicators still work
```

### Test Scenario 4: Mobile/Touch

**Test**: On iOS with VoiceOver

```markdown
1. Open page on iPhone
   ✓ VoiceOver announces page title

2. Swipe right through elements
   ✓ Logical order maintained
   ✓ Touch targets are large enough (44px)

3. Double-tap stat cards
   ✓ Cards activate properly
   ✓ Feedback is provided
```

## Common Issues and Solutions

### Issue: "Button" Not Announced

**Problem**: Interactive element announced as generic "clickable" or not announced as button

**Solution**:
```tsx
// Bad
<div onClick={handleClick}>Click me</div>

// Good
<button type="button" onClick={handleClick}>
  Click me
</button>
```

### Issue: Missing or Poor Labels

**Problem**: Element announced as "button" with no context

**Solution**:
```tsx
// Bad
<button aria-label="Back">
  <ArrowLeft />
</button>

// Good
<button aria-label="Back to Blueprint Variants">
  <ArrowLeft />
  <span className="sr-only">Back to Blueprint Variants</span>
</button>
```

### Issue: Heading Hierarchy Skipped

**Problem**: Screen reader announces "heading level 1" then "heading level 3"

**Solution**:
```tsx
// Bad
<h1>Dashboard</h1>
<h3>Active Projects</h3>  {/* Skipped h2 */}

// Good
<h1>Dashboard</h1>
<h2>Active Projects</h2>
<h3>Downtown Tower</h3>
```

### Issue: Dynamic Content Not Announced

**Problem**: Content updates but screen reader doesn't announce it

**Solution**:
```tsx
// Add ARIA live region
<div aria-live="polite" aria-atomic="true">
  {message}
</div>

// For urgent messages
<div aria-live="assertive">
  {errorMessage}
</div>
```

### Issue: Focus Lost After Modal Close

**Problem**: Focus doesn't return to triggering element after modal closes

**Solution**:
```tsx
const previousFocus = useRef<HTMLElement | null>(null);

const openModal = () => {
  previousFocus.current = document.activeElement as HTMLElement;
  setIsOpen(true);
};

const closeModal = () => {
  setIsOpen(false);
  previousFocus.current?.focus();
};
```

## Documentation Template

Use this template to document screen reader testing results:

```markdown
# Screen Reader Testing Results
**Component**: PolishedVariant1Professional
**Date**: YYYY-MM-DD
**Tester**: [Your Name]
**Screen Reader**: NVDA 2023.3 / VoiceOver 14.0 / JAWS 2024

## Test Environment
- **OS**: Windows 11 / macOS 14
- **Browser**: Chrome 120 / Safari 17
- **Viewport**: 1920x1080 / 375x667 (mobile)

## Test Results

### ✅ Passed Tests
1. **Heading Hierarchy**
   - H1 exists and is unique
   - H2s properly nested under H1
   - H3s properly nested under H2s
   - No heading levels skipped

2. **Interactive Elements**
   - All buttons have descriptive labels
   - All links have meaningful text
   - Focus order is logical
   - Focus indicators are visible

3. **ARIA Attributes**
   - Stat cards have complete context in aria-label
   - Progress bars have proper aria-valuenow/min/max
   - Regions have aria-labelledby references
   - Live regions announce updates

### ⚠️ Issues Found
1. **[Issue Title]**
   - **Severity**: Critical / High / Medium / Low
   - **Description**: [What's wrong]
   - **Steps to Reproduce**: [How to encounter the issue]
   - **Expected**: [What should happen]
   - **Actual**: [What actually happens]
   - **Recommendation**: [How to fix]

### Navigation Flow

#### Desktop (NVDA)
1. Page loads → "Dashboard, heading level 1" ✅
2. Press H → Navigates headings correctly ✅
3. Press B → Navigates buttons correctly ✅
4. Tab through → Logical focus order ✅

#### Mobile (VoiceOver iOS)
1. Swipe right → Logical element order ✅
2. Double-tap elements → Activation works ✅
3. Touch targets → All ≥ 44px ✅

## Overall Assessment
**Status**: ✅ Pass / ⚠️ Pass with Issues / ❌ Fail

**Summary**: [Brief summary of accessibility status]

**Recommendations**:
- [Any improvements suggested]
- [Additional testing needed]
```

## Best Practices

### For Developers

1. **Always Use Semantic HTML**
   - `<button>` for buttons
   - `<a>` for links
   - `<header>`, `<main>`, `<nav>`, `<footer>` for landmarks
   - `<h1>` through `<h6>` for headings

2. **Provide Descriptive Labels**
   - Every interactive element needs a label
   - Labels should describe purpose, not just appearance
   - Context matters (e.g., "Edit user profile" not just "Edit")

3. **Test with Keyboard Only**
   - Tab through entire page
   - Ensure all functionality is accessible
   - Verify focus is always visible

4. **Use ARIA Sparingly**
   - Native HTML is better than ARIA
   - Only use ARIA when semantic HTML can't do the job
   - Test that ARIA actually improves the experience

### For Testers

1. **Test with Real Screen Readers**
   - Automated tools are a starting point
   - Manual testing catches real issues
   - Test with multiple screen readers if possible

2. **Document Everything**
   - Record what works well
   - Document issues with reproduction steps
   - Include screen reader verbosity level used

3. **Test Real User Workflows**
   - Don't just tab through the page
   - Actually try to complete tasks
   - Think like a blind user would

4. **Test at Different Verbosity Levels**
   - Some users use minimal announcements
   - Some users use maximum detail
   - Test both extremes

## Resources

### Learning Resources

- **WebAIM Screen Reader Testing**: https://webaim.org/articles/screenreader_testing/
- **Deque University**: https://dequeuniversity.com/
- **A11y Project**: https://www.a11yproject.com/
- **MDN Accessibility**: https://developer.mozilla.org/en-US/docs/Web/Accessibility

### WCAG Guidelines

- **WCAG 2.1**: https://www.w3.org/WAI/WCAG21/quickref/
- **Understanding WCAG 2.1**: https://www.w3.org/WAI/WCAG21/Understanding/

### Screen Reader User Surveys

- **WebAIM Screen Reader Survey**: https://webaim.org/projects/screenreadersurvey9/
  - Most popular: JAWS (40%), NVDA (31%), VoiceOver (13%)
  - Helps prioritize which screen readers to test

## Conclusion

Screen reader testing is essential for ensuring true accessibility. While automated tools catch many issues, manual testing with actual screen readers reveals the real user experience. Follow this guide to provide thorough testing and documentation of accessibility for all users.

**Remember**: Accessibility is not a checkbox\u2014it's an ongoing commitment to inclusive design.
