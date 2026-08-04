"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  ShoppingCart,
  MessageCircle,
  CreditCard,
  Package,
  Settings,
  CheckCircle,
  XCircle,
  ExternalLink,
  ArrowLeft,
  Key,
  Zap,
  FileText,
  Mail,
  TestTube,
} from "lucide-react"

interface Integration {
  id: string
  name: string
  description: string
  icon: React.ComponentType<any>
  category: string
  status: "connected" | "disconnected" | "pending"
  features: string[]
  setupRequired: boolean
}

const integrations: Integration[] = [
  {
    id: "amazon",
    name: "Amazon",
    description: "Sync products and orders with Amazon marketplace",
    icon: Package,
    category: "marketplace",
    status: "disconnected",
    features: ["Product sync", "Order management", "Inventory tracking", "Price updates"],
    setupRequired: true,
  },
  {
    id: "flipkart",
    name: "Flipkart",
    description: "Connect with Flipkart for product listings and orders",
    icon: ShoppingCart,
    category: "marketplace",
    status: "disconnected",
    features: ["Product listings", "Order sync", "Inventory management", "Analytics"],
    setupRequired: true,
  },
  {
    id: "woocommerce",
    name: "WooCommerce",
    description: "Sync products and manage your WordPress WooCommerce store",
    icon: ShoppingCart,
    category: "marketplace",
    status: "connected",
    features: ["Product sync", "Stock management", "Order sync", "Category sync", "Bulk operations"],
    setupRequired: false,
  },
  {
    id: "whatsapp-wati",
    name: "WhatsApp WATI",
    description: "Send automated messages and notifications via WhatsApp Business API",
    icon: MessageCircle,
    category: "communication",
    status: "connected",
    features: [
      "Booking confirmations",
      "Payment notifications",
      "Task assignments",
      "Inventory alerts",
      "Daily summaries",
      "Customer support",
      "Quote notifications",
    ],
    setupRequired: false,
  },
  {
    id: "razorpay",
    name: "Razorpay",
    description: "Accept payments and manage transactions",
    icon: CreditCard,
    category: "payment",
    status: "disconnected",
    features: ["Payment processing", "Subscription management", "Refunds", "Analytics"],
    setupRequired: true,
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Global payment processing platform",
    icon: CreditCard,
    category: "payment",
    status: "disconnected",
    features: ["Payment processing", "Subscription billing", "International payments", "Analytics"],
    setupRequired: true,
  },
  {
    id: "gmail",
    name: "Gmail",
    description: "Send automated emails and notifications",
    icon: Mail,
    category: "communication",
    status: "disconnected",
    features: ["Email notifications", "Quote delivery", "Invoice sending", "Customer communication"],
    setupRequired: true,
  },
]

export default function IntegrationsPage() {
  const router = useRouter()
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null)
  const [setupDialogOpen, setSetupDialogOpen] = useState(false)
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const [integrationStates, setIntegrationStates] = useState<Record<string, Integration["status"]>>(
    integrations.reduce(
      (acc, integration) => ({
        ...acc,
        [integration.id]: integration.status,
      }),
      {},
    ),
  )
  const [watiConfig, setWatiConfig] = useState({
    apiKey:
      "REDACTED_JWT",
    baseUrl: "https://live-mt-server.wati.io/481455",
    instanceId: "481455",
    testPhone: "919725295692",
  })

  const [wooConfig, setWooConfig] = useState({
    storeUrl: "",
    consumerKey: "",
    consumerSecret: "",
    webhookSecret: "",
  })

  const [genericConfig, setGenericConfig] = useState({
    apiKey: "",
    secret: "",
    webhook: "",
  })

  useEffect(() => {
    const loadIntegrationConfigs = async () => {
      try {
        const watiSetupResponse = await fetch("/api/wati/setup", {
          method: "POST",
        })
        const watiSetupResult = await watiSetupResponse.json()

        if (watiSetupResult.success) {
          console.log("[v0] WATI integration auto-configured:", watiSetupResult.config)
          setIntegrationStates((prev) => ({ ...prev, "whatsapp-wati": "connected" }))
        }

        const watiResponse = await fetch("/api/integrations/load?name=whatsapp-wati")
        const watiResult = await watiResponse.json()

        if (watiResult.success && watiResult.data) {
          console.log("[v0] Loaded WATI config:", watiResult.data)
          setWatiConfig({
            apiKey: watiResult.data.api_key || watiConfig.apiKey,
            baseUrl: watiResult.data.base_url || watiConfig.baseUrl,
            instanceId: watiResult.data.instance_id || watiConfig.instanceId,
            testPhone: watiResult.data.test_phone || watiConfig.testPhone,
          })
        }

        const wooResponse = await fetch("/api/integrations/load?name=woocommerce")
        const wooResult = await wooResponse.json()

        if (wooResult.success && wooResult.data) {
          console.log("[v0] Loaded WooCommerce config:", wooResult.data)
          setWooConfig({
            storeUrl: wooResult.data.store_url || "",
            consumerKey: wooResult.data.consumer_key || "",
            consumerSecret: wooResult.data.consumer_secret || "",
            webhookSecret: wooResult.data.webhook_secret || "",
          })
        }
      } catch (error) {
        console.error("[v0] Error loading integration configs:", error)
      }
    }

    loadIntegrationConfigs()
  }, [])

  useEffect(() => {
    setIntegrationStates((prev) => ({
      ...prev,
      woocommerce: "connected",
    }))
  }, [])

  const handleToggleIntegration = (integrationId: string, currentStatus: Integration["status"]) => {
    if (currentStatus === "disconnected") {
      const integration = integrations.find((i) => i.id === integrationId)
      if (integration?.setupRequired) {
        setSelectedIntegration(integration)
        setSetupDialogOpen(true)
        return
      }
    }

    const newStatus = currentStatus === "connected" ? "disconnected" : "connected"
    setIntegrationStates((prev) => ({
      ...prev,
      [integrationId]: newStatus,
    }))

    toast.success(
      newStatus === "connected"
        ? `${integrations.find((i) => i.id === integrationId)?.name} connected successfully!`
        : `${integrations.find((i) => i.id === integrationId)?.name} disconnected.`,
    )
  }

  const handleSetupIntegration = async () => {
    if (!selectedIntegration) return

    try {
      if (selectedIntegration.id === "whatsapp-wati") {
        console.log("[v0] Setting up WATI integration...")

        const saveResponse = await fetch("/api/integrations/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            integrationName: "whatsapp-wati",
            config: watiConfig,
          }),
        })

        const saveResult = await saveResponse.json()
        if (!saveResult.success) {
          throw new Error(saveResult.error || "Failed to save WATI configuration")
        }

        // Test the connection
        const testResponse = await fetch("/api/whatsapp/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })

        const testResult = await testResponse.json()
        if (!testResult.success) {
          throw new Error("WATI connection test failed")
        }

        setIntegrationStates((prev) => ({ ...prev, [selectedIntegration.id]: "connected" }))
        toast.success(`🎉 WhatsApp WATI connected successfully! Test message sent to ${watiConfig.testPhone}`)
      } else if (selectedIntegration.id === "woocommerce") {
        console.log("[v0] Setting up WooCommerce integration...")

        const saveResponse = await fetch("/api/woocommerce/config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(wooConfig),
        })

        const saveResult = await saveResponse.json()
        if (!saveResult.success) {
          throw new Error(saveResult.error || "Failed to save WooCommerce configuration")
        }

        setIntegrationStates((prev) => ({ ...prev, [selectedIntegration.id]: "connected" }))
        toast.success(`🛒 WooCommerce connected successfully! Your store is now synced.`)
      } else {
        // Generic integration setup
        const saveResponse = await fetch("/api/integrations/save", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            integrationName:
              selectedIntegration.id === "whatsapp-wati"
                ? "whatsapp-wati"
                : selectedIntegration.id === "woocommerce"
                  ? "woocommerce"
                  : selectedIntegration.id,
            config: genericConfig,
          }),
        })

        const saveResult = await saveResponse.json()

        if (!saveResult.success) {
          toast.error("Failed to save configuration: " + (saveResult.error || "Unknown error"))
          return
        }

        toast.success(`✅ ${selectedIntegration.name} connected successfully!`)
      }

      setSetupDialogOpen(false)
      setSelectedIntegration(null)
    } catch (error) {
      console.error(`[v0] Error setting up ${selectedIntegration.name}:`, error)
      toast.error(
        `❌ Failed to setup ${selectedIntegration.name}: ${error instanceof Error ? error.message : "Unknown error"}`,
      )
    }
  }

  const handleConfigureIntegration = (integration: Integration) => {
    setSelectedIntegration(integration)
    setConfigDialogOpen(true)
  }

  const handleSaveConfiguration = async () => {
    if (selectedIntegration) {
      try {
        const config =
          selectedIntegration.id === "whatsapp-wati"
            ? watiConfig
            : selectedIntegration.id === "woocommerce"
              ? wooConfig
              : genericConfig

        console.log("[v0] Saving configuration for:", selectedIntegration.id, config)

        const saveResponse = await fetch("/api/integrations/save", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            integrationName:
              selectedIntegration.id === "whatsapp-wati"
                ? "whatsapp-wati"
                : selectedIntegration.id === "woocommerce"
                  ? "woocommerce"
                  : selectedIntegration.id,
            config,
          }),
        })

        const saveResult = await saveResponse.json()

        if (!saveResult.success) {
          toast.error("Failed to save configuration: " + (saveResult.error || "Unknown error"))
          return
        }

        toast.success(`${selectedIntegration.name} configuration updated successfully!`)
      } catch (error) {
        console.error("[v0] Error saving configuration:", error)
        toast.error("Failed to save configuration. Please try again.")
        return
      }
    }
    setConfigDialogOpen(false)
    setSelectedIntegration(null)
  }

  const getStatusColor = (status: Integration["status"]) => {
    switch (status) {
      case "connected":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: Integration["status"]) => {
    switch (status) {
      case "connected":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "pending":
        return <Settings className="h-4 w-4 text-yellow-600 animate-spin" />
      default:
        return <XCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const categorizedIntegrations = integrations.reduce(
    (acc, integration) => {
      const category = integration.category
      if (!acc[category]) acc[category] = []
      acc[category].push(integration)
      return acc
    },
    {} as Record<string, Integration[]>,
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Integrations</h1>
            <p className="text-muted-foreground">Connect your CRM with third-party services</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/integrations/wati-templates")}>
            <FileText className="h-4 w-4 mr-2" />
            WATI Templates
          </Button>
          <Button variant="outline">
            <ExternalLink className="h-4 w-4 mr-2" />
            Browse More
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Integration Status
            </CardTitle>
            <CardDescription>Overview of your connected services</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {Object.values(integrationStates).filter((s) => s === "connected").length}
                </div>
                <div className="text-sm text-muted-foreground">Connected</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {Object.values(integrationStates).filter((s) => s === "pending").length}
                </div>
                <div className="text-sm text-muted-foreground">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {Object.values(integrationStates).filter((s) => s === "disconnected").length}
                </div>
                <div className="text-sm text-muted-foreground">Available</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{integrations.length}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Integrations</TabsTrigger>
            <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
            <TabsTrigger value="communication">Communication</TabsTrigger>
            <TabsTrigger value="payment">Payment</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {Object.entries(categorizedIntegrations).map(([category, categoryIntegrations]) => (
              <div key={category} className="space-y-4">
                <h3 className="text-lg font-semibold capitalize">{category}</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {categoryIntegrations.map((integration) => (
                    <Card key={integration.id} className="relative">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <integration.icon className="h-6 w-6" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{integration.name}</CardTitle>
                              <CardDescription className="text-sm">{integration.description}</CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(integrationStates[integration.id])}>
                              {getStatusIcon(integrationStates[integration.id])}
                              <span className="ml-1 capitalize">{integrationStates[integration.id]}</span>
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          <div>
                            <h4 className="text-sm font-medium mb-2">Features:</h4>
                            <div className="flex flex-wrap gap-1">
                              {integration.features.map((feature) => (
                                <Badge key={feature} variant="secondary" className="text-xs">
                                  {feature}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={integrationStates[integration.id] === "connected"}
                                onCheckedChange={() =>
                                  handleToggleIntegration(integration.id, integrationStates[integration.id])
                                }
                              />
                              <span className="text-sm">
                                {integrationStates[integration.id] === "connected" ? "Connected" : "Connect"}
                              </span>
                            </div>
                            {integrationStates[integration.id] === "connected" && (
                              <div className="flex gap-2">
                                {integration.id === "whatsapp-wati" && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={async () => {
                                        try {
                                          const response = await fetch("/api/whatsapp/test", {
                                            method: "POST",
                                          })
                                          const result = await response.json()
                                          if (result.success) {
                                            toast.success("🎉 WATI test message sent successfully!")
                                          } else {
                                            toast.error("❌ WATI test failed: " + (result.error || "Unknown error"))
                                          }
                                        } catch (error) {
                                          toast.error("❌ Failed to test WATI connection")
                                        }
                                      }}
                                    >
                                      <MessageCircle className="h-4 w-4 mr-1" />
                                      Test WATI
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => router.push("/integrations/wati-templates")}
                                    >
                                      <FileText className="h-4 w-4 mr-1" />
                                      Templates
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => router.push("/integrations/wati-test")}
                                    >
                                      <TestTube className="h-4 w-4 mr-1" />
                                      Test Templates
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={async () => {
                                        try {
                                          const response = await fetch("/api/wati/setup", {
                                            method: "POST",
                                          })
                                          const result = await response.json()
                                          if (result.success) {
                                            toast.success("🔔 WATI notifications configured successfully!")
                                          } else {
                                            toast.error(
                                              "❌ Failed to setup notifications: " + (result.error || "Unknown error"),
                                            )
                                          }
                                        } catch (error) {
                                          toast.error("❌ Failed to setup WATI notifications")
                                        }
                                      }}
                                    >
                                      <Zap className="h-4 w-4 mr-1" />
                                      Setup Notifications
                                    </Button>
                                  </>
                                )}
                                {integration.id === "woocommerce" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => router.push("/integrations/woocommerce")}
                                  >
                                    <ShoppingCart className="h-4 w-4 mr-1" />
                                    Manage
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleConfigureIntegration(integration)}
                                >
                                  <Settings className="h-4 w-4 mr-1" />
                                  Configure
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </TabsContent>

          {Object.entries(categorizedIntegrations).map(([category, categoryIntegrations]) => (
            <TabsContent key={category} value={category} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {categoryIntegrations.map((integration) => (
                  <Card key={integration.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <integration.icon className="h-6 w-6" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{integration.name}</CardTitle>
                            <CardDescription className="text-sm">{integration.description}</CardDescription>
                          </div>
                        </div>
                        <Badge className={getStatusColor(integrationStates[integration.id])}>
                          {getStatusIcon(integrationStates[integration.id])}
                          <span className="ml-1 capitalize">{integrationStates[integration.id]}</span>
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-sm font-medium mb-2">Features:</h4>
                          <div className="flex flex-wrap gap-1">
                            {integration.features.map((feature) => (
                              <Badge key={feature} variant="secondary" className="text-xs">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={integrationStates[integration.id] === "connected"}
                              onCheckedChange={() =>
                                handleToggleIntegration(integration.id, integrationStates[integration.id])
                              }
                            />
                            <span className="text-sm">
                              {integrationStates[integration.id] === "connected" ? "Connected" : "Connect"}
                            </span>
                          </div>
                          {integrationStates[integration.id] === "connected" && (
                            <div className="flex gap-2">
                              {integration.id === "whatsapp-wati" && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                      try {
                                        const response = await fetch("/api/whatsapp/test", {
                                          method: "POST",
                                        })
                                        const result = await response.json()
                                        if (result.success) {
                                          toast.success("🎉 WATI test message sent successfully!")
                                        } else {
                                          toast.error("❌ WATI test failed: " + (result.error || "Unknown error"))
                                        }
                                      } catch (error) {
                                        toast.error("❌ Failed to test WATI connection")
                                      }
                                    }}
                                  >
                                    <MessageCircle className="h-4 w-4 mr-1" />
                                    Test WATI
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => router.push("/integrations/wati-templates")}
                                  >
                                    <FileText className="h-4 w-4 mr-1" />
                                    Templates
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => router.push("/integrations/wati-test")}
                                  >
                                    <TestTube className="h-4 w-4 mr-1" />
                                    Test Templates
                                  </Button>
                                </>
                              )}
                              {integration.id === "woocommerce" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => router.push("/integrations/woocommerce")}
                                >
                                  <ShoppingCart className="h-4 w-4 mr-1" />
                                  Manage
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleConfigureIntegration(integration)}
                              >
                                <Settings className="h-4 w-4 mr-1" />
                                Configure
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <Dialog open={setupDialogOpen} onOpenChange={setSetupDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedIntegration && <selectedIntegration.icon className="h-5 w-5" />}
              Setup {selectedIntegration?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedIntegration?.id === "whatsapp-wati"
                ? "Configure your WhatsApp Business API settings from WATI dashboard"
                : selectedIntegration?.id === "woocommerce"
                  ? "Configure your WooCommerce integration settings"
                  : `Configure your ${selectedIntegration?.name} integration settings`}
            </DialogDescription>
          </DialogHeader>

          {selectedIntegration?.id === "whatsapp-wati" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="wati-api-key">WATI API Key</Label>
                <Input
                  id="wati-api-key"
                  placeholder="Enter your WATI API key"
                  type="password"
                  value={watiConfig.apiKey}
                  onChange={(e) => setWatiConfig((prev) => ({ ...prev, apiKey: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wati-base-url">Base URL</Label>
                <Input
                  id="wati-base-url"
                  placeholder="https://live-server-xxxx.wati.io"
                  value={watiConfig.baseUrl}
                  onChange={(e) => setWatiConfig((prev) => ({ ...prev, baseUrl: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wati-instance">Instance ID</Label>
                <Input
                  id="wati-instance"
                  placeholder="Your WATI instance ID"
                  value={watiConfig.instanceId}
                  onChange={(e) => setWatiConfig((prev) => ({ ...prev, instanceId: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="test-phone">Test Phone Number (Optional)</Label>
                <Input
                  id="test-phone"
                  placeholder="+919876543210"
                  value={watiConfig.testPhone}
                  onChange={(e) => setWatiConfig((prev) => ({ ...prev, testPhone: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Include country code. A test message will be sent to verify connection.
                </p>
              </div>
            </div>
          ) : selectedIntegration?.id === "woocommerce" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="woo-store-url">Store URL</Label>
                <Input
                  id="woo-store-url"
                  placeholder="https://yourstore.com"
                  value={wooConfig.storeUrl}
                  onChange={(e) => setWooConfig((prev) => ({ ...prev, storeUrl: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="woo-consumer-key">Consumer Key</Label>
                <Input
                  id="woo-consumer-key"
                  placeholder="ck_xxxxxxxxxxxxxxxx"
                  type="password"
                  value={wooConfig.consumerKey}
                  onChange={(e) => setWooConfig((prev) => ({ ...prev, consumerKey: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="woo-consumer-secret">Consumer Secret</Label>
                <Input
                  id="woo-consumer-secret"
                  placeholder="cs_xxxxxxxxxxxxxxxx"
                  type="password"
                  value={wooConfig.consumerSecret}
                  onChange={(e) => setWooConfig((prev) => ({ ...prev, consumerSecret: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="woo-webhook-secret">Webhook Secret (Optional)</Label>
                <Input
                  id="woo-webhook-secret"
                  placeholder="webhook_secret_key"
                  type="password"
                  value={wooConfig.webhookSecret}
                  onChange={(e) => setWooConfig((prev) => ({ ...prev, webhookSecret: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Generate API keys from WooCommerce → Settings → Advanced → REST API
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <Input
                  id="api-key"
                  placeholder="Enter your API key"
                  type="password"
                  value={genericConfig.apiKey}
                  onChange={(e) => setGenericConfig((prev) => ({ ...prev, apiKey: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="secret">Secret Key</Label>
                <Input
                  id="secret"
                  placeholder="Enter your secret key"
                  type="password"
                  value={genericConfig.secret}
                  onChange={(e) => setGenericConfig((prev) => ({ ...prev, secret: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="webhook">Webhook URL</Label>
                <Input
                  id="webhook"
                  placeholder="https://your-domain.com/webhook"
                  type="url"
                  value={genericConfig.webhook}
                  onChange={(e) => setGenericConfig((prev) => ({ ...prev, webhook: e.target.value }))}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSetupDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSetupIntegration}>
              <Key className="h-4 w-4 mr-2" />
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedIntegration && <selectedIntegration.icon className="h-5 w-5" />}
              Configure {selectedIntegration?.name}
            </DialogTitle>
            <DialogDescription>Update your {selectedIntegration?.name} integration settings</DialogDescription>
          </DialogHeader>

          {selectedIntegration?.id === "whatsapp-wati" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="config-wati-api-key">WATI API Key</Label>
                <Input
                  id="config-wati-api-key"
                  placeholder="Enter your WATI API key"
                  type="password"
                  value={watiConfig.apiKey}
                  onChange={(e) => setWatiConfig((prev) => ({ ...prev, apiKey: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="config-wati-base-url">Base URL</Label>
                <Input
                  id="config-wati-base-url"
                  placeholder="https://live-server-xxxx.wati.io"
                  value={watiConfig.baseUrl}
                  onChange={(e) => setWatiConfig((prev) => ({ ...prev, baseUrl: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="config-wati-instance">Instance ID</Label>
                <Input
                  id="config-wati-instance"
                  placeholder="Your WATI instance ID"
                  value={watiConfig.instanceId}
                  onChange={(e) => setWatiConfig((prev) => ({ ...prev, instanceId: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="config-test-phone">Test Phone Number</Label>
                <Input
                  id="config-test-phone"
                  placeholder="+919876543210"
                  value={watiConfig.testPhone}
                  onChange={(e) => setWatiConfig((prev) => ({ ...prev, testPhone: e.target.value }))}
                />
              </div>
            </div>
          ) : selectedIntegration?.id === "woocommerce" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="config-woo-store-url">Store URL</Label>
                <Input
                  id="config-woo-store-url"
                  placeholder="https://yourstore.com"
                  value={wooConfig.storeUrl}
                  onChange={(e) => setWooConfig((prev) => ({ ...prev, storeUrl: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="config-woo-consumer-key">Consumer Key</Label>
                <Input
                  id="config-woo-consumer-key"
                  placeholder="ck_xxxxxxxxxxxxxxxx"
                  type="password"
                  value={wooConfig.consumerKey}
                  onChange={(e) => setWooConfig((prev) => ({ ...prev, consumerKey: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="config-woo-consumer-secret">Consumer Secret</Label>
                <Input
                  id="config-woo-consumer-secret"
                  placeholder="cs_xxxxxxxxxxxxxxxx"
                  type="password"
                  value={wooConfig.consumerSecret}
                  onChange={(e) => setWooConfig((prev) => ({ ...prev, consumerSecret: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="config-woo-webhook-secret">Webhook Secret</Label>
                <Input
                  id="config-woo-webhook-secret"
                  placeholder="webhook_secret_key"
                  type="password"
                  value={wooConfig.webhookSecret}
                  onChange={(e) => setWooConfig((prev) => ({ ...prev, webhookSecret: e.target.value }))}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="config-api-key">API Key</Label>
                <Input
                  id="config-api-key"
                  placeholder="Enter your API key"
                  type="password"
                  value={genericConfig.apiKey}
                  onChange={(e) => setGenericConfig((prev) => ({ ...prev, apiKey: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="config-secret">Secret Key</Label>
                <Input
                  id="config-secret"
                  placeholder="Enter your secret key"
                  type="password"
                  value={genericConfig.secret}
                  onChange={(e) => setGenericConfig((prev) => ({ ...prev, secret: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="config-webhook">Webhook URL</Label>
                <Input
                  id="config-webhook"
                  placeholder="https://your-domain.com/webhook"
                  type="url"
                  value={genericConfig.webhook}
                  onChange={(e) => setGenericConfig((prev) => ({ ...prev, webhook: e.target.value }))}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveConfiguration}>
              <Settings className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
