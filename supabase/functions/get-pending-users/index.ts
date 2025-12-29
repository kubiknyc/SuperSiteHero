// Edge Function: Get Pending Users
// Description: Fetches pending users for the admin's company
// Authorization: Admin or Owner role required

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface _PendingUser {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: string
  created_at: string
  approval_status: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Create Supabase client with user's JWT
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
      }
    )

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get user's profile to check role and company
    const { data: profile, error: profileError } = await supabaseClient
      .from('users')
      .select('company_id, role, is_active')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Check if user is active
    if (!profile.is_active) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: User account is not active' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Check if user is admin/owner
    if (!['owner', 'admin'].includes(profile.role)) {
      return new Response(
        JSON.stringify({
          error: 'Forbidden: Admin or owner role required to view pending users',
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Fetch pending users for this company
    const { data: pendingUsers, error: fetchError } = await supabaseClient
      .from('users')
      .select('id, email, first_name, last_name, role, created_at, approval_status')
      .eq('company_id', profile.company_id)
      .eq('approval_status', 'pending')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('Error fetching pending users:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch pending users', details: fetchError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Return pending users
    return new Response(
      JSON.stringify({ pendingUsers: pendingUsers || [] }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Unexpected error in get-pending-users:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
