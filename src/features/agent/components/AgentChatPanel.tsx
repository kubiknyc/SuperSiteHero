/**
 * Agent Chat Panel
 * Main chat interface for the AI agent with slide-out drawer and full functionality
 */

import React, { useEffect, useRef, useState, useCallback } from 'react'
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
  History,
  Settings,
  Trash2,
  MoreVertical,
  RefreshCw,
  Moon,
  Sun,
  PanelRightClose,
  Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useAgentChat } from '../state/store'
import { useChatStore } from '../state/chat-store'
import { AgentChatInput } from './AgentChatInput'
import { AgentMessage, TypingIndicator } from './AgentMessage'
import { AgentQuickActions, ContextQuickActions } from './AgentQuickActions'
import { StreamingToolResult } from './AgentToolResult'
import { useAgentMessages } from '../hooks/useAgentMessages'
import { useAgentSession } from '../hooks/useAgentSession'
import type { AgentSession } from '../types/agent'
import type { Mention, Attachment } from '../types/chat'

// ============================================================================
// Types
// ============================================================================

interface AgentChatPanelProps {
  projectId?: string
  entityType?: string
  entityId?: string
  entityName?: string
  defaultOpen?: boolean
  position?: 'right' | 'bottom'
  /**
   * Whether to hide the internal FAB button when chat is closed/minimized
   * Set to true when using external AgentFAB component
   * @default false
   */
  hideInternalFAB?: boolean
}

// ============================================================================
// Component
// ============================================================================

export function AgentChatPanel({
  projectId,
  entityType,
  entityId,
  entityName,
  defaultOpen = false,
  position = 'right',
  hideInternalFAB = false,
}: AgentChatPanelProps) {
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

  const {
    streamingContent,
    streamingToolCalls,
    showTimestamps,
    showToolDetails,
    compactMode,
    toggleTimestamps,
    toggleToolDetails,
    toggleCompactMode,
  } = useChatStore()

  const { messages, isLoading: isLoadingMessages } = useAgentMessages(activeSession?.id)
  const { sessions: sessionList, switchSession, endSession } = useAgentSession({ projectId })

  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollAreaRef.current && messages.length > 0) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight
      }
    }
  }, [messages, streamingContent])

  // Check scroll position for scroll-to-bottom button
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement
    const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100
    setShowScrollButton(!isNearBottom)
  }, [])

  const scrollToBottom = useCallback(() => {
    const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')
    if (scrollElement) {
      scrollElement.scrollTo({ top: scrollElement.scrollHeight, behavior: 'smooth' })
    }
  }, [])

  const handleSendMessage = useCallback(
    async (content: string, mentions?: Mention[], attachments?: Attachment[]) => {
      if (!content.trim()) {return}

      try {
        await sendMessage(content)
      } catch (err) {
        // Error is handled in store
      }
    },
    [sendMessage]
  )

  const handleNewChat = useCallback(async () => {
    await createSession({ project_id: projectId })
    setShowHistory(false)
  }, [createSession, projectId])

  const handleSwitchSession = useCallback(
    (sessionId: string) => {
      switchSession(sessionId)
      setShowHistory(false)
    },
    [switchSession]
  )

  // Floating button when closed (only if hideInternalFAB is false)
  if (!isOpen) {
    if (hideInternalFAB) {
      return null
    }
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={openChat}
                size="lg"
                className={cn(
                  'h-14 w-14 rounded-full shadow-lg',
                  'bg-primary hover:bg-primary/90',
                  'transition-all duration-200 hover:scale-105'
                )}
              >
                <Sparkles className="h-6 w-6" />
                <span className="sr-only">Open AI Assistant</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Open JobSight AI</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </motion.div>
    )
  }

  // Minimized state (only show internal button if hideInternalFAB is false)
  if (isMinimized) {
    if (hideInternalFAB) {
      return null
    }
    return (
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <Button
          onClick={maximizeChat}
          className={cn(
            'flex items-center gap-2 shadow-lg px-4',
            'transition-all duration-200 hover:scale-105'
          )}
        >
          <Sparkles className="h-4 w-4" />
          <span>JobSight AI</span>
          {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
          {messages.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {messages.length}
            </Badge>
          )}
        </Button>
      </motion.div>
    )
  }

  // Full panel
  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: position === 'right' ? 400 : 0, y: position === 'bottom' ? 400 : 0, opacity: 0 }}
        animate={{ x: 0, y: 0, opacity: 1 }}
        exit={{ x: position === 'right' ? 400 : 0, y: position === 'bottom' ? 400 : 0, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={cn(
          'fixed z-50',
          'bg-background border shadow-2xl',
          'flex flex-col overflow-hidden',
          position === 'right' && [
            'bottom-0 right-0',
            'w-full sm:w-[420px] md:w-[480px]',
            'h-[100dvh] sm:h-[600px] sm:max-h-[calc(100vh-2rem)]',
            'sm:bottom-4 sm:right-4 sm:rounded-xl',
          ],
          position === 'bottom' && [
            'bottom-0 left-0 right-0',
            'h-[400px] max-h-[60vh]',
            'rounded-t-xl',
          ]
        )}
      >
        {/* Header */}
        <ChatHeader
          isProcessing={isProcessing}
          messageCount={messages.length}
          onNewChat={handleNewChat}
          onShowHistory={() => setShowHistory(true)}
          onMinimize={minimizeChat}
          onClose={closeChat}
          showTimestamps={showTimestamps}
          showToolDetails={showToolDetails}
          compactMode={compactMode}
          onToggleTimestamps={toggleTimestamps}
          onToggleToolDetails={toggleToolDetails}
          onToggleCompactMode={toggleCompactMode}
        />

        {/* Error Banner */}
        {error && (
          <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/20 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
            <span className="text-sm text-destructive flex-1 line-clamp-2">{error}</span>
            <Button variant="ghost" size="sm" onClick={clearError} className="shrink-0">
              Dismiss
            </Button>
          </div>
        )}

        {/* Session History Sidebar */}
        <Sheet open={showHistory} onOpenChange={setShowHistory}>
          <SheetContent side="left" className="w-[300px] p-0">
            <SheetHeader className="p-4 border-b">
              <SheetTitle className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Chat History
              </SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-[calc(100vh-80px)]">
              <div className="p-2 space-y-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2"
                  onClick={handleNewChat}
                >
                  <Plus className="h-4 w-4" />
                  New Chat
                </Button>
                {sessionList.map((session) => (
                  <SessionItem
                    key={session.id}
                    session={session}
                    isActive={session.id === activeSession?.id}
                    onClick={() => handleSwitchSession(session.id)}
                    onEnd={() => endSession()}
                  />
                ))}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>

        {/* Messages Area */}
        <ScrollArea
          ref={scrollAreaRef}
          className="flex-1 px-4"
          onScrollCapture={handleScroll}
        >
          <div className="py-4 space-y-4">
            {/* Welcome message if no messages */}
            {messages.length === 0 && !isLoadingMessages && (
              <WelcomeMessage
                entityType={entityType}
                entityName={entityName}
                onAction={handleSendMessage}
              />
            )}

            {/* Loading state */}
            {isLoadingMessages && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Messages */}
            {messages.map((message) => (
              <AgentMessage
                key={message.id}
                message={message}
                showTimestamp={showTimestamps}
                showToolDetails={showToolDetails}
                compact={compactMode}
              />
            ))}

            {/* Streaming content */}
            {streamingContent && (
              <AgentMessage
                message={{
                  id: 'streaming',
                  session_id: activeSession?.id || '',
                  role: 'assistant',
                  content: '',
                  tool_calls: null,
                  tool_call_id: null,
                  tool_name: null,
                  tool_input: null,
                  tool_output: null,
                  tool_error: null,
                  tokens_used: null,
                  latency_ms: null,
                  model_used: null,
                  is_streaming: true,
                  created_at: new Date().toISOString(),
                }}
                isStreaming
                streamingContent={streamingContent}
                showTimestamp={false}
              />
            )}

            {/* Streaming tool calls */}
            {streamingToolCalls.length > 0 && (
              <div className="space-y-2">
                {streamingToolCalls.map((toolCall) => (
                  <StreamingToolResult
                    key={toolCall.id}
                    toolName={toolCall.name}
                    status={toolCall.status}
                    arguments={toolCall.arguments}
                  />
                ))}
              </div>
            )}

            {/* Processing indicator (when not streaming) */}
            {isProcessing && !streamingContent && streamingToolCalls.length === 0 && (
              <TypingIndicator />
            )}
          </div>
        </ScrollArea>

        {/* Scroll to bottom button */}
        <AnimatePresence>
          {showScrollButton && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute bottom-24 right-4"
            >
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 rounded-full shadow-md"
                onClick={scrollToBottom}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Context Actions (when viewing specific entity) */}
        {entityType && messages.length > 0 && (
          <div className="px-4 py-2 border-t bg-muted/20">
            <ContextQuickActions
              entityType={entityType}
              entityId={entityId}
              entityName={entityName}
              onAction={handleSendMessage}
            />
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t bg-muted/20">
          <AgentChatInput
            onSend={handleSendMessage}
            isDisabled={isProcessing}
            placeholder={isProcessing ? 'Please wait...' : 'Ask me anything...'}
            projectId={projectId}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// ============================================================================
// Sub-components
// ============================================================================

function ChatHeader({
  isProcessing,
  messageCount,
  onNewChat,
  onShowHistory,
  onMinimize,
  onClose,
  showTimestamps,
  showToolDetails,
  compactMode,
  onToggleTimestamps,
  onToggleToolDetails,
  onToggleCompactMode,
}: {
  isProcessing: boolean
  messageCount: number
  onNewChat: () => void
  onShowHistory: () => void
  onMinimize: () => void
  onClose: () => void
  showTimestamps: boolean
  showToolDetails: boolean
  compactMode: boolean
  onToggleTimestamps: () => void
  onToggleToolDetails: () => void
  onToggleCompactMode: () => void
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-2">
            JobSight AI
            {messageCount > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {messageCount}
              </Badge>
            )}
          </h3>
          <p className="text-xs text-muted-foreground">
            {isProcessing ? (
              <span className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Thinking...
              </span>
            ) : (
              'Ready to help'
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {/* History Button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onShowHistory}>
                <History className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Chat history</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* New Chat Button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNewChat}>
                <MessageSquare className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>New chat</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Settings Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Settings className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onToggleTimestamps}>
              {showTimestamps ? 'Hide timestamps' : 'Show timestamps'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleToolDetails}>
              {showToolDetails ? 'Hide tool details' : 'Show tool details'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleCompactMode}>
              {compactMode ? 'Disable compact mode' : 'Enable compact mode'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Minimize Button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onMinimize}>
                <Minus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Minimize</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Close Button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Close</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}

function WelcomeMessage({
  entityType,
  entityName,
  onAction,
}: {
  entityType?: string
  entityName?: string
  onAction: (message: string) => void
}) {
  return (
    <div className="text-center py-8">
      <div className="h-16 w-16 mx-auto rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mb-4">
        <Sparkles className="h-8 w-8 text-primary-foreground" />
      </div>
      <h4 className="font-semibold mb-2 text-lg">Welcome to JobSight AI</h4>
      <p className="text-sm text-muted-foreground mb-6 max-w-[300px] mx-auto">
        {entityType && entityName
          ? `I can help you with ${entityName}. What would you like to know?`
          : "I can help you with documents, daily reports, RFIs, and more. Try asking me something!"}
      </p>

      {entityType ? (
        <ContextQuickActions
          entityType={entityType}
          entityName={entityName}
          onAction={onAction}
          variant="buttons"
        />
      ) : (
        <AgentQuickActions onAction={onAction} variant="grid" maxItems={4} />
      )}
    </div>
  )
}

function SessionItem({
  session,
  isActive,
  onClick,
  onEnd,
}: {
  session: AgentSession
  isActive: boolean
  onClick: () => void
  onEnd: () => void
}) {
  const title = session.title || 'New conversation'
  const date = new Date(session.last_message_at)
  const isToday = new Date().toDateString() === date.toDateString()
  const timeString = isToday
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' })

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full px-3 py-2 rounded-lg text-left',
        'hover:bg-muted transition-colors',
        'flex items-center justify-between gap-2',
        isActive && 'bg-muted'
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{title}</p>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <span>{session.message_count} messages</span>
          <span className="mx-1">-</span>
          <span>{timeString}</span>
        </p>
      </div>
      {isActive && (
        <Badge variant="default" className="shrink-0 text-[10px]">
          Active
        </Badge>
      )}
    </button>
  )
}
