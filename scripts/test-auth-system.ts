/**
 * Test suite for authentication system v2
 * Run: pnpm tsx scripts/test-auth-system.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<boolean>, expectedMessage?: string) {
  try {
    const passed = await fn();
    results.push({ name, passed, message: expectedMessage });
    console.log(passed ? `✅ ${name}` : `❌ ${name}`);
    if (expectedMessage) console.log(`   ${expectedMessage}`);
  } catch (error: any) {
    results.push({ name, passed: false, message: error.message });
    console.log(`❌ ${name} - Error: ${error.message}`);
  }
}

async function main() {
  console.log('🧪 Testing Authentication System v2\n');

  // Test 1: Check users table structure
  await test('Users table has required columns', async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, role, permissions, franchise_id, is_active')
      .limit(1);
    return !error && data !== null;
  });

  // Test 2: Check franchises exist
  await test('Franchises table has data', async () => {
    const { data, error } = await supabase
      .from('franchises')
      .select('id, name, code')
      .limit(1);
    return !error && data !== null && data.length > 0;
  });

  // Test 3: Find test users by role
  const { data: users } = await supabase
    .from('users')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (!users || users.length === 0) {
    console.log('❌ No active users found in database');
    return;
  }

  console.log(`\n📊 Found ${users.length} active users`);

  // Test 4: Check each role has default permissions
  const roleTests = {
    super_admin: users.find((u) => u.role === 'super_admin'),
    franchise_admin: users.find((u) => u.role === 'franchise_admin'),
    staff: users.find((u) => u.role === 'staff'),
    readonly: users.find((u) => u.role === 'readonly'),
  };

  for (const [role, user] of Object.entries(roleTests)) {
    if (user) {
      await test(`${role} has permissions object`, async () => {
        return user.permissions && typeof user.permissions === 'object';
      }, `User: ${user.name || user.email}`);

      if (user.permissions) {
        const perms = user.permissions as any;
        await test(`${role} has dashboard permission`, async () => {
          return perms.dashboard === true;
        });

        if (role === 'super_admin') {
          await test(`${role} has all permissions`, async () => {
            const requiredPerms = ['bookings', 'customers', 'franchises', 'staff', 'financials'];
            return requiredPerms.every((p) => perms[p] === true);
          });
        }

        if (role === 'staff') {
          await test(`${role} has limited permissions`, async () => {
            return perms.bookings === true && perms.financials === false && perms.staff === false;
          });
        }
      }
    } else {
      console.log(`⚠️  No active user found with role: ${role}`);
    }
  }

  // Test 5: Check Ritesh specifically
  const ritesh = users.find((u) => u.email?.toLowerCase().includes('ritesh') || u.name?.toLowerCase().includes('ritesh'));
  if (ritesh) {
    console.log(`\n👤 Checking user: ${ritesh.name || ritesh.email}`);
    await test('Ritesh has valid role', async () => {
      return ['super_admin', 'franchise_admin', 'staff', 'readonly'].includes(ritesh.role);
    }, `Role: ${ritesh.role}`);

    await test('Ritesh has franchise assigned', async () => {
      return !!ritesh.franchise_id;
    }, `Franchise ID: ${ritesh.franchise_id || 'NONE'}`);

    await test('Ritesh has permissions', async () => {
      return ritesh.permissions && Object.keys(ritesh.permissions).length > 0;
    });

    if (ritesh.franchise_id) {
      const { data: franchise } = await supabase
        .from('franchises')
        .select('name, code, city')
        .eq('id', ritesh.franchise_id)
        .single();
      
      if (franchise) {
        console.log(`   Franchise: ${franchise.name} (${franchise.code}) - ${franchise.city}`);
      }
    }
  } else {
    console.log('⚠️  Ritesh user not found');
  }

  // Summary
  console.log('\n📋 Test Summary');
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${results.length}`);

  if (failed > 0) {
    console.log('\n❌ Some tests failed. Run the fix script:');
    console.log('   pnpm sql:run scripts/FIX_USER_PERMISSIONS.sql');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed! Authentication system is ready.');
  }
}

main().catch(console.error);
