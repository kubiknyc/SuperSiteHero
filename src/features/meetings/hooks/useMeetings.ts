// File: /src/features/meetings/hooks/useMeetings.ts
// React Query hooks for meetings data fetching and mutations

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type Meeting = Database['public']['Tables']['meetings']['Row']
type MeetingInsert = Database['public']['Tables']['meetings']['Insert']
type MeetingUpdate = Database['public']['Tables']['meetings']['Update']

// Meeting types for the dropdown - Construction industry standard types
export const MEETING_TYPES = [
  // Primary recurring meetings
  { value: 'oac_meeting', label: 'OAC Meeting (Owner-Architect-Contractor)' },
  { value: 'progress_meeting', label: 'Progress Meeting' },
  { value: 'coordination_meeting', label: 'Coordination Meeting' },
  { value: 'schedule_review', label: 'Schedule / Look-Ahead Meeting' },

  // Safety meetings
  { value: 'toolbox_talk', label: 'Toolbox Talk / Safety Briefing' },
  { value: 'safety_meeting', label: 'Safety Meeting' },

  // Project phase meetings
  { value: 'kickoff_meeting', label: 'Kickoff Meeting' },
  { value: 'preconstruction', label: 'Pre-Construction Meeting' },
  { value: 'pre_installation', label: 'Pre-Installation Meeting' },
  { value: 'closeout_meeting', label: 'Closeout Meeting' },
  { value: 'substantial_completion', label: 'Substantial Completion Walkthrough' },
  { value: 'commissioning', label: 'Commissioning Meeting' },

  // Stakeholder meetings
  { value: 'owner_meeting', label: 'Owner Meeting' },
  { value: 'subcontractor_meeting', label: 'Subcontractor Meeting' },

  // Technical meetings
  { value: 'design_review', label: 'Design Review' },
  { value: 'submittal_review', label: 'Submittal Review Meeting' },
  { value: 'quality_meeting', label: 'Quality Control Meeting' },
  { value: 'budget_review', label: 'Budget Review Meeting' },

  { value: 'other', label: 'Other' },
] as const

export type MeetingType = typeof MEETING_TYPES[number]['value']

// Meeting status options
export const MEETING_STATUSES = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'postponed', label: 'Postponed' },
] as const

export type MeetingStatus = typeof MEETING_STATUSES[number]['value']

// Action item priority levels
export const ACTION_ITEM_PRIORITIES = [
  { value: 'high', label: 'High', color: 'red' },
  { value: 'medium', label: 'Medium', color: 'yellow' },
  { value: 'low', label: 'Low', color: 'green' },
] as const

// Action item categories
export const ACTION_ITEM_CATEGORIES = [
  { value: 'design', label: 'Design' },
  { value: 'schedule', label: 'Schedule' },
  { value: 'safety', label: 'Safety' },
  { value: 'procurement', label: 'Procurement' },
  { value: 'quality', label: 'Quality' },
  { value: 'budget', label: 'Budget' },
  { value: 'coordination', label: 'Coordination' },
  { value: 'documentation', label: 'Documentation' },
  { value: 'other', label: 'Other' },
] as const

// Representing options for attendees
export const ATTENDEE_REPRESENTING = [
  { value: 'owner', label: 'Owner' },
  { value: 'gc', label: 'General Contractor' },
  { value: 'subcontractor', label: 'Subcontractor' },
  { value: 'architect', label: 'Architect' },
  { value: 'engineer', label: 'Engineer' },
  { value: 'inspector', label: 'Inspector' },
  { value: 'consultant', label: 'Consultant' },
  { value: 'other', label: 'Other' },
] as const

// Attendee type for JSON field - Enhanced for construction
export interface MeetingAttendee {
  name: string
  company?: string
  email?: string
  phone?: string
  role?: string
  title?: string
  trade?: string
  representing?: typeof ATTENDEE_REPRESENTING[number]['value']
  present?: boolean
  required?: boolean
  signature?: string
  signed_at?: string
  notes?: string
}

// Action item type for JSON field - Enhanced for construction
export interface MeetingActionItem {
  id: string
  description: string

  // Assignment
  assignee?: string
  assignee_company?: string
  assignee_email?: string

  // Timing
  dueDate?: string
  created_at?: string
  completedDate?: string

  // Status & Priority
  status: 'open' | 'in_progress' | 'completed' | 'cancelled'
  priority?: 'high' | 'medium' | 'low'

  // Categorization
  category?: typeof ACTION_ITEM_CATEGORIES[number]['value']

  // Impact tracking
  cost_impact?: boolean
  schedule_impact?: boolean
  schedule_impact_days?: number

  // Relations to other items
  related_item_type?: 'rfi' | 'submittal' | 'change_order' | 'punch_item' | 'document'
  related_item_id?: string

  // Additional info
  notes?: string
}

// Extended meeting type with parsed JSON fields
export interface MeetingWithDetails extends Omit<Meeting, 'attendees' | 'action_items'> {
  attendees: MeetingAttendee[] | null
  action_items: MeetingActionItem[] | null
}

// Fetch all meetings for a project
export function useMeetings(projectId: string | undefined) {
  return useQuery({
    queryKey: ['meetings', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required')

      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('meeting_date', { ascending: false })

      if (error) throw error
      return data as MeetingWithDetails[]
    },
    enabled: !!projectId,
  })
}

// Fetch all meetings across all projects
export function useAllMeetings() {
  return useQuery({
    queryKey: ['meetings', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meetings')
        .select(`
          *,
          projects:project_id (
            id,
            name
          )
        `)
        .is('deleted_at', null)
        .order('meeting_date', { ascending: false })

      if (error) throw error
      return data as (MeetingWithDetails & { projects: { id: string; name: string } | null })[]
    },
  })
}

// Fetch a single meeting by ID
export function useMeeting(meetingId: string | undefined) {
  return useQuery({
    queryKey: ['meetings', 'detail', meetingId],
    queryFn: async () => {
      if (!meetingId) throw new Error('Meeting ID required')

      const { data, error } = await supabase
        .from('meetings')
        .select(`
          *,
          projects:project_id (
            id,
            name
          )
        `)
        .eq('id', meetingId)
        .single()

      if (error) throw error
      return data as MeetingWithDetails & { projects: { id: string; name: string } | null }
    },
    enabled: !!meetingId,
  })
}

// Create a new meeting
export function useCreateMeeting() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (meeting: MeetingInsert) => {
      const { data, error } = await supabase
        .from('meetings')
        .insert(meeting)
        .select()
        .single()

      if (error) throw error
      return data as MeetingWithDetails
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] })
      queryClient.invalidateQueries({ queryKey: ['meetings', data.project_id] })
    },
  })
}

// Update an existing meeting
export function useUpdateMeeting() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: MeetingUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('meetings')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as MeetingWithDetails
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] })
      queryClient.invalidateQueries({ queryKey: ['meetings', 'detail', data.id] })
      queryClient.invalidateQueries({ queryKey: ['meetings', data.project_id] })
    },
  })
}

// Soft delete a meeting
export function useDeleteMeeting() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (meetingId: string) => {
      const { error } = await supabase
        .from('meetings')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', meetingId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] })
    },
  })
}

// Add action item to meeting
export function useAddActionItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      meetingId,
      actionItem,
    }: {
      meetingId: string
      actionItem: Omit<MeetingActionItem, 'id'>
    }) => {
      // First get the current meeting
      const { data: meeting, error: fetchError } = await supabase
        .from('meetings')
        .select('action_items')
        .eq('id', meetingId)
        .single()

      if (fetchError) throw fetchError

      const currentItems = (meeting.action_items as unknown as MeetingActionItem[]) || []
      const newItem: MeetingActionItem = {
        ...actionItem,
        id: crypto.randomUUID(),
      }

      const { data, error } = await supabase
        .from('meetings')
        .update({ action_items: [...currentItems, newItem] as unknown as Database['public']['Tables']['meetings']['Update']['action_items'] })
        .eq('id', meetingId)
        .select()
        .single()

      if (error) throw error
      return data as MeetingWithDetails
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['meetings', 'detail', data.id] })
    },
  })
}

// Update action item status
export function useUpdateActionItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      meetingId,
      actionItemId,
      updates,
    }: {
      meetingId: string
      actionItemId: string
      updates: Partial<MeetingActionItem>
    }) => {
      const { data: meeting, error: fetchError } = await supabase
        .from('meetings')
        .select('action_items')
        .eq('id', meetingId)
        .single()

      if (fetchError) throw fetchError

      const currentItems = (meeting.action_items as unknown as MeetingActionItem[]) || []
      const updatedItems = currentItems.map((item) =>
        item.id === actionItemId ? { ...item, ...updates } : item
      )

      const { data, error } = await supabase
        .from('meetings')
        .update({ action_items: updatedItems as unknown as Database['public']['Tables']['meetings']['Update']['action_items'] })
        .eq('id', meetingId)
        .select()
        .single()

      if (error) throw error
      return data as MeetingWithDetails
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['meetings', 'detail', data.id] })
    },
  })
}
