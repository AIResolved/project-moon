import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('User auth error:', userError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      return NextResponse.json({ error: 'Failed to verify admin status' }, { status: 500 })
    }

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Try to create service role client for admin operations
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!serviceRoleKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY not configured')
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
    }

    const supabaseService = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey
    )
    
    const { data: authUsers, error: authError } = await supabaseService.auth.admin.listUsers()
    
    if (authError) {
      console.error('Error fetching users:', authError)
      return NextResponse.json({ error: 'Failed to fetch users: ' + authError.message }, { status: 500 })
    }

    // Fetch all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
    }

    // Check for API keys (without exposing the actual keys)
    const { data: apiKeys, error: apiKeysError } = await supabase
      .from('user_api_keys')
      .select('user_id')

    if (apiKeysError) {
      console.error('Error checking API keys:', apiKeysError)
    }

    // Combine data
    const usersWithProfiles = authUsers.users.map((authUser: any) => {
      const userProfile = profiles?.find(p => p.user_id === authUser.id)
      const hasApiKey = apiKeys?.some(key => key.user_id === authUser.id) || false
      
      return {
        id: authUser.id,
        email: authUser.email || 'No email',
        created_at: authUser.created_at,
        is_admin: userProfile?.is_admin || false,
        last_sign_in_at: authUser.last_sign_in_at || null,
        has_api_key: hasApiKey
      }
    })

    return NextResponse.json({ users: usersWithProfiles })

  } catch (error) {
    console.error('Admin users API error:', error)
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId, isAdmin } = await request.json()
    
    console.log('PATCH request received:', { userId, isAdmin })
    
    if (!userId || typeof isAdmin !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('User auth error in PATCH:', userError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Current user:', user.email, 'Target user:', userId)

    // Check if current user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      console.error('Profile check error:', profileError)
      return NextResponse.json({ error: 'Failed to verify admin status' }, { status: 500 })
    }

    if (!profile?.is_admin) {
      console.error('User is not admin:', user.email)
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Prevent self-modification
    if (userId === user.id) {
      return NextResponse.json({ error: 'Cannot modify your own admin status' }, { status: 400 })
    }

    console.log('Updating admin status for user:', userId, 'to:', isAdmin)

    // Update user admin status
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        is_admin: isAdmin 
      })
      .eq('user_id', userId)

    if (updateError) {
      console.error('Error updating admin status:', updateError)
      return NextResponse.json({ error: 'Failed to update admin status: ' + updateError.message }, { status: 500 })
    }

    console.log('Successfully updated admin status')
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Admin status update error:', error)
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    )
  }
} 