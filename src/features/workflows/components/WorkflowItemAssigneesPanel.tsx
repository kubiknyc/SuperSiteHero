// File: /src/features/workflows/components/WorkflowItemAssigneesPanel.tsx
// Panel component for displaying and managing workflow item assignees

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Users, Plus, X, Check } from 'lucide-react'
import { useWorkflowItem } from '@/features/workflows/hooks/useWorkflowItems'
import { useProjectUsers, useUpdateWorkflowItemAssignees } from '@/features/workflows/hooks/useWorkflowItemAssignees'
import type { ProjectUserWithDetails } from '@/lib/api/services/workflows'

interface WorkflowItemAssigneesPanelProps {
  workflowItemId: string
  projectId: string
}

// Get display name for a user
function getUserDisplayName(user: ProjectUserWithDetails['user']): string {
  if (!user) {return 'Unknown User'}
  return user.full_name || user.email || 'Unknown User'
}

// Get initials for avatar
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function WorkflowItemAssigneesPanel({
  workflowItemId,
  projectId,
}: WorkflowItemAssigneesPanelProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])

  const { data: workflowItem, isLoading: itemLoading } = useWorkflowItem(workflowItemId)
  const { data: projectUsers, isLoading: usersLoading } = useProjectUsers(projectId)
  const updateAssignees = useUpdateWorkflowItemAssignees()

  const currentAssignees = workflowItem?.assignees || []
  const isLoading = itemLoading || usersLoading

  // Get user details for current assignees
  const assignedUsers = projectUsers?.filter((pu) =>
    currentAssignees.includes(pu.user_id)
  ) || []

  // Get available users (not yet assigned)
  const availableUsers = projectUsers?.filter(
    (pu) => !currentAssignees.includes(pu.user_id)
  ) || []

  const handleStartEdit = () => {
    setSelectedUserIds([...currentAssignees])
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setSelectedUserIds([])
    setIsEditing(false)
  }

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSave = () => {
    updateAssignees.mutate(
      {
        workflowItemId,
        assignees: selectedUserIds,
      },
      {
        onSuccess: () => {
          setIsEditing(false)
          setSelectedUserIds([])
        },
      }
    )
  }

  const handleRemoveAssignee = (userId: string) => {
    const newAssignees = currentAssignees.filter((id) => id !== userId)
    updateAssignees.mutate({
      workflowItemId,
      assignees: newAssignees,
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Assignees
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-disabled" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          Assignees
          {assignedUsers.length > 0 && (
            <span className="text-sm font-normal text-muted">
              ({assignedUsers.length})
            </span>
          )}
        </CardTitle>
        {!isEditing && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleStartEdit}
            className="h-8"
          >
            <Plus className="h-3 w-3 mr-1" />
            Manage
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isEditing ? (
          // Edit Mode - Show all project users as checkboxes
          <div className="space-y-3">
            <p className="text-sm text-secondary">
              Select users to assign to this item:
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {projectUsers?.map((pu) => (
                <label
                  key={pu.user_id}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-surface cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedUserIds.includes(pu.user_id)}
                    onChange={() => handleToggleUser(pu.user_id)}
                    className="h-4 w-4 rounded border-input text-primary focus:ring-blue-500"
                  />
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-info-light text-primary-hover flex items-center justify-center text-xs font-medium">
                      {getInitials(getUserDisplayName(pu.user))}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {getUserDisplayName(pu.user)}
                      </p>
                      {pu.project_role && (
                        <p className="text-xs text-muted capitalize">
                          {pu.project_role.replace(/_/g, ' ')}
                        </p>
                      )}
                    </div>
                  </div>
                </label>
              ))}
              {(!projectUsers || projectUsers.length === 0) && (
                <p className="text-sm text-muted text-center py-2">
                  No users assigned to this project
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelEdit}
                disabled={updateAssignees.isPending}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateAssignees.isPending}
                className="gap-1"
              >
                {updateAssignees.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
                Save
              </Button>
            </div>
          </div>
        ) : (
          // View Mode - Show current assignees
          <>
            {assignedUsers.length > 0 ? (
              <div className="space-y-2">
                {assignedUsers.map((pu) => (
                  <div
                    key={pu.user_id}
                    className="flex items-center justify-between gap-2 p-2 rounded-md bg-surface"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-info-light text-primary-hover flex items-center justify-center text-xs font-medium">
                        {getInitials(getUserDisplayName(pu.user))}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {getUserDisplayName(pu.user)}
                        </p>
                        {pu.project_role && (
                          <p className="text-xs text-muted capitalize">
                            {pu.project_role.replace(/_/g, ' ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAssignee(pu.user_id)}
                      disabled={updateAssignees.isPending}
                      className="h-7 w-7 p-0 text-disabled hover:text-error hover:bg-error-light"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No assignees yet</p>
                <p className="text-xs">Click "Manage" to add assignees</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
