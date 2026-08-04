/**
 * WATI WhatsApp API Service
 * Handles all WhatsApp messaging through WATI API
 */

import { supabaseServer as supabase } from "@/lib/supabase-server-simple"

// WATI Configuration interface
interface WATIConfig {
  api_key: string
  base_url: string
  instance_id: string
  is_active: boolean
}

// Message types
export interface SendMessageParams {
  phone: string
  message: string
}

export interface SendTemplateParams {
  phone: string
  templateName: string
  parameters: string[]
  broadcastName?: string
  mediaUrl?: string  // optional PDF/image URL to attach with template
}

export interface SendMediaParams {
  phone: string
  mediaUrl: string
  caption?: string
  mediaType: 'image' | 'document' | 'video'
}

// Response types
interface WATIResponse {
  result: boolean
  info?: string
  messageId?: string
}

// Cache for WATI config
let cachedConfig: WATIConfig | null = null
let configLastFetched: number = 0
const CONFIG_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/** Call after updating the WATI API key to force the next request to re-read from DB */
export function invalidateWATIConfigCache() {
  cachedConfig = null
  configLastFetched = 0
}

/**
 * Get WATI configuration from database
 */
async function getWATIConfig(): Promise<WATIConfig | null> {
  // Return cached config if still valid
  if (cachedConfig && Date.now() - configLastFetched < CONFIG_CACHE_TTL) {
    return cachedConfig
  }

  try {
    const { data, error } = await supabase
      .from("integration_settings")
      .select("api_key, base_url, instance_id, is_active")
      .eq("integration_name", "whatsapp-wati")
      .single()

    if (error || !data) {
      console.error("[WATI] Config not found:", error)
      return null
    }

    cachedConfig = data as WATIConfig
    configLastFetched = Date.now()
    return cachedConfig
  } catch (error) {
    console.error("[WATI] Error fetching config:", error)
    return null
  }
}

/**
 * Format phone number for WATI (remove +, spaces, etc.)
 */
function formatPhone(phone: string): string {
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, '')
  
  // Add country code if missing (assuming India)
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned
  }
  
  return cleaned
}

/**
 * Send a text message via WATI
 * Note: Session messages only work within 24-hour window after customer messages you
 */
export async function sendMessage(params: SendMessageParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = await getWATIConfig()
  
  if (!config || !config.is_active) {
    return { success: false, error: "WATI integration is not configured or inactive" }
  }

  const phone = formatPhone(params.phone)

  try {
    // Try session message first
    const response = await fetch(`${config.base_url}/api/v1/sendSessionMessage/${phone}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.api_key}`,
        'Content-Type': 'application/json-patch+json',
      },
      body: JSON.stringify({
        messageText: params.message,
      }),
    })

    const responseText = await response.text()
    console.log(`[WATI] sendSessionMessage response (status ${response.status}):`, responseText)

    let data: any
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      console.error("[WATI] Failed to parse sendSessionMessage JSON response:", e.message)
      return { success: false, error: `WATI server returned status ${response.status}: ${responseText}` }
    }

    if (response.ok && data.result === true) {
      // Log the message
      await logMessage({
        phone,
        type: 'text',
        content: params.message,
        status: 'sent',
        messageId: data.messageId,
      })
      return { success: true, messageId: data.messageId }
    }

    // If session message fails, return the error
    return { success: false, error: data.message || data.info || "Failed to send message. Customer may need to message you first (24-hour session window)." }
  } catch (error: any) {
    console.error("[WATI] Error sending message:", error)
    return { success: false, error: error.message || "Network error" }
  }
}

/**
 * Send a test/interactive message via WATI (doesn't require session)
 * Uses the sendInteractiveButtonsMessage or sendTemplateMessages endpoint
 */
export async function sendTestMessage(phone: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = await getWATIConfig()
  
  if (!config || !config.is_active) {
    return { success: false, error: "WATI integration is not configured or inactive" }
  }

  const formattedPhone = formatPhone(phone)

  try {
    // Use sendTemplateMessages API for test (no session required)
    const response = await fetch(`${config.base_url}/api/v1/sendTemplateMessages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.api_key}`,
        'Content-Type': 'application/json-patch+json',
      },
      body: JSON.stringify({
        broadcast_name: `test_${Date.now()}`,
        template_name: 'wedding_turban', // Approved template
        receivers: [
          {
            whatsappNumber: formattedPhone,
          }
        ]
      }),
    })

    const data = await response.json()
    console.log("[WATI] sendTemplateMessages response:", data)

    if (response.ok && (data.result === true || data.result === 'true')) {
      return { success: true, messageId: data.messageId || 'sent' }
    }

    // Try session message as fallback
    console.log("[WATI] Template failed, trying session message...")
    const sessionResponse = await fetch(`${config.base_url}/api/v1/sendSessionMessage/${formattedPhone}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.api_key}`,
        'Content-Type': 'application/json-patch+json',
      },
      body: JSON.stringify({
        messageText: '✅ Test message from Safawala CRM\n\nYour WhatsApp integration is working correctly!',
      }),
    })

    const sessionData = await sessionResponse.json()
    console.log("[WATI] sendSessionMessage response:", sessionData)

    if (sessionResponse.ok && sessionData.result === true) {
      return { success: true, messageId: sessionData.messageId }
    }

    return { 
      success: false, 
      error: data.message || sessionData.message || "Failed to send test message. You may need an approved template or the customer needs to message you first." 
    }
  } catch (error: any) {
    console.error("[WATI] Error sending test message:", error)
    return { success: false, error: error.message || "Network error" }
  }
}

/**
 * Send a template message via WATI
 */
export async function sendTemplateMessage(params: SendTemplateParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = await getWATIConfig()
  
  if (!config || !config.is_active) {
    return { success: false, error: "WATI integration is not configured or inactive" }
  }

  const phone = formatPhone(params.phone)

  try {
    // Use sendTemplateMessages (broadcast API) — correctly substitutes {{params}}
    const response = await fetch(`${config.base_url}/api/v1/sendTemplateMessages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        broadcast_name: params.broadcastName || `broadcast_${Date.now()}`,
        template_name: params.templateName,
        receivers: [
          {
            whatsappNumber: phone,
            customParams: [
              ...params.parameters.map((value, index) => ({
                name: `${index + 1}`,
                value,
              })),
              ...(params.mediaUrl ? [{ name: "mediaUrl", value: params.mediaUrl }] : []),
            ],
            ...(params.mediaUrl ? { mediaUrl: params.mediaUrl } : {}),
          },
        ],
      }),
    })

    const responseText = await response.text()
    console.log(`[WATI] sendTemplateMessages response (status ${response.status}):`, responseText)

    let data: any
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      console.error("[WATI] Failed to parse sendTemplateMessages JSON response:", e.message)
      return { success: false, error: `WATI server returned status ${response.status}: ${responseText}` }
    }

    if (!response.ok || !data.result) {
      console.error("[WATI] Send template failed:", data)
      return { success: false, error: data.errors?.error || data.info || "Failed to send template message" }
    }

    // Log the message
    await logMessage({
      phone,
      type: 'template',
      content: `Template: ${params.templateName}`,
      templateName: params.templateName,
      status: 'sent',
      messageId: data.messageId,
    })

    return { success: true, messageId: data.messageId }
  } catch (error: any) {
    console.error("[WATI] Error sending template:", error)
    return { success: false, error: error.message || "Network error" }
  }
}

/**
 * Send media (image/document/video) via WATI
 */
export async function sendMedia(params: SendMediaParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = await getWATIConfig()
  
  if (!config || !config.is_active) {
    return { success: false, error: "WATI integration is not configured or inactive" }
  }

  const phone = formatPhone(params.phone)

  try {
    const endpoint = 'sendSessionFile'

    // 1. Download the media file from the public URL
    const fileResponse = await fetch(params.mediaUrl)
    if (!fileResponse.ok) {
      return { success: false, error: `Failed to download media file from URL: ${fileResponse.statusText}` }
    }
    const arrayBuffer = await fileResponse.arrayBuffer()
    
    // Determine the content-type and filename extension
    let mimeType = 'application/pdf'
    let filename = 'invoice.pdf'
    if (params.mediaType === 'image') {
      mimeType = 'image/jpeg'
      filename = 'image.jpg'
    } else if (params.mediaType === 'video') {
      mimeType = 'video/mp4'
      filename = 'video.mp4'
    }

    const blob = new Blob([arrayBuffer], { type: mimeType })

    // 2. Build FormData for multipart/form-data upload
    const formData = new FormData()
    formData.append('file', blob, filename)
    if (params.caption) {
      formData.append('caption', params.caption)
    }

    const response = await fetch(`${config.base_url}/api/v1/${endpoint}/${phone}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.api_key}`,
      },
      body: formData,
    })

    const responseText = await response.text()
    console.log(`[WATI] sendMedia response (status ${response.status}):`, responseText)

    let data: WATIResponse
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      console.error("[WATI] Failed to parse sendMedia JSON response:", e.message)
      return { success: false, error: `WATI server returned status ${response.status}: ${responseText}` }
    }

    if (!response.ok || !data.result) {
      console.error("[WATI] Send media failed:", data)
      return { success: false, error: data.info || "Failed to send media" }
    }

    // Log the message
    await logMessage({
      phone,
      type: params.mediaType,
      content: params.caption || params.mediaUrl,
      status: 'sent',
      messageId: data.messageId,
    })

    return { success: true, messageId: data.messageId }
  } catch (error: any) {
    console.error("[WATI] Error sending media:", error)
    return { success: false, error: error.message || "Network error" }
  }
}

/**
 * Get all message templates from WATI
 */
export async function getTemplates(): Promise<{ success: boolean; templates?: any[]; error?: string }> {
  const config = await getWATIConfig()
  
  if (!config || !config.is_active) {
    return { success: false, error: "WATI integration is not configured or inactive" }
  }

  try {
    const response = await fetch(`${config.base_url}/api/v1/getMessageTemplates`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.api_key}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: "Failed to fetch templates" }
    }

    return { success: true, templates: data.messageTemplates || [] }
  } catch (error: any) {
    console.error("[WATI] Error fetching templates:", error)
    return { success: false, error: error.message || "Network error" }
  }
}

/**
 * Check if a contact has WhatsApp
 */
export async function checkWhatsAppNumber(phone: string): Promise<{ success: boolean; exists?: boolean; error?: string }> {
  const config = await getWATIConfig()
  
  if (!config || !config.is_active) {
    return { success: false, error: "WATI integration is not configured or inactive" }
  }

  const formattedPhone = formatPhone(phone)

  try {
    const response = await fetch(`${config.base_url}/api/v1/getContacts?pageSize=1&pageNumber=0&whatsappNumber=${formattedPhone}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.api_key}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: "Failed to check number" }
    }

    return { success: true, exists: data.contact_list?.length > 0 }
  } catch (error: any) {
    console.error("[WATI] Error checking number:", error)
    return { success: false, error: error.message || "Network error" }
  }
}

/**
 * Log message to database for tracking
 */
async function logMessage(params: {
  phone: string
  type: string
  content: string
  templateName?: string
  status: string
  messageId?: string
}) {
  try {
    await supabase.from("whatsapp_messages").insert({
      phone: params.phone,
      message_type: params.type,
      content: params.content,
      template_name: params.templateName,
      status: params.status,
      wati_message_id: params.messageId,
      sent_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[WATI] Error logging message:", error)
    // Don't throw - logging failure shouldn't break message sending
  }
}

// ============================================
// BUSINESS NOTIFICATION FUNCTIONS
// ============================================

/**
 * Send booking confirmation to customer
 */
export async function sendBookingConfirmation(params: {
  phone: string
  customerName: string
  bookingNumber: string
  eventDate: string
  eventTime?: string
  venueName?: string
  itemsSummary?: string
  totalAmount: number
  paymentStatus?: string
}): Promise<{ success: boolean; error?: string }> {
  // Use the approved template. Try the newer UTILITY template (booking_invoice_document_v3) first.
  let res = await sendTemplateMessage({
    phone: params.phone,
    templateName: 'booking_invoice_document_v3',
    parameters: [
      params.customerName,                                         // {{1}}
      params.bookingNumber,                                        // {{2}}
      params.eventDate,                                            // {{3}}
      params.eventTime || "TBD",                                   // {{4}}
      params.venueName || "TBD",                                   // {{5}}
      params.itemsSummary || "Wedding Accessories",                // {{6}}
      `₹${params.totalAmount.toLocaleString('en-IN')}`,              // {{7}} - include ₹ since template body has plain {{7}}
      params.paymentStatus || "Confirmed",                         // {{8}}
    ],
  })

  if (!res.success) {
    console.log("[WATI] booking_invoice_document_v3 failed/pending, trying booking_invoice_document_v2 fallback")
    res = await sendTemplateMessage({
      phone: params.phone,
      templateName: 'booking_invoice_document_v2',
      parameters: [
        params.customerName,
        params.bookingNumber,
        params.eventDate,
        params.eventTime || "TBD",
        params.venueName || "TBD",
        params.itemsSummary || "Wedding Accessories",
        `₹${params.totalAmount.toLocaleString('en-IN')}`,
        params.paymentStatus || "Confirmed",
      ],
    })
  }

  if (!res.success) {
    console.log("[WATI] booking_invoice_document_v2 failed/pending, trying booking_invoice_document fallback")
    res = await sendTemplateMessage({
      phone: params.phone,
      templateName: 'booking_invoice_document',
      parameters: [
        params.customerName,
        params.bookingNumber,
        params.eventDate,
        params.eventTime || "TBD",
        params.venueName || "TBD",
        params.itemsSummary || "Wedding Accessories",
        `₹${params.totalAmount.toLocaleString('en-IN')}`,
        params.paymentStatus || "Confirmed",
      ],
    })
  }
  return res
}


/**
 * Send direct sale confirmation to customer
 */
export async function sendDirectSaleConfirmation(params: {
  phone: string
  customerName: string
  saleNumber: string
  saleDate: string
  totalAmount: number
}): Promise<{ success: boolean; error?: string }> {
  // Try sending the template first
  let res = await sendTemplateMessage({
    phone: params.phone,
    templateName: 'direct_sale_confirmation',
    parameters: [
      params.customerName,                                         // {{1}}
      params.saleNumber,                                           // {{2}}
      `₹${params.totalAmount.toLocaleString('en-IN')}`,              // {{3}}
      params.saleDate,                                             // {{4}}
    ],
  })

  // Fallback to custom session text message if template fails
  if (!res.success) {
    console.log("[WATI] direct_sale_confirmation template failed/pending, trying session text message fallback")
    const formattedPhone = formatPhone(params.phone)
    const config = await getWATIConfig()
    if (config && config.is_active) {
      try {
        const message = `🛍️ *Invoice Generated - Safawala*

Dear ${params.customerName},

Thank you for your purchase! Your direct sale has been completed.

📋 *Purchase Details:*
• Invoice/Sale ID: ${params.saleNumber}
• Total Amount: ₹${params.totalAmount.toLocaleString('en-IN')}
• Date: ${params.saleDate}

Thank you for choosing Safawala! 🙏

For any queries, please contact us.`

        const response = await fetch(`${config.base_url}/api/v1/sendSessionMessage/${formattedPhone}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.api_key}`,
            'Content-Type': 'application/json-patch+json',
          },
          body: JSON.stringify({
            messageText: message,
          }),
        })

        const responseText = await response.text()
        let data: any
        try {
          data = JSON.parse(responseText)
        } catch (e: any) {
          return { success: false, error: `Session fallback JSON parse failed: ${responseText}` }
        }

        if (response.ok && data.result === true) {
          await logMessage({
            phone: formattedPhone,
            type: 'text',
            content: message,
            status: 'sent',
            messageId: data.messageId,
          })
          return { success: true, messageId: data.messageId }
        }
        return { success: false, error: data.message || data.info || "Failed to send session fallback message" }
      } catch (e: any) {
        return { success: false, error: e.message }
      }
    }
  }
  return res
}


/**
 * Send booking status update to customer
 */
export async function sendBookingStatusUpdate(params: {
  phone: string
  customerName: string
  bookingNumber: string
  newStatus: string
  updatedDate: string
  nextAction?: string
}): Promise<{ success: boolean; error?: string }> {
  return sendTemplateMessage({
    phone: params.phone,
    templateName: 'booking_status_update',
    parameters: [
      params.customerName,
      params.bookingNumber,
      params.newStatus,
      params.updatedDate,
      params.nextAction || "Contact store for details",
    ],
  })
}

/**
 * Send booking cancellation to customer
 */
export async function sendBookingCancelled(params: {
  phone: string
  customerName: string
  bookingNumber: string
  cancellationDate: string
  reason?: string
  refundAmount?: number
  refundStatus?: string
}): Promise<{ success: boolean; error?: string }> {
  return sendTemplateMessage({
    phone: params.phone,
    templateName: 'booking_cancelled',
    parameters: [
      params.customerName,
      params.bookingNumber,
      params.cancellationDate,
      params.reason || "Cancelled as requested",
      `₹${(params.refundAmount || 0).toLocaleString('en-IN')}`,
      params.refundStatus || "N/A",
    ],
  })
}

/**
 * Send payment received notification
 */
export async function sendPaymentReceived(params: {
  phone: string
  customerName: string
  bookingNumber: string
  amountPaid: number
  remainingBalance: number
}): Promise<{ success: boolean; error?: string }> {
  return sendTemplateMessage({
    phone: params.phone,
    templateName: 'payment_received',
    parameters: [
      params.customerName,
      params.bookingNumber,
      `₹${params.amountPaid.toLocaleString('en-IN')}`,
      `₹${params.remainingBalance.toLocaleString('en-IN')}`,
    ],
  })
}

/**
 * Send delivery reminder
 */
export async function sendDeliveryReminder(params: {
  phone: string
  customerName: string
  bookingNumber: string
  deliveryDate: string
  deliveryTime: string
  itemsList?: string
}): Promise<{ success: boolean; error?: string }> {
  return sendTemplateMessage({
    phone: params.phone,
    templateName: 'delivery_reminder',
    parameters: [
      params.customerName,
      params.bookingNumber,
      params.deliveryDate,
      params.deliveryTime,
      "As specified in booking",
      params.itemsList || "Wedding Accessories",
    ],
  })
}

/**
 * Send return reminder
 */
export async function sendReturnReminder(params: {
  phone: string
  customerName: string
  bookingNumber: string
  returnDate: string
  returnTime?: string
  itemsList?: string
}): Promise<{ success: boolean; error?: string }> {
  return sendTemplateMessage({
    phone: params.phone,
    templateName: 'return_reminder',
    parameters: [
      params.customerName,
      params.bookingNumber,
      params.returnDate,
      params.returnTime || "18:00",
      params.itemsList || "Wedding Accessories",
    ],
  })
}

/**
 * Send invoice to customer
 */
export async function sendInvoice(params: {
  phone: string
  customerName: string
  bookingNumber: string
  invoiceUrl: string
  totalAmount?: number
  dueDate?: string
}): Promise<{ success: boolean; error?: string }> {
  // First send the template message (invoice_sent needs 4 params)
  const templateResult = await sendTemplateMessage({
    phone: params.phone,
    templateName: 'invoice_sent',
    parameters: [
      params.customerName,
      params.bookingNumber,
      params.totalAmount ? `₹${params.totalAmount.toLocaleString('en-IN')}` : "As per booking",
      params.dueDate || "On delivery",
    ],
  })

  if (!templateResult.success) {
    return templateResult
  }

  // Then send the PDF
  return sendMedia({
    phone: params.phone,
    mediaUrl: params.invoiceUrl,
    caption: `Invoice for booking ${params.bookingNumber}`,
    mediaType: 'document',
  })
}

/**
 * Send promotional message (bulk)
 */
export async function sendBulkPromotion(params: {
  phones: string[]
  templateName: string
  parameters: string[]
  broadcastName: string
}): Promise<{ success: boolean; sent: number; failed: number; errors: string[] }> {
  let sent = 0
  let failed = 0
  const errors: string[] = []

  for (const phone of params.phones) {
    const result = await sendTemplateMessage({
      phone,
      templateName: params.templateName,
      parameters: params.parameters,
      broadcastName: params.broadcastName,
    })

    if (result.success) {
      sent++
    } else {
      failed++
      errors.push(`${phone}: ${result.error}`)
    }

    // Rate limiting - wait 100ms between messages
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  return { success: failed === 0, sent, failed, errors }
}

/**
 * Send payment reminder to customer
 */
export async function sendPaymentReminder(params: {
  phone: string
  customerName: string
  bookingNumber: string
  pendingAmount: number
  eventDate: string
  daysUntilEvent: number
}): Promise<{ success: boolean; error?: string }> {
  return sendTemplateMessage({
    phone: params.phone,
    templateName: 'payment_reminder', // You'll need to create this template in WATI
    parameters: [
      params.customerName,
      params.bookingNumber,
      `₹${params.pendingAmount.toLocaleString()}`,
      params.eventDate,
      params.daysUntilEvent.toString(),
    ],
  })
}

/**
 * Send a welcome / thank you WhatsApp message to a new lead
 */
export async function sendLeadWelcome(params: {
  phone: string
  customerName: string
  packageName?: string
}): Promise<{ success: boolean; error?: string }> {
  // Try sending the template first if one is approved
  let res = await sendTemplateMessage({
    phone: params.phone,
    templateName: 'lead_welcome',
    parameters: [
      params.customerName,
      params.packageName || "Wedding Accessories",
    ],
  })

  // Fallback to custom session text message if template fails
  if (!res.success) {
    console.log("[WATI] lead_welcome template failed/pending, trying session text message fallback")
    const formattedPhone = formatPhone(params.phone)
    const config = await getWATIConfig()
    if (config && config.is_active) {
      try {
        const message = `✨ *Welcome to Safawala!* ✨\n\nDear ${params.customerName},\n\nThank you for your enquiry! We have received your request for our wedding accessories services.\n\nOur team will review the details and get back to you shortly. In the meantime, feel free to browse our collection or message us here.\n\nThank you for choosing Safawala! 🙏`
        
        const response = await fetch(`${config.base_url}/api/v1/sendSessionMessage/${formattedPhone}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.api_key}`,
            'Content-Type': 'application/json-patch+json',
          },
          body: JSON.stringify({
            messageText: message,
          }),
        })

        const responseText = await response.text()
        let data: any
        try {
          data = JSON.parse(responseText)
        } catch (e: any) {
          return { success: false, error: `Session fallback JSON parse failed: ${responseText}` }
        }

        if (response.ok && data.result === true) {
          await logMessage({
            phone: formattedPhone,
            type: 'text',
            content: message,
            status: 'sent',
            messageId: data.messageId,
          })
          return { success: true, messageId: data.messageId }
        }
        return { success: false, error: data.message || data.info || "Failed to send session fallback message" }
      } catch (e: any) {
        return { success: false, error: e.message }
      }
    }
  }
  return res
}

/**
 * Send review / feedback request to customer
 */
export async function sendReviewRequest(params: {
  phone: string
  customerName: string
}): Promise<{ success: boolean; error?: string }> {
  // Try sending the template first if one is approved
  let res = await sendTemplateMessage({
    phone: params.phone,
    templateName: 'customer_feedback',
    parameters: [
      params.customerName,
    ],
  })

  // Fallback to custom session text message if template fails or isn't approved
  if (!res.success) {
    console.log("[WATI] customer_feedback template failed/pending, trying session text message fallback")
    const formattedPhone = formatPhone(params.phone)
    const config = await getWATIConfig()
    if (config && config.is_active) {
      try {
        const message = `Dear ${params.customerName},\n\nThank you for choosing Safawala for your wedding accessories! We hope you loved our collection and service.\n\nCould you please take a moment to share your feedback and review us? It helps us grow and serve you better!\n\n🌐 Website: https://www.safawala.com\n📸 Instagram: https://www.instagram.com/safawala\n⭐ Google Review: https://g.page/r/safawala/review\n\nThank you once again! 🙏`

        const response = await fetch(`${config.base_url}/api/v1/sendSessionMessage/${formattedPhone}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.api_key}`,
            'Content-Type': 'application/json-patch+json',
          },
          body: JSON.stringify({
            messageText: message,
          }),
        })

        const responseText = await response.text()
        let data: any
        try {
          data = JSON.parse(responseText)
        } catch (e: any) {
          return { success: false, error: `Session fallback JSON parse failed: ${responseText}` }
        }

        if (response.ok && data.result === true) {
          await logMessage({
            phone: formattedPhone,
            type: 'text',
            content: message,
            status: 'sent',
            messageId: data.messageId,
          })
          return { success: true, messageId: data.messageId }
        }
        return { success: false, error: data.message || data.info || "Failed to send session feedback message" }
      } catch (e: any) {
        return { success: false, error: e.message }
      }
    }
  }
  return res
}

/**
 * Get all contacts from WATI
 */
export async function getContacts(params: {
  pageSize?: number
  pageNumber?: number
  name?: string
} = {}): Promise<{ success: boolean; contacts?: any[]; total?: number; error?: string }> {
  const config = await getWATIConfig()
  if (!config) return { success: false, error: "WATI not configured" }

  const { pageSize = 50, pageNumber = 0, name } = params
  let url = `${config.base_url}/api/v1/getContacts?pageSize=${pageSize}&pageNumber=${pageNumber}`
  if (name) url += `&name=${encodeURIComponent(name)}`

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${config.api_key}`, "Content-Type": "application/json" },
    })
    const data = await res.json()
    if (!res.ok) return { success: false, error: data.message || "Failed to fetch contacts" }
    return { success: true, contacts: data.contact ?? [], total: data.total ?? 0 }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Get messages for a specific WhatsApp contact
 */
export async function getMessages(params: {
  phone: string
  pageSize?: number
  pageNumber?: number
}): Promise<{ success: boolean; messages?: any[]; error?: string }> {
  const config = await getWATIConfig()
  if (!config) return { success: false, error: "WATI not configured" }

  const { phone, pageSize = 50, pageNumber = 0 } = params
  const formatted = formatPhone(phone)
  const url = `${config.base_url}/api/v1/getMessages/${formatted}?pageSize=${pageSize}&pageNumber=${pageNumber}`

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${config.api_key}`, "Content-Type": "application/json" },
    })
    const data = await res.json()
    if (!res.ok) return { success: false, error: data.message || "Failed to fetch messages" }
    return { success: true, messages: data.messages?.items ?? [] }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
