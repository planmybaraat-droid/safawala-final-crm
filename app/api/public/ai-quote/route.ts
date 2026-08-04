import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const ADMIN_PASSWORD = process.env.PACKAGES_ADMIN_PASSWORD || "Safawala@5678"

function roundToHundred(n: number): number {
  return Math.round(n / 100) * 100
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { password, command, variants } = body

  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 })
  }
  if (!command?.trim()) {
    return NextResponse.json({ error: "Command required" }, { status: 400 })
  }
  if (!variants?.length) {
    return NextResponse.json({ error: "No variants provided" }, { status: 400 })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 })
  }

  const variantList = variants
    .map((v: any) => `- ID: ${v.id} | Category: "${v.category_name || ""}" | Name: "${v.name}" | Base Price: ₹${v.base_price}`)
    .join("\n")

  const systemPrompt = `You are a pricing assistant for Safawala — a premium Indian wedding accessories business.
Each package belongs to a Category like "21 Safas", "31 Safas", "41 Safas", "51 Safas", "61 Safas", "71 Safas", "81 Safas".
Within each category there are packages like "Package 1: Classic Style", "Package 2: Rajputana Rajwada Styles", etc.

When the user gives a command like "Select 41 Safa, increase by 40%":
- "41 Safa" refers to ALL packages in the Category "41 Safas"
- "41 and 51 Safa" means ALL packages in categories "41 Safas" AND "51 Safas"
- "Package 1 of 41 Safa" means only that specific package in that category
- "all" means every package

Steps:
1. Match packages by their Category field (e.g. "41 Safas") — NOT just the package name
2. Apply the price change (increase/decrease by %, or set exact price)
3. Round ALL prices to nearest ₹100 (6750 → 6800, no decimals, no paise)
4. Return ONLY valid JSON

Return this exact JSON format:
{
  "selected": [
    { "id": "<variant_id>", "name": "<variant_name>", "original_price": <number>, "new_price": <number> }
  ],
  "summary": "<1 line summary of what was done>"
}`

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Available packages:\n${variantList}\n\nCommand: "${command}"` },
      ],
      response_format: { type: "json_object" },
      max_tokens: 4000,
      temperature: 0.1,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error("[ai-quote] OpenAI error:", err)
    let userMsg = "AI processing failed."
    try {
      const errJson = JSON.parse(err)
      userMsg = errJson?.error?.message || userMsg
    } catch {}
    return NextResponse.json({ error: userMsg }, { status: 500 })
  }

  const json = await res.json()
  const choice = json.choices?.[0]
  const raw = (choice?.message?.content || "").trim()
  console.log("[ai-quote] raw response:", raw.slice(0, 500))
  console.log("[ai-quote] finish_reason:", choice?.finish_reason)

  if (!raw) {
    return NextResponse.json({ error: "AI returned empty response. Try again." }, { status: 500 })
  }

  if (choice?.finish_reason === "length") {
    console.error("[ai-quote] Response truncated (finish_reason=length)")
    return NextResponse.json({ error: "AI response was too long and got cut off. Try a simpler command (e.g. one category at a time)." }, { status: 500 })
  }

  // Strip markdown code blocks if present (```json ... ```)
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim()

  try {
    const result = JSON.parse(cleaned)
    if (!result.selected || !Array.isArray(result.selected)) {
      return NextResponse.json({ error: "AI did not select any packages. Try a more specific command." }, { status: 400 })
    }
    // Enforce rounding on all prices
    result.selected = result.selected.map((item: any) => ({
      ...item,
      new_price: roundToHundred(Number(item.new_price) || 0),
    }))
    return NextResponse.json({ success: true, ...result })
  } catch (e) {
    console.error("[ai-quote] JSON parse error:", e, "raw:", raw)
    return NextResponse.json({ error: "AI returned an unreadable response. Please try again." }, { status: 500 })
  }
}
