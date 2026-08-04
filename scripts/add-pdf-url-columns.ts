import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.join(__dirname, '../.env.local') })

import { supabaseServer } from "../lib/supabase-server-simple"

async function run() {
  console.log("Adding pdf_url columns to product_orders, package_bookings, direct_sales_orders, and bookings...")

  const { data, error } = await supabaseServer.rpc('exec_sql', {
    sql_query: `
      DO $$
      BEGIN
          -- product_orders
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'product_orders' 
              AND column_name = 'pdf_url'
          ) THEN
              ALTER TABLE public.product_orders ADD COLUMN pdf_url TEXT;
              RAISE NOTICE 'Added pdf_url column to product_orders table';
          END IF;

          -- package_bookings
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'package_bookings' 
              AND column_name = 'pdf_url'
          ) THEN
              ALTER TABLE public.package_bookings ADD COLUMN pdf_url TEXT;
              RAISE NOTICE 'Added pdf_url column to package_bookings table';
          END IF;

          -- direct_sales_orders
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'direct_sales_orders' 
              AND column_name = 'pdf_url'
          ) THEN
              ALTER TABLE public.direct_sales_orders ADD COLUMN pdf_url TEXT;
              RAISE NOTICE 'Added pdf_url column to direct_sales_orders table';
          END IF;

          -- bookings
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'bookings' 
              AND column_name = 'pdf_url'
          ) THEN
              ALTER TABLE public.bookings ADD COLUMN pdf_url TEXT;
              RAISE NOTICE 'Added pdf_url column to bookings table';
          END IF;
      END $$;
    `
  })

  if (error) {
    console.error("Error running migration:", error)
  } else {
    console.log("Migration executed successfully:", data)
  }
}

run()
