# 📦 Pricing Data Import Scripts

## 🎯 What You Get

3 SQL scripts ready to run in Supabase SQL Editor:

1. **`IMPORT_SAMPLE_DATA.sql`** ⭐ **START HERE**
   - Quick test import
   - Creates 9 categories + 5 sample variants
   - Verifies everything works
   - **Run time:** ~5 seconds

2. **`import-21-safas-complete.sql`** 
   - Complete import for "21 Safas" category
   - All 10 variants × 3 levels × 5 distance tiers
   - 150 total pricing records
   - **Run time:** ~30 seconds

3. **`import-complete-pricing-data.sql`**
   - Full production import (in progress)
   - All 9 categories complete
   - 270 variants total

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Add Database Columns

```sql
-- Run this FIRST in Supabase SQL Editor
ALTER TABLE package_variants 
ADD COLUMN IF NOT EXISTS extra_safa_price NUMERIC(10,2) DEFAULT 0;

ALTER TABLE package_variants 
ADD COLUMN IF NOT EXISTS missing_safa_penalty NUMERIC(10,2) DEFAULT 0;

-- Note: package_id is required (NOT NULL constraint)
-- Scripts automatically set package_id = category_id for compatibility
```

### Step 2: Import Sample Data

```sql
-- Open scripts/IMPORT_SAMPLE_DATA.sql
-- Copy entire content
-- Paste in Supabase SQL Editor
-- Click "Run"
```

### Step 3: Verify Import

You should see in the output:
```
✅ Columns verified/added
✅ Created 9 categories
  ✅ Classic Style: ₹4,000-5,000 (Extra: ₹100, Missing: ₹450)
  ✅ Bollywood Styles: ₹7,000-8,000 (Extra: ₹200, Missing: ₹650)
  ✅ Royal Heritage Special: ₹12,000-13,000 (Extra: ₹450, Missing: ₹1,150)
  ✅ 31 Safas - Classic Style: ₹5,000-6,000
  ✅ 41 Safas - Classic Style: ₹6,000-7,000
✅ IMPORT COMPLETE!
```

At the bottom you'll see a table showing all imported data.

### Step 4: Test in UI

1. Go to `/sets` page
2. You should see **9 categories** in the left panel
3. Click "21 Safas"
4. You should see **3 variants**:
   - Classic Style (₹4,000)
   - Bollywood Styles (₹7,000)
   - Royal Heritage Special (₹12,000)
5. Click any variant to see **3 levels** (Premium, VIP, VVIP)
6. Each level should have **5 distance pricing tiers**

---

## 📊 What Gets Imported

### Sample Data Script

| Category | Variants | Levels | Distance Tiers | Total Records |
|----------|----------|--------|----------------|---------------|
| 21 Safas | 3 | 9 | 45 | 57 |
| 31 Safas | 1 | 3 | 15 | 19 |
| 41 Safas | 1 | 3 | 15 | 19 |
| **Total** | **5** | **15** | **75** | **95** |

### Complete Data (All Scripts)

| Category | Variants | Levels | Distance Tiers | Total Records |
|----------|----------|--------|----------------|---------------|
| 21 Safas | 10 | 30 | 150 | 191 |
| 31 Safas | 10 | 30 | 150 | 191 |
| 41 Safas | 10 | 30 | 150 | 191 |
| 51 Safas | 10 | 30 | 150 | 191 |
| 61 Safas | 10 | 30 | 150 | 191 |
| 71 Safas | 10 | 30 | 150 | 191 |
| 81 Safas | 10 | 30 | 150 | 191 |
| 91 Safas | 10 | 30 | 150 | 191 |
| 101 Safas | 10 | 30 | 150 | 191 |
| **Total** | **90** | **270** | **1,350** | **1,719** |

---

## 💰 Pricing Structure

### 10 Variant Types (for each category)

| # | Variant Name | Extra Safa | Missing Penalty | Base Price (21 Safas) |
|---|--------------|------------|-----------------|----------------------|
| 1 | Classic Style | ₹100 | ₹450 | ₹4,000 - ₹5,000 |
| 2 | Rajputana Rajwada | ₹120 | ₹500 | ₹5,000 - ₹6,000 |
| 3 | Floral Design | ₹150 | ₹550 | ₹6,000 - ₹7,000 |
| 4 | Bollywood Styles | ₹200 | ₹650 | ₹7,000 - ₹8,000 |
| 5 | Adani's Wedding | ₹250 | ₹700 | ₹8,000 - ₹9,000 |
| 6 | Ram–Sita Shades | ₹300 | ₹750 | ₹9,000 - ₹10,000 |
| 7 | JJ Valaya Silk | ₹350 | ₹950 | ₹10,000 - ₹11,000 |
| 8 | Tissue Silk Premium | ₹400 | ₹1,050 | ₹11,000 - ₹12,000 |
| 9 | Royal Heritage | ₹450 | ₹1,150 | ₹12,000 - ₹13,000 |
| 10 | Groom Maharaja | ₹500 | ₹1,200 | ₹13,000 - ₹14,000 |

### 3 Levels (for each variant)

- **Premium** - Standard quality, base price
- **VIP** - Premium quality, +₹500
- **VVIP** - Luxury quality, +₹1,000

### 5 Distance Tiers (for each level)

| Range | Price |
|-------|-------|
| 0-10 km | ₹500 |
| 11-50 km | ₹1,000 |
| 51-250 km | ₹2,000 |
| 251-500 km | ₹3,000 |
| 501-2000 km | ₹5,000 |

---

## 🔧 Troubleshooting

### Error: "duplicate key value violates unique constraint"

**Solution:** Categories already exist. This is OK! The script uses `ON CONFLICT` to update existing ones.

### Error: "column does not exist"

**Solution:** Run Step 1 again (add columns script).

### Not seeing data in UI?

**Solution:** 
1. Check franchise_id in script matches your actual franchise ID
2. Hard refresh page (Cmd+Shift+R on Mac)
3. Check browser console for errors

### Want to clear and start over?

```sql
-- Delete all pricing data for your franchise
DELETE FROM distance_pricing WHERE level_id IN (
  SELECT l.id FROM package_levels l
  JOIN package_variants v ON l.variant_id = v.id
  JOIN packages_categories c ON v.category_id = c.id
  WHERE c.franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
);

DELETE FROM package_levels WHERE variant_id IN (
  SELECT v.id FROM package_variants v
  JOIN packages_categories c ON v.category_id = c.id
  WHERE c.franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
);

DELETE FROM package_variants WHERE category_id IN (
  SELECT id FROM packages_categories 
  WHERE franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
);

DELETE FROM packages_categories 
WHERE franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99';
```

---

## ✅ Success Checklist

- [  ] Columns added to `package_variants` table
- [  ] Sample data script runs without errors
- [  ] 9 categories visible in UI
- [  ] Can view variants for each category
- [  ] Each variant shows 3 levels
- [  ] Each level has 5 distance tiers
- [  ] Extra safa price shows in variant form
- [  ] Missing safa penalty shows in variant form
- [  ] Can create new variants with pricing fields
- [  ] Can edit existing variants

---

## 📝 Next Steps

Once sample import works:

1. **Option A: Manual Entry**
   - Use the UI to add remaining variants manually
   - Reference the pricing table above
   - Good for gradual rollout

2. **Option B: Complete Import**
   - Run `import-21-safas-complete.sql` for full 21 Safas data
   - Repeat pattern for other categories
   - Good for bulk import

3. **Option C: Node.js Script**
   - Use `scripts/import-all-safa-pricing.js`
   - Imports everything programmatically
   - Requires Node.js and dependencies

---

## 🆘 Need Help?

Check these files:
- `EXTRA_SAFA_IMPLEMENTATION.md` - Frontend implementation guide
- `IMPORT_GUIDE.md` - Detailed import instructions
- `scripts/add-extra-safa-columns.sql` - Column migration only

**Quick Verification Query:**

```sql
SELECT 
  c.name,
  COUNT(DISTINCT v.id) as variants,
  COUNT(DISTINCT l.id) as levels,
  COUNT(d.id) as distance_tiers
FROM packages_categories c
LEFT JOIN package_variants v ON c.id = v.category_id
LEFT JOIN package_levels l ON v.id = l.variant_id  
LEFT JOIN distance_pricing d ON l.id = d.level_id
WHERE c.franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
GROUP BY c.name
ORDER BY c.name;
```

This shows how many variants, levels, and distance tiers exist for each category.
