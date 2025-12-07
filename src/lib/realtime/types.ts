// File: src/lib/realtime/types.ts
// TypeScript types for Supabase Realtime features

import type { RealtimeChannel, RealtimePresenceState } from '@supabase/supabase-js'

// Connection states
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting'

// Realtime event types
export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE'

// Generic payload for database changes
export interface RealtimePayload<T = Record<string, unknown>> {
  eventType: RealtimeEventType
  new: T
  old: T
  schema: string
  table: string
  commit_timestamp: string
}

// Presence user state
export interface PresenceUser {
  id: string
  email: string
  name: string
  avatarUrl?: string
  color: string
  currentPage?: string
  lastSeen: string
}

// Presence state for a room
export interface RoomPresenceState {
  [key: string]: PresenceUser[]
}

// Typing indicator state
export interface TypingState {
  userId: string
  userName: string
  isTyping: boolean
  timestamp: number
}

// Channel subscription options
export interface SubscriptionOptions<T = Record<string, unknown>> {
  table: string
  schema?: string
  filter?: string
  onInsert?: (payload: T) => void
  onUpdate?: (payload: T, oldRecord: T) => void
  onDelete?: (oldRecord: T) => void
  onError?: (error: Error) => void
}

// Presence options
export interface PresenceOptions {
  roomId: string
  user: Pick<PresenceUser, 'id' | 'email' | 'name' | 'avatarUrl'>
  initialPage?: string
  onSync?: (state: RealtimePresenceState<PresenceUser>) => void
  onJoin?: (key: string, currentPresences: PresenceUser[], newPresences: PresenceUser[]) => void
  onLeave?: (key: string, currentPresences: PresenceUser[], leftPresences: PresenceUser[]) => void
}

// Channel manager state
export interface ChannelState {
  channel: RealtimeChannel
  subscriptionCount: number
  table?: string
  roomId?: string
}

// Realtime manager events
export interface RealtimeManagerEvents {
  connectionChange: (state: ConnectionState) => void
  error: (error: Error) => void
}

// Tables that support realtime
export const REALTIME_TABLES = [
  'daily_reports',
  'workflow_items',
  'documents',
  'approval_requests',
  'approval_actions',
  'projects',
  'tasks',
  'messages',
] as const

export type RealtimeTable = (typeof REALTIME_TABLES)[number]

// Avatar colors for presence (consistent per user)
export const PRESENCE_COLORS = [
  '#EF4444', // red
  '#F97316', // orange
  '#EAB308', // yellow
  '#22C55E', // green
  '#14B8A6', // teal
  '#3B82F6', // blue
  '#8B5CF6', // violet
  '#EC4899', // pink
] as const

// Get consistent color for a user based on their ID
export function getUserColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i)
    hash = hash & hash
  }
  return PRESENCE_COLORS[Math.abs(hash) % PRESENCE_COLORS.length]
}
