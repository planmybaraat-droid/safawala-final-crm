import { supabaseServer } from "@/lib/supabase-server-simple"

async function addCityStateColumns() {
  try {
    console.log("Adding city and state columns to company_settings table...")
    
    // Add city column
    const { error: cityError } = await supabaseServer.rpc('exec_sql', {
      sql: `
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'company_settings' 
                AND column_name = 'city'
            ) THEN
                ALTER TABLE public.company_settings ADD COLUMN city TEXT;
                RAISE NOTICE 'Added city column to company_settings table';
            ELSE
                RAISE NOTICE 'City column already exists in company_settings table';
            END IF;
        END $$;
      `
    })

    if (cityError) {
      console.error("Error adding city column:", cityError)
    } else {
      console.log("City column added successfully")
    }

    // Add state column
    const { error: stateError } = await supabaseServer.rpc('exec_sql', {
      sql: `
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'company_settings' 
                AND column_name = 'state'
            ) THEN
                ALTER TABLE public.company_settings ADD COLUMN state TEXT;
                RAISE NOTICE 'Added state column to company_settings table';
            ELSE
                RAISE NOTICE 'State column already exists in company_settings table';
            END IF;
        END $$;
      `
    })

    if (stateError) {
      console.error("Error adding state column:", stateError)
    } else {
      console.log("State column added successfully")
    }

    console.log("Database schema update completed!")
    
  } catch (error) {
    console.error("Error updating database schema:", error)
  }
}

// Run the function
addCityStateColumns()