// File: src/lib/realtime/index.ts
// Public API for realtime features

export { realtimeManager, RealtimeManager } from './client'
export { presenceManager, PresenceManager } from './presence'
export { markupSyncManager, MarkupSyncManager, MarkupSyncSession } from './markup-sync'
export * from './types'
export * from './markup-sync-types'
export * from './markup-conflict-resolver'
