/**
 * Daily Reports API Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { dailyReportsApi } from './daily-reports'
import { apiClient } from '../client'

vi.mock('../client', () => ({
  apiClient: {
    select: vi.fn(),
    selectOne: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

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

    it('should create a new daily report', async () => {
      vi.mocked(apiClient).insert.mockResolvedValue(createdReport)

      const result = await dailyReportsApi.createReport(createInput)

      expect(result.id).toBe('report-new')
      expect(apiClient.insert).toHaveBeenCalledWith('daily_reports', expect.objectContaining({
        project_id: createInput.project_id,
        report_date: createInput.report_date,
        reporter_id: createInput.reporter_id,
      }))
    })

    it('should validate input data before creating', async () => {
      const invalidInput = {
        project_id: '',  // Invalid: empty project_id
        report_date: '2025-01-27',
        reporter_id: 'user-1',
        status: 'draft' as const,
      }

      await expect(dailyReportsApi.createReport(invalidInput as any)).rejects.toThrow()
    })
  })

  describe('updateReport', () => {
    it('should update a daily report', async () => {
      const updatedReport = {
        id: 'report-1',
        project_id: 'proj-1',
        report_date: '2025-01-27',
        status: 'submitted' as const,
        weather_condition: 'cloudy',
      }

      vi.mocked(apiClient).update.mockResolvedValue(updatedReport)

      const result = await dailyReportsApi.updateReport('report-1', {
        weather_condition: 'cloudy',
      })

      expect(result.weather_condition).toBe('cloudy')
      expect(apiClient.update).toHaveBeenCalledWith('daily_reports', 'report-1', expect.objectContaining({
        weather_condition: 'cloudy'
      }))
    })

    it('should throw error for missing report ID', async () => {
      await expect(dailyReportsApi.updateReport('', {})).rejects.toThrow(
        'Report ID is required'
      )
    })

    it('should validate update data', async () => {
      const invalidUpdate = {
        project_id: '',  // Invalid: can't update to empty project_id
      }

      await expect(
        dailyReportsApi.updateReport('report-1', invalidUpdate as any)
      ).rejects.toThrow()
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
        rejection_reason: 'Incomplete weather data',
      }

      vi.mocked(apiClient).update.mockResolvedValue(rejectedReport)

      const result = await dailyReportsApi.rejectReport('report-1', 'Incomplete weather data')

      expect(result.status).toBe('rejected')
      expect(result.rejection_reason).toBe('Incomplete weather data')
      expect(apiClient.update).toHaveBeenCalledWith('daily_reports', 'report-1',
        expect.objectContaining({
          status: 'rejected',
          rejection_reason: 'Incomplete weather data',
        })
      )
    })
  })
})