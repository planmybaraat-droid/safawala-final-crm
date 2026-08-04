import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server-simple'
import { authenticateRequest } from '@/lib/auth-middleware'

// GET /api/expense-categories - fetch all active expense categories
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req, { minRole: 'readonly' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const { data, error } = await supabase
      .from('expense_categories')
      .select('id, name, color, description, is_active')
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Error fetching expense categories:', error)
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Expense categories GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/expense-categories - create a new expense category
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req, { minRole: 'franchise_admin' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const body = await req.json()
    const { name, description, color } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('expense_categories')
      .insert({
        name: name.trim(),
        description: description || null,
        color: color || '#2563eb',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id, name, color, description, is_active')
      .single()

    if (error) {
      console.error('Error creating expense category:', error)
      return NextResponse.json({ error: 'Failed to add category' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Expense categories POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/expense-categories - update an expense category
export async function PATCH(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req, { minRole: 'franchise_admin' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const body = await req.json()
    const { id, name, color, description } = body

    if (!id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
    }

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
    }

    const updateData: any = {
      name: name.trim(),
      updated_at: new Date().toISOString()
    }

    if (color !== undefined) updateData.color = color
    if (description !== undefined) updateData.description = description

    const { data, error } = await supabase
      .from('expense_categories')
      .update(updateData)
      .eq('id', id)
      .select('id, name, color, description')
      .single()

    if (error) {
      console.error('Error updating expense category:', error)
      return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Expense categories PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/expense-categories?id=xxx - soft delete an expense category
export async function DELETE(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req, { minRole: 'franchise_admin' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('expense_categories')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('Error deleting expense category:', error)
      return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Expense categories DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
