// @ts-nocheck
/**
 * Equipment API Service
 *
 * Supabase API service for the Equipment Tracking system
 * Aligned with migration 051_equipment_tracking.sql
 */

import { supabase } from '@/lib/supabase'
import type {
  Equipment,
  EquipmentWithDetails,
  EquipmentWithStats,
  EquipmentAssignment,
  EquipmentAssignmentWithProject,
  EquipmentLog,
  EquipmentLogWithDetails,
  EquipmentMaintenance,
  EquipmentMaintenanceWithDetails,
  EquipmentInspection,
  EquipmentFilters,
  EquipmentLogFilters,
  EquipmentMaintenanceFilters,
  EquipmentStatistics,
  CreateEquipmentDTO,
  UpdateEquipmentDTO,
  CreateEquipmentAssignmentDTO,
  UpdateEquipmentAssignmentDTO,
  CreateEquipmentLogDTO,
  UpdateEquipmentLogDTO,
  CreateEquipmentMaintenanceDTO,
  UpdateEquipmentMaintenanceDTO,
  CreateEquipmentInspectionDTO,
  EquipmentStatus,
  EquipmentType,
  OwnershipType,
} from '@/types/equipment'

// ============================================================================
// EQUIPMENT API
// ============================================================================

export const equipmentApi = {
  /**
   * Get all equipment with filters
   */
  async getEquipment(filters: EquipmentFilters): Promise<EquipmentWithStats[]> {
    let query = supabase
      .from('equipment_summary')
      .select('*')
      .eq('company_id', filters.companyId)
      .order('equipment_number', { ascending: true })

    // Apply filters
    if (filters.equipmentType) {
      if (Array.isArray(filters.equipmentType)) {
        query = query.in('equipment_type', filters.equipmentType)
      } else {
        query = query.eq('equipment_type', filters.equipmentType)
      }
    }

    if (filters.category) {
      if (Array.isArray(filters.category)) {
        query = query.in('category', filters.category)
      } else {
        query = query.eq('category', filters.category)
      }
    }

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status)
      } else {
        query = query.eq('status', filters.status)
      }
    }

    if (filters.ownershipType) {
      query = query.eq('ownership_type', filters.ownershipType)
    }

    if (filters.currentProjectId) {
      query = query.eq('current_project_id', filters.currentProjectId)
    }

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,equipment_number.ilike.%${filters.search}%,make.ilike.%${filters.search}%,model.ilike.%${filters.search}%`)
    }

    const { data, error } = await query

    if (error) throw error
    return (data || []) as EquipmentWithStats[]
  },

  /**
   * Get a single equipment with all details
   */
  async getEquipmentById(id: string): Promise<EquipmentWithDetails> {
    const { data, error } = await supabase
      .from('equipment_summary')
      .select(`
        *,
        current_project:projects!equipment_current_project_id_fkey(id, name, number),
        created_by_user:users!equipment_created_by_fkey(id, full_name, email)
      `)
      .eq('id', id)
      .single()

    if (error) throw error

    // Get active assignments
    const { data: assignments } = await supabase
      .from('equipment_assignments')
      .select(`
        *,
        project:projects(id, name, number),
        assigned_by_user:users!equipment_assignments_assigned_by_fkey(id, full_name, email)
      `)
      .eq('equipment_id', id)
      .eq('status', 'active')
      .order('assigned_date', { ascending: false })

    // Get recent logs (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: logs } = await supabase
      .from('equipment_logs')
      .select('*')
      .eq('equipment_id', id)
      .gte('log_date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('log_date', { ascending: false })
      .limit(10)

    // Get upcoming maintenance
    const { data: maintenance } = await supabase
      .from('equipment_maintenance')
      .select('*')
      .eq('equipment_id', id)
      .eq('status', 'scheduled')
      .gte('scheduled_date', new Date().toISOString().split('T')[0])
      .order('scheduled_date', { ascending: true })
      .limit(5)

    return {
      ...data,
      active_assignments: assignments || [],
      recent_logs: logs || [],
      upcoming_maintenance: maintenance || [],
    } as EquipmentWithDetails
  },

  /**
   * Create new equipment
   */
  async createEquipment(dto: CreateEquipmentDTO): Promise<Equipment> {
    const { data: user } = await supabase.auth.getUser()

    // Get company_id from user
    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user?.user?.id)
      .single()

    if (!userData?.company_id) throw new Error('User company not found')

    const equipmentData = {
      company_id: userData.company_id,
      equipment_number: dto.equipment_number,
      name: dto.name,
      description: dto.description || null,
      equipment_type: dto.equipment_type,
      category: dto.category || null,
      make: dto.make || null,
      model: dto.model || null,
      year: dto.year || null,
      serial_number: dto.serial_number || null,
      vin: dto.vin || null,
      ownership_type: dto.ownership_type || 'owned',
      owner_company: dto.owner_company || null,
      rental_rate: dto.rental_rate || null,
      rental_rate_type: dto.rental_rate_type || null,
      capacity: dto.capacity || null,
      operating_weight: dto.operating_weight || null,
      dimensions: dto.dimensions || null,
      status: dto.status || 'available',
      current_location: dto.current_location || null,
      current_hours: dto.current_hours || 0,
      current_miles: dto.current_miles || 0,
      purchase_price: dto.purchase_price || null,
      purchase_date: dto.purchase_date || null,
      hourly_cost: dto.hourly_cost || null,
      fuel_type: dto.fuel_type || null,
      insurance_policy: dto.insurance_policy || null,
      insurance_expiry: dto.insurance_expiry || null,
      registration_number: dto.registration_number || null,
      registration_expiry: dto.registration_expiry || null,
      requires_certified_operator: dto.requires_certified_operator || false,
      certification_type: dto.certification_type || null,
      image_url: dto.image_url || null,
      notes: dto.notes || null,
      created_by: user?.user?.id,
    }

    const { data, error } = await supabase
      .from('equipment')
      .insert(equipmentData)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Update equipment
   */
  async updateEquipment(id: string, dto: UpdateEquipmentDTO): Promise<Equipment> {
    const { data, error } = await supabase
      .from('equipment')
      .update(dto)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Update equipment status
   */
  async updateEquipmentStatus(id: string, status: EquipmentStatus): Promise<Equipment> {
    const { data, error } = await supabase
      .from('equipment')
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Soft delete equipment
   */
  async deleteEquipment(id: string): Promise<void> {
    const { error } = await supabase
      .from('equipment')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
  },

  /**
   * Get equipment statistics for a company
   */
  async getEquipmentStatistics(companyId: string): Promise<EquipmentStatistics> {
    const { data: equipment, error } = await supabase
      .from('equipment_summary')
      .select('*')
      .eq('company_id', companyId)

    if (error) throw error

    const stats: EquipmentStatistics = {
      total: equipment?.length || 0,
      by_status: {
        available: 0,
        in_use: 0,
        maintenance: 0,
        out_of_service: 0,
      },
      by_type: {} as Record<EquipmentType, number>,
      by_ownership: {
        owned: 0,
        rented: 0,
        leased: 0,
      },
      total_hours_this_month: 0,
      equipment_needing_maintenance: 0,
      rented_equipment_count: 0,
      utilization_rate: 0,
    }

    if (!equipment) return stats

    for (const item of equipment) {
      // Count by status
      if (item.status in stats.by_status) {
        stats.by_status[item.status as EquipmentStatus]++
      }

      // Count by type
      if (!stats.by_type[item.equipment_type as EquipmentType]) {
        stats.by_type[item.equipment_type as EquipmentType] = 0
      }
      stats.by_type[item.equipment_type as EquipmentType]++

      // Count by ownership
      if (item.ownership_type in stats.by_ownership) {
        stats.by_ownership[item.ownership_type as OwnershipType]++
      }

      // Sum hours this month
      stats.total_hours_this_month += item.hours_this_month || 0

      // Count needing maintenance (days since > 30 or next date is in past)
      if (
        (item.days_since_maintenance && item.days_since_maintenance > 90) ||
        (item.next_maintenance_date && new Date(item.next_maintenance_date) < new Date())
      ) {
        stats.equipment_needing_maintenance++
      }

      // Count rented
      if (item.ownership_type === 'rented') {
        stats.rented_equipment_count++
      }
    }

    // Calculate utilization rate
    const totalAvailableAndInUse = stats.by_status.available + stats.by_status.in_use
    if (totalAvailableAndInUse > 0) {
      stats.utilization_rate = Math.round((stats.by_status.in_use / totalAvailableAndInUse) * 100)
    }

    return stats
  },

  /**
   * Get available equipment for a project
   */
  async getAvailableEquipment(companyId: string): Promise<EquipmentWithStats[]> {
    const { data, error } = await supabase
      .from('equipment_summary')
      .select('*')
      .eq('company_id', companyId)
      .eq('status', 'available')
      .order('equipment_number', { ascending: true })

    if (error) throw error
    return (data || []) as EquipmentWithStats[]
  },
}

// ============================================================================
// EQUIPMENT ASSIGNMENTS API
// ============================================================================

export const equipmentAssignmentsApi = {
  /**
   * Get assignments for an equipment
   */
  async getAssignments(equipmentId: string): Promise<EquipmentAssignmentWithProject[]> {
    const { data, error } = await supabase
      .from('equipment_assignments')
      .select(`
        *,
        project:projects(id, name, number),
        assigned_by_user:users!equipment_assignments_assigned_by_fkey(id, full_name, email)
      `)
      .eq('equipment_id', equipmentId)
      .order('assigned_date', { ascending: false })

    if (error) throw error
    return (data || []) as EquipmentAssignmentWithProject[]
  },

  /**
   * Get equipment assigned to a project
   */
  async getProjectEquipment(projectId: string): Promise<EquipmentAssignmentWithProject[]> {
    const { data, error } = await supabase
      .from('equipment_assignments')
      .select(`
        *,
        equipment:equipment(id, equipment_number, name, equipment_type, make, model, status),
        assigned_by_user:users!equipment_assignments_assigned_by_fkey(id, full_name, email)
      `)
      .eq('project_id', projectId)
      .eq('status', 'active')
      .order('assigned_date', { ascending: false })

    if (error) throw error
    return (data || []) as EquipmentAssignmentWithProject[]
  },

  /**
   * Assign equipment to a project
   */
  async assignEquipment(dto: CreateEquipmentAssignmentDTO): Promise<EquipmentAssignment> {
    const { data: user } = await supabase.auth.getUser()

    const assignmentData = {
      equipment_id: dto.equipment_id,
      project_id: dto.project_id,
      assigned_date: dto.assigned_date,
      expected_return_date: dto.expected_return_date || null,
      assignment_reason: dto.assignment_reason || null,
      daily_rate: dto.daily_rate || null,
      hourly_rate: dto.hourly_rate || null,
      status: 'active',
      assigned_by: user?.user?.id,
      notes: dto.notes || null,
    }

    const { data, error } = await supabase
      .from('equipment_assignments')
      .insert(assignmentData)
      .select()
      .single()

    if (error) throw error

    // Update equipment status and current project
    await supabase
      .from('equipment')
      .update({
        status: 'in_use',
        current_project_id: dto.project_id,
      })
      .eq('id', dto.equipment_id)

    return data
  },

  /**
   * Update an assignment
   */
  async updateAssignment(id: string, dto: UpdateEquipmentAssignmentDTO): Promise<EquipmentAssignment> {
    const { data, error } = await supabase
      .from('equipment_assignments')
      .update(dto)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Return equipment (complete assignment)
   */
  async returnEquipment(assignmentId: string, actualReturnDate?: string): Promise<EquipmentAssignment> {
    // Get the assignment to find the equipment
    const { data: assignment } = await supabase
      .from('equipment_assignments')
      .select('equipment_id')
      .eq('id', assignmentId)
      .single()

    const { data, error } = await supabase
      .from('equipment_assignments')
      .update({
        status: 'completed',
        actual_return_date: actualReturnDate || new Date().toISOString().split('T')[0],
      })
      .eq('id', assignmentId)
      .select()
      .single()

    if (error) throw error

    // Update equipment status
    if (assignment?.equipment_id) {
      await supabase
        .from('equipment')
        .update({
          status: 'available',
          current_project_id: null,
        })
        .eq('id', assignment.equipment_id)
    }

    return data
  },
}

// ============================================================================
// EQUIPMENT LOGS API
// ============================================================================

export const equipmentLogsApi = {
  /**
   * Get logs for an equipment
   */
  async getLogs(filters: EquipmentLogFilters): Promise<EquipmentLogWithDetails[]> {
    let query = supabase
      .from('equipment_logs')
      .select(`
        *,
        equipment:equipment(id, equipment_number, name),
        project:projects(id, name, number),
        operator:users!equipment_logs_operator_id_fkey(id, full_name, email)
      `)
      .order('log_date', { ascending: false })

    if (filters.equipmentId) {
      query = query.eq('equipment_id', filters.equipmentId)
    }

    if (filters.projectId) {
      query = query.eq('project_id', filters.projectId)
    }

    if (filters.dateFrom) {
      query = query.gte('log_date', filters.dateFrom)
    }

    if (filters.dateTo) {
      query = query.lte('log_date', filters.dateTo)
    }

    if (filters.operatorId) {
      query = query.eq('operator_id', filters.operatorId)
    }

    const { data, error } = await query

    if (error) throw error
    return (data || []) as EquipmentLogWithDetails[]
  },

  /**
   * Create a log entry
   */
  async createLog(dto: CreateEquipmentLogDTO): Promise<EquipmentLog> {
    const { data: user } = await supabase.auth.getUser()

    const logData = {
      equipment_id: dto.equipment_id,
      project_id: dto.project_id || null,
      log_date: dto.log_date,
      hours_used: dto.hours_used || 0,
      miles_driven: dto.miles_driven || 0,
      fuel_used: dto.fuel_used || 0,
      fuel_cost: dto.fuel_cost || null,
      start_hours: dto.start_hours || null,
      end_hours: dto.end_hours || null,
      start_miles: dto.start_miles || null,
      end_miles: dto.end_miles || null,
      operator_id: dto.operator_id || null,
      operator_name: dto.operator_name || null,
      work_description: dto.work_description || null,
      location: dto.location || null,
      condition_notes: dto.condition_notes || null,
      reported_issues: dto.reported_issues || null,
      idle_hours: dto.idle_hours || 0,
      daily_report_id: dto.daily_report_id || null,
      cost_code_id: dto.cost_code_id || null,
      created_by: user?.user?.id,
    }

    const { data, error } = await supabase
      .from('equipment_logs')
      .insert(logData)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Update a log entry
   */
  async updateLog(id: string, dto: UpdateEquipmentLogDTO): Promise<EquipmentLog> {
    const { data, error } = await supabase
      .from('equipment_logs')
      .update(dto)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Delete a log entry
   */
  async deleteLog(id: string): Promise<void> {
    const { error } = await supabase
      .from('equipment_logs')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  /**
   * Get total hours for equipment in a date range
   */
  async getTotalHours(equipmentId: string, dateFrom: string, dateTo: string): Promise<number> {
    const { data, error } = await supabase
      .from('equipment_logs')
      .select('hours_used')
      .eq('equipment_id', equipmentId)
      .gte('log_date', dateFrom)
      .lte('log_date', dateTo)

    if (error) throw error

    return data?.reduce((sum, log) => sum + (log.hours_used || 0), 0) || 0
  },

  // ============================================================================
  // COST INTEGRATION METHODS
  // ============================================================================

  /**
   * Get equipment logs with cost details from view
   */
  async getLogsWithCosts(filters: EquipmentLogFilters): Promise<EquipmentLogWithDetails[]> {
    let query = supabase
      .from('equipment_logs_with_costs')
      .select('*')
      .order('log_date', { ascending: false })

    if (filters.equipmentId) {
      query = query.eq('equipment_id', filters.equipmentId)
    }

    if (filters.projectId) {
      query = query.eq('project_id', filters.projectId)
    }

    if (filters.dateFrom) {
      query = query.gte('log_date', filters.dateFrom)
    }

    if (filters.dateTo) {
      query = query.lte('log_date', filters.dateTo)
    }

    if (filters.operatorId) {
      query = query.eq('operator_id', filters.operatorId)
    }

    const { data, error } = await query

    if (error) throw error
    return (data || []) as EquipmentLogWithDetails[]
  },

  /**
   * Get unposted equipment costs for a project
   */
  async getUnpostedCosts(projectId: string): Promise<EquipmentLogWithDetails[]> {
    const { data, error } = await supabase
      .from('equipment_logs_with_costs')
      .select('*')
      .eq('project_id', projectId)
      .eq('cost_posted', false)
      .not('calculated_cost', 'is', null)
      .gt('calculated_cost', 0)
      .order('log_date', { ascending: false })

    if (error) throw error
    return (data || []) as EquipmentLogWithDetails[]
  },

  /**
   * Post equipment log cost to cost tracking system
   * Calls database function that creates cost transaction
   */
  async postCostToTransaction(logId: string): Promise<string> {
    const { data, error } = await supabase
      .rpc('post_equipment_cost_to_transaction', { p_equipment_log_id: logId })

    if (error) throw error
    return data as string  // Returns the new cost_transaction_id
  },

  /**
   * Batch post multiple equipment costs
   */
  async batchPostCosts(logIds: string[]): Promise<{ success: string[]; failed: { id: string; error: string }[] }> {
    const results = {
      success: [] as string[],
      failed: [] as { id: string; error: string }[],
    }

    for (const logId of logIds) {
      try {
        await this.postCostToTransaction(logId)
        results.success.push(logId)
      } catch (err) {
        results.failed.push({
          id: logId,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    return results
  },
}

// ============================================================================
// EQUIPMENT MAINTENANCE API
// ============================================================================

export const equipmentMaintenanceApi = {
  /**
   * Get maintenance records
   */
  async getMaintenance(filters: EquipmentMaintenanceFilters): Promise<EquipmentMaintenanceWithDetails[]> {
    let query = supabase
      .from('equipment_maintenance')
      .select(`
        *,
        equipment:equipment(id, equipment_number, name),
        created_by_user:users!equipment_maintenance_created_by_fkey(id, full_name, email)
      `)
      .order('scheduled_date', { ascending: true, nullsFirst: false })

    if (filters.equipmentId) {
      query = query.eq('equipment_id', filters.equipmentId)
    }

    if (filters.maintenanceType) {
      if (Array.isArray(filters.maintenanceType)) {
        query = query.in('maintenance_type', filters.maintenanceType)
      } else {
        query = query.eq('maintenance_type', filters.maintenanceType)
      }
    }

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status)
      } else {
        query = query.eq('status', filters.status)
      }
    }

    if (filters.dateFrom) {
      query = query.gte('scheduled_date', filters.dateFrom)
    }

    if (filters.dateTo) {
      query = query.lte('scheduled_date', filters.dateTo)
    }

    const { data, error } = await query

    if (error) throw error
    return (data || []) as EquipmentMaintenanceWithDetails[]
  },

  /**
   * Get a single maintenance record
   */
  async getMaintenanceById(id: string): Promise<EquipmentMaintenanceWithDetails> {
    const { data, error } = await supabase
      .from('equipment_maintenance')
      .select(`
        *,
        equipment:equipment(id, equipment_number, name),
        created_by_user:users!equipment_maintenance_created_by_fkey(id, full_name, email)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data as EquipmentMaintenanceWithDetails
  },

  /**
   * Schedule maintenance
   */
  async scheduleMaintenance(dto: CreateEquipmentMaintenanceDTO): Promise<EquipmentMaintenance> {
    const { data: user } = await supabase.auth.getUser()

    const maintenanceData = {
      equipment_id: dto.equipment_id,
      maintenance_type: dto.maintenance_type,
      scheduled_date: dto.scheduled_date || null,
      due_hours: dto.due_hours || null,
      due_miles: dto.due_miles || null,
      description: dto.description,
      service_provider: dto.service_provider || null,
      technician_name: dto.technician_name || null,
      status: 'scheduled',
      notes: dto.notes || null,
      created_by: user?.user?.id,
    }

    const { data, error } = await supabase
      .from('equipment_maintenance')
      .insert(maintenanceData)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Update maintenance record
   */
  async updateMaintenance(id: string, dto: UpdateEquipmentMaintenanceDTO): Promise<EquipmentMaintenance> {
    const { data, error } = await supabase
      .from('equipment_maintenance')
      .update(dto)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Complete maintenance
   */
  async completeMaintenance(
    id: string,
    completionData: {
      completed_date?: string
      completed_hours?: number
      completed_miles?: number
      work_performed?: string
      labor_cost?: number
      parts_cost?: number
      total_cost?: number
      parts_used?: EquipmentMaintenance['parts_used']
      downtime_hours?: number
      invoice_number?: string
      next_service_date?: string
      next_service_hours?: number
    }
  ): Promise<EquipmentMaintenance> {
    const updateData = {
      ...completionData,
      status: 'completed',
      completed_date: completionData.completed_date || new Date().toISOString().split('T')[0],
    }

    const { data, error } = await supabase
      .from('equipment_maintenance')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Cancel maintenance
   */
  async cancelMaintenance(id: string): Promise<EquipmentMaintenance> {
    const { data, error } = await supabase
      .from('equipment_maintenance')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Get upcoming maintenance (next 30 days)
   */
  async getUpcomingMaintenance(companyId: string): Promise<EquipmentMaintenanceWithDetails[]> {
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    const { data, error } = await supabase
      .from('equipment_maintenance')
      .select(`
        *,
        equipment:equipment!inner(id, equipment_number, name, company_id)
      `)
      .eq('equipment.company_id', companyId)
      .eq('status', 'scheduled')
      .lte('scheduled_date', thirtyDaysFromNow.toISOString().split('T')[0])
      .order('scheduled_date', { ascending: true })

    if (error) throw error
    return (data || []) as EquipmentMaintenanceWithDetails[]
  },
}

// ============================================================================
// EQUIPMENT INSPECTIONS API
// ============================================================================

export const equipmentInspectionsApi = {
  /**
   * Get inspections for an equipment
   */
  async getInspections(equipmentId: string): Promise<EquipmentInspection[]> {
    const { data, error } = await supabase
      .from('equipment_inspections')
      .select(`
        *,
        inspector:users!equipment_inspections_inspector_id_fkey(id, full_name, email),
        project:projects(id, name, number)
      `)
      .eq('equipment_id', equipmentId)
      .order('inspection_date', { ascending: false })

    if (error) throw error
    return data || []
  },

  /**
   * Create an inspection
   */
  async createInspection(dto: CreateEquipmentInspectionDTO): Promise<EquipmentInspection> {
    const { data: user } = await supabase.auth.getUser()

    const inspectionData = {
      equipment_id: dto.equipment_id,
      project_id: dto.project_id || null,
      inspection_type: dto.inspection_type,
      inspection_date: dto.inspection_date,
      inspector_id: dto.inspector_id || user?.user?.id,
      inspector_name: dto.inspector_name || null,
      overall_status: dto.overall_status,
      checklist_items: dto.checklist_items || [],
      hours_reading: dto.hours_reading || null,
      miles_reading: dto.miles_reading || null,
      issues_found: dto.issues_found || null,
      corrective_actions: dto.corrective_actions || null,
      follow_up_required: dto.follow_up_required || false,
      follow_up_date: dto.follow_up_date || null,
      signature_url: dto.signature_url || null,
      created_by: user?.user?.id,
    }

    const { data, error } = await supabase
      .from('equipment_inspections')
      .insert(inspectionData)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Get latest inspection for equipment
   */
  async getLatestInspection(equipmentId: string): Promise<EquipmentInspection | null> {
    const { data, error } = await supabase
      .from('equipment_inspections')
      .select('*')
      .eq('equipment_id', equipmentId)
      .order('inspection_date', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') throw error  // PGRST116 = no rows
    return data || null
  },
}

// Combined export
export const equipmentApiService = {
  equipment: equipmentApi,
  assignments: equipmentAssignmentsApi,
  logs: equipmentLogsApi,
  maintenance: equipmentMaintenanceApi,
  inspections: equipmentInspectionsApi,
}
