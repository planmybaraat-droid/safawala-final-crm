import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const ACCESS_PASSWORD = process.env.PACKAGES_ACCESS_PASSWORD || null

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { password } = body

  if (!password) {
    return NextResponse.json({ success: false, error: "Password required" }, { status: 400 })
  }

  if (ACCESS_PASSWORD && password === ACCESS_PASSWORD) {
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ success: false, error: "Incorrect password" }, { status: 401 })
}
