-- ============================================================================
-- Migration: Fix AI Configuration API Key Columns
-- Description: Change API key columns from UUID to TEXT to support direct key storage
-- ============================================================================

-- Change openai_api_key_id from UUID to TEXT
ALTER TABLE ai_configuration
  ALTER COLUMN openai_api_key_id TYPE TEXT USING openai_api_key_id::TEXT;

-- Change anthropic_api_key_id from UUID to TEXT
ALTER TABLE ai_configuration
  ALTER COLUMN anthropic_api_key_id TYPE TEXT USING anthropic_api_key_id::TEXT;

-- Add comments explaining the columns
COMMENT ON COLUMN ai_configuration.openai_api_key_id IS 'OpenAI API key (stored directly or vault reference)';
COMMENT ON COLUMN ai_configuration.anthropic_api_key_id IS 'Anthropic API key (stored directly or vault reference)';
