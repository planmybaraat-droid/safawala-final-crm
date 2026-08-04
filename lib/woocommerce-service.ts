interface WooCommerceConfig {
  storeUrl: string
  consumerKey: string
  consumerSecret: string
}

interface WooCommerceProduct {
  id?: number
  name: string
  type: "simple" | "variable" | "grouped" | "external"
  regular_price: string
  sale_price?: string
  description: string
  short_description?: string
  sku: string
  manage_stock: boolean
  stock_quantity?: number
  stock_status: "instock" | "outofstock" | "onbackorder"
  categories: Array<{ id: number; name: string }>
  images: Array<{ src: string; alt?: string }>
  attributes?: Array<{
    id: number
    name: string
    options: string[]
  }>
  meta_data?: Array<{
    key: string
    value: string
  }>
}

interface CRMProduct {
  id: string
  product_code: string
  name: string
  description?: string
  brand?: string
  size?: string
  color?: string
  material?: string
  price: number
  rental_price: number
  cost_price: number
  security_deposit: number
  stock_total: number
  stock_available: number
  image_url?: string
  category_id?: string
  subcategory_id?: string
}

class WooCommerceService {
  private config: WooCommerceConfig | null = null

  constructor(config?: WooCommerceConfig) {
    if (config) {
      this.config = config
    } else {
      this.config = {
        storeUrl: "https://safawala.com",
        consumerKey: "REDACTED_WOOCOMMERCE_CONSUMER_KEY",
        consumerSecret: "REDACTED_WOOCOMMERCE_CONSUMER_SECRET",
      }
    }
  }

  async autoSetup(): Promise<boolean> {
    try {
      console.log("[v0] WooCommerce auto-setup starting...")

      // Test connection with pre-configured credentials
      const connectionTest = await this.testConnection()

      if (connectionTest) {
        // Save configuration to database
        const response = await fetch("/api/woocommerce/config", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            storeUrl: this.config!.storeUrl,
            consumerKey: this.config!.consumerKey,
            consumerSecret: this.config!.consumerSecret,
            autoSetup: true,
          }),
        })

        const result = await response.json()
        console.log("[v0] WooCommerce auto-setup result:", result)

        return result.success
      }

      return false
    } catch (error) {
      console.error("[v0] WooCommerce auto-setup failed:", error)
      return false
    }
  }

  setConfig(config: WooCommerceConfig) {
    this.config = config
  }

  private getAuthHeader(): string {
    if (!this.config) {
      throw new Error("WooCommerce configuration not set")
    }

    const credentials = btoa(`${this.config.consumerKey}:${this.config.consumerSecret}`)
    return `Basic ${credentials}`
  }

  private async makeRequest(endpoint: string, method: "GET" | "POST" | "PUT" | "DELETE" = "GET", data?: any) {
    if (!this.config) {
      throw new Error("WooCommerce configuration not set")
    }

    let baseUrl = this.config.storeUrl
    if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
      baseUrl = `https://${baseUrl}`
    }
    baseUrl = baseUrl.replace(/\/$/, "") // Remove trailing slash

    const url = `${baseUrl}/wp-json/wc/v3${endpoint}`

    const options: RequestInit = {
      method,
      headers: {
        Authorization: this.getAuthHeader(),
        "Content-Type": "application/json",
        "User-Agent": "CRM-WooCommerce-Integration/1.0",
      },
    }

    if (data && (method === "POST" || method === "PUT")) {
      options.body = JSON.stringify(data)
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    try {
      console.log(`[WooCommerce] Making ${method} request to: ${url}`)

      const response = await fetch(url, { ...options, signal: controller.signal })
      clearTimeout(timeoutId)

      console.log(`[WooCommerce] Response status: ${response.status}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[WooCommerce] API Error Response: ${errorText}`)

        if (response.status === 401) {
          throw new Error(
            "WooCommerce authentication failed. Please check your consumer key and secret. Make sure the API key has read/write permissions.",
          )
        } else if (response.status === 404) {
          throw new Error(
            "WooCommerce endpoint not found. Please check your store URL format (should be https://yourstore.com without /wp-admin) and ensure WooCommerce is installed and REST API is enabled.",
          )
        } else if (response.status === 403) {
          throw new Error(
            "WooCommerce access forbidden. Please check your API permissions and ensure the consumer key has the correct permissions.",
          )
        } else if (response.status === 500) {
          throw new Error(
            "WooCommerce server error. Please check your store's error logs or contact your hosting provider.",
          )
        }

        throw new Error(`WooCommerce API Error: ${response.status} - ${errorText}`)
      }

      const responseText = await response.text()
      console.log(`[WooCommerce] Response text length: ${responseText.length}`)

      if (!responseText || responseText.trim() === "") {
        console.warn("[WooCommerce] Received empty response")
        throw new Error("WooCommerce API returned empty response")
      }

      try {
        const parsedResponse = JSON.parse(responseText)
        console.log(`[WooCommerce] Successfully parsed JSON response`)
        return parsedResponse
      } catch (parseError) {
        console.error(`[WooCommerce] JSON Parse Error: ${parseError}`)
        console.error(`[WooCommerce] Raw response: ${responseText.substring(0, 500)}...`)

        if (responseText.trim().startsWith("<!DOCTYPE") || responseText.trim().startsWith("<html")) {
          throw new Error(
            "WooCommerce returned HTML instead of JSON. This usually means: 1) The store URL is incorrect, 2) WooCommerce REST API is not enabled, 3) There's a WordPress error/plugin conflict, or 4) The site is behind a firewall/security plugin blocking API access.",
          )
        }

        throw new Error(`Invalid JSON response from WooCommerce: ${responseText.substring(0, 100)}...`)
      }
    } catch (error) {
      clearTimeout(timeoutId)
      if (error.name === "AbortError") {
        throw new Error(
          "WooCommerce API request timed out. Please check your internet connection and store performance.",
        )
      }
      if (error.message.includes("fetch")) {
        throw new Error(
          `Network error connecting to WooCommerce store: ${this.config.storeUrl}. Please check the URL format and your internet connection.`,
        )
      }
      throw error
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log("[WooCommerce] Testing connection...")
      const result = await this.makeRequest("/products?per_page=1")
      console.log("[WooCommerce] Connection test successful")
      return true
    } catch (error) {
      console.error("[WooCommerce] Connection test failed:", error)

      if (error.message.includes("HTML instead of JSON")) {
        console.error("[WooCommerce] Store is returning HTML - check if WooCommerce REST API is enabled")
      } else if (error.message.includes("authentication failed")) {
        console.error("[WooCommerce] Authentication failed - check consumer key and secret")
      } else if (error.message.includes("not found")) {
        console.error("[WooCommerce] Endpoint not found - check store URL format")
      }

      return false
    }
  }

  async getProducts(page = 1, perPage = 10): Promise<WooCommerceProduct[]> {
    return this.makeRequest(`/products?page=${page}&per_page=${perPage}`)
  }

  async getProduct(id: number): Promise<WooCommerceProduct> {
    return this.makeRequest(`/products/${id}`)
  }

  async createProduct(product: WooCommerceProduct): Promise<WooCommerceProduct> {
    return this.makeRequest("/products", "POST", product)
  }

  async updateProduct(id: number, product: Partial<WooCommerceProduct>): Promise<WooCommerceProduct> {
    return this.makeRequest(`/products/${id}`, "PUT", product)
  }

  async deleteProduct(id: number): Promise<{ id: number; deleted: boolean }> {
    return this.makeRequest(`/products/${id}`, "DELETE")
  }

  async syncProductFromCRM(crmProduct: CRMProduct): Promise<WooCommerceProduct> {
    if (!crmProduct || !crmProduct.name || !crmProduct.product_code) {
      throw new Error("Invalid CRM product data: missing required fields (name, product_code)")
    }

    try {
      const wooProduct: WooCommerceProduct = {
        name: crmProduct.name,
        type: "simple",
        regular_price: crmProduct.price.toString(),
        sale_price: crmProduct.rental_price > 0 ? crmProduct.rental_price.toString() : undefined,
        description: crmProduct.description || "",
        short_description: `${crmProduct.brand || ""} ${crmProduct.material || ""}`.trim(),
        sku: crmProduct.product_code,
        manage_stock: true,
        stock_quantity: crmProduct.stock_available,
        stock_status: crmProduct.stock_available > 0 ? "instock" : "outofstock",
        categories: [], // Will be mapped based on category_id
        images: crmProduct.image_url ? [{ src: crmProduct.image_url, alt: crmProduct.name }] : [],
        attributes: [
          ...(crmProduct.brand ? [{ id: 1, name: "Brand", options: [crmProduct.brand] }] : []),
          ...(crmProduct.size ? [{ id: 2, name: "Size", options: [crmProduct.size] }] : []),
          ...(crmProduct.color ? [{ id: 3, name: "Color", options: [crmProduct.color] }] : []),
          ...(crmProduct.material ? [{ id: 4, name: "Material", options: [crmProduct.material] }] : []),
        ],
        meta_data: [
          { key: "_crm_product_id", value: crmProduct.id },
          { key: "_crm_rental_price", value: crmProduct.rental_price.toString() },
          { key: "_crm_security_deposit", value: crmProduct.security_deposit.toString() },
          { key: "_crm_cost_price", value: crmProduct.cost_price.toString() },
        ],
      }

      console.log(`[WooCommerce] Syncing product: ${crmProduct.name} (${crmProduct.product_code})`)

      try {
        console.log(`[WooCommerce] Checking if product with SKU ${crmProduct.product_code} already exists...`)
        const existingProducts = await this.makeRequest(`/products?sku=${encodeURIComponent(crmProduct.product_code)}`)

        if (existingProducts && existingProducts.length > 0) {
          const existingProduct = existingProducts[0]
          console.log(
            `[WooCommerce] Product with SKU ${crmProduct.product_code} already exists (ID: ${existingProduct.id}). Updating instead of creating.`,
          )

          // Update existing product instead of creating new one
          const result = await this.updateProduct(existingProduct.id, wooProduct)
          console.log(`[WooCommerce] Successfully updated existing product: ${result.name}`)
          return result
        } else {
          console.log(
            `[WooCommerce] No existing product found with SKU ${crmProduct.product_code}. Creating new product.`,
          )
        }
      } catch (searchError) {
        console.warn(
          `[WooCommerce] Error checking for existing product with SKU ${crmProduct.product_code}:`,
          searchError,
        )
        // Continue with creation attempt if search fails
      }

      // Create new product if no existing product found
      const result = await this.createProduct(wooProduct)

      if (!result) {
        throw new Error("WooCommerce API returned null result for product creation")
      }

      console.log(`[WooCommerce] Successfully synced product: ${result.name}`)
      return result
    } catch (error) {
      console.error(`[WooCommerce] Failed to sync product ${crmProduct.name}:`, error)

      if (error.message && error.message.includes("product_invalid_sku")) {
        throw new Error(
          `Failed to sync product "${crmProduct.name}": SKU "${crmProduct.product_code}" already exists in WooCommerce. The product was updated instead of created.`,
        )
      }

      throw new Error(
        `Failed to sync product "${crmProduct.name}": ${error instanceof Error ? error.message : "Unknown error"}`,
      )
    }
  }

  async syncMultipleProducts(
    crmProducts: CRMProduct[],
  ): Promise<{ success: WooCommerceProduct[]; errors: Array<{ product: CRMProduct; error: string }> }> {
    const success: WooCommerceProduct[] = []
    const errors: Array<{ product: CRMProduct; error: string }> = []

    for (const product of crmProducts) {
      try {
        const syncedProduct = await this.syncProductFromCRM(product)
        success.push(syncedProduct)
      } catch (error) {
        errors.push({
          product,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    return { success, errors }
  }

  async updateStockQuantity(sku: string, quantity: number): Promise<void> {
    try {
      console.log(`[WooCommerce] Updating stock for SKU: ${sku} to quantity: ${quantity}`)

      const products = await this.makeRequest(`/products?sku=${encodeURIComponent(sku)}`)

      if (!products || products.length === 0) {
        throw new Error(`Product with SKU ${sku} not found in WooCommerce`)
      }

      const product = products[0]
      console.log(`[WooCommerce] Found product ID: ${product.id} for SKU: ${sku}`)

      const updateResult = await this.updateProduct(product.id, {
        stock_quantity: quantity,
        stock_status: quantity > 0 ? "instock" : "outofstock",
      })

      console.log(`[WooCommerce] Stock updated successfully for product ID: ${product.id}`)
      return updateResult
    } catch (error) {
      console.error(`[WooCommerce] Failed to update stock for SKU ${sku}:`, error)
      throw error
    }
  }

  async getCategories(): Promise<Array<{ id: number; name: string; slug: string }>> {
    return this.makeRequest("/products/categories")
  }

  async createCategory(name: string, description?: string): Promise<{ id: number; name: string; slug: string }> {
    return this.makeRequest("/products/categories", "POST", {
      name,
      description: description || "",
    })
  }

  async getOrders(page = 1, perPage = 10, status?: string): Promise<any[]> {
    const endpoint = `/orders?page=${page}&per_page=${perPage}${status ? `&status=${status}` : ""}`
    return this.makeRequest(endpoint)
  }

  async getCustomers(page = 1, perPage = 10): Promise<any[]> {
    return this.makeRequest(`/customers?page=${page}&per_page=${perPage}`)
  }
}

export const wooCommerceService = new WooCommerceService()
export type { WooCommerceConfig, WooCommerceProduct, CRMProduct }
