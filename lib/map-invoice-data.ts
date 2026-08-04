import { InvoiceData, InvoiceItem } from "./invoice-generator"

export function mapToInvoiceData(
  order: any,
  customer: any,
  items: any[],
  company: any,
  orderType: string
): InvoiceData {
  let bookingType: 'package' | 'product_rental' | 'product_sale' | 'direct_sale' = 'product_rental';
  if (orderType === 'package_booking') bookingType = 'package';
  else if (orderType === 'direct_sale' || order.invoice_type === 'sale') bookingType = 'product_sale';

  // ── Package booking: build rich item list from package details + selected products
  let mappedItems: InvoiceItem[] = [];
  let packageName: string | undefined;
  let variantName: string | undefined;
  let variantInclusions: string[] | undefined;
  let categoryName: string | undefined;
  let extraSafas: number | undefined;

  if (orderType === 'package_booking') {
    // Extract package meta from order or first item
    packageName = order.package_name || order.package_details?.name || items[0]?.package_name || "Package";
    variantName = order.variant_name || items[0]?.variant_name || "";
    categoryName = order.category_name || items[0]?.category_name || "";
    extraSafas = order.extra_safas || 0;

    // Build inclusions from package variant
    const rawInclusions = order.inclusions || items[0]?.inclusions || [];
    variantInclusions = Array.isArray(rawInclusions)
      ? rawInclusions
      : typeof rawInclusions === "string"
        ? rawInclusions.split(",").map((s: string) => s.trim()).filter(Boolean)
        : [];

    // Map items: each item = one package line-item with its selected products
    mappedItems = items.map((item: any) => {
      const name = item.product_name || item.name || packageName || "Package Item";

      // Inclusions for this item
      const inclusionsArr = Array.isArray(item.inclusions)
        ? item.inclusions
        : typeof item.inclusions === "string"
          ? item.inclusions.split(",").map((s: string) => s.trim()).filter(Boolean)
          : [];

      // Selected/reserved products for this item
      let reservedProducts: Array<{name: string; qty: number}> = [];
      try {
        const reserved = Array.isArray(item.reserved_products)
          ? item.reserved_products
          : typeof item.reserved_products === "string" && item.reserved_products
            ? JSON.parse(item.reserved_products)
            : [];
        reservedProducts = reserved.map((p: any) => ({
          name: p.name || p.product_name || "Item",
          qty: p.qty || p.quantity || 1,
        }));
      } catch {
        reservedProducts = [];
      }

      // Build description: inclusions + products
      const parts: string[] = [];
      if (inclusionsArr.length > 0) parts.push(`Inclusions: ${inclusionsArr.join(", ")}`);
      if (reservedProducts.length > 0) {
        parts.push(`Products: ${reservedProducts.map(p => `${p.name} x${p.qty}`).join(", ")}`);
      }

      return {
        name,
        description: parts.join("\n"),
        quantity: item.quantity || item.safa_quantity || 1,
        unitPrice: item.unit_price || item.price || 0,
        totalPrice: item.total_price || 0,
        category: item.category || categoryName || "",
      };
    });

    // If no items but we have package info, add a summary row
    if (mappedItems.length === 0 && packageName) {
      mappedItems = [{
        name: `${packageName}${variantName ? ` — ${variantName}` : ""}`,
        description: variantInclusions?.length ? `Inclusions: ${variantInclusions.join(", ")}` : "",
        quantity: order.total_safas || order.safa_quantity || 1,
        unitPrice: order.total_amount || 0,
        totalPrice: order.total_amount || 0,
        category: categoryName || "",
      }];
    }

  } else {
    // Product orders / direct sales
    // items may come from bookings-items API (nested product obj) or direct DB query (flat)
    mappedItems = items.map((item: any) => {
      // Handle both nested (item.product.name) and flat (item.product_name) structures
      const productObj = item.product || {}
      const name = item.product_name || productObj.name || item.name || "Item"
      const barcode = item.barcode || productObj.barcode || productObj.product_code || item.product_code || ""
      const category = item.category || productObj.category || ""
      const imageUrl = item.image_url || productObj.image_url || ""

      return {
        name,
        description: barcode ? `#${barcode}` : "",
        quantity: item.quantity || 1,
        unitPrice: item.unit_price || item.price || productObj.rental_price || 0,
        totalPrice: item.total_price || ((item.quantity || 1) * (item.unit_price || item.price || 0)),
        category,
        imageUrl,
      }
    });
  }

  const isNewTerms = true; // always use new official T&C
  const rentalTerms = "1. All product selections and order details are considered approved by the customer at the time of booking. Any changes after confirmation may not be possible, especially close to the event date.\n2. For the best service experience, Safa Wale bookings should preferably be confirmed at least 30 days before the event.\n3. The remaining payment, including the Security Deposit, must be completed before the event date.\n4. Safas and rental items remain the customer's responsibility until collected by our team. Any lost, damaged, torn, burnt, or unreturned items will be charged as per the applicable lost/damage rates.\n5. Our team will arrange collection of safas after the event. If items are unavailable on the agreed date, additional rental charges may be adjusted from the Security Deposit.\n6. Safa Wale service includes up to 5 hours of assistance. Additional hours will be charged at Rs.1,500 per hour.\n7. Local city services include up to 1 hour; outstation services up to 4 hours and until 9:30 PM. Any additional time may be adjusted against the Security Deposit.\n8. Sold products are non-returnable and non-exchangeable. All bookings and services are subject to Vadodara jurisdiction.";
  const saleTerms = "1. Products purchased under the sale category are non-returnable and non-exchangeable.\n2. This agreement and any related matters shall be governed by the jurisdiction of Vadodara, Gujarat.";

  return {
    bookingId: order.id,
    bookingNumber: order.order_number || order.package_number || order.sale_number || order.booking_number || "N/A",
    bookingDate: order.created_at || order.invoice_date || new Date().toISOString(),
    eventDate: order.event_date || "",
    bookingType,
    paymentType: order.amount_paid >= order.total_amount ? 'full' : (order.amount_paid > 0 ? 'partial' : 'advance'),
    bookingStatus: order.status || "confirmed",
    isQuote: false,

    customerName: customer.name || "Customer",
    customerPhone: customer.phone || "",
    customerWhatsApp: customer.whatsapp || customer.phone || "",
    customerEmail: customer.email || "",
    customerAddress: customer.address || "",
    customerCity: customer.city || "",
    customerState: customer.state || "",
    customerPincode: customer.pincode || "",

    eventType: order.event_type || "",
    eventFor: order.event_participant || order.event_for || "",
    eventParticipant: order.event_participant || "",
    eventTime: order.event_time || "",
    venueName: order.venue_name || "",
    venueAddress: order.venue_address || "",
    groomName: order.groom_name || "",
    brideName: order.bride_name || "",
    deliveryDate: order.delivery_date || "",
    deliveryTime: order.delivery_time || "",
    returnDate: order.return_date || "",

    packageName,
    variantName,
    variantInclusions,
    categoryName,
    extraSafas,

    subtotal: (order.subtotal_amount || order.subtotal) || order.total_amount,
    discountAmount: order.discount_amount || 0,
    couponCode: order.coupon_code || "",
    couponDiscount: order.coupon_discount || 0,
    distanceAmount: order.distance_amount || 0,
    taxAmount: order.gst_amount || order.tax_amount || 0,
    taxPercentage: order.gst_percentage || 0,
    totalAmount: order.total_amount || 0,
    paidAmount: order.amount_paid || 0,
    securityDeposit: order.deposit_amount || order.security_deposit || 0,
    pendingAmount: Math.max(0, (order.total_amount || 0) - (order.amount_paid || 0)),
    paymentMethod: order.payment_method || "",

    items: mappedItems,

    companyName: company?.company_name || company?.name || "Safawala",
    companyPhone: "+91 97252 95691 | +91 97252 95692 | +91 95103 66393 (Office)",
    companyEmail: company?.email || "",
    companyAddress: "Delhi · Vadodara · Ahmedabad · Mumbai · Bangalore",
    companyCity: "",
    companyState: "",
    companyWebsite: "www.safawala.com",
    companyGST: company?.gst_number || "",
    companyLogo: company?.logo_url || "",
    termsAndConditions: (bookingType === 'product_sale' || bookingType === 'direct_sale') ? saleTerms : rentalTerms,
    primaryColor: "#6366F1",
    secondaryColor: "#EEF2FF",
  };
}
