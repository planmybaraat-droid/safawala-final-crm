Run SQL files locally

This folder contains helper scripts to run SQL files against your Postgres database.

Prerequisites:
- Node.js installed
- `pg` package installed (run `npm install pg` in the project root)
- A Postgres connection string (DATABASE_URL). For Supabase: copy the connection string from the Supabase Dashboard → Settings → Database → Connection string.

Run the migration file:

```bash
# install dependency once
npm install pg

# run the migration (replace <POSTGRES_URI> with your connection string)
DATABASE_URL="<POSTGRES_URI>" node scripts/run-sql.js scripts/create-product-images-table.sql
```

Verify the table exists:

```bash
psql "<POSTGRES_URI>" -c "\d public.product_images"
psql "<POSTGRES_URI>" -c "SELECT id, product_id, url, is_main, \"order\" FROM public.product_images LIMIT 5;"
```
