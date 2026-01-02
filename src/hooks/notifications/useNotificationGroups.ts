/**
 * useNotificationGroups Hook
 * 
 * Groups notifications by type, project, time, or priority
 */

import { useMemo } from 'react'
import { isToday, isYesterday, isThisWeek } from 'date-fns'

export type GroupByType = 'type' | 'project' | 'time' | 'priority'

export interface GroupedNotification {
  id: string
  user_id: string
  type: string
  title: string
  message: string | null
  is_read: boolean
  created_at: string
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  project_id?: string | null
  project_name?: string | null
  category?: string
}

export interface NotificationGroup {
  key: string
  label: string
  notifications: GroupedNotification[]
  count: number
  unreadCount: number
}

const TYPE_LABELS: Record<string, string> = {
  rfi: 'RFIs',
  submittal: 'Submittals',
  task: 'Tasks',
  daily_report: 'Daily Reports',
  punch_item: 'Punch Items',
  change_order: 'Change Orders',
  payment: 'Payments',
  safety: 'Safety',
  document: 'Documents',
  approval: 'Approvals',
  mention: 'Mentions',
  comment: 'Comments',
  schedule: 'Schedule',
  notice: 'Notices',
  bid: 'Bids',
  checklist: 'Checklists',
  meeting: 'Meetings',
  general: 'General',
}

const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'Urgent',
  high: 'High Priority',
  normal: 'Normal',
  low: 'Low Priority',
}

export function useNotificationGroups(
  notifications: GroupedNotification[],
  groupBy: GroupByType = 'time'
) {
  const groups = useMemo<NotificationGroup[]>(() => {
    if (!notifications || notifications.length === 0) return []

    switch (groupBy) {
      case 'type':
        return groupByType(notifications)
      case 'project':
        return groupByProject(notifications)
      case 'priority':
        return groupByPriority(notifications)
      case 'time':
      default:
        return groupByTime(notifications)
    }
  }, [notifications, groupBy])

  return { groups }
}

function groupByTime(notifications: GroupedNotification[]): NotificationGroup[] {
  const groups: Record<string, GroupedNotification[]> = {
    today: [],
    yesterday: [],
    thisWeek: [],
    older: [],
  }

  notifications.forEach(n => {
    const date = new Date(n.created_at)
    if (isToday(date)) groups.today.push(n)
    else if (isYesterday(date)) groups.yesterday.push(n)
    else if (isThisWeek(date)) groups.thisWeek.push(n)
    else groups.older.push(n)
  })

  return [
    { key: 'today', label: 'Today', notifications: groups.today, count: groups.today.length, unreadCount: groups.today.filter(n => !n.is_read).length },
    { key: 'yesterday', label: 'Yesterday', notifications: groups.yesterday, count: groups.yesterday.length, unreadCount: groups.yesterday.filter(n => !n.is_read).length },
    { key: 'thisWeek', label: 'This Week', notifications: groups.thisWeek, count: groups.thisWeek.length, unreadCount: groups.thisWeek.filter(n => !n.is_read).length },
    { key: 'older', label: 'Older', notifications: groups.older, count: groups.older.length, unreadCount: groups.older.filter(n => !n.is_read).length },
  ].filter(g => g.count > 0)
}

function groupByType(notifications: GroupedNotification[]): NotificationGroup[] {
  const groups: Record<string, GroupedNotification[]> = {}

  notifications.forEach(n => {
    const type = n.category || getTypeFromNotificationType(n.type)
    if (!groups[type]) groups[type] = []
    groups[type].push(n)
  })

  return Object.entries(groups)
    .map(([type, items]) => ({
      key: type,
      label: TYPE_LABELS[type] || type,
      notifications: items,
      count: items.length,
      unreadCount: items.filter(n => !n.is_read).length,
    }))
    .sort((a, b) => b.unreadCount - a.unreadCount)
}

function groupByProject(notifications: GroupedNotification[]): NotificationGroup[] {
  const groups: Record<string, { name: string; items: GroupedNotification[] }> = {}

  notifications.forEach(n => {
    const projectId = n.project_id || 'no-project'
    const projectName = n.project_name || 'No Project'
    if (!groups[projectId]) groups[projectId] = { name: projectName, items: [] }
    groups[projectId].items.push(n)
  })

  return Object.entries(groups)
    .map(([projectId, { name, items }]) => ({
      key: projectId,
      label: name,
      notifications: items,
      count: items.length,
      unreadCount: items.filter(n => !n.is_read).length,
    }))
    .sort((a, b) => b.unreadCount - a.unreadCount)
}

function groupByPriority(notifications: GroupedNotification[]): NotificationGroup[] {
  const order = ['urgent', 'high', 'normal', 'low']
  const groups: Record<string, GroupedNotification[]> = { urgent: [], high: [], normal: [], low: [] }

  notifications.forEach(n => {
    const priority = n.priority || 'normal'
    groups[priority].push(n)
  })

  return order
    .map(priority => ({
      key: priority,
      label: PRIORITY_LABELS[priority],
      notifications: groups[priority],
      count: groups[priority].length,
      unreadCount: groups[priority].filter(n => !n.is_read).length,
    }))
    .filter(g => g.count > 0)
}

function getTypeFromNotificationType(type: string): string {
  if (type.startsWith('rfi')) return 'rfi'
  if (type.startsWith('submittal')) return 'submittal'
  if (type.startsWith('task')) return 'task'
  if (type.startsWith('punch')) return 'punch_item'
  if (type.startsWith('approval')) return 'approval'
  if (type.startsWith('mention')) return 'mention'
  if (type.startsWith('safety') || type.startsWith('incident')) return 'safety'
  if (type.startsWith('document')) return 'document'
  if (type.startsWith('change_order')) return 'change_order'
  if (type.startsWith('payment')) return 'payment'
  return 'general'
}

export default useNotificationGroups
