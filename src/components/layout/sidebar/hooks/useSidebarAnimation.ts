// File: src/components/layout/sidebar/hooks/useSidebarAnimation.ts
// Framer Motion animation configurations for the navigation sidebar

import { Variants, Transition, useReducedMotion } from 'framer-motion'
import { useMemo } from 'react'

// ============================================================================
// SPRING CONFIGURATIONS
// ============================================================================

/**
 * Premium spring config - snappy but smooth
 */
export const springConfig: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 30,
  mass: 0.8,
}

/**
 * Gentle spring for subtle animations
 */
export const gentleSpring: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 25,
  mass: 1,
}

/**
 * Quick spring for micro-interactions
 */
export const quickSpring: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 35,
  mass: 0.5,
}

// ============================================================================
// SIDEBAR EXPAND/COLLAPSE ANIMATIONS
// ============================================================================

export const sidebarVariants: Variants = {
  expanded: {
    width: 280,
    transition: {
      duration: 0.28,
      ease: [0.32, 0.72, 0, 1],
    },
  },
  collapsed: {
    width: 72,
    transition: {
      duration: 0.28,
      ease: [0.32, 0.72, 0, 1],
    },
  },
}

export const contentFadeVariants: Variants = {
  visible: {
    opacity: 1,
    transition: {
      delay: 0.08,
      duration: 0.15,
    },
  },
  hidden: {
    opacity: 0,
    transition: {
      duration: 0.1,
    },
  },
}

// ============================================================================
// NAVIGATION GROUP ANIMATIONS
// ============================================================================

/**
 * Container for staggered children animations
 */
export const groupContainerVariants: Variants = {
  expanded: {
    height: 'auto',
    opacity: 1,
    transition: {
      height: {
        type: 'spring',
        stiffness: 400,
        damping: 35,
        mass: 0.8,
      },
      opacity: { duration: 0.2 },
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
  collapsed: {
    height: 0,
    opacity: 0,
    transition: {
      height: {
        type: 'spring',
        stiffness: 500,
        damping: 40,
      },
      opacity: { duration: 0.15 },
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
}

/**
 * Individual item in a group - slides in from left
 */
export const groupItemVariants: Variants = {
  expanded: {
    opacity: 1,
    x: 0,
    transition: springConfig,
  },
  collapsed: {
    opacity: 0,
    x: -8,
    transition: {
      duration: 0.15,
    },
  },
}

/**
 * Chevron rotation for group headers
 */
export const chevronVariants: Variants = {
  expanded: {
    rotate: 0,
    transition: springConfig,
  },
  collapsed: {
    rotate: -90,
    transition: springConfig,
  },
}

// ============================================================================
// NAVIGATION ITEM ANIMATIONS
// ============================================================================

/**
 * Active indicator bar - slides in from left
 */
export const activeIndicatorVariants: Variants = {
  active: {
    scaleY: 1,
    opacity: 1,
    transition: quickSpring,
  },
  inactive: {
    scaleY: 0,
    opacity: 0,
    transition: {
      duration: 0.15,
    },
  },
}

/**
 * Icon hover/active state
 */
export const iconVariants: Variants = {
  idle: {
    scale: 1,
    transition: quickSpring,
  },
  hover: {
    scale: 1.05,
    transition: quickSpring,
  },
  active: {
    scale: 1,
    transition: quickSpring,
  },
}

// ============================================================================
// BADGE ANIMATIONS
// ============================================================================

/**
 * Badge appearance animation
 */
export const badgeVariants: Variants = {
  initial: {
    scale: 0,
    opacity: 0,
  },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 500,
      damping: 25,
      mass: 0.5,
    },
  },
  pulse: {
    scale: [1, 1.15, 1],
    transition: {
      duration: 0.3,
      ease: 'easeInOut',
    },
  },
}

/**
 * Badge count change animation
 */
export const badgeCountVariants: Variants = {
  initial: { y: -10, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: 10, opacity: 0 },
}

// ============================================================================
// TOOLTIP ANIMATIONS
// ============================================================================

export const tooltipVariants: Variants = {
  initial: {
    opacity: 0,
    x: -4,
    scale: 0.96,
  },
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      duration: 0.15,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    x: -4,
    scale: 0.96,
    transition: {
      duration: 0.1,
    },
  },
}

// ============================================================================
// USER DOCK ANIMATIONS
// ============================================================================

export const userDockVariants: Variants = {
  expanded: {
    opacity: 1,
    transition: {
      delay: 0.1,
      duration: 0.2,
    },
  },
  collapsed: {
    opacity: 0,
    transition: {
      duration: 0.15,
    },
  },
}

// ============================================================================
// COMMAND STRIP ANIMATIONS
// ============================================================================

export const searchTriggerVariants: Variants = {
  idle: {
    backgroundColor: 'rgba(255, 255, 255, 0)',
  },
  hover: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    transition: { duration: 0.15 },
  },
  focus: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    transition: { duration: 0.15 },
  },
}

// ============================================================================
// HOOK: useSidebarAnimation
// ============================================================================

interface UseSidebarAnimationOptions {
  isExpanded: boolean
  reducedMotion?: boolean
}

interface UseSidebarAnimationReturn {
  // Reduced motion flag
  shouldReduceMotion: boolean

  // Sidebar variants
  sidebarVariants: Variants
  contentFadeVariants: Variants

  // Group variants
  groupContainerVariants: Variants
  groupItemVariants: Variants
  chevronVariants: Variants

  // Item variants
  activeIndicatorVariants: Variants
  iconVariants: Variants

  // Badge variants
  badgeVariants: Variants
  badgeCountVariants: Variants

  // Other variants
  tooltipVariants: Variants
  userDockVariants: Variants
  searchTriggerVariants: Variants

  // Spring configs
  springConfig: Transition
  gentleSpring: Transition
  quickSpring: Transition

  // Current animation state
  animationState: 'expanded' | 'collapsed'
}

/**
 * Hook to manage sidebar animation configurations
 * Handles reduced motion preferences
 */
export function useSidebarAnimation({
  isExpanded,
  reducedMotion: forcedReducedMotion,
}: UseSidebarAnimationOptions): UseSidebarAnimationReturn {
  const prefersReducedMotion = useReducedMotion()
  const shouldReduceMotion = forcedReducedMotion ?? prefersReducedMotion ?? false

  // Memoize variants based on reduced motion preference
  const variants = useMemo(() => {
    if (shouldReduceMotion) {
      // Return simplified variants with no animations
      const noAnimation: Variants = {
        expanded: {},
        collapsed: {},
        active: {},
        inactive: {},
        idle: {},
        hover: {},
        initial: {},
        animate: {},
        exit: {},
        visible: {},
        hidden: {},
        pulse: {},
        focus: {},
      }

      return {
        sidebarVariants: noAnimation,
        contentFadeVariants: noAnimation,
        groupContainerVariants: {
          expanded: { height: 'auto', opacity: 1 },
          collapsed: { height: 0, opacity: 0 },
        },
        groupItemVariants: noAnimation,
        chevronVariants: noAnimation,
        activeIndicatorVariants: noAnimation,
        iconVariants: noAnimation,
        badgeVariants: noAnimation,
        badgeCountVariants: noAnimation,
        tooltipVariants: noAnimation,
        userDockVariants: noAnimation,
        searchTriggerVariants: noAnimation,
      }
    }

    // Full animations
    return {
      sidebarVariants,
      contentFadeVariants,
      groupContainerVariants,
      groupItemVariants,
      chevronVariants,
      activeIndicatorVariants,
      iconVariants,
      badgeVariants,
      badgeCountVariants,
      tooltipVariants,
      userDockVariants,
      searchTriggerVariants,
    }
  }, [shouldReduceMotion])

  return {
    shouldReduceMotion,
    ...variants,
    springConfig,
    gentleSpring,
    quickSpring,
    animationState: isExpanded ? 'expanded' : 'collapsed',
  }
}

export default useSidebarAnimation
