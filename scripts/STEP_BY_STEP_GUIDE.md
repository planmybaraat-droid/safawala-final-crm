# 📦 Step-by-Step Pricing Import Guide

## 🎯 Why Step-by-Step?

Running one big script can fail at any point and it's hard to debug. This approach:
- ✅ Easier to debug - see exactly where errors occur
- ✅ Can retry individual steps without redoing everything
- ✅ Clear verification at each stage
- ✅ Safer - won't create half-imported data

---

## 🚀 Import Process (5 Minutes)

### **STEP 1: Create Categories** 📁

**File:** `STEP_1_CREATE_CATEGORIES.sql`

**What it does:**
- Creates 9 categories (21, 31, 41, 51, 61, 71, 81, 91, 101 Safas)
- Safe to re-run (uses ON CONFLICT)

**Run in Supabase SQL Editor:**
```sql
-- Copy entire contents of STEP_1_CREATE_CATEGORIES.sql
-- Paste in SQL Editor
-- Click "Run"
```

**Expected Output:**
```
🚀 Creating categories...
✅ Created 9 categories successfully!
```

**Verification:**
You'll see a table with 9 rows showing all categories.

---

### **STEP 2: Create Variants** 📦

**File:** `STEP_2_CREATE_VARIANTS.sql`

**What it does:**
- Adds `extra_safa_price` and `missing_safa_penalty` columns
- Creates 3 sample variants for "21 Safas":
  - Classic Style (₹4,000)
  - Bollywood Styles (₹7,000)
  - Royal Heritage Special (₹12,000)

**Run in Supabase SQL Editor:**
```sql
-- Copy entire contents of STEP_2_CREATE_VARIANTS.sql
-- Paste in SQL Editor
-- Click "Run"
```

**Expected Output:**
```
🚀 Creating variants...
✅ Columns verified
Found category: 21 Safas (ID: ...)
  ✅ Created: Classic Style (₹4,000)
  ✅ Created: Bollywood Styles (₹7,000)
  ✅ Created: Royal Heritage Special (₹12,000)
✅ Successfully created 3 variants!
```

**Verification:**
You'll see a table with 3 rows showing all variants with their prices.

---

### **STEP 3: Create Levels** 📊

**File:** `STEP_3_CREATE_LEVELS.sql`

**What it does:**
- Creates 3 levels for each variant:
  - Premium (base price)
  - VIP (base + ₹500)
  - VVIP (base + ₹1,000)
- Total: 9 levels (3 variants × 3 levels)

**Run in Supabase SQL Editor:**
```sql
-- Copy entire contents of STEP_3_CREATE_LEVELS.sql
-- Paste in SQL Editor
-- Click "Run"
```

**Expected Output:**
```
🚀 Creating levels...
Creating levels for: Classic Style (Base: ₹4000)
  ✅ Created 3 levels for Classic Style
Creating levels for: Bollywood Styles (Base: ₹7000)
  ✅ Created 3 levels for Bollywood Styles
Creating levels for: Royal Heritage Special (Base: ₹12000)
  ✅ Created 3 levels for Royal Heritage Special
✅ Successfully created 9 levels total!
```

**Verification:**
You'll see a table showing all 9 levels with their prices:
- Classic Style: Premium ₹4,000, VIP ₹4,500, VVIP ₹5,000
- Bollywood Styles: Premium ₹7,000, VIP ₹7,500, VVIP ₹8,000
- Royal Heritage: Premium ₹12,000, VIP ₹12,500, VVIP ₹13,000

---

### **STEP 4: Create Distance Pricing** 🚗

**File:** `STEP_4_CREATE_DISTANCE_PRICING.sql`

**What it does:**
- Creates 5 distance tiers for each level:
  - 0-10 km: +₹500
  - 11-50 km: +₹1,000
  - 51-250 km: +₹2,000
  - 251-500 km: +₹3,000
  - 501-2000 km: +₹5,000
- Total: 45 distance pricing records (9 levels × 5 tiers)

**Run in Supabase SQL Editor:**
```sql
-- Copy entire contents of STEP_4_CREATE_DISTANCE_PRICING.sql
-- Paste in SQL Editor
-- Click "Run"
```

**Expected Output:**
```
🚀 Creating distance pricing...
Creating distance pricing for: Classic Style - Premium
  ✅ Created 5 distance tiers
Creating distance pricing for: Classic Style - VIP
  ✅ Created 5 distance tiers
... (for all 9 levels)
✅ Successfully created 45 distance pricing tiers total!
```

**Verification:**
You'll see:
1. Summary table showing each level has 5 distance tiers
2. Detailed table showing first 20 distance pricing records

---

## ✅ Final Verification

After completing all 4 steps, run this query:

```sql
SELECT 
  c.name as category,
  v.name as variant,
  v.base_price as "Base Price",
  v.extra_safa_price as "Extra Safa",
  v.missing_safa_penalty as "Missing Penalty",
  l.name as level,
  l.base_price as "Level Price",
  COUNT(d.id) as "Distance Tiers"
FROM packages_categories c
JOIN package_variants v ON c.id = v.category_id
JOIN package_levels l ON v.id = l.variant_id
LEFT JOIN distance_pricing d ON l.id = d.package_level_id
WHERE c.franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
GROUP BY c.name, v.name, v.base_price, v.extra_safa_price, v.missing_safa_penalty, l.name, l.base_price
ORDER BY c.name, v.base_price, l.base_price;
```

**Expected Result:**
- 9 rows total (3 variants × 3 levels)
- Each row shows 5 distance tiers
- All prices correctly displayed

---

## 🧹 Clean Up (If Needed)

If you need to start over, run this to delete all data:

```sql
-- Delete in reverse order (due to foreign keys)
DELETE FROM distance_pricing 
WHERE package_level_id IN (
  SELECT l.id FROM package_levels l
  JOIN package_variants v ON l.variant_id = v.id
  JOIN packages_categories c ON v.category_id = c.id
  WHERE c.franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
);

DELETE FROM package_levels 
WHERE variant_id IN (
  SELECT v.id FROM package_variants v
  JOIN packages_categories c ON v.category_id = c.id
  WHERE c.franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
);

DELETE FROM package_variants 
WHERE category_id IN (
  SELECT id FROM packages_categories 
  WHERE franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
);

DELETE FROM packages_categories 
WHERE franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99';
```

---

## 📊 What You'll Get

After completing all steps:

- **9 Categories:** 21, 31, 41, 51, 61, 71, 81, 91, 101 Safas
- **3 Variants:** Classic Style, Bollywood Styles, Royal Heritage Special
- **9 Levels:** 3 levels per variant (Premium, VIP, VVIP)
- **45 Distance Tiers:** 5 distance ranges per level

**Total:** 66 database records created

---

## 🎉 Test in UI

1. Navigate to `/sets` page
2. You should see **9 categories** in the left panel
3. Click "21 Safas"
4. You should see **3 variants**
5. Click any variant
6. You should see **3 levels** (Premium, VIP, VVIP)
7. Click any level
8. You should see **5 distance pricing tiers**

---

## 🐛 Troubleshooting

### "Category not found" error in Step 2
**Solution:** Run Step 1 first

### "No variants found" in Step 3
**Solution:** Run Step 2 first

### "No levels found" in Step 4
**Solution:** Run Step 3 first

### Duplicate key errors
**Solution:** Data already exists. Either:
- Skip that step (data is already there)
- Run cleanup script and start over

### Column doesn't exist errors
**Solution:** Run Step 2 - it adds the missing columns automatically

---

## 📝 Notes

- Each step is **idempotent** where possible (safe to re-run)
- Steps **must be run in order** (1 → 2 → 3 → 4)
- Each step includes **verification queries** to confirm success
- All data is **franchise-isolated** (only visible to Surat Branch)

---

**Need help?** Check the error message and refer to the troubleshooting section above.
