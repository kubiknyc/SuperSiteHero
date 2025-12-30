/**
 * ConversationList Component
 *
 * Displays a list of user's conversations with:
 * - Search/filter capabilities
 * - Conversation type tabs (All, Direct, Groups)
 * - Unread indicators
 * - Last message preview
 */

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MessageSquare,
  Users,
  Building,
  Search,
  Plus,
  Circle,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Button,
  Badge,
} from '@/components/ui'
import { useConversations, useTotalUnreadCount, useRealtimeConversations } from '../hooks'
import { useAuth } from '@/lib/auth/AuthContext'
import { formatMessageTime, type Conversation, type ConversationType } from '@/types/messaging'
import { cn } from '@/lib/utils'

interface ConversationListProps {
  selectedId?: string
  onSelect?: (conversationId: string) => void
  onNewConversation?: () => void
  className?: string
}

export function ConversationList({
  selectedId,
  onSelect,
  onNewConversation,
  className,
}: ConversationListProps) {
  const navigate = useNavigate()
  const { userProfile } = useAuth()
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | ConversationType>('all')

  // Subscribe to realtime updates
  useRealtimeConversations()

  // Fetch conversations
  const { data: conversations = [], isLoading } = useConversations({
    type: activeTab === 'all' ? undefined : activeTab,
  })

  // Get total unread count for badge
  const { data: totalUnread = 0 } = useTotalUnreadCount()

  // Filter conversations by search
  const filteredConversations = useMemo(() => {
    if (!search) {return conversations}

    const searchLower = search.toLowerCase()
    return conversations.filter((conv) => {
      // Search by name
      if (conv.name?.toLowerCase().includes(searchLower)) {return true}

      // Search by participant names
      const participantNames = conv.participants
        ?.map((p) => p.user?.full_name || p.user?.email || '')
        .join(' ')
        .toLowerCase()

      return participantNames?.includes(searchLower)
    })
  }, [conversations, search])

  // Handle conversation click
  const handleSelect = (conversationId: string) => {
    if (onSelect) {
      onSelect(conversationId)
    } else {
      navigate(`/messages/${conversationId}`)
    }
  }

  // Get display name for conversation
  const getDisplayName = (conv: Conversation) => {
    if (conv.name) {return conv.name}

    // For direct messages, show the other person's name
    if (conv.type === 'direct') {
      const otherParticipant = conv.participants?.find(
        (p) => p.user_id !== userProfile?.id
      )
      return otherParticipant?.user?.full_name || otherParticipant?.user?.email || 'Unknown User'
    }

    // For groups without a name, show participant count
    return `Group (${conv.participants?.length || 0} members)`
  }

  // Get avatar for conversation
  const getAvatar = (conv: Conversation) => {
    if (conv.type === 'direct') {
      const otherParticipant = conv.participants?.find(
        (p) => p.user_id !== userProfile?.id
      )
      return otherParticipant?.user?.avatar_url
    }
    return null
  }

  // Get icon for conversation type
  const getIcon = (type: ConversationType) => {
    switch (type) {
      case 'direct':
        return MessageSquare
      case 'group':
        return Users
      case 'project':
        return Building
    }
  }

  const tabs = [
    { id: 'all' as const, label: 'All', count: conversations.length },
    { id: 'direct' as const, label: 'Direct', count: conversations.filter((c) => c.type === 'direct').length },
    { id: 'group' as const, label: 'Groups', count: conversations.filter((c) => c.type === 'group').length },
    { id: 'project' as const, label: 'Projects', count: conversations.filter((c) => c.type === 'project').length },
  ]

  return (
    <Card className={cn('flex flex-col h-full', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Messages
            {totalUnread > 0 && (
              <Badge variant="destructive" className="ml-2">
                {totalUnread}
              </Badge>
            )}
          </CardTitle>
          <Button size="sm" onClick={onNewConversation}>
            <Plus className="h-4 w-4 mr-1" />
            New
          </Button>
        </div>

        {/* Search */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-3">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'ghost'}
              size="sm"
              className="flex-1"
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1 text-xs opacity-70">({tab.count})</span>
              )}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            Loading conversations...
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No conversations found</p>
            {search && (
              <Button variant="link" size="sm" onClick={() => setSearch('')}>
                Clear search
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y">
            {filteredConversations.map((conv) => {
              const Icon = getIcon(conv.type)
              const avatar = getAvatar(conv)
              const hasUnread = (conv.unread_count || 0) > 0
              const isSelected = selectedId === conv.id

              return (
                <button
                  key={conv.id}
                  onClick={() => handleSelect(conv.id)}
                  className={cn(
                    'w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors',
                    isSelected && 'bg-muted',
                    hasUnread && 'bg-blue-50 dark:bg-blue-950/20'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      {avatar ? (
                        <img
                          src={avatar}
                          alt=""
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className={cn(
                          'h-10 w-10 rounded-full flex items-center justify-center',
                          conv.type === 'direct' && 'bg-info-light text-primary',
                          conv.type === 'group' && 'bg-success-light text-success',
                          conv.type === 'project' && 'bg-purple-100 text-purple-600'
                        )}>
                          <Icon className="h-5 w-5" />
                        </div>
                      )}
                      {hasUnread && (
                        <Circle className="absolute -top-1 -right-1 h-3 w-3 fill-blue-500 text-primary" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn(
                          'font-medium truncate',
                          hasUnread && 'font-semibold'
                        )}>
                          {getDisplayName(conv)}
                        </span>
                        {conv.last_message_at && (
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {formatMessageTime(conv.last_message_at)}
                          </span>
                        )}
                      </div>

                      {/* Last message preview */}
                      {conv.last_message && (
                        <p className={cn(
                          'text-sm truncate mt-0.5',
                          hasUnread ? 'text-foreground' : 'text-muted-foreground'
                        )}>
                          {conv.last_message.sender_id === userProfile?.id && (
                            <span className="text-muted-foreground">You: </span>
                          )}
                          {conv.last_message.content}
                        </p>
                      )}

                      {/* Project badge */}
                      {conv.project && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          {conv.project.name}
                        </Badge>
                      )}
                    </div>

                    {/* Unread count */}
                    {hasUnread && (
                      <Badge variant="default" className="ml-2">
                        {conv.unread_count}
                      </Badge>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
