// File: /src/lib/ml/inference/prediction-service.ts
// ML Prediction Service using TensorFlow.js

// Lazy load TensorFlow.js to reduce initial bundle size (~2.7MB)
// TensorFlow is only loaded when ML predictions are actually needed
type TensorFlowModule = typeof import('@tensorflow/tfjs')
let tfModule: TensorFlowModule | null = null

async function getTensorFlow(): Promise<TensorFlowModule> {
  if (!tfModule) {
    tfModule = await import('@tensorflow/tfjs')
  }
  return tfModule
}

import type {
  ProjectSnapshot,
  RiskAssessment,
  BudgetPrediction,
  SchedulePrediction,
  FeatureImportance,
  ModelMetadata,
  NormalizationParams,
} from '@/types/analytics'
import {
  prepareBudgetInput,
  prepareScheduleInput,
  calculateHeuristicRiskScore,
  DEFAULT_NORMALIZATION_PARAMS,
} from '../utils/feature-engineering'
import { logger } from '../../utils/logger';


// Model version constant
const CURRENT_MODEL_VERSION = 'v1.0.0-heuristic'

/**
 * Prediction Service
 * Handles ML model loading and inference for predictions
 */
export class PredictionService {
  private budgetModel: Awaited<ReturnType<TensorFlowModule['loadLayersModel']>> | null = null
  private scheduleModel: Awaited<ReturnType<TensorFlowModule['loadLayersModel']>> | null = null
  private initialized: boolean = false
  private modelMetadata: Map<string, ModelMetadata> = new Map()
  private normalizationParams: NormalizationParams = DEFAULT_NORMALIZATION_PARAMS

  /**
   * Initialize the prediction service
   */
  async initialize(): Promise<void> {
    if (this.initialized) {return}

    try {
      // Try to load models from storage
      await this.loadModels()
      this.initialized = true
    } catch (error) {
      logger.warn('ML models not available, using heuristic predictions:', error)
      this.initialized = true // Still mark as initialized to use fallback
    }
  }

  /**
   * Load TensorFlow.js models from storage
   */
  async loadModels(): Promise<void> {
    try {
      // Lazy load TensorFlow.js only when models are needed
      const tf = await getTensorFlow()

      // Note: In production, models would be loaded from Supabase Storage
      // For now, we'll create simple models or use heuristics

      // Check if models exist in IndexedDB (cached from previous load)
      const budgetModelPath = 'indexeddb://budget-overrun-model'
      const scheduleModelPath = 'indexeddb://schedule-delay-model'

      try {
        this.budgetModel = await tf.loadLayersModel(budgetModelPath)
        logger.log('Budget model loaded from cache')
      } catch {
        logger.log('Budget model not in cache, will use heuristics')
      }

      try {
        this.scheduleModel = await tf.loadLayersModel(scheduleModelPath)
        logger.log('Schedule model loaded from cache')
      } catch {
        logger.log('Schedule model not in cache, will use heuristics')
      }
    } catch (error) {
      logger.warn('Error loading models:', error)
    }
  }

  /**
   * Create a simple neural network model (for demonstration/testing)
   */
  private async createSimpleModel(inputSize: number): Promise<Awaited<ReturnType<TensorFlowModule['loadLayersModel']>>> {
    const tf = await getTensorFlow()
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [inputSize],
          units: 32,
          activation: 'relu',
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 16,
          activation: 'relu',
        }),
        tf.layers.dense({
          units: 3, // probability, low estimate, high estimate
          activation: 'sigmoid',
        }),
      ],
    })

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
    })

    return model as Awaited<ReturnType<TensorFlowModule['loadLayersModel']>>
  }

  /**
   * Save models to IndexedDB for caching
   */
  async saveModels(): Promise<void> {
    if (this.budgetModel) {
      await this.budgetModel.save('indexeddb://budget-overrun-model')
    }
    if (this.scheduleModel) {
      await this.scheduleModel.save('indexeddb://schedule-delay-model')
    }
  }

  /**
   * Get complete prediction for a project
   */
  async predict(
    projectId: string,
    snapshot: ProjectSnapshot
  ): Promise<{
    budget: BudgetPrediction
    schedule: SchedulePrediction
    risk: RiskAssessment
    modelVersion: string
  }> {
    await this.initialize()

    const budget = await this.predictBudgetOverrun(snapshot)
    const schedule = await this.predictScheduleDelay(snapshot)
    const risk = this.calculateRiskScores(snapshot, budget, schedule)

    return {
      budget,
      schedule,
      risk: {
        project_id: projectId,
        assessed_at: new Date().toISOString(),
        ...risk,
        factors: [],
      },
      modelVersion: CURRENT_MODEL_VERSION,
    }
  }

  /**
   * Predict budget overrun
   */
  async predictBudgetOverrun(snapshot: ProjectSnapshot): Promise<BudgetPrediction> {
    await this.initialize()

    const budget = snapshot.budget || 1

    if (this.budgetModel) {
      // Use ML model - lazy load TensorFlow
      const tf = await getTensorFlow()
      const input = prepareBudgetInput(snapshot, this.normalizationParams)
      const inputTensor = tf.tensor2d([input])

      const output = this.budgetModel.predict(inputTensor) as ReturnType<TensorFlowModule['tensor']>
      const predictions = await output.data()

      inputTensor.dispose()
      output.dispose()

      return {
        probability: Math.min(Math.max(predictions[0], 0), 1),
        amount_low: predictions[1] * budget * 0.5,
        amount_mid: predictions[1] * budget,
        amount_high: predictions[2] * budget * 1.5,
        confidence: 0.7, // Would come from model calibration
        contributing_factors: this.getBudgetContributingFactors(snapshot),
      }
    }

    // Heuristic fallback
    return this.calculateHeuristicBudgetPrediction(snapshot)
  }

  /**
   * Predict schedule delay
   */
  async predictScheduleDelay(snapshot: ProjectSnapshot): Promise<SchedulePrediction> {
    await this.initialize()

    if (this.scheduleModel) {
      // Use ML model - lazy load TensorFlow
      const tf = await getTensorFlow()
      const input = prepareScheduleInput(snapshot, this.normalizationParams)
      const inputTensor = tf.tensor2d([input])

      const output = this.scheduleModel.predict(inputTensor) as ReturnType<TensorFlowModule['tensor']>
      const predictions = await output.data()

      inputTensor.dispose()
      output.dispose()

      // Calculate projected completion
      const plannedCompletion = snapshot.planned_completion_date
        ? new Date(snapshot.planned_completion_date)
        : new Date()
      const delayDays = Math.round(predictions[1] * 60) // Scale to days
      const projectedCompletion = new Date(
        plannedCompletion.getTime() + delayDays * 24 * 60 * 60 * 1000
      )

      return {
        probability: Math.min(Math.max(predictions[0], 0), 1),
        days_low: Math.round(delayDays * 0.5),
        days_mid: delayDays,
        days_high: Math.round(delayDays * 1.5),
        projected_completion_date: projectedCompletion.toISOString().split('T')[0],
        confidence: 0.7,
        contributing_factors: this.getScheduleContributingFactors(snapshot),
      }
    }

    // Heuristic fallback
    return this.calculateHeuristicSchedulePrediction(snapshot)
  }

  /**
   * Calculate risk scores
   */
  calculateRiskScores(
    snapshot: ProjectSnapshot,
    _budget: BudgetPrediction,
    _schedule: SchedulePrediction
  ): {
    overall: { score: number; level: 'low' | 'medium' | 'high' | 'critical'; trend: 'improving' | 'stable' | 'worsening'; change_from_previous: number; contributing_factors: string[] }
    schedule: { score: number; level: 'low' | 'medium' | 'high' | 'critical'; trend: 'improving' | 'stable' | 'worsening'; change_from_previous: number; contributing_factors: string[] }
    cost: { score: number; level: 'low' | 'medium' | 'high' | 'critical'; trend: 'improving' | 'stable' | 'worsening'; change_from_previous: number; contributing_factors: string[] }
    operational: { score: number; level: 'low' | 'medium' | 'high' | 'critical'; trend: 'improving' | 'stable' | 'worsening'; change_from_previous: number; contributing_factors: string[] }
  } {
    const heuristic = calculateHeuristicRiskScore(snapshot)

    const getRiskLevel = (score: number): 'low' | 'medium' | 'high' | 'critical' => {
      if (score >= 80) {return 'critical'}
      if (score >= 60) {return 'high'}
      if (score >= 30) {return 'medium'}
      return 'low'
    }

    return {
      overall: {
        score: heuristic.overall,
        level: getRiskLevel(heuristic.overall),
        trend: 'stable' as const,
        change_from_previous: 0,
        contributing_factors: [],
      },
      schedule: {
        score: heuristic.schedule,
        level: getRiskLevel(heuristic.schedule),
        trend: 'stable' as const,
        change_from_previous: 0,
        contributing_factors: [],
      },
      cost: {
        score: heuristic.cost,
        level: getRiskLevel(heuristic.cost),
        trend: 'stable' as const,
        change_from_previous: 0,
        contributing_factors: [],
      },
      operational: {
        score: heuristic.operational,
        level: getRiskLevel(heuristic.operational),
        trend: 'stable' as const,
        change_from_previous: 0,
        contributing_factors: [],
      },
    }
  }

  /**
   * Heuristic budget prediction (fallback)
   */
  private calculateHeuristicBudgetPrediction(snapshot: ProjectSnapshot): BudgetPrediction {
    const budget = snapshot.budget || 1
    const approvedCO = snapshot.approved_change_orders_cost || 0
    const pendingCO = snapshot.pending_change_orders_cost || 0

    // Simple heuristic: extrapolate CO rate
    const percentComplete = (snapshot.overall_percent_complete || 0) / 100
    const currentCORate = approvedCO / budget

    // Project future COs based on current rate
    let projectedOverrun = 0
    let probability = 0

    if (percentComplete > 0) {
      const projectedTotalCO = (currentCORate / percentComplete) * budget
      projectedOverrun = projectedTotalCO - approvedCO + pendingCO

      // Higher probability if already seeing significant COs
      probability = Math.min(currentCORate * 5, 0.95)
    }

    return {
      probability,
      amount_low: projectedOverrun * 0.5,
      amount_mid: projectedOverrun,
      amount_high: projectedOverrun * 1.5 + pendingCO,
      confidence: 0.5, // Lower confidence for heuristic
      contributing_factors: this.getBudgetContributingFactors(snapshot),
    }
  }

  /**
   * Heuristic schedule prediction (fallback)
   */
  private calculateHeuristicSchedulePrediction(snapshot: ProjectSnapshot): SchedulePrediction {
    const baselineVariance = snapshot.baseline_variance_days || 0
    const overdueRFIs = snapshot.overdue_rfis || 0
    const weatherDelays = snapshot.weather_delay_days || 0

    // Simple extrapolation
    const percentComplete = (snapshot.overall_percent_complete || 0) / 100
    let projectedDelay = baselineVariance

    if (percentComplete > 0 && percentComplete < 1) {
      // Extrapolate current delay rate
      projectedDelay = Math.round(baselineVariance / percentComplete)
    }

    // Add risk from overdue items
    projectedDelay += overdueRFIs * 2
    projectedDelay += weatherDelays * 0.5

    const probability = Math.min(
      (Math.abs(baselineVariance) / 30 + overdueRFIs / 10) * 0.5,
      0.95
    )

    // Calculate projected completion
    const plannedCompletion = snapshot.planned_completion_date
      ? new Date(snapshot.planned_completion_date)
      : new Date()
    const projectedCompletion = new Date(
      plannedCompletion.getTime() + Math.max(0, projectedDelay) * 24 * 60 * 60 * 1000
    )

    return {
      probability: Math.max(0, probability),
      days_low: Math.max(0, Math.round(projectedDelay * 0.5)),
      days_mid: Math.max(0, Math.round(projectedDelay)),
      days_high: Math.max(0, Math.round(projectedDelay * 1.5)),
      projected_completion_date: projectedCompletion.toISOString().split('T')[0],
      confidence: 0.5,
      contributing_factors: this.getScheduleContributingFactors(snapshot),
    }
  }

  /**
   * Get budget contributing factors
   */
  private getBudgetContributingFactors(snapshot: ProjectSnapshot): FeatureImportance[] {
    const factors: FeatureImportance[] = []
    const budget = snapshot.budget || 1

    // Change orders
    if ((snapshot.approved_change_orders_cost || 0) > budget * 0.05) {
      factors.push({
        feature: 'Change Orders',
        importance: 0.3,
        direction: 'positive',
        description: `${((snapshot.approved_change_orders_cost || 0) / budget * 100).toFixed(1)}% of budget in approved COs`,
      })
    }

    // Pending COs
    if ((snapshot.pending_change_orders_cost || 0) > budget * 0.02) {
      factors.push({
        feature: 'Pending Change Orders',
        importance: 0.2,
        direction: 'positive',
        description: `${((snapshot.pending_change_orders_cost || 0) / budget * 100).toFixed(1)}% of budget pending`,
      })
    }

    // Schedule delays (often correlate with cost)
    if ((snapshot.baseline_variance_days || 0) > 14) {
      factors.push({
        feature: 'Schedule Delays',
        importance: 0.25,
        direction: 'positive',
        description: `${snapshot.baseline_variance_days} days behind schedule`,
      })
    }

    // Weather delays
    if ((snapshot.weather_delay_days || 0) > 5) {
      factors.push({
        feature: 'Weather Delays',
        importance: 0.15,
        direction: 'positive',
        description: `${snapshot.weather_delay_days} weather delay days`,
      })
    }

    return factors.sort((a, b) => b.importance - a.importance)
  }

  /**
   * Get schedule contributing factors
   */
  private getScheduleContributingFactors(snapshot: ProjectSnapshot): FeatureImportance[] {
    const factors: FeatureImportance[] = []

    // Baseline variance
    if (Math.abs(snapshot.baseline_variance_days || 0) > 7) {
      factors.push({
        feature: 'Baseline Variance',
        importance: 0.35,
        direction: snapshot.baseline_variance_days! > 0 ? 'positive' : 'negative',
        description: `${snapshot.baseline_variance_days} days from baseline`,
      })
    }

    // Overdue RFIs
    if ((snapshot.overdue_rfis || 0) > 0) {
      factors.push({
        feature: 'Overdue RFIs',
        importance: 0.2,
        direction: 'positive',
        description: `${snapshot.overdue_rfis} RFIs past due`,
      })
    }

    // Critical path
    if ((snapshot.tasks_on_critical_path || 0) > 5) {
      factors.push({
        feature: 'Critical Path Complexity',
        importance: 0.15,
        direction: 'positive',
        description: `${snapshot.tasks_on_critical_path} tasks on critical path`,
      })
    }

    // Open submittals
    if ((snapshot.open_submittals || 0) > 10) {
      factors.push({
        feature: 'Open Submittals',
        importance: 0.15,
        direction: 'positive',
        description: `${snapshot.open_submittals} submittals awaiting approval`,
      })
    }

    // Weather
    if ((snapshot.weather_delay_days || 0) > 3) {
      factors.push({
        feature: 'Weather Impact',
        importance: 0.1,
        direction: 'positive',
        description: `${snapshot.weather_delay_days} days of weather delays`,
      })
    }

    return factors.sort((a, b) => b.importance - a.importance)
  }

  /**
   * Get model version
   */
  getModelVersion(): string {
    return CURRENT_MODEL_VERSION
  }

  /**
   * Check if using ML models or heuristics
   */
  isUsingMLModels(): boolean {
    return this.budgetModel !== null || this.scheduleModel !== null
  }

  /**
   * Dispose of TensorFlow models to free memory
   */
  dispose(): void {
    if (this.budgetModel) {
      this.budgetModel.dispose()
      this.budgetModel = null
    }
    if (this.scheduleModel) {
      this.scheduleModel.dispose()
      this.scheduleModel = null
    }
    this.initialized = false
  }
}

// Singleton instance
let predictionServiceInstance: PredictionService | null = null

/**
 * Get the prediction service instance
 */
export function getPredictionService(): PredictionService {
  if (!predictionServiceInstance) {
    predictionServiceInstance = new PredictionService()
  }
  return predictionServiceInstance
}

/**
 * Clean up prediction service (for testing or app shutdown)
 */
export function disposePredictionService(): void {
  if (predictionServiceInstance) {
    predictionServiceInstance.dispose()
    predictionServiceInstance = null
  }
}
