"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export default function StaffSmokeTest() {
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    runTest()
  }, [])

  const runTest = async () => {
    const supabase = createClient()
    const testResults: any = {
      timestamp: new Date().toISOString(),
      tests: []
    }

    console.log("🧪 Starting Staff Smoke Test...")

    // Test 1: Simple select all users
    console.log("\n📝 Test 1: Select all users")
    const test1 = await supabase.from("users").select("*")
    testResults.tests.push({
      name: "Select all users",
      success: !test1.error,
      error: test1.error?.message,
      count: test1.data?.length || 0,
      data: test1.data
    })
    console.log("Result:", test1.error ? `❌ ${test1.error.message}` : `✅ Found ${test1.data?.length} users`)
    if (test1.data) console.table(test1.data)

    // Test 2: Select with specific columns
    console.log("\n📝 Test 2: Select id, name, role")
    const test2 = await supabase.from("users").select("id,name,role")
    testResults.tests.push({
      name: "Select id,name,role",
      success: !test2.error,
      error: test2.error?.message,
      count: test2.data?.length || 0,
      data: test2.data
    })
    console.log("Result:", test2.error ? `❌ ${test2.error.message}` : `✅ Found ${test2.data?.length} users`)

    // Test 3: Filter by role = 'staff'
    console.log("\n📝 Test 3: Filter role = 'staff'")
    const test3 = await supabase.from("users").select("*").eq("role", "staff")
    testResults.tests.push({
      name: "Filter role = 'staff'",
      success: !test3.error,
      error: test3.error?.message,
      count: test3.data?.length || 0,
      data: test3.data
    })
    console.log("Result:", test3.error ? `❌ ${test3.error.message}` : `✅ Found ${test3.data?.length} staff`)
    if (test3.data) console.table(test3.data)

    // Test 4: Filter by role = 'franchise_admin'
    console.log("\n📝 Test 4: Filter role = 'franchise_admin'")
    const test4 = await supabase.from("users").select("*").eq("role", "franchise_admin")
    testResults.tests.push({
      name: "Filter role = 'franchise_admin'",
      success: !test4.error,
      error: test4.error?.message,
      count: test4.data?.length || 0,
      data: test4.data
    })
    console.log("Result:", test4.error ? `❌ ${test4.error.message}` : `✅ Found ${test4.data?.length} franchise admins`)
    if (test4.data) console.table(test4.data)

    // Test 5: Filter using .in() with array
    console.log("\n📝 Test 5: Filter using .in(['staff', 'franchise_admin'])")
    const test5 = await supabase.from("users").select("id,name,email,role,franchise_id").in("role", ["staff", "franchise_admin"]).order("name")
    testResults.tests.push({
      name: "Filter .in(['staff', 'franchise_admin'])",
      success: !test5.error,
      error: test5.error?.message,
      count: test5.data?.length || 0,
      data: test5.data
    })
    console.log("Result:", test5.error ? `❌ ${test5.error.message}` : `✅ Found ${test5.data?.length} staff members`)
    if (test5.data) console.table(test5.data)

    // Test 6: Check RLS status
    console.log("\n📝 Test 6: Checking RLS status")
    const test6 = await supabase.rpc('check_rls_status', {})
    testResults.tests.push({
      name: "Check RLS status (if function exists)",
      success: !test6.error,
      error: test6.error?.message,
      data: test6.data
    })

    console.log("\n" + "=".repeat(50))
    console.log("🎯 SMOKE TEST COMPLETE")
    console.log("=".repeat(50))
    
    const successCount = testResults.tests.filter((t: any) => t.success).length
    const totalTests = testResults.tests.length
    console.log(`✅ Passed: ${successCount}/${totalTests}`)
    console.log(`❌ Failed: ${totalTests - successCount}/${totalTests}`)

    setResults(testResults)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">🧪 Staff Query Smoke Test</h1>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600">Running tests... Check console (F12)</p>
            <div className="animate-pulse mt-4 space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🧪 Staff Query Smoke Test Results</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Test Summary</h2>
            <span className="text-sm text-gray-500">{results.timestamp}</span>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{results.tests.length}</div>
              <div className="text-sm text-gray-600">Total Tests</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {results.tests.filter((t: any) => t.success).length}
              </div>
              <div className="text-sm text-gray-600">Passed</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {results.tests.filter((t: any) => !t.success).length}
              </div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
          </div>

          <div className="space-y-4">
            {results.tests.map((test: any, idx: number) => (
              <div key={idx} className={`border rounded-lg p-4 ${test.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    {test.success ? '✅' : '❌'}
                    <span>{test.name}</span>
                  </h3>
                  {test.count !== undefined && (
                    <span className="text-sm bg-white px-3 py-1 rounded-full">
                      {test.count} records
                    </span>
                  )}
                </div>
                
                {test.error && (
                  <div className="mt-2 text-sm text-red-600 bg-red-100 p-2 rounded">
                    <strong>Error:</strong> {test.error}
                  </div>
                )}
                
                {test.success && test.data && test.data.length > 0 && (
                  <div className="mt-2 text-xs">
                    <details className="cursor-pointer">
                      <summary className="text-gray-600 hover:text-gray-800">
                        View {test.data.length} records
                      </summary>
                      <pre className="mt-2 bg-white p-2 rounded overflow-auto max-h-60 text-xs">
                        {JSON.stringify(test.data, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">📋 Check Console</h3>
          <p className="text-sm text-yellow-700">
            Detailed logs and data tables are available in the browser console (F12)
          </p>
        </div>

        <div className="mt-6 flex gap-4">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            🔄 Run Tests Again
          </button>
          <button
            onClick={() => window.location.href = '/book-package'}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            ← Back to Booking Page
          </button>
        </div>
      </div>
    </div>
  )
}
