import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "@/lib/auth-middleware"

const STYLES = [
  {
    key: "studio_white",
    label: "Studio White",
    icon: "⬜",
    background: "pure bright white seamless background, even soft studio lighting from above, clean product shot",
  },
  {
    key: "mannequin",
    label: "Mannequin Display",
    icon: "🪆",
    background: "displayed on a white mannequin bust or display stand, white background, warm studio lighting",
  },
  {
    key: "detail_closeup",
    label: "Detail Close-up",
    icon: "🔍",
    background: "extreme close-up macro shot showing fine craftsmanship detail, cream background, shallow depth of field, soft studio light",
  },
  {
    key: "flat_lay",
    label: "Flat Lay",
    icon: "📐",
    background: "flat lay top-down view on warm ivory marble surface, soft natural overhead lighting",
  },
  {
    key: "lifestyle",
    label: "Lifestyle",
    icon: "✨",
    background: "lifestyle setting with warm golden ambient lighting, soft bokeh background with subtle marigold flowers, elegant Indian wedding atmosphere",
  },
  {
    key: "dark_luxury",
    label: "Dark Luxury",
    icon: "🖤",
    background: "deep dark navy velvet background, single dramatic spotlight from above highlighting the product, luxury jewelry photography",
  },
]

async function getDetailedProductDescription(
  imageBase64: string,
  imageMime: string,
  hint: string,
  apiKey: string
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${imageMime};base64,${imageBase64}`, detail: "high" },
            },
            {
              type: "text",
              text: `You are a product photography expert. Describe this ${hint || "Indian wedding accessory"} in extreme detail for an AI image generator so it can recreate it EXACTLY.

Include ALL of these:
- Exact product type (turban/mala/brooch/dupatta/etc.)
- Every color present (be very specific: gold, champagne, ivory, crimson red, etc.)
- Material and texture (silk fabric, kundan stones, pearl beads, zardozi embroidery, etc.)
- Pattern and design (geometric, floral, paisley, etc. with colors)
- Size and proportions
- Any embellishments, stones, tassels, borders, etc.
- How it is arranged or shaped

Write as one detailed paragraph starting with the product type. Be extremely specific about colors — this is critical. Do NOT say "colorful" — name exact colors.`,
            },
          ],
        },
      ],
      max_tokens: 400,
      temperature: 0.2,
    }),
  })

  if (!response.ok) throw new Error("Failed to analyze product image")
  const data = await response.json()
  return data?.choices?.[0]?.message?.content || hint || "Indian wedding accessory"
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'staff' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode })
    }

    const formData = await request.formData()
    const image = formData.get("image") as File | null
    const productHint = (formData.get("productHint") as string) || ""

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 })
    }

    // Step 1: Convert image to base64
    const imageBuffer = await image.arrayBuffer()
    const imageBytes = new Uint8Array(imageBuffer)
    const imageBase64 = Buffer.from(imageBytes).toString("base64")
    const imageMime = image.type || "image/jpeg"

    // Step 2: Get a very detailed product description using GPT-4o vision
    console.log("[Photo Studio] Step 1: Analysing product with GPT-4o...")
    const productDescription = await getDetailedProductDescription(
      imageBase64,
      imageMime,
      productHint,
      apiKey
    )
    console.log("[Photo Studio] Product description:", productDescription.substring(0, 100) + "...")

    // Step 3: Generate all 6 styles in parallel using gpt-image-1
    console.log("[Photo Studio] Step 2: Generating 6 studio images...")
    const results = await Promise.allSettled(
      STYLES.map(async (style) => {
        const prompt = `Professional ecommerce product photograph. The product is: ${productDescription}

Setting: ${style.background}.

CRITICAL RULES — follow exactly:
- The product must look IDENTICAL to the original — same exact colors, same design, same materials, same pattern, nothing changed
- Photorealistic photography — looks like a real photo taken by a professional photographer, NOT AI art, NOT illustrated
- Complete product fully visible, nothing cut off or cropped
- No color shifts, no desaturation, no greyscale — preserve every exact color as described
- Shot on Canon 5D Mark IV, 85mm lens — professional product photography quality`

        const fd = new FormData()
        const blob = new Blob([imageBytes], { type: "image/png" })
        fd.append("image", blob, "product.png")
        fd.append("prompt", prompt)
        fd.append("model", "gpt-image-1")
        fd.append("size", "1024x1024")
        fd.append("quality", "high")
        fd.append("n", "1")

        const res = await fetch("https://api.openai.com/v1/images/edits", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: fd,
        })

        if (!res.ok) {
          const errText = await res.text()
          console.error(`[${style.key}] Error:`, errText)
          throw new Error(`${style.label}: ${res.status}`)
        }

        const data = await res.json()
        const b64 = data?.data?.[0]?.b64_json
        const url = data?.data?.[0]?.url
        if (!b64 && !url) throw new Error(`No image for ${style.label}`)

        return {
          key: style.key,
          label: style.label,
          icon: style.icon,
          image: b64 ? `data:image/png;base64,${b64}` : url,
        }
      })
    )

    const generated = results
      .map((r, i) => {
        if (r.status === "fulfilled") return r.value
        console.error(`Style ${STYLES[i].key} failed:`, (r as PromiseRejectedResult).reason)
        return null
      })
      .filter(Boolean)

    if (generated.length === 0) {
      return NextResponse.json({ error: "All image generations failed. Please try again." }, { status: 500 })
    }

    return NextResponse.json({
      images: generated,
      productDescription,
      styles: STYLES.map((s) => ({ key: s.key, label: s.label, icon: s.icon })),
    })
  } catch (error) {
    console.error("[generate-product-images]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
