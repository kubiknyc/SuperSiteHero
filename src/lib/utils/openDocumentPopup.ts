// File: /src/lib/utils/openDocumentPopup.ts
// Utility function to open documents in a popup window for maximum viewing space

/**
 * Configuration options for the popup window
 */
export interface PopupWindowOptions {
  width?: number
  height?: number
  name?: string
}

/**
 * Opens a document in a popup window optimized for viewing
 *
 * The popup window is configured without URL bar, toolbar, and other browser chrome
 * to maximize the viewing space for the document.
 *
 * @param documentId - The ID of the document to view
 * @param options - Optional configuration for the popup window
 * @returns The popup window reference, or null if popup was blocked
 *
 * @example
 * ```tsx
 * // Basic usage
 * openDocumentPopup('doc-123')
 *
 * // With custom dimensions
 * openDocumentPopup('doc-123', { width: 1400, height: 900 })
 * ```
 */
export function openDocumentPopup(
  documentId: string,
  options: PopupWindowOptions = {}
): Window | null {
  const {
    width = 1200,
    height = 800,
    name = 'documentViewer'
  } = options

  // Calculate centered position
  const left = Math.max(0, (window.screen.width - width) / 2)
  const top = Math.max(0, (window.screen.height - height) / 2)

  // Window features for a clean popup without browser chrome
  // - toolbar=no: Hide the browser toolbar
  // - location=no: Hide the URL/location bar (may not work in all browsers for security)
  // - directories=no: Hide directory buttons (legacy)
  // - status=no: Hide the status bar
  // - menubar=no: Hide the menu bar
  // - scrollbars=yes: Enable scrollbars if needed
  // - resizable=yes: Allow resizing the window
  const features = [
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    'toolbar=no',
    'location=no',
    'directories=no',
    'status=no',
    'menubar=no',
    'scrollbars=yes',
    'resizable=yes',
  ].join(',')

  // Open the popup viewer page
  const url = `/documents/${documentId}/popup`
  const popup = window.open(url, name, features)

  // Focus the popup if it was successfully opened
  if (popup) {
    popup.focus()
  } else {
    // Popup was blocked - fallback to normal navigation
    console.warn('Popup was blocked. Consider allowing popups for this site.')
  }

  return popup
}

/**
 * Opens a document by URL in a popup window
 *
 * This is useful for opening external document URLs directly
 *
 * @param url - The full URL to open in the popup
 * @param title - Optional title/name for the window
 * @param options - Optional configuration for the popup window
 * @returns The popup window reference, or null if popup was blocked
 */
export function openUrlInPopup(
  url: string,
  title?: string,
  options: PopupWindowOptions = {}
): Window | null {
  const {
    width = 1200,
    height = 800,
    name = title || 'documentViewer'
  } = options

  // Calculate centered position
  const left = Math.max(0, (window.screen.width - width) / 2)
  const top = Math.max(0, (window.screen.height - height) / 2)

  const features = [
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    'toolbar=no',
    'location=no',
    'directories=no',
    'status=no',
    'menubar=no',
    'scrollbars=yes',
    'resizable=yes',
  ].join(',')

  const popup = window.open(url, name, features)

  if (popup) {
    popup.focus()
  } else {
    console.warn('Popup was blocked. Consider allowing popups for this site.')
  }

  return popup
}
