-- Insert or update terms & conditions for Vadodara Branch
INSERT INTO public.document_settings (
  franchise_id,
  invoice_number_format,
  quote_number_format,
  default_payment_terms,
  default_tax_rate,
  show_gst_breakdown,
  default_terms_conditions
)
VALUES (
  '1a518dde-85b7-44ef-8bc4-092f53ddfd99',
  'INV-{YYYY}-{0001}',
  'QTE-{YYYY}-{0001}',
  'Net 30',
  18.00,
  TRUE,
  'TERMS & CONDITIONS:

1. Sold products will not be returned or exchanged.
2. Please book the Safa Wale service at least 1 month in advance.
3. We will not allow any last-minute changes in placed orders.
4. Your responsibility shall remain to tie the turban at the venue before the wedding date.
5. Total outstanding with Security Deposit needs to be paid before the wedding date.
6. If safa is lost / torn / burnt, it is mandatory to pay ₹400 / ₹600 / ₹800 per safa by the party.
7. Our staff team will not ask guests to return safas (as per company reputation & policies).
8. All safas will be collected by the next day. Otherwise, extra rent will be charged and claimed from the given Security Deposit amount.
9. Safawala''s service will be a maximum of 5 hours only. Overtime charges of ₹1500 per hour will be the responsibility of the party to wear the safa on time.
10. We assure you of providing 1-hour service in the local city, and our outstation services are just 4 hours only till 9:30 pm. In case of late overtime, charges will be deducted from the Security Deposit.
11. I hereby declare that all the above products are selected and checked by me.
12. Subject to Vadodara jurisdiction.'
)
ON CONFLICT (franchise_id) DO UPDATE SET
  default_payment_terms = 'Net 30',
  default_tax_rate = 18.00,
  show_gst_breakdown = TRUE,
  default_terms_conditions = 'TERMS & CONDITIONS:

1. Sold products will not be returned or exchanged.
2. Please book the Safa Wale service at least 1 month in advance.
3. We will not allow any last-minute changes in placed orders.
4. Your responsibility shall remain to tie the turban at the venue before the wedding date.
5. Total outstanding with Security Deposit needs to be paid before the wedding date.
6. If safa is lost / torn / burnt, it is mandatory to pay ₹400 / ₹600 / ₹800 per safa by the party.
7. Our staff team will not ask guests to return safas (as per company reputation & policies).
8. All safas will be collected by the next day. Otherwise, extra rent will be charged and claimed from the given Security Deposit amount.
9. Safawala''s service will be a maximum of 5 hours only. Overtime charges of ₹1500 per hour will be the responsibility of the party to wear the safa on time.
10. We assure you of providing 1-hour service in the local city, and our outstation services are just 4 hours only till 9:30 pm. In case of late overtime, charges will be deducted from the Security Deposit.
11. I hereby declare that all the above products are selected and checked by me.
12. Subject to Vadodara jurisdiction.',
  updated_at = NOW();
