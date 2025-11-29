/**
 * NewConversationDialog Component
 *
 * Dialog for creating new conversations:
 * - Direct message to a user
 * - Group chat with multiple users
 * - Project-linked conversation
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageSquare, Users, Building, Search, X, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
} from '@/components/ui'
import { useCreateConversation, useGetOrCreateDirectConversation } from '../hooks'
import { useAuth } from '@/lib/auth/AuthContext'
import { supabase } from '@/lib/supabase'
import type { ConversationType, CreateConversationDTO } from '@/types/messaging'
import { cn } from '@/lib/utils'

interface NewConversationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultType?: ConversationType
  projectId?: string
}

interface User {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  avatar_url: string | null
}

// Compute full name from first and last name
function getFullName(user: User): string {
  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`
  }
  return user.first_name || user.last_name || ''
}

export function NewConversationDialog({
  open,
  onOpenChange,
  defaultType,
  projectId: defaultProjectId,
}: NewConversationDialogProps) {
  const navigate = useNavigate()
  const { userProfile } = useAuth()
  const [step, setStep] = useState<'type' | 'users' | 'details'>('type')
  const [conversationType, setConversationType] = useState<ConversationType>(
    defaultType || 'direct'
  )
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])
  const [groupName, setGroupName] = useState('')
  const [projectId, setProjectId] = useState(defaultProjectId || '')
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)

  // Mutations
  const createConversation = useCreateConversation()
  const getOrCreateDirect = useGetOrCreateDirectConversation()

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep(defaultType ? 'users' : 'type')
      setConversationType(defaultType || 'direct')
      setSelectedUsers([])
      setGroupName('')
      setProjectId(defaultProjectId || '')
      setSearch('')
    }
  }, [open, defaultType, defaultProjectId])

  // Fetch users for selection
  useEffect(() => {
    const fetchUsers = async () => {
      if (!search || search.length < 2) {
        setUsers([])
        return
      }

      setIsLoadingUsers(true)
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, first_name, last_name, email, avatar_url')
          .or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`)
          .neq('id', userProfile?.id || '')
          .limit(10)

        if (error) throw error
        setUsers(data || [])
      } catch (error) {
        console.error('Failed to fetch users:', error)
      } finally {
        setIsLoadingUsers(false)
      }
    }

    const debounce = setTimeout(fetchUsers, 300)
    return () => clearTimeout(debounce)
  }, [search, userProfile?.id])

  // Toggle user selection
  const toggleUser = (user: User) => {
    setSelectedUsers((prev) => {
      const isSelected = prev.some((u) => u.id === user.id)
      if (isSelected) {
        return prev.filter((u) => u.id !== user.id)
      }

      // For direct messages, only allow one user
      if (conversationType === 'direct') {
        return [user]
      }

      return [...prev, user]
    })
  }

  // Handle next step
  const handleNext = () => {
    if (step === 'type') {
      setStep('users')
    } else if (step === 'users') {
      if (conversationType === 'direct') {
        handleCreate()
      } else {
        setStep('details')
      }
    }
  }

  // Handle back
  const handleBack = () => {
    if (step === 'details') {
      setStep('users')
    } else if (step === 'users' && !defaultType) {
      setStep('type')
    }
  }

  // Create conversation
  const handleCreate = async () => {
    if (selectedUsers.length === 0) return

    try {
      let conversationId: string | undefined

      if (conversationType === 'direct') {
        // Use getOrCreate for direct messages
        const result = await getOrCreateDirect.mutateAsync(selectedUsers[0].id)
        conversationId = result?.id
      } else {
        // Create group or project conversation
        const data: CreateConversationDTO = {
          type: conversationType,
          participant_ids: selectedUsers.map((u) => u.id),
          name: groupName || undefined,
          project_id: conversationType === 'project' ? projectId : undefined,
        }

        const result = await createConversation.mutateAsync(data)
        conversationId = result?.id
      }

      if (conversationId) {
        onOpenChange(false)
        navigate(`/messages/${conversationId}`)
      }
    } catch (error) {
      console.error('Failed to create conversation:', error)
    }
  }

  // Check if can proceed
  const canProceed = () => {
    if (step === 'type') return true
    if (step === 'users') return selectedUsers.length > 0
    if (step === 'details') {
      if (conversationType === 'project') return !!projectId
      return true
    }
    return false
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'type' && 'New Conversation'}
            {step === 'users' && 'Select Recipients'}
            {step === 'details' && 'Conversation Details'}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Select type */}
        {step === 'type' && (
          <div className="grid gap-3 py-4">
            <button
              onClick={() => {
                setConversationType('direct')
                setStep('users')
              }}
              className={cn(
                'flex items-center gap-3 p-4 rounded-lg border text-left hover:bg-muted transition-colors',
                conversationType === 'direct' && 'border-primary bg-primary/5'
              )}
            >
              <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Direct Message</p>
                <p className="text-sm text-muted-foreground">
                  Private conversation with one person
                </p>
              </div>
            </button>

            <button
              onClick={() => {
                setConversationType('group')
                setStep('users')
              }}
              className={cn(
                'flex items-center gap-3 p-4 rounded-lg border text-left hover:bg-muted transition-colors',
                conversationType === 'group' && 'border-primary bg-primary/5'
              )}
            >
              <div className="h-10 w-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Group Chat</p>
                <p className="text-sm text-muted-foreground">
                  Conversation with multiple people
                </p>
              </div>
            </button>

            <button
              onClick={() => {
                setConversationType('project')
                setStep('users')
              }}
              className={cn(
                'flex items-center gap-3 p-4 rounded-lg border text-left hover:bg-muted transition-colors',
                conversationType === 'project' && 'border-primary bg-primary/5'
              )}
            >
              <div className="h-10 w-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                <Building className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Project Chat</p>
                <p className="text-sm text-muted-foreground">
                  Conversation linked to a project
                </p>
              </div>
            </button>
          </div>
        )}

        {/* Step 2: Select users */}
        {step === 'users' && (
          <div className="py-4">
            {/* Selected users */}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-1 bg-muted rounded-full pl-1 pr-2 py-1"
                  >
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt=""
                        className="h-5 w-5 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px]">
                        {getFullName(user).charAt(0) || '?'}
                      </div>
                    )}
                    <span className="text-sm">{getFullName(user) || user.email}</span>
                    <button
                      onClick={() => toggleUser(user)}
                      className="text-muted-foreground hover:text-foreground ml-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* User list */}
            <div className="mt-3 max-h-[250px] overflow-auto">
              {isLoadingUsers ? (
                <div className="py-8 text-center text-muted-foreground">
                  Searching...
                </div>
              ) : search.length < 2 ? (
                <div className="py-8 text-center text-muted-foreground">
                  Type at least 2 characters to search
                </div>
              ) : users.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No users found
                </div>
              ) : (
                <div className="space-y-1">
                  {users.map((user) => {
                    const isSelected = selectedUsers.some((u) => u.id === user.id)
                    return (
                      <button
                        key={user.id}
                        onClick={() => toggleUser(user)}
                        className={cn(
                          'w-full flex items-center gap-3 p-2 rounded-lg text-left hover:bg-muted',
                          isSelected && 'bg-muted'
                        )}
                      >
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm">
                            {getFullName(user).charAt(0) || '?'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {getFullName(user) || 'Unknown User'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </p>
                        </div>
                        {isSelected && (
                          <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Details (for groups/projects) */}
        {step === 'details' && (
          <div className="py-4 space-y-4">
            {conversationType === 'group' && (
              <div>
                <Label htmlFor="groupName">Group Name (optional)</Label>
                <Input
                  id="groupName"
                  placeholder="e.g., Project Team, Design Review..."
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="mt-1.5"
                />
              </div>
            )}

            {conversationType === 'project' && (
              <>
                <div>
                  <Label htmlFor="projectId">Project ID</Label>
                  <Input
                    id="projectId"
                    placeholder="Enter project ID..."
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="mt-1.5"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This conversation will be linked to the specified project
                  </p>
                </div>

                <div>
                  <Label htmlFor="projectGroupName">Group Name (optional)</Label>
                  <Input
                    id="projectGroupName"
                    placeholder="e.g., Site Updates, RFI Discussion..."
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
              </>
            )}

            {/* Preview of selected users */}
            <div>
              <Label>Participants ({selectedUsers.length})</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {selectedUsers.map((user) => (
                  <span
                    key={user.id}
                    className="text-sm bg-muted px-2 py-1 rounded"
                  >
                    {getFullName(user) || user.email}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {step !== 'type' && !defaultType && (
            <Button variant="ghost" onClick={handleBack}>
              Back
            </Button>
          )}
          <Button
            onClick={step === 'details' || (step === 'users' && conversationType === 'direct')
              ? handleCreate
              : handleNext}
            disabled={
              !canProceed() ||
              createConversation.isPending ||
              getOrCreateDirect.isPending
            }
          >
            {(step === 'details' || (step === 'users' && conversationType === 'direct'))
              ? createConversation.isPending || getOrCreateDirect.isPending
                ? 'Creating...'
                : 'Create'
              : 'Next'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
