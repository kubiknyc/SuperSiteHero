# Real-time Collaboration Implementation Plan

## Overview
Add real-time collaboration features using Supabase Realtime, including presence tracking, live data updates, and typing indicators.

## Architecture Decisions

### Approach: Supabase Realtime Channels + React Query Integration
- Use Supabase Realtime for WebSocket connections
- Integrate with existing React Query cache for seamless updates
- Leverage existing offline store for conflict resolution

### Key Tables for Realtime
1. **High Priority:** `daily_reports`, `workflow_items` (RFIs/Submittals), `documents`, `approval_requests`
2. **Medium Priority:** `projects`, `tasks`, `messages`

---

## Implementation Steps

### Step 1: Core Realtime Infrastructure
**Files to create:**
- `src/lib/realtime/client.ts` - Realtime channel manager
- `src/lib/realtime/presence.ts` - Presence state management
- `src/lib/realtime/types.ts` - TypeScript types for realtime events

**What it does:**
- Creates a singleton channel manager
- Handles connection state (connected/disconnected/reconnecting)
- Manages channel subscriptions per table/room
- Integrates with existing online/offline detection

### Step 2: React Hooks for Realtime
**Files to create:**
- `src/hooks/useRealtimeSubscription.ts` - Generic realtime subscription hook
- `src/hooks/useRealtimePresence.ts` - Presence tracking hook
- `src/hooks/useRealtimeUpdates.ts` - Table change listener with React Query integration

**Pattern:**
```typescript
// Usage example
const { data } = useRFIs(projectId)
useRealtimeUpdates('workflow_items', projectId, {
  onInsert: () => queryClient.invalidateQueries(['rfis', projectId]),
  onUpdate: () => queryClient.invalidateQueries(['rfis', projectId]),
})
```

### Step 3: Presence System
**Files to create:**
- `src/components/presence/PresenceAvatars.tsx` - Show who's viewing
- `src/components/presence/PresenceIndicator.tsx` - Online status dot
- `src/contexts/PresenceContext.tsx` - App-wide presence state

**Features:**
- Track which page/document users are viewing
- Show avatar stack of active viewers
- "X users viewing" indicator
- Cursor position tracking (optional, for document editing)

### Step 4: Live Updates UI Components
**Files to create:**
- `src/components/realtime/LiveUpdateBadge.tsx` - "New updates available" banner
- `src/components/realtime/ConnectionStatus.tsx` - Connection state indicator
- `src/components/realtime/TypingIndicator.tsx` - "User is typing..."

### Step 5: Integrate with Key Features
**Files to modify:**
- `src/features/daily-reports/` - Add realtime to report list and detail
- `src/features/rfis/` - Live RFI status updates
- `src/features/submittals/` - Live submittal updates
- `src/features/documents/` - Document viewing presence

### Step 6: Conflict Resolution Enhancement
**Files to modify:**
- `src/components/ConflictResolutionDialog.tsx` - Enhance existing dialog
- `src/stores/offline-store.ts` - Add realtime conflict detection

**Features:**
- Detect when another user edits same record
- Show "This record was modified by X" warning
- Offer merge/overwrite/discard options

---

## Detailed File Specifications

### 1. `src/lib/realtime/client.ts`
```typescript
// RealtimeManager class
// - getInstance() singleton
// - subscribeToTable(table, filter, callbacks)
// - unsubscribeFromTable(table)
// - getConnectionState()
// - onConnectionChange(callback)
```

### 2. `src/lib/realtime/presence.ts`
```typescript
// PresenceManager class
// - joinRoom(roomId, userData)
// - leaveRoom(roomId)
// - trackPresence(roomId, state)
// - onPresenceChange(roomId, callback)
// - getPresenceState(roomId)
```

### 3. `src/hooks/useRealtimeSubscription.ts`
```typescript
export function useRealtimeSubscription<T>(
  table: string,
  filter?: { column: string; value: string },
  options?: {
    onInsert?: (payload: T) => void
    onUpdate?: (payload: T) => void
    onDelete?: (payload: { old: T }) => void
  }
)
```

### 4. `src/hooks/useRealtimePresence.ts`
```typescript
export function useRealtimePresence(roomId: string) {
  // Returns: { users: PresenceUser[], join, leave, updateState }
}
```

### 5. `src/components/presence/PresenceAvatars.tsx`
- Displays up to 3 avatars + "+X more"
- Tooltip shows full user list
- Animated enter/exit transitions

### 6. `src/components/realtime/ConnectionStatus.tsx`
- Green dot = connected
- Yellow dot = reconnecting
- Red dot = disconnected
- Shows in app header/footer

---

## Database Changes Required

### Enable Realtime on Tables (Supabase Dashboard or Migration)
```sql
-- Migration: 071_enable_realtime.sql
ALTER PUBLICATION supabase_realtime ADD TABLE daily_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE workflow_items;
ALTER PUBLICATION supabase_realtime ADD TABLE documents;
ALTER PUBLICATION supabase_realtime ADD TABLE approval_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE approval_actions;
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
```

No schema changes needed - just enable realtime on existing tables.

---

## Testing Plan

1. **Unit Tests:**
   - RealtimeManager connection handling
   - PresenceManager state management
   - Hook behavior with mocked Supabase

2. **Integration Tests:**
   - Multi-user presence simulation
   - Data sync between tabs
   - Offline/online transitions

3. **E2E Tests:**
   - Two browser sessions editing same record
   - Presence showing correctly
   - Conflict resolution flow

---

## Rollout Plan

1. **Phase 1:** Core infrastructure + connection status (no user-facing changes)
2. **Phase 2:** Presence on project dashboard
3. **Phase 3:** Live updates on RFIs/Submittals lists
4. **Phase 4:** Document viewing presence
5. **Phase 5:** Typing indicators + full conflict resolution

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| WebSocket connection limits | Implement connection pooling, single channel per table |
| Battery drain on mobile | Reduce presence update frequency, pause when backgrounded |
| Race conditions | Use optimistic updates with rollback |
| Supabase rate limits | Batch updates, debounce presence |

---

## Estimated Effort

| Step | Effort |
|------|--------|
| Step 1: Core Infrastructure | 3-4 hours |
| Step 2: React Hooks | 2-3 hours |
| Step 3: Presence System | 3-4 hours |
| Step 4: Live Updates UI | 2-3 hours |
| Step 5: Feature Integration | 4-6 hours |
| Step 6: Conflict Resolution | 2-3 hours |
| **Total** | **16-23 hours** |
