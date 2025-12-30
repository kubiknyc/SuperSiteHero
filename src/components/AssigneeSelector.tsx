/**
 * AssigneeSelector Component
 * Unified selector for assigning items to users or subcontractors
 * Used in punch items, tasks, and other assignable entities
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  RadixSelect as Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { User, Building2, UserX } from 'lucide-react'
import { cn } from '@/lib/utils'

export type AssigneeType = 'user' | 'subcontractor' | null

export interface Assignee {
  type: AssigneeType
  id: string | null
  name?: string
}

interface AssigneeSelectorProps {
  projectId: string
  value: Assignee | null
  onChange: (assignee: Assignee | null) => void
  label?: string
  placeholder?: string
  disabled?: boolean
  showUnassigned?: boolean
  className?: string
  /**
   * If true, only show subcontractors (not users)
   */
  subcontractorsOnly?: boolean
  /**
   * If true, only show users (not subcontractors)
   */
  usersOnly?: boolean
}

interface ProjectUser {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  role: string
}

interface ProjectSubcontractor {
  id: string
  company_name: string
  trade: string
}

interface ProjectUserRow {
  user: ProjectUser | null
}

// Fetch project team members
async function fetchProjectUsers(projectId: string): Promise<ProjectUser[]> {
  const { data, error } = await supabase
    .from('project_users')
    .select(`
      user:users(
        id,
        first_name,
        last_name,
        email,
        role
      )
    `)
    .eq('project_id', projectId)

  if (error) {throw error}

  return (data || [])
    .map((pu: ProjectUserRow) => pu.user)
    .filter((u): u is ProjectUser => u !== null)
}

// Fetch project subcontractors
async function fetchProjectSubcontractors(projectId: string): Promise<ProjectSubcontractor[]> {
  const { data, error } = await supabase
    .from('subcontractors')
    .select('id, company_name, trade')
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('company_name')

  if (error) {throw error}

  return data || []
}

function getUserDisplayName(user: ProjectUser): string {
  if (user.first_name || user.last_name) {
    return [user.first_name, user.last_name].filter(Boolean).join(' ')
  }
  return user.email
}

export function AssigneeSelector({
  projectId,
  value,
  onChange,
  label = 'Assign To',
  placeholder = 'Select assignee...',
  disabled = false,
  showUnassigned = true,
  className,
  subcontractorsOnly = false,
  usersOnly = false,
}: AssigneeSelectorProps) {
  // Fetch users
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['project-users', projectId],
    queryFn: () => fetchProjectUsers(projectId),
    enabled: !!projectId && !subcontractorsOnly,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // Fetch subcontractors
  const { data: subcontractors = [], isLoading: subcontractorsLoading } = useQuery({
    queryKey: ['project-subcontractors', projectId],
    queryFn: () => fetchProjectSubcontractors(projectId),
    enabled: !!projectId && !usersOnly,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  const isLoading = usersLoading || subcontractorsLoading

  // Build the select value string
  const selectValue = useMemo(() => {
    if (!value || !value.type || !value.id) {return 'unassigned'}
    return `${value.type}:${value.id}`
  }, [value])

  // Handle selection change
  const handleValueChange = (newValue: string) => {
    if (newValue === 'unassigned') {
      onChange(null)
      return
    }

    const [type, id] = newValue.split(':') as [AssigneeType, string]

    if (type === 'user') {
      const user = users.find((u) => u.id === id)
      onChange({
        type: 'user',
        id,
        name: user ? getUserDisplayName(user) : undefined,
      })
    } else if (type === 'subcontractor') {
      const sub = subcontractors.find((s) => s.id === id)
      onChange({
        type: 'subcontractor',
        id,
        name: sub?.company_name,
      })
    }
  }

  // Get display name for current value
  const displayValue = useMemo(() => {
    if (!value || !value.type || !value.id) {return null}

    if (value.type === 'user') {
      const user = users.find((u) => u.id === value.id)
      return user ? getUserDisplayName(user) : value.name || 'Unknown User'
    }

    if (value.type === 'subcontractor') {
      const sub = subcontractors.find((s) => s.id === value.id)
      return sub?.company_name || value.name || 'Unknown Subcontractor'
    }

    return null
  }, [value, users, subcontractors])

  return (
    <div className={cn('space-y-2', className)}>
      {label && <Label>{label}</Label>}
      <Select
        value={selectValue}
        onValueChange={handleValueChange}
        disabled={disabled || isLoading}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={isLoading ? 'Loading...' : placeholder}>
            {displayValue && (
              <span className="flex items-center gap-2">
                {value?.type === 'user' ? (
                  <User className="h-4 w-4 text-muted-foreground" />
                ) : value?.type === 'subcontractor' ? (
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                ) : null}
                {displayValue}
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {/* Unassigned option */}
          {showUnassigned && (
            <>
              <SelectItem value="unassigned">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <UserX className="h-4 w-4" />
                  Unassigned
                </span>
              </SelectItem>
              <SelectSeparator />
            </>
          )}

          {/* Team Members */}
          {!subcontractorsOnly && users.length > 0 && (
            <SelectGroup>
              <SelectLabel>
                <span className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Team Members
                </span>
              </SelectLabel>
              {users.map((user) => (
                <SelectItem key={user.id} value={`user:${user.id}`}>
                  <span className="flex items-center justify-between w-full gap-4">
                    <span>{getUserDisplayName(user)}</span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {user.role?.replace('_', ' ')}
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          )}

          {/* Separator between groups */}
          {!subcontractorsOnly && !usersOnly && users.length > 0 && subcontractors.length > 0 && (
            <SelectSeparator />
          )}

          {/* Subcontractors */}
          {!usersOnly && subcontractors.length > 0 && (
            <SelectGroup>
              <SelectLabel>
                <span className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Subcontractors
                </span>
              </SelectLabel>
              {subcontractors.map((sub) => (
                <SelectItem key={sub.id} value={`subcontractor:${sub.id}`}>
                  <span className="flex items-center justify-between w-full gap-4">
                    <span>{sub.company_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {sub.trade}
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          )}

          {/* Empty state */}
          {users.length === 0 && subcontractors.length === 0 && !isLoading && (
            <div className="py-4 text-center text-sm text-muted-foreground">
              No team members or subcontractors found
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  )
}

export default AssigneeSelector
