/*
Run SQL file using DATABASE_URL env var.
Usage:
  DATABASE_URL="postgres://..." node scripts/run-sql.js scripts/create-product-images-table.sql

This script requires the 'pg' package. Install with:
  npm install pg
*/

const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

async function main() {
  const fileArg = process.argv[2]
  if (!fileArg) {
    console.error('Usage: DATABASE_URL="postgres://..." node scripts/run-sql.js path/to/file.sql')
    process.exit(1)
  }

  const filePath = path.resolve(process.cwd(), fileArg)
  if (!fs.existsSync(filePath)) {
    console.error('SQL file not found:', filePath)
    process.exit(1)
  }

  const sql = fs.readFileSync(filePath, 'utf8')
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('Please set DATABASE_URL environment variable to your Postgres connection string')
    process.exit(1)
  }

  const client = new Client({ connectionString: databaseUrl })
  try {
    await client.connect()
    console.log('Connected to database, running SQL file:', filePath)
    await client.query(sql)
    console.log('SQL executed successfully')
  } catch (err) {
    console.error('Error executing SQL:', err)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()
