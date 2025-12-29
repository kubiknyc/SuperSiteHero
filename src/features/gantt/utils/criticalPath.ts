/**
 * Critical Path Method (CPM) Algorithm
 *
 * Calculates the critical path through a project schedule by:
 * 1. Forward pass: Calculate early start (ES) and early finish (EF)
 * 2. Backward pass: Calculate late start (LS) and late finish (LF)
 * 3. Float calculation: Total float = LF - EF (or LS - ES)
 * 4. Critical path: Tasks with zero float
 */

import { differenceInDays, addDays, parseISO } from 'date-fns'
import type { GanttTask, TaskDependency, DependencyType } from '@/types/schedule'
import { logger } from '../../../lib/utils/logger';


export interface CriticalPathNode {
  taskId: string
  earlyStart: Date
  earlyFinish: Date
  lateStart: Date
  lateFinish: Date
  totalFloat: number
  freeFloat: number
  isCritical: boolean
}

export interface CriticalPathResult {
  nodes: Map<string, CriticalPathNode>
  criticalPath: string[]
  projectDuration: number
  projectStart: Date
  projectEnd: Date
}

/**
 * Build adjacency lists for forward and backward traversal
 */
function buildDependencyGraph(
  tasks: GanttTask[],
  dependencies: TaskDependency[]
): {
  successors: Map<string, { taskId: string; type: DependencyType; lag: number }[]>
  predecessors: Map<string, { taskId: string; type: DependencyType; lag: number }[]>
} {
  const successors = new Map<string, { taskId: string; type: DependencyType; lag: number }[]>()
  const predecessors = new Map<string, { taskId: string; type: DependencyType; lag: number }[]>()

  // Initialize empty arrays for all tasks
  tasks.forEach(task => {
    successors.set(task.id, [])
    predecessors.set(task.id, [])
  })

  // Build adjacency lists from dependencies
  dependencies.forEach(dep => {
    const predList = successors.get(dep.predecessor_id) || []
    predList.push({
      taskId: dep.successor_id,
      type: dep.dependency_type,
      lag: dep.lag_days
    })
    successors.set(dep.predecessor_id, predList)

    const succList = predecessors.get(dep.successor_id) || []
    succList.push({
      taskId: dep.predecessor_id,
      type: dep.dependency_type,
      lag: dep.lag_days
    })
    predecessors.set(dep.successor_id, succList)
  })

  return { successors, predecessors }
}

/**
 * Calculate the constraint date based on dependency type
 */
function calculateConstraintDate(
  predecessorStart: Date,
  predecessorFinish: Date,
  successorDuration: number,
  dependencyType: DependencyType,
  lagDays: number
): { constraintStart: Date; constraintFinish: Date } {
  switch (dependencyType) {
    case 'FS': // Finish-to-Start (most common)
      // Successor can start after predecessor finishes + lag
      return {
        constraintStart: addDays(predecessorFinish, lagDays),
        constraintFinish: addDays(predecessorFinish, lagDays + successorDuration)
      }
    case 'SS': // Start-to-Start
      // Successor can start after predecessor starts + lag
      return {
        constraintStart: addDays(predecessorStart, lagDays),
        constraintFinish: addDays(predecessorStart, lagDays + successorDuration)
      }
    case 'FF': // Finish-to-Finish
      // Successor must finish after predecessor finishes + lag
      return {
        constraintStart: addDays(predecessorFinish, lagDays - successorDuration),
        constraintFinish: addDays(predecessorFinish, lagDays)
      }
    case 'SF': // Start-to-Finish (rare)
      // Successor must finish after predecessor starts + lag
      return {
        constraintStart: addDays(predecessorStart, lagDays - successorDuration),
        constraintFinish: addDays(predecessorStart, lagDays)
      }
    default:
      return {
        constraintStart: predecessorFinish,
        constraintFinish: addDays(predecessorFinish, successorDuration)
      }
  }
}

/**
 * Topological sort using Kahn's algorithm
 */
function topologicalSort(
  tasks: GanttTask[],
  predecessors: Map<string, { taskId: string; type: DependencyType; lag: number }[]>
): string[] {
  const inDegree = new Map<string, number>()
  const result: string[] = []
  const queue: string[] = []

  // Calculate in-degree for each task
  tasks.forEach(task => {
    const preds = predecessors.get(task.id) || []
    inDegree.set(task.id, preds.length)
    if (preds.length === 0) {
      queue.push(task.id)
    }
  })

  // Process queue
  while (queue.length > 0) {
    const taskId = queue.shift()!
    result.push(taskId)

    // Find all tasks that depend on this one
    tasks.forEach(task => {
      const preds = predecessors.get(task.id) || []
      if (preds.some(p => p.taskId === taskId)) {
        const newDegree = (inDegree.get(task.id) || 0) - 1
        inDegree.set(task.id, newDegree)
        if (newDegree === 0) {
          queue.push(task.id)
        }
      }
    })
  }

  // Check for cycles
  if (result.length !== tasks.length) {
    logger.warn('Circular dependency detected in schedule')
    // Return original order for tasks not in result
    const remaining = tasks.filter(t => !result.includes(t.id)).map(t => t.id)
    return [...result, ...remaining]
  }

  return result
}

/**
 * Calculate critical path using CPM algorithm
 */
export function calculateCriticalPath(
  tasks: GanttTask[],
  dependencies: TaskDependency[]
): CriticalPathResult {
  if (tasks.length === 0) {
    return {
      nodes: new Map(),
      criticalPath: [],
      projectDuration: 0,
      projectStart: new Date(),
      projectEnd: new Date()
    }
  }

  const { successors, predecessors } = buildDependencyGraph(tasks, dependencies)
  const taskMap = new Map(tasks.map(t => [t.id, t]))
  const nodes = new Map<string, CriticalPathNode>()

  // Get topological order for forward pass
  const sortedTaskIds = topologicalSort(tasks, predecessors)

  // Initialize nodes with task dates
  tasks.forEach(task => {
    const start = parseISO(task.start_date)
    const finish = parseISO(task.finish_date)
    nodes.set(task.id, {
      taskId: task.id,
      earlyStart: start,
      earlyFinish: finish,
      lateStart: start,
      lateFinish: finish,
      totalFloat: 0,
      freeFloat: 0,
      isCritical: false
    })
  })

  // Forward pass: Calculate early start and early finish
  sortedTaskIds.forEach(taskId => {
    const task = taskMap.get(taskId)!
    const node = nodes.get(taskId)!
    const preds = predecessors.get(taskId) || []
    const duration = task.duration_days

    if (preds.length === 0) {
      // No predecessors - use task's own start date
      node.earlyStart = parseISO(task.start_date)
      node.earlyFinish = addDays(node.earlyStart, duration)
    } else {
      // Find the latest constraint from all predecessors
      let maxConstraintStart = new Date(0)

      preds.forEach(pred => {
        const predNode = nodes.get(pred.taskId)
        if (predNode) {
          const constraint = calculateConstraintDate(
            predNode.earlyStart,
            predNode.earlyFinish,
            duration,
            pred.type,
            pred.lag
          )
          if (constraint.constraintStart > maxConstraintStart) {
            maxConstraintStart = constraint.constraintStart
          }
        }
      })

      node.earlyStart = maxConstraintStart
      node.earlyFinish = addDays(maxConstraintStart, duration)
    }

    nodes.set(taskId, node)
  })

  // Find project end date (latest early finish)
  let projectEnd = new Date(0)
  let projectStart = new Date(8640000000000000) // Max date

  nodes.forEach(node => {
    if (node.earlyFinish > projectEnd) {projectEnd = node.earlyFinish}
    if (node.earlyStart < projectStart) {projectStart = node.earlyStart}
  })

  // Backward pass: Calculate late start and late finish
  const reverseSortedTaskIds = [...sortedTaskIds].reverse()

  reverseSortedTaskIds.forEach(taskId => {
    const task = taskMap.get(taskId)!
    const node = nodes.get(taskId)!
    const succs = successors.get(taskId) || []
    const duration = task.duration_days

    if (succs.length === 0) {
      // No successors - late finish is project end
      node.lateFinish = projectEnd
      node.lateStart = addDays(projectEnd, -duration)
    } else {
      // Find the earliest constraint from all successors
      let minConstraintFinish = new Date(8640000000000000)

      succs.forEach(succ => {
        const succNode = nodes.get(succ.taskId)
        const succTask = taskMap.get(succ.taskId)
        if (succNode && succTask) {
          // Reverse calculation based on dependency type
          let constraintFinish: Date

          switch (succ.type) {
            case 'FS':
              constraintFinish = addDays(succNode.lateStart, -succ.lag)
              break
            case 'SS':
              constraintFinish = addDays(succNode.lateStart, -succ.lag + duration)
              break
            case 'FF':
              constraintFinish = addDays(succNode.lateFinish, -succ.lag)
              break
            case 'SF':
              constraintFinish = addDays(succNode.lateFinish, -succ.lag + duration)
              break
            default:
              constraintFinish = succNode.lateStart
          }

          if (constraintFinish < minConstraintFinish) {
            minConstraintFinish = constraintFinish
          }
        }
      })

      node.lateFinish = minConstraintFinish
      node.lateStart = addDays(minConstraintFinish, -duration)
    }

    // Calculate float
    node.totalFloat = differenceInDays(node.lateFinish, node.earlyFinish)

    // A task is critical if it has zero float
    node.isCritical = node.totalFloat === 0

    nodes.set(taskId, node)
  })

  // Calculate free float (slack before affecting successors)
  nodes.forEach((node, taskId) => {
    const succs = successors.get(taskId) || []
    if (succs.length === 0) {
      node.freeFloat = node.totalFloat
    } else {
      let minSuccessorStart = new Date(8640000000000000)
      succs.forEach(succ => {
        const succNode = nodes.get(succ.taskId)
        if (succNode && succNode.earlyStart < minSuccessorStart) {
          minSuccessorStart = succNode.earlyStart
        }
      })
      node.freeFloat = Math.max(0, differenceInDays(minSuccessorStart, node.earlyFinish))
    }
  })

  // Extract critical path (tasks with zero float)
  const criticalPath = sortedTaskIds.filter(taskId => {
    const node = nodes.get(taskId)
    return node && node.isCritical
  })

  const projectDuration = differenceInDays(projectEnd, projectStart)

  return {
    nodes,
    criticalPath,
    projectDuration,
    projectStart,
    projectEnd
  }
}

/**
 * Get tasks on the critical path
 */
export function getCriticalTasks(
  tasks: GanttTask[],
  dependencies: TaskDependency[]
): GanttTask[] {
  const result = calculateCriticalPath(tasks, dependencies)
  const criticalSet = new Set(result.criticalPath)
  return tasks.filter(task => criticalSet.has(task.id))
}

/**
 * Check if a specific task is on the critical path
 */
export function isTaskCritical(
  taskId: string,
  tasks: GanttTask[],
  dependencies: TaskDependency[]
): boolean {
  const result = calculateCriticalPath(tasks, dependencies)
  return result.criticalPath.includes(taskId)
}

/**
 * Get float (slack) for a specific task
 */
export function getTaskFloat(
  taskId: string,
  tasks: GanttTask[],
  dependencies: TaskDependency[]
): { totalFloat: number; freeFloat: number } | null {
  const result = calculateCriticalPath(tasks, dependencies)
  const node = result.nodes.get(taskId)
  if (!node) {return null}
  return {
    totalFloat: node.totalFloat,
    freeFloat: node.freeFloat
  }
}
