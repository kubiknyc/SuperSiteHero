/**
 * Tests for Schedule Types
 * Tests for Gantt Charts & Scheduling feature types and constants
 */

import { describe, it, expect } from 'vitest'
import {
  DEFAULT_GANTT_CONFIG,
  TASK_BAR_COLORS,
  CRITICAL_PATH_COLOR,
  MILESTONE_COLOR,
  TODAY_LINE_COLOR,
  BASELINE_COLOR,
  type DependencyType,
  type ScheduleItemStatus,
  type GanttZoomLevel,
  type ScheduleItem,
  type ScheduleItemWithVariance,
  type ScheduleBaseline,
  type TaskDependency,
  type CriticalPathItem,
  type GanttTask,
  type GanttConfig,
  type CreateScheduleItemDTO,
  type UpdateScheduleItemDTO,
  type CreateDependencyDTO,
  type ScheduleFilters,
  type TimelineColumn,
  type GanttViewport,
} from './schedule'

// =============================================
// Type Tests
// =============================================

describe('DependencyType', () => {
  it('should accept valid dependency types', () => {
    const fs: DependencyType = 'FS'
    const ss: DependencyType = 'SS'
    const ff: DependencyType = 'FF'
    const sf: DependencyType = 'SF'

    expect(fs).toBe('FS')
    expect(ss).toBe('SS')
    expect(ff).toBe('FF')
    expect(sf).toBe('SF')
  })
})

describe('ScheduleItemStatus', () => {
  it('should accept valid status values', () => {
    const statuses: ScheduleItemStatus[] = [
      'not_started',
      'in_progress',
      'completed',
      'delayed',
      'on_hold',
    ]

    expect(statuses).toHaveLength(5)
    expect(statuses).toContain('not_started')
    expect(statuses).toContain('in_progress')
    expect(statuses).toContain('completed')
    expect(statuses).toContain('delayed')
    expect(statuses).toContain('on_hold')
  })
})

describe('GanttZoomLevel', () => {
  it('should accept valid zoom levels', () => {
    const levels: GanttZoomLevel[] = ['day', 'week', 'month', 'quarter']

    expect(levels).toHaveLength(4)
    expect(levels).toContain('day')
    expect(levels).toContain('week')
    expect(levels).toContain('month')
    expect(levels).toContain('quarter')
  })
})

// =============================================
// Constants Tests
// =============================================

describe('DEFAULT_GANTT_CONFIG', () => {
  it('should have correct display settings', () => {
    expect(DEFAULT_GANTT_CONFIG.row_height).toBe(40)
    expect(DEFAULT_GANTT_CONFIG.bar_height).toBe(24)
    expect(DEFAULT_GANTT_CONFIG.header_height).toBe(60)
    expect(DEFAULT_GANTT_CONFIG.sidebar_width).toBe(300)
    expect(DEFAULT_GANTT_CONFIG.min_column_width).toBe(40)
  })

  it('should have Date instances for start_date and end_date', () => {
    expect(DEFAULT_GANTT_CONFIG.start_date).toBeInstanceOf(Date)
    expect(DEFAULT_GANTT_CONFIG.end_date).toBeInstanceOf(Date)
  })

  it('should default to week zoom level', () => {
    expect(DEFAULT_GANTT_CONFIG.zoom_level).toBe('week')
  })

  it('should have correct feature toggles', () => {
    expect(DEFAULT_GANTT_CONFIG.show_dependencies).toBe(true)
    expect(DEFAULT_GANTT_CONFIG.show_critical_path).toBe(true)
    expect(DEFAULT_GANTT_CONFIG.show_baseline).toBe(false)
    expect(DEFAULT_GANTT_CONFIG.show_progress).toBe(true)
    expect(DEFAULT_GANTT_CONFIG.show_milestones).toBe(true)
    expect(DEFAULT_GANTT_CONFIG.show_today_line).toBe(true)
  })

  it('should have correct interaction settings', () => {
    expect(DEFAULT_GANTT_CONFIG.allow_drag).toBe(true)
    expect(DEFAULT_GANTT_CONFIG.allow_resize).toBe(true)
    expect(DEFAULT_GANTT_CONFIG.allow_dependency_creation).toBe(false)
  })
})

describe('TASK_BAR_COLORS', () => {
  it('should have colors for all statuses', () => {
    expect(TASK_BAR_COLORS.not_started).toBeDefined()
    expect(TASK_BAR_COLORS.in_progress).toBeDefined()
    expect(TASK_BAR_COLORS.completed).toBeDefined()
    expect(TASK_BAR_COLORS.delayed).toBeDefined()
    expect(TASK_BAR_COLORS.on_hold).toBeDefined()
  })

  it('should have valid hex color format', () => {
    const hexPattern = /^#[0-9a-f]{6}$/i
    expect(TASK_BAR_COLORS.not_started).toMatch(hexPattern)
    expect(TASK_BAR_COLORS.in_progress).toMatch(hexPattern)
    expect(TASK_BAR_COLORS.completed).toMatch(hexPattern)
    expect(TASK_BAR_COLORS.delayed).toMatch(hexPattern)
    expect(TASK_BAR_COLORS.on_hold).toMatch(hexPattern)
  })

  it('should use appropriate colors for status', () => {
    // Green for completed
    expect(TASK_BAR_COLORS.completed.toLowerCase()).toBe('#22c55e')
    // Red for delayed
    expect(TASK_BAR_COLORS.delayed.toLowerCase()).toBe('#ef4444')
    // Blue for in progress
    expect(TASK_BAR_COLORS.in_progress.toLowerCase()).toBe('#3b82f6')
  })
})

describe('Color Constants', () => {
  const hexPattern = /^#[0-9a-f]{6}$/i

  it('should have valid CRITICAL_PATH_COLOR', () => {
    expect(CRITICAL_PATH_COLOR).toMatch(hexPattern)
    expect(CRITICAL_PATH_COLOR.toLowerCase()).toBe('#dc2626') // red-600
  })

  it('should have valid MILESTONE_COLOR', () => {
    expect(MILESTONE_COLOR).toMatch(hexPattern)
    expect(MILESTONE_COLOR.toLowerCase()).toBe('#8b5cf6') // violet-500
  })

  it('should have valid TODAY_LINE_COLOR', () => {
    expect(TODAY_LINE_COLOR).toMatch(hexPattern)
    expect(TODAY_LINE_COLOR.toLowerCase()).toBe('#f97316') // orange-500
  })

  it('should have valid BASELINE_COLOR', () => {
    expect(BASELINE_COLOR).toMatch(hexPattern)
    expect(BASELINE_COLOR.toLowerCase()).toBe('#6b7280') // gray-500
  })
})

// =============================================
// Interface Tests
// =============================================

describe('ScheduleItem interface', () => {
  it('should accept valid schedule item', () => {
    const item: ScheduleItem = {
      id: 'item-1',
      project_id: 'project-1',
      task_id: 'task-1',
      task_name: 'Foundation Work',
      wbs: '1.1.1',
      start_date: '2024-01-15',
      finish_date: '2024-02-15',
      baseline_start_date: '2024-01-10',
      baseline_finish_date: '2024-02-10',
      baseline_duration_days: 31,
      baseline_saved_at: '2024-01-01T00:00:00Z',
      baseline_saved_by: 'user-1',
      duration_days: 31,
      percent_complete: 50,
      predecessors: '1,2,3',
      successors: '5,6',
      is_critical: true,
      is_milestone: false,
      assigned_to: 'user-2',
      notes: 'Critical foundation phase',
      color: '#3b82f6',
      imported_at: '2024-01-01T00:00:00Z',
      last_updated_at: '2024-01-15T00:00:00Z',
      created_at: '2024-01-01T00:00:00Z',
      created_by: 'user-1',
      deleted_at: null,
    }

    expect(item.id).toBe('item-1')
    expect(item.task_name).toBe('Foundation Work')
    expect(item.is_critical).toBe(true)
    expect(item.percent_complete).toBe(50)
  })

  it('should allow null for optional fields', () => {
    const item: ScheduleItem = {
      id: 'item-1',
      project_id: 'project-1',
      task_id: null,
      task_name: 'Simple Task',
      wbs: null,
      start_date: '2024-01-15',
      finish_date: '2024-02-15',
      baseline_start_date: null,
      baseline_finish_date: null,
      baseline_duration_days: null,
      baseline_saved_at: null,
      baseline_saved_by: null,
      duration_days: 31,
      percent_complete: 0,
      predecessors: null,
      successors: null,
      is_critical: false,
      is_milestone: false,
      assigned_to: null,
      notes: null,
      color: null,
      imported_at: null,
      last_updated_at: null,
      created_at: '2024-01-01T00:00:00Z',
      created_by: null,
      deleted_at: null,
    }

    expect(item.task_id).toBeNull()
    expect(item.wbs).toBeNull()
    expect(item.baseline_start_date).toBeNull()
  })
})

describe('ScheduleItemWithVariance interface', () => {
  it('should include variance calculations', () => {
    const item: ScheduleItemWithVariance = {
      id: 'item-1',
      project_id: 'project-1',
      task_id: null,
      task_name: 'Task with Variance',
      wbs: null,
      start_date: '2024-01-20',
      finish_date: '2024-02-20',
      baseline_start_date: '2024-01-15',
      baseline_finish_date: '2024-02-15',
      baseline_duration_days: 31,
      baseline_saved_at: null,
      baseline_saved_by: null,
      duration_days: 31,
      percent_complete: 30,
      predecessors: null,
      successors: null,
      is_critical: true,
      is_milestone: false,
      assigned_to: null,
      notes: null,
      color: null,
      imported_at: null,
      last_updated_at: null,
      created_at: '2024-01-01T00:00:00Z',
      created_by: null,
      deleted_at: null,
      // Variance fields
      start_variance_days: 5,
      finish_variance_days: 5,
      duration_variance_days: 0,
      schedule_status: 'behind',
    }

    expect(item.start_variance_days).toBe(5)
    expect(item.finish_variance_days).toBe(5)
    expect(item.schedule_status).toBe('behind')
  })

  it('should accept all schedule status values', () => {
    const statuses: Array<'ahead' | 'behind' | 'on_track' | null> = [
      'ahead',
      'behind',
      'on_track',
      null,
    ]

    expect(statuses).toContain('ahead')
    expect(statuses).toContain('behind')
    expect(statuses).toContain('on_track')
    expect(statuses).toContain(null)
  })
})

describe('TaskDependency interface', () => {
  it('should accept valid task dependency', () => {
    const dependency: TaskDependency = {
      id: 'dep-1',
      project_id: 'project-1',
      predecessor_id: 'task-1',
      successor_id: 'task-2',
      dependency_type: 'FS',
      lag_days: 0,
      created_at: '2024-01-01T00:00:00Z',
      created_by: 'user-1',
    }

    expect(dependency.dependency_type).toBe('FS')
    expect(dependency.lag_days).toBe(0)
  })

  it('should support positive lag (delay)', () => {
    const dependency: TaskDependency = {
      id: 'dep-1',
      project_id: 'project-1',
      predecessor_id: 'task-1',
      successor_id: 'task-2',
      dependency_type: 'FS',
      lag_days: 5, // 5 day delay after predecessor finishes
      created_at: '2024-01-01T00:00:00Z',
      created_by: null,
    }

    expect(dependency.lag_days).toBe(5)
  })

  it('should support negative lag (lead)', () => {
    const dependency: TaskDependency = {
      id: 'dep-1',
      project_id: 'project-1',
      predecessor_id: 'task-1',
      successor_id: 'task-2',
      dependency_type: 'SS',
      lag_days: -3, // Successor starts 3 days before predecessor
      created_at: '2024-01-01T00:00:00Z',
      created_by: null,
    }

    expect(dependency.lag_days).toBe(-3)
  })
})

describe('CriticalPathItem interface', () => {
  it('should include slack calculations', () => {
    const cpItem: CriticalPathItem = {
      id: 'cp-1',
      project_id: 'project-1',
      schedule_item_id: 'item-1',
      earliest_start: '2024-01-15',
      earliest_finish: '2024-02-15',
      latest_start: '2024-01-15',
      latest_finish: '2024-02-15',
      total_slack_days: 0,
      free_slack_days: 0,
      is_critical: true,
      calculated_at: '2024-01-01T00:00:00Z',
    }

    expect(cpItem.total_slack_days).toBe(0)
    expect(cpItem.free_slack_days).toBe(0)
    expect(cpItem.is_critical).toBe(true)
  })

  it('should identify non-critical items with slack', () => {
    const cpItem: CriticalPathItem = {
      id: 'cp-2',
      project_id: 'project-1',
      schedule_item_id: 'item-2',
      earliest_start: '2024-01-15',
      earliest_finish: '2024-01-20',
      latest_start: '2024-01-25',
      latest_finish: '2024-01-30',
      total_slack_days: 10,
      free_slack_days: 5,
      is_critical: false,
      calculated_at: '2024-01-01T00:00:00Z',
    }

    expect(cpItem.total_slack_days).toBe(10)
    expect(cpItem.is_critical).toBe(false)
  })
})

describe('GanttConfig interface', () => {
  it('should allow custom configuration', () => {
    const config: GanttConfig = {
      row_height: 50,
      bar_height: 30,
      header_height: 80,
      sidebar_width: 400,
      min_column_width: 60,
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-12-31'),
      zoom_level: 'month',
      show_dependencies: true,
      show_critical_path: true,
      show_baseline: true,
      show_progress: true,
      show_milestones: true,
      show_today_line: true,
      allow_drag: true,
      allow_resize: true,
      allow_dependency_creation: true,
    }

    expect(config.row_height).toBe(50)
    expect(config.zoom_level).toBe('month')
    expect(config.show_baseline).toBe(true)
    expect(config.allow_dependency_creation).toBe(true)
  })
})

// =============================================
// DTO Tests
// =============================================

describe('CreateScheduleItemDTO', () => {
  it('should accept minimal required fields', () => {
    const dto: CreateScheduleItemDTO = {
      project_id: 'project-1',
      task_name: 'New Task',
      start_date: '2024-01-15',
      finish_date: '2024-02-15',
    }

    expect(dto.project_id).toBe('project-1')
    expect(dto.task_name).toBe('New Task')
  })

  it('should accept all optional fields', () => {
    const dto: CreateScheduleItemDTO = {
      project_id: 'project-1',
      task_name: 'Complete Task',
      start_date: '2024-01-15',
      finish_date: '2024-02-15',
      duration_days: 31,
      percent_complete: 0,
      is_milestone: false,
      assigned_to: 'user-1',
      notes: 'Important task',
      color: '#3b82f6',
      wbs: '1.1.1',
      parent_id: 'parent-task-1',
    }

    expect(dto.duration_days).toBe(31)
    expect(dto.is_milestone).toBe(false)
    expect(dto.parent_id).toBe('parent-task-1')
  })
})

describe('UpdateScheduleItemDTO', () => {
  it('should allow partial updates', () => {
    const dto: UpdateScheduleItemDTO = {
      percent_complete: 75,
    }

    expect(dto.percent_complete).toBe(75)
    expect(dto.task_name).toBeUndefined()
  })

  it('should allow updating critical flag', () => {
    const dto: UpdateScheduleItemDTO = {
      is_critical: true,
    }

    expect(dto.is_critical).toBe(true)
  })
})

describe('CreateDependencyDTO', () => {
  it('should accept required fields', () => {
    const dto: CreateDependencyDTO = {
      project_id: 'project-1',
      predecessor_id: 'task-1',
      successor_id: 'task-2',
    }

    expect(dto.project_id).toBe('project-1')
    expect(dto.dependency_type).toBeUndefined()
    expect(dto.lag_days).toBeUndefined()
  })

  it('should accept optional dependency type and lag', () => {
    const dto: CreateDependencyDTO = {
      project_id: 'project-1',
      predecessor_id: 'task-1',
      successor_id: 'task-2',
      dependency_type: 'SS',
      lag_days: 2,
    }

    expect(dto.dependency_type).toBe('SS')
    expect(dto.lag_days).toBe(2)
  })
})

describe('ScheduleFilters', () => {
  it('should accept filter options', () => {
    const filters: ScheduleFilters = {
      project_id: 'project-1',
      show_completed: false,
      show_milestones_only: true,
      assigned_to: 'user-1',
      date_from: '2024-01-01',
      date_to: '2024-12-31',
      search: 'foundation',
      critical_only: true,
    }

    expect(filters.project_id).toBe('project-1')
    expect(filters.critical_only).toBe(true)
  })
})

describe('TimelineColumn', () => {
  it('should represent a timeline column', () => {
    const column: TimelineColumn = {
      date: new Date('2024-01-15'),
      label: 'Jan 15',
      sub_label: 'Mon',
      width: 40,
      is_weekend: false,
      is_today: true,
    }

    expect(column.label).toBe('Jan 15')
    expect(column.is_today).toBe(true)
    expect(column.is_weekend).toBe(false)
  })
})

describe('GanttViewport', () => {
  it('should track viewport state', () => {
    const viewport: GanttViewport = {
      scroll_x: 100,
      scroll_y: 200,
      visible_start_date: new Date('2024-01-01'),
      visible_end_date: new Date('2024-03-31'),
      visible_row_start: 0,
      visible_row_end: 20,
    }

    expect(viewport.scroll_x).toBe(100)
    expect(viewport.visible_row_end).toBe(20)
  })
})

// =============================================
// GanttTask Extended Tests
// =============================================

describe('GanttTask interface', () => {
  it('should include computed display properties', () => {
    const task: GanttTask = {
      // Base ScheduleItem fields
      id: 'task-1',
      project_id: 'project-1',
      task_id: null,
      task_name: 'Gantt Task',
      wbs: '1.1',
      start_date: '2024-01-15',
      finish_date: '2024-02-15',
      baseline_start_date: null,
      baseline_finish_date: null,
      baseline_duration_days: null,
      baseline_saved_at: null,
      baseline_saved_by: null,
      duration_days: 31,
      percent_complete: 50,
      predecessors: null,
      successors: null,
      is_critical: true,
      is_milestone: false,
      assigned_to: null,
      notes: null,
      color: null,
      imported_at: null,
      last_updated_at: null,
      created_at: '2024-01-01T00:00:00Z',
      created_by: null,
      deleted_at: null,
      // GanttTask computed fields
      x: 100,
      y: 40,
      width: 200,
      height: 24,
      progress_width: 100,
      level: 0,
      parent_id: null,
      children: [],
      is_expanded: true,
      dependencies: [],
      computed_status: 'in_progress',
      days_remaining: 15,
      is_overdue: false,
    }

    expect(task.x).toBe(100)
    expect(task.width).toBe(200)
    expect(task.progress_width).toBe(100)
    expect(task.computed_status).toBe('in_progress')
    expect(task.is_overdue).toBe(false)
  })

  it('should support hierarchical tasks', () => {
    const childTask: GanttTask = {
      id: 'task-2',
      project_id: 'project-1',
      task_id: null,
      task_name: 'Child Task',
      wbs: '1.1.1',
      start_date: '2024-01-20',
      finish_date: '2024-02-10',
      baseline_start_date: null,
      baseline_finish_date: null,
      baseline_duration_days: null,
      baseline_saved_at: null,
      baseline_saved_by: null,
      duration_days: 21,
      percent_complete: 25,
      predecessors: null,
      successors: null,
      is_critical: false,
      is_milestone: false,
      assigned_to: null,
      notes: null,
      color: null,
      imported_at: null,
      last_updated_at: null,
      created_at: '2024-01-01T00:00:00Z',
      created_by: null,
      deleted_at: null,
      x: 150,
      y: 80,
      width: 150,
      height: 24,
      progress_width: 37,
      level: 1,
      parent_id: 'task-1',
      children: [],
      is_expanded: true,
      dependencies: [],
      computed_status: 'in_progress',
      days_remaining: 20,
      is_overdue: false,
    }

    expect(childTask.level).toBe(1)
    expect(childTask.parent_id).toBe('task-1')
  })
})

// =============================================
// ScheduleBaseline Tests
// =============================================

describe('ScheduleBaseline interface', () => {
  it('should represent a saved baseline', () => {
    const baseline: ScheduleBaseline = {
      id: 'baseline-1',
      project_id: 'project-1',
      name: 'Original Plan',
      description: 'Initial project schedule baseline',
      saved_at: '2024-01-01T00:00:00Z',
      saved_by: 'user-1',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
    }

    expect(baseline.name).toBe('Original Plan')
    expect(baseline.is_active).toBe(true)
  })
})
