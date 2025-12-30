/**
 * EmailInbox Component
 *
 * Main inbox view for email integration:
 * - Thread list with unread indicators
 * - Folder navigation (inbox, sent, drafts, etc.)
 * - Account selector
 * - Search and filters
 */

import { useState, useEffect } from 'react'
import {
  Inbox,
  Send,
  FileText,
  Trash2,
  Archive,
  Star,
  Search,
  RefreshCw,
  Mail,
  Paperclip,
  Loader2,
  Filter,
  Plus,
} from 'lucide-react'
import {
  Button,
  Input,
  Badge,
} from '@/components/ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useEmailAccounts, useTriggerEmailSync } from '../hooks/useEmailAccounts'
import {
  useEmailThreads,
  useUpdateEmailThread,
  useMarkThreadAsRead,
  useUnreadCountsByFolder,
} from '../hooks/useEmails'
import { cn } from '@/lib/utils'
import {
  EMAIL_FOLDER_CONFIG,
  formatEmailDate,
  formatParticipants,
  getParticipantInitials,
  type EmailThread,
  type EmailFolder,
} from '@/types/email'

interface EmailInboxProps {
  onThreadSelect?: (thread: EmailThread) => void
  onCompose?: () => void
  selectedThreadId?: string
  className?: string
}

const FOLDERS: { key: EmailFolder; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'inbox', icon: Inbox },
  { key: 'sent', icon: Send },
  { key: 'drafts', icon: FileText },
  { key: 'archive', icon: Archive },
  { key: 'trash', icon: Trash2 },
]

export function EmailInbox({
  onThreadSelect,
  onCompose,
  selectedThreadId,
  className,
}: EmailInboxProps) {
  const [selectedFolder, setSelectedFolder] = useState<EmailFolder>('inbox')
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>()
  const [searchQuery, setSearchQuery] = useState('')
  const [showStarredOnly, setShowStarredOnly] = useState(false)

  // Fetch accounts
  const { data: accounts, isLoading: accountsLoading } = useEmailAccounts()

  // Fetch threads
  const { data: threads, isLoading: threadsLoading, refetch } = useEmailThreads({
    account_id: selectedAccountId,
    folder: selectedFolder,
    is_starred: showStarredOnly ? true : undefined,
    search: searchQuery || undefined,
  })

  // Fetch unread counts
  const { data: unreadCounts } = useUnreadCountsByFolder()

  // Mutations
  const triggerSync = useTriggerEmailSync()
  const updateThread = useUpdateEmailThread()
  const markAsRead = useMarkThreadAsRead()

  // Auto-select first account
  useEffect(() => {
    if (!selectedAccountId && accounts && accounts.length > 0) {
      setTimeout(() => setSelectedAccountId(accounts[0].id), 0)
    }
  }, [accounts, selectedAccountId])

  const handleThreadClick = (thread: EmailThread) => {
    // Mark as read if unread
    if (thread.unread_count > 0) {
      markAsRead.mutate({ threadId: thread.id, isRead: true })
    }
    onThreadSelect?.(thread)
  }

  const handleStarThread = (e: React.MouseEvent, thread: EmailThread) => {
    e.stopPropagation()
    updateThread.mutate({
      threadId: thread.id,
      updates: { is_starred: !thread.is_starred },
    })
  }

  const handleArchiveThread = (e: React.MouseEvent, thread: EmailThread) => {
    e.stopPropagation()
    updateThread.mutate({
      threadId: thread.id,
      updates: { is_archived: !thread.is_archived },
    })
  }

  const handleSync = () => {
    if (selectedAccountId) {
      triggerSync.mutate(selectedAccountId)
    }
  }

  const isLoading = accountsLoading || threadsLoading

  return (
    <div className={cn('flex h-full', className)}>
      {/* Sidebar */}
      <div className="w-64 border-r bg-muted/10 flex flex-col">
        {/* Compose Button */}
        <div className="p-4">
          <Button onClick={onCompose} className="w-full" size="lg">
            <Plus className="h-4 w-4 mr-2" />
            Compose
          </Button>
        </div>

        {/* Account Selector */}
        {accounts && accounts.length > 1 && (
          <div className="px-4 pb-4">
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span className="truncate">{account.email_address}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Folders */}
        <nav className="flex-1 px-2">
          {FOLDERS.map(({ key, icon: Icon }) => {
            const config = EMAIL_FOLDER_CONFIG[key]
            const unread = unreadCounts?.[key] || 0

            return (
              <button
                key={key}
                onClick={() => setSelectedFolder(key)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm',
                  'hover:bg-muted/50 transition-colors',
                  selectedFolder === key && 'bg-muted font-medium'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-left">{config.label}</span>
                {unread > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {unread > 99 ? '99+' : unread}
                  </Badge>
                )}
              </button>
            )
          })}

          <hr className="my-2" />

          <button
            onClick={() => setShowStarredOnly(!showStarredOnly)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm',
              'hover:bg-muted/50 transition-colors',
              showStarredOnly && 'bg-muted font-medium'
            )}
          >
            <Star className={cn('h-4 w-4', showStarredOnly && 'fill-yellow-400 text-yellow-400')} />
            <span>Starred</span>
          </button>
        </nav>

        {/* Sync Status */}
        {selectedAccountId && (
          <div className="p-4 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSync}
              disabled={triggerSync.isPending}
              className="w-full"
            >
              {triggerSync.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sync now
            </Button>
          </div>
        )}
      </div>

      {/* Thread List */}
      <div className="flex-1 flex flex-col">
        {/* Search & Filters */}
        <div className="p-4 border-b flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowStarredOnly(!showStarredOnly)}>
                {showStarredOnly ? 'Show all' : 'Show starred only'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => refetch()}>
                Refresh
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Thread Items */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !threads || threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Mail className="h-8 w-8 mb-2" />
              <p>No emails in {EMAIL_FOLDER_CONFIG[selectedFolder].label.toLowerCase()}</p>
            </div>
          ) : (
            <div className="divide-y">
              {threads.map((thread) => (
                <ThreadItem
                  key={thread.id}
                  thread={thread}
                  isSelected={thread.id === selectedThreadId}
                  onClick={() => handleThreadClick(thread)}
                  onStar={(e) => handleStarThread(e, thread)}
                  onArchive={(e) => handleArchiveThread(e, thread)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Thread list item component
interface ThreadItemProps {
  thread: EmailThread
  isSelected: boolean
  onClick: () => void
  onStar: (e: React.MouseEvent) => void
  onArchive: (e: React.MouseEvent) => void
}

function ThreadItem({ thread, isSelected, onClick, onStar, onArchive: _onArchive }: ThreadItemProps) {
  const isUnread = thread.unread_count > 0
  const firstParticipant = thread.participants[0]

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors',
        isSelected && 'bg-muted',
        isUnread && 'bg-blue-50/50 dark:bg-blue-950/20'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium',
          'bg-primary/10 text-primary'
        )}
      >
        {firstParticipant ? getParticipantInitials(firstParticipant) : '?'}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn('truncate', isUnread && 'font-semibold')}>
            {formatParticipants(thread.participants, 2)}
          </span>
          {thread.message_count > 1 && (
            <Badge variant="secondary" className="text-xs">
              {thread.message_count}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
            {thread.last_message_at ? formatEmailDate(thread.last_message_at) : ''}
          </span>
        </div>

        <div className={cn('text-sm truncate mb-1', isUnread ? 'font-medium' : 'text-muted-foreground')}>
          {thread.subject}
        </div>

        <div className="text-xs text-muted-foreground truncate">
          {thread.snippet}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col items-center gap-1">
        <button
          onClick={onStar}
          className="p-1 hover:bg-muted rounded"
        >
          <Star
            className={cn(
              'h-4 w-4',
              thread.is_starred ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
            )}
          />
        </button>

        {thread.has_attachments && (
          <Paperclip className="h-4 w-4 text-muted-foreground" />
        )}

        {isUnread && (
          <div className="w-2 h-2 rounded-full bg-blue-500" />
        )}
      </div>
    </div>
  )
}

export default EmailInbox
