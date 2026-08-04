import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server-simple'
import { requireAuth, AuthMiddleware } from '@/lib/auth-middleware'

function resolveFranchiseId(requestedFranchiseId: string | null, authUser: { franchise_id?: string; is_super_admin?: boolean }) {
  if (requestedFranchiseId && requestedFranchiseId !== 'null' && requestedFranchiseId !== 'undefined') {
    return requestedFranchiseId
  }

  if (authUser.franchise_id) {
    return authUser.franchise_id
  }

  if (authUser.is_super_admin) {
    return null
  }

  return null
}

function canAccessProfileUser(
  authUser: { id: string; role: string; is_super_admin: boolean },
  targetUserId?: string | null
) {
  if (!targetUserId) return true
  if (authUser.is_super_admin) return true
  if (authUser.role === 'franchise_admin') return true
  return authUser.id === targetUserId
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'readonly')
    if (!authResult.success) {
      return NextResponse.json(authResult.response, { status: 401 })
    }

    const authUser = authResult.authContext!.user
    const { searchParams } = new URL(request.url)
    const requestedFranchiseId = searchParams.get('franchise_id')
    const userId = searchParams.get('user_id')
    const franchiseId = resolveFranchiseId(requestedFranchiseId, authUser)

    if (userId && !canAccessProfileUser(authUser, userId)) {
      return NextResponse.json(
        { error: 'You do not have permission to view this profile' },
        { status: 403 }
      )
    }

    if (!franchiseId) {
      return NextResponse.json(
        { error: 'Franchise ID is required for this user context' },
        { status: 400 }
      )
    }

    if (!AuthMiddleware.canAccessFranchise(authUser, franchiseId)) {
      return NextResponse.json(
        { error: 'Access denied to this franchise' },
        { status: 403 }
      )
    }

    // If user_id is provided, get specific user profile, otherwise get the first profile for franchise
    let query = supabase
      .from('user_profiles')
      .select('*')
      .eq('franchise_id', franchiseId)

    if (userId) {
      query = query.eq('user_id', userId)
      
      const { data, error } = await query.single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error)
        return NextResponse.json(
          { error: 'Failed to fetch profile' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: data || null
      })
    } else {
      // Get the most recent profile for this franchise
      query = query.order('created_at', { ascending: false }).limit(1)
      
      const { data, error } = await query

      if (error) {
        console.error('Error fetching profile:', error)
        return NextResponse.json(
          { error: 'Failed to fetch profile' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: data && data.length > 0 ? data[0] : null
      })
    }
  } catch (error) {
    console.error('Error in profile GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'readonly')
    if (!authResult.success) {
      return NextResponse.json(authResult.response, { status: 401 })
    }

    const authUser = authResult.authContext!.user
    const body = await request.json()
    const {
      franchise_id,
      user_id,
      first_name,
      last_name,
      email,
      phone,
      role,
      designation,
      department,
      employee_id,
      date_of_joining,
      address,
      city,
      state,
      postal_code,
      emergency_contact_name,
      emergency_contact_phone,
      bio,
      profile_photo_url,
      signature_url
    } = body

    const effectiveFranchiseId = resolveFranchiseId(franchise_id || null, authUser)
    const effectiveUserId = user_id || authUser.id

    if (!effectiveFranchiseId) {
      return NextResponse.json(
        { error: 'Franchise ID is required for this user context' },
        { status: 400 }
      )
    }

    if (!AuthMiddleware.canAccessFranchise(authUser, effectiveFranchiseId)) {
      return NextResponse.json(
        { error: 'Access denied to this franchise' },
        { status: 403 }
      )
    }

    if (!canAccessProfileUser(authUser, effectiveUserId)) {
      return NextResponse.json(
        { error: 'You do not have permission to create this profile' },
        { status: 403 }
      )
    }

    if (!first_name || !last_name || !email) {
      return NextResponse.json(
        { error: 'First name, last name, and email are required' },
        { status: 400 }
      )
    }

    const profileData = {
      franchise_id: effectiveFranchiseId,
      user_id: effectiveUserId,
      first_name,
      last_name,
      email,
      phone: phone || null,
      role: role || 'staff',
      designation: designation || null,
      department: department || null,
      employee_id: employee_id || null,
      date_of_joining: date_of_joining || null,
      address: address || null,
      city: city || null,
      state: state || null,
      postal_code: postal_code || null,
      emergency_contact_name: emergency_contact_name || null,
      emergency_contact_phone: emergency_contact_phone || null,
      bio: bio || null,
      profile_photo_url: profile_photo_url || null,
      signature_url: signature_url || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .insert([profileData])
      .select()
      .single()

    if (error) {
      console.error('Error creating profile:', error)
      return NextResponse.json(
        { error: 'Failed to create profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Profile created successfully'
    })
  } catch (error) {
    console.error('Error in profile POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'readonly')
    if (!authResult.success) {
      return NextResponse.json(authResult.response, { status: 401 })
    }

    const authUser = authResult.authContext!.user
    const body = await request.json()
    console.log('[Profile API PUT] Request body:', {
      hasId: !!body.id,
      hasFranchiseId: !!body.franchise_id,
      id: body.id,
      franchise_id: body.franchise_id,
      keys: Object.keys(body)
    })
    
    const {
      id,
      franchise_id,
      first_name,
      last_name,
      email,
      phone,
      designation,
      department,
      employee_id,
      date_of_joining,
      emergency_contact_name,
      emergency_contact_phone,
      profile_photo_url
    } = body

    if (!id) {
      console.error('[Profile API PUT] Missing required fields:', { id, franchise_id })
      return NextResponse.json(
        { error: 'Profile ID is required' },
        { status: 400 }
      )
    }

    const { data: existingProfile, error: existingProfileError } = await supabase
      .from('user_profiles')
      .select('id, franchise_id, user_id')
      .eq('id', id)
      .single()

    if (existingProfileError) {
      console.error('[Profile API PUT] Failed to load existing profile:', existingProfileError)
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    const effectiveFranchiseId = resolveFranchiseId(franchise_id || existingProfile.franchise_id || null, authUser)

    if (!effectiveFranchiseId) {
      return NextResponse.json(
        { error: 'Franchise ID is required for this user context' },
        { status: 400 }
      )
    }

    if (!AuthMiddleware.canAccessFranchise(authUser, existingProfile.franchise_id || effectiveFranchiseId)) {
      return NextResponse.json(
        { error: 'Access denied to this franchise' },
        { status: 403 }
      )
    }

    if (!canAccessProfileUser(authUser, existingProfile.user_id)) {
      return NextResponse.json(
        { error: 'You do not have permission to update this profile' },
        { status: 403 }
      )
    }

    const updateData = {
      first_name,
      last_name,
      email,
      phone,
      designation,
      department,
      employee_id,
      date_of_joining,
      emergency_contact_name,
      emergency_contact_phone,
      profile_photo_url,
      updated_at: new Date().toISOString()
    }

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof typeof updateData] === undefined) {
        delete updateData[key as keyof typeof updateData]
      }
    })

    const { data, error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('id', id)
      .eq('franchise_id', existingProfile.franchise_id || effectiveFranchiseId)
      .select()
      .single()

    if (error) {
      console.error('[Profile API PUT] Database error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      return NextResponse.json(
        { error: `Failed to update profile: ${error.message}` },
        { status: 500 }
      )
    }

    console.log('[Profile API PUT] Success:', { profileId: data.id })
    return NextResponse.json({
      success: true,
      data,
      message: 'Profile updated successfully'
    })
  } catch (error) {
    console.error('Error in profile PUT:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'readonly')
    if (!authResult.success) {
      return NextResponse.json(authResult.response, { status: 401 })
    }

    const authUser = authResult.authContext!.user
    const body = await request.json()
    const { id, franchise_id } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Profile ID is required' },
        { status: 400 }
      )
    }

    const { data: existingProfile, error: existingProfileError } = await supabase
      .from('user_profiles')
      .select('id, franchise_id, user_id')
      .eq('id', id)
      .single()

    if (existingProfileError) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    const effectiveFranchiseId = resolveFranchiseId(franchise_id || existingProfile.franchise_id || null, authUser)

    if (!effectiveFranchiseId || !AuthMiddleware.canAccessFranchise(authUser, existingProfile.franchise_id || effectiveFranchiseId)) {
      return NextResponse.json(
        { error: 'Access denied to this franchise' },
        { status: 403 }
      )
    }

    if (!canAccessProfileUser(authUser, existingProfile.user_id)) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this profile' },
        { status: 403 }
      )
    }

    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', id)
      .eq('franchise_id', existingProfile.franchise_id || effectiveFranchiseId)

    if (error) {
      console.error('Error deleting profile:', error)
      return NextResponse.json(
        { error: 'Failed to delete profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Profile deleted successfully'
    })
  } catch (error) {
    console.error('Error in profile DELETE:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
