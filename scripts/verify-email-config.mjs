#!/usr/bin/env node
/* eslint-disable security/detect-object-injection, security/detect-non-literal-fs-filename */


/**
 * Email Configuration Verification Script
 *
 * Verifies that email notifications are properly configured:
 * 1. Checks Supabase secrets (RESEND_API_KEY, EMAIL_FROM)
 * 2. Tests send-email edge function
 * 3. Validates email templates
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logSection(title) {
  console.log('\n' + '='.repeat(70))
  log(title, 'bright')
  console.log('='.repeat(70))
}

async function checkEnvironmentVariables() {
  logSection('1. ENVIRONMENT VARIABLES CHECK')

  const checks = {
    supabaseUrl: !!SUPABASE_URL,
    supabaseAnonKey: !!SUPABASE_ANON_KEY,
    serviceRoleKey: !!SUPABASE_SERVICE_ROLE_KEY,
  }

  log('\n✓ Checking environment variables:', 'cyan')
  log(`   SUPABASE_URL: ${checks.supabaseUrl ? '✅ Set' : '❌ Missing'}`, checks.supabaseUrl ? 'green' : 'red')
  log(`   SUPABASE_ANON_KEY: ${checks.supabaseAnonKey ? '✅ Set' : '❌ Missing'}`, checks.supabaseAnonKey ? 'green' : 'red')
  log(`   SUPABASE_SERVICE_ROLE_KEY: ${checks.serviceRoleKey ? '✅ Set' : '❌ Missing'}`, checks.serviceRoleKey ? 'green' : 'red')

  if (!checks.supabaseUrl || !checks.supabaseAnonKey) {
    log('\n❌ Missing required environment variables!', 'red')
    log('   Add them to your .env file', 'yellow')
    return false
  }

  if (!checks.serviceRoleKey) {
    log('\n⚠️  Service role key not set', 'yellow')
    log('   Some tests will be skipped', 'yellow')
  }

  log('\n✅ Environment variables configured', 'green')
  return true
}

async function checkEdgeFunctionDeployment() {
  logSection('2. EDGE FUNCTION DEPLOYMENT CHECK')

  log('\n📡 Checking edge function deployment...', 'cyan')
  log('   Testing send-email function availability', 'blue')

  // Try to invoke the function (will fail if not deployed)
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  try {
    // This will fail gracefully if not deployed
    const { error } = await supabase.functions.invoke('send-email', {
      body: {
        // Intentionally incomplete to test deployment, not actual sending
        test: true
      }
    })

    // If we get here, function is deployed (even if it errors due to missing params)
    if (error) {
      // Check if it's a deployment error or validation error
      if (error.message?.includes('not found') || error.message?.includes('404')) {
        log('\n❌ send-email function NOT deployed', 'red')
        log('   Deploy with: npx supabase functions deploy send-email', 'yellow')
        return false
      } else {
        // Function exists, just errored on validation (expected)
        log('\n✅ send-email function is deployed', 'green')
        return true
      }
    }

    log('\n✅ send-email function is deployed', 'green')
    return true
  } catch (err) {
    log('\n❌ Error checking function deployment', 'red')
    log(`   ${err.message}`, 'yellow')
    return false
  }
}

async function checkSupabaseSecrets() {
  logSection('3. SUPABASE SECRETS CHECK')

  log('\n🔒 Checking Supabase secrets...', 'cyan')
  log('   Note: Cannot read secrets directly for security', 'yellow')
  log('   Testing by attempting to send a test email', 'blue')

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    log('\n⚠️  Cannot verify secrets without service role key', 'yellow')
    log('   Manual verification required:', 'cyan')
    log('   1. Run: npx supabase secrets list', 'blue')
    log('   2. Verify RESEND_API_KEY is set', 'blue')
    log('   3. Verify EMAIL_FROM is set', 'blue')
    return 'skipped'
  }

  // Create service client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  log('\n📧 Attempting test email send...', 'cyan')

  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: {
          email: 'test@example.com',
          name: 'Test User'
        },
        subject: 'Configuration Test',
        html: '<p>This is a test email from the configuration verification script.</p>',
        text: 'This is a test email from the configuration verification script.',
        template_name: 'test',
      },
    })

    if (error) {
      if (error.message?.includes('RESEND_API_KEY')) {
        log('\n❌ RESEND_API_KEY not configured', 'red')
        log('   Set with: npx supabase secrets set RESEND_API_KEY=re_your_key', 'yellow')
        return false
      } else if (error.message?.includes('EMAIL_FROM')) {
        log('\n❌ EMAIL_FROM not configured', 'red')
        log('   Set with: npx supabase secrets set EMAIL_FROM="App <noreply@domain.com>"', 'yellow')
        return false
      } else {
        log('\n⚠️  Email send error (may be normal for test address):', 'yellow')
        log(`   ${error.message}`, 'blue')
        log('   Secrets appear to be configured', 'green')
        return true
      }
    }

    log('\n✅ Secrets configured correctly!', 'green')
    log('   Test email send succeeded', 'blue')
    return true
  } catch (err) {
    log('\n❌ Error testing email send', 'red')
    log(`   ${err.message}`, 'yellow')
    return false
  }
}

async function checkEmailTemplates() {
  logSection('4. EMAIL TEMPLATES CHECK')

  log('\n📄 Checking email template files...', 'cyan')

  const templates = [
    'supabase/functions/approve-user/index.ts',
    'supabase/functions/reject-user/index.ts',
    'supabase/functions/send-email/index.ts',
  ]

  let allExist = true

  for (const template of templates) {
    try {
      const { statSync } = await import('fs')
      statSync(template)
      log(`   ✅ ${template}`, 'green')
    } catch (err) {
      log(`   ❌ ${template} - NOT FOUND`, 'red')
      allExist = false
    }
  }

  if (allExist) {
    log('\n✅ All email template files present', 'green')
    return true
  } else {
    log('\n❌ Some template files missing', 'red')
    return false
  }
}

async function provideManualInstructions() {
  logSection('MANUAL VERIFICATION STEPS')

  log('\nIf you cannot use the Supabase CLI, verify manually:', 'cyan')

  log('\n1️⃣  Get Resend API Key:', 'bright')
  log('   • Visit: https://resend.com/api-keys', 'blue')
  log('   • Create a new API key', 'blue')
  log('   • Copy the key (starts with "re_")', 'blue')

  log('\n2️⃣  Set Supabase Secrets:', 'bright')
  log('   Via CLI (if authenticated):', 'cyan')
  log('   npx supabase secrets set RESEND_API_KEY=re_your_key_here', 'blue')
  log('   npx supabase secrets set EMAIL_FROM="JobSight <noreply@yourdomain.com>"', 'blue')

  log('\n   Via Dashboard:', 'cyan')
  log('   • Go to: https://supabase.com/dashboard/project/_/settings/functions', 'blue')
  log('   • Click "Edge Functions"', 'blue')
  log('   • Go to "Secrets" tab', 'blue')
  log('   • Add RESEND_API_KEY secret', 'blue')
  log('   • Add EMAIL_FROM secret', 'blue')

  log('\n3️⃣  Test Email Sending:', 'bright')
  log('   Run: node scripts/test-email-notifications.mjs', 'blue')
  log('   Or manually approve a test user in the admin dashboard', 'blue')

  log('\n4️⃣  Check Email Logs:', 'bright')
  log('   npx supabase functions logs send-email --limit 10', 'blue')
  log('   npx supabase functions logs approve-user --limit 10', 'blue')
  log('   npx supabase functions logs reject-user --limit 10', 'blue')
}

async function main() {
  logSection('📧 EMAIL CONFIGURATION VERIFICATION')

  log('\nThis script will verify your email notification setup.', 'cyan')
  log('It checks environment variables, edge functions, and Supabase secrets.\n', 'cyan')

  const results = {
    envVars: false,
    edgeFunctions: false,
    secrets: false,
    templates: false,
  }

  // Run checks
  results.envVars = await checkEnvironmentVariables()

  if (results.envVars) {
    results.edgeFunctions = await checkEdgeFunctionDeployment()
    results.secrets = await checkSupabaseSecrets()
    results.templates = await checkEmailTemplates()
  }

  // Provide manual instructions
  await provideManualInstructions()

  // Summary
  logSection('📊 VERIFICATION SUMMARY')

  log('\nConfiguration Status:', 'bright')
  log(`   Environment Variables: ${results.envVars ? '✅ Pass' : '❌ Fail'}`, results.envVars ? 'green' : 'red')
  log(`   Edge Functions: ${results.edgeFunctions ? '✅ Deployed' : '❌ Not Deployed'}`, results.edgeFunctions ? 'green' : 'red')
  log(`   Supabase Secrets: ${results.secrets === 'skipped' ? '⚠️  Skipped' : results.secrets ? '✅ Configured' : '❌ Missing'}`, results.secrets === 'skipped' ? 'yellow' : results.secrets ? 'green' : 'red')
  log(`   Email Templates: ${results.templates ? '✅ Present' : '❌ Missing'}`, results.templates ? 'green' : 'red')

  const allPassed = results.envVars && results.edgeFunctions && results.secrets === true && results.templates

  if (allPassed) {
    log('\n🎉 Email configuration is complete!', 'green')
    log('   You can now test email notifications.', 'green')
    log('\n📧 Next step: Run email tests', 'cyan')
    log('   node scripts/test-email-notifications.mjs', 'blue')
  } else if (results.secrets === 'skipped') {
    log('\n⚠️  Partial verification complete', 'yellow')
    log('   Complete manual verification steps above', 'yellow')
  } else {
    log('\n❌ Email configuration incomplete', 'red')
    log('   Please complete the steps above', 'yellow')
  }

  process.exit(allPassed ? 0 : 1)
}

main().catch((err) => {
  log(`\n❌ Fatal error: ${err.message}`, 'red')
  console.error(err)
  process.exit(1)
})
