"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ArrowLeft,
  ShoppingCart,
  FolderSyncIcon as Sync,
  Package,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Settings,
  Upload,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"

interface WooCommerceConfig {
  store_url: string
  consumer_key: string
  consumer_secret: string
}

interface Product {
  id: string
  product_code: string
  name: string
  price: number
  rental_price: number
  stock_available: number
  image_url?: string
}

export default function WooCommercePage() {
  const router = useRouter()
  const [config, setConfig] = useState<WooCommerceConfig>({
    store_url: "https://safawala.com",
    consumer_key: "REDACTED_WOOCOMMERCE_CONSUMER_KEY",
    consumer_secret: "REDACTED_WOOCOMMERCE_CONSUMER_SECRET",
  })
  const [isConfigured, setIsConfigured] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [syncStats, setSyncStats] = useState({
    totalProducts: 0,
    syncedProducts: 0,
    lastSync: null as string | null,
  })
  const [isAutoSetup, setIsAutoSetup] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<{
    isConnected: boolean
    error?: string
    details?: string
  }>({ isConnected: false })
  const [isTesting, setIsTesting] = useState(false)

  useEffect(() => {
    loadConfiguration()
    loadSyncStats()
    handleAutoSetup()
  }, [])

  const testWooCommerceConnection = async () => {
    if (!config.store_url || !config.consumer_key || !config.consumer_secret) {
      setConnectionStatus({
        isConnected: false,
        error: "Missing configuration",
        details: "Please fill in all required fields (Store URL, Consumer Key, Consumer Secret)",
      })
      return
    }

    setIsTesting(true)
    try {
      console.log("[v0] Testing WooCommerce connection...")

      const response = await fetch("/api/woocommerce/test-connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      })

      const result = await response.json()

      if (result.success) {
        setConnectionStatus({
          isConnected: true,
          details: `Successfully connected! Found ${result.productCount || 0} products.`,
        })
        toast({
          title: "Connection Successful",
          description: "WooCommerce API is working correctly",
        })
      } else {
        setConnectionStatus({
          isConnected: false,
          error: result.error,
          details: result.troubleshooting || "Check your WooCommerce settings",
        })
        toast({
          title: "Connection Failed",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      setConnectionStatus({
        isConnected: false,
        error: "Network error",
        details: "Unable to reach WooCommerce API. Check your internet connection and store URL.",
      })
      toast({
        title: "Connection Error",
        description: "Failed to test connection",
        variant: "destructive",
      })
    } finally {
      setIsTesting(false)
    }
  }

  const handleAutoSetup = async () => {
    setIsAutoSetup(true)
    try {
      console.log("[v0] Starting WooCommerce auto-setup...")

      const response = await fetch("/api/woocommerce/auto-setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const result = await response.json()

      if (result.success) {
        setIsConfigured(true)
        await testWooCommerceConnection()
        toast({
          title: "Auto-Setup Complete",
          description: "WooCommerce integration connected automatically!",
        })
        console.log("[v0] WooCommerce auto-setup successful")
      } else {
        console.log("[v0] WooCommerce auto-setup failed, manual setup required")
      }
    } catch (error) {
      console.error("[v0] WooCommerce auto-setup error:", error)
    } finally {
      setIsAutoSetup(false)
    }
  }

  const loadConfiguration = async () => {
    try {
      const response = await fetch("/api/woocommerce/config")
      const result = await response.json()

      if (result.success && result.data) {
        setConfig(result.data.settings)
        setIsConfigured(true)
      }
    } catch (error) {
      console.error("Error loading WooCommerce config:", error)
    }
  }

  const loadSyncStats = async () => {
    try {
      const response = await fetch("/api/inventory/products")
      if (response.ok) {
        const result = await response.json()
        const productCount = result.success ? result.data?.length || 0 : 0
        setProducts(result.success ? result.data || [] : [])
        setSyncStats({
          totalProducts: productCount,
          syncedProducts: 0,
          lastSync: null,
        })
      } else {
        setSyncStats({
          totalProducts: 0,
          syncedProducts: 0,
          lastSync: null,
        })
      }
    } catch (error) {
      console.error("[v0] Error loading sync stats:", error)
      setSyncStats({
        totalProducts: 0,
        syncedProducts: 0,
        lastSync: null,
      })
    }
  }

  const handleSaveConfiguration = async () => {
    if (!config.store_url || !config.consumer_key || !config.consumer_secret) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    setIsConnecting(true)
    try {
      await testWooCommerceConnection()

      const response = await fetch("/api/woocommerce/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...config,
          testConnection: true,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setIsConfigured(true)
        await loadSyncStats()
        toast({
          title: "Success",
          description: "WooCommerce configuration saved and connection verified",
        })
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save configuration",
        variant: "destructive",
      })
    } finally {
      setIsConnecting(false)
    }
  }

  const handleSyncProducts = async (syncAll = false) => {
    if (!isConfigured) {
      toast({
        title: "Configuration Required",
        description: "Please configure WooCommerce integration first",
        variant: "destructive",
      })
      return
    }

    if (!syncAll && selectedProducts.length === 0) {
      toast({
        title: "No Products Selected",
        description: "Please select products to export or use 'Export All Products'",
        variant: "destructive",
      })
      return
    }

    setIsSyncing(true)
    try {
      const response = await fetch("/api/woocommerce/sync-products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productIds: syncAll ? null : selectedProducts,
          syncAll,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Export Successful",
          description: result.message,
        })
        setSelectedProducts([])
        loadSyncStats()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export products",
        variant: "destructive",
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleSelectProduct = (productId: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts([...selectedProducts, productId])
    } else {
      setSelectedProducts(selectedProducts.filter((id) => id !== productId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(products.map((p) => p.id))
    } else {
      setSelectedProducts([])
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center">
              <ShoppingCart className="mr-3 h-8 w-8" />
              WooCommerce Integration
            </h1>
            <p className="text-muted-foreground">Export your CRM products to WooCommerce store</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={isConfigured ? "default" : "secondary"}>
            {isAutoSetup ? "Auto-Connecting..." : isConfigured ? "Connected" : "Not Connected"}
          </Badge>
          {isConfigured && (
            <Button variant="outline" size="sm" onClick={() => window.open(config.store_url, "_blank")}>
              <ExternalLink className="mr-2 h-4 w-4" />
              View Store
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="configuration" className="space-y-6">
        <TabsList>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="products">Product Export</TabsTrigger>
          <TabsTrigger value="logs">Export Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="configuration">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="mr-2 h-5 w-5" />
                WooCommerce Configuration
              </CardTitle>
              <CardDescription>
                Configure your WooCommerce store connection. You'll need to generate API keys from your WordPress admin
                panel.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="store_url">Store URL *</Label>
                  <Input
                    id="store_url"
                    placeholder="https://yourstore.com"
                    value={config.store_url}
                    onChange={(e) => setConfig({ ...config, store_url: e.target.value })}
                  />
                  <p className="text-sm text-muted-foreground">Your WooCommerce store URL (without trailing slash)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="consumer_key">Consumer Key *</Label>
                  <Input
                    id="consumer_key"
                    placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={config.consumer_key}
                    onChange={(e) => setConfig({ ...config, consumer_key: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="consumer_secret">Consumer Secret *</Label>
                  <Input
                    id="consumer_secret"
                    type="password"
                    placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={config.consumer_secret}
                    onChange={(e) => setConfig({ ...config, consumer_secret: e.target.value })}
                  />
                </div>
              </div>

              <Separator />

              {isAutoSetup && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mr-3" />
                    <div>
                      <h4 className="font-semibold text-blue-800">Auto-Setup in Progress</h4>
                      <p className="text-sm text-blue-700">Connecting to your WooCommerce store automatically...</p>
                    </div>
                  </div>
                </div>
              )}

              {!isAutoSetup && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" onClick={testWooCommerceConnection} disabled={isTesting} size="sm">
                      {isTesting ? "Testing..." : "Test Connection"}
                    </Button>
                  </div>

                  {connectionStatus.isConnected && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                        <div>
                          <h4 className="font-semibold text-green-800">Connection Successful</h4>
                          <p className="text-sm text-green-700">{connectionStatus.details}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {connectionStatus.error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-red-800">Connection Failed</h4>
                          <p className="text-sm text-red-700 mb-2">{connectionStatus.error}</p>
                          {connectionStatus.details && (
                            <p className="text-sm text-red-600">{connectionStatus.details}</p>
                          )}
                          <div className="mt-3 text-sm text-red-600">
                            <p className="font-medium">Troubleshooting Steps:</p>
                            <ul className="list-disc list-inside mt-1 space-y-1">
                              <li>
                                Ensure WooCommerce REST API is enabled in WooCommerce → Settings → Advanced → REST API
                              </li>
                              <li>Verify your Consumer Key and Secret have "Read/Write" permissions</li>
                              <li>Check that your store URL is correct (e.g., https://yourstore.com)</li>
                              <li>Ensure your WordPress site is accessible and not behind a firewall</li>
                              <li>Try regenerating your API keys in WooCommerce settings</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {isConfigured && !isAutoSetup && connectionStatus.isConnected && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                    <div>
                      <h4 className="font-semibold text-green-800">Connected Successfully</h4>
                      <p className="text-sm text-green-700">
                        Your WooCommerce store is connected and ready for export!
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Button onClick={handleSaveConfiguration} disabled={isConnecting || isTesting} className="w-full">
                {isConnecting
                  ? "Saving Configuration..."
                  : isTesting
                    ? "Testing Connection..."
                    : "Save & Test Connection"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <div className="space-y-6">
            {/* Sync Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{syncStats.totalProducts}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Exported Products</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{syncStats.syncedProducts}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Last Export</CardTitle>
                  <Sync className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {syncStats.lastSync ? new Date(syncStats.lastSync).toLocaleDateString() : "Never"}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* CRM to WooCommerce Export */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="mr-2 h-5 w-5" />
                  CRM → WooCommerce Export
                </CardTitle>
                <CardDescription>Export products from your CRM to WooCommerce store</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => handleSyncProducts(false)}
                    disabled={!isConfigured || isSyncing || selectedProducts.length === 0}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Export Selected ({selectedProducts.length})
                  </Button>
                  <Button onClick={() => handleSyncProducts(true)} disabled={!isConfigured || isSyncing}>
                    <Sync className="mr-2 h-4 w-4" />
                    {isSyncing ? "Exporting..." : "Export All Products"}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  This will create or update products in your WooCommerce store with data from your CRM inventory.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Product Export</CardTitle>
                    <CardDescription>Select products to export to your WooCommerce store</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => handleSyncProducts(false)}
                      disabled={!isConfigured || isSyncing || selectedProducts.length === 0}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Export Selected ({selectedProducts.length})
                    </Button>
                    <Button onClick={() => handleSyncProducts(true)} disabled={!isConfigured || isSyncing}>
                      <Sync className="mr-2 h-4 w-4" />
                      {isSyncing ? "Exporting..." : "Export All Products"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedProducts.length === products.length && products.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedProducts.includes(product.id)}
                            onCheckedChange={(checked) => handleSelectProduct(product.id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            {product.image_url && (
                              <img
                                src={product.image_url || "/placeholder.svg"}
                                alt={product.name}
                                className="w-10 h-10 rounded object-cover"
                              />
                            )}
                            <div>
                              <div className="font-medium">{product.name}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-sm">{product.product_code}</code>
                        </TableCell>
                        <TableCell>₹{product.price.toLocaleString()}</TableCell>
                        <TableCell>{product.stock_available}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">Not Exported</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {products.length === 0 && (
                  <div className="text-center py-8">
                    <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-2 text-sm font-semibold text-gray-900">No products found</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Add some products to your inventory first.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Export Logs</CardTitle>
              <CardDescription>View the history of product export activities to WooCommerce</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No export logs yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Export some products to see the activity logs here.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
