import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "@/lib/auth-middleware"

interface CategoryWithSubs {
  id: string
  name: string
  subcategories?: { id: string; name: string }[]
}

function buildImageMessage(base64: string, mime: string, promptText: string) {
  return {
    role: "user",
    content: [
      { type: "image_url", image_url: { url: `data:${mime};base64,${base64}`, detail: "high" } },
      { type: "text", text: promptText },
    ],
  }
}

function buildCategoryList(categories: CategoryWithSubs[]) {
  if (!categories.length) return ""
  return categories
    .map((c) => {
      const subs = c.subcategories?.length
        ? ` (subcategories: ${c.subcategories.map((s) => s.name).join(", ")})`
        : ""
      return `"${c.name}"${subs}`
    })
    .join("; ")
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'staff' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode })
    }

    const formData = await request.formData()
    const image = formData.get("image") as File | null
    const imageUrl = (formData.get("imageUrl") as string) || ""
    const hints = (formData.get("hints") as string) || ""
    const categoriesJson = (formData.get("categories") as string) || "[]"

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 })
    }

    let categories: CategoryWithSubs[] = []
    try {
      categories = JSON.parse(categoriesJson)
    } catch {}

    const categoryList = buildCategoryList(categories)

    const prompt = `You are an expert product cataloging AI for Safawala.com — a premium Indian wedding accessories brand.

${hints ? `User hint: "${hints}"` : "Analyze the product image carefully to identify the product type."}

━━━ STEP 1: IDENTIFY PRODUCT TYPE ━━━
Look at the image/hint and decide which type this product is:

• JEWELLERY (mala, necklace, haar, brooch, earring, bracelet, ring, pendant, chain, tikka, maangtikka, kangan)
  → Materials MUST be from: Gold, Silver, Brass, Pearl, Kundan, Polki, Jadau, Beads, Crystal, Zircon, Meenakari, Rhodium
  → Sizes MUST be from: One Size, Adjustable, Custom, 16inch, 18inch, 20inch

• FABRIC / TURBAN (safa, pagdi, turban, dupatta, stole, shawl, sehra cloth, pag)
  → Materials MUST be from: Silk, Velvet, Brocade, Organza, Georgette, Chiffon, Satin, Zardozi, Bandhani, Chanderi, Banarasi
  → Sizes MUST be from: Free Size, Small, Large, XL, Custom

• HEADGEAR / SEHRA (kalgi, sehra, sarpech, crown, turban ornament)
  → Materials MUST be from: Gold, Silver, Pearl, Zardozi, Kundan, Feathers, Fabric
  → Sizes MUST be from: Free Size, Adjustable, Small, Large

• FOOTWEAR (juti, mojari, shoes, sandal)
  → Materials MUST be from: Leather, Velvet, Satin, Brocade, Khusa, Fabric
  → Sizes MUST be from: Size 6, Size 7, Size 8, Size 9, Size 10

• OTHER ACCESSORIES (belt, dupatta pin, clip, keychain)
  → Use relevant materials and sizes

━━━ STEP 2: GENERATE JSON ━━━
Return ONLY this JSON (no markdown, no explanation):

{
  "productType": "identified product type in 1-2 words",
  "productNames": ["Name 1", "Name 2", "Name 3", "Name 4", "Name 5"],
  "materials": ["Material1", "Material2", "Material3"],
  "colours": ["Colour1", "Colour2", "Colour3"],
  "sizes": ["Size1", "Size2", "Size3"],
  "description": "1-2 sentence elegant product description for Safawala premium listing",
  "suggestedCategory": "exact category name from list",
  "suggestedSubcategory": "exact subcategory name from list or empty string"
}

━━━ RULES ━━━
- productNames: 5 names, max 4 words each, elegant, Indian wedding context. Match the product type (e.g. for mala: "Royal Kundan Mala", "Bridal Pearl Haar". For turban: "Shahi Kesar Safa", "Nawab Zari Pag")
- materials: 3 single-word names ONLY from the correct product type list above — DO NOT suggest Silk for jewellery or Gold for fabric
- colours: 3 elegant colour names relevant to the product (e.g. Ivory, Crimson, Champagne, Gold, Marigold, Teal, Blush)
- sizes: 3 options ONLY from the correct product type list above
- description: premium, elegant, 1-2 sentences
- suggestedCategory: MUST exactly match one from: ${categoryList || "Jewellery, Turban, Safa, Dupatta, Stole, Accessories, Footwear, Brooch"}
- suggestedSubcategory: if a matching subcategory exists in the list, return its exact name; otherwise return ""

Return ONLY the JSON object. No extra text.`

    // Build message content
    const messages: any[] = []
    let base64 = ""
    let mime = "image/jpeg"

    if (image) {
      const buf = await image.arrayBuffer()
      base64 = Buffer.from(buf).toString("base64")
      mime = image.type || "image/jpeg"
      messages.push(buildImageMessage(base64, mime, prompt))
    } else if (imageUrl) {
      const imgRes = await fetch(imageUrl)
      if (!imgRes.ok) throw new Error(`Failed to fetch product image (${imgRes.status})`)
      const buf = await imgRes.arrayBuffer()
      base64 = Buffer.from(buf).toString("base64")
      mime = imgRes.headers.get("content-type") || "image/jpeg"
      messages.push(buildImageMessage(base64, mime, prompt))
    } else if (hints) {
      messages.push({ role: "user", content: prompt })
    } else {
      return NextResponse.json({ error: "Please provide a product image or hint" }, { status: 400 })
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",           // Use gpt-4o for better vision accuracy
        messages,
        max_tokens: 700,
        temperature: 0.7,
        response_format: { type: "json_object" }, // Force JSON output
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error("[OpenAI Error]", err)
      return NextResponse.json({ error: `OpenAI API error: ${response.status}` }, { status: 500 })
    }

    const data = await response.json()
    const rawText = data?.choices?.[0]?.message?.content || "{}"

    let result: any
    try {
      result = JSON.parse(rawText)
    } catch {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 })
      result = JSON.parse(jsonMatch[0])
    }

    // Match suggestedCategory to real category
    if (categories.length > 0 && result.suggestedCategory) {
      const catMatch = categories.find(
        (c) =>
          c.name.toLowerCase() === result.suggestedCategory.toLowerCase() ||
          c.name.toLowerCase().includes(result.suggestedCategory.toLowerCase()) ||
          result.suggestedCategory.toLowerCase().includes(c.name.toLowerCase())
      )
      if (catMatch) {
        result.suggestedCategoryId = catMatch.id
        result.suggestedCategoryName = catMatch.name

        // Match subcategory within the matched category
        if (result.suggestedSubcategory && catMatch.subcategories?.length) {
          const subMatch = catMatch.subcategories.find(
            (s) =>
              s.name.toLowerCase() === result.suggestedSubcategory.toLowerCase() ||
              s.name.toLowerCase().includes(result.suggestedSubcategory.toLowerCase()) ||
              result.suggestedSubcategory.toLowerCase().includes(s.name.toLowerCase())
          )
          if (subMatch) {
            result.suggestedSubcategoryId = subMatch.id
            result.suggestedSubcategoryName = subMatch.name
          }
        }
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("[generate-product-names]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
