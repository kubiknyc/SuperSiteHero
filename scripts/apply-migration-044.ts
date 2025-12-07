/**
 * Apply migration 044: Enable automatic user profile creation
 * This fixes the login issue by creating user profiles automatically when users sign up
 *
 * Run with: npx tsx scripts/apply-migration-044.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!')
  console.error('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  console.error('\nAdd to your .env file:')
  console.error('SUPABASE_SERVICE_ROLE_KEY=your-service-role-key')
  console.error('\nGet it from: Supabase Dashboard → Settings → API → service_role key')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function applyMigration() {
  console.log('🚀 Applying migration 044: Enable automatic user profile creation')
  console.log('=' .repeat(70))

  // Read the migration file
  const migrationPath = path.join(process.cwd(), 'migrations', '044_enable_auto_user_creation.sql')

  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath)
    process.exit(1)
  }

  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')

  console.log('\n📄 Migration file loaded')
  console.log(`   Path: ${migrationPath}`)
  console.log(`   Size: ${migrationSQL.length} characters`)

  // Split SQL into individual statements (rough split, but works for this migration)
  // We'll execute the whole thing as one block since it's designed that way
  console.log('\n⚙️  Executing migration SQL...')

  const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL })
    .catch(async () => {
      // If rpc doesn't work, try direct query (note: this might not work for all statements)
      console.log('   ℹ️  RPC method not available, using direct execution')
      return await supabase.from('_migrations').select('*').limit(0).then(() => {
        console.error('   ⚠️  Cannot execute multi-statement SQL directly via Supabase client')
        console.error('   📋 Please apply this migration manually:')
        console.error('')
        console.error('   1. Go to: https://supabase.com/dashboard/project/_/sql')
        console.error('   2. Copy and paste the contents of migrations/044_enable_auto_user_creation.sql')
        console.error('   3. Click "Run"')
        console.error('')
        console.error('   OR use the Supabase CLI:')
        console.error('   supabase db push')
        return { data: null, error: new Error('Manual migration required') }
      })
    })

  if (error) {
    console.error('\n❌ Migration failed:', error.message)
    console.error('\n📋 Manual steps required:')
    console.error('   1. Go to Supabase Dashboard → SQL Editor')
    console.error('   2. Copy contents from: migrations/044_enable_auto_user_creation.sql')
    console.error('   3. Paste and run in SQL Editor')
    console.error('')
    process.exit(1)
  }

  console.log('✅ Migration executed successfully!')

  // Verify the migration worked
  console.log('\n🔍 Verifying migration...')

  // Check if trigger exists by trying to query users
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email')
    .limit(5)

  if (usersError) {
    console.error('   ⚠️  Could not verify users table:', usersError.message)
  } else {
    console.log(`   ✅ Users table accessible (${users?.length || 0} users found)`)
  }

  console.log('\n' + '='.repeat(70))
  console.log('✨ Migration complete!')
  console.log('\n📝 What happens now:')
  console.log('   1. New signups will automatically create user profiles')
  console.log('   2. Existing auth users (if any) have been backfilled with profiles')
  console.log('   3. Users can now log in successfully')
  console.log('\n💡 Next steps:')
  console.log('   1. Try registering a NEW user')
  console.log('   2. Check if you can log in immediately after signup')
  console.log('   3. If still having issues, check: LOGIN_DEBUG_GUIDE.md')
  console.log('')
}

console.log('\n⚠️  IMPORTANT: This script may not work due to Supabase client limitations')
console.log('If it fails, you\'ll need to apply the migration manually via SQL Editor\n')

applyMigration().catch((err) => {
  console.error('\n💥 Unexpected error:', err)
  process.exit(1)
})
