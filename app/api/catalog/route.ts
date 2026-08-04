import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { authenticateRequest } from "@/lib/auth-middleware"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 60

async function launchBrowser() {
  try {
    const chromium = await import("@sparticuz/chromium")
    const puppeteer = await import("puppeteer-core")
    const execPath = await (chromium.default as any).executablePath()
    return (puppeteer.default as any).launch({
      args: (chromium.default as any).args,
      executablePath: execPath,
      headless: true,
    })
  } catch {
    const puppeteer = await import("puppeteer-core")
    return (puppeteer.default as any).launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      executablePath:
        process.env.PUPPETEER_EXECUTABLE_PATH ||
        "/usr/bin/chromium-browser",
      headless: true,
    })
  }
}

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, { minRole: "readonly" })
  if (!auth.authorized) return NextResponse.json(auth.error, { status: auth.statusCode || 401 })

  const { searchParams } = new URL(request.url)
  const categoryId = searchParams.get("category_id")
  const categoryName = searchParams.get("category_name") || "Product Catalog"

  const franchiseId = auth.user?.franchise_id
  const isSuperAdmin = auth.user?.is_super_admin

  const supabase = createClient()

  // Hardcoded company details (from invoice)
  const companyName = "SAFAWALA"
  const companyPhone = "+91 97252 95691"
  const companyPhone2 = "+91 97252 95692"
  const officePhone = "+91 95103 66393"
  const companyEmail = "care@safawala.com"
  const companyAddress = "Delhi · Vadodara · Ahmedabad · Mumbai · Bangalore"
  const gstNumber = ""
  const website = "www.safawala.com"
  const instagram = "@safawala.com"

  // Fetch logo + terms from settings
  let logoUrl = ""
  let rentalTerms = ""
  let salesTerms = ""

  try {
    const baseUrl = request.nextUrl.origin
    const settingsRes = await fetch(
      `${baseUrl}/api/settings/all${franchiseId ? `?franchise_id=${franchiseId}` : ""}`,
      { cache: "no-store" }
    )
    if (settingsRes.ok) {
      const s = await settingsRes.json()
      logoUrl = s.merged?.logo_url || s.company?.logo_url || ""
      rentalTerms = s.document?.rental_terms_conditions || s.document?.default_terms_conditions || ""
      salesTerms = s.document?.sales_terms_conditions || s.document?.default_terms_conditions || ""
    }
  } catch {}

  // Fetch products
  let query = supabase
    .from("products")
    .select("id, name, barcode, product_code, rental_price, sale_price, security_deposit, stock_available, stock_total, image_url, description, category, color, material, size, brand, reorder_level")
    .eq("is_active", true)
    .order("name")

  if (!isSuperAdmin && franchiseId) query = query.eq("franchise_id", franchiseId)
  if (categoryId && categoryId !== "all") query = query.eq("category_id", categoryId)

  const { data: products } = await query
  const items = products || []

  const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
  const year = new Date().getFullYear()

  // BARATI SAFA category → rental terms; all other categories → sales terms
  const isBaratiSafa = categoryName.toLowerCase().includes("barati") || categoryName.toLowerCase().includes("safa")
  const activeTerms = isBaratiSafa
    ? (rentalTerms || defaultRentalTerms(companyName))
    : (salesTerms || defaultSalesTerms(companyName))
  const termsType = isBaratiSafa ? "Rental" : "Sales"

  // Collect bg images (up to 6 with actual image_url)
  const bgImages = items.filter(p => p.image_url).slice(0, 6).map(p => p.image_url)

  // Build product cards HTML
  const productCards = items.map(p => {
    const rentalPrice = p.rental_price || 0
    const salePrice = p.sale_price || 0
    const hasOffer = salePrice > 0 && salePrice < rentalPrice
    const stockStatus = p.stock_available > 0 ? "In Stock" : "Out of Stock"

    const details = [
      p.color ? `Color: ${p.color}` : null,
      p.material ? `Material: ${p.material}` : null,
      p.size ? `Size: ${p.size}` : null,
      p.brand ? `Brand: ${p.brand}` : null,
      p.barcode ? `Code: ${p.barcode}` : null,
      `Stock: ${p.stock_available || 0}`,
    ].filter(Boolean).join(" • ")

    return `
    <div class="product-card">
      <div class="product-img-wrap">
        ${p.image_url
          ? `<img src="${p.image_url}" alt="${p.name}" onerror="this.style.display='none'" />`
          : `<div class="no-img">🧣</div>`}
        <div class="stock-badge ${p.stock_available > 0 ? 'in-stock' : 'out-stock'}">${stockStatus}</div>
      </div>
      <div class="product-info">
        <div class="product-name">${p.name}</div>
        ${p.description ? `<div class="product-desc">${p.description.slice(0, 60)}${p.description.length > 60 ? '…' : ''}</div>` : ''}
        <div class="product-details">${details}</div>
        <div class="product-pricing">
          ${rentalPrice > 0
            ? `<div class="price-row">
                <span class="price-label">Rental</span>
                <span class="price-main">₹${rentalPrice.toLocaleString("en-IN")}</span>
              </div>`
            : ""}
          ${hasOffer
            ? `<div class="price-row">
                <span class="price-label">Sale</span>
                <span class="price-offer">₹${salePrice.toLocaleString("en-IN")}</span>
                <span class="price-old">₹${rentalPrice.toLocaleString("en-IN")}</span>
              </div>`
            : salePrice > 0 && !hasOffer
              ? `<div class="price-row">
                  <span class="price-label">Sale</span>
                  <span class="price-main">₹${salePrice.toLocaleString("en-IN")}</span>
                </div>`
              : ""}
          ${p.security_deposit > 0
            ? `<div class="price-row deposit-row">
                <span class="price-label">Deposit</span>
                <span class="price-deposit">₹${p.security_deposit.toLocaleString("en-IN")}</span>
              </div>`
            : ""}
        </div>
      </div>
    </div>`
  }).join("")

  // Background image collage for cover
  const bgImageHtml = bgImages.length > 0
    ? bgImages.map((url, i) => `<img src="${url}" class="bg-img bg-img-${i}" alt="" />`).join("")
    : ""


  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1a1a1a; }

  /* ─── COVER ─── */
  .cover {
    width: 210mm;
    height: 297mm;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #120d2a;
    page-break-after: always;
    text-align: center;
  }
  .cover-bg-grid {
    position: absolute;
    inset: 0;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(2, 1fr);
    gap: 0;
    opacity: 0.35;
  }
  .bg-img { width: 100%; height: 100%; object-fit: cover; filter: grayscale(20%); }
  .cover-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(12,8,30,0.78) 0%, rgba(30,15,70,0.70) 50%, rgba(12,8,30,0.78) 100%);
  }
  .cover-content {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0 30mm;
  }
  .cover-logo-img {
    width: 90px;
    height: 90px;
    object-fit: contain;
    margin-bottom: 20px;
    border-radius: 50%;
    background: #ffffff;
    padding: 10px;
    border: 3px solid rgba(168,85,247,0.5);
  }
  .cover-logo-placeholder {
    width: 90px;
    height: 90px;
    border-radius: 50%;
    background: #ffffff;
    border: 3px solid rgba(168,85,247,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    margin-bottom: 20px;
    color: #7c3aed;
    font-weight: 900;
    letter-spacing: 1px;
  }
  .cover-brand {
    font-size: 44px;
    font-weight: 900;
    letter-spacing: 10px;
    color: #fff;
    text-transform: uppercase;
    margin-bottom: 6px;
  }
  .cover-website {
    font-size: 13px;
    color: rgba(255,255,255,0.45);
    letter-spacing: 3px;
    margin-bottom: 40px;
    text-transform: lowercase;
  }
  .cover-line {
    width: 100px;
    height: 2px;
    background: linear-gradient(to right, transparent, #a855f7, transparent);
    margin: 0 auto 32px;
  }
  .cover-category-label {
    font-size: 11px;
    letter-spacing: 5px;
    color: #a855f7;
    text-transform: uppercase;
    margin-bottom: 10px;
  }
  .cover-category {
    font-size: 30px;
    font-weight: 800;
    color: #e9d5ff;
    text-transform: uppercase;
    letter-spacing: 4px;
    margin-bottom: 10px;
  }
  .cover-subtitle {
    font-size: 12px;
    color: rgba(255,255,255,0.35);
    letter-spacing: 2px;
    margin-bottom: 40px;
  }
  .cover-count-pill {
    margin-top: 20px;
    background: rgba(168,85,247,0.15);
    border: 1px solid rgba(168,85,247,0.3);
    border-radius: 20px;
    padding: 8px 24px;
    font-size: 13px;
    color: rgba(255,255,255,0.6);
    letter-spacing: 2px;
  }
  .cover-count-pill strong {
    color: #c084fc;
    font-size: 15px;
  }
  .cover-footer {
    position: absolute;
    bottom: 12mm;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 10px;
    color: rgba(255,255,255,0.25);
    letter-spacing: 2px;
  }
  .cover-corner {
    position: absolute;
    top: 0;
    right: 0;
    width: 50mm;
    height: 50mm;
    background: linear-gradient(225deg, rgba(168,85,247,0.2) 0%, transparent 70%);
  }
  .cover-corner-bl {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 50mm;
    height: 50mm;
    background: linear-gradient(45deg, rgba(168,85,247,0.2) 0%, transparent 70%);
  }

  /* ─── PRODUCTS ─── */
  .products-section {
    padding: 10mm 12mm;
    width: 210mm;
  }
  .section-header {
    text-align: center;
    margin-bottom: 7mm;
    padding-bottom: 4mm;
    border-bottom: 2px solid #7c3aed;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .section-header-title {
    font-size: 18px;
    font-weight: 800;
    color: #1e0d3e;
    letter-spacing: 3px;
    text-transform: uppercase;
  }
  .section-header-meta {
    font-size: 10px;
    color: #6b7280;
    letter-spacing: 1px;
    text-align: right;
  }

  .product-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 5mm;
  }
  .product-card {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
    background: #fff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.07);
    break-inside: avoid;
  }
  .product-img-wrap {
    width: 100%;
    aspect-ratio: 1 / 1;
    background: #f8f5ff;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    position: relative;
  }
  .product-img-wrap img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
  }
  .no-img {
    font-size: 36px;
    opacity: 0.2;
  }
  .stock-badge {
    position: absolute;
    top: 5px;
    right: 5px;
    font-size: 7px;
    font-weight: 700;
    padding: 2px 5px;
    border-radius: 3px;
    letter-spacing: 0.5px;
  }
  .in-stock { background: #dcfce7; color: #166534; }
  .out-stock { background: #fee2e2; color: #991b1b; }

  .product-info {
    padding: 7px 8px 8px;
  }
  .product-name {
    font-size: 9.5px;
    font-weight: 700;
    color: #111827;
    line-height: 1.3;
    margin-bottom: 3px;
  }
  .product-desc {
    font-size: 7.5px;
    color: #9ca3af;
    line-height: 1.3;
    margin-bottom: 3px;
  }
  .product-details {
    font-size: 7px;
    color: #6b7280;
    margin-bottom: 5px;
    line-height: 1.4;
  }
  .product-pricing { border-top: 1px solid #f3f4f6; padding-top: 5px; }
  .price-row {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 2px;
  }
  .price-label {
    font-size: 7px;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    min-width: 28px;
  }
  .price-main {
    font-size: 13px;
    font-weight: 900;
    color: #5b21b6;
  }
  .price-offer {
    font-size: 13px;
    font-weight: 900;
    color: #15803d;
  }
  .price-old {
    font-size: 9px;
    color: #9ca3af;
    text-decoration: line-through;
  }
  .deposit-row .price-deposit {
    font-size: 10px;
    font-weight: 700;
    color: #b45309;
  }

  /* ─── BACK PAGE ─── */
  .back-page {
    width: 210mm;
    height: 297mm;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #120d2a;
    page-break-before: always;
    text-align: center;
    padding: 25mm 20mm;
  }
  .back-bg-grid {
    position: absolute;
    inset: 0;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(2, 1fr);
    gap: 0;
    opacity: 0.30;
  }
  .back-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(12,8,30,0.78) 0%, rgba(40,15,90,0.72) 50%, rgba(12,8,30,0.78) 100%);
  }
  .back-content {
    position: relative;
    z-index: 2;
    width: 100%;
  }
  .back-logo-img {
    width: 70px;
    height: 70px;
    object-fit: contain;
    border-radius: 50%;
    background: #ffffff;
    padding: 8px;
    border: 2px solid rgba(168,85,247,0.4);
    margin: 0 auto 16px;
    display: block;
  }
  .back-brand {
    font-size: 36px;
    font-weight: 900;
    letter-spacing: 10px;
    color: #fff;
    margin-bottom: 4px;
    text-transform: uppercase;
  }
  .back-website {
    font-size: 13px;
    color: rgba(255,255,255,0.35);
    letter-spacing: 3px;
    margin-bottom: 30px;
  }
  .back-divider {
    width: 60px;
    height: 2px;
    background: linear-gradient(to right, transparent, #a855f7, transparent);
    margin: 0 auto 30px;
  }
  .back-tagline {
    font-size: 15px;
    font-weight: 600;
    color: #c084fc;
    letter-spacing: 2px;
    margin-bottom: 30px;
  }
  .contact-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    max-width: 150mm;
    margin: 0 auto 28px;
  }
  .contact-item {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(168,85,247,0.2);
    border-radius: 10px;
    padding: 14px 16px;
    text-align: left;
  }
  .contact-label {
    font-size: 8px;
    letter-spacing: 2px;
    color: #a855f7;
    text-transform: uppercase;
    margin-bottom: 5px;
  }
  .contact-value {
    font-size: 11px;
    color: rgba(255,255,255,0.85);
    font-weight: 600;
    line-height: 1.4;
  }
  .back-cta {
    font-size: 13px;
    color: rgba(255,255,255,0.4);
    letter-spacing: 2px;
    margin-bottom: 14px;
  }
  .gst-line {
    font-size: 9px;
    color: rgba(255,255,255,0.2);
    letter-spacing: 1px;
  }
  .back-corner { position: absolute; top: 0; left: 0; width: 40mm; height: 40mm; background: linear-gradient(135deg, rgba(168,85,247,0.15) 0%, transparent 70%); }
  .back-corner-br { position: absolute; bottom: 0; right: 0; width: 40mm; height: 40mm; background: linear-gradient(315deg, rgba(168,85,247,0.15) 0%, transparent 70%); }

  /* ─── TERMS PAGE ─── */
  .terms-page {
    width: 210mm;
    min-height: 297mm;
    padding: 18mm 18mm;
    page-break-before: always;
  }
  .terms-header {
    border-bottom: 3px solid #7c3aed;
    padding-bottom: 8mm;
    margin-bottom: 8mm;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
  }
  .terms-title {
    font-size: 22px;
    font-weight: 900;
    color: #1e0d3e;
    letter-spacing: 2px;
    text-transform: uppercase;
  }
  .terms-subtitle {
    font-size: 11px;
    color: #7c3aed;
    letter-spacing: 1px;
    margin-top: 4px;
  }
  .terms-brand {
    font-size: 13px;
    font-weight: 700;
    color: #6b7280;
    text-align: right;
  }
  .terms-body {
    font-size: 9.5px;
    color: #374151;
    line-height: 1.7;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .terms-section {
    margin-bottom: 10px;
  }
  .terms-section-title {
    font-size: 10px;
    font-weight: 700;
    color: #1e0d3e;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 4px;
    padding-bottom: 2px;
    border-bottom: 1px solid #e5e7eb;
  }
  .terms-footer {
    margin-top: 12mm;
    padding-top: 6mm;
    border-top: 1px solid #e5e7eb;
    font-size: 9px;
    color: #9ca3af;
    display: flex;
    justify-content: space-between;
  }

  @media print {
    @page { margin: 0; size: A4 portrait; }
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .cover, .back-page { width: 100%; height: 100vh; }
  }
</style>
</head>
<body>

<!-- ══════ FRONT COVER ══════ -->
<div class="cover">
  <div class="cover-bg-grid">${bgImageHtml}</div>
  <div class="cover-overlay"></div>
  <div class="cover-corner"></div>
  <div class="cover-corner-bl"></div>

  <div class="cover-content">
    ${logoUrl
      ? `<img src="${logoUrl}" class="cover-logo-img" alt="${companyName}" onerror="this.outerHTML='<div class=\\'cover-logo-placeholder\\'>SW</div>'" />`
      : `<div class="cover-logo-placeholder">SW</div>`}
    <div class="cover-brand">${companyName}</div>
    <div class="cover-website">${website || "www.safawala.com"}</div>
    <div class="cover-line"></div>
    <div class="cover-category-label">Product Catalog</div>
    <div class="cover-category">${categoryName}</div>
    <div class="cover-subtitle">Wedding Accessories Collection ${year}</div>
    <div class="cover-count-pill"><strong>${items.length}</strong> &nbsp;Products</div>
  </div>

  <div class="cover-footer">${today} &nbsp;•&nbsp; ${companyEmail} &nbsp;•&nbsp; ${companyPhone} / ${companyPhone2}</div>
</div>

<!-- ══════ PRODUCT PAGES ══════ -->
<div class="products-section">
  <div class="section-header">
    <div>
      <div class="section-header-title">${categoryName}</div>
    </div>
    <div class="section-header-meta">
      ${companyName}<br />${items.length} Products &nbsp;•&nbsp; ${year}
    </div>
  </div>
  <div class="product-grid">
    ${productCards}
  </div>
</div>

<!-- ══════ TERMS & CONDITIONS ══════ -->
<div class="terms-page">
  <div class="terms-header">
    <div>
      <div class="terms-title">${termsType} Terms &amp; Conditions</div>
      <div class="terms-subtitle">${categoryName} — ${companyName}</div>
    </div>
    <div class="terms-brand">${companyName}<br />${today}</div>
  </div>

  <div class="terms-body">${activeTerms.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>

  <div class="terms-footer">
    <span>${companyName} &nbsp;|&nbsp; ${companyEmail}</span>
    <span>${companyPhone}</span>
    <span>${today}</span>
  </div>
</div>

<!-- ══════ BACK COVER ══════ -->
<div class="back-page">
  <div class="back-bg-grid">${bgImageHtml}</div>
  <div class="back-overlay"></div>
  <div class="back-corner"></div>
  <div class="back-corner-br"></div>

  <div class="back-content">
    <img src="${logoUrl || ''}" class="back-logo-img" alt="${companyName}" onerror="this.outerHTML='<div style=\\'width:70px;height:70px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:900;color:#7c3aed;margin:0 auto 16px;border:2px solid rgba(168,85,247,0.4)\\'>SW</div>'" />
    <div class="back-brand">${companyName}</div>
    <div class="back-website">www.safawala.com</div>
    <div class="back-divider"></div>
    <div class="back-tagline">Elegance for Every Celebration</div>

    <div class="contact-grid">
      <div class="contact-item"><div class="contact-label">WhatsApp / Call</div><div class="contact-value">${companyPhone}<br/>${companyPhone2}</div></div>
      <div class="contact-item"><div class="contact-label">Office</div><div class="contact-value">${officePhone}</div></div>
      <div class="contact-item"><div class="contact-label">Email</div><div class="contact-value">${companyEmail}</div></div>
      <div class="contact-item"><div class="contact-label">Website</div><div class="contact-value">${website}</div></div>
      <div class="contact-item"><div class="contact-label">Instagram</div><div class="contact-value">${instagram}</div></div>
      <div class="contact-item"><div class="contact-label">Locations</div><div class="contact-value">${companyAddress}</div></div>
    </div>

    <div class="back-cta">Book your wedding accessories today</div>
  </div>
</div>


</body>
</html>`

  // Generate PDF with Puppeteer
  let browser
  try {
    browser = await launchBrowser()
    const page = await browser.newPage()
    await (page as any).setContent(html, { waitUntil: "load", timeout: 30000 })
    const pdfBuffer: Buffer = await (page as any).pdf({
      format: "A4",
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    })
    await (browser as any).close()

    const filename = `${companyName.replace(/\s+/g, "-")}-${categoryName.replace(/\s+/g, "-")}-Catalog-${new Date().toISOString().split("T")[0]}.pdf`

    return new NextResponse(pdfBuffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
      },
    })
  } catch (err: any) {
    if (browser) await (browser as any).close().catch(() => {})
    console.error("PDF generation error:", err)
    // Fallback: return HTML with auto print dialog
    const htmlWithPrint = html.replace("</body>", `<script>window.onload=function(){setTimeout(()=>window.print(),800)}</script></body>`)
    return new NextResponse(htmlWithPrint, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    })
  }
}

function defaultRentalTerms(company: string): string {
  return `1. RENTAL AGREEMENT
These Terms & Conditions govern the rental of products from ${company}. By placing an order, you agree to be bound by these terms.

2. BOOKING & CONFIRMATION
• All bookings are confirmed only upon receipt of advance payment.
• Booking is subject to product availability at the time of confirmation.
• A booking confirmation will be sent via WhatsApp/email.

3. RENTAL PERIOD
• The rental period starts from the agreed delivery date and ends on the agreed return date.
• Extended rental periods are subject to additional charges.
• Early returns do not entitle the customer to a refund.

4. SECURITY DEPOSIT
• A refundable security deposit is required for all rentals.
• The deposit will be refunded within 7 working days after the item is returned in good condition.
• Deductions will be made for any damage, loss, or excessive soiling.

5. DELIVERY & PICKUP
• Delivery and pickup charges apply based on location.
• Customer must ensure availability at the agreed time.
• ${company} is not liable for delays due to traffic, weather, or other unforeseen circumstances.

6. CARE & USE
• Items must be handled with care and used only for their intended purpose.
• Items must not be altered, cut, washed, or dry-cleaned without prior written consent.
• Rental items remain the property of ${company} at all times.

7. DAMAGE & LOSS
• The customer is fully liable for any damage, loss, or theft of rental items.
• Damage charges will be assessed at replacement cost plus handling fees.
• Minor wear from normal use is acceptable; stains, tears, or structural damage are chargeable.

8. CANCELLATION POLICY
• Cancellations made 7+ days before the event: 50% refund of advance.
• Cancellations made within 7 days: No refund.
• ${company} reserves the right to cancel bookings in case of unforeseen circumstances.

9. LIMITATION OF LIABILITY
${company} shall not be liable for any indirect or consequential loss arising from use of rental products.

10. GOVERNING LAW
These terms are governed by the laws of India. Any disputes shall be subject to local jurisdiction.`
}

function defaultSalesTerms(company: string): string {
  return `1. SALES AGREEMENT
These Terms & Conditions govern the sale of products by ${company}. By placing an order, you accept these terms.

2. PRICING & PAYMENT
• All prices are in Indian Rupees (INR) inclusive of applicable taxes.
• Full payment is required before dispatch/delivery unless otherwise agreed.
• Prices are subject to change without prior notice.

3. ORDER CONFIRMATION
• Orders are confirmed upon payment receipt.
• A confirmation will be sent via WhatsApp/email.
• ${company} reserves the right to cancel orders due to stock unavailability.

4. DELIVERY
• Delivery timelines are estimates and not guaranteed.
• Risk of loss passes to the customer upon delivery.
• Delivery charges are additional unless specified.

5. RETURNS & EXCHANGES
• Products may be returned within 7 days of delivery in original, unused condition.
• No returns accepted for customized or made-to-order items.
• Refunds will be processed within 10 working days.

6. WARRANTIES
• Products are sold as described. No additional warranties are implied.
• ${company} is not liable for normal wear and tear.

7. DEFECTIVE PRODUCTS
• Defective items must be reported within 48 hours of delivery with photographic evidence.
• Replacements or refunds will be issued at ${company}'s discretion.

8. CANCELLATION
• Orders may be cancelled before dispatch for a full refund.
• Post-dispatch cancellations are not accepted.

9. LIMITATION OF LIABILITY
${company}'s liability is limited to the value of the product purchased.

10. GOVERNING LAW
These terms are governed by the laws of India. Disputes are subject to local jurisdiction.`
}

