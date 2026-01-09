/**
 * Agent FAB (Floating Action Button)
 * A floating button in bottom-right corner to open the agent chat
 * Features:
 * - AI assistant icon
 * - Badge showing unread message count
 * - Animated pulse effect when agent has suggestions
 * - Click opens the AgentChatPanel as a slide-out drawer
 */

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Sparkles, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useAgent } from './AgentProvider'
import { AgentKeyboardShortcut } from './AgentKeyboardShortcut'

// ============================================================================
// Types
// ============================================================================

interface AgentFABProps {
  /**
   * Position of the FAB
   * @default 'bottom-right'
   */
  position?: 'bottom-right' | 'bottom-left'
  /**
   * Whether to show keyboard shortcut hint in tooltip
   * @default true
   */
  showShortcutHint?: boolean
  /**
   * Custom class name
   */
  className?: string
}

// ============================================================================
// Component
// ============================================================================

export function AgentFAB({
  position = 'bottom-right',
  showShortcutHint = true,
  className,
}: AgentFABProps) {
  const {
    isOpen,
    isMinimized,
    hasUnreadMessages,
    hasSuggestions,
    isProcessing,
    openChat,
    maximizeChat,
  } = useAgent()

  // Don't render FAB when chat is fully open (not minimized)
  if (isOpen && !isMinimized) {
    return null
  }

  const handleClick = () => {
    if (isMinimized) {
      maximizeChat()
    } else {
      openChat()
    }
  }

  // Position classes
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className={cn(
          'fixed z-50',
          positionClasses[position],
          className
        )}
      >
        {/* Pulse animation ring when agent has suggestions */}
        {hasSuggestions && (
          <motion.div
            className={cn(
              'absolute inset-0 rounded-full',
              'bg-primary/30'
            )}
            animate={{
              scale: [1, 1.4, 1.4],
              opacity: [0.6, 0, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
        )}

        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              {isMinimized ? (
                // Minimized state - show compact pill
                <motion.button
                  onClick={handleClick}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-full',
                    'bg-primary text-primary-foreground shadow-lg',
                    'hover:bg-primary/90 hover:shadow-xl',
                    'transition-all duration-200',
                    'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Sparkles className="h-4 w-4" />
                  <span className="text-sm font-medium">JobSight AI</span>
                  {isProcessing && (
                    <motion.div
                      className="h-2 w-2 rounded-full bg-primary-foreground/80"
                      animate={{ opacity: [1, 0.4, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  )}
                  {hasUnreadMessages && !isProcessing && (
                    <Badge
                      variant="secondary"
                      className="h-5 min-w-[20px] px-1.5 text-xs bg-white/20 text-white"
                    >
                      !
                    </Badge>
                  )}
                </motion.button>
              ) : (
                // Closed state - show FAB button
                <motion.div className="relative">
                  <Button
                    onClick={handleClick}
                    size="lg"
                    className={cn(
                      'h-14 w-14 rounded-full shadow-lg',
                      'bg-primary hover:bg-primary/90',
                      'hover:shadow-xl',
                      'transition-all duration-200',
                      'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                      // Gradient overlay for premium look
                      'relative overflow-hidden',
                      'before:absolute before:inset-0 before:bg-gradient-to-br',
                      'before:from-white/10 before:to-transparent before:opacity-50'
                    )}
                    aria-label="Open JobSight AI Assistant"
                  >
                    <Sparkles className="h-6 w-6 relative z-10" />
                  </Button>

                  {/* Unread message badge */}
                  {hasUnreadMessages && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={cn(
                        'absolute -top-1 -right-1',
                        'h-5 min-w-[20px] px-1.5',
                        'flex items-center justify-center',
                        'bg-destructive text-destructive-foreground',
                        'text-xs font-medium rounded-full',
                        'shadow-md'
                      )}
                    >
                      !
                    </motion.div>
                  )}

                  {/* Processing indicator */}
                  {isProcessing && (
                    <motion.div
                      className={cn(
                        'absolute -bottom-1 left-1/2 -translate-x-1/2',
                        'flex items-center gap-0.5'
                      )}
                    >
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="h-1.5 w-1.5 rounded-full bg-primary"
                          animate={{ y: [0, -4, 0] }}
                          transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            delay: i * 0.15,
                          }}
                        />
                      ))}
                    </motion.div>
                  )}
                </motion.div>
              )}
            </TooltipTrigger>
            <TooltipContent
              side={position === 'bottom-right' ? 'left' : 'right'}
              className="flex items-center gap-2"
            >
              <span>Open JobSight AI</span>
              {showShortcutHint && <AgentKeyboardShortcut variant="compact" />}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </motion.div>
    </AnimatePresence>
  )
}

export default AgentFAB
