/**
 * Predecessor Constraints Hook
 *
 * Manages predecessor relationships (FS, SS, FF, SF) with lag/lead time
 * and schedule constraints (ASAP, ALAP, SNET, SNLT, etc.)
 */

import { useState, useCallback, useMemo } from 'react'
import { addDays, differenceInDays, parseISO, isBefore, isAfter, max, min } from 'date-fns'
import type {
  EnhancedGanttTask,
  TaskDependency,
  DependencyType,
  ConstraintType,
  CriticalPathResult,
  FloatAnalysis,
  ScheduleCalculationOptions,
} from '../types/gantt'

// ============================================================================
// Types
// ============================================================================

export interface ScheduleCalculationResult {
  tasks: EnhancedGanttTask[]
  criticalPath: CriticalPathResult
  floatAnalysis: Map<string, FloatAnalysis>
  warnings: string[]
  errors: string[]
}

export interface DependencyValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
  circularDependencies: string[][]
}

// ============================================================================
// Internal Task Type
// ============================================================================

interface CalculatedTask {
  id: string
  name: string
  duration: number
  originalStart: Date
  originalFinish: Date
  earlyStart: Date
  earlyFinish: Date
  lateStart: Date
  lateFinish: Date
  totalFloat: number
  freeFloat: number
  isCritical: boolean
  constraintType: ConstraintType
  constraintDate: Date | null
  dependencies: TaskDependency[]
}

// ============================================================================
// Helper Functions
// ============================================================================

function normalizeDate(date: Date | string | null | undefined): Date | null {
  if (!date) {return null}
  return typeof date === 'string' ? parseISO(date) : date
}

function calculateDurationDays(start: Date, end: Date): number {
  return Math.max(1, differenceInDays(end, start) + 1)
}

function applyLag(date: Date, lag: number, lagUnit: 'days' | 'hours' | 'percent', duration?: number): Date {
  switch (lagUnit) {
    case 'days':
      return addDays(date, lag)
    case 'hours':
      // Convert hours to days (assuming 8-hour work day)
      return addDays(date, lag / 8)
    case 'percent':
      // Percent of predecessor duration
      const lagDays = duration ? Math.round((lag / 100) * duration) : 0
      return addDays(date, lagDays)
    default:
      return addDays(date, lag)
  }
}

function getSuccessorStartDate(
  predecessorStart: Date,
  predecessorFinish: Date,
  dependency: TaskDependency,
  predecessorDuration: number
): Date {
  const { type, lag, lagUnit } = dependency

  switch (type) {
    case 'FS': // Finish to Start
      return applyLag(predecessorFinish, lag, lagUnit, predecessorDuration)

    case 'SS': // Start to Start
      return applyLag(predecessorStart, lag, lagUnit, predecessorDuration)

    case 'FF': // Finish to Finish - successor finish = predecessor finish + lag
      // This affects finish date, not start directly
      // The start is calculated by subtracting successor duration from required finish
      return predecessorStart // Will be adjusted in main calculation

    case 'SF': // Start to Finish - successor finish = predecessor start + lag
      return predecessorStart // Will be adjusted in main calculation

    default:
      return applyLag(predecessorFinish, lag, lagUnit, predecessorDuration)
  }
}

// ============================================================================
// Main Hook
// ============================================================================

export function usePredecessorConstraints(
  tasks: EnhancedGanttTask[],
  options: ScheduleCalculationOptions = {}
) {
  const [isCalculating, setIsCalculating] = useState(false)
  const [lastCalculation, setLastCalculation] = useState<ScheduleCalculationResult | null>(null)

  // ============================================================================
  // Validate Dependencies
  // ============================================================================

  const validateDependencies = useCallback((): DependencyValidation => {
    const errors: string[] = []
    const warnings: string[] = []
    const circularDependencies: string[][] = []

    const taskIds = new Set(tasks.map(t => t.id))
    const adjacencyList = new Map<string, string[]>()

    // Build adjacency list and check for missing tasks
    tasks.forEach(task => {
      const deps = task.dependencies || []
      const successors: string[] = []

      deps.forEach(dep => {
        if (!taskIds.has(dep.predecessorId)) {
          errors.push(`Task "${task.title}" references non-existent predecessor: ${dep.predecessorId}`)
        } else {
          successors.push(dep.predecessorId)
        }
      })

      adjacencyList.set(task.id, successors)
    })

    // Detect circular dependencies using DFS
    const visited = new Set<string>()
    const recursionStack = new Set<string>()

    function detectCycle(nodeId: string, path: string[]): boolean {
      visited.add(nodeId)
      recursionStack.add(nodeId)

      const neighbors = adjacencyList.get(nodeId) || []
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (detectCycle(neighbor, [...path, neighbor])) {
            return true
          }
        } else if (recursionStack.has(neighbor)) {
          // Found a cycle
          const cycleStart = path.indexOf(neighbor)
          const cycle = cycleStart >= 0 ? path.slice(cycleStart) : path
          circularDependencies.push([...cycle, neighbor])
          return true
        }
      }

      recursionStack.delete(nodeId)
      return false
    }

    tasks.forEach(task => {
      if (!visited.has(task.id)) {
        detectCycle(task.id, [task.id])
      }
    })

    if (circularDependencies.length > 0) {
      errors.push(`Circular dependencies detected: ${circularDependencies.length} cycle(s)`)
    }

    // Check for negative float warnings
    const negativeLags = tasks.flatMap(t =>
      (t.dependencies || []).filter(d => d.lag < -5).map(d => ({
        taskId: t.id,
        taskName: t.title,
        lag: d.lag,
      }))
    )

    if (negativeLags.length > 0) {
      warnings.push(`${negativeLags.length} dependencies have large lead times (>5 days)`)
    }

    return {
      isValid: errors.length === 0 && circularDependencies.length === 0,
      errors,
      warnings,
      circularDependencies,
    }
  }, [tasks])

  // ============================================================================
  // Calculate Critical Path Method (CPM)
  // ============================================================================

  const calculateCPM = useCallback((): ScheduleCalculationResult => {
    setIsCalculating(true)

    const warnings: string[] = []
    const errors: string[] = []

    try {
      // Validate first
      const validation = validateDependencies()
      if (!validation.isValid) {
        errors.push(...validation.errors)
        warnings.push(...validation.warnings)
      }

      // Normalize tasks
      const normalizedTasks: CalculatedTask[] = tasks.map(task => {
        const start = normalizeDate(task.startDate) || new Date()
        const end = normalizeDate(task.endDate) || addDays(start, 1)
        const duration = calculateDurationDays(start, end)
        const constraintDate = normalizeDate(task.constraintDate)

        return {
          id: task.id,
          name: task.title,
          duration,
          originalStart: start,
          originalFinish: end,
          earlyStart: start,
          earlyFinish: end,
          lateStart: start,
          lateFinish: end,
          totalFloat: 0,
          freeFloat: 0,
          isCritical: false,
          constraintType: task.constraintType || 'as_soon_as_possible',
          constraintDate,
          dependencies: task.dependencies || [],
        }
      })

      const taskMap = new Map(normalizedTasks.map(t => [t.id, t]))

      // Topological sort for forward pass
      const inDegree = new Map<string, number>()
      const dependents = new Map<string, string[]>()

      normalizedTasks.forEach(t => {
        inDegree.set(t.id, 0)
        dependents.set(t.id, [])
      })

      normalizedTasks.forEach(t => {
        t.dependencies.forEach(dep => {
          if (taskMap.has(dep.predecessorId)) {
            inDegree.set(t.id, (inDegree.get(t.id) || 0) + 1)
            const deps = dependents.get(dep.predecessorId) || []
            deps.push(t.id)
            dependents.set(dep.predecessorId, deps)
          }
        })
      })

      // Forward Pass - Calculate Early Start/Finish
      const queue: string[] = []
      normalizedTasks.forEach(t => {
        if (inDegree.get(t.id) === 0) {
          queue.push(t.id)
        }
      })

      const processedOrder: string[] = []
      const inDegreeCopy = new Map(inDegree)

      while (queue.length > 0) {
        const taskId = queue.shift()!
        processedOrder.push(taskId)
        const task = taskMap.get(taskId)!

        // Calculate early dates based on predecessors
        if (task.dependencies.length > 0) {
          let maxEarlyStart = task.originalStart

          task.dependencies.forEach(dep => {
            const predTask = taskMap.get(dep.predecessorId)
            if (!predTask) {return}

            const predDuration = predTask.duration

            switch (dep.type) {
              case 'FS':
                const fsStart = applyLag(predTask.earlyFinish, dep.lag, dep.lagUnit, predDuration)
                maxEarlyStart = max([maxEarlyStart, fsStart])
                break

              case 'SS':
                const ssStart = applyLag(predTask.earlyStart, dep.lag, dep.lagUnit, predDuration)
                maxEarlyStart = max([maxEarlyStart, ssStart])
                break

              case 'FF':
                // Successor must finish after predecessor finishes + lag
                const ffFinish = applyLag(predTask.earlyFinish, dep.lag, dep.lagUnit, predDuration)
                const ffStart = addDays(ffFinish, -task.duration + 1)
                maxEarlyStart = max([maxEarlyStart, ffStart])
                break

              case 'SF':
                // Successor finish = Predecessor start + lag
                const sfFinish = applyLag(predTask.earlyStart, dep.lag, dep.lagUnit, predDuration)
                const sfStart = addDays(sfFinish, -task.duration + 1)
                maxEarlyStart = max([maxEarlyStart, sfStart])
                break
            }
          })

          task.earlyStart = maxEarlyStart
        }

        // Apply constraints
        if (options.respectConstraints !== false) {
          switch (task.constraintType) {
            case 'must_start_on':
              if (task.constraintDate) {
                task.earlyStart = task.constraintDate
              }
              break

            case 'start_no_earlier_than':
              if (task.constraintDate && isBefore(task.earlyStart, task.constraintDate)) {
                task.earlyStart = task.constraintDate
              }
              break

            case 'finish_no_earlier_than':
              if (task.constraintDate) {
                const minStart = addDays(task.constraintDate, -task.duration + 1)
                if (isBefore(task.earlyStart, minStart)) {
                  task.earlyStart = minStart
                }
              }
              break
          }
        }

        // Calculate early finish
        task.earlyFinish = addDays(task.earlyStart, task.duration - 1)

        // Handle must_finish_on constraint
        if (task.constraintType === 'must_finish_on' && task.constraintDate) {
          task.earlyFinish = task.constraintDate
          task.earlyStart = addDays(task.constraintDate, -task.duration + 1)
        }

        // Process successors
        const successors = dependents.get(taskId) || []
        successors.forEach(succId => {
          inDegreeCopy.set(succId, (inDegreeCopy.get(succId) || 1) - 1)
          if (inDegreeCopy.get(succId) === 0) {
            queue.push(succId)
          }
        })
      }

      // Find project end date
      let projectEnd = new Date(0)
      normalizedTasks.forEach(t => {
        if (isAfter(t.earlyFinish, projectEnd)) {
          projectEnd = t.earlyFinish
        }
      })

      // Backward Pass - Calculate Late Start/Finish
      normalizedTasks.forEach(t => {
        t.lateFinish = projectEnd
        t.lateStart = addDays(projectEnd, -t.duration + 1)
      })

      // Process in reverse order
      for (let i = processedOrder.length - 1; i >= 0; i--) {
        const taskId = processedOrder[i]
        const task = taskMap.get(taskId)!

        const successors = dependents.get(taskId) || []
        if (successors.length > 0) {
          let minLateFinish = projectEnd

          successors.forEach(succId => {
            const succTask = taskMap.get(succId)
            if (!succTask) {return}

            const dep = succTask.dependencies.find(d => d.predecessorId === taskId)
            if (!dep) {return}

            switch (dep.type) {
              case 'FS':
                const fsLate = addDays(succTask.lateStart, -(dep.lag + 1))
                minLateFinish = min([minLateFinish, fsLate])
                break

              case 'SS':
                const ssLate = addDays(succTask.lateStart, -dep.lag)
                const ssLateFinish = addDays(ssLate, task.duration - 1)
                minLateFinish = min([minLateFinish, ssLateFinish])
                break

              case 'FF':
                const ffLate = addDays(succTask.lateFinish, -dep.lag)
                minLateFinish = min([minLateFinish, ffLate])
                break

              case 'SF':
                // Predecessor start constrains successor finish
                const sfLateLimitOnPredStart = addDays(succTask.lateFinish, -dep.lag)
                const sfLateFinish = addDays(sfLateLimitOnPredStart, task.duration - 1)
                minLateFinish = min([minLateFinish, sfLateFinish])
                break
            }
          })

          task.lateFinish = minLateFinish
        }

        // Apply late constraints
        if (options.respectConstraints !== false) {
          switch (task.constraintType) {
            case 'must_finish_on':
              if (task.constraintDate) {
                task.lateFinish = task.constraintDate
              }
              break

            case 'finish_no_later_than':
              if (task.constraintDate && isAfter(task.lateFinish, task.constraintDate)) {
                task.lateFinish = task.constraintDate
              }
              break

            case 'start_no_later_than':
              if (task.constraintDate) {
                const maxFinish = addDays(task.constraintDate, task.duration - 1)
                if (isAfter(task.lateFinish, maxFinish)) {
                  task.lateFinish = maxFinish
                }
              }
              break

            case 'as_late_as_possible':
              // Start as late as possible while respecting successors
              task.earlyStart = task.lateStart
              task.earlyFinish = task.lateFinish
              break
          }
        }

        task.lateStart = addDays(task.lateFinish, -task.duration + 1)

        // Calculate total float
        task.totalFloat = differenceInDays(task.lateFinish, task.earlyFinish)

        // Calculate free float (difference between early finish and earliest early start of successors)
        const successorList = dependents.get(taskId) || []
        if (successorList.length > 0) {
          let minSuccessorStart = projectEnd
          successorList.forEach(succId => {
            const succTask = taskMap.get(succId)
            if (succTask && isBefore(succTask.earlyStart, minSuccessorStart)) {
              minSuccessorStart = succTask.earlyStart
            }
          })
          task.freeFloat = Math.max(0, differenceInDays(minSuccessorStart, task.earlyFinish) - 1)
        } else {
          task.freeFloat = task.totalFloat
        }

        // Determine if on critical path
        task.isCritical = Math.abs(task.totalFloat) < 0.01
      }

      // Build results
      const criticalTasks = normalizedTasks.filter(t => t.isCritical).map(t => t.id)
      const projectStart = normalizedTasks.length > 0
        ? min(normalizedTasks.map(t => t.earlyStart))
        : new Date()

      const floatAnalysis = new Map<string, FloatAnalysis>()
      normalizedTasks.forEach(t => {
        floatAnalysis.set(t.id, {
          taskId: t.id,
          totalFloat: t.totalFloat,
          freeFloat: t.freeFloat,
          isCritical: t.isCritical,
          isDriving: t.dependencies.some(d => {
            const pred = taskMap.get(d.predecessorId)
            return pred?.isCritical && t.isCritical
          }),
          drivingPredecessor: t.dependencies.find(d => {
            const pred = taskMap.get(d.predecessorId)
            return pred?.isCritical && t.isCritical
          })?.predecessorId,
        })
      })

      // Map back to EnhancedGanttTask
      const resultTasks: EnhancedGanttTask[] = tasks.map(originalTask => {
        const calcTask = taskMap.get(originalTask.id)
        if (!calcTask) {return originalTask}

        return {
          ...originalTask,
          earlyStart: calcTask.earlyStart,
          earlyFinish: calcTask.earlyFinish,
          lateStart: calcTask.lateStart,
          lateFinish: calcTask.lateFinish,
          totalFloat: calcTask.totalFloat,
          freeFloat: calcTask.freeFloat,
          isCritical: calcTask.isCritical,
          isOnCriticalPath: calcTask.isCritical,
        }
      })

      const result: ScheduleCalculationResult = {
        tasks: resultTasks,
        criticalPath: {
          criticalTasks,
          projectDuration: differenceInDays(projectEnd, projectStart) + 1,
          projectStart,
          projectFinish: projectEnd,
          totalFloat: 0,
        },
        floatAnalysis,
        warnings,
        errors,
      }

      setLastCalculation(result)
      return result

    } finally {
      setIsCalculating(false)
    }
  }, [tasks, options, validateDependencies])

  // ============================================================================
  // Add Dependency
  // ============================================================================

  const addDependency = useCallback((
    successorId: string,
    predecessorId: string,
    type: DependencyType = 'FS',
    lag: number = 0,
    lagUnit: 'days' | 'hours' | 'percent' = 'days'
  ): TaskDependency => {
    return {
      predecessorId,
      type,
      lag,
      lagUnit,
      isDriving: false,
    }
  }, [])

  // ============================================================================
  // Remove Dependency
  // ============================================================================

  const removeDependency = useCallback((
    task: EnhancedGanttTask,
    predecessorId: string
  ): TaskDependency[] => {
    return (task.dependencies || []).filter(d => d.predecessorId !== predecessorId)
  }, [])

  // ============================================================================
  // Update Dependency
  // ============================================================================

  const updateDependency = useCallback((
    task: EnhancedGanttTask,
    predecessorId: string,
    updates: Partial<TaskDependency>
  ): TaskDependency[] => {
    return (task.dependencies || []).map(d => {
      if (d.predecessorId === predecessorId) {
        return { ...d, ...updates }
      }
      return d
    })
  }, [])

  // ============================================================================
  // Apply Constraint
  // ============================================================================

  const applyConstraint = useCallback((
    task: EnhancedGanttTask,
    constraintType: ConstraintType,
    constraintDate?: Date
  ): Partial<EnhancedGanttTask> => {
    const needsDate = [
      'must_start_on',
      'must_finish_on',
      'start_no_earlier_than',
      'start_no_later_than',
      'finish_no_earlier_than',
      'finish_no_later_than',
    ].includes(constraintType)

    if (needsDate && !constraintDate) {
      // Default to current task start/finish date
      constraintDate = constraintType.includes('finish')
        ? normalizeDate(task.endDate) || new Date()
        : normalizeDate(task.startDate) || new Date()
    }

    return {
      constraintType,
      constraintDate: needsDate ? constraintDate : null,
    }
  }, [])

  // ============================================================================
  // Get Dependency Impact
  // ============================================================================

  const getDependencyImpact = useCallback((
    successorId: string,
    predecessorId: string,
    type: DependencyType
  ): { delayDays: number; affectsCriticalPath: boolean } => {
    const successor = tasks.find(t => t.id === successorId)
    const predecessor = tasks.find(t => t.id === predecessorId)

    if (!successor || !predecessor) {
      return { delayDays: 0, affectsCriticalPath: false }
    }

    const predFinish = normalizeDate(predecessor.endDate)
    const succStart = normalizeDate(successor.startDate)

    if (!predFinish || !succStart) {
      return { delayDays: 0, affectsCriticalPath: false }
    }

    const currentGap = differenceInDays(succStart, predFinish)
    const requiredDelay = type === 'FS' && currentGap < 1 ? 1 - currentGap : 0

    return {
      delayDays: requiredDelay,
      affectsCriticalPath: lastCalculation?.criticalPath.criticalTasks.includes(successorId) ?? false,
    }
  }, [tasks, lastCalculation])

  // ============================================================================
  // Memoized Values
  // ============================================================================

  const validation = useMemo(() => validateDependencies(), [validateDependencies])

  const hasCircularDependencies = useMemo(
    () => validation.circularDependencies.length > 0,
    [validation]
  )

  const dependencyStats = useMemo(() => {
    const stats = {
      total: 0,
      byType: { FS: 0, SS: 0, FF: 0, SF: 0 } as Record<DependencyType, number>,
      withLag: 0,
      withLead: 0,
    }

    tasks.forEach(task => {
      (task.dependencies || []).forEach(dep => {
        stats.total++
        stats.byType[dep.type]++
        if (dep.lag > 0) {stats.withLag++}
        if (dep.lag < 0) {stats.withLead++}
      })
    })

    return stats
  }, [tasks])

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // Calculation
    calculateCPM,
    isCalculating,
    lastCalculation,

    // Validation
    validateDependencies,
    validation,
    hasCircularDependencies,

    // Dependency operations
    addDependency,
    removeDependency,
    updateDependency,

    // Constraint operations
    applyConstraint,

    // Analysis
    getDependencyImpact,
    dependencyStats,
  }
}

export default usePredecessorConstraints
