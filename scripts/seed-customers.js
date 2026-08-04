// Seed 30 realistic customer records into Supabase
// Usage: SUPABASE_URL=<url> SUPABASE_KEY=<key> node scripts/seed-customers.js

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY

const envFranchiseId = process.env.FRANCHISE_ID // allow overriding franchise ID via env

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing SUPABASE_URL or SUPABASE_KEY environment variables.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  // Determine franchise ID: use env override or fetch by code
  let franchiseId = envFranchiseId
  if (!franchiseId) {
    const { data: franchise, error: franchiseError } = await supabase
      .from('franchises')
      .select('id')
      .eq('code', 'MAIN001')
      .limit(1)
      .single()
    if (franchiseError || !franchise) {
      console.error('Error fetching franchise MAIN001:', franchiseError)
      process.exit(1)
    }
    franchiseId = franchise.id
  }

  // Predefined customer data
  const names = [
    'Alice Johnson','Bob Smith','Charlie Davis','Diana Evans','Ethan Brown','Fiona Clark','George Wilson','Hannah Moore','Ian Taylor','Julia Anderson',
    'Kevin Thomas','Laura Jackson','Michael White','Natalie Harris','Oliver Martin','Paula Thompson','Quentin Garcia','Rachel Martinez','Steven Robinson','Tina Lewis',
    'Uma Walker','Victor Hall','Wendy Allen','Xavier Young','Yvonne King','Zachary Wright','Abigail Scott','Brandon Green','Catherine Adams','Daniel Baker'
  ]

  const cities = ['Mumbai','Delhi','Bangalore','Chennai','Kolkata','Hyderabad','Pune','Ahmedabad','Jaipur','Lucknow']
  const pincodes = ['400001','110001','560001','600001','700001','500001','411001','380001','302001','226001']

  const customers = names.map((fullName, index) => {
    const code = String(index + 2).padStart(3, '0') // 002..031
    const [first, last] = fullName.split(' ')
    const email = `${first.toLowerCase()}.${last.toLowerCase()}@example.com`
    const phone = `+91 9${Math.floor(800000000 + Math.random() * 100000000)}`
    const city = cities[index % cities.length]
    const pincode = pincodes[index % pincodes.length]

    return {
      customer_code: `CUST${code}`,
      name: fullName,
      phone,
      email,
      address: `${Math.floor(10 + Math.random() * 90)} ${['Oak St','Maple Ave','Pine Rd','Cedar Blvd'][index % 4]}`,
      city,
      pincode,
      franchise_id: franchiseId,
    }
  })

  // Insert customers
  const { data, error } = await supabase.from('customers').insert(customers)

  if (error) {
    console.error('Error inserting customers:', error)
    process.exit(1)
  }

  console.log(`Inserted ${data.length} customers successfully.`)

  // Fetch and display inserted customers
  const { data: inserted, error: fetchError } = await supabase
    .from('customers')
    .select('customer_code,name,phone,email,city,pincode')
    .in('customer_code', customers.map(c => c.customer_code))

  if (fetchError) {
    console.error('Error fetching inserted customers:', fetchError)
    process.exit(1)
  }

  console.table(inserted)
}

main()
