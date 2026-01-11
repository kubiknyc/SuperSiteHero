/**
 * Task Scheduler
 * Schedule recurring tasks like daily reports and weekly digests
 */

import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/utils/logger'
import { taskService } from '../services/task-service'
import type { TaskType, TaskTriggerConfig } from '../types/tasks'

// ============================================================================
// Types
// ============================================================================

export interface ScheduledJob {
  id: string
  name: string
  description: string
  taskType: TaskType
  schedule: ScheduleConfig
  isEnabled: boolean
  lastRunAt: string | null
  nextRunAt: string | null
  config: Record<string, unknown>
}

export interface ScheduleConfig {
  /** Cron expression (simplified - for exact scheduling use Supabase pg_cron) */
  type: 'daily' | 'weekly' | 'monthly' | 'custom'
  /** Time of day to run (HH:MM format) */
  time: string
  /** Days to run on (1=Monday, 7=Sunday) - for weekly schedules */
  days?: number[]
  /** Day of month - for monthly schedules */
  dayOfMonth?: number
  /** Timezone */
  timezone?: string
}

interface SchedulerState {
  isRunning: boolean
  scheduledJobs: Map<string, ScheduledJob>
  timers: Map<string, ReturnType<typeof setTimeout>>
}

// ============================================================================
// Default Scheduled Jobs
// ============================================================================

const DEFAULT_JOBS: Omit<ScheduledJob, 'id' | 'lastRunAt' | 'nextRunAt'>[] = [
  {
    name: 'Daily Report Digest',
    description: 'Generate daily summary of all reports across active projects',
    taskType: 'report_daily_digest',
    schedule: {
      type: 'daily',
      time: '18:00',
      timezone: 'America/New_York',
    },
    isEnabled: true,
    config: {
      includeAllProjects: true,
      sendNotifications: true,
    },
  },
  {
    name: 'Weekly Project Rollup',
    description: 'Generate weekly status rollup for each active project',
    taskType: 'report_weekly_rollup',
    schedule: {
      type: 'weekly',
      time: '09:00',
      days: [1], // Monday
      timezone: 'America/New_York',
    },
    isEnabled: true,
    config: {
      includeMetrics: true,
      sendToStakeholders: true,
    },
  },
  {
    name: 'Pending Document Processing',
    description: 'Process any unprocessed documents uploaded in the last 24 hours',
    taskType: 'document_batch_process',
    schedule: {
      type: 'daily',
      time: '02:00',
      timezone: 'America/New_York',
    },
    isEnabled: true,
    config: {
      lookbackHours: 24,
      maxDocuments: 100,
    },
  },
  {
    name: 'Old Task Cleanup',
    description: 'Clean up completed/failed tasks older than 30 days',
    taskType: 'scheduled_cleanup',
    schedule: {
      type: 'weekly',
      time: '03:00',
      days: [7], // Sunday
      timezone: 'America/New_York',
    },
    isEnabled: true,
    config: {
      retentionDays: 30,
    },
  },
]

// ============================================================================
// Task Scheduler Class
// ============================================================================

export class TaskScheduler {
  private state: SchedulerState = {
    isRunning: false,
    scheduledJobs: new Map(),
    timers: new Map(),
  }

  private companyId: string | null = null
  private checkInterval: ReturnType<typeof setInterval> | null = null

  /**
   * Initialize the scheduler
   */
  async initialize(companyId: string): Promise<void> {
    this.companyId = companyId
    await this.loadScheduledJobs()
    logger.info('[Scheduler] Initialized with', this.state.scheduledJobs.size, 'jobs')
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.state.isRunning) {
      logger.warn('[Scheduler] Already running')
      return
    }

    logger.info('[Scheduler] Starting scheduler')
    this.state.isRunning = true

    // Schedule all enabled jobs
    for (const [jobId, job] of this.state.scheduledJobs) {
      if (job.isEnabled) {
        this.scheduleJob(job)
      }
    }

    // Check for missed jobs periodically
    this.checkInterval = setInterval(() => this.checkMissedJobs(), 60000) // Every minute
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.state.isRunning) {return}

    logger.info('[Scheduler] Stopping scheduler')
    this.state.isRunning = false

    // Clear all timers
    for (const timer of this.state.timers.values()) {
      clearTimeout(timer)
    }
    this.state.timers.clear()

    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }

  /**
   * Get current state
   */
  getState(): { isRunning: boolean; jobs: ScheduledJob[] } {
    return {
      isRunning: this.state.isRunning,
      jobs: Array.from(this.state.scheduledJobs.values()),
    }
  }

  // ============================================================================
  // Job Management
  // ============================================================================

  /**
   * Load scheduled jobs from database or defaults
   */
  private async loadScheduledJobs(): Promise<void> {
    // For now, use default jobs
    // In production, these would be stored in the database
    for (const jobConfig of DEFAULT_JOBS) {
      const job: ScheduledJob = {
        ...jobConfig,
        id: crypto.randomUUID(),
        lastRunAt: null,
        nextRunAt: this.calculateNextRunTime(jobConfig.schedule),
      }
      this.state.scheduledJobs.set(job.id, job)
    }
  }

  /**
   * Add a new scheduled job
   */
  addJob(
    name: string,
    taskType: TaskType,
    schedule: ScheduleConfig,
    config: Record<string, unknown> = {}
  ): ScheduledJob {
    const job: ScheduledJob = {
      id: crypto.randomUUID(),
      name,
      description: '',
      taskType,
      schedule,
      isEnabled: true,
      lastRunAt: null,
      nextRunAt: this.calculateNextRunTime(schedule),
      config,
    }

    this.state.scheduledJobs.set(job.id, job)

    if (this.state.isRunning && job.isEnabled) {
      this.scheduleJob(job)
    }

    logger.info('[Scheduler] Added job:', name)
    return job
  }

  /**
   * Remove a scheduled job
   */
  removeJob(jobId: string): boolean {
    const timer = this.state.timers.get(jobId)
    if (timer) {
      clearTimeout(timer)
      this.state.timers.delete(jobId)
    }

    return this.state.scheduledJobs.delete(jobId)
  }

  /**
   * Enable/disable a job
   */
  setJobEnabled(jobId: string, enabled: boolean): void {
    const job = this.state.scheduledJobs.get(jobId)
    if (!job) {return}

    job.isEnabled = enabled

    if (enabled && this.state.isRunning) {
      this.scheduleJob(job)
    } else {
      const timer = this.state.timers.get(jobId)
      if (timer) {
        clearTimeout(timer)
        this.state.timers.delete(jobId)
      }
    }
  }

  /**
   * Get a specific job
   */
  getJob(jobId: string): ScheduledJob | undefined {
    return this.state.scheduledJobs.get(jobId)
  }

  /**
   * Update job schedule
   */
  updateJobSchedule(jobId: string, schedule: ScheduleConfig): void {
    const job = this.state.scheduledJobs.get(jobId)
    if (!job) {return}

    job.schedule = schedule
    job.nextRunAt = this.calculateNextRunTime(schedule)

    // Reschedule if running
    if (this.state.isRunning && job.isEnabled) {
      const timer = this.state.timers.get(jobId)
      if (timer) {
        clearTimeout(timer)
      }
      this.scheduleJob(job)
    }
  }

  // ============================================================================
  // Scheduling Logic
  // ============================================================================

  /**
   * Schedule a job to run at its next scheduled time
   */
  private scheduleJob(job: ScheduledJob): void {
    const nextRun = this.calculateNextRunTime(job.schedule)
    if (!nextRun) {
      logger.warn('[Scheduler] Could not calculate next run time for job:', job.name)
      return
    }

    job.nextRunAt = nextRun
    const delay = new Date(nextRun).getTime() - Date.now()

    if (delay <= 0) {
      // Run immediately if past due
      this.executeJob(job)
      return
    }

    // Cap delay at 24 hours to avoid JavaScript setTimeout limits
    const maxDelay = 24 * 60 * 60 * 1000 // 24 hours
    const actualDelay = Math.min(delay, maxDelay)

    const timer = setTimeout(() => {
      if (delay > maxDelay) {
        // Reschedule for another check
        this.scheduleJob(job)
      } else {
        this.executeJob(job)
      }
    }, actualDelay)

    this.state.timers.set(job.id, timer)
    logger.debug(`[Scheduler] Job "${job.name}" scheduled for ${nextRun}`)
  }

  /**
   * Execute a scheduled job
   */
  private async executeJob(job: ScheduledJob): Promise<void> {
    logger.info(`[Scheduler] Executing job: ${job.name}`)

    try {
      // Get active projects for company
      const projects = await this.getActiveProjects()

      if (job.config.includeAllProjects && projects.length > 0) {
        // Create task for each project
        for (const project of projects) {
          await taskService.create({
            task_type: job.taskType,
            project_id: project.id,
            priority: 50, // Higher priority for scheduled tasks
            input_data: {
              ...job.config,
              scheduled_job_id: job.id,
              scheduled_job_name: job.name,
            },
          })
        }
        logger.info(`[Scheduler] Created ${projects.length} tasks for job: ${job.name}`)
      } else {
        // Create single task
        await taskService.create({
          task_type: job.taskType,
          priority: 50,
          input_data: {
            ...job.config,
            scheduled_job_id: job.id,
            scheduled_job_name: job.name,
          },
        })
        logger.info(`[Scheduler] Created task for job: ${job.name}`)
      }

      // Update job state
      job.lastRunAt = new Date().toISOString()
      job.nextRunAt = this.calculateNextRunTime(job.schedule)

      // Schedule next run
      if (this.state.isRunning && job.isEnabled) {
        this.scheduleJob(job)
      }
    } catch (error) {
      logger.error(`[Scheduler] Error executing job ${job.name}:`, error)
    }
  }

  /**
   * Calculate the next run time for a schedule
   */
  private calculateNextRunTime(schedule: ScheduleConfig): string {
    const now = new Date()
    const [hours, minutes] = schedule.time.split(':').map(Number)

    const nextRun = new Date(now)
    nextRun.setHours(hours, minutes, 0, 0)

    // If the time has already passed today, start from tomorrow
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1)
    }

    switch (schedule.type) {
      case 'daily':
        // Already set for next occurrence
        break

      case 'weekly':
        if (schedule.days && schedule.days.length > 0) {
          // Find the next valid day
          const currentDay = nextRun.getDay() || 7 // Convert Sunday from 0 to 7
          let daysToAdd = 0
          let found = false

          for (let i = 0; i < 7; i++) {
            const checkDay = ((currentDay + i - 1) % 7) + 1
            if (schedule.days.includes(checkDay)) {
              daysToAdd = i
              found = true
              break
            }
          }

          if (!found) {
            // Default to next week's first scheduled day
            daysToAdd = 7 - currentDay + schedule.days[0]
          }

          nextRun.setDate(nextRun.getDate() + daysToAdd)
        }
        break

      case 'monthly':
        if (schedule.dayOfMonth) {
          nextRun.setDate(schedule.dayOfMonth)
          if (nextRun <= now) {
            nextRun.setMonth(nextRun.getMonth() + 1)
          }
        }
        break

      case 'custom':
        // For custom schedules, would need cron parsing
        // For now, default to daily
        break
    }

    return nextRun.toISOString()
  }

  /**
   * Check for missed jobs and run them
   */
  private async checkMissedJobs(): Promise<void> {
    const now = new Date()

    for (const [jobId, job] of this.state.scheduledJobs) {
      if (!job.isEnabled || !job.nextRunAt) {continue}

      const nextRun = new Date(job.nextRunAt)
      if (nextRun < now && !this.state.timers.has(jobId)) {
        logger.info(`[Scheduler] Found missed job: ${job.name}`)
        await this.executeJob(job)
      }
    }
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  /**
   * Get active projects for the company
   */
  private async getActiveProjects(): Promise<Array<{ id: string; name: string }>> {
    if (!this.companyId) {return []}

    const { data, error } = await supabase
      .from('projects')
      .select('id, name')
      .eq('company_id', this.companyId)
      .eq('status', 'active')

    if (error) {
      logger.error('[Scheduler] Error fetching projects:', error)
      return []
    }

    return data || []
  }

  /**
   * Trigger a job to run immediately
   */
  async triggerJobNow(jobId: string): Promise<void> {
    const job = this.state.scheduledJobs.get(jobId)
    if (!job) {
      throw new Error(`Job not found: ${jobId}`)
    }

    await this.executeJob(job)
  }

  /**
   * Get upcoming jobs for the next N hours
   */
  getUpcomingJobs(hoursAhead: number = 24): ScheduledJob[] {
    const cutoff = new Date()
    cutoff.setHours(cutoff.getHours() + hoursAhead)

    return Array.from(this.state.scheduledJobs.values())
      .filter((job) => {
        if (!job.isEnabled || !job.nextRunAt) {return false}
        const nextRun = new Date(job.nextRunAt)
        return nextRun <= cutoff
      })
      .sort((a, b) => {
        if (!a.nextRunAt) {return 1}
        if (!b.nextRunAt) {return -1}
        return new Date(a.nextRunAt).getTime() - new Date(b.nextRunAt).getTime()
      })
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const taskScheduler = new TaskScheduler()

// ============================================================================
// Re-exports
// ============================================================================

export type { ScheduleConfig }
