/**
 * Daily Reports API Service Tests
 *
 * Comprehensive test suite covering:
 * - CRUD operations with success and error cases
 * - Query operations (by date, date range, project)
 * - Status transitions (submit, approve, reject)
 * - Input validation
 * - Error handling and ApiErrorClass
 * - Edge cases and data integrity
 */

import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true)

// Mock the API client - factory function to avoid hoisting issues
vi.mock('../client', () => ({
  apiClient: {
    select: vi.fn(),
    selectOne: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

// Mock validation schemas - factory function to avoid hoisting issues
vi.mock('@/lib/validation', () => ({
  dailyReportCreateSchema: {
    safeParse: vi.fn(),
  },
  dailyReportUpdateSchema: {
    safeParse: vi.fn(),
  },
}))

// Mock Sentry (imported by client)
vi.mock('@/lib/sentry', () => ({
  captureException: vi.fn(),
  addSentryBreadcrumb: vi.fn(),
}))

// Import after mocks are defined
import { dailyReportsApi } from './daily-reports'
import { apiClient } from '../client'
import { ApiErrorClass } from '../errors'
import { dailyReportCreateSchema, dailyReportUpdateSchema } from '@/lib/validation'

describe('dailyReportsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset API client mocks
    vi.mocked(apiClient).select.mockResolvedValue([])
    vi.mocked(apiClient).selectOne.mockResolvedValue({} as any)
    vi.mocked(apiClient).insert.mockResolvedValue({} as any)
    vi.mocked(apiClient).update.mockResolvedValue({} as any)
    vi.mocked(apiClient).delete.mockResolvedValue(undefined)
  })

  describe('getProjectReports', () => {
    const mockReports = [
      {
        id: 'report-1',
        project_id: 'proj-1',
        report_date: '2025-01-27',
        report_number: 'DR-001',
        status: 'draft',
        weather_condition: 'sunny',
        temperature_high: 75,
        created_at: '2025-01-27T10:00:00Z',
      },
    ]

    it('should fetch daily reports for a project', async () => {
      vi.mocked(apiClient).select.mockResolvedValue(mockReports)

      const result = await dailyReportsApi.getProjectReports('proj-1')

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('report-1')
      expect(apiClient.select).toHaveBeenCalledWith('daily_reports', expect.objectContaining({
        filters: expect.arrayContaining([
          { column: 'project_id', operator: 'eq', value: 'proj-1' }
        ])
      }))
    })

    it('should throw error for missing project ID', async () => {
      await expect(dailyReportsApi.getProjectReports('')).rejects.toThrow(
        'Project ID is required'
      )
    })

    it('should handle database errors gracefully', async () => {
      vi.mocked(apiClient).select.mockRejectedValue(new Error('Database error'))

      await expect(dailyReportsApi.getProjectReports('proj-1')).rejects.toThrow()
    })
  })

  describe('getReport', () => {
    const mockReport = {
      id: 'report-1',
      project_id: 'proj-1',
      report_date: '2025-01-27',
      status: 'draft',
    }

    it('should fetch a single report by ID', async () => {
      vi.mocked(apiClient).selectOne.mockResolvedValue(mockReport)

      const result = await dailyReportsApi.getReport('report-1')

      expect(result.id).toBe('report-1')
      expect(apiClient.selectOne).toHaveBeenCalledWith('daily_reports', 'report-1')
    })

    it('should handle missing report', async () => {
      vi.mocked(apiClient).selectOne.mockRejectedValue(new Error('Not found'))

      await expect(dailyReportsApi.getReport('nonexistent')).rejects.toThrow()
    })
  })

  describe('getReportsByDate', () => {
    it('should fetch reports for a specific date', async () => {
      const mockReports = [
        { id: 'report-1', report_date: '2025-01-27', project_id: 'proj-1' },
      ]

      vi.mocked(apiClient).select.mockResolvedValue(mockReports)

      const result = await dailyReportsApi.getReportsByDate('proj-1', '2025-01-27')

      expect(result).toHaveLength(1)
      expect(apiClient.select).toHaveBeenCalledWith('daily_reports', expect.objectContaining({
        filters: expect.arrayContaining([
          { column: 'project_id', operator: 'eq', value: 'proj-1' },
          { column: 'report_date', operator: 'eq', value: '2025-01-27' }
        ])
      }))
    })
  })

  describe('getReportsByDateRange', () => {
    it('should fetch reports within a date range', async () => {
      const mockReports = [
        { id: 'report-1', report_date: '2025-01-25', project_id: 'proj-1' },
        { id: 'report-2', report_date: '2025-01-26', project_id: 'proj-1' },
        { id: 'report-3', report_date: '2025-01-27', project_id: 'proj-1' },
      ]

      vi.mocked(apiClient).select.mockResolvedValue(mockReports)

      const result = await dailyReportsApi.getReportsByDateRange(
        'proj-1',
        '2025-01-25',
        '2025-01-27'
      )

      expect(result).toHaveLength(3)
      expect(apiClient.select).toHaveBeenCalledWith('daily_reports', expect.objectContaining({
        filters: expect.arrayContaining([
          { column: 'project_id', operator: 'eq', value: 'proj-1' },
          { column: 'report_date', operator: 'gte', value: '2025-01-25' },
          { column: 'report_date', operator: 'lte', value: '2025-01-27' }
        ]),
        orderBy: { column: 'report_date', ascending: false }
      }))
    })
  })

  describe('createReport', () => {
    const createInput = {
      project_id: '550e8400-e29b-41d4-a716-446655440000',
      report_date: '2025-01-27',
      reporter_id: '660e8400-e29b-41d4-a716-446655440001',
      status: 'draft' as const,
      weather_condition: 'sunny',
      temperature_high: 75,
      temperature_low: 55,
    }

    const createdReport = {
      id: 'report-new',
      ...createInput,
      created_at: '2025-01-27T10:00:00Z',
      updated_at: '2025-01-27T10:00:00Z',
    }

    it('should create a new daily report with valid data', async () => {
      vi.mocked(dailyReportCreateSchema.safeParse).mockReturnValue({
        success: true,
        data: createInput,
      })
      vi.mocked(apiClient).insert.mockResolvedValue(createdReport)

      const result = await dailyReportsApi.createReport(createInput)

      expect(dailyReportCreateSchema.safeParse).toHaveBeenCalledWith(createInput)
      expect(result.id).toBe('report-new')
      expect(apiClient.insert).toHaveBeenCalledWith('daily_reports', createInput)
    })

    it('should validate input data before creating', async () => {
      const invalidInput = {
        project_id: '',  // Invalid: empty project_id
        report_date: '2025-01-27',
        reporter_id: 'user-1',
        status: 'draft' as const,
      }

      vi.mocked(dailyReportCreateSchema.safeParse).mockReturnValue({
        success: false,
        error: {
          issues: [
            { path: ['project_id'], message: 'Project ID is required' },
          ],
        } as any,
      })

      await expect(dailyReportsApi.createReport(invalidInput as any)).rejects.toThrow(ApiErrorClass)
      await expect(dailyReportsApi.createReport(invalidInput as any)).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'Invalid daily report data',
      })
      expect(apiClient.insert).not.toHaveBeenCalled()
    })

    it('should handle database constraint violations', async () => {
      vi.mocked(dailyReportCreateSchema.safeParse).mockReturnValue({
        success: true,
        data: createInput,
      })
      vi.mocked(apiClient).insert.mockRejectedValue(new Error('Unique constraint violation'))

      await expect(dailyReportsApi.createReport(createInput)).rejects.toMatchObject({
        code: 'CREATE_DAILY_REPORT_ERROR',
        message: 'Failed to create daily report',
      })
    })

    it('should preserve ApiErrorClass errors from client', async () => {
      vi.mocked(dailyReportCreateSchema.safeParse).mockReturnValue({
        success: true,
        data: createInput,
      })
      const apiError = new ApiErrorClass({
        code: 'RLS_VIOLATION',
        message: 'Permission denied',
      })
      vi.mocked(apiClient).insert.mockRejectedValue(apiError)

      await expect(dailyReportsApi.createReport(createInput)).rejects.toThrow(apiError)
    })
  })

  describe('updateReport', () => {
    it('should update a daily report with valid data', async () => {
      const updateData = { weather_condition: 'cloudy' }
      const updatedReport = {
        id: 'report-1',
        project_id: 'proj-1',
        report_date: '2025-01-27',
        status: 'submitted' as const,
        weather_condition: 'cloudy',
      }

      vi.mocked(dailyReportUpdateSchema.safeParse).mockReturnValue({
        success: true,
        data: updateData,
      })
      vi.mocked(apiClient).update.mockResolvedValue(updatedReport)

      const result = await dailyReportsApi.updateReport('report-1', updateData)

      expect(dailyReportUpdateSchema.safeParse).toHaveBeenCalledWith(updateData)
      expect(result.weather_condition).toBe('cloudy')
      expect(apiClient.update).toHaveBeenCalledWith('daily_reports', 'report-1', updateData)
    })

    it('should throw error for missing report ID', async () => {
      await expect(dailyReportsApi.updateReport('', {})).rejects.toThrow(ApiErrorClass)
      await expect(dailyReportsApi.updateReport('', {})).rejects.toMatchObject({
        code: 'REPORT_ID_REQUIRED',
        message: 'Report ID is required',
      })
    })

    it('should validate update data before updating', async () => {
      const invalidUpdate = {
        project_id: '',  // Invalid: can't update to empty project_id
      }

      vi.mocked(dailyReportUpdateSchema.safeParse).mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['project_id'], message: 'Invalid project ID' }],
        } as any,
      })

      await expect(
        dailyReportsApi.updateReport('report-1', invalidUpdate as any)
      ).rejects.toThrow(ApiErrorClass)
      await expect(
        dailyReportsApi.updateReport('report-1', invalidUpdate as any)
      ).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'Invalid update data',
      })
      expect(apiClient.update).not.toHaveBeenCalled()
    })

    it('should handle concurrent update conflicts', async () => {
      const updateData = { weather_condition: 'cloudy' }
      vi.mocked(dailyReportUpdateSchema.safeParse).mockReturnValue({
        success: true,
        data: updateData,
      })
      vi.mocked(apiClient).update.mockRejectedValue(new Error('Concurrent update conflict'))

      await expect(dailyReportsApi.updateReport('report-1', updateData)).rejects.toMatchObject({
        code: 'UPDATE_DAILY_REPORT_ERROR',
      })
    })
  })

  describe('deleteReport', () => {
    it('should delete a daily report', async () => {
      vi.mocked(apiClient).delete.mockResolvedValue(undefined)

      await dailyReportsApi.deleteReport('report-1')

      expect(apiClient.delete).toHaveBeenCalledWith('daily_reports', 'report-1')
    })

    it('should throw error for missing report ID', async () => {
      await expect(dailyReportsApi.deleteReport('')).rejects.toThrow(
        'Report ID is required'
      )
    })
  })

  describe('submitReport', () => {
    it('should submit a report for approval', async () => {
      const submittedReport = {
        id: 'report-1',
        status: 'submitted',
        submitted_at: expect.any(String),
      }

      vi.mocked(apiClient).update.mockResolvedValue(submittedReport)

      const result = await dailyReportsApi.submitReport('report-1')

      expect(result.status).toBe('submitted')
      expect(apiClient.update).toHaveBeenCalledWith('daily_reports', 'report-1',
        expect.objectContaining({
          status: 'submitted',
          submitted_at: expect.any(String),
        })
      )
    })
  })

  describe('approveReport', () => {
    it('should approve a report', async () => {
      const approvedReport = {
        id: 'report-1',
        status: 'approved',
        approved_at: expect.any(String),
      }

      vi.mocked(apiClient).update.mockResolvedValue(approvedReport)

      const result = await dailyReportsApi.approveReport('report-1')

      expect(result.status).toBe('approved')
      expect(apiClient.update).toHaveBeenCalledWith('daily_reports', 'report-1',
        expect.objectContaining({
          status: 'approved',
          approved_at: expect.any(String),
        })
      )
    })
  })

  describe('rejectReport', () => {
    it('should reject a report with a reason', async () => {
      const rejectedReport = {
        id: 'report-1',
        status: 'rejected',
        comments: 'Rejected: Incomplete weather data',
      }

      vi.mocked(apiClient).update.mockResolvedValue(rejectedReport)

      const result = await dailyReportsApi.rejectReport('report-1', 'Incomplete weather data')

      expect(result.status).toBe('rejected')
      expect(result.comments).toContain('Rejected: Incomplete weather data')
      expect(apiClient.update).toHaveBeenCalledWith('daily_reports', 'report-1',
        expect.objectContaining({
          status: 'rejected',
          comments: 'Rejected: Incomplete weather data',
        })
      )
    })

    it('should prepend "Rejected:" to the reason', async () => {
      const rejectedReport = {
        id: 'report-1',
        status: 'rejected',
        comments: 'Rejected: Safety issues not addressed',
      }
      vi.mocked(apiClient).update.mockResolvedValue(rejectedReport)

      await dailyReportsApi.rejectReport('report-1', 'Safety issues not addressed')

      expect(apiClient.update).toHaveBeenCalledWith('daily_reports', 'report-1', {
        status: 'rejected',
        comments: 'Rejected: Safety issues not addressed',
      })
    })

    it('should handle empty rejection reason', async () => {
      const rejectedReport = {
        id: 'report-1',
        status: 'rejected',
        comments: 'Rejected: ',
      }
      vi.mocked(apiClient).update.mockResolvedValue(rejectedReport)

      await dailyReportsApi.rejectReport('report-1', '')

      expect(apiClient.update).toHaveBeenCalledWith('daily_reports', 'report-1', {
        status: 'rejected',
        comments: 'Rejected: ',
      })
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle custom filters with null values', async () => {
      vi.mocked(apiClient).select.mockResolvedValue([])

      await dailyReportsApi.getProjectReports('proj-1', {
        filters: [{ column: 'submitted_at', operator: 'eq', value: null }],
      })

      expect(apiClient.select).toHaveBeenCalled()
    })

    it('should handle empty arrays from database', async () => {
      vi.mocked(apiClient).select.mockResolvedValue([])

      const result = await dailyReportsApi.getProjectReports('proj-1')

      expect(result).toEqual([])
    })

    it('should handle ApiErrorClass from API client', async () => {
      const apiError = new ApiErrorClass({
        code: 'RLS_VIOLATION',
        message: 'Permission denied',
        status: 403,
      })
      vi.mocked(apiClient).select.mockRejectedValue(apiError)

      await expect(dailyReportsApi.getProjectReports('proj-1')).rejects.toThrow(apiError)
      await expect(dailyReportsApi.getProjectReports('proj-1')).rejects.toMatchObject({
        code: 'RLS_VIOLATION',
        message: 'Permission denied',
      })
    })

    it('should wrap generic errors in ApiErrorClass', async () => {
      const genericError = new Error('Network timeout')
      vi.mocked(apiClient).select.mockRejectedValue(genericError)

      await expect(dailyReportsApi.getProjectReports('proj-1')).rejects.toThrow(ApiErrorClass)
      await expect(dailyReportsApi.getProjectReports('proj-1')).rejects.toMatchObject({
        code: 'FETCH_DAILY_REPORTS_ERROR',
        message: 'Failed to fetch daily reports',
      })
    })

    it('should handle special characters in text fields', async () => {
      const dataWithSpecialChars = {
        project_id: 'proj-1',
        report_date: '2025-01-27',
        work_performed: "O'Reilly's concrete work & steel installation (5-10%)",
        safety_notes: 'Safety check: "All clear" - no issues',
        created_by: 'user-789',
      }

      vi.mocked(dailyReportCreateSchema.safeParse).mockReturnValue({
        success: true,
        data: dataWithSpecialChars,
      })
      vi.mocked(apiClient).insert.mockResolvedValue({ id: 'new', ...dataWithSpecialChars } as any)

      await dailyReportsApi.createReport(dataWithSpecialChars)

      expect(apiClient.insert).toHaveBeenCalledWith('daily_reports', dataWithSpecialChars)
    })

    it('should handle very long text content', async () => {
      const longText = 'A'.repeat(10000)
      const dataWithLongText = {
        project_id: 'proj-1',
        report_date: '2025-01-27',
        work_performed: longText,
        created_by: 'user-789',
      }

      vi.mocked(dailyReportCreateSchema.safeParse).mockReturnValue({
        success: true,
        data: dataWithLongText,
      })
      vi.mocked(apiClient).insert.mockResolvedValue({ id: 'new', ...dataWithLongText } as any)

      await dailyReportsApi.createReport(dataWithLongText)

      expect(apiClient.insert).toHaveBeenCalled()
    })

    it('should handle concurrent read operations', async () => {
      const mockReport = { id: 'report-1', project_id: 'proj-1' }
      vi.mocked(apiClient).selectOne.mockResolvedValue(mockReport)

      const reads = await Promise.all([
        dailyReportsApi.getReport('report-1'),
        dailyReportsApi.getReport('report-1'),
        dailyReportsApi.getReport('report-1'),
      ])

      expect(reads).toHaveLength(3)
      expect(apiClient.selectOne).toHaveBeenCalledTimes(3)
    })

    it('should handle database foreign key violations on delete', async () => {
      vi.mocked(apiClient).delete.mockRejectedValue(
        new Error('Foreign key constraint violation')
      )

      await expect(dailyReportsApi.deleteReport('report-1')).rejects.toMatchObject({
        code: 'DELETE_DAILY_REPORT_ERROR',
      })
    })
  })
})