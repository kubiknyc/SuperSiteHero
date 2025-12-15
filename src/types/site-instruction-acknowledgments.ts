/**
 * Site Instruction Acknowledgment Types
 * For tracking acknowledgments of site instructions via QR code or manual submission
 */

export interface SiteInstructionAcknowledgment {
  id: string;
  site_instruction_id: string;
  acknowledged_by: string;
  acknowledged_at: string;
  signature_data?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  photo_ids?: string[] | null;
  notes?: string | null;
  is_offline_submission: boolean;
  synced_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAcknowledgmentInput {
  site_instruction_id: string;
  signature_data?: string;
  location_lat?: number;
  location_lng?: number;
  photo_ids?: string[];
  notes?: string;
  is_offline_submission?: boolean;
}

export interface AcknowledgmentWithUser extends SiteInstructionAcknowledgment {
  user?: {
    id: string;
    email: string;
    full_name?: string;
  };
}

export interface OfflineAcknowledgment {
  id: string;
  site_instruction_id: string;
  signature_data?: string;
  location_lat?: number;
  location_lng?: number;
  photo_files?: File[];
  notes?: string;
  created_at: string;
  retry_count: number;
  last_attempt?: string;
  error?: string;
}

export interface QRCodeData {
  token: string;
  instruction_id: string;
  expires_at?: string;
}
