"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Activity,
  Database,
  Zap,
  Globe,
  Shield,
  FileText,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface HealthCheck {
  name: string
  status: "healthy" | "warning" | "error" | "checking"
  message: string
  details?: string
  lastChecked?: string
  responseTime?: number
}

interface SystemHealth {
  database: HealthCheck[]
  integrations: HealthCheck[]
  apis: HealthCheck[]
  authentication: HealthCheck[]
  storage: HealthCheck[]
  performance: HealthCheck[]
}

export default function SystemHealthPage() {
  const [health, setHealth] = useState<SystemHealth>({
    database: [],
    integrations: [],
    apis: [],
    authentication: [],
    storage: [],
    performance: [],
  })
  const [isChecking, setIsChecking] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const normalizeHealth = (payload: Partial<SystemHealth> | undefined): SystemHealth => ({
    database: payload?.database ?? [],
    integrations: payload?.integrations ?? [],
    apis: payload?.apis ?? [],
    authentication: payload?.authentication ?? [],
    storage: payload?.storage ?? [],
    performance: payload?.performance ?? [],
  })

  const runHealthCheck = async (options?: { silent?: boolean }) => {
    setIsChecking(true)
    try {
      const response = await fetch("/api/admin/health-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (response.ok) {
        const data = await response.json()
        setHealth(normalizeHealth(data.health))
        setLastUpdate(data.timestamp ? new Date(data.timestamp) : new Date())
        if (!options?.silent) {
          toast({
            title: "Health Check Complete",
            description: `System health check completed successfully`,
          })
        }
      } else {
        throw new Error("Health check failed")
      }
    } catch (error) {
      toast({
        title: "Health Check Failed",
        description: "Unable to complete system health check",
        variant: "destructive",
      })
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    runHealthCheck({ silent: true })
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (autoRefresh) {
      interval = setInterval(() => runHealthCheck({ silent: true }), 30000) // 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "checking":
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-green-100 text-green-800"
      case "warning":
        return "bg-yellow-100 text-yellow-800"
      case "error":
        return "bg-red-100 text-red-800"
      case "checking":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getOverallHealth = () => {
    const allChecks = [
      ...health.database,
      ...health.integrations,
      ...health.apis,
      ...health.authentication,
      ...health.storage,
      ...health.performance,
    ]

    const errorCount = allChecks.filter((check) => check.status === "error").length
    const warningCount = allChecks.filter((check) => check.status === "warning").length
    const healthyCount = allChecks.filter((check) => check.status === "healthy").length

    if (errorCount > 0) return { status: "error", count: errorCount }
    if (warningCount > 0) return { status: "warning", count: warningCount }
    return { status: "healthy", count: healthyCount }
  }

  const overallHealth = getOverallHealth()
  const formatCheckedTime = (value?: string) => {
    if (!value) return null
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return "Invalid timestamp"
    return parsed.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  }

  return (
      <div className="space-y-6 p-4 md:p-7">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">System Health Monitor</h1>
            <p className="text-gray-600">Monitor and diagnose CRM system health</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => setAutoRefresh(!autoRefresh)}>
              {autoRefresh ? "Stop Auto Refresh" : "Auto Refresh"}
            </Button>
            <Button onClick={() => runHealthCheck()} disabled={isChecking}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? "animate-spin" : ""}`} />
              {isChecking ? "Checking..." : "Run Health Check"}
            </Button>
          </div>
        </div>

        {/* Overall Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(overallHealth.status)}
              System Status
            </CardTitle>
            <CardDescription>
              {lastUpdate ? `Last updated: ${lastUpdate.toLocaleString()}` : "Never updated"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Badge className={getStatusColor(overallHealth.status)}>{overallHealth.status.toUpperCase()}</Badge>
              <span className="text-sm text-gray-600">
                {overallHealth.status === "healthy"
                  ? "All systems operational"
                  : `${overallHealth.count} ${overallHealth.status === "error" ? "critical issues" : "warnings"} detected`}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Health Check Tabs */}
        <Tabs defaultValue="database" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="database" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Database
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Integrations
            </TabsTrigger>
            <TabsTrigger value="apis" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              APIs
            </TabsTrigger>
            <TabsTrigger value="authentication" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Auth
            </TabsTrigger>
            <TabsTrigger value="storage" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Storage
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Performance
            </TabsTrigger>
          </TabsList>

          {(Object.entries(health) as Array<[keyof SystemHealth, HealthCheck[]]>).map(([category, checks]) => (
            <TabsContent key={category} value={category} className="space-y-4">
              {checks.length === 0 ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>No health checks configured for {category}</AlertDescription>
                </Alert>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {checks.map((check, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center justify-between text-sm">
                          <span>{check.name}</span>
                          {getStatusIcon(check.status)}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <Badge className={getStatusColor(check.status)} variant="secondary">
                          {check.status.toUpperCase()}
                        </Badge>
                        <p className="text-sm text-gray-600">{check.message}</p>
                        {check.details && <p className="text-xs text-gray-500">{check.details}</p>}
                        {check.responseTime && (
                          <p className="text-xs text-gray-500">Response time: {check.responseTime}ms</p>
                        )}
                        {check.lastChecked && (
                          <p className="text-xs text-gray-500">
                            Last checked: {formatCheckedTime(check.lastChecked)}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
  )
}
