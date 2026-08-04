import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import bcrypt from "bcryptjs"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOW_LEGACY_DEPT_LOGIN_BYPASS =
  process.env.NODE_ENV !== "production" &&
  process.env.ALLOW_LEGACY_DEPT_LOGIN_BYPASS === "true"

/**
 * Get default permissions based on role
 */
function getDefaultPermissions(role: string): Record<string, boolean> {
  switch (role) {
    case 'super_admin':
      return {
        dashboard: true,
        bookings: true,
        customers: true,
        inventory: true,
        packages: true,
        vendors: true,
        quotes: true,
        invoices: true,
        laundry: true,
        expenses: true,
        deliveries: true,
        productArchive: true,
        payroll: true,
        attendance: true,
        reports: true,
        financials: true,
        franchises: true,
        staff: true,
        integrations: true,
        settings: true,
      };
    
    case 'franchise_admin':
      return {
        dashboard: true,
        bookings: true,
        customers: true,
        inventory: true,
        packages: true,
        vendors: true,
        quotes: true,
        invoices: true,
        laundry: true,
        expenses: true,
        deliveries: true,
        productArchive: true,
        payroll: true,
        attendance: true,
        reports: true,
        financials: true,
        franchises: false,
        staff: true,
        integrations: false,
        settings: true,
      };
    
    case 'staff':
      return {
        dashboard: true,
        bookings: true,
        customers: true,
        inventory: true,
        packages: false,
        vendors: false,
        quotes: true,
        invoices: true,
        laundry: false,
        expenses: false,
        deliveries: false,
        productArchive: false,
        payroll: false,
        attendance: false,
        reports: false,
        financials: false,
        franchises: false,
        staff: false,
        integrations: false,
        settings: true,
      };
    
    default:
      return {
        dashboard: true,
        bookings: false,
        customers: false,
        inventory: false,
        packages: false,
        vendors: false,
        quotes: false,
        invoices: false,
        laundry: false,
        expenses: false,
        deliveries: false,
        productArchive: false,
        payroll: false,
        attendance: false,
        reports: false,
        financials: false,
        franchises: false,
        staff: false,
        integrations: false,
        settings: true,
      };
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Login API called")

    // Initialize clients
    let authClient
    try {
      const cookieStore = cookies()
      authClient = createRouteHandlerClient({ cookies: () => cookieStore })
    } catch (configError) {
      console.error("[v0] Supabase configuration error:", configError)
      return NextResponse.json({ 
        error: "Server configuration error. Please contact administrator.",
        details: configError instanceof Error ? configError.message : String(configError)
      }, { status: 500 })
    }

    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error("[v0] Failed to parse request body:", parseError)
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const { email, password } = body
    console.log("[v0] Login attempt for email:", email)

    const validDepartments = ["accounts", "admin", "booking", "bookings", "delivery", "franchise", "hr", "manager", "qc", "styling", "travels", "warehouse"];
    const emailMatch = email.match(/^([a-z]+)@safawala\.com$/i);
    const deptPrefix = emailMatch ? emailMatch[1].toLowerCase() : null;
    const deptCap = deptPrefix ? deptPrefix.charAt(0).toUpperCase() + deptPrefix.slice(1) : '';
    const host = request.nextUrl.hostname
    const isLocalDevHost = host === "localhost" || host === "127.0.0.1" || host === "::1"

    // Accept master password OR dept-specific password only when explicitly enabled.
    const isBypassPassword = password === 'Warehouse@5678' || password === `${deptCap}@5678`;

    if (ALLOW_LEGACY_DEPT_LOGIN_BYPASS && isLocalDevHost && deptPrefix && validDepartments.includes(deptPrefix) && isBypassPassword) {
      console.log(`[v0] Bypassing auth for default ${deptPrefix} user`);

      // Stable valid UUIDs per department (all lowercase hex, valid v4 format)
      const deptUUIDs: Record<string, string> = {
        accounts:  "00000000-0000-4000-8001-000000000001",
        admin:     "00000000-0000-4000-8001-000000000002",
        booking:   "00000000-0000-4000-8001-000000000003",
        bookings:  "00000000-0000-4000-8001-000000000004",
        delivery:  "00000000-0000-4000-8001-000000000005",
        franchise: "00000000-0000-4000-8001-000000000006",
        hr:        "00000000-0000-4000-8001-000000000007",
        manager:   "00000000-0000-4000-8001-000000000008",
        qc:        "00000000-0000-4000-8001-000000000009",
        styling:   "00000000-0000-4000-8001-000000000010",
        travels:   "00000000-0000-4000-8001-000000000012",
        warehouse: "00000000-0000-4000-8001-000000000011",
      };
      const deptUserId = deptUUIDs[deptPrefix] || crypto.randomUUID();

      const roleMapping: Record<string, string> = {
        admin: 'super_admin',
        manager: 'franchise_admin',
        franchise: 'franchise_admin',
      };
      const userRole = roleMapping[deptPrefix] || 'staff';

      // Normalize dept aliases to their portal slug (e.g. "bookings" → "booking")
      const deptToPortalSlug: Record<string, string> = {
        bookings: 'booking',
        franchise: 'manager',
        admin: 'admin',
      };
      const portalSlug = deptToPortalSlug[deptPrefix] || deptPrefix;

      // Look up real franchise_id from DB so queries return actual data
      const serviceForFranchise = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      let realFranchiseId = "00000000-0000-4000-8001-000000000099"
      let realFranchiseName = "Safawala Main"
      let realFranchiseCode = "SFW-MAIN"
      try {
        const { data: fData } = await serviceForFranchise
          .from('franchises')
          .select('id, name, code')
          .order('created_at', { ascending: true })
          .limit(1)
          .single()
        if (fData?.id) {
          realFranchiseId = fData.id
          realFranchiseName = fData.name || realFranchiseName
          realFranchiseCode = fData.code || realFranchiseCode
        }
      } catch (_) {}

      const deptDisplayNames: Record<string, string> = {
        travels: "Travel & Hotels",
      };
      const displayName = deptDisplayNames[deptPrefix] ? `${deptDisplayNames[deptPrefix]} Manager` : `${deptCap} Manager`;

      // Upsert the dept user into users table so auth-middleware can find them
      try {
        await serviceForFranchise
          .from('users')
          .upsert({
            id: deptUserId,
            email: `${deptPrefix}@safawala.com`,
            name: displayName,
            role: userRole,
            franchise_id: realFranchiseId,
            is_active: true,
            permissions: getDefaultPermissions(userRole),
          }, { onConflict: 'email', ignoreDuplicates: false })
      } catch (upsertErr) {
        console.warn('[v0] Could not upsert dept user (non-fatal):', upsertErr)
      }

      const user = {
        id: deptUserId,
        name: displayName,
        email: `${deptPrefix}@safawala.com`,
        role: userRole,
        department: portalSlug,
        franchise_id: realFranchiseId,
        franchise_name: realFranchiseName,
        franchise_code: realFranchiseCode,
        is_active: true,
        permissions: getDefaultPermissions(userRole),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      
      const sessionToken = `${deptPrefix}-session:${crypto.randomUUID()}`
      const res = NextResponse.json({
        success: true,
        message: `Login successful (${deptPrefix})`,
        user,
        session: null
      })
      
      const cookiePayload = JSON.stringify({
        id: user.id,
        email: user.email,
        role: user.role,
        department: user.department,
        franchise_id: user.franchise_id,
        session_token: sessionToken,
      })
      
      res.cookies.set('safawala_user', cookiePayload, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      })
      return res
    }

    if (!email || !password) {
      console.log("[v0] Missing email or password")
      return NextResponse.json({ error: "Email and password required" }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      console.log("[v0] Invalid email format:", email)
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    const ldapPatterns = [/\)\(/g, /\|\|/g, /&&/g, /\*/g]
    if (ldapPatterns.some((pattern) => pattern.test(email))) {
      console.log("[v0] LDAP injection attempt detected")
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    // Authenticate with Supabase Auth (secure password check by Supabase)
    let { data: signInData, error: signInError } = await authClient.auth.signInWithPassword({
      email,
      password
    })

    // Fallback: if user isn't in Supabase Auth yet, verify against legacy users table
    if (signInError || !signInData?.user) {
      console.log("[v0] Supabase Auth sign-in failed, attempting legacy auth fallback:", signInError?.message)

      // Fetch legacy user with hashed password
      const serviceAdminForLegacy = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const { data: legacyUser, error: legacyError } = await serviceAdminForLegacy
        .from("users")
        .select("id, email, password_hash, is_active")
        .ilike("email", email)
        .single()

      if (legacyError) {
        console.log("[v0] Legacy user query error:", legacyError.message)
        return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
      }
      
      if (!legacyUser) {
        console.log("[v0] Legacy user not found for email:", email)
        return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
      }
      
      if (!legacyUser.is_active) {
        console.log("[v0] Legacy user is inactive:", email)
        return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
      }

      // Compare bcrypt hash
      if (!legacyUser.password_hash) {
        console.log("[v0] User has no password hash:", email)
        return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
      }
      
      const passwordOk = await bcrypt.compare(password, legacyUser.password_hash)
      if (!passwordOk) {
        console.log("[v0] Password mismatch for user:", email)
        return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
      }
      
      console.log("[v0] Password verified successfully for legacy user:", email)

      // Create Supabase Auth user via Admin API (first-time migration)
      try {
        await serviceAdminForLegacy.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { legacy_user_id: legacyUser.id }
        })
      } catch (createErr: any) {
        // If user already exists, ignore; else log error
        const msg = createErr?.message || String(createErr)
        if (!/User already registered/i.test(msg)) {
          console.error("[v0] Failed to create Supabase Auth user during migration:", createErr)
        }
      }

      // Try Supabase Auth sign-in again now that user should exist
      const retry = await authClient.auth.signInWithPassword({ email, password })
      signInData = retry.data
      signInError = retry.error

      if (signInError || !signInData?.user) {
        return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
      }
    }

    // Fetch user profile (role, franchise, permissions) using service role client
    const serviceAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: userProfile, error: profileError } = await serviceAdmin
      .from("users")
      .select(`
        *,
        franchises (
          id,
          name,
          code
        )
      `)
      .ilike("email", email)
      .eq("is_active", true)
      .single()

    if (profileError || !userProfile) {
      console.error("[v0] Profile fetch failed after auth:", profileError)
      // Also sign out to clear any partial session
      await authClient.auth.signOut()
      return NextResponse.json({ error: "Account is inactive or missing profile" }, { status: 401 })
    }

    // Ensure permissions - if null or empty, use role defaults
    const permissions = userProfile.permissions && typeof userProfile.permissions === 'object' && Object.keys(userProfile.permissions).length > 0
      ? userProfile.permissions
      : getDefaultPermissions(userProfile.role);

    // Infer department from email if not set in DB (e.g. hr@safawala.com → "hr")
    const KNOWN_DEPT_EMAILS: Record<string, string> = {
      accounts: "accounts", admin: "admin", booking: "booking", bookings: "booking",
      delivery: "delivery", franchise: "franchise", hr: "hr", manager: "manager",
      qc: "qc", styling: "styling", travels: "travels", warehouse: "warehouse",
    }
    const emailDeptMatch = email.match(/^([a-z]+)@safawala\.com$/i)
    const emailDeptPrefix = emailDeptMatch ? emailDeptMatch[1].toLowerCase() : null
    const inferredDept = emailDeptPrefix ? (KNOWN_DEPT_EMAILS[emailDeptPrefix] ?? null) : null

    // If user has no department in DB, save the inferred one so future logins are instant
    if (!userProfile.department && inferredDept) {
      serviceAdmin.from("users").update({ department: inferredDept }).eq("id", userProfile.id).then(() => {})
    }

    const user = {
      id: userProfile.id,
      name: userProfile.name,
      email: userProfile.email,
      role: userProfile.role,
      department: userProfile.department || inferredDept || null,
      franchise_id: userProfile.franchise_id,
      franchise_name: userProfile.franchises?.name || null,
      franchise_code: userProfile.franchises?.code || null,
      is_active: userProfile.is_active,
      permissions: permissions,
      created_at: userProfile.created_at,
      updated_at: userProfile.updated_at,
    }

    console.log("[v0] Login successful for:", email)

    // ── 2FA CHECK: If admin has 2FA enabled, don't complete login yet ──
    if (['super_admin', 'franchise_admin'].includes(userProfile.role)) {
      try {
        const totpEnabled = (userProfile as any).totp_enabled
        if (totpEnabled) {
          const tempToken = crypto.randomUUID()
          const pendingPayload = JSON.stringify({
            userId: userProfile.id,
            token: tempToken,
            expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
          })
          const pendingRes = NextResponse.json({
            requires_2fa: true,
            temp_token: tempToken,
            message: "Enter your authenticator code",
          })
          pendingRes.cookies.set("safawala_2fa_pending", pendingPayload, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 5,
          })
          return pendingRes
        }
      } catch (totpCheckErr) {
        console.warn("[v0] Could not check 2FA status (columns may not exist):", totpCheckErr)
      }
    }

    // ── SINGLE-DEVICE LOGIN: Generate a unique session token ──
    // Storing this in DB means any new login from another device
    // invalidates the previous session token automatically.
    const deviceId = body?.deviceId || "unknown"
    const sessionToken = `${deviceId}:${crypto.randomUUID()}`
    try {
      await serviceAdmin
        .from("users")
        .update({ session_token: sessionToken, session_created_at: new Date().toISOString() })
        .eq("id", userProfile.id)
    } catch (tokenErr) {
      console.warn("[v0] Could not store session token (column may not exist yet):", tokenErr)
    }

    // Build response and set an HTTP-only auth cookie for middleware checks
    const res = NextResponse.json({
      success: true,
      message: "Login successful",
      user,
      session: {
        access_token: signInData.session?.access_token,
        refresh_token: signInData.session?.refresh_token,
        expires_at: signInData.session?.expires_at,
        expires_in: signInData.session?.expires_in
      }
    })

    try {
      // Minimal cookie payload to identify user server-side (no tokens)
      const cookiePayload = JSON.stringify({
        id: user.id,
        email: user.email,
        role: user.role,
        department: user.department,
        franchise_id: user.franchise_id,
        session_token: sessionToken,
      })
      res.cookies.set('safawala_user', cookiePayload, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })
    } catch (cookieErr) {
      console.warn('[v0] Failed to set safawala_user cookie:', cookieErr)
    }

    return res
  } catch (error) {
    console.error("[v0] Unexpected login error:", error)
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace")

    return NextResponse.json(
      {
        error: "Internal server error",
        details:
          process.env.NODE_ENV === "development" ? (error instanceof Error ? error.message : String(error)) : undefined,
      },
      { status: 500 },
    )
  }
}
