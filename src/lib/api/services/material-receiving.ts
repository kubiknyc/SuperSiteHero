/**
 * Material Receiving API Service
 *
 * Comprehensive material delivery tracking with:
 * - Full delivery lifecycle management (received -> inspected -> stored -> issued)
 * - Photo documentation (delivery photos, tickets, damage photos)
 * - Links to submittals and daily reports
 * - Vendor and storage tracking
 * - Statistics and dashboard data
 */

import { supabase } from '@/lib/supabase'
import { ApiErrorClass } from '../errors'
import type {
  MaterialReceived,
  MaterialReceivedWithDetails,
  MaterialReceivedPhoto,
  CreateMaterialReceivedDTO,
  UpdateMaterialReceivedDTO,
  CreateMaterialPhotoDTO,
  UpdateMaterialPhotoDTO,
  MaterialReceivedFilters,
  MaterialReceivingStats,
  MaterialStatus,
  MaterialCondition,
} from '@/types/material-receiving'

// Use 'any' cast for tables not in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

// ============================================================================
// MATERIAL RECEIVING CRUD OPERATIONS
// ============================================================================

export const materialReceivingApi = {
  /**
   * Get all material receipts with optional filters
   */
  async getMaterialReceipts(filters: MaterialReceivedFilters): Promise<MaterialReceivedWithDetails[]> {
    try {
      let query = db
        .from('material_received')
        .select(`
          *,
          received_by_user:users!material_received_received_by_fkey(
            id,
            full_name,
            email
          ),
          inspected_by_user:users!material_received_inspected_by_fkey(
            id,
            full_name,
            email
          ),
          created_by_user:users!material_received_created_by_fkey(
            id,
            full_name,
            email
          ),
          project:projects(id, name, number),
          submittal_procurement:submittal_procurement(
            id,
            workflow_item:workflow_items(id, number, title)
          )
        `)
        .eq('project_id', filters.projectId)
        .is('deleted_at', null)
        .order('delivery_date', { ascending: false })

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.condition) {
        query = query.eq('condition', filters.condition)
      }
      if (filters.vendor) {
        query = query.ilike('vendor', `%${filters.vendor}%`)
      }
      if (filters.dateFrom) {
        query = query.gte('delivery_date', filters.dateFrom)
      }
      if (filters.dateTo) {
        query = query.lte('delivery_date', filters.dateTo)
      }
      if (filters.storageLocation) {
        query = query.ilike('storage_location', `%${filters.storageLocation}%`)
      }
      if (filters.hasSubmittal !== undefined) {
        if (filters.hasSubmittal) {
          query = query.not('submittal_procurement_id', 'is', null)
        } else {
          query = query.is('submittal_procurement_id', null)
        }
      }
      if (filters.hasDailyReport !== undefined) {
        if (filters.hasDailyReport) {
          query = query.not('daily_report_delivery_id', 'is', null)
        } else {
          query = query.is('daily_report_delivery_id', null)
        }
      }
      if (filters.search) {
        query = query.or(`material_description.ilike.%${filters.search}%,vendor.ilike.%${filters.search}%,delivery_ticket_number.ilike.%${filters.search}%,po_number.ilike.%${filters.search}%`)
      }

      const { data, error } = await query

      if (error) {
        throw new ApiErrorClass({
          code: 'FETCH_ERROR',
          message: 'Failed to fetch material receipts',
          details: error,
        })
      }

      // Transform to include nested user names
      return (data || []).map((item: any) => ({
        ...item,
        received_by_name: item.received_by_user?.full_name || null,
        received_by_email: item.received_by_user?.email || null,
        inspected_by_name: item.inspected_by_user?.full_name || null,
        inspected_by_email: item.inspected_by_user?.email || null,
        created_by_name: item.created_by_user?.full_name || null,
        project_name: item.project?.name || '',
        project_number: item.project?.number || null,
        submittal_id: item.submittal_procurement?.workflow_item?.id || null,
        submittal_number: item.submittal_procurement?.workflow_item?.number || null,
        submittal_title: item.submittal_procurement?.workflow_item?.title || null,
        photo_count: 0, // Will be populated separately if needed
      }))
    } catch (error) {
      if (error instanceof ApiErrorClass) throw error
      throw new ApiErrorClass({
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
        details: error,
      })
    }
  },

  /**
   * Get a single material receipt by ID
   */
  async getMaterialReceipt(id: string): Promise<MaterialReceivedWithDetails> {
    try {
      const { data, error } = await db
        .from('material_received')
        .select(`
          *,
          received_by_user:users!material_received_received_by_fkey(
            id,
            full_name,
            email
          ),
          inspected_by_user:users!material_received_inspected_by_fkey(
            id,
            full_name,
            email
          ),
          created_by_user:users!material_received_created_by_fkey(
            id,
            full_name,
            email
          ),
          project:projects(id, name, number),
          submittal_procurement:submittal_procurement(
            id,
            workflow_item:workflow_items(id, number, title)
          )
        `)
        .eq('id', id)
        .is('deleted_at', null)
        .single()

      if (error) {
        throw new ApiErrorClass({
          code: 'FETCH_ERROR',
          message: 'Material receipt not found',
          details: error,
        })
      }

      // Get photo count
      const { count: photoCount } = await db
        .from('material_received_photos')
        .select('*', { count: 'exact', head: true })
        .eq('material_received_id', id)
        .is('deleted_at', null)

      return {
        ...data,
        received_by_name: data.received_by_user?.full_name || null,
        received_by_email: data.received_by_user?.email || null,
        inspected_by_name: data.inspected_by_user?.full_name || null,
        inspected_by_email: data.inspected_by_user?.email || null,
        created_by_name: data.created_by_user?.full_name || null,
        project_name: data.project?.name || '',
        project_number: data.project?.number || null,
        submittal_id: data.submittal_procurement?.workflow_item?.id || null,
        submittal_number: data.submittal_procurement?.workflow_item?.number || null,
        submittal_title: data.submittal_procurement?.workflow_item?.title || null,
        photo_count: photoCount || 0,
      }
    } catch (error) {
      if (error instanceof ApiErrorClass) throw error
      throw new ApiErrorClass({
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
        details: error,
      })
    }
  },

  /**
   * Create a new material receipt
   */
  async createMaterialReceipt(dto: CreateMaterialReceivedDTO): Promise<MaterialReceived> {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user?.user?.id) {
        throw new ApiErrorClass({
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        })
      }

      const { data, error } = await db
        .from('material_received')
        .insert({
          ...dto,
          condition: dto.condition || 'good',
          status: dto.status || 'received',
          created_by: user.user.id,
          received_by: dto.received_by || user.user.id,
        })
        .select()
        .single()

      if (error) {
        throw new ApiErrorClass({
          code: 'INSERT_ERROR',
          message: 'Failed to create material receipt',
          details: error,
        })
      }

      return data
    } catch (error) {
      if (error instanceof ApiErrorClass) throw error
      throw new ApiErrorClass({
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
        details: error,
      })
    }
  },

  /**
   * Update a material receipt
   */
  async updateMaterialReceipt(id: string, dto: UpdateMaterialReceivedDTO): Promise<MaterialReceived> {
    try {
      const { data, error } = await db
        .from('material_received')
        .update(dto)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new ApiErrorClass({
          code: 'UPDATE_ERROR',
          message: 'Failed to update material receipt',
          details: error,
        })
      }

      return data
    } catch (error) {
      if (error instanceof ApiErrorClass) throw error
      throw new ApiErrorClass({
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
        details: error,
      })
    }
  },

  /**
   * Delete a material receipt (soft delete)
   */
  async deleteMaterialReceipt(id: string): Promise<void> {
    try {
      const { error } = await db
        .from('material_received')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

      if (error) {
        throw new ApiErrorClass({
          code: 'DELETE_ERROR',
          message: 'Failed to delete material receipt',
          details: error,
        })
      }
    } catch (error) {
      if (error instanceof ApiErrorClass) throw error
      throw new ApiErrorClass({
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
        details: error,
      })
    }
  },

  /**
   * Update material status
   */
  async updateStatus(id: string, status: MaterialStatus, inspectedBy?: string): Promise<MaterialReceived> {
    try {
      const updates: UpdateMaterialReceivedDTO = { status }

      // If moving to inspected status, set inspection details
      if (status === 'inspected' && inspectedBy) {
        updates.inspected_by = inspectedBy
        updates.inspected_at = new Date().toISOString()
      }

      return this.updateMaterialReceipt(id, updates)
    } catch (error) {
      if (error instanceof ApiErrorClass) throw error
      throw new ApiErrorClass({
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
        details: error,
      })
    }
  },

  /**
   * Update material condition
   */
  async updateCondition(id: string, condition: MaterialCondition, notes?: string): Promise<MaterialReceived> {
    try {
      const updates: UpdateMaterialReceivedDTO = {
        condition,
        condition_notes: notes,
      }

      return this.updateMaterialReceipt(id, updates)
    } catch (error) {
      if (error instanceof ApiErrorClass) throw error
      throw new ApiErrorClass({
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
        details: error,
      })
    }
  },

  // ============================================================================
  // PHOTO OPERATIONS
  // ============================================================================

  /**
   * Get photos for a material receipt
   */
  async getPhotos(materialReceivedId: string): Promise<MaterialReceivedPhoto[]> {
    try {
      const { data, error } = await db
        .from('material_received_photos')
        .select('*')
        .eq('material_received_id', materialReceivedId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) {
        throw new ApiErrorClass({
          code: 'FETCH_ERROR',
          message: 'Failed to fetch photos',
          details: error,
        })
      }

      return data || []
    } catch (error) {
      if (error instanceof ApiErrorClass) throw error
      throw new ApiErrorClass({
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
        details: error,
      })
    }
  },

  /**
   * Add a photo to a material receipt
   */
  async addPhoto(dto: CreateMaterialPhotoDTO): Promise<MaterialReceivedPhoto> {
    try {
      const { data: user } = await supabase.auth.getUser()

      const { data, error } = await db
        .from('material_received_photos')
        .insert({
          ...dto,
          photo_type: dto.photo_type || 'delivery',
          created_by: user?.user?.id,
          taken_by: dto.taken_by || user?.user?.id,
        })
        .select()
        .single()

      if (error) {
        throw new ApiErrorClass({
          code: 'INSERT_ERROR',
          message: 'Failed to add photo',
          details: error,
        })
      }

      return data
    } catch (error) {
      if (error instanceof ApiErrorClass) throw error
      throw new ApiErrorClass({
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
        details: error,
      })
    }
  },

  /**
   * Update a photo
   */
  async updatePhoto(id: string, dto: UpdateMaterialPhotoDTO): Promise<MaterialReceivedPhoto> {
    try {
      const { data, error } = await db
        .from('material_received_photos')
        .update(dto)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new ApiErrorClass({
          code: 'UPDATE_ERROR',
          message: 'Failed to update photo',
          details: error,
        })
      }

      return data
    } catch (error) {
      if (error instanceof ApiErrorClass) throw error
      throw new ApiErrorClass({
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
        details: error,
      })
    }
  },

  /**
   * Delete a photo (soft delete)
   */
  async deletePhoto(id: string): Promise<void> {
    try {
      const { error } = await db
        .from('material_received_photos')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

      if (error) {
        throw new ApiErrorClass({
          code: 'DELETE_ERROR',
          message: 'Failed to delete photo',
          details: error,
        })
      }
    } catch (error) {
      if (error instanceof ApiErrorClass) throw error
      throw new ApiErrorClass({
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
        details: error,
      })
    }
  },

  /**
   * Upload a photo to storage and create record
   */
  async uploadPhoto(
    materialReceivedId: string,
    file: File,
    metadata?: Partial<CreateMaterialPhotoDTO>
  ): Promise<MaterialReceivedPhoto> {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user?.user?.id) {
        throw new ApiErrorClass({
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        })
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${materialReceivedId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('material-receiving-photos')
        .upload(fileName, file)

      if (uploadError) {
        throw new ApiErrorClass({
          code: 'UPLOAD_ERROR',
          message: 'Failed to upload photo',
          details: uploadError,
        })
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('material-receiving-photos')
        .getPublicUrl(uploadData.path)

      // Create photo record
      return this.addPhoto({
        material_received_id: materialReceivedId,
        photo_url: urlData.publicUrl,
        taken_at: metadata?.taken_at || new Date().toISOString(),
        ...metadata,
      })
    } catch (error) {
      if (error instanceof ApiErrorClass) throw error
      throw new ApiErrorClass({
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
        details: error,
      })
    }
  },

  // ============================================================================
  // STATISTICS
  // ============================================================================

  /**
   * Get statistics for a project
   */
  async getStats(projectId: string): Promise<MaterialReceivingStats> {
    try {
      const { data, error } = await db.rpc('get_material_receiving_stats', {
        p_project_id: projectId,
      })

      if (error) {
        throw new ApiErrorClass({
          code: 'FETCH_ERROR',
          message: 'Failed to fetch statistics',
          details: error,
        })
      }

      return data || {
        total_deliveries: 0,
        this_week: 0,
        this_month: 0,
        pending_inspection: 0,
        with_issues: 0,
        by_status: { received: 0, inspected: 0, stored: 0, issued: 0, returned: 0 },
        by_condition: { good: 0, damaged: 0, partial: 0, rejected: 0 },
        unique_vendors: 0,
      }
    } catch (error) {
      if (error instanceof ApiErrorClass) throw error
      throw new ApiErrorClass({
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
        details: error,
      })
    }
  },

  /**
   * Get unique vendors for a project (for autocomplete)
   */
  async getVendors(projectId: string): Promise<string[]> {
    try {
      const { data, error } = await db
        .from('material_received')
        .select('vendor')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .not('vendor', 'is', null)
        .order('vendor')

      if (error) {
        throw new ApiErrorClass({
          code: 'FETCH_ERROR',
          message: 'Failed to fetch vendors',
          details: error,
        })
      }

      // Get unique vendors
      const vendors = [...new Set((data || []).map((d: any) => d.vendor).filter(Boolean))] as string[]
      return vendors
    } catch (error) {
      if (error instanceof ApiErrorClass) throw error
      throw new ApiErrorClass({
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
        details: error,
      })
    }
  },

  /**
   * Get unique storage locations for a project (for autocomplete)
   */
  async getStorageLocations(projectId: string): Promise<string[]> {
    try {
      const { data, error } = await db
        .from('material_received')
        .select('storage_location')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .not('storage_location', 'is', null)
        .order('storage_location')

      if (error) {
        throw new ApiErrorClass({
          code: 'FETCH_ERROR',
          message: 'Failed to fetch storage locations',
          details: error,
        })
      }

      // Get unique locations
      const locations = [...new Set((data || []).map((d: any) => d.storage_location).filter(Boolean))] as string[]
      return locations
    } catch (error) {
      if (error instanceof ApiErrorClass) throw error
      throw new ApiErrorClass({
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
        details: error,
      })
    }
  },

  // ============================================================================
  // LINKING OPERATIONS
  // ============================================================================

  /**
   * Link to a submittal procurement
   */
  async linkToSubmittal(id: string, submittalProcurementId: string): Promise<MaterialReceived> {
    return this.updateMaterialReceipt(id, { submittal_procurement_id: submittalProcurementId })
  },

  /**
   * Unlink from submittal
   */
  async unlinkFromSubmittal(id: string): Promise<MaterialReceived> {
    return this.updateMaterialReceipt(id, { submittal_procurement_id: null })
  },

  /**
   * Link to a daily report delivery
   */
  async linkToDailyReport(id: string, dailyReportDeliveryId: string): Promise<MaterialReceived> {
    return this.updateMaterialReceipt(id, { daily_report_delivery_id: dailyReportDeliveryId })
  },

  /**
   * Unlink from daily report
   */
  async unlinkFromDailyReport(id: string): Promise<MaterialReceived> {
    return this.updateMaterialReceipt(id, { daily_report_delivery_id: null })
  },
}

export default materialReceivingApi
