// File: /src/lib/api/projectTeam.ts
// API service for project team management

import { supabase } from '@/lib/supabase'
import type { ProjectTeamMember, AddTeamMemberInput, UpdateTeamMemberInput, CompanyUser } from '@/features/projects/types/team'

export const projectTeamApi = {
  /**
   * Fetch all team members for a project
   */
  async getProjectTeam(projectId: string): Promise<ProjectTeamMember[]> {
    const { data, error } = await supabase
      .from('project_users')
      .select(`
        id,
        project_id,
        user_id,
        project_role,
        can_edit,
        can_delete,
        can_approve,
        assigned_at,
        assigned_by,
        user:users!project_users_user_id_fkey(
          id,
          first_name,
          last_name,
          email,
          avatar_url,
          role,
          phone,
          company:companies(
            id,
            name
          )
        )
      `)
      .eq('project_id', projectId)
      .order('assigned_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch project team: ${error.message}`)
    }

    return (data || []) as ProjectTeamMember[]
  },

  /**
   * Add a team member to a project
   */
  async addTeamMember(
    projectId: string,
    input: AddTeamMemberInput,
    assignedBy?: string
  ): Promise<ProjectTeamMember> {
    const { data, error } = await supabase
      .from('project_users')
      .insert({
        project_id: projectId,
        user_id: input.user_id,
        project_role: input.project_role || null,
        can_edit: input.can_edit ?? true,
        can_delete: input.can_delete ?? false,
        can_approve: input.can_approve ?? false,
        assigned_by: assignedBy || null,
      })
      .select(`
        id,
        project_id,
        user_id,
        project_role,
        can_edit,
        can_delete,
        can_approve,
        assigned_at,
        assigned_by,
        user:users!project_users_user_id_fkey(
          id,
          first_name,
          last_name,
          email,
          avatar_url,
          role,
          phone,
          company:companies(
            id,
            name
          )
        )
      `)
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new Error('User is already a member of this project')
      }
      throw new Error(`Failed to add team member: ${error.message}`)
    }

    return data as ProjectTeamMember
  },

  /**
   * Update a team member's role and permissions
   */
  async updateTeamMember(
    membershipId: string,
    input: UpdateTeamMemberInput
  ): Promise<ProjectTeamMember> {
    const { data, error } = await supabase
      .from('project_users')
      .update({
        project_role: input.project_role,
        can_edit: input.can_edit,
        can_delete: input.can_delete,
        can_approve: input.can_approve,
      })
      .eq('id', membershipId)
      .select(`
        id,
        project_id,
        user_id,
        project_role,
        can_edit,
        can_delete,
        can_approve,
        assigned_at,
        assigned_by,
        user:users!project_users_user_id_fkey(
          id,
          first_name,
          last_name,
          email,
          avatar_url,
          role,
          phone,
          company:companies(
            id,
            name
          )
        )
      `)
      .single()

    if (error) {
      throw new Error(`Failed to update team member: ${error.message}`)
    }

    return data as ProjectTeamMember
  },

  /**
   * Remove a team member from a project
   */
  async removeTeamMember(membershipId: string): Promise<void> {
    const { error } = await supabase
      .from('project_users')
      .delete()
      .eq('id', membershipId)

    if (error) {
      throw new Error(`Failed to remove team member: ${error.message}`)
    }
  },

  /**
   * Fetch company users who are not yet on the project
   * Used for the add team member dialog
   */
  async getAvailableUsers(projectId: string, companyId: string): Promise<CompanyUser[]> {
    // First get existing project member IDs
    const { data: existingMembers, error: membersError } = await supabase
      .from('project_users')
      .select('user_id')
      .eq('project_id', projectId)

    if (membersError) {
      throw new Error(`Failed to fetch existing members: ${membersError.message}`)
    }

    const existingUserIds = (existingMembers || []).map(m => m.user_id)

    // Then fetch all company users not already on the project
    let query = supabase
      .from('users')
      .select('id, first_name, last_name, email, avatar_url, role')
      .eq('company_id', companyId)
      .order('first_name')

    // Exclude existing members if there are any
    if (existingUserIds.length > 0) {
      query = query.not('id', 'in', `(${existingUserIds.join(',')})`)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch available users: ${error.message}`)
    }

    return (data || []) as CompanyUser[]
  },
}
