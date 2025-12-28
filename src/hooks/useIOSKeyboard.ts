/**
 * iOS Keyboard Hook
 *
 * Handles iOS-specific keyboard behavior in PWAs:
 * - Prevents viewport resizing when keyboard opens
 * - Provides keyboard visibility state
 * - Scrolls focused input into view
 * - Handles viewport height changes
 *
 * Uses the Visual Viewport API for accurate keyboard detection.
 */

import { useState, useEffect, useCallback, useRef } from 'react'

interface UseIOSKeyboardReturn {
  /** Whether the keyboard is currently visible */
  isKeyboardVisible: boolean
  /** Current keyboard height in pixels */
  keyboardHeight: number
  /** Visual viewport height (excludes keyboard) */
  viewportHeight: number
  /** Scroll an element into view above the keyboard */
  scrollIntoView: (element: HTMLElement | null) => void
  /** Force hide the keyboard by blurring active element */
  hideKeyboard: () => void
}

/**
 * Detect if we're on iOS
 */
function isIOS(): boolean {
  if (typeof navigator === 'undefined') {return false}
  return /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

/**
 * Detect if we're in standalone PWA mode
 */
function isStandalone(): boolean {
  if (typeof window === 'undefined') {return false}
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
}

/**
 * Hook for handling iOS keyboard behavior in PWAs
 *
 * @example
 * ```tsx
 * function MyForm() {
 *   const { isKeyboardVisible, keyboardHeight, scrollIntoView } = useIOSKeyboard()
 *   const inputRef = useRef<HTMLInputElement>(null)
 *
 *   return (
 *     <div style={{ paddingBottom: isKeyboardVisible ? keyboardHeight : 0 }}>
 *       <input
 *         ref={inputRef}
 *         onFocus={() => scrollIntoView(inputRef.current)}
 *       />
 *     </div>
 *   )
 * }
 * ```
 */
export function useIOSKeyboard(): UseIOSKeyboardReturn {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(
    typeof window !== 'undefined' ? window.innerHeight : 0
  )

  const initialHeight = useRef(
    typeof window !== 'undefined' ? window.innerHeight : 0
  )

  // Handle viewport resize (keyboard show/hide)
  useEffect(() => {
    if (typeof window === 'undefined') {return}
    if (!isIOS()) {return}

    const visualViewport = window.visualViewport

    // Store initial height
    initialHeight.current = window.innerHeight

    const handleResize = () => {
      if (!visualViewport) {return}

      const currentHeight = visualViewport.height
      const heightDiff = initialHeight.current - currentHeight

      // Keyboard is visible if viewport is significantly smaller (>150px threshold)
      const keyboardVisible = heightDiff > 150

      setIsKeyboardVisible(keyboardVisible)
      setKeyboardHeight(keyboardVisible ? heightDiff : 0)
      setViewportHeight(currentHeight)

      // In standalone mode, prevent body scroll when keyboard is visible
      if (isStandalone() && keyboardVisible) {
        document.body.style.height = `${currentHeight}px`
        document.body.style.overflow = 'hidden'
      } else if (isStandalone()) {
        document.body.style.height = ''
        document.body.style.overflow = ''
      }
    }

    const handleScroll = () => {
      // Prevent iOS from scrolling the entire page when focusing inputs
      if (visualViewport && isStandalone()) {
        window.scrollTo(0, 0)
      }
    }

    if (visualViewport) {
      visualViewport.addEventListener('resize', handleResize)
      visualViewport.addEventListener('scroll', handleScroll)

      // Initial check
      handleResize()

      return () => {
        visualViewport.removeEventListener('resize', handleResize)
        visualViewport.removeEventListener('scroll', handleScroll)
        // Cleanup body styles
        document.body.style.height = ''
        document.body.style.overflow = ''
      }
    }

    // Fallback for older iOS without visualViewport
    const handleFallbackResize = () => {
      const currentHeight = window.innerHeight
      const heightDiff = initialHeight.current - currentHeight
      const keyboardVisible = heightDiff > 150

      setIsKeyboardVisible(keyboardVisible)
      setKeyboardHeight(keyboardVisible ? heightDiff : 0)
      setViewportHeight(currentHeight)
    }

    window.addEventListener('resize', handleFallbackResize)
    return () => window.removeEventListener('resize', handleFallbackResize)
  }, [])

  // Handle focus events to detect keyboard
  useEffect(() => {
    if (typeof window === 'undefined') {return}
    if (!isIOS()) {return}

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Give iOS time to show keyboard and resize viewport
        setTimeout(() => {
          // Ensure the focused element is visible
          target.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 300)
      }
    }

    const handleFocusOut = () => {
      // Reset scroll position when keyboard hides
      if (isStandalone()) {
        setTimeout(() => {
          window.scrollTo(0, 0)
        }, 100)
      }
    }

    document.addEventListener('focusin', handleFocusIn)
    document.addEventListener('focusout', handleFocusOut)

    return () => {
      document.removeEventListener('focusin', handleFocusIn)
      document.removeEventListener('focusout', handleFocusOut)
    }
  }, [])

  // Scroll element into view above keyboard
  const scrollIntoView = useCallback((element: HTMLElement | null) => {
    if (!element) {return}

    // Wait for keyboard to fully appear
    setTimeout(() => {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }, 350)
  }, [])

  // Force hide keyboard
  const hideKeyboard = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
  }, [])

  return {
    isKeyboardVisible,
    keyboardHeight,
    viewportHeight,
    scrollIntoView,
    hideKeyboard,
  }
}

export default useIOSKeyboard
