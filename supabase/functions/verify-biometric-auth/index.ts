/**
 * Verify Biometric Authentication Edge Function
 *
 * Verifies WebAuthn assertion and returns authentication token.
 * This function handles the server-side verification of biometric authentication.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * WebAuthn verification request payload
 */
interface VerificationPayload {
  credentialId: string;
  authenticatorData: string; // Base64URL encoded
  clientDataJSON: string; // Base64URL encoded
  signature: string; // Base64URL encoded
  challenge: string; // Base64URL encoded challenge used during authentication
}

/**
 * Stored credential from database
 */
interface StoredCredential {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: string;
  device_name: string;
  transports: string[];
}

/**
 * Convert Base64URL to standard Base64
 */
function base64UrlToBase64(base64Url: string): string {
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  return base64 + padding;
}

/**
 * Decode Base64URL to Uint8Array
 */
function base64UrlDecode(base64Url: string): Uint8Array {
  const base64 = base64UrlToBase64(base64Url);
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Import public key for verification
 */
async function importPublicKey(publicKeyBase64: string): Promise<CryptoKey> {
  const publicKeyBytes = base64UrlDecode(publicKeyBase64);

  // Try ECDSA P-256 first (ES256)
  try {
    return await crypto.subtle.importKey(
      'spki',
      publicKeyBytes,
      {
        name: 'ECDSA',
        namedCurve: 'P-256',
      },
      true,
      ['verify']
    );
  } catch {
    // Fall back to RSA (RS256)
    return await crypto.subtle.importKey(
      'spki',
      publicKeyBytes,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      true,
      ['verify']
    );
  }
}

/**
 * Verify WebAuthn signature
 */
async function verifySignature(
  publicKey: CryptoKey,
  signature: Uint8Array,
  authenticatorData: Uint8Array,
  clientDataJSON: Uint8Array
): Promise<boolean> {
  // Create the signed data: authenticatorData + SHA-256(clientDataJSON)
  const clientDataHash = await crypto.subtle.digest('SHA-256', clientDataJSON);
  const signedData = new Uint8Array(authenticatorData.length + clientDataHash.byteLength);
  signedData.set(authenticatorData, 0);
  signedData.set(new Uint8Array(clientDataHash), authenticatorData.length);

  // Determine algorithm from key
  const algorithm = publicKey.algorithm.name === 'ECDSA'
    ? { name: 'ECDSA', hash: 'SHA-256' }
    : { name: 'RSASSA-PKCS1-v1_5' };

  // For ECDSA, we need to convert the signature from WebAuthn format (DER) to raw format
  let signatureToVerify = signature;
  if (publicKey.algorithm.name === 'ECDSA') {
    signatureToVerify = derToRaw(signature);
  }

  return await crypto.subtle.verify(
    algorithm,
    publicKey,
    signatureToVerify,
    signedData
  );
}

/**
 * Convert DER-encoded ECDSA signature to raw format
 * WebAuthn uses DER encoding, but Web Crypto API expects raw (r || s) format
 */
function derToRaw(derSignature: Uint8Array): Uint8Array {
  // DER format: 0x30 [total-length] 0x02 [r-length] [r] 0x02 [s-length] [s]
  const rLength = derSignature[3];
  const rOffset = 4;
  const sLength = derSignature[4 + rLength + 1];
  const sOffset = 4 + rLength + 2;

  // Extract r and s values, removing leading zeros if present
  let r = derSignature.slice(rOffset, rOffset + rLength);
  let s = derSignature.slice(sOffset, sOffset + sLength);

  // Remove leading zero if present (used for sign in DER)
  if (r[0] === 0 && r.length > 32) {
    r = r.slice(1);
  }
  if (s[0] === 0 && s.length > 32) {
    s = s.slice(1);
  }

  // Pad to 32 bytes if needed
  const rawSignature = new Uint8Array(64);
  rawSignature.set(r, 32 - r.length);
  rawSignature.set(s, 64 - s.length);

  return rawSignature;
}

/**
 * Verify client data
 */
function verifyClientData(
  clientDataJSON: Uint8Array,
  expectedChallenge: string,
  expectedOrigin: string
): boolean {
  const clientData = JSON.parse(new TextDecoder().decode(clientDataJSON));

  // Verify type
  if (clientData.type !== 'webauthn.get') {
    console.error('Invalid client data type:', clientData.type);
    return false;
  }

  // Verify challenge
  if (clientData.challenge !== expectedChallenge) {
    console.error('Challenge mismatch');
    return false;
  }

  // Verify origin
  if (clientData.origin !== expectedOrigin) {
    // Allow localhost for development
    if (!clientData.origin.includes('localhost') && !expectedOrigin.includes('localhost')) {
      console.error('Origin mismatch:', clientData.origin, 'vs', expectedOrigin);
      return false;
    }
  }

  return true;
}

/**
 * Parse authenticator data to extract flags and counter
 */
function parseAuthenticatorData(authData: Uint8Array): {
  rpIdHash: Uint8Array;
  flags: number;
  userPresent: boolean;
  userVerified: boolean;
  signCount: number;
} {
  const rpIdHash = authData.slice(0, 32);
  const flags = authData[32];
  const signCount = new DataView(authData.buffer, authData.byteOffset + 33, 4).getUint32(0, false);

  return {
    rpIdHash,
    flags,
    userPresent: (flags & 0x01) !== 0,
    userVerified: (flags & 0x04) !== 0,
    signCount,
  };
}

/**
 * Log biometric audit event
 */
async function logAuditEvent(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  credentialId: string,
  eventType: string,
  success: boolean,
  errorMessage?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await supabase.from('biometric_audit_log').insert({
      user_id: userId,
      credential_id: credentialId,
      event_type: eventType,
      success,
      error_message: errorMessage,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request
    const payload: VerificationPayload = await req.json();

    // Get client info for audit logging
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip');
    const userAgent = req.headers.get('user-agent');
    const origin = req.headers.get('origin') || '';

    // Validate required fields
    if (!payload.credentialId || !payload.authenticatorData || !payload.clientDataJSON || !payload.signature) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Look up the credential
    const { data: credential, error: credentialError } = await supabase
      .from('biometric_credentials')
      .select('*')
      .eq('credential_id', payload.credentialId)
      .single();

    if (credentialError || !credential) {
      console.error('Credential not found:', credentialError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid credential',
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const storedCredential = credential as StoredCredential;

    // Decode the received data
    const authenticatorData = base64UrlDecode(payload.authenticatorData);
    const clientDataJSON = base64UrlDecode(payload.clientDataJSON);
    const signature = base64UrlDecode(payload.signature);

    // Verify client data
    if (!payload.challenge) {
      await logAuditEvent(
        supabase,
        storedCredential.user_id,
        storedCredential.credential_id,
        'authentication',
        false,
        'Missing challenge',
        ipAddress || undefined,
        userAgent || undefined
      );

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing challenge',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!verifyClientData(clientDataJSON, payload.challenge, origin)) {
      await logAuditEvent(
        supabase,
        storedCredential.user_id,
        storedCredential.credential_id,
        'authentication',
        false,
        'Client data verification failed',
        ipAddress || undefined,
        userAgent || undefined
      );

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Client data verification failed',
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse authenticator data
    const authDataParsed = parseAuthenticatorData(authenticatorData);

    // Verify user verification flag
    if (!authDataParsed.userVerified) {
      await logAuditEvent(
        supabase,
        storedCredential.user_id,
        storedCredential.credential_id,
        'authentication',
        false,
        'User verification required but not performed',
        ipAddress || undefined,
        userAgent || undefined
      );

      return new Response(
        JSON.stringify({
          success: false,
          error: 'User verification required',
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Import public key and verify signature
    let isValid = false;
    try {
      const publicKey = await importPublicKey(storedCredential.public_key);
      isValid = await verifySignature(publicKey, signature, authenticatorData, clientDataJSON);
    } catch (error) {
      console.error('Signature verification error:', error);
      isValid = false;
    }

    if (!isValid) {
      await logAuditEvent(
        supabase,
        storedCredential.user_id,
        storedCredential.credential_id,
        'authentication',
        false,
        'Signature verification failed',
        ipAddress || undefined,
        userAgent || undefined
      );

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Authentication failed',
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Update last_used timestamp
    await supabase
      .from('biometric_credentials')
      .update({ last_used: new Date().toISOString() })
      .eq('id', storedCredential.id);

    // Get user details
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
      storedCredential.user_id
    );

    if (userError || !userData.user) {
      console.error('User not found:', userError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'User not found',
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate a session for the user
    // Note: For production, you might want to use a custom token mechanism
    // or integrate with your existing auth flow
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: userData.user.email!,
      options: {
        redirectTo: origin,
      },
    });

    if (sessionError) {
      console.error('Session generation error:', sessionError);

      // Even if session generation fails, the authentication was successful
      // Log success but return a different response
      await logAuditEvent(
        supabase,
        storedCredential.user_id,
        storedCredential.credential_id,
        'authentication',
        true,
        'Session generation failed but auth succeeded',
        ipAddress || undefined,
        userAgent || undefined
      );

      // For now, return success with user ID - the client can handle the session
      return new Response(
        JSON.stringify({
          success: true,
          userId: storedCredential.user_id,
          verified: true,
          message: 'Authentication successful. Please use password login to complete session.',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Log successful authentication
    await logAuditEvent(
      supabase,
      storedCredential.user_id,
      storedCredential.credential_id,
      'authentication',
      true,
      undefined,
      ipAddress || undefined,
      userAgent || undefined
    );

    // Return success with token properties
    // Extract token from the magic link URL if available
    const properties = sessionData?.properties;

    return new Response(
      JSON.stringify({
        success: true,
        userId: storedCredential.user_id,
        email: userData.user.email,
        verified: true,
        // Include token if available from magic link
        token: properties?.hashed_token || undefined,
        // Include the magic link for client-side handling if needed
        actionLink: sessionData?.properties?.action_link || undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Biometric verification error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
