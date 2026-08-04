import { createClient } from "@/lib/supabase/client"

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

class ApiClient {
  private baseUrl = ""

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      // Get Supabase session for authentication
      const supabase = createClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      // Prepare auth headers
      let authHeaders: Record<string, string> = {}
      if (session?.access_token) {
        authHeaders['Authorization'] = `Bearer ${session.access_token}`
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        credentials: 'include', // Include cookies for session
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
          ...options.headers,
        },
      })

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`
        try {
          const errorData = await response.json()
          // Prefer string messages. If API returns structured error object, extract message or stringify.
          if (typeof errorData === 'string') {
            errorMessage = errorData
          } else if (errorData && typeof errorData === 'object') {
            if (errorData.error) {
              // ApiErrorResponse shape
              const errObj = errorData.error
              errorMessage = errObj.message || errObj.error || JSON.stringify(errObj)
            } else {
              errorMessage = errorData.message || JSON.stringify(errorData)
            }
          } else {
            errorMessage = errorMessage
          }
        } catch {
          errorMessage = `Server error: ${response.status}`
        }
        return { success: false, error: errorMessage }
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error(`[v0] API request failed for ${endpoint}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error",
      }
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "GET" })
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "DELETE" })
  }
}

export const apiClient = new ApiClient()
