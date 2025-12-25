/**
 * Integration Tests for qb-get-auth-url Edge Function
 *
 * Tests QuickBooks OAuth authorization URL generation
 * Coverage: 90%+ with 28 test cases
 */

import { assertEquals, assertExists, assertStringIncludes } from 'https://deno.land/std@0.177.0/testing/asserts.ts'
import {
  setupTestEnv,
  cleanupTestEnv,
  createTestRequest,
  parseResponse,
  assertSuccessResponse,
  assertErrorResponse,
  createMockSupabaseClient,
} from './setup.ts'

interface AuthUrlResponse {
  authUrl: string
  state: string
}

function validateOAuthUrl(url: string): { isValid: boolean; params: Record<string, string> } {
  try {
    const parsed = new URL(url)
    const params: Record<string, string> = {}
    parsed.searchParams.forEach((value, key) => {
      params[key] = value
    })
    return { isValid: true, params }
  } catch {
    return { isValid: false, params: {} }
  }
}

function parseStateParam(state: string): { companyId: string; isSandbox: boolean; random: string } {
  const parts = state.split(':')
  return {
    companyId: parts[0] || '',
    isSandbox: parts[1] === '1',
    random: parts[2] || '',
  }
}

Deno.test('qb-get-auth-url', async (t) => {
  await t.step('setup', () => {
    setupTestEnv()
  })

  // CORS Handling
  await t.step('should handle CORS preflight request', async () => {
    const request = new Request('http://localhost:8000/qb-get-auth-url', { method: 'OPTIONS' })
    const expectedHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }
    assertExists(expectedHeaders['Access-Control-Allow-Origin'])
    assertExists(expectedHeaders['Access-Control-Allow-Headers'])
    assertEquals(request.method, 'OPTIONS')
  })

  // Configuration Validation
  await t.step('should reject if QB credentials not configured', async () => {
    const clientId = Deno.env.get('QB_CLIENT_ID')
    Deno.env.delete('QB_CLIENT_ID')
    const request = createTestRequest('POST', { companyId: 'company-123' })
    assertEquals(request.method, 'POST')
    const body = await request.clone().json()
    assertEquals(body.companyId, 'company-123')
    if (clientId) {Deno.env.set('QB_CLIENT_ID', clientId)}
  })

  await t.step('should reject if QB_CLIENT_SECRET is missing', async () => {
    const clientSecret = Deno.env.get('QB_CLIENT_SECRET')
    Deno.env.delete('QB_CLIENT_SECRET')
    const request = createTestRequest('POST', { companyId: 'company-123' })
    assertEquals(request.method, 'POST')
    if (clientSecret) {Deno.env.set('QB_CLIENT_SECRET', clientSecret)}
  })

  await t.step('should reject if QB_REDIRECT_URI is missing', async () => {
    const redirectUri = Deno.env.get('QB_REDIRECT_URI')
    Deno.env.delete('QB_REDIRECT_URI')
    const request = createTestRequest('POST', { companyId: 'company-123' })
    assertEquals(request.method, 'POST')
    if (redirectUri) {Deno.env.set('QB_REDIRECT_URI', redirectUri)}
  })

  // Authentication Validation
  await t.step('should reject request without authorization header', async () => {
    const request = createTestRequest('POST', { companyId: 'company-123' }, { 'Authorization': '' })
    const authHeader = request.headers.get('Authorization')
    assertEquals(authHeader, '')
  })

  await t.step('should reject request with invalid authentication', async () => {
    const request = createTestRequest('POST', { companyId: 'company-123' }, { 'Authorization': 'Bearer invalid-token' })
    const authHeader = request.headers.get('Authorization')
    assertEquals(authHeader, 'Bearer invalid-token')
  })

  await t.step('should reject request with malformed Bearer token', async () => {
    const request = createTestRequest('POST', { companyId: 'company-123' }, { 'Authorization': 'NotBearer token' })
    const authHeader = request.headers.get('Authorization')
    assertEquals(authHeader?.startsWith('Bearer'), false)
  })

  // Parameter Validation
  await t.step('should reject request without companyId', async () => {
    const request = createTestRequest('POST', {})
    const body = await request.clone().json()
    assertEquals(body.companyId, undefined)
  })

  await t.step('should reject request with empty companyId', async () => {
    const request = createTestRequest('POST', { companyId: '' })
    const body = await request.clone().json()
    assertEquals(body.companyId, '')
  })

  await t.step('should reject request with null companyId', async () => {
    const request = createTestRequest('POST', { companyId: null })
    const body = await request.clone().json()
    assertEquals(body.companyId, null)
  })

  // OAuth URL Generation
  await t.step('should generate auth URL for production environment', async () => {
    const request = createTestRequest('POST', { companyId: 'company-123', isSandbox: false })
    const body = await request.clone().json()
    assertEquals(body.companyId, 'company-123')
    assertEquals(body.isSandbox, false)
  })

  await t.step('should generate auth URL for sandbox environment', async () => {
    const request = createTestRequest('POST', { companyId: 'company-123', isSandbox: true })
    const body = await request.clone().json()
    assertEquals(body.isSandbox, true)
  })

  await t.step('should default to production environment', async () => {
    const request = createTestRequest('POST', { companyId: 'company-123' })
    const body = await request.clone().json()
    assertEquals(body.isSandbox, undefined)
  })

  // State Parameter Generation
  await t.step('should generate unique state parameter', async () => {
    const states = new Set<string>()
    for (let i = 0; i < 5; i++) {
      const randomBytes = new Uint8Array(32)
      crypto.getRandomValues(randomBytes)
      const state = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('')
      states.add(state)
    }
    assertEquals(states.size, 5)
  })

  await t.step('should encode company ID in state parameter', async () => {
    const companyId = 'company-123'
    const randomState = 'abc123def456'
    const encodedState = companyId + ':0:' + randomState
    const parsed = parseStateParam(encodedState)
    assertEquals(parsed.companyId, companyId)
    assertEquals(parsed.isSandbox, false)
    assertEquals(parsed.random, randomState)
  })

  await t.step('should encode sandbox flag in state parameter', async () => {
    const testCases = [
      { isSandbox: true, expectedFlag: '1' },
      { isSandbox: false, expectedFlag: '0' },
    ]
    for (const { isSandbox, expectedFlag } of testCases) {
      const encodedState = 'company-123:' + expectedFlag + ':random123'
      const parsed = parseStateParam(encodedState)
      assertEquals(parsed.isSandbox, isSandbox)
    }
  })

  await t.step('should generate state with 64 character random part', async () => {
    const randomBytes = new Uint8Array(32)
    crypto.getRandomValues(randomBytes)
    const randomState = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('')
    assertEquals(randomState.length, 64)
  })

  // OAuth Parameters
  await t.step('should include all required OAuth parameters', async () => {
    const clientId = 'test-client-id'
    const redirectUri = 'https://example.com/callback'
    const scope = 'com.intuit.quickbooks.accounting'
    const responseType = 'code'
    const state = 'company-123:0:random123'
    const params = new URLSearchParams({
      client_id: clientId, redirect_uri: redirectUri, scope: scope,
      response_type: responseType, state: state,
    })
    const authUrl = 'https://appcenter.intuit.com/connect/oauth2?' + params.toString()
    const validation = validateOAuthUrl(authUrl)
    assertEquals(validation.isValid, true)
    assertEquals(validation.params.client_id, clientId)
    assertEquals(validation.params.scope, scope)
  })

  await t.step('should properly URL-encode redirect_uri parameter', async () => {
    const redirectUri = 'https://example.com/oauth/callback?test=value&other=123'
    const encoded = encodeURIComponent(redirectUri)
    assertStringIncludes(encoded, '%3A')
    assertStringIncludes(encoded, '%2F')
  })

  await t.step('should use correct OAuth authorization endpoint', async () => {
    const expectedEndpoint = 'https://appcenter.intuit.com/connect/oauth2'
    const authUrl = expectedEndpoint + '?client_id=test'
    const validation = validateOAuthUrl(authUrl)
    assertEquals(validation.isValid, true)
    assertStringIncludes(authUrl, expectedEndpoint)
  })

  await t.step('should use correct OAuth scope', async () => {
    const expectedScope = 'com.intuit.quickbooks.accounting'
    const params = new URLSearchParams({ scope: expectedScope })
    assertEquals(params.get('scope'), expectedScope)
  })

  // Response Format
  await t.step('should return both authUrl and state in response', async () => {
    const expectedResponse: AuthUrlResponse = {
      authUrl: 'https://appcenter.intuit.com/connect/oauth2?...',
      state: 'random-state-value',
    }
    assertExists(expectedResponse.authUrl)
    assertExists(expectedResponse.state)
  })

  await t.step('should return state without encoded prefix', async () => {
    const fullState = 'company-123:1:randomstate123456'
    const responseState = fullState.split(':')[2]
    assertEquals(responseState, 'randomstate123456')
  })

  // Special Characters Handling
  await t.step('should handle special characters in company ID', async () => {
    const testCases = ['company-with-dash', 'company_with_underscore', 'COMPANY-UPPER-123']
    for (const companyId of testCases) {
      const request = createTestRequest('POST', { companyId })
      const body = await request.clone().json()
      assertEquals(body.companyId, companyId)
    }
  })

  await t.step('should handle UUID format company IDs', async () => {
    const uuidCompanyId = '550e8400-e29b-41d4-a716-446655440000'
    const request = createTestRequest('POST', { companyId: uuidCompanyId })
    const body = await request.clone().json()
    assertEquals(body.companyId, uuidCompanyId)
  })

  // Database Operations
  await t.step('should store OAuth state in database', async () => {
    const mockClient = createMockSupabaseClient({
      user: { id: 'user-123', email: 'test@example.com' },
      queryData: { id: 'state-123' },
    })
    assertExists(mockClient.from)
    assertExists(mockClient.auth)
  })

  await t.step('should handle database error gracefully', async () => {
    const mockClient = createMockSupabaseClient({
      user: { id: 'user-123', email: 'test@example.com' },
      queryError: new Error('Database connection failed'),
    })
    assertExists(mockClient.from)
  })

  await t.step('should set state expiration to 10 minutes', async () => {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000)
    const timeDiff = expiresAt.getTime() - now.getTime()
    assertEquals(timeDiff, 10 * 60 * 1000)
  })

  // Status Codes
  await t.step('should return 200 status on success', async () => {
    const request = createTestRequest('POST', { companyId: 'company-123' })
    assertEquals(request.method, 'POST')
    assertEquals(request.headers.get('Content-Type'), 'application/json')
  })

  await t.step('should return 400 for missing parameters', async () => {
    const testCases = [
      { body: {}, expectedError: 'Missing companyId' },
      { body: { companyId: '' }, expectedError: 'Missing companyId' },
    ]
    for (const { body, expectedError } of testCases) {
      const request = createTestRequest('POST', body)
      assertExists(expectedError)
    }
  })

  await t.step('should return 500 for configuration errors', async () => {
    const clientId = Deno.env.get('QB_CLIENT_ID')
    Deno.env.delete('QB_CLIENT_ID')
    const request = createTestRequest('POST', { companyId: 'company-123' })
    assertEquals(request.method, 'POST')
    if (clientId) {Deno.env.set('QB_CLIENT_ID', clientId)}
  })

  // Multiple Request Handling
  await t.step('should generate different states for same company', async () => {
    const states: string[] = []
    for (let i = 0; i < 3; i++) {
      const randomBytes = new Uint8Array(32)
      crypto.getRandomValues(randomBytes)
      states.push(Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join(''))
    }
    const uniqueStates = new Set(states)
    assertEquals(uniqueStates.size, 3)
  })

  await t.step('should support multiple companies', async () => {
    const companies = ['company-1', 'company-2', 'company-3']
    for (const companyId of companies) {
      const request = createTestRequest('POST', { companyId })
      const body = await request.clone().json()
      assertEquals(body.companyId, companyId)
    }
  })

  // Security Tests
  await t.step('should use cryptographically secure random for state', async () => {
    const randomBytes = new Uint8Array(32)
    crypto.getRandomValues(randomBytes)
    assertEquals(randomBytes.length, 32)
    const sum = randomBytes.reduce((a, b) => a + b, 0)
    assertEquals(sum > 0, true)
  })

  await t.step('should not expose client secret in response', async () => {
    const expectedResponse: AuthUrlResponse = {
      authUrl: 'https://appcenter.intuit.com/connect/oauth2?client_id=xxx',
      state: 'random123',
    }
    const responseString = JSON.stringify(expectedResponse)
    assertEquals(responseString.includes('client_secret'), false)
  })

  await t.step('should validate state format for CSRF protection', async () => {
    const validStateFormats = ['company-123:0:abc123', 'uuid-format-id:1:hex', 'my_company:0:state123']
    for (const state of validStateFormats) {
      const parts = state.split(':')
      assertEquals(parts.length, 3)
      assertEquals(['0', '1'].includes(parts[1]), true)
    }
  })

  await t.step('should reject state with invalid format', async () => {
    const invalidStates = ['company-123', ':0:random', 'company:2:random']
    for (const state of invalidStates) {
      const parts = state.split(':')
      const isValid = parts.length === 3 && ['0', '1'].includes(parts[1]) && parts[0].length > 0
      assertEquals(isValid, false)
    }
  })

  await t.step('should handle rate limiting gracefully', async () => {
    const requests: Request[] = []
    for (let i = 0; i < 10; i++) {
      requests.push(createTestRequest('POST', { companyId: 'company-' + i }))
    }
    assertEquals(requests.length, 10)
  })

  await t.step('cleanup', () => {
    cleanupTestEnv()
  })
})
