import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create Supabase client with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// GET - Fetch all users with video counts and detailed information
export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Admin: Fetching all users with video counts...')

    // Fetch all users from auth.users
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError)
      throw new Error(`Failed to fetch users: ${authError.message}`)
    }

    // Fetch user profiles with admin status (join by user_id)
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('*')

    if (profilesError) {
      console.error('❌ Error fetching user profiles:', profilesError)
      throw new Error(`Failed to fetch user profiles: ${profilesError.message}`)
    }

    // Fetch video counts for each user
    const { data: videoCounts, error: videoError } = await supabaseAdmin
      .from('video_records')
      .select('user_id, status')

    if (videoError) {
      console.error('❌ Error fetching video counts:', videoError)
      throw new Error(`Failed to fetch video counts: ${videoError.message}`)
    }

    // Process video counts by user
    const videoCountsByUser = videoCounts?.reduce((acc: Record<string, any>, video) => {
      if (!acc[video.user_id]) {
        acc[video.user_id] = {
          total: 0,
          completed: 0,
          processing: 0,
          failed: 0
        }
      }
      acc[video.user_id].total++
      acc[video.user_id][video.status]++
      return acc
    }, {}) || {}

    // Combine auth users with profiles and video counts
    const enrichedUsers = authUsers.users.map(authUser => {
      // Find profile by user_id (not id)
      const profile = profiles?.find(p => p.user_id === authUser.id)
      const videoCounts = videoCountsByUser[authUser.id] || {
        total: 0,
        completed: 0,
        processing: 0,
        failed: 0
      }

      return {
        id: authUser.id,
        email: authUser.email,
        created_at: authUser.created_at,
        last_sign_in_at: authUser.last_sign_in_at,
        email_confirmed_at: authUser.email_confirmed_at,
        phone: authUser.phone,
        is_admin: profile?.is_admin || false,
        profile_id: profile?.id || null,
        profile_created_at: profile?.created_at || null,
        videos: videoCounts
      }
    })

    console.log(`✅ Successfully fetched ${enrichedUsers.length} users with video data`)

    return NextResponse.json({
      success: true,
      users: enrichedUsers,
      count: enrichedUsers.length
    })

  } catch (error: any) {
    console.error('💥 Admin users fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

// POST - Create new user (admin only)
export async function POST(req: NextRequest) {
  try {
    const { email, password, isAdmin = false } = await req.json()

    console.log('👤 Admin: Creating new user:', email)

    // Create user in auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    if (authError) {
      throw new Error(`Failed to create user: ${authError.message}`)
    }

    // Create user profile with user_id foreign key
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: authData.user.id,
        is_admin: isAdmin
      })

    if (profileError) {
      console.error('❌ Error creating user profile:', profileError)
      // Try to clean up auth user if profile creation failed
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw new Error(`Failed to create user profile: ${profileError.message}`)
    }

    console.log('✅ Successfully created user:', authData.user.id)

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        is_admin: isAdmin
      }
    })

  } catch (error: any) {
    console.error('💥 Admin user creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create user' },
      { status: 500 }
    )
  }
}

// PATCH - Update user (admin role, email)
export async function PATCH(req: NextRequest) {
  try {
    const { userId, isAdmin, email } = await req.json()

    console.log('📝 Admin: Updating user:', userId)

    // Update user profile admin status if provided
    if (isAdmin !== undefined) {
      // First check if profile exists
      const { data: existingProfile, error: checkError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single()

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found"
        throw new Error(`Failed to check existing profile: ${checkError.message}`)
      }

      if (existingProfile) {
        // Update existing profile
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ is_admin: isAdmin })
          .eq('user_id', userId)

        if (updateError) {
          throw new Error(`Failed to update user profile: ${updateError.message}`)
        }
      } else {
        // Create new profile if it doesn't exist
        const { error: insertError } = await supabaseAdmin
          .from('profiles')
          .insert({
            user_id: userId,
            is_admin: isAdmin
          })

        if (insertError) {
          throw new Error(`Failed to create user profile: ${insertError.message}`)
        }
      }
    }

    // Update auth user email if provided
    if (email) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        email
      })

      if (authError) {
        throw new Error(`Failed to update user email: ${authError.message}`)
      }
    }

    console.log('✅ Successfully updated user:', userId)

    return NextResponse.json({
      success: true,
      message: 'User updated successfully'
    })

  } catch (error: any) {
    console.error('💥 Admin user update error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update user' },
      { status: 500 }
    )
  }
}

// DELETE - Delete user and all associated data
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    console.log('🗑️ Admin: Deleting user and all associated data:', userId)

    // Delete user's videos first (cascade should handle related data)
    const { error: videosError } = await supabaseAdmin
      .from('video_records')
      .delete()
      .eq('user_id', userId)

    if (videosError) {
      console.error('❌ Error deleting user videos:', videosError)
      throw new Error(`Failed to delete user videos: ${videosError.message}`)
    }

    // Delete user's custom voices
    const { error: voicesError } = await supabaseAdmin
      .from('ai_voices')
      .delete()
      .eq('user_id', userId)

    if (voicesError) {
      console.error('❌ Error deleting user voices:', voicesError)
      // Don't fail the whole operation for this
    }

    // Delete user profile (by user_id, not id)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('user_id', userId)

    if (profileError) {
      console.error('❌ Error deleting user profile:', profileError)
      throw new Error(`Failed to delete user profile: ${profileError.message}`)
    }

    // Finally, delete auth user
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authError) {
      console.error('❌ Error deleting auth user:', authError)
      throw new Error(`Failed to delete user from auth: ${authError.message}`)
    }

    console.log('✅ Successfully deleted user and all associated data:', userId)

    return NextResponse.json({
      success: true,
      message: 'User and all associated data deleted successfully'
    })

  } catch (error: any) {
    console.error('💥 Admin user deletion error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete user' },
      { status: 500 }
    )
  }
} 