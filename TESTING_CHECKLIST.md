# Drawing Markup Feature - Testing Checklist

## Prerequisites
- [ ] Dev server running at http://localhost:5173/
- [ ] Sample documents uploaded (at least 1 PDF and 1 image)
- [ ] User logged in

---

## Test 1: Version Control Feature

### Upload New Version
- [ ] Navigate to any document detail page
- [ ] Click "Upload New Version" button
- [ ] Select a file (PDF or image)
- [ ] Enter version notes (e.g., "Updated design based on feedback")
- [ ] Click "Upload"
- [ ] Verify success toast appears
- [ ] Verify new version appears in version history

### View Version History
- [ ] Click "Version History (X)" button
- [ ] Verify dialog opens showing all versions
- [ ] Verify latest version has "Latest" badge
- [ ] Verify versions are sorted chronologically
- [ ] Verify each version shows:
  - [ ] Version number (e.g., v1.1)
  - [ ] Status badge
  - [ ] Date/time
  - [ ] File size
  - [ ] Description/notes

### Revert to Previous Version
- [ ] In version history dialog, find a previous version
- [ ] Click "Revert" button
- [ ] Verify success toast appears
- [ ] Verify version is now marked as "Latest"
- [ ] Close dialog and refresh page
- [ ] Verify reverted version is displayed

---

## Test 2: Drawing Markup Feature - PDF Documents

### Enable Markup Mode
- [ ] Navigate to a PDF document detail page
- [ ] Verify PDF viewer loads successfully
- [ ] Locate the pencil icon button in toolbar (top right)
- [ ] Click pencil icon to enable markup
- [ ] Verify button changes color (becomes highlighted)
- [ ] Verify drawing toolbar appears on left side
- [ ] Verify cursor changes when hovering over PDF

### Tool 1: Select Tool
- [ ] Click "Select" tool (cursor icon)
- [ ] Draw an arrow on the PDF first
- [ ] Switch back to Select tool
- [ ] Click on the arrow
- [ ] Verify arrow is selected (has transform handles)
- [ ] Try dragging the arrow
- [ ] Try resizing with handles
- [ ] Click outside to deselect

### Tool 2: Arrow Tool
- [ ] Click "Arrow" tool (arrow icon)
- [ ] Click and drag on PDF to draw an arrow
- [ ] Release mouse
- [ ] Verify arrow appears with pointer head
- [ ] Draw 2-3 more arrows in different locations
- [ ] Verify each arrow is saved (shows up after drawing)

### Tool 3: Rectangle Tool
- [ ] Click "Rectangle" tool (square icon)
- [ ] Click and drag to draw a rectangle
- [ ] Release mouse
- [ ] Verify rectangle appears
- [ ] Draw a few more rectangles
- [ ] Verify rectangles have transparent fill, colored stroke

### Tool 4: Circle Tool
- [ ] Click "Circle" tool (circle icon)
- [ ] Click and drag to draw a circle
- [ ] Release mouse
- [ ] Verify circle appears from center outward
- [ ] Draw multiple circles of different sizes

### Tool 5: Text Tool
- [ ] Click "Text" tool (T icon)
- [ ] Click anywhere on PDF
- [ ] Verify text "Double-click to edit" appears
- [ ] Try adding multiple text annotations
- [ ] Note: Text editing may not be implemented yet (that's OK)

### Tool 6: Freehand Tool
- [ ] Click "Freehand" tool (pencil icon)
- [ ] Click and drag to draw free-form lines
- [ ] Release mouse
- [ ] Verify smooth curved line appears
- [ ] Draw circles, squiggles, signatures
- [ ] Verify lines are smooth (not jagged)

### Tool 7: Eraser Tool
- [ ] Click "Eraser" tool (eraser icon)
- [ ] Click on any shape you drew earlier
- [ ] Verify shape disappears immediately
- [ ] Try erasing 2-3 more shapes
- [ ] Verify shapes are deleted

### Color Picker
- [ ] Locate color picker input (should show current color)
- [ ] Click color picker
- [ ] Select a different color (e.g., blue)
- [ ] Draw an arrow
- [ ] Verify arrow is drawn in the new color
- [ ] Change to another color (e.g., green)
- [ ] Draw a rectangle
- [ ] Verify rectangle is green

### Stroke Width
- [ ] Locate stroke width slider (1-10px)
- [ ] Drag slider to 1px (minimum)
- [ ] Draw an arrow
- [ ] Verify arrow has thin stroke
- [ ] Drag slider to 10px (maximum)
- [ ] Draw another arrow
- [ ] Verify arrow has thick stroke
- [ ] Try mid-range value (5px)

### Undo/Redo
- [ ] Draw 3-4 shapes
- [ ] Click "Undo" button
- [ ] Verify last shape disappears
- [ ] Click "Undo" again
- [ ] Verify second-to-last shape disappears
- [ ] Click "Redo" button
- [ ] Verify shape reappears
- [ ] Click "Redo" again
- [ ] Verify next shape reappears
- [ ] Try undoing to empty state

### Clear All
- [ ] Draw several shapes (5-6)
- [ ] Click "Clear All" button (trash icon)
- [ ] Verify confirmation dialog appears
- [ ] Click "OK" to confirm
- [ ] Verify all shapes disappear from canvas
- [ ] Verify "All annotations cleared" toast appears

### Persistence (Critical Test)
- [ ] Draw 3-4 shapes of different types
- [ ] Note the position and color of shapes
- [ ] Refresh the page (F5)
- [ ] Wait for page to reload
- [ ] Verify all shapes reappear in correct positions
- [ ] Verify colors and stroke widths are preserved
- [ ] Verify shapes are still selectable/editable

### Multi-Page PDFs
- [ ] Navigate to next page in PDF (if multi-page)
- [ ] Verify previous page's markups disappear
- [ ] Draw new markups on page 2
- [ ] Navigate back to page 1
- [ ] Verify page 1 markups reappear
- [ ] Navigate to page 2 again
- [ ] Verify page 2 markups are still there

---

## Test 3: Drawing Markup Feature - Image Documents

### Enable Markup Mode
- [ ] Navigate to an image document detail page
- [ ] Verify image loads successfully
- [ ] Click pencil icon to enable markup
- [ ] Verify drawing toolbar appears
- [ ] Verify canvas overlays the image

### Test All Tools on Image
- [ ] Repeat all tool tests from PDF section above
- [ ] Arrow, Rectangle, Circle, Text, Freehand
- [ ] Verify all tools work on images
- [ ] Verify color picker works
- [ ] Verify stroke width works
- [ ] Verify undo/redo works

### Image-Specific: Zoom with Markup
- [ ] Enable markup mode
- [ ] Draw a shape
- [ ] Use zoom controls to zoom in (150%, 200%)
- [ ] Verify markup scales with image
- [ ] Draw another shape while zoomed in
- [ ] Zoom back out (100%)
- [ ] Verify both markups are in correct positions
- [ ] Note: This might have issues - document any problems

### Persistence on Images
- [ ] Draw 3-4 markups on image
- [ ] Refresh page
- [ ] Verify markups persist
- [ ] Verify positions are correct

---

## Test 4: Edge Cases & Error Handling

### No Network (Offline)
- [ ] Enable markup mode
- [ ] Draw a shape
- [ ] Disconnect internet
- [ ] Draw another shape
- [ ] Verify error toast appears (or shape fails to save)
- [ ] Reconnect internet
- [ ] Verify shapes eventually save (or refresh to see)

### Rapid Tool Switching
- [ ] Rapidly click between different tools
- [ ] Verify no errors occur
- [ ] Verify correct tool is always active
- [ ] Verify drawing works after switching

### Very Large/Small Strokes
- [ ] Set stroke width to 1px
- [ ] Draw freehand line
- [ ] Verify it's visible (not too thin)
- [ ] Set stroke width to 10px
- [ ] Draw freehand line
- [ ] Verify it doesn't look broken

### Many Shapes (Performance)
- [ ] Draw 20-30 shapes of various types
- [ ] Verify canvas doesn't lag
- [ ] Verify refresh loads all shapes quickly
- [ ] Verify undo/redo still works
- [ ] Clear all to clean up

---

## Test 5: Mobile/Tablet Testing (Optional)

### Touch Support
- [ ] Open site on mobile device or tablet
- [ ] Navigate to document with markup enabled
- [ ] Try drawing with finger/stylus
- [ ] Verify touch events work
- [ ] Verify gestures don't conflict (pan vs draw)

---

## Test 6: Integration Tests

### Markup + Version Control
- [ ] Draw markups on a document
- [ ] Upload a new version of the document
- [ ] Verify old markups don't appear on new version
- [ ] Verify you can draw new markups on new version
- [ ] Revert to old version
- [ ] Verify old markups reappear

### Multiple Users (if possible)
- [ ] User A draws markups on document
- [ ] User B opens same document
- [ ] Verify User B sees User A's markups
- [ ] User B draws markups
- [ ] User A refreshes
- [ ] Verify User A sees User B's markups

---

## Issues Found

### Critical Issues (Must Fix)
- [ ] Document any critical bugs that prevent feature from working

### Medium Issues (Should Fix)
- [ ] Document any issues that affect UX but don't break functionality

### Minor Issues (Nice to Fix)
- [ ] Document any cosmetic or minor issues

---

## Test Summary

**Date Tested:** ________________
**Tester:** ________________
**Overall Result:** ☐ Pass  ☐ Pass with Issues  ☐ Fail

**Notes:**
_______________________________________________________
_______________________________________________________
_______________________________________________________

**Next Steps:**
_______________________________________________________
_______________________________________________________
_______________________________________________________
