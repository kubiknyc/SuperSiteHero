/**
 * DocuSign Webhook Handler
 *
 * Processes DocuSign Connect webhook events for envelope status updates.
 * Updates local database with envelope status, recipient status, and completion timestamps.
 */

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface DocuSignEnvelopeEvent {
  event: string
  apiVersion: string
  uri: string
  retryCount: number
  configurationId: number
  generatedDateTime: string
  data: {
    accountId: string
    envelopeId: string
    envelopeSummary: {
      status: string
      documentsUri: string
      recipientsUri: string
      attachmentsUri: string
      envelopeUri: string
      emailSubject: string
      envelopeId: string
      customFieldsUri: string
      signingLocation: string
      autoNavigation: string
      enableWetSign: string
      allowMarkup: string
      allowReassign: string
      createdDateTime: string
      lastModifiedDateTime: string
      statusChangedDateTime: string
      voidedDateTime?: string
      voidedReason?: string
      completedDateTime?: string
      declinedDateTime?: string
      deliveredDateTime?: string
      sentDateTime?: string
      purgeState: string
      envelopeIdStamping: string
      is21CFRPart11: string
      signerCanSignOnMobile: string
      isSignatureProviderEnvelope: string
      sender: {
        userName: string
        userId: string
        accountId: string
        email: string
      }
      recipients: {
        signers?: Array<{
          recipientId: string
          recipientIdGuid: string
          email: string
          name: string
          routingOrder: string
          status: string
          deliveredDateTime?: string
          signedDateTime?: string
          declinedDateTime?: string
          declinedReason?: string
        }>
        carbonCopies?: Array<{
          recipientId: string
          recipientIdGuid: string
          email: string
          name: string
          routingOrder: string
          status: string
          deliveredDateTime?: string
        }>
      }
    }
  }
}

// Map DocuSign status to our status enum
function mapEnvelopeStatus(dsStatus: string): string {
  const statusMap: Record<string, string> = {
    created: 'created',
    sent: 'sent',
    delivered: 'delivered',
    signed: 'signed',
    completed: 'completed',
    declined: 'declined',
    voided: 'voided',
    deleted: 'deleted',
  }
  return statusMap[dsStatus.toLowerCase()] || dsStatus.toLowerCase()
}

// Map DocuSign recipient status to our status enum
function mapRecipientStatus(dsStatus: string): string {
  const statusMap: Record<string, string> = {
    created: 'created',
    sent: 'sent',
    delivered: 'delivered',
    completed: 'completed',
    signed: 'completed',
    declined: 'declined',
    autoresponded: 'completed',
  }
  return statusMap[dsStatus.toLowerCase()] || dsStatus.toLowerCase()
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify the request is from DocuSign (basic validation)
    const authHeader = req.headers.get('Authorization')

    // In production, you should verify the HMAC signature
    // See: https://developers.docusign.com/platform/webhooks/connect/hmac/
    if (!authHeader && Deno.env.get('DOCUSIGN_WEBHOOK_SECRET')) {
      console.warn('No Authorization header - webhook may not be properly secured')
    }

    // Parse the webhook payload
    const contentType = req.headers.get('Content-Type')
    let event: DocuSignEnvelopeEvent

    if (contentType?.includes('application/json')) {
      event = await req.json()
    } else if (contentType?.includes('application/xml')) {
      // DocuSign can send XML - convert to JSON
      const _xmlText = await req.text()
      // For now, return error - implement XML parsing if needed
      console.error('XML payloads not yet supported')
      return new Response(
        JSON.stringify({ error: 'XML payloads not supported - please configure JSON' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      return new Response(
        JSON.stringify({ error: 'Unsupported content type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Received DocuSign webhook event:', event.event, 'for envelope:', event.data.envelopeId)

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const envelopeId = event.data.envelopeId
    const envelopeSummary = event.data.envelopeSummary

    // Find the envelope in our database
    const { data: envelope, error: envError } = await supabase
      .from('docusign_envelopes')
      .select('id, company_id, local_document_id, document_type')
      .eq('envelope_id', envelopeId)
      .single()

    if (envError || !envelope) {
      console.log('Envelope not found in database:', envelopeId)
      // Return 200 to acknowledge receipt (don't want DocuSign to retry)
      return new Response(
        JSON.stringify({ status: 'envelope_not_found', envelope_id: envelopeId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const envelopeDbId = envelope.id
    const newStatus = mapEnvelopeStatus(envelopeSummary.status)

    // Update envelope status
    const envelopeUpdate: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    }

    // Add timestamps based on status
    if (envelopeSummary.sentDateTime) {
      envelopeUpdate.sent_at = envelopeSummary.sentDateTime
    }
    if (envelopeSummary.deliveredDateTime) {
      envelopeUpdate.delivered_at = envelopeSummary.deliveredDateTime
    }
    if (envelopeSummary.completedDateTime) {
      envelopeUpdate.completed_at = envelopeSummary.completedDateTime
    }
    if (envelopeSummary.declinedDateTime) {
      envelopeUpdate.declined_at = envelopeSummary.declinedDateTime
    }
    if (envelopeSummary.voidedDateTime) {
      envelopeUpdate.voided_at = envelopeSummary.voidedDateTime
      envelopeUpdate.void_reason = envelopeSummary.voidedReason
    }

    const { error: updateError } = await supabase
      .from('docusign_envelopes')
      .update(envelopeUpdate)
      .eq('id', envelopeDbId)

    if (updateError) {
      console.error('Error updating envelope:', updateError)
      throw updateError
    }

    // Update recipient statuses
    const allRecipients = [
      ...(envelopeSummary.recipients.signers || []),
      ...(envelopeSummary.recipients.carbonCopies || []),
    ]

    for (const recipient of allRecipients) {
      const recipientUpdate: Record<string, unknown> = {
        status: mapRecipientStatus(recipient.status),
        updated_at: new Date().toISOString(),
      }

      if (recipient.deliveredDateTime) {
        recipientUpdate.delivered_at = recipient.deliveredDateTime
      }
      if ('signedDateTime' in recipient && recipient.signedDateTime) {
        recipientUpdate.signed_at = recipient.signedDateTime
      }
      if ('declinedDateTime' in recipient && recipient.declinedDateTime) {
        recipientUpdate.declined_at = recipient.declinedDateTime
        recipientUpdate.declined_reason = (recipient as any).declinedReason
      }

      await supabase
        .from('docusign_envelope_recipients')
        .update(recipientUpdate)
        .eq('envelope_db_id', envelopeDbId)
        .eq('recipient_id', recipient.recipientId)
    }

    // Log the event
    await supabase.from('docusign_envelope_events').insert({
      envelope_db_id: envelopeDbId,
      event_type: event.event,
      event_time: event.generatedDateTime,
      ds_envelope_status: envelopeSummary.status,
      raw_payload: event,
    })

    // If envelope is completed, update the linked local document
    if (newStatus === 'completed' && envelope.local_document_id) {
      await updateLocalDocument(
        supabase,
        envelope.document_type,
        envelope.local_document_id,
        envelope.company_id
      )
    }

    console.log('Successfully processed webhook for envelope:', envelopeId, 'new status:', newStatus)

    return new Response(
      JSON.stringify({
        status: 'success',
        envelope_id: envelopeId,
        new_status: newStatus,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Webhook processing error:', error)

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

/**
 * Update the local document when signing is complete
 */
async function updateLocalDocument(
  supabase: ReturnType<typeof createClient>,
  documentType: string,
  localDocumentId: string,
  companyId: string
): Promise<void> {
  try {
    switch (documentType) {
      case 'payment_application':
        // Update payment application status
        await supabase
          .from('payment_applications')
          .update({
            // Mark as signed/certified
            status: 'certified',
            signed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', localDocumentId)
          .eq('company_id', companyId)
        break

      case 'change_order':
        // Update change order status
        await supabase
          .from('change_orders')
          .update({
            status: 'approved',
            signed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', localDocumentId)
          .eq('company_id', companyId)
        break

      case 'lien_waiver':
        // Update lien waiver status
        await supabase
          .from('lien_waivers')
          .update({
            status: 'signed',
            signed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', localDocumentId)
          .eq('company_id', companyId)
        break

      case 'contract':
      case 'subcontract':
        // Update contract status
        await supabase
          .from('contracts')
          .update({
            status: 'executed',
            executed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', localDocumentId)
          .eq('company_id', companyId)
        break

      default:
        console.log('Unknown document type for local update:', documentType)
    }

    console.log('Updated local document:', documentType, localDocumentId)
  } catch (error) {
    console.error('Error updating local document:', error)
    // Don't throw - we don't want to fail the webhook for this
  }
}
