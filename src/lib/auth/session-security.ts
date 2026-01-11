// File: /src/lib/auth/session-security.ts
// Session security utilities for hijacking detection and device fingerprinting

import { logger } from '@/lib/utils/logger'
import { supabase } from '../supabase'

// ============================================================================
// Constants
// ============================================================================

const SESSION_FINGERPRINT_KEY = 'jobsight-session-fingerprint'
const SESSION_METADATA_KEY = 'jobsight-session-metadata'

// ============================================================================
// Types
// ============================================================================

export interface DeviceFingerprint {
  /** Browser user agent string */
  userAgent: string
  /** Screen resolution */
  screenResolution: string
  /** Timezone offset */
  timezoneOffset: number
  /** Preferred languages */
  languages: string[]
  /** Platform */
  platform: string
  /** Color depth */
  colorDepth: number
  /** Hardware concurrency (CPU cores) */
  hardwareConcurrency: number
  /** Device memory (if available) */
  deviceMemory: number | null
  /** Touch support */
  touchSupport: boolean
  /** Canvas fingerprint hash */
  canvasHash: string
  /** WebGL fingerprint */
  webglVendor: string
  /** Hash of the fingerprint */
  hash: string
}

export interface SessionMetadata {
  /** Fingerprint hash at session start */
  initialFingerprint: string
  /** Session creation time */
  createdAt: number
  /** Last activity time */
  lastActivity: number
  /** Number of fingerprint mismatches detected */
  mismatchCount: number
  /** IP address at session start (if available) */
  initialIp?: string
}

export interface SecurityCheckResult {
  /** Whether the security check passed */
  passed: boolean
  /** Reason for failure if applicable */
  reason?: string
  /** Risk level */
  riskLevel: 'none' | 'low' | 'medium' | 'high'
  /** Recommended action */
  action?: 'none' | 'warn' | 'reauth' | 'logout'
}

// ============================================================================
// Device Fingerprinting
// ============================================================================

/**
 * Generate a simple hash from a string
 */
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16)
}

/**
 * Get canvas fingerprint
 */
function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {return 'no-canvas'}

    canvas.width = 200
    canvas.height = 50

    // Draw text with specific font
    ctx.textBaseline = 'top'
    ctx.font = '14px Arial'
    ctx.fillStyle = '#f60'
    ctx.fillRect(125, 1, 62, 20)
    ctx.fillStyle = '#069'
    ctx.fillText('JobSight FP', 2, 15)
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)'
    ctx.fillText('JobSight FP', 4, 17)

    return simpleHash(canvas.toDataURL())
  } catch {
    return 'canvas-error'
  }
}

/**
 * Get WebGL vendor info
 */
function getWebGLVendor(): string {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) {return 'no-webgl'}

    const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info')
    if (!debugInfo) {return 'no-debug-info'}

    const vendor = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
    const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)

    return `${vendor}|${renderer}`
  } catch {
    return 'webgl-error'
  }
}

/**
 * Generate device fingerprint
 */
export function generateFingerprint(): DeviceFingerprint {
  const nav = typeof navigator !== 'undefined' ? navigator : null
  const screen = typeof window !== 'undefined' ? window.screen : null

  const fingerprint: Omit<DeviceFingerprint, 'hash'> = {
    userAgent: nav?.userAgent || 'unknown',
    screenResolution: screen ? `${screen.width}x${screen.height}` : 'unknown',
    timezoneOffset: new Date().getTimezoneOffset(),
    languages: nav?.languages ? Array.from(nav.languages) : ['unknown'],
    platform: nav?.platform || 'unknown',
    colorDepth: screen?.colorDepth || 0,
    hardwareConcurrency: nav?.hardwareConcurrency || 0,
    deviceMemory: (nav as Navigator & { deviceMemory?: number })?.deviceMemory || null,
    touchSupport: 'ontouchstart' in window || nav?.maxTouchPoints > 0,
    canvasHash: getCanvasFingerprint(),
    webglVendor: getWebGLVendor(),
  }

  // Generate overall hash
  const fingerprintString = JSON.stringify(fingerprint)
  const hash = simpleHash(fingerprintString)

  return { ...fingerprint, hash }
}

/**
 * Compare two fingerprints and return similarity score (0-1)
 */
export function compareFingerprints(
  fp1: DeviceFingerprint,
  fp2: DeviceFingerprint
): { similarity: number; differences: string[] } {
  const differences: string[] = []
  let matches = 0
  const total = 10

  // Check each property
  if (fp1.userAgent === fp2.userAgent) {matches++}
  else {differences.push('userAgent')}

  if (fp1.screenResolution === fp2.screenResolution) {matches++}
  else {differences.push('screenResolution')}

  if (fp1.timezoneOffset === fp2.timezoneOffset) {matches++}
  else {differences.push('timezoneOffset')}

  if (fp1.platform === fp2.platform) {matches++}
  else {differences.push('platform')}

  if (fp1.colorDepth === fp2.colorDepth) {matches++}
  else {differences.push('colorDepth')}

  if (fp1.hardwareConcurrency === fp2.hardwareConcurrency) {matches++}
  else {differences.push('hardwareConcurrency')}

  if (fp1.touchSupport === fp2.touchSupport) {matches++}
  else {differences.push('touchSupport')}

  if (fp1.canvasHash === fp2.canvasHash) {matches++}
  else {differences.push('canvasHash')}

  if (fp1.webglVendor === fp2.webglVendor) {matches++}
  else {differences.push('webglVendor')}

  // Languages can change, less weight
  if (JSON.stringify(fp1.languages) === JSON.stringify(fp2.languages)) {matches++}
  else {differences.push('languages')}

  return {
    similarity: matches / total,
    differences,
  }
}

// ============================================================================
// Session Security
// ============================================================================

/**
 * Store session fingerprint
 */
export function storeSessionFingerprint(fingerprint: DeviceFingerprint): void {
  try {
    localStorage.setItem(SESSION_FINGERPRINT_KEY, JSON.stringify(fingerprint))
  } catch (error) {
    logger.warn('[SessionSecurity] Failed to store fingerprint:', error)
  }
}

/**
 * Get stored session fingerprint
 */
export function getStoredFingerprint(): DeviceFingerprint | null {
  try {
    const stored = localStorage.getItem(SESSION_FINGERPRINT_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

/**
 * Store session metadata
 */
export function storeSessionMetadata(metadata: SessionMetadata): void {
  try {
    localStorage.setItem(SESSION_METADATA_KEY, JSON.stringify(metadata))
  } catch (error) {
    logger.warn('[SessionSecurity] Failed to store metadata:', error)
  }
}

/**
 * Get stored session metadata
 */
export function getSessionMetadata(): SessionMetadata | null {
  try {
    const stored = localStorage.getItem(SESSION_METADATA_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

/**
 * Update last activity time
 */
export function updateLastActivity(): void {
  const metadata = getSessionMetadata()
  if (metadata) {
    metadata.lastActivity = Date.now()
    storeSessionMetadata(metadata)
  }
}

/**
 * Clear session security data
 */
export function clearSessionSecurityData(): void {
  try {
    localStorage.removeItem(SESSION_FINGERPRINT_KEY)
    localStorage.removeItem(SESSION_METADATA_KEY)
  } catch {
    // Ignore errors
  }
}

/**
 * Initialize session security on login
 */
export function initializeSessionSecurity(): void {
  const fingerprint = generateFingerprint()
  storeSessionFingerprint(fingerprint)

  const metadata: SessionMetadata = {
    initialFingerprint: fingerprint.hash,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    mismatchCount: 0,
  }
  storeSessionMetadata(metadata)

  logger.log('[SessionSecurity] Session security initialized')
}

/**
 * Check for potential session hijacking
 */
export function checkSessionSecurity(): SecurityCheckResult {
  const storedFingerprint = getStoredFingerprint()
  const metadata = getSessionMetadata()

  // No stored fingerprint - fresh session
  if (!storedFingerprint || !metadata) {
    return {
      passed: true,
      riskLevel: 'none',
      action: 'none',
    }
  }

  const currentFingerprint = generateFingerprint()
  const { similarity, differences } = compareFingerprints(storedFingerprint, currentFingerprint)

  logger.debug('[SessionSecurity] Fingerprint similarity:', similarity, 'differences:', differences)

  // Perfect match
  if (similarity === 1) {
    return {
      passed: true,
      riskLevel: 'none',
      action: 'none',
    }
  }

  // High similarity (minor changes like window resize, language)
  if (similarity >= 0.8) {
    return {
      passed: true,
      riskLevel: 'low',
      reason: `Minor device changes detected: ${differences.join(', ')}`,
      action: 'none',
    }
  }

  // Medium similarity (some concerning changes)
  if (similarity >= 0.5) {
    // Update mismatch count
    metadata.mismatchCount++
    storeSessionMetadata(metadata)

    // If repeated mismatches, increase risk
    if (metadata.mismatchCount >= 3) {
      return {
        passed: false,
        riskLevel: 'high',
        reason: `Repeated device changes detected: ${differences.join(', ')}`,
        action: 'reauth',
      }
    }

    return {
      passed: true,
      riskLevel: 'medium',
      reason: `Device changes detected: ${differences.join(', ')}`,
      action: 'warn',
    }
  }

  // Low similarity - potential hijacking
  return {
    passed: false,
    riskLevel: 'high',
    reason: `Significant device mismatch detected: ${differences.join(', ')}`,
    action: 'logout',
  }
}

/**
 * Perform full security validation
 */
export async function validateSessionSecurity(): Promise<SecurityCheckResult> {
  // Check fingerprint
  const fingerprintCheck = checkSessionSecurity()

  if (!fingerprintCheck.passed) {
    logger.warn('[SessionSecurity] Security check failed:', fingerprintCheck.reason)

    // Log security event to Supabase (if online)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        await supabase.from('security_events').insert({
          user_id: session.user.id,
          event_type: 'session_security_warning',
          details: {
            reason: fingerprintCheck.reason,
            riskLevel: fingerprintCheck.riskLevel,
            action: fingerprintCheck.action,
          },
          created_at: new Date().toISOString(),
        }).catch(() => {
          // Table might not exist, ignore
        })
      }
    } catch {
      // Ignore errors logging security events
    }
  }

  return fingerprintCheck
}

// ============================================================================
// Activity Monitoring
// ============================================================================

let activityTimer: ReturnType<typeof setInterval> | null = null

/**
 * Start monitoring user activity
 */
export function startActivityMonitoring(
  onSecurityIssue?: (result: SecurityCheckResult) => void
): () => void {
  // Update activity on user interaction
  const events = ['mousedown', 'keydown', 'touchstart', 'scroll']

  const handleActivity = () => {
    updateLastActivity()
  }

  events.forEach((event) => {
    window.addEventListener(event, handleActivity, { passive: true })
  })

  // Periodic security check
  activityTimer = setInterval(async () => {
    const result = await validateSessionSecurity()
    if (!result.passed && onSecurityIssue) {
      onSecurityIssue(result)
    }
  }, 5 * 60 * 1000) // Every 5 minutes

  // Return cleanup function
  return () => {
    events.forEach((event) => {
      window.removeEventListener(event, handleActivity)
    })
    if (activityTimer) {
      clearInterval(activityTimer)
      activityTimer = null
    }
  }
}
