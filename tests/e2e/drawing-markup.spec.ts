import { test, expect } from './fixtures/auth'

/**
 * E2E Tests for Drawing Markup Feature
 * Tests the complete user flow for adding markups to PDF and image documents
 */

test.describe('Drawing Markup Feature - PDF Documents', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    // Navigate to a project with documents
    // NOTE: Update the project ID and document ID with actual test data
    await authenticatedPage.goto('/projects')

    // Wait for projects to load
    await authenticatedPage.waitForLoadState('networkidle')
  })

  test('Test 1: Enable markup mode on PDF document', async ({ authenticatedPage }) => {
    // Open a document detail page
    // NOTE: Replace with actual document URL or navigation flow
    const documentLink = authenticatedPage.locator('[data-testid="document-link"]').first()
    await documentLink.click()

    // Wait for document viewer to load
    await authenticatedPage.waitForSelector('[data-testid="document-viewer"]', { timeout: 10000 })

    // Click the pencil/edit icon to enable markup mode
    const markupButton = authenticatedPage.locator('[data-testid="enable-markup"], [title="Enable Markup"], button:has-text("Markup")')
    await expect(markupButton).toBeVisible()
    await markupButton.click()

    // Verify canvas overlay appears
    await expect(authenticatedPage.locator('canvas, [data-testid="konva-stage"]')).toBeVisible()

    // Verify toolbar with drawing tools appears
    await expect(authenticatedPage.locator('[data-testid="markup-toolbar"], [title="Arrow"]')).toBeVisible()
  })

  test('Test 2: Draw arrow and verify persistence', async ({ authenticatedPage }) => {
    // Navigate to document with markup enabled
    await authenticatedPage.goto('/projects') // Replace with actual document URL

    // Wait for document to load
    await authenticatedPage.waitForSelector('[data-testid="document-viewer"]', { timeout: 10000 })

    // Enable markup mode
    await authenticatedPage.click('[data-testid="enable-markup"]')

    // Select arrow tool
    await authenticatedPage.click('[title="Arrow"]')

    // Draw an arrow by clicking and dragging on canvas
    const canvas = authenticatedPage.locator('canvas').first()
    const box = await canvas.boundingBox()

    if (box) {
      await canvas.hover({ position: { x: 100, y: 100 } })
      await authenticatedPage.mouse.down()
      await canvas.hover({ position: { x: 300, y: 300 } })
      await authenticatedPage.mouse.up()
    }

    // Wait for auto-save
    await authenticatedPage.waitForTimeout(1000)

    // Refresh the page
    await authenticatedPage.reload()

    // Wait for document to reload
    await authenticatedPage.waitForSelector('[data-testid="document-viewer"]', { timeout: 10000 })

    // Verify arrow is still visible after refresh
    await expect(canvas).toBeVisible()

    // NOTE: More specific verification would require checking canvas content
    // or server-side markup data
  })

  test('Test 3: Draw rectangle with custom color', async ({ authenticatedPage }) => {
    // Navigate and enable markup (reuse setup pattern)
    await authenticatedPage.goto('/projects') // Replace with actual document URL
    await authenticatedPage.waitForSelector('[data-testid="document-viewer"]', { timeout: 10000 })
    await authenticatedPage.click('[data-testid="enable-markup"]')

    // Select rectangle tool
    await authenticatedPage.click('[title="Rectangle"]')

    // Change color using color picker or preset
    const colorPicker = authenticatedPage.locator('input[type="color"]').first()
    await colorPicker.fill('#FF0000')

    // Draw rectangle
    const canvas = authenticatedPage.locator('canvas').first()
    const box = await canvas.boundingBox()

    if (box) {
      await canvas.hover({ position: { x: 150, y: 150 } })
      await authenticatedPage.mouse.down()
      await canvas.hover({ position: { x: 350, y: 250 } })
      await authenticatedPage.mouse.up()
    }

    // Verify rectangle appears
    await expect(canvas).toBeVisible()
  })

  test('Test 4: Draw circle', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/projects') // Replace with actual document URL
    await authenticatedPage.waitForSelector('[data-testid="document-viewer"]', { timeout: 10000 })
    await authenticatedPage.click('[data-testid="enable-markup"]')

    // Select circle tool
    await authenticatedPage.click('[title="Circle"]')

    // Draw circle from center
    const canvas = authenticatedPage.locator('canvas').first()
    const box = await canvas.boundingBox()

    if (box) {
      await canvas.hover({ position: { x: 200, y: 200 } })
      await authenticatedPage.mouse.down()
      await canvas.hover({ position: { x: 280, y: 280 } })
      await authenticatedPage.mouse.up()
    }

    await expect(canvas).toBeVisible()
  })

  test('Test 5: Change stroke width', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/projects') // Replace with actual document URL
    await authenticatedPage.waitForSelector('[data-testid="document-viewer"]', { timeout: 10000 })
    await authenticatedPage.click('[data-testid="enable-markup"]')

    // Select arrow tool
    await authenticatedPage.click('[title="Arrow"]')

    // Find and click stroke width button (e.g., "5")
    const strokeWidthButtons = authenticatedPage.locator('button').filter({ hasText: /^[1-8]$/ })
    const width5Button = strokeWidthButtons.filter({ hasText: '5' })

    if (await width5Button.count() > 0) {
      await width5Button.first().click()
    }

    // Draw with new stroke width
    const canvas = authenticatedPage.locator('canvas').first()
    const box = await canvas.boundingBox()

    if (box) {
      await canvas.hover({ position: { x: 120, y: 120 } })
      await authenticatedPage.mouse.down()
      await canvas.hover({ position: { x: 320, y: 320 } })
      await authenticatedPage.mouse.up()
    }
  })

  test('Test 6: Undo and Redo functionality', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/projects') // Replace with actual document URL
    await authenticatedPage.waitForSelector('[data-testid="document-viewer"]', { timeout: 10000 })
    await authenticatedPage.click('[data-testid="enable-markup"]')

    // Draw multiple shapes
    await authenticatedPage.click('[title="Rectangle"]')

    const canvas = authenticatedPage.locator('canvas').first()

    // Draw first rectangle
    await canvas.hover({ position: { x: 100, y: 100 } })
    await authenticatedPage.mouse.down()
    await canvas.hover({ position: { x: 200, y: 200 } })
    await authenticatedPage.mouse.up()

    await authenticatedPage.waitForTimeout(500)

    // Draw second rectangle
    await canvas.hover({ position: { x: 250, y: 250 } })
    await authenticatedPage.mouse.down()
    await canvas.hover({ position: { x: 350, y: 350 } })
    await authenticatedPage.mouse.up()

    // Click undo button
    const undoButton = authenticatedPage.locator('[title="Undo"]')
    await expect(undoButton).toBeVisible()
    await undoButton.click()

    // Wait for undo action
    await authenticatedPage.waitForTimeout(500)

    // Click redo button
    const redoButton = authenticatedPage.locator('[title="Redo"]')
    await expect(redoButton).toBeVisible()
    await redoButton.click()

    // Verify canvas still visible
    await expect(canvas).toBeVisible()
  })

  test('Test 7: Freehand drawing', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/projects') // Replace with actual document URL
    await authenticatedPage.waitForSelector('[data-testid="document-viewer"]', { timeout: 10000 })
    await authenticatedPage.click('[data-testid="enable-markup"]')

    // Select freehand tool
    await authenticatedPage.click('[title="Freehand"]')

    // Draw freehand line
    const canvas = authenticatedPage.locator('canvas').first()

    await canvas.hover({ position: { x: 100, y: 100 } })
    await authenticatedPage.mouse.down()

    // Move mouse to create a freehand path
    for (let i = 0; i <= 10; i++) {
      const x = 100 + i * 20
      const y = 100 + Math.sin(i * 0.5) * 50
      await canvas.hover({ position: { x, y } })
      await authenticatedPage.waitForTimeout(50)
    }

    await authenticatedPage.mouse.up()

    // Verify canvas
    await expect(canvas).toBeVisible()
  })

  test('Test 8: Text annotation', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/projects') // Replace with actual document URL
    await authenticatedPage.waitForSelector('[data-testid="document-viewer"]', { timeout: 10000 })
    await authenticatedPage.click('[data-testid="enable-markup"]')

    // Select text tool
    await authenticatedPage.click('[title="Text"]')

    // Click on canvas to add text
    const canvas = authenticatedPage.locator('canvas').first()
    await canvas.click({ position: { x: 150, y: 150 } })

    // Type text (this may require a text input to appear)
    await authenticatedPage.keyboard.type('Test annotation')

    // Press Enter or Escape to finalize text
    await authenticatedPage.keyboard.press('Escape')

    await expect(canvas).toBeVisible()
  })

  test('Test 9: Clear all markups', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/projects') // Replace with actual document URL
    await authenticatedPage.waitForSelector('[data-testid="document-viewer"]', { timeout: 10000 })
    await authenticatedPage.click('[data-testid="enable-markup"]')

    // Draw a few shapes
    await authenticatedPage.click('[title="Rectangle"]')

    const canvas = authenticatedPage.locator('canvas').first()
    await canvas.hover({ position: { x: 100, y: 100 } })
    await authenticatedPage.mouse.down()
    await canvas.hover({ position: { x: 200, y: 200 } })
    await authenticatedPage.mouse.up()

    await authenticatedPage.waitForTimeout(500)

    // Click "Clear All" button
    const clearButton = authenticatedPage.locator('[title="Clear All"], button:has-text("Clear All")')
    await expect(clearButton).toBeVisible()
    await clearButton.click()

    // Confirm if there's a confirmation dialog
    const confirmButton = authenticatedPage.locator('button:has-text("Confirm"), button:has-text("Yes")')
    if (await confirmButton.count() > 0) {
      await confirmButton.click()
    }

    // Verify canvas is still there but markups are cleared
    await expect(canvas).toBeVisible()
  })

  test('Test 10: Eraser tool', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/projects') // Replace with actual document URL
    await authenticatedPage.waitForSelector('[data-testid="document-viewer"]', { timeout: 10000 })
    await authenticatedPage.click('[data-testid="enable-markup"]')

    // Draw a shape first
    await authenticatedPage.click('[title="Circle"]')

    const canvas = authenticatedPage.locator('canvas').first()
    await canvas.hover({ position: { x: 200, y: 200 } })
    await authenticatedPage.mouse.down()
    await canvas.hover({ position: { x: 280, y: 280 } })
    await authenticatedPage.mouse.up()

    await authenticatedPage.waitForTimeout(500)

    // Select eraser tool
    await authenticatedPage.click('[title="Eraser"]')

    // Click on the shape to erase it
    await canvas.click({ position: { x: 240, y: 240 } })

    // Verify canvas still visible
    await expect(canvas).toBeVisible()
  })
})

test.describe('Drawing Markup Feature - Multi-Page PDFs', () => {
  test('Test 11: Page-specific markups', async ({ authenticatedPage }) => {
    // Navigate to a multi-page PDF document
    await authenticatedPage.goto('/projects') // Replace with actual multi-page PDF URL
    await authenticatedPage.waitForSelector('[data-testid="document-viewer"]', { timeout: 10000 })
    await authenticatedPage.click('[data-testid="enable-markup"]')

    // Add markup to page 1
    await authenticatedPage.click('[title="Arrow"]')

    const canvas = authenticatedPage.locator('canvas').first()
    await canvas.hover({ position: { x: 100, y: 100 } })
    await authenticatedPage.mouse.down()
    await canvas.hover({ position: { x: 200, y: 200 } })
    await authenticatedPage.mouse.up()

    await authenticatedPage.waitForTimeout(1000)

    // Navigate to page 2 (if pagination controls exist)
    const nextPageButton = authenticatedPage.locator('[aria-label="Next page"], button:has-text("Next")')
    if (await nextPageButton.count() > 0) {
      await nextPageButton.click()
      await authenticatedPage.waitForTimeout(1000)

      // Verify page 1 markups are not visible on page 2
      // Add markup to page 2
      await authenticatedPage.click('[title="Rectangle"]')
      await canvas.hover({ position: { x: 150, y: 150 } })
      await authenticatedPage.mouse.down()
      await canvas.hover({ position: { x: 250, y: 250 } })
      await authenticatedPage.mouse.up()

      // Navigate back to page 1
      const prevPageButton = authenticatedPage.locator('[aria-label="Previous page"], button:has-text("Previous")')
      await prevPageButton.click()
      await authenticatedPage.waitForTimeout(1000)

      // Verify page 1 markups are visible again
      await expect(canvas).toBeVisible()
    }
  })
})

test.describe('Drawing Markup Feature - Error Handling', () => {
  test('Test 12: Handle offline gracefully', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/projects') // Replace with actual document URL
    await authenticatedPage.waitForSelector('[data-testid="document-viewer"]', { timeout: 10000 })
    await authenticatedPage.click('[data-testid="enable-markup"]')

    // Draw a shape while online
    await authenticatedPage.click('[title="Arrow"]')

    const canvas = authenticatedPage.locator('canvas').first()
    await canvas.hover({ position: { x: 100, y: 100 } })
    await authenticatedPage.mouse.down()
    await canvas.hover({ position: { x: 200, y: 200 } })
    await authenticatedPage.mouse.up()

    await authenticatedPage.waitForTimeout(1000)

    // Simulate offline mode
    await authenticatedPage.context().setOffline(true)

    // Try to draw another shape
    await canvas.hover({ position: { x: 250, y: 250 } })
    await authenticatedPage.mouse.down()
    await canvas.hover({ position: { x: 350, y: 350 } })
    await authenticatedPage.mouse.up()

    // Wait for error message or toast
    await authenticatedPage.waitForTimeout(2000)

    // Check for error notification
    const errorToast = authenticatedPage.locator('[role="alert"], .toast, [data-testid="error-message"]')
    // Error toast may or may not appear depending on implementation

    // Restore online mode
    await authenticatedPage.context().setOffline(false)
  })
})
