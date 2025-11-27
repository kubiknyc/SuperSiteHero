# Manual Testing with Playwright

This guide explains how to use Playwright for interactive manual testing of the Drawing Markup feature and other application functionality.

## Prerequisites

Before starting manual testing:

1. **Ensure dev server is running**:
   ```bash
   npm run dev
   ```
   The server should be accessible at http://localhost:5174

2. **Ensure Playwright is installed**:
   ```bash
   npm run playwright:install
   ```

## Method 1: Codegen Mode (Recommended for Manual Testing)

Playwright Codegen opens a browser with recording capabilities, allowing you to manually test while automatically generating test code.

### Start Manual Testing Session

**Option A: Using NPM script** (Recommended)
```bash
npm run test:manual
```

**Option B: Using shell script**
```bash
# Unix/Mac/Linux
./scripts/manual-test.sh

# Windows
scripts\manual-test.bat
```

**Option C: Direct command**
```bash
npx playwright codegen http://localhost:5174
```

### What Happens

When you run the command:
1. **Chromium browser opens** with your application loaded
2. **Playwright Inspector window appears** showing recorded actions
3. **You can interact freely** - all actions are recorded as code
4. **Generated code appears in real-time** in the Inspector

### Manual Testing Workflow

1. **Login to the Application**
   - Enter credentials manually
   - Navigate through the login flow
   - Playwright records each action

2. **Navigate to Projects**
   - Click on projects
   - Select a project with documents
   - All navigation is recorded

3. **Test Drawing Markup Feature**
   - Open a document with PDF/image
   - Enable markup mode (click pencil icon)
   - Try each drawing tool:
     -  Arrow tool
     - =2 Rectangle tool
     - U Circle tool
     - =Ý Text tool
     -  Freehand tool
     - =± Select tool
     - >ù Eraser tool
   - Change colors using color picker
   - Change stroke widths (1, 2, 3, 5, 8)
   - Test undo/redo buttons
   - Test save functionality
   - Test clear all markups

4. **Save Generated Test Code**
   - Copy code from Playwright Inspector
   - Paste into a new test file
   - You now have an automated test!

### Using the Playwright Inspector

The Inspector window has several sections:

- **Recorder Controls**:
  - ú Record - Start/stop recording
  - =Ë Copy - Copy generated code
  - =Ñ Clear - Clear recorded actions

- **Selector Tools**:
  - <¯ Pick locator - Click to get element selector
  - =A Explore - Hover to see selectors
  -  Assert visibility - Add assertion for element
  -  Assert text - Add text assertion
  -  Assert value - Add value assertion

- **Generated Code Tab**:
  - Shows TypeScript test code
  - Updates in real-time as you interact
  - Can switch between languages (TypeScript, JavaScript, Python, etc.)

### Save Authentication State

To avoid logging in every time:

```bash
npm run test:manual:auth
```

This will:
1. Open browser at login page
2. Record your login process
3. Save authentication state to `auth.json`
4. Reuse this state in future tests

## Method 2: UI Mode (Interactive Test Runner)

Playwright UI Mode provides a visual interface for running and debugging existing tests.

### Start UI Mode

```bash
npm run test:e2e:ui
```

### Features

- **Test Browser**: See all available tests
- **Watch Mode**: Automatically rerun tests on file changes
- **Time Travel**: Step through test execution
- **DOM Explorer**: Inspect DOM at each step
- **Network Inspector**: View API calls and responses
- **Trace Viewer**: Detailed execution trace
- **Screenshots**: View screenshots at each step

### Workflow

1. Select test(s) to run from the sidebar
2. Click ¶ Play to execute
3. View execution in real-time
4. Click on any step to see:
   - DOM snapshot
   - Screenshots
   - Console logs
   - Network activity
5. Use time travel to replay specific actions

## Method 3: Debug Mode (Step-by-Step Testing)

Debug mode runs existing tests with breakpoints and inspection capabilities.

### Start Debug Mode

```bash
npm run test:inspect
```

or

```bash
npx playwright test --debug
```

### Features

- Pauses before each Playwright action
- Step through test line-by-line
- Inspect page state at any point
- Modify and rerun tests
- Set custom breakpoints

### Debug Commands

While debugging:
- **Step Over** (F10) - Execute current line
- **Step Into** (F11) - Step into function
- **Continue** (F8) - Run until next breakpoint
- **Pause** - Pause execution
- **Resume** - Continue execution

## Method 4: Headed Mode (Watch Tests Execute)

Headed mode runs automated tests in a visible browser (not headless).

### Start Headed Mode

```bash
npm run test:e2e:headed
```

### Use Cases

- Watch tests execute to verify behavior
- Debug visual issues
- Verify animations and transitions
- Check responsive behavior
- Observe timing-sensitive operations

**Note**: You cannot interact with the browser in this mode - it's automated but visible.

## Method 5: Run Specific Tests

Run individual tests or test files:

```bash
# Run specific test file
npx playwright test drawing-markup.spec.ts

# Run specific test by name
npx playwright test -g "Enable markup mode"

# Run tests in specific browser
npx playwright test --project=chromium

# Run with specific timeout
npx playwright test --timeout=60000
```

## Advanced Manual Testing

### Test on Different Devices

Emulate mobile devices:

```bash
# iPhone 12
npx playwright codegen --device="iPhone 12" http://localhost:5174

# iPad Pro
npx playwright codegen --device="iPad Pro" http://localhost:5174

# Pixel 5
npx playwright codegen --device="Pixel 5" http://localhost:5174
```

### Test Specific Pages

Navigate directly to specific pages:

```bash
# Start at specific project
npx playwright codegen http://localhost:5174/projects/123

# Start at document view
npx playwright codegen http://localhost:5174/projects/123/documents/456

# Start at any URL
npx playwright codegen http://localhost:5174/any/path
```

### Custom Browser Settings

```bash
# Slow motion (see actions clearly)
npx playwright codegen --slowmo=1000 http://localhost:5174

# Custom viewport size
npx playwright codegen --viewport-size=1920,1080 http://localhost:5174

# Start maximized
npx playwright codegen --start-maximized http://localhost:5174
```

### Generate Specific Selectors

1. Click **Pick locator** button in Inspector
2. Hover over any element in the browser
3. Click to select
4. Selector appears in Inspector
5. Use this selector in your tests

### Testing Offline Scenarios

```bash
# Start codegen
npm run test:manual

# In browser DevTools (F12):
# 1. Open Network tab
# 2. Change throttling to "Offline"
# 3. Test application behavior
```

## Manual Testing Checklist for Drawing Markup

Use this checklist when manually testing:

### Setup
- [ ] Dev server running on port 5174
- [ ] User logged in successfully
- [ ] Navigate to project with documents
- [ ] Open document with PDF or image

### Enable Markup Mode
- [ ] Click pencil/edit icon to enable markup
- [ ] Verify canvas overlay appears
- [ ] Verify toolbar with tools appears
- [ ] Verify tools are clickable

### Drawing Tools Testing
- [ ] **Arrow Tool**: Draw arrows in different directions
- [ ] **Rectangle Tool**: Draw rectangles of various sizes
- [ ] **Circle Tool**: Draw circles from center
- [ ] **Text Tool**: Add text annotations
- [ ] **Freehand Tool**: Draw curved paths
- [ ] **Select Tool**: Select and move existing markups
- [ ] **Eraser Tool**: Delete individual markups

### Customization Testing
- [ ] **Color Picker**: Change stroke color
- [ ] **Stroke Width**: Try all width options (1, 2, 3, 5, 8)
- [ ] Verify color changes apply to new drawings
- [ ] Verify width changes apply to new drawings

### Undo/Redo Testing
- [ ] Draw multiple shapes
- [ ] Click Undo - verify last shape removed
- [ ] Click Undo multiple times
- [ ] Click Redo - verify shapes restored
- [ ] Verify undo/redo state consistency

### Persistence Testing
- [ ] Draw several markups
- [ ] Wait for auto-save indicator (if visible)
- [ ] Refresh the page
- [ ] Verify markups are still present
- [ ] Verify all properties preserved (color, width, position)

### Clear All Testing
- [ ] Draw multiple markups
- [ ] Click "Clear All" button
- [ ] Verify confirmation dialog appears
- [ ] Click "Confirm"
- [ ] Verify all markups removed
- [ ] Refresh page
- [ ] Verify markups stay cleared

### Multi-Page PDF Testing (if applicable)
- [ ] Open multi-page PDF
- [ ] Add markup to page 1
- [ ] Navigate to page 2
- [ ] Verify page 1 markup not visible
- [ ] Add markup to page 2
- [ ] Navigate back to page 1
- [ ] Verify page 1 markup visible
- [ ] Verify page 2 markup not visible

### Error Handling
- [ ] Simulate network issues (DevTools offline mode)
- [ ] Try to save markup while offline
- [ ] Verify error message appears
- [ ] Restore network
- [ ] Verify markup saves successfully

### Browser Compatibility (if needed)
- [ ] Test in Chrome/Chromium
- [ ] Test in Firefox (if configured)
- [ ] Test in Safari (if configured)
- [ ] Test on mobile devices (responsive design)

## Troubleshooting

### Dev Server Not Running

**Problem**: Browser shows "Unable to connect" or similar error

**Solution**:
```bash
# Start dev server in separate terminal
npm run dev

# Then run manual testing
npm run test:manual
```

### Browser Doesn't Open

**Problem**: Command runs but no browser appears

**Solution**:
```bash
# Reinstall Playwright browsers
npm run playwright:install

# Or install all browsers
npx playwright install
```

### Port Already in Use

**Problem**: Dev server shows port 5174 is already in use

**Solution**:
1. Check if another instance is running
2. Kill the process using port 5174
3. Or change port in `vite.config.ts` and update Playwright config

### Inspector Window Not Showing

**Problem**: Browser opens but Inspector doesn't appear

**Solution**:
- Check if Inspector is minimized or behind other windows
- Try closing and reopening codegen
- Check console for error messages

### Recording Not Working

**Problem**: Actions not being recorded in Inspector

**Solution**:
- Ensure "Record" button is enabled (red dot)
- Click "Clear" and start recording again
- Check if Inspector window has focus

### Authentication Issues

**Problem**: Can't stay logged in or session expires

**Solution**:
```bash
# Save authentication state
npm run test:manual:auth

# Login manually, then close browser
# State is saved to auth.json

# Reuse in future tests by loading auth.json
```

## Tips and Best Practices

### Recording High-Quality Tests

1. **Use descriptive names**: Click elements with clear labels
2. **Add assertions**: Use Inspector tools to add checks
3. **Wait for elements**: Let page load before interacting
4. **Avoid timing issues**: Don't rush - Playwright records timing
5. **Group related actions**: Organize tests logically

### Selector Best Practices

1. **Prefer data-testid**: Most reliable selector
2. **Use role and label**: Good for accessibility
3. **Avoid CSS classes**: Can change with styling
4. **Use text content**: Good for buttons and links
5. **Generate with Inspector**: Use Pick Locator tool

### Manual Testing Efficiency

1. **Save auth state**: Avoid logging in every time
2. **Start at specific URLs**: Skip unnecessary navigation
3. **Use UI mode**: Best for iterative testing
4. **Record once, replay many**: Convert manual tests to automated
5. **Test incrementally**: Small changes, test frequently

### Debugging Failed Tests

1. **Run in headed mode**: See what's happening
2. **Use --debug flag**: Step through execution
3. **Check screenshots**: Available in test-results/
4. **View trace**: Detailed execution log
5. **Check network tab**: API call issues

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Codegen Guide](https://playwright.dev/docs/codegen)
- [Playwright Inspector](https://playwright.dev/docs/inspector)
- [Playwright UI Mode](https://playwright.dev/docs/test-ui-mode)
- [Best Practices](https://playwright.dev/docs/best-practices)

## Getting Help

If you encounter issues:

1. Check this guide's Troubleshooting section
2. Check Playwright documentation
3. Review test output and error messages
4. Check browser console for JavaScript errors
5. Verify network requests in DevTools

## Summary

**Quick Start**:
```bash
# 1. Start dev server (terminal 1)
npm run dev

# 2. Start manual testing (terminal 2)
npm run test:manual
```

**Most Useful Commands**:
- `npm run test:manual` - Manual testing with recording
- `npm run test:e2e:ui` - Interactive test runner
- `npm run test:inspect` - Debug existing tests
- `npm run test:e2e:headed` - Watch tests execute

**Best Practices**:
- Save authentication state
- Use data-testid attributes
- Test incrementally
- Convert good manual tests to automated tests
- Use UI mode for iterative development

Happy Testing!
