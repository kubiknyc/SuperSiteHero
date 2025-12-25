#!/usr/bin/env node

/**
 * Email Configuration Setup Script
 *
 * This interactive script helps you configure email notifications for your JobSight application.
 * It will guide you through setting up Resend API keys and testing the email system.
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import readline from 'readline'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Load environment variables
config()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const question = (query) => new Promise((resolve) => rl.question(query, resolve))

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
}

async function main() {
  console.clear()

  log.header('═══════════════════════════════════════════════')
  log.header('   JobSight Email Configuration Setup')
  log.header('═══════════════════════════════════════════════')

  // Check environment
  log.info('Checking current configuration...\n')

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const emailProvider = process.env.VITE_EMAIL_PROVIDER
  const appUrl = process.env.VITE_APP_URL

  if (!supabaseUrl) {
    log.error('VITE_SUPABASE_URL not found in .env file')
    process.exit(1)
  }

  console.log(`  Supabase URL: ${colors.cyan}${supabaseUrl}${colors.reset}`)
  console.log(`  Email Provider: ${colors.cyan}${emailProvider || 'console (default)'}${colors.reset}`)
  console.log(`  App URL: ${colors.cyan}${appUrl || 'Not set'}${colors.reset}\n`)

  // Menu
  log.header('What would you like to do?')
  console.log('1. Configure Resend API Key (Production)')
  console.log('2. Test email configuration')
  console.log('3. Switch to console mode (Development)')
  console.log('4. Switch to resend mode (Production)')
  console.log('5. View configuration guide')
  console.log('6. Exit\n')

  const choice = await question('Enter your choice (1-6): ')

  switch (choice.trim()) {
    case '1':
      await configureResend()
      break
    case '2':
      await testEmail()
      break
    case '3':
      await switchToConsole()
      break
    case '4':
      await switchToResend()
      break
    case '5':
      await viewGuide()
      break
    case '6':
      log.info('Exiting...')
      rl.close()
      return
    default:
      log.error('Invalid choice')
      rl.close()
      return
  }

  rl.close()
}

async function configureResend() {
  log.header('Configure Resend API Key')

  console.log('To get your Resend API key:')
  console.log('1. Visit https://resend.com')
  console.log('2. Sign in or create an account')
  console.log('3. Go to API Keys in the dashboard')
  console.log('4. Create a new API key\n')

  const apiKey = await question('Enter your Resend API key (starts with re_): ')

  if (!apiKey || !apiKey.startsWith('re_')) {
    log.error('Invalid Resend API key format')
    return
  }

  const emailFrom = await question('Enter sender email (e.g., JobSight <noreply@yourdomain.com>): ')

  if (!emailFrom) {
    log.error('Sender email is required')
    return
  }

  log.info('Setting Supabase secrets...\n')

  try {
    // Set API key
    log.info('Setting RESEND_API_KEY...')
    await execAsync(`npx supabase secrets set RESEND_API_KEY="${apiKey}"`)
    log.success('RESEND_API_KEY set successfully')

    // Set sender email
    log.info('Setting EMAIL_FROM...')
    await execAsync(`npx supabase secrets set EMAIL_FROM="${emailFrom}"`)
    log.success('EMAIL_FROM set successfully')

    log.success('\n✓ Resend configuration complete!')
    log.info('\nNext steps:')
    console.log('  1. Set VITE_EMAIL_PROVIDER=resend in your .env file')
    console.log('  2. Redeploy your Edge Functions: npx supabase functions deploy send-email')
    console.log('  3. Test your configuration using option 2 in the menu\n')

  } catch (error) {
    log.error(`Failed to set secrets: ${error.message}`)
    log.info('Make sure you have Supabase CLI installed and are logged in.')
  }
}

async function testEmail() {
  log.header('Test Email Configuration')

  const testEmail = await question('Enter email address to send test to: ')

  if (!testEmail || !testEmail.includes('@')) {
    log.error('Invalid email address')
    return
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    log.error('Supabase configuration not found in .env')
    return
  }

  log.info('Sending test email...\n')

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: [{ email: testEmail, name: 'Test User' }],
        subject: 'JobSight Email Configuration Test',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
            </head>
            <body style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 28px;">JobSight</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Email Configuration Test</p>
              </div>
              <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
                <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #22c55e;">
                  <h2 style="color: #16a34a; margin-top: 0;">✓ Success!</h2>
                  <p style="color: #374151; line-height: 1.6;">
                    Your email configuration is working correctly. You're now ready to send email notifications from your JobSight application.
                  </p>
                </div>
                <div style="margin-top: 20px; padding: 15px; background: #eff6ff; border-radius: 8px;">
                  <h3 style="margin-top: 0; color: #1e40af;">Configuration Details:</h3>
                  <ul style="color: #374151; line-height: 1.8;">
                    <li><strong>Provider:</strong> ${process.env.VITE_EMAIL_PROVIDER || 'console'}</li>
                    <li><strong>App URL:</strong> ${process.env.VITE_APP_URL || 'Not set'}</li>
                    <li><strong>Test Time:</strong> ${new Date().toLocaleString()}</li>
                  </ul>
                </div>
                <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
                  If you received this email, your configuration is working perfectly!
                </p>
              </div>
              <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} JobSight. All rights reserved.
              </div>
            </body>
          </html>
        `,
        text: `JobSight Email Configuration Test\n\nSuccess! Your email configuration is working correctly.\n\nProvider: ${process.env.VITE_EMAIL_PROVIDER || 'console'}\nApp URL: ${process.env.VITE_APP_URL || 'Not set'}\nTest Time: ${new Date().toLocaleString()}\n\nIf you received this email, your configuration is working perfectly!`,
        tags: ['test', 'configuration']
      }
    })

    if (error) {
      log.error(`Failed to send test email: ${error.message}`)
      if (process.env.VITE_EMAIL_PROVIDER === 'console') {
        log.warning('You are in console mode. Switch to resend mode to send actual emails.')
      }
      return
    }

    if (data?.success) {
      log.success(`\n✓ Test email sent successfully!`)
      if (data.message_id) {
        console.log(`  Message ID: ${colors.cyan}${data.message_id}${colors.reset}`)
      }
      console.log(`\nCheck your inbox at: ${colors.cyan}${testEmail}${colors.reset}\n`)
    } else {
      log.error(`Failed to send test email: ${data?.error || 'Unknown error'}`)
    }

  } catch (error) {
    log.error(`Error: ${error.message}`)
  }
}

async function switchToConsole() {
  log.header('Switch to Console Mode (Development)')

  log.info('This will configure your app to log emails to the console instead of sending them.')
  log.info('This is useful for local development and testing.\n')

  const confirm = await question('Continue? (y/n): ')

  if (confirm.toLowerCase() !== 'y') {
    log.info('Cancelled')
    return
  }

  log.info('To switch to console mode, update your .env file:')
  console.log(`\n  ${colors.yellow}VITE_EMAIL_PROVIDER=console${colors.reset}\n`)
  log.warning('Remember to restart your development server after changing .env')
}

async function switchToResend() {
  log.header('Switch to Resend Mode (Production)')

  log.info('This will configure your app to send real emails via Resend.')
  log.warning('Make sure you have configured your Resend API key first!\n')

  const confirm = await question('Continue? (y/n): ')

  if (confirm.toLowerCase() !== 'y') {
    log.info('Cancelled')
    return
  }

  log.info('To switch to resend mode, update your .env file:')
  console.log(`\n  ${colors.yellow}VITE_EMAIL_PROVIDER=resend${colors.reset}\n`)
  log.warning('Remember to restart your development server after changing .env')
}

async function viewGuide() {
  log.header('Configuration Guide')

  console.log('Full configuration guide available at:')
  console.log(`  ${colors.cyan}EMAIL_CONFIGURATION_GUIDE.md${colors.reset}\n`)

  console.log('Quick Links:')
  console.log('  • Resend Dashboard: https://resend.com/home')
  console.log('  • Email Templates: src/lib/email/templates/')
  console.log('  • Email Service: src/lib/email/email-service.ts')
  console.log('  • Edge Function: supabase/functions/send-email/index.ts\n')
}

// Run the script
main().catch((error) => {
  log.error(`Error: ${error.message}`)
  rl.close()
  process.exit(1)
})
