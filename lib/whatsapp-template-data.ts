// WhatsApp Template Data for Settings UI
export interface TemplateItem {
  name: string
  label: string
  badge: 'essential' | 'important' | 'optional' | 'marketing'
  message: string
  params: string
}

export interface TemplateCategory {
  title: string
  icon: string
  templates: TemplateItem[]
}

export const WHATSAPP_TEMPLATES: TemplateCategory[] = [
  {
    title: '📋 Booking Templates (8)',
    icon: 'booking',
    templates: [
      {
        name: 'booking_confirmation',
        label: 'New booking created',
        badge: 'essential',
        message: `Dear {{1}},

Your booking has been confirmed! 🎉

📋 *Booking Details:*
• Booking ID: {{2}}
• Event Date: {{3}}
• Items: {{4}}

💰 *Payment:*
• Total: ₹{{5}}
• Status: {{6}}

📞 Contact: +91 97252 95692

Thank you for choosing Safawala! 🙏`,
        params: '1=Name, 2=BookingID, 3=EventDate, 4=Items, 5=Total, 6=PaymentStatus',
      },
      {
        name: 'booking_status_update',
        label: 'Status changed',
        badge: 'optional',
        message: `Dear {{1}},

Your booking status has been updated! 📋

📋 *Booking Details:*
• Booking ID: {{2}}
• New Status: {{3}}
• Updated: {{4}}

Next Step: {{5}}

📞 Contact: +91 97252 95692`,
        params: '1=Name, 2=BookingID, 3=NewStatus, 4=UpdateDate, 5=NextAction',
      },
      {
        name: 'booking_modified',
        label: 'Booking details changed',
        badge: 'optional',
        message: `Dear {{1}},

Your booking has been modified! ✏️

📋 *Updated Booking:*
• Booking ID: {{2}}
• Changes: {{3}}
• New Total: ₹{{4}}

Please review the changes.

📞 Contact: +91 97252 95692`,
        params: '1=Name, 2=BookingID, 3=ChangesSummary, 4=NewTotal',
      },
      {
        name: 'booking_cancelled',
        label: 'Booking cancelled',
        badge: 'important',
        message: `Dear {{1}},

Your booking has been cancelled. ❌

📋 *Cancelled Booking:*
• Booking ID: {{2}}
• Event Date: {{3}}
• Reason: {{4}}

💰 *Refund (if applicable):*
• Amount: ₹{{5}}
• Status: {{6}}

We hope to serve you again!

📞 Contact: +91 97252 95692`,
        params: '1=Name, 2=BookingID, 3=EventDate, 4=Reason, 5=RefundAmount, 6=RefundStatus',
      },
      {
        name: 'booking_rescheduled',
        label: 'Event date changed',
        badge: 'optional',
        message: `Dear {{1}},

Your booking has been rescheduled! 📅

📋 *Updated Schedule:*
• Booking ID: {{2}}
• Old Date: {{3}}
• New Date: {{4}}
• New Time: {{5}}

All items will be ready for the new date.

📞 Contact: +91 97252 95692`,
        params: '1=Name, 2=BookingID, 3=OldDate, 4=NewDate, 5=NewTime',
      },
      {
        name: 'booking_on_hold',
        label: 'Booking put on hold',
        badge: 'optional',
        message: `Dear {{1}},

Your booking is currently on hold. ⏸️

📋 *Booking Details:*
• Booking ID: {{2}}
• Event Date: {{3}}
• Reason: {{4}}

Action Required: {{5}}

Please contact us to proceed.

📞 Contact: +91 97252 95692`,
        params: '1=Name, 2=BookingID, 3=EventDate, 4=Reason, 5=ActionRequired',
      },
      {
        name: 'booking_completed',
        label: 'After return completed',
        badge: 'essential',
        message: `Dear {{1}},

Your booking is complete! 🎉

📋 *Booking Summary:*
• Booking ID: {{2}}
• Event Date: {{3}}
• Items Returned: ✅

💰 *Final Statement:*
• Total: ₹{{4}}
• Paid: ₹{{5}}
• Security Deposit Refunded: ₹{{6}}

Thank you for choosing Safawala!
We hope to serve you again! 🙏

📞 Contact: +91 97252 95692`,
        params: '1=Name, 2=BookingID, 3=EventDate, 4=Total, 5=Paid, 6=DepositRefund',
      },
      {
        name: 'booking_summary',
        label: 'Weekly/Monthly summary',
        badge: 'optional',
        message: `Dear {{1}},

Here's your booking summary! 📊

📋 *Your Bookings:*
• Total Bookings: {{2}}
• Upcoming: {{3}}
• Completed: {{4}}

💰 *Payment Summary:*
• Total Spent: ₹{{5}}
• Outstanding: ₹{{6}}

Thank you for your loyalty! 🙏

📞 Contact: +91 97252 95692`,
        params: '1=Name, 2=TotalBookings, 3=Upcoming, 4=Completed, 5=TotalSpent, 6=Outstanding',
      },
    ],
  },
  {
    title: '💳 Payment Templates (8)',
    icon: 'payment',
    templates: [
      {
        name: 'payment_reminder',
        label: '10, 7, 3, 1 days before event',
        badge: 'essential',
        message: `Dear {{1}},

Friendly reminder about your pending payment! 💳

📋 *Booking Details:*
• Booking ID: {{2}}
• Event Date: {{3}}
• Days Until Event: {{4}}

💰 *Payment Due:*
• Total: ₹{{5}}
• Paid: ₹{{6}}
• Balance: ₹{{7}}

Please clear the balance before the event.

💳 UPI: safawala@paytm

📞 Contact: +91 97252 95692`,
        params: '1=Name, 2=BookingID, 3=EventDate, 4=DaysUntil, 5=Total, 6=Paid, 7=Balance',
      },
      {
        name: 'payment_received',
        label: 'Payment recorded',
        badge: 'essential',
        message: `Dear {{1}},

Thank you! Your payment has been received. ✅

💳 *Payment Details:*
• Amount: ₹{{2}}
• Booking ID: {{3}}
• Date: {{4}}
• Method: {{5}}

📄 *Balance: ₹{{6}}*

Receipt will be shared separately.

📞 Contact: +91 97252 95692`,
        params: '1=Name, 2=Amount, 3=BookingID, 4=Date, 5=Method, 6=Balance',
      },
      {
        name: 'payment_overdue',
        label: 'Payment past due date',
        badge: 'important',
        message: `Dear {{1}},

Your payment is overdue! ⚠️

📋 *Booking Details:*
• Booking ID: {{2}}
• Event Date: {{3}}
• Due Date: {{4}}

💰 *Amount Overdue:*
• Balance Due: ₹{{5}}
• Days Overdue: {{6}}

Please make the payment immediately to avoid service interruption.

💳 UPI: safawala@paytm

📞 Contact: +91 97252 95692`,
        params: '1=Name, 2=BookingID, 3=EventDate, 4=DueDate, 5=Balance, 6=DaysOverdue',
      },
      {
        name: 'payment_partial',
        label: 'Partial payment received',
        badge: 'optional',
        message: `Dear {{1}},

Partial payment received! ✅

💳 *Payment Received:*
• Amount: ₹{{2}}
• Booking ID: {{3}}

💰 *Balance Status:*
• Total: ₹{{4}}
• Paid: ₹{{5}}
• Remaining: ₹{{6}}

Please clear remaining balance before {{7}}.

📞 Contact: +91 97252 95692`,
        params: '1=Name, 2=AmountPaid, 3=BookingID, 4=Total, 5=TotalPaid, 6=Remaining, 7=DueDate',
      },
      {
        name: 'security_deposit_reminder',
        label: 'Remind about deposit',
        badge: 'optional',
        message: `Dear {{1}},

Reminder: Security deposit pending! 🔒

📋 *Booking Details:*
• Booking ID: {{2}}
• Event Date: {{3}}

💰 *Security Deposit:*
• Amount: ₹{{4}}
• Due By: {{5}}

Security deposit is required before item delivery.

💳 UPI: safawala@paytm

📞 Contact: +91 97252 95692`,
        params: '1=Name, 2=BookingID, 3=EventDate, 4=DepositAmount, 5=DueDate',
      },
      {
        name: 'security_deposit_received',
        label: 'Deposit collected',
        badge: 'optional',
        message: `Dear {{1}},

Security deposit received! ✅

🔒 *Deposit Details:*
• Amount: ₹{{2}}
• Booking ID: {{3}}
• Date: {{4}}

This deposit will be refunded after items are returned in good condition.

📞 Contact: +91 97252 95692`,
        params: '1=Name, 2=Amount, 3=BookingID, 4=Date',
      },
      {
        name: 'security_deposit_refunded',
        label: 'Deposit returned',
        badge: 'essential',
        message: `Dear {{1}},

Your security deposit has been refunded! 💰

🔒 *Refund Details:*
• Amount: ₹{{2}}
• Booking ID: {{3}}
• Refund Date: {{4}}
• Refund Method: {{5}}

Thank you for returning items in good condition!

📞 Contact: +91 97252 95692`,
        params: '1=Name, 2=Amount, 3=BookingID, 4=Date, 5=Method',
      },
      {
        name: 'refund_processed',
        label: 'Cancellation refund',
        badge: 'optional',
        message: `Dear {{1}},

Your refund has been processed! 💰

💳 *Refund Details:*
• Amount: ₹{{2}}
• Booking ID: {{3}}
• Reason: {{4}}
• Refund Date: {{5}}

Amount will be credited within 5-7 working days.

📞 Contact: +91 97252 95692`,
        params: '1=Name, 2=Amount, 3=BookingID, 4=Reason, 5=Date',
      },
    ],
  },
  {
    title: '📦 Delivery Templates (6)',
    icon: 'delivery',
    templates: [
      {
        name: 'delivery_scheduled',
        label: 'Delivery date confirmed',
        badge: 'optional',
        message: `Dear {{1}},

Your delivery has been scheduled! 📅

📦 *Delivery Details:*
• Booking ID: {{2}}
• Date: {{3}}
• Time: {{4}}
• Address: {{5}}

Our team will contact you before delivery.

📞 Contact: +91 97252 95692`,
        params: '1=Name, 2=BookingID, 3=Date, 4=Time, 5=Address',
      },
      {
        name: 'delivery_reminder',
        label: 'Day before delivery',
        badge: 'essential',
        message: `Dear {{1}},

Reminder: Your items are scheduled for delivery tomorrow! 📦

📋 *Delivery Details:*
• Booking ID: {{2}}
• Date: {{3}}
• Time: {{4}}
• Address: {{5}}

📦 *Items:*
{{6}}

Please ensure someone is available to receive.

📞 Contact: +91 97252 95692`,
        params: '1=Name, 2=BookingID, 3=Date, 4=Time, 5=Address, 6=ItemsList',
      },
      {
        name: 'delivery_out_for_delivery',
        label: 'Items dispatched',
        badge: 'optional',
        message: `Dear {{1}},

Your items are out for delivery! 🚚

📦 *Delivery Details:*
• Booking ID: {{2}}
• Driver: {{3}}
• Contact: {{4}}
• ETA: {{5}}

Please keep your phone accessible.

📞 Contact: +91 97252 95692`,
        params: '1=Name, 2=BookingID, 3=DriverName, 4=DriverPhone, 5=ETA',
      },
      {
        name: 'delivery_completed',
        label: 'Items delivered',
        badge: 'essential',
        message: `Dear {{1}},

Your items have been delivered! ✅

📦 *Delivery Details:*
• Booking ID: {{2}}
• Delivered On: {{3}}
• Received By: {{4}}

📋 *Items Delivered:*
{{5}}

⚠️ *Return Date: {{6}}*

Please return items in the same condition.

📞 Contact: +91 97252 95692`,
        params: '1=Name, 2=BookingID, 3=DeliveryDate, 4=ReceivedBy, 5=Items, 6=ReturnDate',
      },
      {
        name: 'delivery_delayed',
        label: 'Delivery postponed',
        badge: 'important',
        message: `Dear {{1}},

⚠️ Your delivery has been delayed.

📦 *Details:*
• Booking ID: {{2}}
• Original Date: {{3}}
• New Date: {{4}}
• Reason: {{5}}

We apologize for the inconvenience.

📞 Contact: +91 97252 95692`,
        params: '1=Name, 2=BookingID, 3=OriginalDate, 4=NewDate, 5=Reason',
      },
      {
        name: 'delivery_failed',
        label: 'Delivery unsuccessful',
        badge: 'important',
        message: `Dear {{1}},

❌ Delivery attempt was unsuccessful.

📦 *Details:*
• Booking ID: {{2}}
• Date: {{3}}
• Reason: {{4}}

Please contact us to reschedule.

📞 Contact: +91 97252 95692`,
        params: '1=Name, 2=BookingID, 3=Date, 4=Reason',
      },
    ],
  },
  {
    title: '🔄 Return Templates (6)',
    icon: 'return',
    templates: [
      {
        name: 'return_reminder',
        label: 'Day before return',
        badge: 'essential',
        message: `Dear {{1}},

Reminder: Your items are due for return! 🔄

📋 *Return Details:*
• Booking ID: {{2}}
• Return Date: {{3}}
• Return Time: {{4}}

📦 *Items to Return:*
{{5}}

Please return items in good condition.
Late returns may incur additional charges.

📞 Contact: +91 97252 95692`,
        params: '1=Name, 2=BookingID, 3=Date, 4=Time, 5=Items',
      },
      {
        name: 'return_scheduled',
        label: 'Return pickup scheduled',
        badge: 'optional',
        message: `Dear {{1}},

Your return pickup has been scheduled! 📅

📦 *Pickup Details:*
• Booking ID: {{2}}
• Date: {{3}}
• Time: {{4}}
• Address: {{5}}

Please keep items ready for pickup.

📞 Contact: +91 97252 95692`,
        params: '1=Name, 2=BookingID, 3=Date, 4=Time, 5=Address',
      },
      {
        name: 'return_overdue',
        label: 'Items not returned',
        badge: 'important',
        message: `Dear {{1}},

⚠️ Your items are overdue for return!

📦 *Details:*
• Booking ID: {{2}}
• Due Date: {{3}}
• Days Overdue: {{4}}

📦 *Pending Items:*
{{5}}

Late fee: ₹{{6}} per day

Please return immediately to avoid additional charges.

📞 Contact: +91 97252 95692`,
        params: '1=Name, 2=BookingID, 3=DueDate, 4=DaysOverdue, 5=Items, 6=LateFee',
      },
      {
        name: 'return_completed',
        label: 'All items returned',
        badge: 'essential',
        message: `Dear {{1}},

All items have been returned! ✅

📦 *Return Details:*
• Booking ID: {{2}}
• Return Date: {{3}}
• Condition: {{4}}

💰 *Security Deposit:*
• Refund Amount: ₹{{5}}
• Refund Status: {{6}}

Thank you for choosing Safawala! 🙏

📞 Contact: +91 97252 95692`,
        params: '1=Name, 2=BookingID, 3=Date, 4=Condition, 5=RefundAmount, 6=RefundStatus',
      },
      {
        name: 'return_partial',
        label: 'Some items pending',
        badge: 'optional',
        message: `Dear {{1}},

⚠️ Partial return received.

📦 *Booking Details:*
• Booking ID: {{2}}
• Items Returned: {{3}}

📋 *Still Pending:*
{{4}}

Please return remaining items by {{5}}.

📞 Contact: +91 97252 95692`,
        params: '1=Name, 2=BookingID, 3=ReturnedCount, 4=PendingItems, 5=DueDate',
      },
      {
        name: 'return_damage_notice',
        label: 'Damage found',
        badge: 'important',
        message: `Dear {{1}},

⚠️ Damage found in returned items.

📦 *Details:*
• Booking ID: {{2}}
• Item: {{3}}
• Damage: {{4}}

💰 *Damage Charges:*
• Amount: ₹{{5}}
• Deducted from deposit: {{6}}

Please contact us for any clarification.

📞 Contact: +91 97252 95692`,
        params: '1=Name, 2=BookingID, 3=Item, 4=DamageDesc, 5=ChargeAmount, 6=Yes/No',
      },
    ],
  },
  {
    title: '📄 Invoice Templates (4)',
    icon: 'invoice',
    templates: [
      {
        name: 'invoice_generated',
        label: 'Invoice created',
        badge: 'optional',
        message: `Dear {{1}},

Your invoice has been generated! 📄

📄 *Invoice Details:*
• Invoice No: {{2}}
• Date: {{3}}
• Amount: ₹{{4}}
• Due Date: {{5}}

Invoice PDF will be shared separately.

📞 Contact: +91 97252 95692`,
        params: '1=Name, 2=InvoiceNo, 3=Date, 4=Amount, 5=DueDate',
      },
      {
        name: 'invoice_sent',
        label: 'Invoice shared',
        badge: 'essential',
        message: `Dear {{1}},

Please find your invoice attached. 📄

📄 *Invoice Details:*
• Invoice No: {{2}}
• Amount: ₹{{3}}
• Due Date: {{4}}

💳 *Payment Options:*
• UPI: safawala@paytm
• Bank Transfer Available

📞 Contact: +91 97252 95692`,
        params: '1=Name, 2=InvoiceNo, 3=Amount, 4=DueDate',
      },
      {
        name: 'invoice_payment_reminder',
        label: 'Invoice payment due',
        badge: 'optional',
        message: `Dear {{1}},

Reminder: Invoice payment is due! 💳

📄 *Invoice Details:*
• Invoice No: {{2}}
• Amount: ₹{{3}}
• Due Date: {{4}}
• Days Remaining: {{5}}

💳 UPI: safawala@paytm

📞 Contact: +91 97252 95692`,
        params: '1=Name, 2=InvoiceNo, 3=Amount, 4=DueDate, 5=DaysRemaining',
      },
      {
        name: 'invoice_paid',
        label: 'Invoice marked paid',
        badge: 'optional',
        message: `Dear {{1}},

Invoice payment received! ✅

📄 *Payment Details:*
• Invoice No: {{2}}
• Amount: ₹{{3}}
• Payment Date: {{4}}
• Status: PAID

Thank you for your payment!

📞 Contact: +91 97252 95692`,
        params: '1=Name, 2=InvoiceNo, 3=Amount, 4=PaymentDate',
      },
    ],
  },
  {
    title: '💬 Quote & Enquiry Templates (4)',
    icon: 'quote',
    templates: [
      {
        name: 'quote_generated',
        label: 'New quote created',
        badge: 'essential',
        message: `Dear {{1}},

Your quote is ready! 📋

💬 *Quote Details:*
• Quote ID: {{2}}
• Event Date: {{3}}
• Items: {{4}}
• Total: ₹{{5}}

Valid until: {{6}}

Reply to confirm your booking!

📞 Contact: +91 97252 95692`,
        params: '1=Name, 2=QuoteID, 3=EventDate, 4=Items, 5=Total, 6=ValidUntil',
      },
      {
        name: 'quote_followup',
        label: 'Follow-up after 2-3 days',
        badge: 'essential',
        message: `Dear {{1}},

Just following up on your quote! 📋

💬 *Quote Details:*
• Quote ID: {{2}}
• Event Date: {{3}}
• Total: ₹{{4}}

Have any questions? We're here to help!

Reply YES to confirm your booking.

📞 Contact: +91 97252 95692`,
        params: '1=Name, 2=QuoteID, 3=EventDate, 4=Total',
      },
      {
        name: 'quote_expiring',
        label: 'Quote about to expire',
        badge: 'optional',
        message: `Dear {{1}},

⚠️ Your quote is expiring soon!

💬 *Quote Details:*
• Quote ID: {{2}}
• Total: ₹{{3}}
• Expires: {{4}}

Don't miss out - confirm your booking today!

📞 Contact: +91 97252 95692`,
        params: '1=Name, 2=QuoteID, 3=Total, 4=ExpiryDate',
      },
      {
        name: 'quote_converted',
        label: 'Quote accepted',
        badge: 'optional',
        message: `Dear {{1}},

Great news! Your booking is confirmed! 🎉

💬 *From Quote:*
• Quote ID: {{2}}

📋 *New Booking:*
• Booking ID: {{3}}
• Event Date: {{4}}
• Total: ₹{{5}}

You'll receive booking confirmation shortly.

📞 Contact: +91 97252 95692`,
        params: '1=Name, 2=QuoteID, 3=BookingID, 4=EventDate, 5=Total',
      },
    ],
  },
  {
    title: '👤 Customer Engagement Templates (6)',
    icon: 'customer',
    templates: [
      {
        name: 'customer_welcome',
        label: 'New customer registered',
        badge: 'optional',
        message: `Dear {{1}},

Welcome to Safawala! 🙏

We're delighted to have you as our customer.

🎉 *What We Offer:*
• Premium Wedding Accessories
• Turbans, Safas & Pagdis
• Jewelry & Ornaments
• Complete Wedding Sets

Visit our store or browse online!

📞 Contact: +91 97252 95692`,
        params: '1=Name',
      },
      {
        name: 'customer_birthday',
        label: 'Birthday wishes',
        badge: 'optional',
        message: `Dear {{1}},

🎂 Happy Birthday! 🎉

Wishing you a wonderful birthday filled with joy and happiness!

🎁 *Special Birthday Offer:*
Get {{2}}% off on your next booking!
Use code: BDAY{{3}}

Valid until: {{4}}

📞 Contact: +91 97252 95692`,
        params: '1=Name, 2=DiscountPercent, 3=Year, 4=ValidDate',
      },
      {
        name: 'customer_anniversary',
        label: 'Anniversary wishes',
        badge: 'optional',
        message: `Dear {{1}},

💍 Happy Anniversary! 🎉

Wishing you a beautiful day celebrating your special bond!

Thank you for choosing Safawala for your special day.

📞 Contact: +91 97252 95692`,
        params: '1=Name',
      },
      {
        name: 'customer_feedback',
        label: 'After booking completion',
        badge: 'essential',
        message: `Dear {{1}},

Thank you for choosing Safawala! 🙏

We hope you had a wonderful experience.

📋 *Your Recent Booking:*
• Booking ID: {{2}}
• Event Date: {{3}}

We'd love to hear your feedback!
Please rate us: ⭐⭐⭐⭐⭐

Your feedback helps us serve you better.

📞 Contact: +91 97252 95692`,
        params: '1=Name, 2=BookingID, 3=EventDate',
      },
      {
        name: 'customer_thank_you',
        label: 'After transaction',
        badge: 'optional',
        message: `Dear {{1}},

Thank you for your business! 🙏

We truly appreciate your trust in Safawala.

Your satisfaction is our priority.
We look forward to serving you again!

📞 Contact: +91 97252 95692`,
        params: '1=Name',
      },
      {
        name: 'customer_referral',
        label: 'Request referrals',
        badge: 'optional',
        message: `Dear {{1}},

Know someone getting married? 💍

🎁 *Refer & Earn:*
Refer a friend and get ₹{{2}} off on your next booking!

Your friend also gets {{3}}% discount on their first booking.

Share our number: +91 97252 95692

Thank you for spreading the word! 🙏`,
        params: '1=Name, 2=ReferralBonus, 3=FriendDiscount',
      },
    ],
  },
  {
    title: '📢 Marketing Templates (4)',
    icon: 'marketing',
    templates: [
      {
        name: 'new_arrivals',
        label: 'New products added',
        badge: 'marketing',
        message: `Dear {{1}},

🆕 New Arrivals at Safawala!

Check out our latest collection:
{{2}}

🎉 *Launch Offer:*
{{3}}% off on new arrivals!

Visit us today!

📞 Contact: +91 97252 95692`,
        params: '1=Name, 2=ProductList, 3=DiscountPercent',
      },
      {
        name: 'seasonal_collection',
        label: 'Wedding season offers',
        badge: 'marketing',
        message: `Dear {{1}},

💒 Wedding Season Special!

Get ready for the season with our exclusive collection!

🎁 *Season Offers:*
• {{2}}% off on packages
• Free accessories worth ₹{{3}}
• Early booking bonus!

Valid until: {{4}}

Book now!

📞 Contact: +91 97252 95692`,
        params: '1=Name, 2=DiscountPercent, 3=FreeGiftValue, 4=ValidDate',
      },
      {
        name: 'special_discount',
        label: 'Special offers',
        badge: 'marketing',
        message: `Dear {{1}},

🎉 Special Offer Just For You!

💰 *Get {{2}}% OFF*
On your next booking!

Use code: {{3}}
Valid until: {{4}}

Don't miss this limited-time offer!

📞 Contact: +91 97252 95692`,
        params: '1=Name, 2=DiscountPercent, 3=CouponCode, 4=ValidDate',
      },
      {
        name: 'festive_wishes',
        label: 'Festival greetings',
        badge: 'marketing',
        message: `Dear {{1}},

🎊 {{2}} Mubarak!

Wishing you and your family a joyous celebration!

🎁 *Festive Special:*
{{3}}% off on all bookings this {{4}}!

Celebrate in style with Safawala!

📞 Contact: +91 97252 95692`,
        params: '1=Name, 2=FestivalName, 3=DiscountPercent, 4=FestivalName',
      },
    ],
  },
]
