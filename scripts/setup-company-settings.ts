import { neon } from '@neondatabase/serverless'

async function main() {
  const connectionString = process.env.POSTGRES_URL
  if (!connectionString) {
    console.error('POSTGRES_URL is not configured in the environment.')
    process.exit(1)
  }

  const sql = neon(connectionString)

  console.log('Ensuring extensions...')
  await sql(`create extension if not exists "uuid-ossp";`)
  await sql(`create extension if not exists "pgcrypto";`)

  console.log('Creating table if not exists...')
  await sql(`
    create table if not exists public.company_settings (
      id uuid primary key default gen_random_uuid(),
      company_name text not null,
      email text,
      phone text,
      timezone text,
      currency text,
      gst_number text,
      address text,
      website text,
      language text,
      date_format text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `)

  console.log('Disabling RLS for demo (no policies required)...')
  await sql(`alter table public.company_settings disable row level security;`)

  console.log('Seeding initial row if table is empty...')
  const rows = await sql<{ id: string }>(`select id from public.company_settings limit 1;`)
  if (rows.length === 0) {
    await sql(`
      insert into public.company_settings
        (company_name, email, phone, timezone, currency, gst_number)
      values
        ('Safawala Laundry Services', 'info@safawala.com', '+91 9876543210', 'Asia/Kolkata', 'INR', '27AAAAA0000A1Z5');
    `)
    console.log('Inserted initial row.')
  } else {
    console.log('Row already exists. Skipping seed.')
  }

  console.log('Done.')
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
