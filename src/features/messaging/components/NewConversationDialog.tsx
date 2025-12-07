/**
 * NewConversationDialog Component
 *
 * Dialog for creating new conversations:
 * - Direct message to a user
 * - Group chat with multiple users
 * - Project-linked conversation
 */

import { useState, useEffect, useMemo } from 'react'
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
import { useCreateConversation, useGetOrCreateDirectConversation, useProjectUsers } from '../hooks'
import { useAuth } from '@/lib/auth/AuthContext'
import type { ConversationType, CreateConversationDTO } from '@/types/messaging'
import { cn } from '@/lib/utils'

interface NewConversationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string  // REQUIRED - messaging is always project-scoped
  defaultType?: ConversationType
}

interface User {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  avatar_url: string | null
  company?: {
    id: string
    name: string
  } | null
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
  projectId,
  defaultType,
}: NewConversationDialogProps) {
  const navigate = useNavigate()
  const { userProfile } = useAuth()
  const [step, setStep] = useState<'type' | 'users' | 'details'>('type')
  const [conversationType, setConversationType] = useState<ConversationType>(
    defaultType || 'direct'
  )
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])
  const [groupName, setGroupName] = useState('')
  const [filterText, setFilterText] = useState('')

  // Fetch project users
  const { data: projectUsers = [], isLoading: isLoadingUsers } = useProjectUsers(projectId)

  // Filter out current user and apply search filter
  const availableUsers = useMemo(() => {
    return projectUsers.filter(pu => pu.user?.id !== userProfile?.id)
  }, [projectUsers, userProfile?.id])

  const filteredUsers = useMemo(() => {
    if (!filterText.trim()) return availableUsers
    const search = filterText.toLowerCase()
    return availableUsers.filter((pu) => {
      const user = pu.user
      if (!user) return false
      const name = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase()
      return name.includes(search) || user.email.toLowerCase().includes(search)
    })
  }, [availableUsers, filterText])

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
      setFilterText('')
    }
  }, [open, defaultType])

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
    if (selectedUsers.length === 0) {return}

    try {
      let conversationId: string | undefined

      if (conversationType === 'direct') {
        // Use getOrCreate for direct messages
        const result = await getOrCreateDirect.mutateAsync(selectedUsers[0].id)
        conversationId = result?.id
      } else {
        // Create group conversation
        const data: CreateConversationDTO = {
          type: conversationType,
          participant_ids: selectedUsers.map((u) => u.id),
          name: groupName || undefined,
          project_id: projectId,
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

  // Create project chat with all members auto-included
  const handleCreateProjectChat = async () => {
    try {
      const allMemberIds = availableUsers
        .map(pu => pu.user?.id)
        .filter((id): id is string => !!id)

      const data: CreateConversationDTO = {
        type: 'project',
        participant_ids: allMemberIds,
        name: 'Project Chat',
        project_id: projectId,
      }

      const result = await createConversation.mutateAsync(data)
      if (result?.id) {
        onOpenChange(false)
        navigate(`/messages/${result.id}`)
      }
    } catch (error) {
      console.error('Failed to create project chat:', error)
    }
  }

  // Check if can proceed
  const canProceed = () => {
    if (step === 'type') {return true}
    if (step === 'users') {return selectedUsers.length > 0}
    if (step === 'details') {return true}
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
                // Skip user selection - auto-include all project members
                handleCreateProjectChat()
              }}
              disabled={createConversation.isPending || availableUsers.length === 0}
              className={cn(
                'flex items-center gap-3 p-4 rounded-lg border text-left hover:bg-muted transition-colors',
                conversationType === 'project' && 'border-primary bg-primary/5',
                (createConversation.isPending || availableUsers.length === 0) && 'opacity-50 cursor-not-allowed'
              )}
            >
              <div className="h-10 w-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                <Building className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Project Chat</p>
                <p className="text-sm text-muted-foreground">
                  All project members ({availableUsers.length})
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

            {/* Filter input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter project members..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* User list - show all project members immediately */}
            <div className="mt-3 max-h-[250px] overflow-auto">
              {isLoadingUsers ? (
                <div className="py-8 text-center text-muted-foreground">
                  Loading project members...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  {filterText ? 'No matching members found' : 'No members in this project'}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredUsers.map((projectUser) => {
                    const user = projectUser.user
                    if (!user) return null
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
                            {user.company?.name || user.email}
                          </p>
                        </div>
                        {/* Role badge */}
                        {projectUser.project_role && (
                          <span className="text-xs text-muted-foreground capitalize px-2 py-0.5 bg-muted rounded">
                            {projectUser.project_role.replace('_', ' ')}
                          </span>
                        )}
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

        {/* Step 3: Details (for group chats) */}
        {step === 'details' && (
          <div className="py-4 space-y-4">
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

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
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
