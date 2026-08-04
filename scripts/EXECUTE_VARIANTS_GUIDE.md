# Execute CREATE_ALL_VARIANTS.sql in Supabase

## Current Status
- ❌ Categories: 9 (showing correctly)
- ❌ Variants: 0 active (145 soft-deleted)
- ❌ Need to insert: 81 new variants

## Steps to Execute:

### 1. Open Supabase SQL Editor
1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/xplnyaxkusvuvbrhuaoi
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**

### 2. Copy and Execute the SQL
1. Open the file: `/Applications/safawala-crm/scripts/CREATE_ALL_VARIANTS.sql`
2. Copy the **entire contents** of the file
3. Paste into the Supabase SQL Editor
4. Click **Run** button (or press Cmd+Enter)

### 3. Verify the Results
After execution, you should see in the Results panel:
```
Query executed successfully
Rows affected: 81
```

The verification query at the end will show:
```
21 Safas  | 9 variants
31 Safas  | 9 variants
41 Safas  | 9 variants
51 Safas  | 9 variants
61 Safas  | 9 variants
71 Safas  | 9 variants
81 Safas  | 9 variants
91 Safas  | 9 variants
101 Safas | 9 variants
```

### 4. Refresh Your App
1. Go back to: http://localhost:3000/sets/categories
2. Refresh the page (Cmd+R)
3. You should now see **"9 variants"** under each category instead of "0 variants"

## What This Script Does:
- Inserts 81 new variants (9 packages per category)
- Package 1-9 for each category with correct pricing
- All variants set to `is_active = true`
- All linked to franchise_id: `1a518dde-85b7-44ef-8bc4-092f53ddfd99`

## Next Steps After Success:
1. ✅ Verify 81 variants showing in categories page
2. ✅ Execute `RESET_DISTANCE_PRICING.sql` (creates 324 distance tiers)
3. ✅ Test booking page at http://localhost:3000/book-package
