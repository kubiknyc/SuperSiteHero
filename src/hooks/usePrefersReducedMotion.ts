/**
 * usePrefersReducedMotion - Detects user's motion preferences
 *
 * Essential for accessibility - some users have vestibular disorders
 * that can be triggered by motion/animation (WCAG 2.1 Success Criterion 2.3.3)
 *
 * Usage:
 * ```tsx
 * const prefersReducedMotion = usePrefersReducedMotion()
 *
 * // Conditionally apply animations
 * <motion.div
 *   animate={prefersReducedMotion ? {} : { scale: 1.1 }}
 * />
 *
 * // Or with Tailwind
 * className={prefersReducedMotion ? '' : 'transition-all duration-200'}
 * ```
 */

import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Hook to detect if the user prefers reduced motion
 * @returns boolean - true if user prefers reduced motion
 */
export function usePrefersReducedMotion(): boolean {
  // Default to false, but check on mount
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || !window.matchMedia) {
      return false
    }
    return window.matchMedia(QUERY).matches
  })

  useEffect(() => {
    // Early return for SSR
    if (typeof window === 'undefined' || !window.matchMedia) {
      return
    }

    const mediaQuery = window.matchMedia(QUERY)

    // Listen for changes - initial value already set via useState initializer
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }

    // Legacy browsers (Safari < 14)
    // @ts-expect-error addListener is deprecated but needed for older Safari
    mediaQuery.addListener(handleChange)
    // @ts-expect-error removeListener is deprecated but needed for older Safari
    return () => mediaQuery.removeListener(handleChange)
  }, [])

  return prefersReducedMotion
}

/**
 * Get the initial reduced motion preference (for SSR-safe initial render)
 * This can be used to set initial values without hydration mismatch
 */
export function getReducedMotionPreference(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return false
  }
  return window.matchMedia(QUERY).matches
}

/**
 * Helper to conditionally return motion props based on preference
 *
 * Usage:
 * ```tsx
 * const motionProps = useMotionSafe({
 *   initial: { opacity: 0, y: 20 },
 *   animate: { opacity: 1, y: 0 },
 *   transition: { duration: 0.3 }
 * })
 *
 * // Returns empty object if user prefers reduced motion
 * <motion.div {...motionProps} />
 * ```
 */
export function useMotionSafe<T extends Record<string, unknown>>(
  motionProps: T
): T | Record<string, never> {
  const prefersReducedMotion = usePrefersReducedMotion()

  if (prefersReducedMotion) {
    return {}
  }

  return motionProps
}

// Note: For a withMotionSafe HOC that uses JSX,
// create a separate .tsx file or use the useMotionSafe hook directly
