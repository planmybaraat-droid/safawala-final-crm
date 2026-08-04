export interface ApiSuccessResponse<T = any> {
  success: true
  data: T
  message?: string
  meta?: {
    total?: number
    page?: number
    limit?: number
    timestamp?: string
  }
}

export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: any
    field?: string
  }
  timestamp: string
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse

export class ApiResponseBuilder {
  static success<T>(data: T, message?: string, meta?: ApiSuccessResponse<T>["meta"]) {
    const response: ApiSuccessResponse<T> = {
      success: true,
      data,
    }

    if (message) response.message = message
    if (meta) response.meta = { ...meta, timestamp: new Date().toISOString() }

    return response
  }

  static error(code: string, message: string, details?: any, field?: string): ApiErrorResponse {
    return {
      success: false,
      error: {
        code,
        message,
        details,
        field,
      },
      timestamp: new Date().toISOString(),
    }
  }

  // Common error types
  static validationError(message: string, field?: string) {
    return this.error("VALIDATION_ERROR", message, null, field)
  }

  static authError(message = "Authentication required") {
    return this.error("AUTH_ERROR", message)
  }

  static notFoundError(resource = "Resource") {
    return this.error("NOT_FOUND", `${resource} not found`)
  }

  static conflictError(message: string) {
    return this.error("CONFLICT", message)
  }

  static serverError(message = "Internal server error", details?: any) {
    return this.error("SERVER_ERROR", message, details)
  }

  static forbiddenError(message = "Access forbidden") {
    return this.error("FORBIDDEN", message)
  }

  // Database error handling
  static databaseError(error: any, operation: string = 'database operation') {
    console.error(`Database error during ${operation}:`, error)
    
    let message = `Failed to ${operation}`
    let details: any = undefined
    
    if (error.code) {
      switch (error.code) {
        case '23505': // Unique violation
          message = 'A record with this information already exists'
          details = { constraint: error.constraint }
          break
        case '23503': // Foreign key violation
          message = 'Referenced record does not exist'
          details = { constraint: error.constraint }
          break
        case '23502': // Not null violation
          message = 'Required field is missing'
          details = { column: error.column }
          break
        case '23514': // Check violation
          message = 'Data validation failed'
          details = { constraint: error.constraint }
          break
        default:
          message = `Database error during ${operation}`
          details = { code: error.code }
      }
    } else if (error.message) {
      message = error.message
    }

    return this.error("DATABASE_ERROR", message, details)
  }

  // Validation with multiple fields
  static multiFieldValidationError(errors: Record<string, string[]>) {
    const firstError = Object.values(errors)[0]?.[0]
    const message = firstError || 'Validation failed'
    
    return this.error("VALIDATION_ERROR", message, {
      fields: errors,
      fieldCount: Object.keys(errors).length
    })
  }
}

// Utility functions
export function validateRequiredFields(
  data: Record<string, any>, 
  requiredFields: string[]
): Record<string, string[]> | null {
  const errors: Record<string, string[]> = {}
  
  for (const field of requiredFields) {
    if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
      errors[field] = [`${field} is required`]
    }
  }
  
  return Object.keys(errors).length > 0 ? errors : null
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validatePhone(phone: string): boolean {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
  return phoneRegex.test(phone.replace(/\s+/g, ''))
}
