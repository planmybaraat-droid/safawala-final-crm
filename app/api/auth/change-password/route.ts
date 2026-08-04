import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import bcrypt from "bcryptjs"
import { authenticateRequest } from "@/lib/auth-middleware"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

async function verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword)
}

/**
 * POST /api/auth/change-password
 * Allows authenticated users to change their own password
 * 
 * Request body:
 * {
 *   "currentPassword": "string",  // Required: current password for verification
 *   "newPassword": "string"        // Required: new password (min 8 chars)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await authenticateRequest(request, { minRole: 'readonly' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const userId = auth.user!.id
    const body = await request.json()
    const { currentPassword, newPassword } = body

    // Validation
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      )
    }

    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: 'New password must be different from current password' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Fetch user's current password hash
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', userId)
      .single()

    if (fetchError || !user) {
      console.error('[Change Password] User not found:', fetchError)
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Verify current password
    if (!user.password_hash) {
      return NextResponse.json(
        { error: 'Unable to change password: no password set for this account' },
        { status: 400 }
      )
    }

    const isPasswordValid = await verifyPassword(currentPassword, user.password_hash)
    if (!isPasswordValid) {
      console.warn(`[Change Password] Invalid password attempt for user ${userId}`)
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      )
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword)

    // Update password in database
    const { data: updated, error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: newPasswordHash,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('id, email, name')
      .single()

    if (updateError) {
      console.error('[Change Password] Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update password' },
        { status: 500 }
      )
    }

    // Also update password in Supabase Auth for seamless login
    try {
      const serviceAdmin = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      
      await serviceAdmin.auth.admin.updateUserById(userId, {
        password: newPassword,
      })
      console.log(`[Change Password] Supabase Auth password updated for user ${userId}`)
    } catch (authError: any) {
      console.error('[Change Password] Supabase Auth update error:', authError)
      // Log but don't fail - users can still login via legacy auth with password_hash
      console.warn('[Change Password] Supabase Auth password update failed, but legacy auth will work')
    }

    console.log(`[Change Password] Password changed successfully for user ${userId}`)
    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
      user: updated,
    })
  } catch (error: any) {
    console.error('[Change Password] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
