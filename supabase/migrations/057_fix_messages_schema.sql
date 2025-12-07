-- Fix messages table schema - add missing columns that the messaging service expects

-- Add conversation_id column for conversation-based messaging
ALTER TABLE messages ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES conversations(id);

-- Add sender_id column (the messaging service uses this instead of from_user_id)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_id uuid REFERENCES users(id);

-- Create index for efficient conversation queries
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);

-- Create index for sender queries
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
