// File: /src/lib/ml/utils/feature-engineering.ts
// Feature engineering utilities for ML models

import type { ProjectSnapshot, NormalizationParams } from '@/types/analytics'
import { logger } from '@/lib/utils/logger'

/**
 * Feature definitions for budget overrun prediction model
 */
export const BUDGET_FEATURES = [
  'percent_complete',
  'days_since_start_normalized',
  'approved_co_ratio',
  'pending_co_ratio',
  'open_change_orders',
  'avg_co_approval_days',
  'cost_burn_rate',
  'schedule_variance_normalized',
  'weather_delay_days',
  'open_rfis',
] as const

/**
 * Feature definitions for schedule delay prediction model
 */
export const SCHEDULE_FEATURES = [
  'percent_complete',
  'baseline_variance_normalized',
  'critical_path_tasks_behind',
  'open_rfis_ratio',
  'avg_rfi_response_days',
  'weather_delay_days',
  'workforce_ratio',
  'open_submittals',
  'tasks_on_critical_path',
  'co_schedule_impact',
] as const

/**
 * Default normalization parameters (should be updated with actual training data)
 */
export const DEFAULT_NORMALIZATION_PARAMS: NormalizationParams = {
  means: {
    percent_complete: 50,
    days_since_start_normalized: 0.5,
    approved_co_ratio: 5,
    pending_co_ratio: 2,
    open_change_orders: 10,
    avg_co_approval_days: 14,
    cost_burn_rate: 0.5,
    schedule_variance_normalized: 0,
    weather_delay_days: 2,
    open_rfis: 15,
    baseline_variance_normalized: 0,
    critical_path_tasks_behind: 2,
    open_rfis_ratio: 0.3,
    avg_rfi_response_days: 7,
    workforce_ratio: 1,
    open_submittals: 10,
    tasks_on_critical_path: 5,
    co_schedule_impact: 5,
  },
  stds: {
    percent_complete: 30,
    days_since_start_normalized: 0.3,
    approved_co_ratio: 5,
    pending_co_ratio: 3,
    open_change_orders: 10,
    avg_co_approval_days: 10,
    cost_burn_rate: 0.3,
    schedule_variance_normalized: 20,
    weather_delay_days: 5,
    open_rfis: 20,
    baseline_variance_normalized: 15,
    critical_path_tasks_behind: 3,
    open_rfis_ratio: 0.2,
    avg_rfi_response_days: 5,
    workforce_ratio: 0.3,
    open_submittals: 15,
    tasks_on_critical_path: 5,
    co_schedule_impact: 10,
  },
  mins: {
    percent_complete: 0,
    days_since_start_normalized: 0,
    approved_co_ratio: 0,
    pending_co_ratio: 0,
    open_change_orders: 0,
    avg_co_approval_days: 0,
    cost_burn_rate: 0,
    schedule_variance_normalized: -60,
    weather_delay_days: 0,
    open_rfis: 0,
    baseline_variance_normalized: -30,
    critical_path_tasks_behind: 0,
    open_rfis_ratio: 0,
    avg_rfi_response_days: 0,
    workforce_ratio: 0,
    open_submittals: 0,
    tasks_on_critical_path: 0,
    co_schedule_impact: 0,
  },
  maxs: {
    percent_complete: 100,
    days_since_start_normalized: 1,
    approved_co_ratio: 30,
    pending_co_ratio: 20,
    open_change_orders: 50,
    avg_co_approval_days: 60,
    cost_burn_rate: 2,
    schedule_variance_normalized: 60,
    weather_delay_days: 30,
    open_rfis: 100,
    baseline_variance_normalized: 60,
    critical_path_tasks_behind: 20,
    open_rfis_ratio: 1,
    avg_rfi_response_days: 30,
    workforce_ratio: 2,
    open_submittals: 50,
    tasks_on_critical_path: 30,
    co_schedule_impact: 60,
  },
}

/**
 * Extract budget features from a project snapshot
 */
export function extractBudgetFeatures(
  snapshot: ProjectSnapshot,
  projectDurationDays: number = 365
): Record<string, number> {
  const budget = snapshot.budget || 1 // Avoid division by zero
  const _contractValue = snapshot.contract_value || budget

  // Calculate days since start
  const startDate = snapshot.planned_start_date
    ? new Date(snapshot.planned_start_date)
    : new Date()
  const snapshotDate = new Date(snapshot.snapshot_date)
  const daysSinceStart = Math.max(
    0,
    Math.floor((snapshotDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  )

  return {
    percent_complete: snapshot.overall_percent_complete || 0,
    days_since_start_normalized: Math.min(daysSinceStart / projectDurationDays, 1),
    approved_co_ratio: ((snapshot.approved_change_orders_cost || 0) / budget) * 100,
    pending_co_ratio: ((snapshot.pending_change_orders_cost || 0) / budget) * 100,
    open_change_orders: snapshot.open_change_orders || 0,
    avg_co_approval_days: snapshot.avg_co_approval_days || 0,
    cost_burn_rate: (snapshot.cost_to_date || 0) / budget,
    schedule_variance_normalized: snapshot.baseline_variance_days || 0,
    weather_delay_days: snapshot.weather_delay_days || 0,
    open_rfis: snapshot.open_rfis || 0,
  }
}

/**
 * Extract schedule features from a project snapshot
 */
export function extractScheduleFeatures(
  snapshot: ProjectSnapshot,
  _projectDurationDays: number = 365
): Record<string, number> {
  const _totalScheduleItems = snapshot.schedule_items_total || 1
  const totalRfis = (snapshot.open_rfis || 0) + (snapshot.overdue_rfis || 0) + 10 // Estimate closed

  return {
    percent_complete: snapshot.overall_percent_complete || 0,
    baseline_variance_normalized: snapshot.baseline_variance_days || 0,
    critical_path_tasks_behind: Math.max(0, snapshot.baseline_variance_days || 0) / 5, // Rough estimate
    open_rfis_ratio: (snapshot.open_rfis || 0) / Math.max(totalRfis, 1),
    avg_rfi_response_days: snapshot.avg_rfi_response_days || 0,
    weather_delay_days: snapshot.weather_delay_days || 0,
    workforce_ratio: (snapshot.avg_daily_workforce || 10) / 10, // Normalize to expected workforce
    open_submittals: snapshot.open_submittals || 0,
    tasks_on_critical_path: snapshot.tasks_on_critical_path || 0,
    co_schedule_impact: 0, // Would need to aggregate from change orders
  }
}

/**
 * Normalize a single value using z-score normalization
 */
export function normalizeValue(
  value: number,
  mean: number,
  std: number
): number {
  if (std === 0) {return 0}
  return (value - mean) / std
}

/**
 * Normalize a single value using min-max normalization
 */
export function minMaxNormalize(
  value: number,
  min: number,
  max: number
): number {
  if (max === min) {return 0}
  return (value - min) / (max - min)
}

/**
 * Normalize features using provided parameters
 */
export function normalizeFeatures(
  features: Record<string, number>,
  params: NormalizationParams,
  method: 'zscore' | 'minmax' = 'zscore'
): number[] {
  return Object.keys(features).map((key) => {
    const value = features[key]
    const mean = params.means[key] || 0
    const std = params.stds[key] || 1
    const min = params.mins?.[key] || 0
    const max = params.maxs?.[key] || 1

    if (method === 'zscore') {
      return normalizeValue(value, mean, std)
    } else {
      return minMaxNormalize(value, min, max)
    }
  })
}

/**
 * Prepare input tensor for budget model
 */
export function prepareBudgetInput(
  snapshot: ProjectSnapshot,
  params: NormalizationParams = DEFAULT_NORMALIZATION_PARAMS
): number[] {
  const rawFeatures = extractBudgetFeatures(snapshot)
  return normalizeFeatures(rawFeatures, params, 'zscore')
}

/**
 * Prepare input tensor for schedule model
 */
export function prepareScheduleInput(
  snapshot: ProjectSnapshot,
  params: NormalizationParams = DEFAULT_NORMALIZATION_PARAMS
): number[] {
  const rawFeatures = extractScheduleFeatures(snapshot)
  return normalizeFeatures(rawFeatures, params, 'zscore')
}

/**
 * Calculate simple heuristic-based risk score (fallback when no ML model)
 */
export function calculateHeuristicRiskScore(snapshot: ProjectSnapshot): {
  overall: number
  schedule: number
  cost: number
  operational: number
} {
  let scheduleRisk = 0
  let costRisk = 0
  let operationalRisk = 0

  // Schedule Risk
  if (snapshot.baseline_variance_days) {
    scheduleRisk += Math.min(Math.abs(snapshot.baseline_variance_days) * 2, 40)
  }
  if ((snapshot.overdue_rfis || 0) > 0) {
    scheduleRisk += Math.min((snapshot.overdue_rfis || 0) * 5, 20)
  }
  if ((snapshot.open_change_orders || 0) > 5) {
    scheduleRisk += 10
  }
  if ((snapshot.tasks_on_critical_path || 0) > 10) {
    scheduleRisk += 10
  }

  // Cost Risk
  const budget = snapshot.budget || 1
  if (snapshot.approved_change_orders_cost) {
    costRisk += Math.min((snapshot.approved_change_orders_cost / budget) * 100, 50)
  }
  if (snapshot.pending_change_orders_cost) {
    costRisk += Math.min((snapshot.pending_change_orders_cost / budget) * 50, 25)
  }

  // Operational Risk
  if ((snapshot.open_punch_items || 0) > 50) {
    operationalRisk += 15
  }
  if ((snapshot.safety_incidents_mtd || 0) > 0) {
    operationalRisk += Math.min((snapshot.safety_incidents_mtd || 0) * 10, 30)
  }
  if (!snapshot.avg_daily_workforce || snapshot.avg_daily_workforce === 0) {
    operationalRisk += 20
  }

  // Cap at 100
  scheduleRisk = Math.min(scheduleRisk, 100)
  costRisk = Math.min(costRisk, 100)
  operationalRisk = Math.min(operationalRisk, 100)

  // Overall is weighted average
  const overall = Math.round(
    (scheduleRisk * 0.4 + costRisk * 0.4 + operationalRisk * 0.2)
  )

  return {
    overall,
    schedule: Math.round(scheduleRisk),
    cost: Math.round(costRisk),
    operational: Math.round(operationalRisk),
  }
}

/**
 * Generate feature importance from model weights (simplified)
 */
export function generateFeatureImportance(
  featureNames: readonly string[],
  weights: number[]
): Array<{ feature: string; importance: number; direction: 'positive' | 'negative' | 'neutral' }> {
  if (weights.length !== featureNames.length) {
    logger.warn('Weights length does not match features length')
    return []
  }

  const totalWeight = weights.reduce((sum, w) => sum + Math.abs(w), 0)

  return featureNames
    .map((feature, i) => ({
      feature,
      importance: Math.abs(weights[i]) / totalWeight,
      direction: (weights[i] > 0.1 ? 'positive' : weights[i] < -0.1 ? 'negative' : 'neutral') as
        | 'positive'
        | 'negative'
        | 'neutral',
    }))
    .sort((a, b) => b.importance - a.importance)
}
