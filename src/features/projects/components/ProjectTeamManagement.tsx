// File: /src/features/projects/components/ProjectTeamManagement.tsx
// Main component for managing project team members

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, UserPlus, Search, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useProjectTeam, useRemoveTeamMember } from '../hooks/useProjectTeam'
import { TeamMemberCard } from './TeamMemberCard'
import { AddTeamMemberDialog } from './AddTeamMemberDialog'
import { EditTeamMemberDialog } from './EditTeamMemberDialog'
import type { ProjectTeamMember } from '../types/team'
import { useAuth } from '@/hooks/useAuth'

interface ProjectTeamManagementProps {
  projectId: string
  companyId: string
}

export function ProjectTeamManagement({ projectId, companyId }: ProjectTeamManagementProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingMember, setEditingMember] = useState<ProjectTeamMember | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [removingId, setRemovingId] = useState<string | null>(null)

  const { userProfile } = useAuth()
  const { data: team = [], isLoading, error } = useProjectTeam(projectId)
  const removeMember = useRemoveTeamMember(projectId)

  // Check if current user can manage team (admin/owner or has can_delete permission)
  const canManage =
    userProfile?.role === 'owner' ||
    userProfile?.role === 'admin' ||
    team.find(m => m.user_id === userProfile?.id)?.can_delete === true

  // Filter team by search query
  const filteredTeam = team.filter(member => {
    if (!searchQuery || !member.user) return true
    const searchLower = searchQuery.toLowerCase()
    const fullName = `${member.user.first_name || ''} ${member.user.last_name || ''}`.toLowerCase()
    return (
      fullName.includes(searchLower) ||
      member.user.email.toLowerCase().includes(searchLower) ||
      (member.project_role?.toLowerCase().includes(searchLower) ?? false)
    )
  })

  const handleRemove = async (member: ProjectTeamMember) => {
    setRemovingId(member.id)
    try {
      await removeMember.mutateAsync(member.id)
    } finally {
      setRemovingId(null)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-32" />
          </div>
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load project team. Please try again.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Project Team
              </CardTitle>
              <CardDescription className="mt-1">
                {team.length} {team.length === 1 ? 'member' : 'members'} assigned to this project
              </CardDescription>
            </div>
            {canManage && (
              <Button onClick={() => setShowAddDialog(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            )}
          </div>

          {/* Search */}
          {team.length > 3 && (
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search team members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          )}
        </CardHeader>

        <CardContent>
          {team.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-medium text-lg mb-1">No Team Members</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Add team members to grant them access to this project.
              </p>
              {canManage && (
                <Button onClick={() => setShowAddDialog(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add First Member
                </Button>
              )}
            </div>
          ) : filteredTeam.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No team members match your search.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTeam.map(member => (
                <TeamMemberCard
                  key={member.id}
                  member={member}
                  onEdit={setEditingMember}
                  onRemove={handleRemove}
                  isRemoving={removingId === member.id}
                  canManage={canManage}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Team Member Dialog */}
      <AddTeamMemberDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        projectId={projectId}
        companyId={companyId}
      />

      {/* Edit Team Member Dialog */}
      <EditTeamMemberDialog
        open={!!editingMember}
        onOpenChange={(open) => !open && setEditingMember(null)}
        projectId={projectId}
        member={editingMember}
      />
    </>
  )
}

export default ProjectTeamManagement
