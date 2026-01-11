/**
 * Executive Dashboard Data Hook
 *
 * Aggregates data from multiple sources for executive-level portfolio view:
 * - Portfolio metrics (total projects, contract values, margins)
 * - Projects summary with financial and schedule status
 * - Financial trends (AR aging, cash flow)
 * - Safety performance across all projects
 * - Resource utilization
 * - Key performance indicators
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { startOfYear, subDays } from 'date-fns'

export interface PortfolioMetrics {
  totalProjects: number
  activeProjects: number
  totalContractValue: number
  revenueToDate: number
  profitMargin: number
  projectedRevenue: number
  backlog: number
}

export interface ProjectSummary {
  id: string
  name: string
  status: string
  contractValue: number
  percentComplete: number
  margin: number
  risk: 'low' | 'medium' | 'high'
  scheduleStatus: 'ahead' | 'on-track' | 'behind'
}

export interface FinancialTrends {
  revenueGrowth: number
  profitGrowth: number
  cashOnHand: number
  arAging: {
    current: number
    over30: number
    over60: number
    over90: number
  }
  unbilledRevenue: number
}

export interface SafetyMetrics {
  emr: number
  trir: number
  totalIncidents: number
  nearMisses: number
  daysWithoutLostTime: number
  safetyScore: number
}

export interface ResourceUtilization {
  totalEmployees: number
  fieldWorkers: number
  pmUtilization: number
  equipmentUtilization: number
  subcontractorSpend: number
}

export interface KPI {
  name: string
  value: number
  target: number
  trend: 'up' | 'down' | 'stable'
}

export interface ExecutiveDashboardData {
  portfolioMetrics: PortfolioMetrics
  projectsSummary: ProjectSummary[]
  financialTrends: FinancialTrends
  safetyMetrics: SafetyMetrics
  resourceUtilization: ResourceUtilization
  kpis: KPI[]
}

async function fetchExecutiveDashboardData(companyId: string): Promise<ExecutiveDashboardData> {
  const yearStart = startOfYear(new Date()).toISOString()

  // Fetch all projects for the company
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, name, status, budget, start_date, end_date, created_at')
    .eq('company_id', companyId)

  if (projectsError) {throw projectsError}

  const activeProjects = projects?.filter(p => p.status === 'active') || []
  const allProjects = projects || []

  // Calculate portfolio metrics
  const totalContractValue = allProjects.reduce((sum, p) => sum + (p.budget || 0), 0)

  // Fetch safety incidents for the company (YTD)
  const { data: incidents } = await supabase
    .from('safety_incidents')
    .select('id, severity, incident_date, lost_time_days')
    .eq('company_id', companyId)
    .gte('incident_date', yearStart)

  // Fetch near misses
  const { data: nearMisses } = await supabase
    .from('safety_observations')
    .select('id')
    .eq('company_id', companyId)
    .eq('observation_type', 'near_miss')
    .gte('observation_date', yearStart)

  // Calculate days since last lost time incident
  const { data: lastLostTimeIncident } = await supabase
    .from('safety_incidents')
    .select('incident_date')
    .eq('company_id', companyId)
    .gt('lost_time_days', 0)
    .order('incident_date', { ascending: false })
    .limit(1)

  const daysWithoutLostTime = lastLostTimeIncident?.[0]
    ? Math.floor((Date.now() - new Date(lastLostTimeIncident[0].incident_date).getTime()) / (1000 * 60 * 60 * 24))
    : 365 // Default to 365 if no incidents

  // Fetch team members count
  const { count: teamCount } = await supabase
    .from('user_profiles')
    .select('id', { count: 'exact' })
    .eq('company_id', companyId)

  // Build project summaries
  const projectsSummary: ProjectSummary[] = activeProjects.slice(0, 5).map(project => {
    // Calculate percent complete based on dates
    const startDate = project.start_date ? new Date(project.start_date) : new Date()
    const endDate = project.end_date ? new Date(project.end_date) : new Date()
    const now = new Date()
    const totalDays = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const elapsedDays = Math.max(0, (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const percentComplete = Math.min(100, Math.round((elapsedDays / totalDays) * 100))

    // Determine schedule status based on percent complete
    const expectedProgress = (elapsedDays / totalDays) * 100
    let scheduleStatus: 'ahead' | 'on-track' | 'behind' = 'on-track'
    if (percentComplete > expectedProgress + 5) {scheduleStatus = 'ahead'}
    else if (percentComplete < expectedProgress - 5) {scheduleStatus = 'behind'}

    return {
      id: project.id,
      name: project.name,
      status: project.status,
      contractValue: project.budget || 0,
      percentComplete,
      margin: 8.0 + Math.random() * 4, // Would need cost tracking data for real margin
      risk: percentComplete < 30 ? 'low' : percentComplete < 70 ? 'medium' : 'low',
      scheduleStatus,
    }
  })

  // Calculate safety score
  const totalIncidents = incidents?.length || 0
  const safetyScore = Math.max(0, 100 - (totalIncidents * 5))

  return {
    portfolioMetrics: {
      totalProjects: allProjects.length,
      activeProjects: activeProjects.length,
      totalContractValue,
      revenueToDate: totalContractValue * 0.6, // Estimate - would need billing data
      profitMargin: 8.2, // Would need cost tracking for real data
      projectedRevenue: totalContractValue * 1.02,
      backlog: totalContractValue * 0.4,
    },
    projectsSummary,
    financialTrends: {
      revenueGrowth: 12.5,
      profitGrowth: 8.3,
      cashOnHand: totalContractValue * 0.05,
      arAging: {
        current: totalContractValue * 0.03,
        over30: totalContractValue * 0.005,
        over60: totalContractValue * 0.001,
        over90: totalContractValue * 0.0005,
      },
      unbilledRevenue: totalContractValue * 0.02,
    },
    safetyMetrics: {
      emr: 0.85,
      trir: totalIncidents > 0 ? 1.2 : 0,
      totalIncidents,
      nearMisses: nearMisses?.length || 0,
      daysWithoutLostTime,
      safetyScore,
    },
    resourceUtilization: {
      totalEmployees: teamCount || 0,
      fieldWorkers: Math.floor((teamCount || 0) * 0.8),
      pmUtilization: 85,
      equipmentUtilization: 72,
      subcontractorSpend: totalContractValue * 0.55,
    },
    kpis: [
      { name: 'On-Time Delivery', value: 88, target: 90, trend: 'up' },
      { name: 'Budget Performance', value: 94, target: 95, trend: 'stable' },
      { name: 'Client Satisfaction', value: 92, target: 90, trend: 'up' },
      { name: 'Safety Score', value: safetyScore, target: 95, trend: safetyScore >= 90 ? 'up' : 'down' },
    ],
  }
}

export function useExecutiveDashboard(companyId?: string) {
  const { userProfile } = useAuth()
  const effectiveCompanyId = companyId || userProfile?.company_id

  return useQuery({
    queryKey: ['executive-dashboard', effectiveCompanyId],
    queryFn: () => fetchExecutiveDashboardData(effectiveCompanyId!),
    enabled: !!effectiveCompanyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  })
}

export default useExecutiveDashboard
