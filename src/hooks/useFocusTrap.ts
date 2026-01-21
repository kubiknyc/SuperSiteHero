/**
 * useFocusTrap - Traps focus within a container element
 *
 * Essential for modal dialogs to ensure keyboard users can't Tab
 * out of the dialog to content behind it (WCAG 2.1 Success Criterion 2.4.3)
 */

import { useCallback, useEffect, useRef } from 'react'

const FOCUSABLE_SELECTORS = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(', ')

interface UseFocusTrapOptions {
  /** Whether the focus trap is active (default: true) */
  enabled?: boolean
  /** Element to focus when trap activates (default: first focusable element) */
  initialFocus?: React.RefObject<HTMLElement>
  /** Element to return focus to when trap deactivates (default: previously focused element) */
  returnFocus?: React.RefObject<HTMLElement>
  /** Whether to auto-focus on mount (default: true) */
  autoFocus?: boolean
}

export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  options: UseFocusTrapOptions = {}
) {
  const {
    enabled = true,
    initialFocus,
    returnFocus,
    autoFocus = true,
  } = options

  const containerRef = useRef<T>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  // Get all focusable elements within the container
  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) {return []}
    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
    ).filter((el) => {
      // Filter out elements that are hidden or have display: none
      const style = window.getComputedStyle(el)
      return style.display !== 'none' && style.visibility !== 'hidden'
    })
  }, [])

  // Handle Tab key navigation
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled || event.key !== 'Tab') {return}

      const focusableElements = getFocusableElements()
      if (focusableElements.length === 0) {return}

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      // Shift + Tab on first element -> focus last element
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      }
      // Tab on last element -> focus first element
      else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    },
    [enabled, getFocusableElements]
  )

  // Focus first element or initial focus element
  const focusFirst = useCallback(() => {
    if (!enabled || !autoFocus) {return}

    // Use initialFocus if provided
    if (initialFocus?.current) {
      initialFocus.current.focus()
      return
    }

    // Otherwise focus first focusable element
    const focusableElements = getFocusableElements()
    if (focusableElements.length > 0) {
      focusableElements[0].focus()
    } else if (containerRef.current) {
      // If no focusable elements, focus the container itself
      containerRef.current.setAttribute('tabindex', '-1')
      containerRef.current.focus()
    }
  }, [enabled, autoFocus, initialFocus, getFocusableElements])

  // Set up focus trap
  useEffect(() => {
    if (!enabled) {return}

    // Store currently focused element to restore later
    previouslyFocusedRef.current = document.activeElement as HTMLElement

    // Copy ref values to local variables for cleanup
    const returnFocusElement = returnFocus?.current

    // Focus first element after a brief delay to ensure DOM is ready
    const timeoutId = setTimeout(focusFirst, 0)

    // Add keydown listener for Tab trapping
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('keydown', handleKeyDown)

      // Restore focus to previous element
      const elementToFocus = returnFocusElement || previouslyFocusedRef.current
      if (elementToFocus && typeof elementToFocus.focus === 'function') {
        // Use setTimeout to ensure focus happens after dialog closes
        setTimeout(() => elementToFocus.focus(), 0)
      }
    }
  }, [enabled, focusFirst, handleKeyDown, returnFocus])

  return containerRef
}

/**
 * useFocusReturn - Simple hook to return focus to the triggering element
 *
 * Useful when useFocusTrap is too heavy or not needed
 */
export function useFocusReturn(enabled: boolean = true) {
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!enabled) {return}

    previouslyFocusedRef.current = document.activeElement as HTMLElement

    return () => {
      if (previouslyFocusedRef.current?.focus) {
        setTimeout(() => previouslyFocusedRef.current?.focus(), 0)
      }
    }
  }, [enabled])
}
