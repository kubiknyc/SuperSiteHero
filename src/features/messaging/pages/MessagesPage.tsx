/**
 * MessagesPage
 *
 * Main messaging page with:
 * - Conversation list sidebar
 * - Active conversation view
 * - Responsive layout (mobile: single view, desktop: split view)
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  ConversationList,
  ConversationHeader,
  MessageThread,
  MessageInput,
  NewConversationDialog,
} from '../components'
import { useTotalUnreadCount } from '../hooks'
import { useMyProjects } from '@/features/projects/hooks/useProjects'
import {
  RadixSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { cn } from '@/lib/utils'

export function MessagesPage() {
  const { conversationId } = useParams<{ conversationId?: string }>()
  const navigate = useNavigate()
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')

  // Get total unread for badge
  const { data: totalUnread = 0 } = useTotalUnreadCount()

  // Get user's projects for the selector
  const { data: projects = [], isLoading: isLoadingProjects } = useMyProjects()

  // Auto-select first project if none selected
  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setTimeout(() => {
        setSelectedProjectId(projects[0].id)
      }, 0)
    }
  }, [projects, selectedProjectId])

  // Handle conversation selection
  const handleSelectConversation = (id: string) => {
    navigate(`/messages/${id}`)
  }

  // Handle back navigation (mobile)
  const handleBack = () => {
    navigate('/messages')
  }

  return (
    <AppLayout>
      <div className="h-[calc(100vh-4rem)] flex">
        {/* Conversation list sidebar */}
        <div
          className={cn(
            'w-full md:w-80 lg:w-96 flex-shrink-0 border-r flex flex-col',
            // Hide on mobile when conversation is selected
            conversationId && 'hidden md:flex md:flex-col'
          )}
        >
          {/* Project selector */}
          <div className="p-3 border-b">
            <RadixSelect
              value={selectedProjectId}
              onValueChange={setSelectedProjectId}
              disabled={isLoadingProjects}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={isLoadingProjects ? 'Loading...' : 'Select project...'} />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </RadixSelect>
          </div>
          <ConversationList
            selectedId={conversationId}
            onSelect={handleSelectConversation}
            onNewConversation={() => setShowNewDialog(true)}
            className="flex-1 border-0 rounded-none"
          />
        </div>

        {/* Conversation view */}
        <div
          className={cn(
            'flex-1 flex flex-col',
            // Hide on mobile when no conversation selected
            !conversationId && 'hidden md:flex'
          )}
        >
          {conversationId ? (
            <>
              {/* Header */}
              <ConversationHeader
                conversationId={conversationId}
                onBack={handleBack}
              />

              {/* Messages */}
              <MessageThread
                conversationId={conversationId}
                className="flex-1"
              />

              {/* Input */}
              <MessageInput
                conversationId={conversationId}
              />
            </>
          ) : (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <MessageSquare className="h-16 w-16 mb-4 opacity-50" />
              <h2 className="text-xl font-semibold mb-2 heading-section">Your Messages</h2>
              <p className="text-center max-w-md mb-4">
                Select a conversation from the list or start a new one to begin messaging.
              </p>
              <button
                onClick={() => setShowNewDialog(true)}
                className="text-primary hover:underline"
              >
                Start a new conversation
              </button>
            </div>
          )}
        </div>
      </div>

      {/* New conversation dialog */}
      <NewConversationDialog
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
        projectId={selectedProjectId}
      />
    </AppLayout>
  )
}
