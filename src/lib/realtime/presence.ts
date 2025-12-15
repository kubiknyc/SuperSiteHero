// File: src/lib/realtime/presence.ts
// Presence tracking for real-time collaboration

import type { RealtimeChannel, RealtimePresenceState } from '@supabase/supabase-js'
import { realtimeManager } from './client'
import type { PresenceUser, PresenceOptions, TypingState } from './types'
import { getUserColor } from './types'

type PresenceCallback = (users: PresenceUser[]) => void
type TypingCallback = (typingUsers: TypingState[]) => void

interface RoomState {
  channel: RealtimeChannel
  users: PresenceUser[]
  typingUsers: Map<string, TypingState>
  presenceCallbacks: Set<PresenceCallback>
  typingCallbacks: Set<TypingCallback>
  currentUser?: PresenceUser
}

class PresenceManager {
  private static instance: PresenceManager
  private rooms: Map<string, RoomState> = new Map()
  private typingTimeout = 3000 // Clear typing indicator after 3 seconds

  private constructor() {}

  static getInstance(): PresenceManager {
    if (!PresenceManager.instance) {
      PresenceManager.instance = new PresenceManager()
    }
    return PresenceManager.instance
  }

  // Join a presence room
  async joinRoom(options: PresenceOptions): Promise<void> {
    const { roomId, user, initialPage, onSync, onJoin, onLeave } = options

    // Check if already in room
    const existing = this.rooms.get(roomId)
    if (existing) {
      // Update current user's presence
      await this.updatePresence(roomId, { currentPage: initialPage })
      return
    }

    const channel = realtimeManager.createPresenceChannel(roomId)

    const presenceUser: PresenceUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      color: getUserColor(user.id),
      currentPage: initialPage,
      lastSeen: new Date().toISOString(),
    }

    const roomState: RoomState = {
      channel,
      users: [],
      typingUsers: new Map(),
      presenceCallbacks: new Set(),
      typingCallbacks: new Set(),
      currentUser: presenceUser,
    }

    this.rooms.set(roomId, roomState)

    // Set up presence handlers
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceUser>()
        const users = this.flattenPresenceState(state)
        roomState.users = users
        this.notifyPresenceCallbacks(roomId, users)
        onSync?.(state)
      })
      .on('presence', { event: 'join' }, ({ key, currentPresences, newPresences }) => {
        onJoin?.(key, currentPresences as unknown as PresenceUser[], newPresences as unknown as PresenceUser[])
      })
      .on('presence', { event: 'leave' }, ({ key, currentPresences, leftPresences }) => {
        onLeave?.(key, currentPresences as unknown as PresenceUser[], leftPresences as unknown as PresenceUser[])
      })
      // Handle typing broadcasts
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        this.handleTypingBroadcast(roomId, payload as TypingState)
      })

    // Subscribe and track presence
    await channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track(presenceUser)
      }
    })
  }

  // Leave a presence room
  async leaveRoom(roomId: string): Promise<void> {
    const roomState = this.rooms.get(roomId)
    if (!roomState) {return}

    await roomState.channel.untrack()
    realtimeManager.removePresenceChannel(roomId)
    this.rooms.delete(roomId)
  }

  // Update presence state (e.g., change current page)
  async updatePresence(
    roomId: string,
    updates: Partial<Pick<PresenceUser, 'currentPage'>>
  ): Promise<void> {
    const roomState = this.rooms.get(roomId)
    if (!roomState || !roomState.currentUser) {return}

    const updatedUser: PresenceUser = {
      ...roomState.currentUser,
      ...updates,
      lastSeen: new Date().toISOString(),
    }

    roomState.currentUser = updatedUser
    await roomState.channel.track(updatedUser)
  }

  // Get current users in a room
  getUsers(roomId: string): PresenceUser[] {
    return this.rooms.get(roomId)?.users ?? []
  }

  // Subscribe to presence changes in a room
  onPresenceChange(roomId: string, callback: PresenceCallback): () => void {
    const roomState = this.rooms.get(roomId)
    if (!roomState) {
      // Return no-op if room doesn't exist yet
      return () => {}
    }

    roomState.presenceCallbacks.add(callback)
    // Immediately call with current state
    callback(roomState.users)

    return () => {
      roomState.presenceCallbacks.delete(callback)
    }
  }

  // Send typing indicator
  async sendTyping(roomId: string, isTyping: boolean): Promise<void> {
    const roomState = this.rooms.get(roomId)
    if (!roomState || !roomState.currentUser) {return}

    const typingState: TypingState = {
      userId: roomState.currentUser.id,
      userName: roomState.currentUser.name,
      isTyping,
      timestamp: Date.now(),
    }

    await roomState.channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: typingState,
    })
  }

  // Subscribe to typing indicators
  onTypingChange(roomId: string, callback: TypingCallback): () => void {
    const roomState = this.rooms.get(roomId)
    if (!roomState) {
      return () => {}
    }

    roomState.typingCallbacks.add(callback)

    return () => {
      roomState.typingCallbacks.delete(callback)
    }
  }

  // Get users currently typing
  getTypingUsers(roomId: string): TypingState[] {
    const roomState = this.rooms.get(roomId)
    if (!roomState) {return []}

    return Array.from(roomState.typingUsers.values()).filter(
      (t) => t.isTyping && Date.now() - t.timestamp < this.typingTimeout
    )
  }

  private flattenPresenceState(state: RealtimePresenceState<PresenceUser>): PresenceUser[] {
    const users: PresenceUser[] = []
    for (const presences of Object.values(state)) {
      for (const presence of presences) {
        users.push(presence)
      }
    }
    return users
  }

  private handleTypingBroadcast(roomId: string, typingState: TypingState): void {
    const roomState = this.rooms.get(roomId)
    if (!roomState) {return}

    if (typingState.isTyping) {
      roomState.typingUsers.set(typingState.userId, typingState)
    } else {
      roomState.typingUsers.delete(typingState.userId)
    }

    // Clean up old typing indicators
    const now = Date.now()
    for (const [userId, state] of Array.from(roomState.typingUsers.entries())) {
      if (now - state.timestamp > this.typingTimeout) {
        roomState.typingUsers.delete(userId)
      }
    }

    this.notifyTypingCallbacks(roomId)
  }

  private notifyPresenceCallbacks(roomId: string, users: PresenceUser[]): void {
    const roomState = this.rooms.get(roomId)
    if (!roomState) {return}

    roomState.presenceCallbacks.forEach((callback) => {
      callback(users)
    })
  }

  private notifyTypingCallbacks(roomId: string): void {
    const roomState = this.rooms.get(roomId)
    if (!roomState) {return}

    const typingUsers = this.getTypingUsers(roomId)
    roomState.typingCallbacks.forEach((callback) => {
      callback(typingUsers)
    })
  }

  // Check if current user is in a room
  isInRoom(roomId: string): boolean {
    return this.rooms.has(roomId)
  }

  // Get all active room IDs
  getActiveRooms(): string[] {
    return Array.from(this.rooms.keys())
  }

  // Cleanup all rooms
  async dispose(): Promise<void> {
    const roomIds = Array.from(this.rooms.keys())
    for (const roomId of roomIds) {
      await this.leaveRoom(roomId)
    }
  }
}

// Export singleton instance
export const presenceManager = PresenceManager.getInstance()

// Export class for testing
export { PresenceManager }
