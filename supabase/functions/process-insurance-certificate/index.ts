// Supabase Edge Function: process-insurance-certificate
// Processes uploaded insurance certificates using OCR and AI extraction
// Parses ACORD 25/28 forms and extracts structured data

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

import {
  performOcr,
  performOcrOnPdf,
  fetchFileAsBase64,
} from '../_shared/cloud-vision.ts'

import {
  parseInsuranceCertificate,
  validateAgainstRequirements,
  type InsuranceOcrResult,
  type ProjectRequirements,
  type ComplianceValidation,
} from '../_shared/insurance-ocr.ts'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProcessRequest {
  certificate_id?: string
  file_url: string
  file_type: string
  project_id?: string
  subcontractor_id?: string
  company_id: string
  validate_against_requirements?: boolean
}

interface ProcessResult {
  success: boolean
  certificate_id?: string
  extraction_id?: string
  extracted_data: InsuranceOcrResult | null
  validation?: ComplianceValidation
  needs_review: boolean
  error?: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const cloudVisionApiKey = Deno.env.get('GOOGLE_CLOUD_VISION_API_KEY')

    if (!cloudVisionApiKey) {
      throw new Error('GOOGLE_CLOUD_VISION_API_KEY is not configured')
    }

    // Create Supabase client with service role (bypass RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request
    const request: ProcessRequest = await req.json()
    const {
      certificate_id,
      file_url,
      file_type,
      project_id,
      subcontractor_id,
      company_id,
      validate_against_requirements = true,
    } = request

    if (!file_url) {
      throw new Error('file_url is required')
    }

    if (!company_id) {
      throw new Error('company_id is required')
    }

    console.log(`Processing insurance certificate: ${certificate_id || 'new'}`)

    const result: ProcessResult = {
      success: false,
      certificate_id,
      extraction_id: undefined,
      extracted_data: null,
      needs_review: false,
    }

    const startTime = Date.now()

    // Step 1: Create extraction record with pending status
    const { data: extraction, error: insertError } = await supabase
      .from('insurance_ai_extractions')
      .insert({
        certificate_id,
        company_id,
        raw_text: null,
        extracted_data: {},
        processing_status: 'processing',
        processing_started_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (insertError) {
      throw new Error(`Failed to create extraction record: ${insertError.message}`)
    }

    result.extraction_id = extraction.id
    console.log(`Created extraction record: ${extraction.id}`)

    try {
      // Step 2: Perform OCR
      console.log('Starting OCR processing...')

      let ocrText: string

      if (file_type === 'application/pdf' || file_url.toLowerCase().endsWith('.pdf')) {
        // Fetch PDF as base64 and process
        const base64Content = await fetchFileAsBase64(file_url)
        const ocrResult = await performOcrOnPdf(base64Content, cloudVisionApiKey)
        ocrText = ocrResult.text
      } else {
        // Process image directly
        const ocrResult = await performOcr(file_url, cloudVisionApiKey)
        ocrText = ocrResult.text
      }

      console.log(`OCR completed: ${ocrText.length} characters extracted`)

      // Step 3: Parse insurance certificate
      console.log('Parsing insurance certificate...')
      const parsedData = parseInsuranceCertificate(ocrText)
      result.extracted_data = parsedData

      console.log(`Parsed certificate: Form type=${parsedData.form_type}, Confidence=${parsedData.confidence.overall}%`)

      // Step 4: Validate against project requirements if requested
      let validation: ComplianceValidation | undefined

      if (validate_against_requirements && project_id) {
        // Get project requirements
        const { data: requirements } = await supabase
          .from('project_insurance_requirements')
          .select('*')
          .eq('project_id', project_id)

        if (requirements && requirements.length > 0) {
          // Build requirements object from all requirement rows
          const projectReqs: ProjectRequirements = {}

          for (const req of requirements) {
            // Map insurance type to requirement fields
            if (req.insurance_type === 'general_liability') {
              projectReqs.min_each_occurrence = req.min_each_occurrence || undefined
              projectReqs.min_general_aggregate = req.min_aggregate || undefined
              projectReqs.additional_insured_required = req.additional_insured_required
              projectReqs.waiver_of_subrogation_required = req.waiver_of_subrogation_required
              projectReqs.primary_noncontributory_required = req.primary_noncontributory_required
            } else if (req.insurance_type === 'auto_liability') {
              projectReqs.min_auto_combined_single_limit = req.min_each_occurrence || undefined
            } else if (req.insurance_type === 'umbrella') {
              projectReqs.min_umbrella_each_occurrence = req.min_each_occurrence || undefined
            } else if (req.insurance_type === 'workers_compensation') {
              projectReqs.min_workers_comp_each_accident = req.min_each_occurrence || undefined
            }
          }

          validation = validateAgainstRequirements(parsedData, projectReqs)
          result.validation = validation

          console.log(`Validation completed: Compliant=${validation.is_compliant}, Issues=${validation.issues.length}`)
        }
      }

      // Determine if manual review is needed
      result.needs_review =
        parsedData.confidence.overall < 70 ||
        !parsedData.expiration_date ||
        !parsedData.carrier_name ||
        (validation && !validation.is_compliant)

      // Step 5: Update extraction record with results
      await supabase
        .from('insurance_ai_extractions')
        .update({
          raw_text: ocrText,
          extracted_data: parsedData,
          parsed_carrier_name: parsedData.carrier_name,
          parsed_policy_number: parsedData.policy_number,
          parsed_effective_date: parsedData.effective_date,
          parsed_expiration_date: parsedData.expiration_date,
          parsed_each_occurrence: parsedData.general_liability.each_occurrence,
          parsed_general_aggregate: parsedData.general_liability.general_aggregate,
          parsed_auto_combined_single_limit: parsedData.auto_liability.combined_single_limit,
          parsed_umbrella_occurrence: parsedData.umbrella_excess.each_occurrence,
          parsed_workers_comp_each_accident: parsedData.workers_comp.each_accident,
          parsed_additional_insured: parsedData.endorsements.additional_insured,
          parsed_waiver_of_subrogation: parsedData.endorsements.waiver_of_subrogation,
          parsed_primary_noncontributory: parsedData.endorsements.primary_noncontributory,
          overall_confidence: parsedData.confidence.overall,
          needs_review: result.needs_review,
          processing_status: 'completed',
          processing_completed_at: new Date().toISOString(),
          processing_duration_ms: Date.now() - startTime,
          validation_result: validation || null,
        })
        .eq('id', extraction.id)

      // Step 6: If certificate exists, optionally update it with extracted data
      if (certificate_id && parsedData.confidence.overall >= 80) {
        const updateData: Record<string, unknown> = {}

        // Only update fields that were successfully extracted with high confidence
        if (parsedData.carrier_name && parsedData.confidence.carrier >= 80) {
          updateData.carrier_name = parsedData.carrier_name
        }
        if (parsedData.policy_number) {
          updateData.policy_number = parsedData.policy_number
        }
        if (parsedData.effective_date && parsedData.confidence.dates >= 80) {
          updateData.effective_date = parsedData.effective_date
        }
        if (parsedData.expiration_date && parsedData.confidence.dates >= 80) {
          updateData.expiration_date = parsedData.expiration_date
        }
        if (parsedData.general_liability.each_occurrence) {
          updateData.each_occurrence_limit = parsedData.general_liability.each_occurrence
        }
        if (parsedData.general_liability.general_aggregate) {
          updateData.general_aggregate_limit = parsedData.general_liability.general_aggregate
        }
        if (parsedData.auto_liability.combined_single_limit) {
          updateData.combined_single_limit = parsedData.auto_liability.combined_single_limit
        }
        if (parsedData.umbrella_excess.each_occurrence) {
          updateData.umbrella_each_occurrence = parsedData.umbrella_excess.each_occurrence
        }

        // Update endorsements
        updateData.additional_insured_verified = parsedData.endorsements.additional_insured
        updateData.waiver_of_subrogation_verified = parsedData.endorsements.waiver_of_subrogation
        updateData.primary_noncontributory_verified = parsedData.endorsements.primary_noncontributory

        // Mark as AI processed
        updateData.ai_processed = true
        updateData.ai_processed_at = new Date().toISOString()

        if (Object.keys(updateData).length > 0) {
          await supabase
            .from('insurance_certificates')
            .update(updateData)
            .eq('id', certificate_id)

          console.log(`Updated certificate ${certificate_id} with extracted data`)
        }
      }

      // Step 7: If subcontractor provided, recalculate compliance status
      if (subcontractor_id && project_id) {
        try {
          await supabase.rpc('recalculate_compliance_status', {
            p_subcontractor_id: subcontractor_id,
            p_project_id: project_id,
            p_company_id: company_id,
          })
          console.log(`Recalculated compliance status for subcontractor ${subcontractor_id}`)
        } catch (rpcError) {
          console.warn('Failed to recalculate compliance status:', rpcError)
        }
      }

      result.success = true

      console.log(`Certificate processing completed: ${extraction.id}`)

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    } catch (processingError) {
      // Update extraction record with error
      const errorMessage = processingError instanceof Error ? processingError.message : 'Unknown error'

      await supabase
        .from('insurance_ai_extractions')
        .update({
          processing_status: 'failed',
          error_message: errorMessage,
          processing_completed_at: new Date().toISOString(),
          processing_duration_ms: Date.now() - startTime,
        })
        .eq('id', extraction.id)

      throw processingError
    }
  } catch (error) {
    console.error('Processing error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        extracted_data: null,
        needs_review: true,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
