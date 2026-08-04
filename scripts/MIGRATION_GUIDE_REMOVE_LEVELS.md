# Migration Guide: Remove Package Levels

## Overview
Simplifying the package structure from:
- **OLD**: Categories → Variants → Levels → Distance Pricing
- **NEW**: Categories → Variants → Distance Pricing

## Database Changes

### 1. Run Migration SQL
Execute in this order:
```bash
# First, migrate existing data and remove levels table
psql $DATABASE_URL -f scripts/REMOVE_LEVELS_SIMPLIFY_STRUCTURE.sql

# Then, create distance pricing for all variants (4 tiers each)
psql $DATABASE_URL -f scripts/STEP_4_CREATE_DISTANCE_PRICING_FOR_VARIANTS.sql
```

### 2. What the Migration Does

**REMOVE_LEVELS_SIMPLIFY_STRUCTURE.sql:**
- Adds `package_variant_id` column to `distance_pricing`
- Migrates all existing distance pricing from levels to variants
- Drops `package_level_id` column from `distance_pricing`
- Drops `package_levels` table completely
- Creates indexes for performance

**STEP_4_CREATE_DISTANCE_PRICING_FOR_VARIANTS.sql:**
- Creates 4 distance tiers for each active variant
- Tiers: 0-10km (+₹500), 11-50km (+₹1,000), 51-250km (+₹2,000), 251-1500km (+₹3,000)
- Expected: ~90 variants × 4 tiers = 360 distance pricing records

## Frontend Changes

### Types Updated (`sets-client.tsx`)
```typescript
// REMOVED: PackageLevel interface
interface PackageLevel { ... }

// UPDATED: PackageVariant no longer has package_levels
interface PackageVariant {
  id: string
  name: string
  description: string
  base_price: number
  extra_safa_price?: number
  missing_safa_penalty?: number
  inclusions?: string[]
  distance_pricing?: DistancePricing[]  // NEW: Direct relationship
  is_active: boolean
}

// UPDATED: DistancePricing now references variant
interface DistancePricing {
  id: string
  package_variant_id: string  // NEW: Direct reference
  distance_range: string
  min_distance_km: number
  max_distance_km: number
  additional_price: number
  is_active: boolean
}
```

### UI Changes

**Tabs Simplified:**
- OLD: Categories | Variants | Levels | Distance Pricing
- NEW: Categories | Variants | Distance Pricing

**Data Fetching:**
```typescript
// OLD query (3 levels deep)
.select(`
  *,
  package_variants (
    *,
    package_levels (
      *,
      distance_pricing (*)
    )
  )
`)

// NEW query (2 levels deep)
.select(`
  *,
  package_variants (
    *,
    distance_pricing (*)
  )
`)
```

**Stats Display:**
- OLD: "9 Categories, 90 Variants, 270 Levels, 1080 Distance Tiers"
- NEW: "9 Categories, 90 Variants, 360 Distance Tiers"

### Components Removed
1. **Levels Tab** - Entire tab removed
2. **Create/Edit Level Dialog** - No longer needed
3. **Level management functions**:
   - `handleCreateLevel()`
   - `handleDeleteLevel()`
   - `setLevelForm()`
   - `editingLevel` state
   - `selectedLevel` state

### Components Modified
1. **Variants View**:
   - Removed "X level(s)" badge
   - Added "X distance tiers" badge
   - "View Levels" button → "Distance Pricing" button (direct to pricing tab)

2. **Distance Pricing Tab**:
   - Selection flow: Category → Variant (no level selection)
   - Shows all 4 distance tiers for selected variant
   - Direct create/edit/delete on variant's pricing

3. **Stats Summary**:
   - Removed level count
   - Shows total distance tiers directly

## API Changes

### Distance Pricing API (`/api/distance-pricing/save`)
```typescript
// OLD body
{
  package_level_id: "uuid",
  distance_range: "0-10 km",
  ...
}

// NEW body
{
  package_variant_id: "uuid",  // Changed from package_level_id
  distance_range: "0-10 km",
  ...
}
```

## Testing Checklist

- [ ] Run migration SQL successfully
- [ ] Verify distance_pricing table has package_variant_id
- [ ] Verify package_levels table is dropped
- [ ] View categories in UI
- [ ] View variants under each category
- [ ] View distance pricing for each variant (should show 4 tiers)
- [ ] Create new distance pricing tier for a variant
- [ ] Edit existing distance pricing tier
- [ ] Delete distance pricing tier
- [ ] Verify stats show correct counts (no levels)
- [ ] Test variant creation (should auto-create 4 distance tiers)
- [ ] Check browser console for no errors

## Rollback Plan

If needed, restore levels structure:
```sql
-- Recreate package_levels table
CREATE TABLE package_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID REFERENCES package_variants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  base_price DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add package_level_id back to distance_pricing
ALTER TABLE distance_pricing 
ADD COLUMN package_level_id UUID REFERENCES package_levels(id) ON DELETE CASCADE;

-- Restore old frontend code from git
git checkout HEAD~1 -- app/sets/sets-client.tsx
```

## Benefits of This Change

1. **Simpler Data Model**: 3 levels instead of 4
2. **Fewer DB Queries**: One less join in data fetching
3. **Easier to Understand**: Direct category → variant → pricing flow
4. **Better Performance**: Fewer tables to query, smaller data size
5. **Simpler UI**: One less tab, clearer navigation
6. **Easier Maintenance**: Less code to maintain and debug
