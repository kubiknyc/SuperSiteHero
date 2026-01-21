/**
 * PageTransition Component
 *
 * Provides smooth route/page transitions using Framer Motion.
 * Respects user's prefers-reduced-motion preference for accessibility.
 *
 * Usage:
 * ```tsx
 * <PageTransition>
 *   <Routes>...</Routes>
 * </PageTransition>
 * ```
 */

import { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

interface PageTransitionProps {
  children: ReactNode
  /** Transition mode: 'wait' waits for exit before enter, 'sync' runs both together */
  mode?: 'wait' | 'sync' | 'popLayout'
  /** Custom transition duration in seconds */
  duration?: number
  /** Disable transitions entirely */
  disabled?: boolean
}

// Animation variants for page transitions
const pageVariants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: -8,
  },
}

// Reduced motion variants (instant transitions)
const reducedMotionVariants = {
  initial: { opacity: 1 },
  animate: { opacity: 1 },
  exit: { opacity: 1 },
}

export function PageTransition({
  children,
  mode = 'wait',
  duration = 0.15,
  disabled = false,
}: PageTransitionProps) {
  const location = useLocation()
  const prefersReducedMotion = usePrefersReducedMotion()

  // Use instant transitions if user prefers reduced motion or transitions are disabled
  const variants = prefersReducedMotion || disabled ? reducedMotionVariants : pageVariants
  const transitionDuration = prefersReducedMotion || disabled ? 0 : duration

  return (
    <AnimatePresence mode={mode} initial={false}>
      <motion.div
        key={location.pathname}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{
          duration: transitionDuration,
          ease: [0.25, 0.1, 0.25, 1], // Smooth ease-out
        }}
        className="min-h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

/**
 * FadeTransition - Simple fade in/out transition
 */
export function FadeTransition({
  children,
  duration = 0.2,
}: {
  children: ReactNode
  duration?: number
}) {
  const location = useLocation()
  const prefersReducedMotion = usePrefersReducedMotion()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: prefersReducedMotion ? 1 : 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: prefersReducedMotion ? 1 : 0 }}
        transition={{ duration: prefersReducedMotion ? 0 : duration }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

/**
 * SlideTransition - Slide in from right, slide out to left
 * Good for forward/back navigation feel
 */
export function SlideTransition({
  children,
  duration = 0.2,
}: {
  children: ReactNode
  duration?: number
}) {
  const location = useLocation()
  const prefersReducedMotion = usePrefersReducedMotion()

  const slideVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={prefersReducedMotion ? reducedMotionVariants : slideVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{
          duration: prefersReducedMotion ? 0 : duration,
          ease: 'easeOut',
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

/**
 * ScaleTransition - Scale up on enter, scale down on exit
 * Good for modal-like content
 */
export function ScaleTransition({
  children,
  duration = 0.2,
}: {
  children: ReactNode
  duration?: number
}) {
  const location = useLocation()
  const prefersReducedMotion = usePrefersReducedMotion()

  const scaleVariants = {
    initial: { opacity: 0, scale: 0.96 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.96 },
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={prefersReducedMotion ? reducedMotionVariants : scaleVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{
          duration: prefersReducedMotion ? 0 : duration,
          ease: [0.25, 0.1, 0.25, 1],
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
