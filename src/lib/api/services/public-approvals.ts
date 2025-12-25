/**
 * Public Approvals API Service
 *
 * Handles public (unauthenticated) approval workflows:
 * - Token validation
 * - Public link management
 * - Client response submission
 */

import { supabase } from '@/lib/supabase';
import { ApiErrorClass } from '../errors';
import type {
  PublicApprovalLink,
  PublicApprovalPageData,
  ClientApprovalResponse,
  CreatePublicLinkInput,
  SubmitClientApprovalInput,
  PublicLinkValidation,
} from '@/types/approval-workflow';

// ============================================================================
// PUBLIC APPROVAL LINK MANAGEMENT (Authenticated)
// ============================================================================

/**
 * Create a new public approval link
 * Requires authentication
 */
export async function createPublicApprovalLink(
  input: CreatePublicLinkInput
): Promise<PublicApprovalLink> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    throw new ApiErrorClass(401, 'Authentication required');
  }

  // Calculate expiration date
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (input.expires_in_days || 30));

  const { data, error } = await supabase
    .from('public_approval_links')
    .insert({
      approval_request_id: input.approval_request_id,
      client_email: input.client_email || null,
      client_name: input.client_name || null,
      link_type: input.link_type || 'single_use',
      expires_at: expiresAt.toISOString(),
      max_uses: input.link_type === 'single_use' ? 1 : (input.max_uses || 10),
      created_by: user.user.id,
    })
    .select()
    .single();

  if (error) {
    throw new ApiErrorClass(500, 'Failed to create public approval link', error);
  }

  return data as PublicApprovalLink;
}

/**
 * Get all public approval links for an approval request
 * Requires authentication
 */
export async function getPublicApprovalLinks(
  approvalRequestId: string
): Promise<PublicApprovalLink[]> {
  const { data, error } = await supabase
    .from('public_approval_links')
    .select('*')
    .eq('approval_request_id', approvalRequestId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new ApiErrorClass(500, 'Failed to fetch public approval links', error);
  }

  return data as PublicApprovalLink[];
}

/**
 * Revoke a public approval link
 * Requires authentication
 */
export async function revokePublicApprovalLink(linkId: string): Promise<void> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    throw new ApiErrorClass(401, 'Authentication required');
  }

  const { error } = await supabase
    .from('public_approval_links')
    .update({
      revoked_at: new Date().toISOString(),
      revoked_by: user.user.id,
    })
    .eq('id', linkId);

  if (error) {
    throw new ApiErrorClass(500, 'Failed to revoke public approval link', error);
  }
}

// ============================================================================
// PUBLIC APPROVAL ACCESS (Unauthenticated)
// ============================================================================

/**
 * Validate a public approval token
 * Does NOT require authentication
 */
export async function validatePublicApprovalToken(
  token: string
): Promise<PublicLinkValidation> {
  const { data, error } = await supabase.rpc('validate_public_approval_link', {
    p_token: token,
  });

  if (error) {
    return {
      is_valid: false,
      link_id: null,
      approval_request_id: null,
      remaining_uses: null,
      error_message: error.message,
    };
  }

  // Handle no matching token
  if (!data || data.length === 0) {
    return {
      is_valid: false,
      link_id: null,
      approval_request_id: null,
      remaining_uses: null,
      error_message: 'Invalid or expired approval link',
    };
  }

  const result = data[0];
  return {
    is_valid: result.is_valid,
    link_id: result.link_id,
    approval_request_id: result.approval_request_id,
    remaining_uses: result.remaining_uses,
    error_message: result.error_message,
  };
}

/**
 * Get public approval page data by token
 * Does NOT require authentication
 */
export async function getPublicApprovalPageData(
  token: string
): Promise<PublicApprovalPageData | null> {
  // First validate the token
  const validation = await validatePublicApprovalToken(token);
  if (!validation.is_valid || !validation.link_id) {
    return null;
  }

  // Get the link with related data
  const { data: linkData, error: linkError } = await supabase
    .from('public_approval_links')
    .select(`
      *,
      approval_request:approval_requests(
        *,
        workflow:approval_workflows(*),
        initiator:profiles!approval_requests_initiated_by_fkey(id, full_name, email),
        current_step_info:approval_steps(*)
      )
    `)
    .eq('id', validation.link_id)
    .single();

  if (linkError || !linkData) {
    return null;
  }

  const approvalRequest = linkData.approval_request;
  if (!approvalRequest) {
    return null;
  }

  // Get entity details based on entity type
  const entityDetails = await getEntityDetails(
    approvalRequest.entity_type,
    approvalRequest.entity_id
  );

  // Get project details
  const { data: projectData } = await supabase
    .from('projects')
    .select(`
      id,
      name,
      company:companies(name)
    `)
    .eq('id', approvalRequest.project_id)
    .single();

  // Check for existing response
  const { data: existingResponse } = await supabase
    .from('client_approval_responses')
    .select('*')
    .eq('public_link_id', validation.link_id)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .single();

  // Update last accessed timestamp
  await supabase
    .from('public_approval_links')
    .update({
      last_accessed_at: new Date().toISOString(),
    })
    .eq('id', validation.link_id);

  return {
    link: linkData as PublicApprovalLink,
    request: approvalRequest,
    workflow: approvalRequest.workflow,
    entity_details: entityDetails,
    project: {
      id: projectData?.id || '',
      name: projectData?.name || 'Unknown Project',
      company_name: projectData?.company?.name || 'Unknown Company',
    },
    existing_response: existingResponse as ClientApprovalResponse | undefined,
  };
}

/**
 * Get entity details based on type
 */
async function getEntityDetails(
  entityType: string,
  entityId: string
): Promise<PublicApprovalPageData['entity_details']> {
  let name = 'Unknown';
  let description: string | null = null;
  let referenceNumber: string | null = null;
  let amount: number | undefined;
  const attachments: Array<{ id: string; name: string; url: string; type: string }> = [];

  switch (entityType) {
    case 'document': {
      const { data } = await supabase
        .from('documents')
        .select('id, name, description, document_number')
        .eq('id', entityId)
        .single();
      if (data) {
        name = data.name;
        description = data.description;
        referenceNumber = data.document_number;
      }
      break;
    }
    case 'submittal': {
      const { data } = await supabase
        .from('submittals')
        .select('id, title, description, submittal_number')
        .eq('id', entityId)
        .single();
      if (data) {
        name = data.title;
        description = data.description;
        referenceNumber = data.submittal_number;
      }
      break;
    }
    case 'rfi': {
      const { data } = await supabase
        .from('rfis')
        .select('id, subject, question, rfi_number')
        .eq('id', entityId)
        .single();
      if (data) {
        name = data.subject;
        description = data.question;
        referenceNumber = data.rfi_number;
      }
      break;
    }
    case 'change_order': {
      const { data } = await supabase
        .from('change_orders')
        .select('id, title, description, change_order_number, amount')
        .eq('id', entityId)
        .single();
      if (data) {
        name = data.title;
        description = data.description;
        referenceNumber = data.change_order_number;
        amount = data.amount;
      }
      break;
    }
  }

  return {
    type: entityType as any,
    name,
    description,
    reference_number: referenceNumber,
    amount,
    attachments,
  };
}

/**
 * Submit a client approval response
 * Does NOT require authentication
 */
export async function submitClientApprovalResponse(
  input: SubmitClientApprovalInput,
  ipAddress?: string,
  userAgent?: string
): Promise<ClientApprovalResponse> {
  // Call the database function that handles validation and submission
  const { data, error } = await supabase.rpc('submit_client_approval_response', {
    p_public_link_id: input.public_link_id,
    p_decision: input.decision,
    p_client_name: input.client_name,
    p_client_email: input.client_email,
    p_comments: input.comments || null,
    p_conditions: input.conditions || null,
    p_client_company: input.client_company || null,
    p_client_title: input.client_title || null,
    p_signature_data: input.signature_data || null,
    p_ip_address: ipAddress || null,
    p_user_agent: userAgent || null,
  });

  if (error) {
    // Check for rate limiting error
    if (error.message.includes('rate limit')) {
      throw new ApiErrorClass(429, 'Too many requests. Please try again later.');
    }
    // Check for validation errors
    if (error.message.includes('expired') || error.message.includes('revoked') || error.message.includes('Invalid')) {
      throw new ApiErrorClass(400, error.message);
    }
    throw new ApiErrorClass(500, 'Failed to submit approval response', error);
  }

  if (!data || data.length === 0) {
    throw new ApiErrorClass(500, 'Failed to submit approval response');
  }

  return data[0] as ClientApprovalResponse;
}

// ============================================================================
// EMAIL NOTIFICATIONS
// ============================================================================

/**
 * Send an approval link via email
 * Requires authentication
 */
export async function sendApprovalLinkEmail(
  linkId: string,
  recipientEmail: string,
  customMessage?: string
): Promise<void> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    throw new ApiErrorClass(401, 'Authentication required');
  }

  // Get the link details
  const { data: linkData, error: linkError } = await supabase
    .from('public_approval_links')
    .select(`
      *,
      approval_request:approval_requests(
        *,
        workflow:approval_workflows(name)
      )
    `)
    .eq('id', linkId)
    .single();

  if (linkError || !linkData) {
    throw new ApiErrorClass(404, 'Approval link not found');
  }

  // Create notification record
  const { error: notifError } = await supabase
    .from('approval_request_notifications')
    .insert({
      approval_request_id: linkData.approval_request_id,
      public_link_id: linkId,
      recipient_email: recipientEmail,
      notification_type: 'email',
      subject: `Action Required: Approval Request - ${linkData.approval_request?.workflow?.name || 'Document'}`,
      body: customMessage || `You have been asked to review and approve a document. Please click the link to review.`,
      sent_by: user.user.id,
      sent_at: new Date().toISOString(),
      status: 'pending',
    });

  if (notifError) {
    throw new ApiErrorClass(500, 'Failed to queue notification', notifError);
  }

  // In production, this would trigger an edge function or webhook to send the email
  // For now, we just record the notification
}

/**
 * Get client approval responses for an approval request
 * Requires authentication
 */
export async function getClientApprovalResponses(
  approvalRequestId: string
): Promise<ClientApprovalResponse[]> {
  const { data, error } = await supabase
    .from('client_approval_responses')
    .select(`
      *,
      public_link:public_approval_links(*)
    `)
    .eq('approval_request_id', approvalRequestId)
    .order('submitted_at', { ascending: false });

  if (error) {
    throw new ApiErrorClass(500, 'Failed to fetch client responses', error);
  }

  return data as ClientApprovalResponse[];
}

export const publicApprovalsApi = {
  // Authenticated operations
  createPublicApprovalLink,
  getPublicApprovalLinks,
  revokePublicApprovalLink,
  sendApprovalLinkEmail,
  getClientApprovalResponses,

  // Public operations (no auth required)
  validatePublicApprovalToken,
  getPublicApprovalPageData,
  submitClientApprovalResponse,
};
