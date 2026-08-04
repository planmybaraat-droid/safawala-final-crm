const BASE_URL = 'http://localhost:3002';

async function runVerification() {
  console.log('🧪 Starting programmatic verification of CRM pages and API routes...');
  
  // 1. Authenticate
  console.log('Sending login request for admin@safawala.com...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@safawala.com',
      password: 'admin123'
    })
  });

  if (!loginRes.ok) {
    console.error(`❌ Login failed with status: ${loginRes.status}`);
    console.error(await loginRes.text());
    process.exit(1);
  }

  const loginData = await loginRes.json();
  const cookie = loginRes.headers.get('set-cookie');
  console.log(`✅ Login successful for ${loginData.user.name} (${loginData.user.role})`);
  
  // Helper to test endpoint
  async function testEndpoint(path, name) {
    console.log(`Testing ${name} (${path})...`);
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Cookie': cookie || '' }
    });
    
    if (res.ok) {
      console.log(`✅ ${name} returned 200 OK`);
      if (path.startsWith('/api/')) {
        const body = await res.json();
        console.log(`   Data payload fields:`, Object.keys(body.data || body));
      }
    } else {
      console.error(`❌ ${name} returned error status: ${res.status}`);
      const text = await res.text();
      console.error(`   Error details:`, text.slice(0, 500));
    }
  }

  // 2. Test API Routes
  await testEndpoint('/api/dashboard/stats', 'Dashboard Stats API');
  await testEndpoint('/api/work-orders', 'Work Orders API');
  
  // 3. Test Frontend page compiles
  await testEndpoint('/dashboard', 'Dashboard Page');
  await testEndpoint('/work-orders', 'Work Orders Board Page');

  console.log('🎉 Verification completed.');
}

runVerification().catch(err => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
