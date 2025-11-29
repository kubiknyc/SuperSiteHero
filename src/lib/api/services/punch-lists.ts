// File: /src/lib/api/services/punch-lists.ts
// Punch Lists API service

import { apiClient } from '../client'
import { ApiErrorClass } from '../errors'
import { supabase } from '@/lib/supabase'
import { sendEmail } from '@/lib/email/email-service'
import { generatePunchItemAssignedEmail } from '@/lib/email/templates'
import type { PunchItem } from '@/types/database'
import type { QueryOptions } from '../types'

// Helper to get user details for notifications
async function getUserDetails(userId: string): Promise<{ email: string; full_name: string | null } | null> {
  const { data } = await supabase
    .from('users')
    .select('email, full_name')
    .eq('id', userId)
    .single()
  return data
}

// Helper to get project name
async function getProjectName(projectId: string): Promise<string> {
  const { data } = await supabase
    .from('projects')
    .select('name')
    .eq('id', projectId)
    .single()
  return data?.name || 'Unknown Project'
}

// Helper to get punch list name
async function getPunchListName(punchListId: string): Promise<string> {
  const { data } = await supabase
    .from('punch_lists')
    .select('name')
    .eq('id', punchListId)
    .single()
  return data?.name || 'Punch List'
}

// Helper to get subcontractor contact email
async function getSubcontractorContactEmail(subcontractorId: string): Promise<{ email: string; company_name: string } | null> {
  const { data } = await supabase
    .from('subcontractors')
    .select(`
      company_name,
      contacts(email, first_name, last_name)
    `)
    .eq('id', subcontractorId)
    .single()

  if (!data?.contacts) return null
  const contact = data.contacts as any
  return {
    email: contact.email,
    company_name: data.company_name,
  }
}

export const punchListsApi = {
  /**
   * Fetch all punch items for a project
   */
  async getPunchItemsByProject(
    projectId: string,
    options?: QueryOptions
  ): Promise<PunchItem[]> {
    try {
      if (!projectId) {
        throw new ApiErrorClass({
          code: 'PROJECT_ID_REQUIRED',
          message: 'Project ID is required',
        })
      }

      return await apiClient.select<PunchItem>('punch_items', {
        ...options,
        filters: [
          ...(options?.filters || []),
          { column: 'project_id', operator: 'eq', value: projectId },
          { column: 'deleted_at', operator: 'eq', value: null },
        ],
        orderBy: options?.orderBy || { column: 'created_at', ascending: false },
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_PUNCH_ITEMS_ERROR',
            message: 'Failed to fetch punch items',
          })
    }
  },

  /**
   * Fetch a single punch item by ID
   */
  async getPunchItem(punchItemId: string): Promise<PunchItem> {
    try {
      if (!punchItemId) {
        throw new ApiErrorClass({
          code: 'PUNCH_ITEM_ID_REQUIRED',
          message: 'Punch item ID is required',
        })
      }

      return await apiClient.selectOne<PunchItem>('punch_items', punchItemId)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_PUNCH_ITEM_ERROR',
            message: 'Failed to fetch punch item',
          })
    }
  },

  /**
   * Create a new punch item
   */
  async createPunchItem(
    data: Omit<PunchItem, 'id' | 'created_at' | 'updated_at'>,
    options?: { createdById?: string }
  ): Promise<PunchItem> {
    try {
      if (!data.project_id) {
        throw new ApiErrorClass({
          code: 'PROJECT_ID_REQUIRED',
          message: 'Project ID is required',
        })
      }

      const result = await apiClient.insert<PunchItem>('punch_items', {
        ...data,
        marked_complete_by: null,
        verified_by: null,
      })

      // Send notification if punch item is assigned to a user
      if (data.assigned_to) {
        this._notifyPunchItemAssigned(result, options?.createdById).catch(console.error)
      }

      // Send notification if punch item is assigned to a subcontractor
      if (data.subcontractor_id) {
        this._notifySubcontractorPunchItemAssigned(result, options?.createdById).catch(console.error)
      }

      return result
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CREATE_PUNCH_ITEM_ERROR',
            message: 'Failed to create punch item',
          })
    }
  },

  /**
   * Update an existing punch item
   */
  async updatePunchItem(
    punchItemId: string,
    updates: Partial<Omit<PunchItem, 'id' | 'created_at' | 'updated_at'>>,
    options?: { updatedById?: string }
  ): Promise<PunchItem> {
    try {
      if (!punchItemId) {
        throw new ApiErrorClass({
          code: 'PUNCH_ITEM_ID_REQUIRED',
          message: 'Punch item ID is required',
        })
      }

      // Get existing item to check for assignment changes
      const existingItem = await this.getPunchItem(punchItemId)
      const wasAssignedToUser = existingItem.assigned_to
      const wasAssignedToSub = existingItem.subcontractor_id
      const newUserAssignee = updates.assigned_to
      const newSubcontractorAssignee = updates.subcontractor_id

      const result = await apiClient.update<PunchItem>('punch_items', punchItemId, updates)

      // Send notification if user assignee changed
      if (newUserAssignee && newUserAssignee !== wasAssignedToUser) {
        this._notifyPunchItemAssigned(result, options?.updatedById).catch(console.error)
      }

      // Send notification if subcontractor assignee changed
      if (newSubcontractorAssignee && newSubcontractorAssignee !== wasAssignedToSub) {
        this._notifySubcontractorPunchItemAssigned(result, options?.updatedById).catch(console.error)
      }

      return result
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_PUNCH_ITEM_ERROR',
            message: 'Failed to update punch item',
          })
    }
  },

  /**
   * Send email notification when punch item is assigned
   */
  async _notifyPunchItemAssigned(punchItem: PunchItem, assignedById?: string): Promise<void> {
    try {
      if (!punchItem.assigned_to) return

      const [assignee, assigner, projectName, punchListName] = await Promise.all([
        getUserDetails(punchItem.assigned_to),
        assignedById ? getUserDetails(assignedById) : Promise.resolve(null),
        getProjectName(punchItem.project_id),
        punchItem.punch_list_id ? getPunchListName(punchItem.punch_list_id) : Promise.resolve('Punch List'),
      ])

      if (!assignee?.email) return

      const appUrl = import.meta.env.VITE_APP_URL || 'https://supersitehero.com'
      const { html, text} = generatePunchItemAssignedEmail({
        recipientName: assignee.full_name || assignee.email.split('@')[0],
        itemNumber: punchItem.number?.toString() || punchItem.id.slice(0, 8),
        description: punchItem.description ?? punchItem.title,
        projectName,
        location: punchItem.location || 'Not specified',
        assignedBy: assigner?.full_name || 'Someone',
        dueDate: punchItem.due_date ? new Date(punchItem.due_date).toLocaleDateString() : undefined,
        priority: punchItem.priority ?? undefined,
        punchListName,
        viewUrl: `${appUrl}/projects/${punchItem.project_id}/punch-lists/${punchItem.punch_list_id || ''}`,
      })

      await sendEmail({
        to: { email: assignee.email, name: assignee.full_name ?? undefined },
        subject: `Punch Item Assigned: ${(punchItem.description || 'Punch Item').substring(0, 50)}...`,
        html,
        text,
        tags: ['punch-item', 'assigned'],
      })
    } catch (error) {
      console.error('[PunchItem] Failed to send assignment notification:', error)
    }
  },

  /**
   * Send email notification when punch item is assigned to a subcontractor
   */
  async _notifySubcontractorPunchItemAssigned(punchItem: PunchItem, assignedById?: string): Promise<void> {
    try {
      if (!punchItem.subcontractor_id) return

      const [subcontractor, assigner, projectName] = await Promise.all([
        getSubcontractorContactEmail(punchItem.subcontractor_id),
        assignedById ? getUserDetails(assignedById) : Promise.resolve(null),
        getProjectName(punchItem.project_id),
      ])

      if (!subcontractor?.email) return

      const appUrl = import.meta.env.VITE_APP_URL || 'https://supersitehero.com'

      // Build location string
      const locationParts = [punchItem.building, punchItem.floor, punchItem.room, punchItem.area].filter(Boolean)
      const location = locationParts.length > 0 ? locationParts.join(' > ') : 'Not specified'

      const { html, text } = generatePunchItemAssignedEmail({
        recipientName: subcontractor.company_name,
        itemNumber: punchItem.number?.toString() || punchItem.id.slice(0, 8),
        description: punchItem.description || punchItem.title,
        projectName,
        location,
        assignedBy: assigner?.full_name || 'Someone',
        dueDate: punchItem.due_date ? new Date(punchItem.due_date).toLocaleDateString() : undefined,
        priority: punchItem.priority ?? undefined,
        punchListName: 'Punch List',
        viewUrl: `${appUrl}/portal/punch-items`,
      })

      await sendEmail({
        to: { email: subcontractor.email, name: subcontractor.company_name },
        subject: `Punch Item Assigned: ${(punchItem.description || punchItem.title).substring(0, 50)}...`,
        html,
        text,
        tags: ['punch-item', 'assigned', 'subcontractor'],
      })
    } catch (error) {
      console.error('[PunchItem] Failed to send subcontractor assignment notification:', error)
    }
  },

  /**
   * Delete a punch item (soft delete via deleted_at)
   */
  async deletePunchItem(punchItemId: string): Promise<void> {
    try {
      if (!punchItemId) {
        throw new ApiErrorClass({
          code: 'PUNCH_ITEM_ID_REQUIRED',
          message: 'Punch item ID is required',
        })
      }

      await apiClient.update('punch_items', punchItemId, {
        deleted_at: new Date().toISOString(),
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'DELETE_PUNCH_ITEM_ERROR',
            message: 'Failed to delete punch item',
          })
    }
  },

  /**
   * Update punch item status with user tracking
   */
  async updatePunchItemStatus(
    punchItemId: string,
    status: string,
    userId?: string
  ): Promise<PunchItem> {
    try {
      if (!punchItemId) {
        throw new ApiErrorClass({
          code: 'PUNCH_ITEM_ID_REQUIRED',
          message: 'Punch item ID is required',
        })
      }

      const updates: Partial<PunchItem> = {
        status: status as any,
      }

      // Track who marked it complete/verified
      if (status === 'completed' && userId) {
        updates.marked_complete_by = userId
        updates.marked_complete_at = new Date().toISOString()
      } else if (status === 'verified' && userId) {
        updates.verified_by = userId
        updates.verified_at = new Date().toISOString()
      }

      return await apiClient.update<PunchItem>('punch_items', punchItemId, updates)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_PUNCH_ITEM_STATUS_ERROR',
            message: 'Failed to update punch item status',
          })
    }
  },

  /**
   * Search punch items by title or description
   * Performs search at database level for better performance
   */
  async searchPunchItems(
    projectId: string,
    query: string
  ): Promise<PunchItem[]> {
    try {
      if (!projectId) {
        throw new ApiErrorClass({
          code: 'PROJECT_ID_REQUIRED',
          message: 'Project ID is required',
        })
      }

      // Perform search at database level instead of client-side filtering
      const searchPattern = `%${query}%`
      const { data, error } = await supabase
        .from('punch_items')
        .select('id, number, title, description, status, trade, area, due_date, project_id, building, floor, room, priority')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .or(`title.ilike.${searchPattern},description.ilike.${searchPattern}`)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {throw error}
      return data as PunchItem[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'SEARCH_PUNCH_ITEMS_ERROR',
            message: 'Failed to search punch items',
          })
    }
  },
}
