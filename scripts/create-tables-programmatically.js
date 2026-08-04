import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function createPackageManagementTables() {
  console.log("[v0] Starting database table creation...")

  try {
    // Create categories table
    console.log("[v0] Creating categories table...")
    const { error: categoriesError } = await supabase.rpc("exec_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS categories (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL UNIQUE,
          description TEXT,
          display_order INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);
        CREATE INDEX IF NOT EXISTS idx_categories_order ON categories(display_order);
      `,
    })

    if (categoriesError) throw categoriesError
    console.log("[v0] Categories table created successfully")

    // Create packages table
    console.log("[v0] Creating packages table...")
    const { error: packagesError } = await supabase.rpc("exec_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS packages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
          name VARCHAR(200) NOT NULL,
          description TEXT,
          base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
          display_order INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_packages_category ON packages(category_id);
        CREATE INDEX IF NOT EXISTS idx_packages_active ON packages(is_active);
        CREATE INDEX IF NOT EXISTS idx_packages_order ON packages(display_order);
      `,
    })

    if (packagesError) throw packagesError
    console.log("[v0] Packages table created successfully")

    // Create package_variants table
    console.log("[v0] Creating package_variants table...")
    const { error: variantsError } = await supabase.rpc("exec_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS package_variants (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
          name VARCHAR(200) NOT NULL,
          description TEXT,
          base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
          inclusions TEXT[],
          display_order INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_variants_package ON package_variants(package_id);
        CREATE INDEX IF NOT EXISTS idx_variants_active ON package_variants(is_active);
        CREATE INDEX IF NOT EXISTS idx_variants_order ON package_variants(display_order);
      `,
    })

    if (variantsError) throw variantsError
    console.log("[v0] Package variants table created successfully")

    // Create distance_pricing table
    console.log("[v0] Creating distance_pricing table...")
    const { error: distanceError } = await supabase.rpc("exec_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS distance_pricing (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          variant_id UUID NOT NULL REFERENCES package_variants(id) ON DELETE CASCADE,
          distance_range VARCHAR(50) NOT NULL,
          min_km INTEGER NOT NULL,
          max_km INTEGER NOT NULL,
          base_price_addition DECIMAL(10,2) NOT NULL DEFAULT 0,
          display_order INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_distance_variant ON distance_pricing(variant_id);
        CREATE INDEX IF NOT EXISTS idx_distance_active ON distance_pricing(is_active);
        CREATE INDEX IF NOT EXISTS idx_distance_range ON distance_pricing(min_km, max_km);
      `,
    })

    if (distanceError) throw distanceError
    console.log("[v0] Distance pricing table created successfully")

    // Insert sample data
    console.log("[v0] Inserting sample data...")

    // Insert categories
    const { data: categoryData, error: categoryInsertError } = await supabase
      .from("categories")
      .insert([
        { name: "21 Safas", description: "Traditional 21 safa packages", display_order: 1 },
        { name: "31 Safas", description: "Premium 31 safa packages", display_order: 2 },
        { name: "51 Safas", description: "Luxury 51 safa packages", display_order: 3 },
      ])
      .select()

    if (categoryInsertError) throw categoryInsertError
    console.log("[v0] Sample categories inserted successfully")

    // Insert sample packages for first category
    if (categoryData && categoryData.length > 0) {
      const { data: packageData, error: packageInsertError } = await supabase
        .from("packages")
        .insert([
          {
            category_id: categoryData[0].id,
            name: "Basic Wedding Package",
            description: "Essential wedding safa package",
            base_price: 15000,
            display_order: 1,
          },
          {
            category_id: categoryData[0].id,
            name: "Premium Wedding Package",
            description: "Premium wedding safa package with extras",
            base_price: 25000,
            display_order: 2,
          },
        ])
        .select()

      if (packageInsertError) throw packageInsertError
      console.log("[v0] Sample packages inserted successfully")

      // Insert sample variants for first package
      if (packageData && packageData.length > 0) {
        const { data: variantData, error: variantInsertError } = await supabase
          .from("package_variants")
          .insert([
            {
              package_id: packageData[0].id,
              name: "Standard Variant",
              description: "Standard wedding variant",
              base_price: 15000,
              inclusions: ["Basic decoration", "Standard safas", "Basic setup"],
              display_order: 1,
            },
          ])
          .select()

        if (variantInsertError) throw variantInsertError
        console.log("[v0] Sample variants inserted successfully")

        // Insert distance pricing for first variant
        if (variantData && variantData.length > 0) {
          const { error: distancePricingError } = await supabase.from("distance_pricing").insert([
            {
              variant_id: variantData[0].id,
              distance_range: "0-10 km",
              min_km: 0,
              max_km: 10,
              base_price_addition: 0,
              display_order: 1,
            },
            {
              variant_id: variantData[0].id,
              distance_range: "11-25 km",
              min_km: 11,
              max_km: 25,
              base_price_addition: 2000,
              display_order: 2,
            },
            {
              variant_id: variantData[0].id,
              distance_range: "26-150 km",
              min_km: 26,
              max_km: 150,
              base_price_addition: 5000,
              display_order: 3,
            },
            {
              variant_id: variantData[0].id,
              distance_range: "151-300 km",
              min_km: 151,
              max_km: 300,
              base_price_addition: 10000,
              display_order: 4,
            },
            {
              variant_id: variantData[0].id,
              distance_range: "300+ km",
              min_km: 300,
              max_km: 1500,
              base_price_addition: 20000,
              display_order: 5,
            },
          ])

          if (distancePricingError) throw distancePricingError
          console.log("[v0] Sample distance pricing inserted successfully")
        }
      }
    }

    console.log("[v0] Database setup completed successfully!")
    return { success: true, message: "All tables created and sample data inserted successfully" }
  } catch (error) {
    console.error("[v0] Error creating tables:", error)
    return { success: false, error: error.message }
  }
}

// Execute the function
createPackageManagementTables()
  .then((result) => {
    console.log("[v0] Final result:", result)
  })
  .catch((error) => {
    console.error("[v0] Script execution failed:", error)
  })
