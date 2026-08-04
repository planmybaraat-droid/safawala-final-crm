import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { authenticateRequest } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'readonly' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const franchiseId = auth.user!.franchise_id
    const isSuperAdmin = auth.user!.is_super_admin
    const supabase = createClient()

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('category_id')
    const includeLegacy = (searchParams.get('include_legacy') ?? 'true') === 'true'
    const includeInactive = (searchParams.get('include_inactive') ?? 'false') === 'true'

    let query = supabase.from('package_variants').select('*')

    if (!includeInactive) query = query.eq('is_active', true)

    if (!isSuperAdmin && franchiseId) {
      query = query.or(`franchise_id.eq.${franchiseId},franchise_id.is.null`)
    }

    if (categoryId) {
      if (includeLegacy) {
        query = query.or(`category_id.eq.${categoryId},package_id.eq.${categoryId}`)
      } else {
        query = query.eq('category_id', categoryId)
      }
    }

    const { data, error } = await query.order('display_order', { ascending: true })
    if (error) throw error

    const mappedData = (data || []).map((variant: any) => ({
      ...variant,
      security_deposit: variant.deposit_amount || variant.security_deposit || 0
    }))

    return NextResponse.json({ success: true, data: mappedData })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'staff', requirePermission: 'packages' })
    if (!auth.authorized) return NextResponse.json(auth.error, { status: auth.statusCode || 401 })

    const franchiseId = auth.user!.franchise_id
    const isSuperAdmin = auth.user!.is_super_admin
    const body = await request.json()
    const { name, base_price, extra_safa_price, missing_safa_penalty, deposit_amount, inclusions, category_id, package_id, franchise_id: bodyFranchiseId, is_active = true, display_order } = body || {}

    if (!name?.trim() || !category_id) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

    const supabase = createClient()
    const now = new Date().toISOString()
    const finalFranchiseId = bodyFranchiseId && isSuperAdmin ? bodyFranchiseId : franchiseId

    let inclusionsArray: string[] = []
    if (Array.isArray(inclusions)) inclusionsArray = inclusions.filter(item => typeof item === 'string' && item.trim())
    else if (typeof inclusions === 'string' && inclusions.trim()) inclusionsArray = inclusions.split(',').map(item => item.trim()).filter(item => item)

    const { data, error } = await supabase.from('package_variants').insert({
      name: name.trim(),
      base_price: Number(base_price) || 0,
      extra_safa_price: Number(extra_safa_price) || 0,
      missing_safa_penalty: Number(missing_safa_penalty) || 0,
      deposit_amount: Number(deposit_amount) || 0,
      inclusions: inclusionsArray,
      category_id,
      package_id: package_id || category_id,
      franchise_id: finalFranchiseId,
      is_active,
      display_order: display_order || 0,
      created_at: now,
      updated_at: now
    }).select('*').single()

    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to create' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'staff', requirePermission: 'packages' })
    if (!auth.authorized) return NextResponse.json(auth.error, { status: auth.statusCode || 401 })

    const franchiseId = auth.user!.franchise_id
    const isSuperAdmin = auth.user!.is_super_admin
    const body = await request.json()
    const { id, name, base_price, extra_safa_price, missing_safa_penalty, deposit_amount, inclusions, category_id, is_active, display_order } = body || {}

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const supabase = createClient()

    if (!isSuperAdmin) {
      const { data: existing, error: fetchErr } = await supabase.from('package_variants').select('id, franchise_id').eq('id', id).maybeSingle()
      if (fetchErr) throw fetchErr
      if (existing?.franchise_id && existing.franchise_id !== franchiseId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    const updateData: any = { updated_at: new Date().toISOString() }
    if (name) updateData.name = name.trim()
    if (base_price !== undefined) updateData.base_price = Number(base_price)
    if (extra_safa_price !== undefined) updateData.extra_safa_price = Number(extra_safa_price)
    if (missing_safa_penalty !== undefined) updateData.missing_safa_penalty = Number(missing_safa_penalty)
    if (deposit_amount !== undefined) updateData.deposit_amount = Number(deposit_amount)
    if (inclusions !== undefined) {
      let arr: string[] = []
      if (Array.isArray(inclusions)) arr = inclusions.filter((item: any) => typeof item === 'string' && item.trim())
      else if (typeof inclusions === 'string' && inclusions.trim()) arr = inclusions.split(',').map(item => item.trim()).filter(item => item)
      updateData.inclusions = arr
    }
    if (category_id !== undefined) updateData.category_id = category_id
    if (is_active !== undefined) updateData.is_active = is_active
    if (display_order !== undefined) updateData.display_order = display_order

    const { data, error } = await supabase.from('package_variants').update(updateData).eq('id', id).select('*').single()
    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'staff', requirePermission: 'packages' })
    if (!auth.authorized) return NextResponse.json(auth.error, { status: auth.statusCode || 401 })

    const franchiseId = auth.user!.franchise_id
    const isSuperAdmin = auth.user!.is_super_admin
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const supabase = createClient()

    if (!isSuperAdmin) {
      const { data: existing, error: fetchErr } = await supabase.from('package_variants').select('id, franchise_id').eq('id', id).maybeSingle()
      if (fetchErr) throw fetchErr
      if (existing?.franchise_id && existing.franchise_id !== franchiseId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    const { error } = await supabase.from('package_variants').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to delete' }, { status: 500 })
  }
}
