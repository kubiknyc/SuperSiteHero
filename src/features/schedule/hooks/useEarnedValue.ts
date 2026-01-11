/**
 * Earned Value Analysis Hook
 *
 * Calculates comprehensive Earned Value Management (EVM) metrics
 * including PV, EV, AC, SPI, CPI, EAC, ETC, VAC, and trends.
 */

import { useMemo } from 'react'
import {
  format,
  parseISO,
  differenceInDays,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  isBefore,
  isAfter,
  startOfDay,
  endOfDay,
  addDays,
} from 'date-fns'
import type { ScheduleActivity } from '@/types/schedule-activities'

// =============================================
// Types
// =============================================

export interface EarnedValueMetrics {
  // Core metrics (in dollars/cost units)
  BAC: number // Budget at Completion
  PV: number // Planned Value (BCWS)
  EV: number // Earned Value (BCWP)
  AC: number // Actual Cost (ACWP)

  // Variances
  SV: number // Schedule Variance (EV - PV)
  CV: number // Cost Variance (EV - AC)
  SVPercent: number // Schedule Variance %
  CVPercent: number // Cost Variance %

  // Performance Indices
  SPI: number // Schedule Performance Index (EV / PV)
  CPI: number // Cost Performance Index (EV / AC)
  CSI: number // Cost Schedule Index (CPI * SPI)

  // Forecasts
  EAC: number // Estimate at Completion
  ETC: number // Estimate to Complete
  VAC: number // Variance at Completion
  TCPI: number // To-Complete Performance Index

  // Progress
  percentComplete: number // Based on EV/BAC
  percentScheduled: number // Based on PV/BAC
  percentSpent: number // Based on AC/BAC
}

export interface EarnedValueDataPoint {
  date: string
  PV: number
  EV: number
  AC: number
  BAC: number
  SPI: number
  CPI: number
}

export interface EarnedValueTrend {
  period: string
  startDate: string
  endDate: string
  PV: number
  EV: number
  AC: number
  SPI: number
  CPI: number
  SPITrend: 'improving' | 'stable' | 'declining'
  CPITrend: 'improving' | 'stable' | 'declining'
}

export interface EarnedValueAnalysis {
  // Current metrics
  current: EarnedValueMetrics

  // Time-phased data
  daily: EarnedValueDataPoint[]
  weekly: EarnedValueDataPoint[]
  monthly: EarnedValueDataPoint[]

  // Trends
  trends: EarnedValueTrend[]
  spiHistory: { date: string; value: number }[]
  cpiHistory: { date: string; value: number }[]

  // Forecast data
  forecastedCompletion: string | null
  forecastedCost: number
  completionVarianceDays: number

  // Status
  scheduleStatus: 'ahead' | 'on_track' | 'behind' | 'critical'
  costStatus: 'under_budget' | 'on_budget' | 'over_budget' | 'critical'
  overallHealth: 'healthy' | 'at_risk' | 'critical'
}

export interface EarnedValueOptions {
  dataDate?: Date
  includeForecasts?: boolean
  groupBy?: 'day' | 'week' | 'month'
  // Cost estimation method when no cost data
  useLaborHoursAsCost?: boolean
  defaultHourlyRate?: number
}

// =============================================
// Helper Functions
// =============================================

function calculateMetricsAtDate(
  activities: ScheduleActivity[],
  targetDate: Date,
  _options: EarnedValueOptions
): { pv: number; ev: number; ac: number; bac: number } {
  let pv = 0 // Planned Value
  let ev = 0 // Earned Value
  let ac = 0 // Actual Cost
  let bac = 0 // Budget at Completion

  const targetDateStr = format(targetDate, 'yyyy-MM-dd')

  activities.forEach((activity) => {
    // Get budget for this activity
    const budget = activity.budgeted_cost || 0
    bac += budget

    if (!activity.planned_start || !activity.planned_finish) {return}

    const plannedStart = parseISO(activity.planned_start)
    const plannedFinish = parseISO(activity.planned_finish)
    const duration = Math.max(1, differenceInDays(plannedFinish, plannedStart) + 1)

    // Calculate PV (planned value to date based on schedule)
    if (isBefore(plannedFinish, targetDate) || format(plannedFinish, 'yyyy-MM-dd') === targetDateStr) {
      // Activity should be 100% complete by target date
      pv += budget
    } else if (isBefore(plannedStart, targetDate) || format(plannedStart, 'yyyy-MM-dd') === targetDateStr) {
      // Activity is partially planned by target date
      const daysElapsed = differenceInDays(targetDate, plannedStart) + 1
      const plannedPercent = Math.min(1, daysElapsed / duration)
      pv += budget * plannedPercent
    }

    // Calculate EV (earned value based on actual progress)
    const percentComplete = activity.percent_complete / 100
    ev += budget * percentComplete

    // Calculate AC (actual cost)
    ac += activity.actual_cost || 0
  })

  return { pv, ev, ac, bac }
}

function calculateEVMetrics(pv: number, ev: number, ac: number, bac: number): EarnedValueMetrics {
  // Avoid division by zero
  const safePV = pv || 0.001
  const safeAC = ac || 0.001
  const safeBAC = bac || 0.001

  // Variances
  const SV = ev - pv
  const CV = ev - ac
  const SVPercent = pv > 0 ? (SV / pv) * 100 : 0
  const CVPercent = ev > 0 ? (CV / ev) * 100 : 0

  // Performance Indices
  const SPI = pv > 0 ? ev / safePV : 1
  const CPI = ac > 0 ? ev / safeAC : 1
  const CSI = SPI * CPI

  // Forecasts
  // EAC using CPI method: BAC / CPI
  const EAC = CPI > 0 ? bac / CPI : bac
  const ETC = EAC - ac
  const VAC = bac - EAC

  // TCPI: To-Complete Performance Index
  // TCPI = (BAC - EV) / (BAC - AC) for BAC-based
  const remainingWork = bac - ev
  const remainingBudget = bac - ac
  const TCPI = remainingBudget > 0 ? remainingWork / remainingBudget : 1

  // Progress percentages
  const percentComplete = bac > 0 ? (ev / bac) * 100 : 0
  const percentScheduled = bac > 0 ? (pv / bac) * 100 : 0
  const percentSpent = bac > 0 ? (ac / bac) * 100 : 0

  return {
    BAC: bac,
    PV: pv,
    EV: ev,
    AC: ac,
    SV,
    CV,
    SVPercent,
    CVPercent,
    SPI,
    CPI,
    CSI,
    EAC,
    ETC,
    VAC,
    TCPI,
    percentComplete,
    percentScheduled,
    percentSpent,
  }
}

function getScheduleStatus(spi: number): 'ahead' | 'on_track' | 'behind' | 'critical' {
  if (spi >= 1.05) {return 'ahead'}
  if (spi >= 0.95) {return 'on_track'}
  if (spi >= 0.80) {return 'behind'}
  return 'critical'
}

function getCostStatus(cpi: number): 'under_budget' | 'on_budget' | 'over_budget' | 'critical' {
  if (cpi >= 1.05) {return 'under_budget'}
  if (cpi >= 0.95) {return 'on_budget'}
  if (cpi >= 0.80) {return 'over_budget'}
  return 'critical'
}

function getOverallHealth(spi: number, cpi: number): 'healthy' | 'at_risk' | 'critical' {
  const csi = spi * cpi
  if (csi >= 0.9) {return 'healthy'}
  if (csi >= 0.7) {return 'at_risk'}
  return 'critical'
}

function determineTrend(
  current: number,
  previous: number
): 'improving' | 'stable' | 'declining' {
  const change = current - previous
  if (Math.abs(change) < 0.02) {return 'stable'}
  return change > 0 ? 'improving' : 'declining'
}

// =============================================
// Hook
// =============================================

export function useEarnedValue(
  activities: ScheduleActivity[],
  options: EarnedValueOptions = {}
): EarnedValueAnalysis {
  const {
    dataDate = new Date(),
    includeForecasts = true,
    groupBy = 'week',
  } = options

  return useMemo(() => {
    if (activities.length === 0) {
      return {
        current: calculateEVMetrics(0, 0, 0, 0),
        daily: [],
        weekly: [],
        monthly: [],
        trends: [],
        spiHistory: [],
        cpiHistory: [],
        forecastedCompletion: null,
        forecastedCost: 0,
        completionVarianceDays: 0,
        scheduleStatus: 'on_track',
        costStatus: 'on_budget',
        overallHealth: 'healthy',
      }
    }

    // Determine date range
    const starts = activities
      .filter((a) => a.planned_start)
      .map((a) => parseISO(a.planned_start!))
    const ends = activities
      .filter((a) => a.planned_finish)
      .map((a) => parseISO(a.planned_finish!))

    if (starts.length === 0 || ends.length === 0) {
      return {
        current: calculateEVMetrics(0, 0, 0, 0),
        daily: [],
        weekly: [],
        monthly: [],
        trends: [],
        spiHistory: [],
        cpiHistory: [],
        forecastedCompletion: null,
        forecastedCost: 0,
        completionVarianceDays: 0,
        scheduleStatus: 'on_track',
        costStatus: 'on_budget',
        overallHealth: 'healthy',
      }
    }

    const projectStart = new Date(Math.min(...starts.map((d) => d.getTime())))
    const projectEnd = new Date(Math.max(...ends.map((d) => d.getTime())))
    const effectiveDataDate = isBefore(dataDate, projectEnd) ? dataDate : projectEnd

    // Calculate current metrics
    const currentValues = calculateMetricsAtDate(activities, effectiveDataDate, options)
    const currentMetrics = calculateEVMetrics(
      currentValues.pv,
      currentValues.ev,
      currentValues.ac,
      currentValues.bac
    )

    // Generate time-phased data
    const daily: EarnedValueDataPoint[] = []
    const weekly: EarnedValueDataPoint[] = []
    const monthly: EarnedValueDataPoint[] = []
    const spiHistory: { date: string; value: number }[] = []
    const cpiHistory: { date: string; value: number }[] = []

    // Daily data (limited to last 90 days for performance)
    const dailyStart = isBefore(addDays(effectiveDataDate, -90), projectStart)
      ? projectStart
      : addDays(effectiveDataDate, -90)
    const dailyDates = eachDayOfInterval({
      start: startOfDay(dailyStart),
      end: endOfDay(effectiveDataDate),
    })

    dailyDates.forEach((date) => {
      const values = calculateMetricsAtDate(activities, date, options)
      const metrics = calculateEVMetrics(values.pv, values.ev, values.ac, values.bac)
      const dateStr = format(date, 'yyyy-MM-dd')

      daily.push({
        date: dateStr,
        PV: values.pv,
        EV: values.ev,
        AC: values.ac,
        BAC: values.bac,
        SPI: metrics.SPI,
        CPI: metrics.CPI,
      })

      spiHistory.push({ date: dateStr, value: metrics.SPI })
      cpiHistory.push({ date: dateStr, value: metrics.CPI })
    })

    // Weekly data
    const weeklyDates = eachWeekOfInterval({
      start: projectStart,
      end: effectiveDataDate,
    })

    weeklyDates.forEach((date) => {
      const values = calculateMetricsAtDate(activities, date, options)
      const metrics = calculateEVMetrics(values.pv, values.ev, values.ac, values.bac)

      weekly.push({
        date: format(date, 'yyyy-MM-dd'),
        PV: values.pv,
        EV: values.ev,
        AC: values.ac,
        BAC: values.bac,
        SPI: metrics.SPI,
        CPI: metrics.CPI,
      })
    })

    // Monthly data
    const monthlyDates = eachMonthOfInterval({
      start: projectStart,
      end: effectiveDataDate,
    })

    monthlyDates.forEach((date) => {
      const values = calculateMetricsAtDate(activities, date, options)
      const metrics = calculateEVMetrics(values.pv, values.ev, values.ac, values.bac)

      monthly.push({
        date: format(date, 'yyyy-MM'),
        PV: values.pv,
        EV: values.ev,
        AC: values.ac,
        BAC: values.bac,
        SPI: metrics.SPI,
        CPI: metrics.CPI,
      })
    })

    // Calculate trends (last 4 periods based on groupBy)
    const trends: EarnedValueTrend[] = []
    const sourceData = groupBy === 'day' ? daily : groupBy === 'week' ? weekly : monthly
    const lastPeriods = sourceData.slice(-5)

    for (let i = 1; i < lastPeriods.length; i++) {
      const current = lastPeriods[i]
      const previous = lastPeriods[i - 1]

      trends.push({
        period: groupBy === 'month' ? format(parseISO(current.date + '-01'), 'MMM yyyy') : current.date,
        startDate: previous.date,
        endDate: current.date,
        PV: current.PV,
        EV: current.EV,
        AC: current.AC,
        SPI: current.SPI,
        CPI: current.CPI,
        SPITrend: determineTrend(current.SPI, previous.SPI),
        CPITrend: determineTrend(current.CPI, previous.CPI),
      })
    }

    // Calculate forecasts
    let forecastedCompletion: string | null = null
    let completionVarianceDays = 0

    if (includeForecasts && currentMetrics.SPI > 0) {
      // Calculate forecasted completion date
      // Remaining duration = (BAC - EV) / (EV rate * SPI)
      const originalDuration = differenceInDays(projectEnd, projectStart)
      const elapsedDays = differenceInDays(effectiveDataDate, projectStart)
      const remainingDuration = (originalDuration - elapsedDays) / currentMetrics.SPI
      const forecastedEndDate = addDays(effectiveDataDate, Math.ceil(remainingDuration))

      forecastedCompletion = format(forecastedEndDate, 'yyyy-MM-dd')
      completionVarianceDays = differenceInDays(forecastedEndDate, projectEnd)
    }

    return {
      current: currentMetrics,
      daily,
      weekly,
      monthly,
      trends,
      spiHistory,
      cpiHistory,
      forecastedCompletion,
      forecastedCost: currentMetrics.EAC,
      completionVarianceDays,
      scheduleStatus: getScheduleStatus(currentMetrics.SPI),
      costStatus: getCostStatus(currentMetrics.CPI),
      overallHealth: getOverallHealth(currentMetrics.SPI, currentMetrics.CPI),
    }
  }, [activities, dataDate, includeForecasts, groupBy, options])
}

export default useEarnedValue
