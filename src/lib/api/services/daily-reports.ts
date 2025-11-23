// File: /src/lib/api/services/daily-reports.ts
// Daily Reports API service

import { apiClient } from '../client'
import { ApiErrorClass } from '../errors'
import type { DailyReport } from '@/types/database'
import type { QueryOptions } from '../types'
import { dailyReportCreateSchema, dailyReportUpdateSchema } from '@/lib/validation'

export const dailyReportsApi = {
  /**
   * Fetch daily reports for a project
   */
  async getProjectReports(
    projectId: string,
    options?: QueryOptions
  ): Promise<DailyReport[]> {
    try {
      if (!projectId) {
        throw new ApiErrorClass({
          code: 'PROJECT_ID_REQUIRED',
          message: 'Project ID is required',
        })
      }

      return await apiClient.select<DailyReport>('daily_reports', {
        ...options,
        filters: [
          ...(options?.filters || []),
          { column: 'project_id', operator: 'eq', value: projectId },
        ],
        orderBy: options?.orderBy || { column: 'report_date', ascending: false },
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_DAILY_REPORTS_ERROR',
            message: 'Failed to fetch daily reports',
          })
    }
  },

  /**
   * Fetch a single daily report
   */
  async getReport(reportId: string): Promise<DailyReport> {
    try {
      return await apiClient.selectOne<DailyReport>('daily_reports', reportId)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_DAILY_REPORT_ERROR',
            message: 'Failed to fetch daily report',
          })
    }
  },

  /**
   * Get reports for a specific date
   */
  async getReportsByDate(
    projectId: string,
    reportDate: string
  ): Promise<DailyReport[]> {
    try {
      return await apiClient.select<DailyReport>('daily_reports', {
        filters: [
          { column: 'project_id', operator: 'eq', value: projectId },
          { column: 'report_date', operator: 'eq', value: reportDate },
        ],
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_REPORTS_BY_DATE_ERROR',
            message: 'Failed to fetch reports for this date',
          })
    }
  },

  /**
   * Get reports within a date range
   */
  async getReportsByDateRange(
    projectId: string,
    startDate: string,
    endDate: string
  ): Promise<DailyReport[]> {
    try {
      return await apiClient.select<DailyReport>('daily_reports', {
        filters: [
          { column: 'project_id', operator: 'eq', value: projectId },
          { column: 'report_date', operator: 'gte', value: startDate },
          { column: 'report_date', operator: 'lte', value: endDate },
        ],
        orderBy: { column: 'report_date', ascending: false },
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_REPORTS_BY_DATE_RANGE_ERROR',
            message: 'Failed to fetch reports for this date range',
          })
    }
  },

  /**
   * Create a new daily report
   */
  async createReport(
    data: Omit<DailyReport, 'id' | 'created_at' | 'updated_at'>
  ): Promise<DailyReport> {
    try {
      // Validate input data
      const validation = dailyReportCreateSchema.safeParse(data)
      if (!validation.success) {
        throw new ApiErrorClass({
          code: 'VALIDATION_ERROR',
          message: 'Invalid daily report data',
          details: validation.error.issues,
        })
      }

      return await apiClient.insert<DailyReport>('daily_reports', validation.data)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CREATE_DAILY_REPORT_ERROR',
            message: 'Failed to create daily report',
          })
    }
  },

  /**
   * Update a daily report
   */
  async updateReport(
    reportId: string,
    updates: Partial<Omit<DailyReport, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<DailyReport> {
    try {
      if (!reportId) {
        throw new ApiErrorClass({
          code: 'REPORT_ID_REQUIRED',
          message: 'Report ID is required',
        })
      }

      // Validate update data
      const validation = dailyReportUpdateSchema.safeParse(updates)
      if (!validation.success) {
        throw new ApiErrorClass({
          code: 'VALIDATION_ERROR',
          message: 'Invalid update data',
          details: validation.error.issues,
        })
      }

      return await apiClient.update<DailyReport>('daily_reports', reportId, validation.data)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_DAILY_REPORT_ERROR',
            message: 'Failed to update daily report',
          })
    }
  },

  /**
   * Delete a daily report
   */
  async deleteReport(reportId: string): Promise<void> {
    try {
      if (!reportId) {
        throw new ApiErrorClass({
          code: 'REPORT_ID_REQUIRED',
          message: 'Report ID is required',
        })
      }

      await apiClient.delete('daily_reports', reportId)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'DELETE_DAILY_REPORT_ERROR',
            message: 'Failed to delete daily report',
          })
    }
  },

  /**
   * Submit a daily report for approval
   */
  async submitReport(reportId: string): Promise<DailyReport> {
    try {
      return await apiClient.update<DailyReport>('daily_reports', reportId, {
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'SUBMIT_DAILY_REPORT_ERROR',
            message: 'Failed to submit daily report',
          })
    }
  },

  /**
   * Approve a daily report
   */
  async approveReport(reportId: string): Promise<DailyReport> {
    try {
      return await apiClient.update<DailyReport>('daily_reports', reportId, {
        status: 'approved',
        approved_at: new Date().toISOString(),
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'APPROVE_DAILY_REPORT_ERROR',
            message: 'Failed to approve daily report',
          })
    }
  },

  /**
   * Reject a daily report
   */
  async rejectReport(reportId: string, reason: string): Promise<DailyReport> {
    try {
      return await apiClient.update<DailyReport>('daily_reports', reportId, {
        status: 'rejected',
        rejection_reason: reason,
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'REJECT_DAILY_REPORT_ERROR',
            message: 'Failed to reject daily report',
          })
    }
  },
}
