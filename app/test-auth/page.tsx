"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function AuthTestPage() {
  const [logs, setLogs] = useState<string[]>([])
  const [session, setSession] = useState<any>(null)
  const [testResult, setTestResult] = useState<string>('')

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}: ${message}`])
    console.log(message)
  }

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    addLog('🔍 Starting auth check...')
    
    const supabase = createClient()
    
    // Check session
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      addLog(`❌ Error getting session: ${error.message}`)
      return
    }
    
    if (session) {
      addLog('✅ Session found!')
      addLog(`User: ${session.user.email}`)
      addLog(`Access token: ${session.access_token.substring(0, 20)}...`)
      setSession(session)
    } else {
      addLog('❌ No session found')
      
      // Check localStorage
      const storedToken = localStorage.getItem('sb-xplnyaxkusvuajtmorss-auth-token')
      if (storedToken) {
        addLog('⚠️ Token exists in localStorage but not loaded by Supabase client')
        addLog(`Token preview: ${storedToken.substring(0, 50)}...`)
      } else {
        addLog('❌ No token in localStorage')
      }
    }
  }

  const testInsert = async () => {
    addLog('🧪 Testing INSERT into packages_categories...')
    setTestResult('')
    
    const supabase = createClient()
    
    const testCategory = {
      name: `Test Category ${Date.now()}`,
      description: 'Test from auth diagnostic page',
      franchise_id: '1a518dde-85b7-44ef-8bc4-092f53ddfd99',
      is_active: true,
      display_order: 999
    }
    
    addLog(`Inserting: ${JSON.stringify(testCategory)}`)
    
    const { data, error } = await supabase
      .from('packages_categories')
      .insert(testCategory)
      .select()
    
    if (error) {
      addLog(`❌ INSERT FAILED: ${error.message}`)
      addLog(`Error code: ${error.code}`)
      addLog(`Error details: ${JSON.stringify(error.details)}`)
      setTestResult(`FAILED: ${error.message}`)
    } else {
      addLog(`✅ INSERT SUCCESS!`)
      addLog(`Created category: ${JSON.stringify(data)}`)
      setTestResult('SUCCESS! Category created.')
    }
  }

  const refreshSession = async () => {
    addLog('🔄 Refreshing session...')
    const supabase = createClient()
    const { data, error } = await supabase.auth.refreshSession()
    
    if (error) {
      addLog(`❌ Refresh failed: ${error.message}`)
    } else {
      addLog('✅ Session refreshed')
      setSession(data.session)
    }
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">🔐 Supabase Auth Diagnostic</h1>
      
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Session Status</CardTitle>
          </CardHeader>
          <CardContent>
            {session ? (
              <div className="space-y-2">
                <p className="text-green-600 font-bold">✅ Authenticated</p>
                <p><strong>Email:</strong> {session.user.email}</p>
                <p><strong>User ID:</strong> {session.user.id}</p>
                <p><strong>Expires:</strong> {new Date(session.expires_at * 1000).toLocaleString()}</p>
              </div>
            ) : (
              <p className="text-red-600 font-bold">❌ Not Authenticated</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button onClick={checkAuth} className="w-full">
              🔍 Check Auth Status
            </Button>
            <Button onClick={refreshSession} className="w-full" variant="outline">
              🔄 Refresh Session
            </Button>
            <Button onClick={testInsert} className="w-full" variant="secondary">
              🧪 Test INSERT
            </Button>
            {testResult && (
              <div className={`p-2 rounded ${testResult.includes('SUCCESS') ? 'bg-green-100' : 'bg-red-100'}`}>
                {testResult}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-black text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-auto">
            {logs.map((log, i) => (
              <div key={i}>{log}</div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p><strong>1.</strong> Click "Check Auth Status" - Should show ✅ Session found</p>
          <p><strong>2.</strong> If no session, log out and log back in</p>
          <p><strong>3.</strong> Click "Test INSERT" - Should create a category</p>
          <p><strong>4.</strong> If INSERT fails with 401, the RLS policies are the issue</p>
          <p><strong>5.</strong> If INSERT succeeds here but fails on Sets page, it's a client initialization issue</p>
        </CardContent>
      </Card>
    </div>
  )
}
