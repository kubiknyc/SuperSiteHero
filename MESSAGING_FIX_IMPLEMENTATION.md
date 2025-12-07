# Messaging System Fix - Implementation Guide

## Executive Summary

The messaging system is completely broken due to a critical schema mismatch:
- **Migrations create**: `conversations`, `conversation_participants`, `messages`
- **API service queries**: `chat_channels`, `chat_channel_members`, `chat_messages`
- **Result**: All messaging operations fail with 500 errors

## Fix Option 1: Update Code to Match Database (RECOMMENDED)

This is the safest and fastest fix. Update the API service and realtime hooks to use the existing database tables.

### Changes Required

#### 1. Update src/lib/api/services/messaging.ts

Replace ALL occurrences of:
- `chat_channels` → `conversations`
- `chat_channel_members` → `conversation_participants`
- `chat_messages` → `messages`
- `chat_message_reactions` → `message_reactions`
- `channel_id` → `conversation_id`
- `channel_type` → `type`
- `user_id` (in messages) → `sender_id`
- `mentions` → `mentioned_users`
- `archived_at` → `deleted_at`

**Key column mappings**:
```typescript
// Database → API/Frontend
conversations.type → Conversation.type
conversations.id → Conversation.id
conversations.deleted_at → Conversation.deleted_at
conversations.last_message_at → Conversation.last_message_at

conversation_participants.conversation_id → ConversationParticipant.conversation_id
conversation_participants.user_id → ConversationParticipant.user_id
conversation_participants.left_at → ConversationParticipant.left_at
conversation_participants.is_muted → ConversationParticipant.is_muted

messages.conversation_id → Message.conversation_id
messages.sender_id → Message.sender_id
messages.mentioned_users → Message.mentioned_users
messages.deleted_at → Message.deleted_at
```

**Required Schema Adjustments**:
The `conversations` table is missing some columns that the TypeScript types expect:
- No `company_id` column (chat_channels has it, conversations doesn't)
- No `is_private` column
- No `metadata` column

These missing columns must either:
1. Be removed from TypeScript types
2. Be added via migration

#### 2. Update src/features/messaging/hooks/useRealtimeMessaging.ts

Change table names in subscriptions:

```typescript
// Line 47: Change table name
table: 'messages', // Was: 'chat_messages'

// Line 48: Change filter column
filter: `conversation_id=eq.${conversationId}`, // Was: channel_id

// Lines 69, 86: Same changes

// Line 410: Change table name
table: 'conversations', // Was: 'chat_channels'

// Line 423: Change table name
table: 'conversation_participants', // Was: 'chat_channel_members'
```

#### 3. Fix Missing Columns Issue

The API service code expects columns that don't exist in the `conversations` table:
- `company_id` (required in chat_channels schema)
- `is_private` (boolean)
- `metadata` (JSONB)

**Solution A: Remove references in code**
Remove all references to these columns from the API service.

**Solution B: Add migration to add these columns**
```sql
-- Add missing columns to conversations table
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Note: is_private doesn't exist in migration 029, skip it
```

### Implementation Steps

1. **Backup current code** (create a git branch)
   ```bash
   git checkout -b fix/messaging-schema-mismatch
   ```

2. **Update messaging.ts**
   - Find and replace all table names
   - Update column mappings
   - Remove references to non-existent columns

3. **Update useRealtimeMessaging.ts**
   - Change table names in subscriptions
   - Update filter columns

4. **Test locally**
   - Create conversation
   - Send messages
   - Verify realtime updates work

5. **Optional: Add missing columns**
   - Create migration 051_add_missing_conversation_columns.sql
   - Add company_id and metadata columns

6. **Commit and deploy**

## Fix Option 2: Create Migration for chat_* Tables

This option creates new tables matching the TypeScript types. **Higher risk**, requires data migration.

### Required Migration

Create `supabase/migrations/051_create_chat_tables.sql`:

```sql
-- Create chat_channels table
CREATE TABLE IF NOT EXISTS chat_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT,
  description TEXT,
  channel_type TEXT NOT NULL,
  is_private BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,

  CONSTRAINT chat_channels_type_check CHECK (channel_type IN ('direct', 'group', 'project', 'general'))
);

-- Create indexes
CREATE INDEX idx_chat_channels_company ON chat_channels(company_id) WHERE archived_at IS NULL;
CREATE INDEX idx_chat_channels_project ON chat_channels(project_id) WHERE archived_at IS NULL;
CREATE INDEX idx_chat_channels_type ON chat_channels(channel_type) WHERE archived_at IS NULL;

-- Create chat_channel_members table
CREATE TABLE IF NOT EXISTS chat_channel_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  notification_settings JSONB DEFAULT '{}'::jsonb,

  UNIQUE(channel_id, user_id),
  CONSTRAINT chat_channel_members_role_check CHECK (role IN ('admin', 'member'))
);

-- Create indexes
CREATE INDEX idx_chat_channel_members_channel ON chat_channel_members(channel_id);
CREATE INDEX idx_chat_channel_members_user ON chat_channel_members(user_id);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_message_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  attachments JSONB,
  mentions JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  linked_rfi_id UUID REFERENCES rfis(id) ON DELETE SET NULL,
  linked_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  linked_change_order_id UUID REFERENCES change_orders(id) ON DELETE SET NULL,

  CONSTRAINT chat_messages_content_check CHECK (length(trim(content)) > 0),
  CONSTRAINT chat_messages_type_check CHECK (message_type IN ('text', 'file', 'system'))
);

-- Create indexes
CREATE INDEX idx_chat_messages_channel ON chat_messages(channel_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_chat_messages_user ON chat_messages(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_chat_messages_parent ON chat_messages(parent_message_id) WHERE deleted_at IS NULL;

-- Create chat_message_reactions table
CREATE TABLE IF NOT EXISTS chat_message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(message_id, user_id, emoji)
);

-- Create indexes
CREATE INDEX idx_chat_message_reactions_message ON chat_message_reactions(message_id);
CREATE INDEX idx_chat_message_reactions_user ON chat_message_reactions(user_id);

-- Enable RLS
ALTER TABLE chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_message_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_channels
CREATE POLICY "Users can view channels they are members of"
  ON chat_channels FOR SELECT
  USING (
    archived_at IS NULL
    AND EXISTS (
      SELECT 1 FROM chat_channel_members
      WHERE chat_channel_members.channel_id = chat_channels.id
        AND chat_channel_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create channels"
  ON chat_channels FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can update channels"
  ON chat_channels FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM chat_channel_members
      WHERE chat_channel_members.channel_id = chat_channels.id
        AND chat_channel_members.user_id = auth.uid()
        AND chat_channel_members.role = 'admin'
    )
  );

-- RLS Policies for chat_channel_members
CREATE POLICY "Users can view members in their channels"
  ON chat_channel_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_channel_members cm
      WHERE cm.channel_id = chat_channel_members.channel_id
        AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can add members"
  ON chat_channel_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_channels
      WHERE chat_channels.id = chat_channel_members.channel_id
        AND chat_channels.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update their own membership"
  ON chat_channel_members FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can delete members"
  ON chat_channel_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM chat_channel_members cm
      WHERE cm.channel_id = chat_channel_members.channel_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'admin'
    )
  );

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages in their channels"
  ON chat_messages FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM chat_channel_members
      WHERE chat_channel_members.channel_id = chat_messages.channel_id
        AND chat_channel_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can send messages"
  ON chat_messages FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM chat_channel_members
      WHERE chat_channel_members.channel_id = chat_messages.channel_id
        AND chat_channel_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own messages"
  ON chat_messages FOR UPDATE
  USING (user_id = auth.uid());

-- RLS Policies for chat_message_reactions
CREATE POLICY "Users can view reactions in their channels"
  ON chat_message_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_messages m
      JOIN chat_channel_members cm ON cm.channel_id = m.channel_id
      WHERE m.id = chat_message_reactions.message_id
        AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add their own reactions"
  ON chat_message_reactions FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM chat_messages m
      JOIN chat_channel_members cm ON cm.channel_id = m.channel_id
      WHERE m.id = chat_message_reactions.message_id
        AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own reactions"
  ON chat_message_reactions FOR DELETE
  USING (user_id = auth.uid());

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON chat_channels TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_channel_members TO authenticated;
GRANT SELECT, INSERT, UPDATE ON chat_messages TO authenticated;
GRANT SELECT, INSERT, DELETE ON chat_message_reactions TO authenticated;

-- Migrate data from old tables (if they exist and have data)
-- This is optional and should only be done if you want to preserve existing conversations

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_chat_channel_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_chat_channels_updated_at
  BEFORE UPDATE ON chat_channels
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_channel_updated_at();

-- Comment
COMMENT ON TABLE chat_channels IS 'Real-time messaging channels (conversations)';
COMMENT ON TABLE chat_channel_members IS 'Channel membership and permissions';
COMMENT ON TABLE chat_messages IS 'Messages within channels';
COMMENT ON TABLE chat_message_reactions IS 'Emoji reactions to messages';
```

### Migration Considerations

**Pros of Option 2:**
- Matches TypeScript types exactly
- More feature-rich schema (company_id, metadata, etc.)
- Proper separation from old conversations table

**Cons of Option 2:**
- Requires complex migration
- Need to migrate existing data
- Higher risk of bugs
- More testing required
- Existing conversations/messages may be lost if not migrated

## Recommended Approach: Option 1

**Use Option 1** because:
1. **Lower risk** - Just code changes, no DB changes
2. **Faster** - Can be deployed immediately
3. **Preserves data** - No migration needed
4. **Easier rollback** - Just revert code
5. **Migrations already have RLS policies** - The existing migrations (029, 036, etc.) already set up proper RLS policies

The only downside is missing the `company_id`, `metadata`, and `is_private` columns, but these can be added later with a simple migration if needed.

## Additional Fixes

### Fix Boolean Index Error in offline-store.ts

The error "A Boolean index query failed" comes from trying to use boolean values as IDBKeyRange values.

**File**: `src/stores/offline-store.ts`
**Line**: 92

```typescript
// BEFORE (broken)
const conflictCount = await countByIndex(STORES.CONFLICTS, 'resolved', false);

// AFTER (fixed)
// Option A: Use 0/1 instead of false/true
const conflictCount = await countByIndex(STORES.CONFLICTS, 'resolved', 0);

// Option B: Catch error and fallback (already implemented at line 94-100)
try {
  const conflictCount = await countByIndex(STORES.CONFLICTS, 'resolved', false);
  set({ conflictCount });
} catch (indexError) {
  // Fallback: get all and filter manually
  logger.warn('Boolean index query failed, falling back to manual filtering');
  const { getAllFromStore } = await import('@/lib/offline/indexeddb');
  const allConflicts = await getAllFromStore<any>(STORES.CONFLICTS);
  const unresolvedCount = allConflicts.filter((c: any) => !c.resolved).length;
  set({ conflictCount: unresolvedCount });
}
```

The fallback is already implemented, so this error is handled gracefully.

### Remove approval_requests Query

The error shows failed queries to `approval_requests` table. This table doesn't exist in migrations and isn't referenced in the messaging code provided.

**Possible sources:**
1. Another feature trying to load approval requests
2. A query in a component that loads on the messages page
3. Left over from old code

**Action**: Search codebase for `approval_requests` queries and verify they're needed.

## Testing Checklist

After implementing the fix:

- [ ] Create direct message conversation
- [ ] Create group conversation
- [ ] Create project conversation
- [ ] Send text message
- [ ] Edit message
- [ ] Delete message
- [ ] Add emoji reaction
- [ ] Remove emoji reaction
- [ ] Add participant to group
- [ ] Remove participant from group
- [ ] Leave conversation
- [ ] View conversation list
- [ ] Search conversations
- [ ] Mark conversation as read
- [ ] Verify unread counts update
- [ ] Test realtime message delivery
- [ ] Test typing indicators
- [ ] Test presence (online status)
- [ ] Test with multiple users
- [ ] Verify RLS policies prevent unauthorized access

## Files to Change

### Required Changes (Option 1):
1. `src/lib/api/services/messaging.ts` - Update all table/column names
2. `src/features/messaging/hooks/useRealtimeMessaging.ts` - Update subscription table names

### Optional Changes:
3. `src/stores/offline-store.ts` - Already has fallback for boolean index
4. Create migration `051_add_missing_conversation_columns.sql` - Add company_id, metadata columns

### Not Needed:
- `src/types/database.ts` - Auto-generated, will update after regenerating types
- `src/features/messaging/hooks/useMessaging.ts` - Already correct, uses Conversation types
- `src/features/messaging/components/NewConversationDialog.tsx` - Already correct

## Deployment Steps

1. Create feature branch
2. Implement code changes (Option 1)
3. Test locally
4. Commit with message: "fix: update messaging system to use correct database tables"
5. Push to repository
6. Deploy to development environment
7. Run full test suite
8. Deploy to production

## Rollback Plan

If the fix causes issues:
1. Revert the commit
2. Redeploy previous version
3. Investigate root cause
4. Apply corrected fix

Code changes only, so rollback is straightforward.
