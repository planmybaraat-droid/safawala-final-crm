#!/bin/bash

# Move products from wrong franchise to correct one

CORRECT_FRANCHISE_ID="1a518dde-85b7-44ef-8bc4-092f53ddfd99"
WRONG_FRANCHISE_ID="5322e8d9-d4d8-4c48-8563-c9785c1cffd0"

# Load env
export $(grep -v '^#' /Applications/safawala-crm/.env.local | xargs)

echo "🔄 Moving Safa products from wrong franchise to correct one..."
echo "From: $WRONG_FRANCHISE_ID"
echo "To: $CORRECT_FRANCHISE_ID"

PRODUCTS=$(cat <<'EOF'
[
  {"name": "SW1001 - Tiger Leheriya", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW1002 - Yellow Leheriya", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW1003 - Red Leheriya", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW1004 - Orange Leheriya", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW1007 - Rani Bandhani", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW1010 - Pink Bandhani", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW1012 - Red Bandhani", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW2001 - Red Rajwadi", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW2002 - Maroon Rajwadi", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW2003 - Pink Rajwadi", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW2004 - Peach Rajwadi", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW2006 - C-Green Rajwadi", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW2007 - Rani/Wine Rajwadi", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW2009 - Light Golden Rajwadi", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW2010 - Dark Golden Rajwadi", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW3001 - Jodhpuri Floral Off-White", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW3002 - Jodhpuri Pachrangi Bandhani", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW3003 - Pachrangi Modi Bandhani", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW3004 - Pachrangi Plain", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW3005 - Anant Ambani Red", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW3006 - Chunadi", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW3007 - Anant Ambani Rani", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW4001 - Peach Keri", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW4002 - Red Keri", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW4003 - Pista Keri", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW4004 - Sky Blue Keri", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW4005 - Golden Keri", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW4006 - Baby Pink Keri", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW4007 - Chanderi Multi", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW4008 - Maroon Keri", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW5001 - Pista Chanderi Leheriya", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW5002 - Off-White Chanderi Leheriya", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW5004 - Golden Chanderi Leheriya", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW5008 - Pink Chanderi Leheriya", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW5011 - Peach Chanderi Leheriya", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW5003 - Sabyasachi C-Green", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW5007 - Brown Sabyasachi", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW5009 - Peach Sabyasachi", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW5012 - Mehndi Sabyasachi", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW5005 - Peach Patola", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW5006 - White Patola", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW6001 - Peach Pista Multi", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW6002 - Ambani Plain", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW6003 - Pink Multi", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW6005 - Orange Multi", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW6006 - Rani Multi", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW7001 - Adani Golden", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW7002 - Adani Blue", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW7003 - Adani Pista", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW7004 - Adani Peach", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW7005 - Royal Ambani Blue", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW7006 - Royal Ambani Pink", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW7008 - Royal Ambani Coffee", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW7009 - Royal Ambani", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW8001 - J.J. Valaya Pink", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW8002 - Golden J.J. Valaya", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW8003 - J.J. Valaya Grey", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW8004 - Off-White J.J. Valaya", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW8005 - Green J.J. Valaya", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW8006 - Red J.J. Valaya", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW8007 - Maroon J.J. Valaya", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW8008 - Peach J.J. Valaya", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW9001 - Silver Tissue", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW9002 - Peach Tissue", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW9003 - Green Tissue", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW9004 - Golden Tissue", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100},
  {"name": "SW9005 - Onion Pink Tissue", "rental_price": 100, "sale_price": 100, "security_deposit": 50, "stock_available": 100}
]
EOF
)

# First delete from wrong franchise
echo "🗑️  Deleting products from wrong franchise..."
curl -s -X POST http://localhost:3000/api/delete-franchise-products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -d "{\"franchiseId\": \"$WRONG_FRANCHISE_ID\"}" | grep -o '"deleted":[0-9]*'

# Then insert to correct franchise
echo ""
echo "✅ Inserting products to correct franchise..."
curl -s -X POST http://localhost:3000/api/products/bulk-insert \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -d "{
    \"products\": $PRODUCTS,
    \"franchiseId\": \"$CORRECT_FRANCHISE_ID\",
    \"categoryName\": \"Safa\"
  }" | grep -o '"count":[0-9]*'

echo ""
echo "✅ Done! Products moved to correct franchise."
