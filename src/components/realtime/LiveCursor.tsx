/**
 * Live Cursor Component
 *
 * Displays animated cursors for other users in collaborative editing sessions.
 * Uses Framer Motion for smooth cursor animations.
 */

import React, { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { UserCursor } from '@/hooks/useLiveCursors'

/**
 * Props for a single cursor component
 */
interface LiveCursorProps {
  userId: string
  userName: string
  color: string
  x: number
  y: number
}

/**
 * Single live cursor component with smooth animation
 */
export const LiveCursor: React.FC<LiveCursorProps> = memo(function LiveCursor({
  userId,
  userName,
  color,
  x,
  y,
}) {
  return (
    <motion.div
      key={userId}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{
        opacity: 1,
        scale: 1,
        x,
        y,
      }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{
        type: 'spring',
        damping: 30,
        stiffness: 200,
        mass: 0.5,
      }}
      className="pointer-events-none absolute left-0 top-0 z-50"
      style={{ willChange: 'transform' }}
    >
      {/* Cursor Arrow SVG */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-md"
        style={{ filter: `drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2))` }}
      >
        <path
          d="M5.65376 12.3673L13.0564 5.00413L9.98988 19.9905L7.17563 13.3717L5.65376 12.3673Z"
          fill={color}
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* User Name Label */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="ml-5 -mt-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium text-white shadow-lg"
        style={{
          backgroundColor: color,
          maxWidth: '120px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {userName}
      </motion.div>
    </motion.div>
  )
})

/**
 * Props for the cursor container component
 */
interface LiveCursorsContainerProps {
  cursors: UserCursor[]
  /** Optional className for the container */
  className?: string
  /** Whether to show cursors (useful for toggling) */
  visible?: boolean
}

/**
 * Container component that renders all live cursors
 * Position this as a fixed overlay on top of your collaborative area
 */
export const LiveCursorsContainer: React.FC<LiveCursorsContainerProps> = memo(
  function LiveCursorsContainer({ cursors, className = '', visible = true }) {
    if (!visible || cursors.length === 0) {
      return null
    }

    return (
      <div
        className={`pointer-events-none fixed inset-0 z-[9999] overflow-hidden ${className}`}
        aria-hidden="true"
      >
        <AnimatePresence mode="popLayout">
          {cursors.map((cursor) => (
            <LiveCursor
              key={cursor.userId}
              userId={cursor.userId}
              userName={cursor.userName}
              color={cursor.color}
              x={cursor.position.x}
              y={cursor.position.y}
            />
          ))}
        </AnimatePresence>
      </div>
    )
  }
)

/**
 * Props for relative cursor container (positioned within a parent element)
 */
interface RelativeCursorsContainerProps {
  cursors: UserCursor[]
  /** Optional className for the container */
  className?: string
  /** Whether to show cursors */
  visible?: boolean
}

/**
 * Relative cursor container for positioning within a specific element
 * Use this when cursors should be relative to a canvas or document viewer
 */
export const RelativeCursorsContainer: React.FC<RelativeCursorsContainerProps> = memo(
  function RelativeCursorsContainer({ cursors, className = '', visible = true }) {
    if (!visible || cursors.length === 0) {
      return null
    }

    return (
      <div
        className={`pointer-events-none absolute inset-0 z-50 overflow-hidden ${className}`}
        aria-hidden="true"
      >
        <AnimatePresence mode="popLayout">
          {cursors.map((cursor) => (
            <LiveCursor
              key={cursor.userId}
              userId={cursor.userId}
              userName={cursor.userName}
              color={cursor.color}
              x={cursor.position.x}
              y={cursor.position.y}
            />
          ))}
        </AnimatePresence>
      </div>
    )
  }
)

/**
 * Online users indicator showing who's currently viewing
 */
interface OnlineUsersIndicatorProps {
  cursors: UserCursor[]
  maxDisplay?: number
  className?: string
}

export const OnlineUsersIndicator: React.FC<OnlineUsersIndicatorProps> = memo(
  function OnlineUsersIndicator({ cursors, maxDisplay = 5, className = '' }) {
    const displayedCursors = cursors.slice(0, maxDisplay)
    const remainingCount = Math.max(0, cursors.length - maxDisplay)

    if (cursors.length === 0) {
      return null
    }

    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <div className="flex -space-x-2">
          {displayedCursors.map((cursor) => (
            <div
              key={cursor.userId}
              className="relative h-8 w-8 rounded-full border-2 border-white shadow-sm"
              style={{ backgroundColor: cursor.color }}
              title={cursor.userName}
            >
              <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                {cursor.userName.charAt(0).toUpperCase()}
              </span>
            </div>
          ))}
          {remainingCount > 0 && (
            <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-500 text-xs font-medium text-white shadow-sm">
              +{remainingCount}
            </div>
          )}
        </div>
        <span className="ml-2 text-sm text-secondary">
          {cursors.length} online
        </span>
      </div>
    )
  }
)

export default LiveCursorsContainer
