/**
 * ConversationHeader Component
 *
 * Header for active conversation showing:
 * - Conversation name/participants
 * - Online status
 * - Actions (info, search, settings)
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  MoreVertical,
  Users,
  UserPlus,
  LogOut,
  Search,
  Settings,
  Bell,
  BellOff,
  Trash2,
} from 'lucide-react'
import { Button, Badge } from '@/components/ui'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useConversation, useLeaveConversation, usePresence } from '../hooks'
import { useAuth } from '@/lib/auth/AuthContext'
import type { Conversation } from '@/types/messaging'
import { cn } from '@/lib/utils'

interface ConversationHeaderProps {
  conversationId: string
  onBack?: () => void
  onShowParticipants?: () => void
  onAddParticipants?: () => void
  className?: string
}

export function ConversationHeader({
  conversationId,
  onBack,
  onShowParticipants,
  onAddParticipants,
  className,
}: ConversationHeaderProps) {
  const navigate = useNavigate()
  const { userProfile } = useAuth()
  const [isMuted, setIsMuted] = useState(false)

  // Get conversation details
  const { data: conversation } = useConversation(conversationId)

  // Get presence for direct messages
  const { isUserOnline } = usePresence(conversationId)

  // Leave conversation mutation
  const leaveConversation = useLeaveConversation()

  // Handle back navigation
  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      navigate('/messages')
    }
  }

  // Handle leave conversation
  const handleLeave = () => {
    if (confirm('Are you sure you want to leave this conversation?')) {
      leaveConversation.mutate(conversationId)
      navigate('/messages')
    }
  }

  // Get display name
  const getDisplayName = () => {
    if (!conversation) {return 'Loading...'}

    if (conversation.name) {return conversation.name}

    // For direct messages, show the other person's name
    if (conversation.type === 'direct') {
      const otherParticipant = conversation.participants?.find(
        (p) => p.user_id !== userProfile?.id
      )
      return otherParticipant?.user?.full_name || otherParticipant?.user?.email || 'Unknown User'
    }

    // For groups without a name
    return `Group (${conversation.participants?.length || 0} members)`
  }

  // Get subtitle (online status or participant count)
  const getSubtitle = () => {
    if (!conversation) {return ''}

    if (conversation.type === 'direct') {
      const otherParticipant = conversation.participants?.find(
        (p) => p.user_id !== userProfile?.id
      )
      if (otherParticipant && isUserOnline(otherParticipant.user_id)) {
        return 'Online'
      }
      return 'Offline'
    }

    const activeCount = conversation.participants?.filter((p) => !p.left_at).length || 0
    return `${activeCount} participants`
  }

  // Get avatar
  const getAvatar = () => {
    if (!conversation) {return null}

    if (conversation.type === 'direct') {
      const otherParticipant = conversation.participants?.find(
        (p) => p.user_id !== userProfile?.id
      )
      return otherParticipant?.user?.avatar_url
    }

    return null
  }

  // Check if user is admin
  const isAdmin = () => {
    if (!conversation) {return false}
    const myParticipant = conversation.participants?.find(
      (p) => p.user_id === userProfile?.id
    )
    // Role isn't exposed in participant type, so assume creator is admin
    return conversation.created_by === userProfile?.id
  }

  const avatar = getAvatar()
  const subtitle = getSubtitle()
  const isOnline = conversation?.type === 'direct' && subtitle === 'Online'

  return (
    <div className={cn('flex items-center gap-3 px-4 py-3 border-b bg-background', className)}>
      {/* Back button (mobile) */}
      <Button
        variant="ghost"
        size="sm"
        className="md:hidden h-9 w-9 p-0"
        onClick={handleBack}
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>

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
            conversation?.type === 'direct' && 'bg-blue-100 text-blue-600',
            conversation?.type === 'group' && 'bg-green-100 text-green-600',
            conversation?.type === 'project' && 'bg-purple-100 text-purple-600'
          )}>
            <Users className="h-5 w-5" />
          </div>
        )}
        {isOnline && (
          <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
        )}
      </div>

      {/* Conversation info */}
      <div className="flex-1 min-w-0">
        <h2 className="font-semibold truncate">{getDisplayName()}</h2>
        <p className={cn(
          'text-sm truncate',
          isOnline ? 'text-green-600' : 'text-muted-foreground'
        )}>
          {subtitle}
        </p>
      </div>

      {/* Project badge */}
      {conversation?.project && (
        <Badge variant="outline" className="hidden sm:flex">
          {conversation.project.name}
        </Badge>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-1">
        {/* Participants button (groups only) */}
        {conversation?.type !== 'direct' && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0"
            onClick={onShowParticipants}
            title="View participants"
          >
            <Users className="h-5 w-5" />
          </Button>
        )}

        {/* More actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {conversation?.type !== 'direct' && (
              <>
                <DropdownMenuItem onClick={onShowParticipants}>
                  <Users className="h-4 w-4 mr-2" />
                  View participants
                </DropdownMenuItem>

                {isAdmin() && (
                  <DropdownMenuItem onClick={onAddParticipants}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add participants
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />
              </>
            )}

            <DropdownMenuItem onClick={() => setIsMuted(!isMuted)}>
              {isMuted ? (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Unmute notifications
                </>
              ) : (
                <>
                  <BellOff className="h-4 w-4 mr-2" />
                  Mute notifications
                </>
              )}
            </DropdownMenuItem>

            <DropdownMenuItem disabled>
              <Search className="h-4 w-4 mr-2" />
              Search in conversation
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {conversation?.type !== 'direct' && (
              <DropdownMenuItem
                onClick={handleLeave}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Leave conversation
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
