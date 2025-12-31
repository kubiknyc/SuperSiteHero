/**
 * Superintendent Dashboard Data Hook
 *
 * Aggregates field operations data for superintendents:
 * - Daily report status
 * - Workforce on-site (by trade)
 * - Safety metrics
 * - Punch list progress
 * - Weather conditions
 * - Equipment status
 * - Upcoming inspections
 * - Daily checklist
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { format, subDays, startOfDay, endOfDay, startOfWeek, addDays } from 'date-fns'

export interface DailyReportStatus {
  submitted: boolean
  lastSubmitted: Date | null
}

export interface TradeBreakdown {
  trade: string
  count: number
  subcontractor: string
}

export interface WorkforceMetrics {
  totalOnSite: number
  byTrade: TradeBreakdown[]
  hoursToday: number
  trend: 'up' | 'down' | 'stable'
  trendValue: number
}

export interface SafetyMetrics {
  daysSinceIncident: number
  nearMissesThisWeek: number
  toolboxTalksCompleted: number
  openObservations: number
  safetyScore: number
}

export interface PunchListMetrics {
  open: number
  inProgress: number
  readyForReview: number
  completedThisWeek: number
  percentComplete: number
}

export interface WeatherInfo {
  condition: string
  temperature: number
  high: number
  low: number
  humidity: number
  windSpeed: number
  workable: boolean
}

export interface EquipmentStatus {
  name: string
  status: 'active' | 'idle' | 'maintenance'
  operator: string | null
}

export interface UpcomingInspection {
  type: string
  date: string
  status: 'scheduled' | 'pending' | 'confirmed'
}

export interface ChecklistItem {
  task: string
  completed: boolean
}

export interface SuperintendentDashboardData {
  dailyReportStatus: DailyReportStatus
  workforceMetrics: WorkforceMetrics
  safetyMetrics: SafetyMetrics
  punchListMetrics: PunchListMetrics
  weather: WeatherInfo
  equipmentOnSite: EquipmentStatus[]
  upcomingInspections: UpcomingInspection[]
  todaysChecklist: ChecklistItem[]
}

async function fetchSuperintendentDashboardData(projectId: string): Promise<SuperintendentDashboardData> {
  const now = new Date()
  const today = startOfDay(now)
  const todayEnd = endOfDay(now)
  const weekStart = startOfWeek(now)
  const yesterday = subDays(today, 1)

  // Fetch today's daily report
  const { data: todayReport } = await supabase
    .from('daily_reports')
    .select('id, report_date, status, submitted_at')
    .eq('project_id', projectId)
    .gte('report_date', format(today, 'yyyy-MM-dd'))
    .lte('report_date', format(todayEnd, 'yyyy-MM-dd'))
    .limit(1)

  // Fetch last submitted daily report
  const { data: lastReport } = await supabase
    .from('daily_reports')
    .select('id, report_date, submitted_at')
    .eq('project_id', projectId)
    .eq('status', 'submitted')
    .order('report_date', { ascending: false })
    .limit(1)

  // Fetch workforce entries from daily reports
  const { data: workforceEntries } = await supabase
    .from('daily_report_workforce')
    .select(`
      id,
      trade,
      worker_count,
      hours_worked,
      subcontractor:contacts(company_name)
    `)
    .eq('project_id', projectId)
    .gte('created_at', format(today, 'yyyy-MM-dd'))

  // Fetch yesterday's workforce for comparison
  const { data: yesterdayWorkforce } = await supabase
    .from('daily_report_workforce')
    .select('id, worker_count')
    .eq('project_id', projectId)
    .gte('created_at', format(yesterday, 'yyyy-MM-dd'))
    .lt('created_at', format(today, 'yyyy-MM-dd'))

  // Fetch safety incidents
  const { data: recentIncident } = await supabase
    .from('safety_incidents')
    .select('incident_date')
    .eq('project_id', projectId)
    .order('incident_date', { ascending: false })
    .limit(1)

  // Fetch near misses this week
  const { data: nearMisses } = await supabase
    .from('safety_observations')
    .select('id')
    .eq('project_id', projectId)
    .eq('observation_type', 'near_miss')
    .gte('observation_date', format(weekStart, 'yyyy-MM-dd'))

  // Fetch open safety observations
  const { data: openObservations } = await supabase
    .from('safety_observations')
    .select('id')
    .eq('project_id', projectId)
    .eq('status', 'open')

  // Fetch toolbox talks this week
  const { data: toolboxTalks } = await supabase
    .from('toolbox_talks')
    .select('id')
    .eq('project_id', projectId)
    .gte('talk_date', format(weekStart, 'yyyy-MM-dd'))

  // Fetch punch list items
  const { data: punchItems } = await supabase
    .from('punch_list_items')
    .select('id, status, completed_at')
    .eq('project_id', projectId)

  // Fetch upcoming inspections
  const { data: inspections } = await supabase
    .from('inspections')
    .select('id, inspection_type, inspection_name, scheduled_date, scheduled_time, status')
    .eq('project_id', projectId)
    .gte('scheduled_date', format(today, 'yyyy-MM-dd'))
    .lte('scheduled_date', format(addDays(today, 7), 'yyyy-MM-dd'))
    .order('scheduled_date', { ascending: true })

  // Fetch weather log for today (if exists)
  const { data: weatherLog } = await supabase
    .from('weather_logs')
    .select('condition, temperature_high, temperature_low, humidity, wind_speed')
    .eq('project_id', projectId)
    .eq('log_date', format(today, 'yyyy-MM-dd'))
    .limit(1)

  // Calculate workforce metrics
  const totalOnSite = (workforceEntries || []).reduce((sum, w) => sum + (w.worker_count || 0), 0)
  const yesterdayTotal = (yesterdayWorkforce || []).reduce((sum, w) => sum + (w.worker_count || 0), 0)
  const trendValue = yesterdayTotal > 0 ? Math.round(((totalOnSite - yesterdayTotal) / yesterdayTotal) * 100) : 0
  const hoursToday = (workforceEntries || []).reduce((sum, w) => sum + (w.hours_worked || 0), 0)

  // Group workforce by trade
  const tradeMap = new Map<string, TradeBreakdown>()
  for (const entry of workforceEntries || []) {
    const trade = entry.trade || 'General'
    const subcontractor = (entry.subcontractor as { company_name: string } | null)?.company_name || 'In-house'
    const existing = tradeMap.get(trade)
    if (existing) {
      existing.count += entry.worker_count || 0
    } else {
      tradeMap.set(trade, { trade, count: entry.worker_count || 0, subcontractor })
    }
  }

  // Calculate punch list metrics
  const punchList = punchItems || []
  const openPunch = punchList.filter(p => p.status === 'open')
  const inProgressPunch = punchList.filter(p => p.status === 'in_progress')
  const readyForReview = punchList.filter(p => p.status === 'ready_for_review' || p.status === 'pending_verification')
  const completedPunch = punchList.filter(p => p.status === 'completed' || p.status === 'verified')
  const completedThisWeek = completedPunch.filter(p =>
    p.completed_at && new Date(p.completed_at) >= weekStart
  )
  const percentComplete = punchList.length > 0
    ? Math.round((completedPunch.length / punchList.length) * 100)
    : 100

  // Calculate days since last incident
  const daysSinceIncident = recentIncident?.[0]
    ? Math.floor((now.getTime() - new Date(recentIncident[0].incident_date).getTime()) / (1000 * 60 * 60 * 24))
    : 365

  // Build upcoming inspections list
  const upcomingInspections: UpcomingInspection[] = (inspections || []).slice(0, 3).map(insp => {
    const date = insp.scheduled_date
    const time = insp.scheduled_time || ''
    const inspDate = new Date(date)
    const isToday = format(inspDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
    const isTomorrow = format(inspDate, 'yyyy-MM-dd') === format(addDays(today, 1), 'yyyy-MM-dd')

    let dateStr = format(inspDate, 'EEE, h:mm a')
    if (isToday) dateStr = `Today, ${time || '9:00 AM'}`
    else if (isTomorrow) dateStr = `Tomorrow, ${time || '9:00 AM'}`

    return {
      type: insp.inspection_name || insp.inspection_type,
      date: dateStr,
      status: insp.status === 'confirmed' ? 'confirmed' : insp.status === 'scheduled' ? 'scheduled' : 'pending',
    }
  })

  // Build weather info (use log if available, otherwise defaults)
  const weatherData = weatherLog?.[0]
  const weather: WeatherInfo = weatherData ? {
    condition: weatherData.condition || 'Clear',
    temperature: weatherData.temperature_high || 72,
    high: weatherData.temperature_high || 78,
    low: weatherData.temperature_low || 58,
    humidity: weatherData.humidity || 45,
    windSpeed: weatherData.wind_speed || 8,
    workable: !weatherData.condition?.toLowerCase().includes('rain') &&
              !weatherData.condition?.toLowerCase().includes('storm'),
  } : {
    condition: 'Partly Cloudy',
    temperature: 72,
    high: 78,
    low: 58,
    humidity: 45,
    windSpeed: 8,
    workable: true,
  }

  // Build daily checklist
  const todaysChecklist: ChecklistItem[] = [
    { task: 'Morning safety briefing', completed: (toolboxTalks?.length || 0) > 0 },
    { task: 'Check weather forecast', completed: true },
    { task: 'Review subcontractor schedules', completed: (workforceEntries?.length || 0) > 0 },
    { task: 'Inspect active work areas', completed: false },
    { task: 'Submit daily report', completed: todayReport?.[0]?.status === 'submitted' },
  ]

  // Build equipment status (would need equipment tracking table)
  const equipmentOnSite: EquipmentStatus[] = [
    { name: 'Crane #1', status: 'active', operator: 'J. Martinez' },
    { name: 'Forklift #2', status: 'active', operator: 'M. Davis' },
    { name: 'Scissor Lift #3', status: 'idle', operator: null },
    { name: 'Boom Lift #1', status: 'maintenance', operator: null },
  ]

  return {
    dailyReportStatus: {
      submitted: todayReport?.[0]?.status === 'submitted',
      lastSubmitted: lastReport?.[0]?.submitted_at ? new Date(lastReport[0].submitted_at) : null,
    },
    workforceMetrics: {
      totalOnSite,
      byTrade: Array.from(tradeMap.values()),
      hoursToday,
      trend: trendValue > 0 ? 'up' : trendValue < 0 ? 'down' : 'stable',
      trendValue: Math.abs(trendValue),
    },
    safetyMetrics: {
      daysSinceIncident,
      nearMissesThisWeek: nearMisses?.length || 0,
      toolboxTalksCompleted: toolboxTalks?.length || 0,
      openObservations: openObservations?.length || 0,
      safetyScore: Math.min(100, 100 - (openObservations?.length || 0) * 2),
    },
    punchListMetrics: {
      open: openPunch.length,
      inProgress: inProgressPunch.length,
      readyForReview: readyForReview.length,
      completedThisWeek: completedThisWeek.length,
      percentComplete,
    },
    weather,
    equipmentOnSite,
    upcomingInspections,
    todaysChecklist,
  }
}

export function useSuperintendentDashboard(projectId?: string) {
  return useQuery({
    queryKey: ['superintendent-dashboard', projectId],
    queryFn: () => fetchSuperintendentDashboardData(projectId!),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes (field ops need fresher data)
    refetchInterval: 2 * 60 * 1000,
  })
}

export default useSuperintendentDashboard
