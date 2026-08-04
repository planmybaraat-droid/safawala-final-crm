import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Activity } from "lucide-react"

interface HealthCheck {
  name: string
  status: "healthy" | "warning" | "error" | "checking"
  message: string
  details?: string
  lastChecked?: Date
  responseTime?: number
}

interface HealthCheckCardProps {
  check: HealthCheck
}

export function HealthCheckCard({ check }: HealthCheckCardProps) {
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

  return (
    <Card>
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
        {check.responseTime && <p className="text-xs text-gray-500">Response time: {check.responseTime}ms</p>}
        {check.lastChecked && (
          <p className="text-xs text-gray-500">Last checked: {check.lastChecked.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
        )}
      </CardContent>
    </Card>
  )
}
