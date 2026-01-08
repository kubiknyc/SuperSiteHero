-- Migration: Add missing columns to ai_configuration for agent compatibility
-- These columns are expected by the ai-provider.ts code

ALTER TABLE ai_configuration
ADD COLUMN IF NOT EXISTS api_key_encrypted TEXT,
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'openai',
ADD COLUMN IF NOT EXISTS model_preference TEXT DEFAULT 'gpt-4o-mini',
ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS monthly_usage_cents INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS features_enabled JSONB DEFAULT '{"rfi_routing": true, "smart_summaries": true, "risk_prediction": true, "schedule_optimization": true, "document_enhancement": true}'::jsonb;

-- Sync default_provider to provider column
UPDATE ai_configuration
SET provider = default_provider::text
WHERE provider IS NULL AND default_provider IS NOT NULL;

-- Sync model preference based on provider
UPDATE ai_configuration
SET model_preference = CASE
  WHEN provider = 'anthropic' THEN anthropic_model
  ELSE openai_model
END
WHERE model_preference IS NULL;
