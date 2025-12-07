// Hook to detect duplicate daily reports
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface DuplicateCheckResult {
  hasDuplicate: boolean
  existingReport?: {
    id: string
    report_number?: string | null
    status: string | null
    created_at: string | null
  }
}

async function checkForDuplicateReport(
  projectId: string,
  reportDate: string
): Promise<DuplicateCheckResult> {
  const { data, error } = await supabase
    .from('daily_reports')
    .select('id, report_number, status, created_at')
    .eq('project_id', projectId)
    .eq('report_date', reportDate)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned (which is fine)
    console.error('Error checking for duplicate:', error)
  }

  if (data) {
    return {
      hasDuplicate: true,
      existingReport: {
        id: data.id,
        report_number: data.report_number || undefined,
        status: data.status,
        created_at: data.created_at,
      },
    }
  }

  return { hasDuplicate: false }
}

export function useDuplicateDetection(projectId?: string, reportDate?: string) {
  return useQuery({
    queryKey: ['duplicate-check', projectId, reportDate],
    queryFn: () => checkForDuplicateReport(projectId!, reportDate!),
    enabled: !!projectId && !!reportDate,
    staleTime: 30000, // 30 seconds
  })
}

// Helper to format the duplicate warning message
export function getDuplicateWarningMessage(result: DuplicateCheckResult): string | null {
  if (!result.hasDuplicate || !result.existingReport) {
    return null
  }

  const { existingReport } = result
  const reportRef = existingReport.report_number || existingReport.id.slice(0, 8)

  return `A report already exists for this date (${reportRef}, status: ${existingReport.status}). Creating a new report may result in duplicate data.`
}
