// File: /src/features/contacts/hooks/useContacts.ts
// React Query hooks for contacts queries and mutations

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import type { Database } from '@/types/database'

type Contact = Database['public']['Tables']['contacts']['Row']
type ContactInsert = Database['public']['Tables']['contacts']['Insert']
type ContactUpdate = Database['public']['Tables']['contacts']['Update']

export interface ContactFilters {
  contactType?: string
  trade?: string
  isPrimary?: boolean
  searchTerm?: string
}

// =============================================
// Query Hooks
// =============================================

/**
 * Fetch all contacts for a project with optional filtering
 */
export function useContacts(projectId: string | undefined, filters?: ContactFilters) {
  return useQuery({
    queryKey: ['contacts', projectId, filters],
    queryFn: async () => {
      if (!projectId) {
        throw new Error('Project ID is required')
      }

      let query = supabase
        .from('contacts')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('company_name', { ascending: true })
        .order('last_name', { ascending: true })

      // Apply filters
      if (filters?.contactType) {
        query = query.eq('contact_type', filters.contactType)
      }
      if (filters?.trade) {
        query = query.eq('trade', filters.trade)
      }
      if (filters?.isPrimary !== undefined) {
        query = query.eq('is_primary', filters.isPrimary)
      }

      const { data, error } = await query

      if (error) {throw error}

      // Client-side search filtering
      let results = data as Contact[]
      if (filters?.searchTerm) {
        const term = filters.searchTerm.toLowerCase()
        results = results.filter(
          (contact) =>
            contact.first_name?.toLowerCase().includes(term) ||
            contact.last_name?.toLowerCase().includes(term) ||
            contact.company_name?.toLowerCase().includes(term) ||
            contact.email?.toLowerCase().includes(term) ||
            contact.phone_mobile?.includes(term) ||
            contact.phone_office?.includes(term)
        )
      }

      return results
    },
    enabled: !!projectId,
  })
}

/**
 * Fetch single contact by ID
 */
export function useContact(contactId: string | undefined) {
  return useQuery({
    queryKey: ['contacts', contactId],
    queryFn: async () => {
      if (!contactId) {
        throw new Error('Contact ID is required')
      }

      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .is('deleted_at', null)
        .single()

      if (error) {throw error}
      return data as Contact
    },
    enabled: !!contactId,
  })
}

/**
 * Fetch contacts by type (subcontractor, architect, inspector, etc.)
 */
export function useContactsByType(projectId: string | undefined, contactType: string) {
  return useQuery({
    queryKey: ['contacts', projectId, 'type', contactType],
    queryFn: async () => {
      if (!projectId) {
        throw new Error('Project ID is required')
      }

      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('project_id', projectId)
        .eq('contact_type', contactType)
        .is('deleted_at', null)
        .order('company_name', { ascending: true })

      if (error) {throw error}
      return data as Contact[]
    },
    enabled: !!projectId && !!contactType,
  })
}

/**
 * Fetch emergency contacts only
 */
export function useEmergencyContacts(projectId: string | undefined) {
  return useQuery({
    queryKey: ['contacts', projectId, 'emergency'],
    queryFn: async () => {
      if (!projectId) {
        throw new Error('Project ID is required')
      }

      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_emergency_contact', true)
        .is('deleted_at', null)
        .order('last_name', { ascending: true })

      if (error) {throw error}
      return data as Contact[]
    },
    enabled: !!projectId,
  })
}

// =============================================
// Mutation Hooks
// =============================================

/**
 * Create new contact mutation
 */
export function useCreateContact() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (input: Omit<ContactInsert, 'created_by'>) => {
      if (!userProfile?.id) {
        throw new Error('User must be authenticated to create contact')
      }

      if (!input.project_id) {
        throw new Error('Project ID is required')
      }

      if (!input.contact_type) {
        throw new Error('Contact type is required')
      }

      const { data, error } = await supabase
        .from('contacts')
        .insert({
          ...input,
          created_by: userProfile.id,
        })
        .select()
        .single()

      if (error) {throw error}
      return data as Contact
    },
    onSuccess: (data) => {
      // Invalidate all contact-related queries
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      queryClient.invalidateQueries({ queryKey: ['contacts', data.project_id] })
    },
  })
}

/**
 * Update contact mutation
 */
export function useUpdateContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ContactUpdate> }) => {
      if (!id) {
        throw new Error('Contact ID is required')
      }

      const { data, error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}
      return data as Contact
    },
    onSuccess: (data) => {
      // Invalidate specific contact and list queries
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      queryClient.invalidateQueries({ queryKey: ['contacts', data.project_id] })
      queryClient.invalidateQueries({ queryKey: ['contacts', data.id] })
    },
  })
}

/**
 * Soft delete contact mutation
 */
export function useDeleteContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (contactId: string) => {
      if (!contactId) {
        throw new Error('Contact ID is required')
      }

      // Get contact before deleting to know which queries to invalidate
      const { data: contact } = await supabase
        .from('contacts')
        .select('project_id')
        .eq('id', contactId)
        .single()

      const { error } = await supabase
        .from('contacts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', contactId)

      if (error) {throw error}
      return contact?.project_id
    },
    onSuccess: (projectId) => {
      // Invalidate all contact queries to remove deleted item
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['contacts', projectId] })
      }
    },
  })
}
