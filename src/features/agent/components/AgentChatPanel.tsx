/**
 * Agent Chat Panel
 * Main chat interface component for the AI agent
 */

import React, { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  X,
  Minus,
  Maximize2,
  MessageSquare,
  Sparkles,
  ChevronDown,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAgentChat } from '../state/store'
import { AgentChatInput } from './AgentChatInput'
import { AgentMessage } from './AgentMessage'
import { AgentQuickActions } from './AgentQuickActions'
import { useAgentMessages } from '../hooks/useAgentMessages'

// ============================================================================
// Component
// ============================================================================

export function AgentChatPanel() {
  const {
    isOpen,
    isMinimized,
    isProcessing,
    error,
    activeSession,
    sessions,
    openChat,
    closeChat,
    toggleChat,
    minimizeChat,
    maximizeChat,
    sendMessage,
    createSession,
    setActiveSession,
    clearError,
  } = useAgentChat()

  const { messages, isLoading: isLoadingMessages } = useAgentMessages(activeSession?.id)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollAreaRef.current && messages.length > 0) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight
      }
    }
  }, [messages])

  // Check scroll position for scroll-to-bottom button
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement
    const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100
    setShowScrollButton(!isNearBottom)
  }

  const scrollToBottom = () => {
    const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')
    if (scrollElement) {
      scrollElement.scrollTo({ top: scrollElement.scrollHeight, behavior: 'smooth' })
    }
  }

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return

    try {
      await sendMessage(content)
    } catch (err) {
      // Error is handled in store
    }
  }

  const handleNewChat = async () => {
    await createSession()
  }

  // Floating button when closed
  if (!isOpen) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <Button
          onClick={openChat}
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
        >
          <Sparkles className="h-6 w-6" />
          <span className="sr-only">Open AI Assistant</span>
        </Button>
      </motion.div>
    )
  }

  // Minimized state
  if (isMinimized) {
    return (
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <Button
          onClick={maximizeChat}
          className="flex items-center gap-2 shadow-lg"
        >
          <Sparkles className="h-4 w-4" />
          <span>JobSight AI</span>
          {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
        </Button>
      </motion.div>
    )
  }

  // Full panel
  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 400, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={cn(
          'fixed bottom-0 right-0 z-50',
          'w-full sm:w-[400px] md:w-[450px]',
          'h-[600px] max-h-[calc(100vh-2rem)]',
          'sm:bottom-4 sm:right-4 sm:rounded-xl',
          'bg-background border shadow-2xl',
          'flex flex-col overflow-hidden'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">JobSight AI</h3>
              <p className="text-xs text-muted-foreground">
                {isProcessing ? 'Thinking...' : 'Ready to help'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNewChat}>
              <MessageSquare className="h-4 w-4" />
              <span className="sr-only">New chat</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={minimizeChat}>
              <Minus className="h-4 w-4" />
              <span className="sr-only">Minimize</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={closeChat}>
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/20 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive flex-1">{error}</span>
            <Button variant="ghost" size="sm" onClick={clearError}>
              Dismiss
            </Button>
          </div>
        )}

        {/* Messages Area */}
        <ScrollArea
          ref={scrollAreaRef}
          className="flex-1 px-4"
          onScrollCapture={handleScroll}
        >
          <div className="py-4 space-y-4">
            {/* Welcome message if no messages */}
            {messages.length === 0 && !isLoadingMessages && (
              <div className="text-center py-8">
                <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h4 className="font-semibold mb-2">Welcome to JobSight AI</h4>
                <p className="text-sm text-muted-foreground mb-6 max-w-[280px] mx-auto">
                  I can help you with documents, daily reports, RFIs, and more. Try asking me something!
                </p>
                <AgentQuickActions onAction={handleSendMessage} />
              </div>
            )}

            {/* Loading state */}
            {isLoadingMessages && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Messages */}
            {messages.map((message) => (
              <AgentMessage key={message.id} message={message} />
            ))}

            {/* Processing indicator */}
            {isProcessing && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm">Thinking</span>
                  <Loader2 className="h-3 w-3 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <Button
            variant="secondary"
            size="icon"
            className="absolute bottom-20 right-4 h-8 w-8 rounded-full shadow-md"
            onClick={scrollToBottom}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        )}

        {/* Input Area */}
        <div className="p-4 border-t bg-muted/20">
          <AgentChatInput
            onSend={handleSendMessage}
            isDisabled={isProcessing}
            placeholder={isProcessing ? 'Please wait...' : 'Ask me anything...'}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
