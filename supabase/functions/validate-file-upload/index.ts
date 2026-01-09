/**
 * Supabase Edge Function: validate-file-upload
 *
 * Server-side file validation for defense-in-depth security.
 * Validates file content, MIME types, signatures before storage upload.
 *
 * Usage:
 * POST /functions/v1/validate-file-upload
 * Content-Type: multipart/form-data
 *
 * Form fields:
 * - file: The file to validate
 * - preset: (optional) Validation preset: 'documents' | 'images' | 'pdfs' | 'avatar'
 * - bucket: (optional) Target bucket name for logging
 * - maxSize: (optional) Custom max size in bytes
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import {
  validateFileContent,
  VALIDATION_PRESETS,
  isBlockedExtension,
  formatFileSize,
  type ServerValidationOptions,
} from '../_shared/file-validation.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ValidationResponse {
  valid: boolean
  error?: string
  warnings?: string[]
  fileInfo?: {
    filename: string
    size: number
    sizeFormatted: string
    detectedMimeType: string
    signatureValid: boolean
  }
  auditId?: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user from auth header (optional - for audit logging)
    let userId: string | undefined
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const {
        data: { user },
      } = await supabase.auth.getUser(token)
      userId = user?.id
    }

    // Parse multipart form data
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const preset = formData.get('preset') as string | null
    const bucket = formData.get('bucket') as string | null
    const customMaxSize = formData.get('maxSize') as string | null

    if (!file) {
      return new Response(
        JSON.stringify({ valid: false, error: 'No file provided' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Quick extension check before reading file content
    if (isBlockedExtension(file.name)) {
      await logAudit(supabase, {
        userId,
        filename: file.name,
        bucket,
        result: 'blocked',
        reason: 'Blocked extension',
      })

      return new Response(
        JSON.stringify({
          valid: false,
          error: 'This file type is not allowed for security reasons.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get validation options from preset or custom
    let options: ServerValidationOptions = VALIDATION_PRESETS.documents

    if (preset && preset in VALIDATION_PRESETS) {
      options =
        VALIDATION_PRESETS[preset as keyof typeof VALIDATION_PRESETS]
    }

    if (customMaxSize) {
      const maxSize = parseInt(customMaxSize, 10)
      if (!isNaN(maxSize) && maxSize > 0) {
        options = { ...options, maxSize }
      }
    }

    // Read file content
    const fileContent = await file.arrayBuffer()

    // Validate file
    const result = await validateFileContent(
      fileContent,
      file.name,
      file.type,
      options
    )

    // Log audit trail
    const auditId = await logAudit(supabase, {
      userId,
      filename: file.name,
      bucket,
      size: fileContent.byteLength,
      claimedMimeType: file.type,
      detectedMimeType: result.fileInfo?.detectedMimeType,
      result: result.valid ? 'allowed' : 'rejected',
      reason: result.error,
      warnings: result.warnings,
    })

    const response: ValidationResponse = {
      valid: result.valid,
      error: result.error,
      warnings: result.warnings,
      auditId,
    }

    if (result.valid && result.fileInfo) {
      response.fileInfo = {
        filename: file.name,
        size: result.fileInfo.size,
        sizeFormatted: formatFileSize(result.fileInfo.size),
        detectedMimeType: result.fileInfo.detectedMimeType,
        signatureValid: result.fileInfo.signatureValid,
      }
    }

    return new Response(JSON.stringify(response), {
      status: result.valid ? 200 : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Validation error:', error)

    return new Response(
      JSON.stringify({
        valid: false,
        error: error instanceof Error ? error.message : 'Validation failed',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

// ============================================================================
// Audit Logging
// ============================================================================

interface AuditEntry {
  userId?: string
  filename: string
  bucket?: string | null
  size?: number
  claimedMimeType?: string
  detectedMimeType?: string
  result: 'allowed' | 'rejected' | 'blocked'
  reason?: string
  warnings?: string[]
}

async function logAudit(
  supabase: ReturnType<typeof createClient>,
  entry: AuditEntry
): Promise<string | undefined> {
  try {
    const { data, error } = await supabase
      .from('file_upload_audit')
      .insert({
        user_id: entry.userId,
        filename: entry.filename,
        bucket: entry.bucket,
        file_size: entry.size,
        claimed_mime_type: entry.claimedMimeType,
        detected_mime_type: entry.detectedMimeType,
        validation_result: entry.result,
        rejection_reason: entry.reason,
        warnings: entry.warnings,
        ip_address: null, // Could be extracted from request headers if needed
        user_agent: null,
      })
      .select('id')
      .single()

    if (error) {
      // Don't fail validation if audit logging fails
      console.error('Audit log error:', error)
      return undefined
    }

    return data?.id
  } catch (err) {
    console.error('Audit log error:', err)
    return undefined
  }
}
