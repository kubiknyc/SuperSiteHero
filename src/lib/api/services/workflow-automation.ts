/**
 * Workflow Automation API Service
 * Phase 5: Field Workflow Automation
 *
 * Provides API methods for:
 * - Escalation Rules management
 * - Escalation Events tracking
 * - Auto-escalation triggering
 */

import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/utils/logger'
import type {
  EscalationRule,
  EscalationEvent,
  CreateEscalationRuleInput,
  UpdateEscalationRuleInput,
  EscalationEventFilters,
  EscalationSourceType,
  TriggerCondition,
  ActionConfig,
} from '@/types/workflow-automation'

// ============================================================================
// Escalation Rules API
// ============================================================================

export const escalationRulesApi = {
  /**
   * Get all escalation rules for a project or company
   */
  async getRules(params: {
    projectId?: string;
    companyId?: string;
    sourceType?: EscalationSourceType;
    activeOnly?: boolean;
  }): Promise<EscalationRule[]> {
    let query = supabase
      .from('escalation_rules')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })

    if (params.projectId) {
      query = query.eq('project_id', params.projectId)
    }

    if (params.companyId) {
      query = query.eq('company_id', params.companyId)
    }

    if (params.sourceType) {
      query = query.eq('source_type', params.sourceType)
    }

    if (params.activeOnly !== false) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      logger.error('[WorkflowAutomation] Error fetching rules:', error)
      throw error
    }

    return data || []
  },

  /**
   * Get active rules for a specific source type
   */
  async getActiveRules(
    projectId: string,
    sourceType: EscalationSourceType
  ): Promise<EscalationRule[]> {
    const { data, error } = await supabase
      .from('escalation_rules')
      .select('*')
      .or(`project_id.eq.${projectId},project_id.is.null`)
      .eq('source_type', sourceType)
      .eq('is_active', true)
      .order('priority', { ascending: false })

    if (error) {
      logger.error('[WorkflowAutomation] Error fetching active rules:', error)
      throw error
    }

    return data || []
  },

  /**
   * Get a single rule by ID
   */
  async getRule(ruleId: string): Promise<EscalationRule> {
    const { data, error } = await supabase
      .from('escalation_rules')
      .select('*')
      .eq('id', ruleId)
      .single()

    if (error) {
      logger.error('[WorkflowAutomation] Error fetching rule:', error)
      throw error
    }

    return data
  },

  /**
   * Create a new escalation rule
   */
  async createRule(input: CreateEscalationRuleInput): Promise<EscalationRule> {
    const { data: user } = await supabase.auth.getUser()

    const ruleData = {
      project_id: input.project_id || null,
      company_id: input.company_id || null,
      name: input.name,
      description: input.description || null,
      source_type: input.source_type,
      trigger_condition: input.trigger_condition,
      action_type: input.action_type,
      action_config: input.action_config,
      is_active: input.is_active ?? true,
      priority: input.priority ?? 0,
      execution_delay_minutes: input.execution_delay_minutes ?? 0,
      created_by: user?.user?.id || null,
    }

    const { data, error } = await supabase
      .from('escalation_rules')
      .insert(ruleData)
      .select()
      .single()

    if (error) {
      logger.error('[WorkflowAutomation] Error creating rule:', error)
      throw error
    }

    logger.info('[WorkflowAutomation] Created escalation rule:', data.id)
    return data
  },

  /**
   * Update an escalation rule
   */
  async updateRule(
    ruleId: string,
    updates: UpdateEscalationRuleInput
  ): Promise<EscalationRule> {
    const { data, error } = await supabase
      .from('escalation_rules')
      .update(updates)
      .eq('id', ruleId)
      .select()
      .single()

    if (error) {
      logger.error('[WorkflowAutomation] Error updating rule:', error)
      throw error
    }

    return data
  },

  /**
   * Toggle rule active status
   */
  async toggleRule(ruleId: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('escalation_rules')
      .update({ is_active: isActive })
      .eq('id', ruleId)

    if (error) {
      logger.error('[WorkflowAutomation] Error toggling rule:', error)
      throw error
    }
  },

  /**
   * Delete an escalation rule
   */
  async deleteRule(ruleId: string): Promise<void> {
    const { error } = await supabase
      .from('escalation_rules')
      .delete()
      .eq('id', ruleId)

    if (error) {
      logger.error('[WorkflowAutomation] Error deleting rule:', error)
      throw error
    }
  },
}

// ============================================================================
// Escalation Events API
// ============================================================================

export const escalationEventsApi = {
  /**
   * Get escalation events with filters
   */
  async getEvents(filters: EscalationEventFilters): Promise<EscalationEvent[]> {
    let query = supabase
      .from('escalation_events')
      .select(`
        *,
        rule:escalation_rules(id, name, action_type)
      `)
      .order('triggered_at', { ascending: false })

    if (filters.project_id) {
      query = query.eq('project_id', filters.project_id)
    }

    if (filters.rule_id) {
      query = query.eq('rule_id', filters.rule_id)
    }

    if (filters.source_type) {
      query = query.eq('source_type', filters.source_type)
    }

    if (filters.source_id) {
      query = query.eq('source_id', filters.source_id)
    }

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.from_date) {
      query = query.gte('triggered_at', filters.from_date)
    }

    if (filters.to_date) {
      query = query.lte('triggered_at', filters.to_date)
    }

    const { data, error } = await query.limit(100)

    if (error) {
      logger.error('[WorkflowAutomation] Error fetching events:', error)
      throw error
    }

    return data || []
  },

  /**
   * Get pending events that are ready for execution
   */
  async getPendingEvents(): Promise<EscalationEvent[]> {
    const { data, error } = await supabase
      .from('escalation_events')
      .select('*')
      .eq('status', 'pending')
      .or(`scheduled_for.is.null,scheduled_for.lte.${new Date().toISOString()}`)
      .order('triggered_at', { ascending: true })
      .limit(50)

    if (error) {
      logger.error('[WorkflowAutomation] Error fetching pending events:', error)
      throw error
    }

    return data || []
  },

  /**
   * Create an escalation event
   */
  async createEvent(event: Omit<EscalationEvent, 'id' | 'created_at'>): Promise<EscalationEvent> {
    const { data, error } = await supabase
      .from('escalation_events')
      .insert(event)
      .select()
      .single()

    if (error) {
      logger.error('[WorkflowAutomation] Error creating event:', error)
      throw error
    }

    return data
  },

  /**
   * Update event status
   */
  async updateEventStatus(
    eventId: string,
    status: EscalationEvent['status'],
    result?: { result_type?: string; result_id?: string; error_message?: string }
  ): Promise<void> {
    const updateData: Partial<EscalationEvent> = {
      status,
      ...(status === 'executed' ? { executed_at: new Date().toISOString() } : {}),
      ...result,
    }

    const { error } = await supabase
      .from('escalation_events')
      .update(updateData)
      .eq('id', eventId)

    if (error) {
      logger.error('[WorkflowAutomation] Error updating event status:', error)
      throw error
    }
  },
}

// ============================================================================
// Auto-Escalation Engine
// ============================================================================

export const autoEscalationEngine = {
  /**
   * Evaluate if a condition matches the source data
   */
  evaluateCondition(
    condition: TriggerCondition,
    sourceData: Record<string, unknown>
  ): boolean {
    // Handle empty condition
    if (!condition || Object.keys(condition).length === 0) {
      return true
    }

    // Handle AND conditions
    if ('and' in condition && condition.and) {
      return condition.and.every((c) => this.evaluateCondition(c, sourceData))
    }

    // Handle OR conditions
    if ('or' in condition && condition.or) {
      return condition.or.some((c) => this.evaluateCondition(c, sourceData))
    }

    // Simple condition
    if ('field' in condition) {
      const { field, operator, value } = condition
      const actualValue = sourceData[field]

      switch (operator) {
        case 'equals':
        case 'eq':
          return actualValue === value

        case 'not_equals':
        case 'neq':
          return actualValue !== value

        case 'greater_than':
        case 'gt':
          return Number(actualValue) > Number(value)

        case 'greater_or_equal':
        case 'gte':
          return Number(actualValue) >= Number(value)

        case 'less_than':
        case 'lt':
          return Number(actualValue) < Number(value)

        case 'less_or_equal':
        case 'lte':
          return Number(actualValue) <= Number(value)

        case 'contains':
          return String(actualValue).toLowerCase().includes(String(value).toLowerCase())

        case 'in':
          return Array.isArray(value) && value.includes(actualValue)

        case 'not_in':
          return Array.isArray(value) && !value.includes(actualValue)

        case 'is_null':
          return actualValue === null || actualValue === undefined

        case 'is_not_null':
          return actualValue !== null && actualValue !== undefined

        default:
          return true
      }
    }

    return true
  },

  /**
   * Trigger auto-escalation for a source item
   * This checks all matching rules and creates events for any that match
   */
  async triggerAutoEscalation(params: {
    projectId: string;
    sourceType: EscalationSourceType;
    sourceId: string;
    sourceData: Record<string, unknown>;
    triggeredBy?: string;
  }): Promise<EscalationEvent[]> {
    const { projectId, sourceType, sourceId, sourceData, triggeredBy } = params

    // Get all active rules for this source type
    const rules = await escalationRulesApi.getActiveRules(projectId, sourceType)

    if (rules.length === 0) {
      logger.debug('[AutoEscalation] No active rules found for', sourceType)
      return []
    }

    const createdEvents: EscalationEvent[] = []

    for (const rule of rules) {
      try {
        // Check if condition matches
        if (!this.evaluateCondition(rule.trigger_condition, sourceData)) {
          continue
        }

        logger.info('[AutoEscalation] Rule matched:', rule.name, 'for', sourceId)

        // Calculate scheduled execution time
        const scheduledFor = rule.execution_delay_minutes > 0
          ? new Date(Date.now() + rule.execution_delay_minutes * 60 * 1000).toISOString()
          : null

        // Create the escalation event
        const event = await escalationEventsApi.createEvent({
          rule_id: rule.id,
          source_type: sourceType,
          source_id: sourceId,
          source_data: sourceData,
          result_type: null,
          result_id: null,
          status: scheduledFor ? 'pending' : 'pending', // Will be executed immediately if no delay
          error_message: null,
          triggered_at: new Date().toISOString(),
          scheduled_for: scheduledFor,
          executed_at: null,
          project_id: projectId,
          triggered_by: triggeredBy || null,
        })

        createdEvents.push(event)

        // If no delay, execute immediately
        if (!scheduledFor) {
          try {
            const result = await this.executeAction(rule, event, sourceData)
            await escalationEventsApi.updateEventStatus(event.id, 'executed', result)
          } catch (execError) {
            logger.error('[AutoEscalation] Error executing action:', execError)
            await escalationEventsApi.updateEventStatus(event.id, 'failed', {
              error_message: execError instanceof Error ? execError.message : 'Unknown error',
            })
          }
        }
      } catch (error) {
        logger.error('[AutoEscalation] Error processing rule:', rule.id, error)
      }
    }

    return createdEvents
  },

  /**
   * Execute the action defined in a rule
   */
  async executeAction(
    rule: EscalationRule,
    event: EscalationEvent,
    sourceData: Record<string, unknown>
  ): Promise<{ result_type?: string; result_id?: string }> {
    const config = rule.action_config as ActionConfig

    switch (rule.action_type) {
      case 'create_punch_item':
        return await this.executeCreatePunchItem(
          event.project_id!,
          config as any,
          sourceData
        )

      case 'create_task':
        return await this.executeCreateTask(
          event.project_id!,
          config as any,
          sourceData
        )

      case 'send_notification':
        await this.executeSendNotification(
          event.project_id!,
          config as any,
          sourceData
        )
        return { result_type: 'notification' }

      case 'change_status':
        await this.executeChangeStatus(
          event.source_type,
          event.source_id,
          config as any
        )
        return { result_type: 'status_change' }

      default:
        logger.warn('[AutoEscalation] Unhandled action type:', rule.action_type)
        return {}
    }
  },

  /**
   * Execute create punch item action
   */
  async executeCreatePunchItem(
    projectId: string,
    config: {
      priority?: string;
      trade?: string;
      title_template?: string;
      description_template?: string;
      due_days?: number;
    },
    sourceData: Record<string, unknown>
  ): Promise<{ result_type: string; result_id: string }> {
    const title = this.interpolateTemplate(
      config.title_template || 'Auto-created from {{source_type}}: {{title}}',
      sourceData
    )
    const description = this.interpolateTemplate(
      config.description_template || 'Automatically created by escalation rule.\n\nSource: {{source_type}}\nID: {{id}}',
      sourceData
    )

    const dueDate = config.due_days
      ? new Date(Date.now() + config.due_days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : null

    const { data: user } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('punch_items')
      .insert({
        project_id: projectId,
        title: title.substring(0, 200),
        description,
        trade: config.trade || 'General',
        priority: config.priority || 'normal',
        status: 'open',
        due_date: dueDate,
        created_by: user?.user?.id,
      })
      .select('id')
      .single()

    if (error) {throw error}

    logger.info('[AutoEscalation] Created punch item:', data.id)
    return { result_type: 'punch_item', result_id: data.id }
  },

  /**
   * Execute create task action
   */
  async executeCreateTask(
    projectId: string,
    config: {
      priority?: string;
      title_template?: string;
      description_template?: string;
      due_days?: number;
    },
    sourceData: Record<string, unknown>
  ): Promise<{ result_type: string; result_id: string }> {
    const title = this.interpolateTemplate(
      config.title_template || 'Auto-created from {{source_type}}: {{title}}',
      sourceData
    )
    const description = this.interpolateTemplate(
      config.description_template || 'Automatically created by escalation rule.\n\nSource: {{source_type}}\nID: {{id}}',
      sourceData
    )

    const dueDate = config.due_days
      ? new Date(Date.now() + config.due_days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : null

    const { data: user } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        project_id: projectId,
        title: title.substring(0, 200),
        description,
        priority: config.priority || 'normal',
        status: 'pending',
        due_date: dueDate,
        created_by: user?.user?.id,
      })
      .select('id')
      .single()

    if (error) {throw error}

    logger.info('[AutoEscalation] Created task:', data.id)
    return { result_type: 'task', result_id: data.id }
  },

  /**
   * Execute send notification action
   */
  async executeSendNotification(
    projectId: string,
    config: {
      recipients: string[];
      subject_template?: string;
      body_template?: string;
      channels?: string[];
    },
    sourceData: Record<string, unknown>
  ): Promise<void> {
    // Get recipients (resolve role-based recipients)
    const recipientIds: string[] = []

    for (const recipient of config.recipients) {
      if (recipient.startsWith('role:')) {
        const role = recipient.replace('role:', '')
        const { data: users } = await supabase
          .from('project_users')
          .select('user_id')
          .eq('project_id', projectId)
          .eq('project_role', role)

        if (users) {
          recipientIds.push(...users.map((u) => u.user_id))
        }
      } else {
        recipientIds.push(recipient)
      }
    }

    if (recipientIds.length === 0) {
      logger.warn('[AutoEscalation] No recipients for notification')
      return
    }

    const subject = this.interpolateTemplate(
      config.subject_template || 'Escalation Alert: {{source_type}}',
      sourceData
    )
    const body = this.interpolateTemplate(
      config.body_template || 'An escalation has been triggered for {{source_type}} "{{title}}".',
      sourceData
    )

    // Create in-app notifications
    const { data: user } = await supabase.auth.getUser()

    const notifications = recipientIds.map((userId) => ({
      user_id: userId,
      title: subject,
      message: body,
      type: 'escalation',
      reference_type: sourceData.source_type as string,
      reference_id: sourceData.id as string,
      created_by: user?.user?.id,
    }))

    const { error } = await supabase.from('notifications').insert(notifications)

    if (error) {
      logger.error('[AutoEscalation] Error creating notifications:', error)
    } else {
      logger.info('[AutoEscalation] Created', notifications.length, 'notifications')
    }
  },

  /**
   * Execute change status action
   */
  async executeChangeStatus(
    sourceType: string,
    sourceId: string,
    config: { new_status: string }
  ): Promise<void> {
    const tableMap: Record<string, string> = {
      inspection: 'inspections',
      checklist: 'checklist_executions',
      punch_item: 'punch_items',
      rfi: 'rfis',
      submittal: 'submittals',
      task: 'tasks',
    }

    const table = tableMap[sourceType]
    if (!table) {
      throw new Error(`Unknown source type for status change: ${sourceType}`)
    }

    const { error } = await supabase
      .from(table)
      .update({ status: config.new_status })
      .eq('id', sourceId)

    if (error) {throw error}

    logger.info('[AutoEscalation] Changed status for', sourceType, sourceId, 'to', config.new_status)
  },

  /**
   * Interpolate template variables
   */
  interpolateTemplate(
    template: string,
    data: Record<string, unknown>
  ): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const value = data[key]
      if (value === null || value === undefined) {return ''}
      return String(value)
    })
  },
}

// Combined export
export const workflowAutomationApi = {
  rules: escalationRulesApi,
  events: escalationEventsApi,
  engine: autoEscalationEngine,
}
