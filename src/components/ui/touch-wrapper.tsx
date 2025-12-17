/**
 * TouchWrapper Component
 *
 * A utility component that ensures interactive elements meet WCAG 2.1 Level AA
 * touch target requirements (44x44px minimum) on mobile devices.
 *
 * Design Philosophy:
 * - Invisible wrapper that enhances accessibility without visual impact
 * - Responsive: Full touch target on mobile, optional compact sizing on desktop
 * - Negative margin trick maintains visual spacing and alignment
 * - Optimized for field workers using gloves in varying conditions
 *
 * @example
 * ```tsx
 * // Wrap small interactive elements
 * <TouchWrapper>
 *   <Badge onClick={handleClick}>5</Badge>
 * </TouchWrapper>
 *
 * // Comfortable size for primary actions
 * <TouchWrapper size="comfortable">
 *   <SmallButton />
 * </TouchWrapper>
 *
 * // Glove mode for outdoor use
 * <TouchWrapper size="large">
 *   <IconButton />
 * </TouchWrapper>
 * ```
 */

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const touchWrapperVariants = cva(
  // Base classes: inline-flex for proper sizing, center content
  'inline-flex items-center justify-center',
  {
    variants: {
      size: {
        // Default: 44px minimum (WCAG AA compliant)
        // Responsive: Full target on mobile, compact on desktop
        default: 'min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0',

        // Comfortable: 48px for primary actions
        // Better for frequently-used controls
        comfortable: 'min-h-[48px] min-w-[48px] md:min-h-0 md:min-w-0',

        // Large: 60px for glove mode
        // Ideal for outdoor field workers
        large: 'min-h-[60px] min-w-[60px] md:min-h-0 md:min-w-0',
      },

      // Spacing strategy: negative margin counteracts padding
      // This maintains visual alignment while expanding touch area
      spacing: {
        // Default: Balanced spacing for most use cases
        default: '-m-2 md:m-0 p-2 md:p-0',

        // Comfortable: Slightly more generous spacing
        comfortable: '-m-2.5 md:m-0 p-2.5 md:p-0',

        // Large: Maximum spacing for glove mode
        large: '-m-3 md:m-0 p-3 md:p-0',

        // None: No spacing adjustment (manual control)
        none: '',
      },
    },
    defaultVariants: {
      size: 'default',
      spacing: 'default',
    },
  }
)

export interface TouchWrapperProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof touchWrapperVariants> {
  /**
   * The interactive element to wrap
   */
  children: React.ReactNode

  /**
   * Enable/disable touch wrapper behavior
   * When false, renders children directly without wrapper
   * Useful for conditional touch-friendly behavior
   * @default true
   */
  enabled?: boolean

  /**
   * Touch target size
   * - default: 44px (WCAG AA minimum)
   * - comfortable: 48px (recommended for primary actions)
   * - large: 60px (glove mode for field workers)
   * @default "default"
   */
  size?: 'default' | 'comfortable' | 'large'

  /**
   * Spacing strategy for maintaining visual alignment
   * Uses negative margin to expand touch area without affecting layout
   * - default: Standard spacing (-m-2/p-2)
   * - comfortable: Generous spacing (-m-2.5/p-2.5)
   * - large: Maximum spacing (-m-3/p-3)
   * - none: No automatic spacing (manual control)
   * @default Matches size variant
   */
  spacing?: 'default' | 'comfortable' | 'large' | 'none'

  /**
   * Additional CSS classes
   */
  className?: string

  /**
   * Accessible label for the wrapper
   * Useful for screen readers when wrapping unlabeled elements
   */
  'aria-label'?: string
}

/**
 * TouchWrapper - WCAG-compliant touch target wrapper
 *
 * Ensures interactive elements meet 44px minimum touch target size on mobile
 * while maintaining visual design and desktop usability.
 *
 * Technical Details:
 * - Uses inline-flex to properly size to content
 * - Negative margin trick: Expands touch area without affecting visual layout
 * - Responsive: Full target on mobile (<768px), optional compact on desktop
 * - Zero visual footprint: Transparent, no background or borders
 *
 * Accessibility:
 * - WCAG 2.1 Level AA compliant (44x44px minimum)
 * - Supports glove mode (60px) for field workers
 * - Maintains keyboard navigation and focus behavior
 *
 * @see https://www.w3.org/WAI/WCAG21/Understanding/target-size.html
 */
export const TouchWrapper = React.forwardRef<HTMLSpanElement, TouchWrapperProps>(
  (
    {
      children,
      enabled = true,
      size = 'default',
      spacing,
      className,
      'aria-label': ariaLabel,
      ...props
    },
    ref
  ) => {
    // If disabled, render children directly without wrapper
    if (!enabled) {
      return <>{children}</>
    }

    // Auto-match spacing to size if not explicitly set
    const effectiveSpacing = spacing ?? size

    return (
      <span
        ref={ref}
        className={cn(
          touchWrapperVariants({
            size,
            spacing: effectiveSpacing,
          }),
          className
        )}
        aria-label={ariaLabel}
        {...props}
      >
        {children}
      </span>
    )
  }
)

TouchWrapper.displayName = 'TouchWrapper'

/**
 * Hook for conditional touch wrapper based on viewport
 * Useful for components that need touch-friendly behavior only on mobile
 *
 * @example
 * ```tsx
 * const isTouchDevice = useTouchWrapper()
 * return (
 *   <TouchWrapper enabled={isTouchDevice}>
 *     <SmallButton />
 *   </TouchWrapper>
 * )
 * ```
 */
export const useTouchWrapper = (): boolean => {
  const [isTouchDevice, setIsTouchDevice] = React.useState(false)

  React.useEffect(() => {
    // Check for touch support and viewport width
    const checkTouchDevice = () => {
      const hasTouchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const isMobileViewport = window.innerWidth < 768 // md breakpoint
      setIsTouchDevice(hasTouchSupport && isMobileViewport)
    }

    checkTouchDevice()

    // Re-check on resize
    window.addEventListener('resize', checkTouchDevice)
    return () => window.removeEventListener('resize', checkTouchDevice)
  }, [])

  return isTouchDevice
}

/**
 * Glove Mode Context
 * Allows application-wide glove mode toggle for field workers
 *
 * @example
 * ```tsx
 * // In app root:
 * <GloveModeProvider>
 *   <App />
 * </GloveModeProvider>
 *
 * // In components:
 * const { isGloveModeEnabled } = useGloveMode()
 * <TouchWrapper size={isGloveModeEnabled ? 'large' : 'default'}>
 *   <IconButton />
 * </TouchWrapper>
 * ```
 */
interface GloveModeContextType {
  isGloveModeEnabled: boolean
  toggleGloveMode: () => void
  setGloveMode: (enabled: boolean) => void
}

const GloveModeContext = React.createContext<GloveModeContextType | undefined>(undefined)

export const GloveModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isGloveModeEnabled, setIsGloveModeEnabled] = React.useState(false)

  const toggleGloveMode = React.useCallback(() => {
    setIsGloveModeEnabled((prev) => !prev)
  }, [])

  const setGloveMode = React.useCallback((enabled: boolean) => {
    setIsGloveModeEnabled(enabled)
  }, [])

  const value = React.useMemo(
    () => ({
      isGloveModeEnabled,
      toggleGloveMode,
      setGloveMode,
    }),
    [isGloveModeEnabled, toggleGloveMode, setGloveMode]
  )

  return <GloveModeContext.Provider value={value}>{children}</GloveModeContext.Provider>
}

export const useGloveMode = (): GloveModeContextType => {
  const context = React.useContext(GloveModeContext)
  if (!context) {
    throw new Error('useGloveMode must be used within GloveModeProvider')
  }
  return context
}
