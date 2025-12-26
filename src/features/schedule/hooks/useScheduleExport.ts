/**
 * Schedule Export Hook
 *
 * React Query hook for exporting schedule data to MS Project XML,
 * Primavera P6 XER, or CSV format.
 *
 * Includes rate limiting (10 exports per hour) for --safe mode.
 */

import { useState, useCallback, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import {
  exportSchedule,
  downloadExport,
  validateExportOptions,
  estimateExportSize,
  MAX_EXPORT_ACTIVITIES,
  type ExportOptions,
  type ExportResult,
  type ExportError,
} from '../utils/scheduleExport'
import type {
  ScheduleActivity,
  ScheduleDependency,
} from '@/types/schedule-activities'
import { logger } from '../../../lib/utils/logger';


// =============================================
// Types
// =============================================

export interface UseScheduleExportOptions {
  projectId: string
  projectName?: string
  projectNumber?: string
}

export interface ExportState {
  isExporting: boolean
  progress: number
  currentStep: string
  error: ExportError | null
  result: ExportResult | null
}

// Rate limiting: 10 exports per hour per user
const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour

// =============================================
// Rate Limiting
// =============================================

interface RateLimitEntry {
  userId: string
  timestamps: number[]
}

// In-memory rate limit tracking (per session)
const rateLimitStore = new Map<string, number[]>()

function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetAt: Date } {
  const now = Date.now()
  const windowStart = now - RATE_LIMIT_WINDOW_MS

  // Get existing timestamps for user
  let timestamps = rateLimitStore.get(userId) || []

  // Filter to only timestamps within the window
  timestamps = timestamps.filter((ts) => ts > windowStart)

  // Update store
  rateLimitStore.set(userId, timestamps)

  const allowed = timestamps.length < RATE_LIMIT_MAX
  const remaining = Math.max(0, RATE_LIMIT_MAX - timestamps.length)

  // Calculate reset time (when the oldest timestamp will expire)
  const oldestTimestamp = timestamps.length > 0 ? Math.min(...timestamps) : now
  const resetAt = new Date(oldestTimestamp + RATE_LIMIT_WINDOW_MS)

  return { allowed, remaining, resetAt }
}

function recordExport(userId: string): void {
  const now = Date.now()
  const timestamps = rateLimitStore.get(userId) || []
  timestamps.push(now)
  rateLimitStore.set(userId, timestamps)
}

// =============================================
// Hook Implementation
// =============================================

export function useScheduleExport({ projectId, projectName, projectNumber }: UseScheduleExportOptions) {
  const { userProfile } = useAuth()
  const queryClient = useQueryClient()

  // State
  const [state, setState] = useState<ExportState>({
    isExporting: false,
    progress: 0,
    currentStep: '',
    error: null,
    result: null,
  })

  // Abort controller for cancellation
  const abortControllerRef = useRef<AbortController | null>(null)

  /**
   * Fetch activities and dependencies for export
   */
  const fetchScheduleData = useCallback(async (): Promise<{
    activities: ScheduleActivity[]
    dependencies: ScheduleDependency[]
  }> => {
    setState((prev) => ({
      ...prev,
      progress: 10,
      currentStep: 'Fetching schedule data...',
    }))

    // Fetch activities
    const { data: activities, error: actError } = await supabase
      .from('schedule_activities')
      .select('*')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })

    if (actError) {
      throw new Error(`Failed to fetch activities: ${actError.message}`)
    }

    setState((prev) => ({
      ...prev,
      progress: 30,
      currentStep: 'Fetching dependencies...',
    }))

    // Fetch dependencies
    const { data: dependencies, error: depError } = await supabase
      .from('schedule_dependencies')
      .select('*')
      .eq('project_id', projectId)

    if (depError) {
      throw new Error(`Failed to fetch dependencies: ${depError.message}`)
    }

    return {
      activities: activities || [],
      dependencies: dependencies || [],
    }
  }, [projectId])

  /**
   * Validate user has access to project (--safe flag)
   */
  const validateProjectAccess = useCallback(async (): Promise<boolean> => {
    if (!userProfile?.company_id) {
      throw new Error('User company not found')
    }

    const { data: project, error } = await supabase
      .from('projects')
      .select('id, company_id')
      .eq('id', projectId)
      .single()

    if (error || !project) {
      throw new Error('Project not found or access denied')
    }

    if (project.company_id !== userProfile.company_id) {
      throw new Error('Access denied: You do not have permission to export this project')
    }

    return true
  }, [projectId, userProfile?.company_id])

  /**
   * Log export for audit trail
   */
  const logExport = useCallback(
    async (
      format: ExportOptions['format'],
      activityCount: number,
      success: boolean,
      errorMessage?: string
    ) => {
      try {
        await supabase.from('schedule_import_logs').insert({
          project_id: projectId,
          file_name: `export_${format}`,
          file_type: format === 'ms_project_xml' ? 'xml' : format === 'primavera_xer' ? 'xer' : 'csv',
          source_system: 'export',
          activities_imported: activityCount,
          status: success ? 'completed' : 'failed',
          errors: errorMessage ? [errorMessage] : null,
          imported_by: userProfile?.id,
        })
      } catch (e) {
        // Log failure shouldn't block the export
        logger.error('Failed to log export:', e)
      }
    },
    [projectId, userProfile?.id]
  )

  /**
   * Main export function
   */
  const performExport = useCallback(
    async (options: ExportOptions): Promise<ExportResult> => {
      // Reset state
      setState({
        isExporting: true,
        progress: 0,
        currentStep: 'Initializing export...',
        error: null,
        result: null,
      })

      // Create abort controller
      abortControllerRef.current = new AbortController()

      try {
        // Check rate limit (--safe flag)
        if (userProfile?.id) {
          const rateLimit = checkRateLimit(userProfile.id)
          if (!rateLimit.allowed) {
            throw new Error(
              `Rate limit exceeded. You can export ${RATE_LIMIT_MAX} times per hour. ` +
                `Please try again after ${rateLimit.resetAt.toLocaleTimeString()}.`
            )
          }
        }

        setState((prev) => ({
          ...prev,
          progress: 5,
          currentStep: 'Validating access...',
        }))

        // Validate access (--safe flag)
        await validateProjectAccess()

        // Validate options
        const validationError = validateExportOptions(options)
        if (validationError) {
          throw new Error(`${validationError.message}: ${validationError.details}`)
        }

        // Fetch data
        const { activities, dependencies } = await fetchScheduleData()

        // Check abort
        if (abortControllerRef.current?.signal.aborted) {
          throw new Error('Export cancelled')
        }

        // Validate activity count (--safe flag)
        if (activities.length > MAX_EXPORT_ACTIVITIES) {
          throw new Error(
            `Cannot export more than ${MAX_EXPORT_ACTIVITIES} activities. ` +
              `This project has ${activities.length} activities. Please apply date filters to reduce the export size.`
          )
        }

        setState((prev) => ({
          ...prev,
          progress: 50,
          currentStep: `Generating ${options.format.replace('_', ' ')} file...`,
        }))

        // Generate export
        const result = exportSchedule(
          projectId,
          activities,
          dependencies,
          {
            ...options,
            projectName: projectName || options.projectName,
            projectNumber: projectNumber || options.projectNumber,
          }
        )

        // Check abort
        if (abortControllerRef.current?.signal.aborted) {
          throw new Error('Export cancelled')
        }

        setState((prev) => ({
          ...prev,
          progress: 80,
          currentStep: 'Preparing download...',
        }))

        // Record rate limit
        if (userProfile?.id) {
          recordExport(userProfile.id)
        }

        // Log successful export
        await logExport(options.format, result.activityCount, true)

        setState((prev) => ({
          ...prev,
          progress: 100,
          currentStep: 'Export complete!',
          result,
        }))

        return result
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        // Log failed export
        await logExport(options.format, 0, false, errorMessage)

        setState((prev) => ({
          ...prev,
          isExporting: false,
          error: {
            message: 'Export failed',
            details: errorMessage,
          },
        }))

        throw error
      } finally {
        abortControllerRef.current = null
      }
    },
    [projectId, projectName, projectNumber, userProfile?.id, validateProjectAccess, fetchScheduleData, logExport]
  )

  /**
   * Export and download
   */
  const exportAndDownload = useCallback(
    async (options: ExportOptions): Promise<void> => {
      try {
        const result = await performExport(options)
        downloadExport(result)

        setState((prev) => ({
          ...prev,
          isExporting: false,
        }))

        toast.success(
          `Successfully exported ${result.activityCount} activities${
            result.dependencyCount > 0 ? ` with ${result.dependencyCount} dependencies` : ''
          }`
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Export failed'
        toast.error(message)

        setState((prev) => ({
          ...prev,
          isExporting: false,
        }))
      }
    },
    [performExport]
  )

  /**
   * Cancel export
   */
  const cancelExport = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setState((prev) => ({
      ...prev,
      isExporting: false,
      currentStep: 'Export cancelled',
    }))
  }, [])

  /**
   * Reset state
   */
  const resetState = useCallback(() => {
    setState({
      isExporting: false,
      progress: 0,
      currentStep: '',
      error: null,
      result: null,
    })
  }, [])

  /**
   * Get rate limit status
   */
  const getRateLimitStatus = useCallback(() => {
    if (!userProfile?.id) {
      return { allowed: true, remaining: RATE_LIMIT_MAX, resetAt: new Date() }
    }
    return checkRateLimit(userProfile.id)
  }, [userProfile?.id])

  return {
    // State
    isExporting: state.isExporting,
    progress: state.progress,
    currentStep: state.currentStep,
    error: state.error,
    result: state.result,

    // Actions
    exportAndDownload,
    performExport,
    cancelExport,
    resetState,

    // Utilities
    getRateLimitStatus,
    estimateExportSize,
    validateExportOptions,
  }
}

// =============================================
// Export Mutation Hook (Alternative API)
// =============================================

export function useExportScheduleMutation() {
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      projectId,
      activities,
      dependencies,
      options,
    }: {
      projectId: string
      activities: ScheduleActivity[]
      dependencies: ScheduleDependency[]
      options: ExportOptions
    }) => {
      // Check rate limit
      if (userProfile?.id) {
        const rateLimit = checkRateLimit(userProfile.id)
        if (!rateLimit.allowed) {
          throw new Error(`Rate limit exceeded. Try again after ${rateLimit.resetAt.toLocaleTimeString()}`)
        }
        recordExport(userProfile.id)
      }

      const result = exportSchedule(projectId, activities, dependencies, options)
      downloadExport(result)
      return result
    },
    onSuccess: (result) => {
      toast.success(`Exported ${result.activityCount} activities`)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Export failed')
    },
  })
}

// =============================================
// Export Types (re-export)
// =============================================

export type { ExportOptions, ExportResult, ExportError }
